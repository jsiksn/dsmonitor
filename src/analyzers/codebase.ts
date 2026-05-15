import path from "node:path";
import fs from "node:fs/promises";
import fg from "fast-glob";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import type {
  UIHealthConfig,
  CodebaseReport,
  ClassIndex,
  SourceFile,
  PreferredComplianceMeta,
} from "../types";
import type { DetectSpec } from "../policy";
import type { FrameworkAdapter, FileSignals } from "../frameworks/types";
import { collectCodeFiles, collectStyleFiles } from "../utils/walker";
import { getFrameworkAdapter } from "../frameworks";

type Cfg = UIHealthConfig & { __absRoot: string };

function isDsPath(relPath: string, cfg: Cfg): boolean {
  return cfg.designSystem.officialPaths.some((p) =>
    relPath.startsWith(p + "/")
  );
}

function isDsImport(source: string, cfg: Cfg): boolean {
  if (cfg.designSystem.officialAliases.some((a) => source.startsWith(a))) return true;
  if (source.startsWith(".") || source.startsWith("/")) return false;
  return cfg.designSystem.officialPaths.some((p) => source.includes(p + "/"));
}

function isComponentFile(f: SourceFile, cfg: Cfg): boolean {
  return cfg.designSystem.componentExts.includes(f.ext);
}

function countMatches(content: string, patterns: RegExp[]): number {
  let total = 0;
  for (const p of patterns) {
    const re = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
    const matches = content.match(re);
    if (matches) total += matches.length;
  }
  return total;
}

function sampleMatches(content: string, patterns: RegExp[], limit = 5): string[] {
  const samples: string[] = [];
  for (const p of patterns) {
    const re = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
    const matches = content.match(re);
    if (matches) samples.push(...matches);
    if (samples.length >= limit) break;
  }
  return samples.slice(0, limit);
}

function analyzeHardcodedColors(
  styleFiles: SourceFile[],
  cfg: Cfg
): CodebaseReport["hardcodedColors"] {
  const defFilesSet = new Set(cfg.hardcodedValues.scssVariableDefFiles);
  const byFile: CodebaseReport["hardcodedColors"]["byFile"] = [];
  let total = 0;
  for (const f of styleFiles) {
    if (defFilesSet.has(f.relPath)) continue;
    const count = countMatches(f.content, cfg.hardcodedValues.colorPatterns);
    if (count > 0) {
      byFile.push({
        file: f.relPath,
        count,
        samples: sampleMatches(f.content, cfg.hardcodedValues.colorPatterns),
      });
      total += count;
    }
  }
  byFile.sort((a, b) => b.count - a.count);
  return { total, byFile: byFile.slice(0, 30) };
}

function analyzeScssCompliance(
  styleFiles: SourceFile[],
  cfg: Cfg
): CodebaseReport["scssVariableCompliance"] {
  const defFilesSet = new Set(cfg.hardcodedValues.scssVariableDefFiles);
  let varUsages = 0;
  let literals = 0;
  for (const f of styleFiles) {
    if (defFilesSet.has(f.relPath)) continue;
    varUsages += countMatches(f.content, cfg.hardcodedValues.scssVariableUsagePatterns);
    literals += countMatches(f.content, cfg.hardcodedValues.colorPatterns);
  }
  const denom = varUsages + literals;
  const compliance = denom === 0 ? 1 : varUsages / denom;
  return {
    variableUsages: varUsages,
    hardcodedLiterals: literals,
    compliance: round(compliance, 4),
  };
}

function tokenize(classStr: string): string[] {
  return classStr.split(/\s+/).filter(Boolean);
}

function matchesDetect(signals: FileSignals, detect: DetectSpec): boolean {
  if (detect.importPathPatterns?.length) {
    for (const p of detect.importPathPatterns) {
      if (signals.imports.some((s) => p.test(s))) return true;
    }
  }
  if (detect.importModules?.length) {
    for (const mod of detect.importModules) {
      if (
        signals.imports.some((s) => s === mod || s.startsWith(mod + "/"))
      )
        return true;
    }
  }
  if (detect.classPatterns?.length) {
    for (const p of detect.classPatterns) {
      if (signals.classNames.some((c) => tokenize(c).some((t) => p.test(t))))
        return true;
    }
  }
  if (detect.inlineStyleJSX && signals.hasInlineStyle) return true;
  return false;
}

/**
 * 단일 CSS 셀렉터 문자열에서 `.className` 토큰만 추출.
 * 속성 셀렉터 내부(`[attr="..."]`) 는 sanitize 로 먼저 제거 → 속성 값에
 * 포함된 dot 오탐 방지. 의사 클래스(`:hover`) / id(`#x`) / 결합자(`>`)
 * 는 시작 문자가 `.` 가 아니므로 자연 배제.
 */
function extractClassNamesFromSelector(selector: string): string[] {
  const sanitized = selector.replace(/\[[^\]]*\]/g, "");
  const re = /\.(-?[_a-zA-Z][\w-]*)/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sanitized)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * globalStyleSources glob 에 매치되는 모든 SCSS/CSS 파일을 파싱해
 * 정의된 CSS 클래스 셀렉터 집합을 반환. v0.4 orphan class 분류에 사용.
 *
 * - SCSS 파일: postcss-scss parser (중첩·`&`·mixin 허용)
 * - CSS 파일: 기본 postcss parser
 * - 파싱 실패 / 매치 파일 0건 → 명시 에러로 종료 (빈 Set 폴백 금지)
 */
async function buildGlobalClassIndex(cfg: Cfg): Promise<Set<string>> {
  const patterns = cfg.globalStyleSources;
  if (!patterns || patterns.length === 0) {
    throw new Error(
      "config.globalStyleSources 가 비어있거나 정의되지 않음. " +
        "orphan class 분류를 위해 글로벌 스타일 파일 glob 패턴 필요."
    );
  }

  const files = await fg(patterns, {
    cwd: cfg.__absRoot,
    absolute: true,
    onlyFiles: true,
  });

  if (files.length === 0) {
    throw new Error(
      `globalStyleSources 가 매치하는 파일 0건: ${patterns.join(", ")} ` +
        `(cwd: ${cfg.__absRoot}). 경로 또는 glob 패턴 재확인.`
    );
  }

  const index = new Set<string>();
  for (const abs of files) {
    const content = await fs.readFile(abs, "utf8");
    const ext = path.extname(abs).toLowerCase();
    let root: postcss.Root;
    try {
      root =
        ext === ".scss"
          ? postcssScss.parse(content, { from: abs })
          : postcss.parse(content, { from: abs });
    } catch (err) {
      throw new Error(
        `글로벌 스타일 파일 파싱 실패: ${abs}. 원인: ${(err as Error).message}`
      );
    }
    root.walkRules((rule) => {
      for (const sel of rule.selectors) {
        for (const cn of extractClassNamesFromSelector(sel)) {
          index.add(cn);
        }
      }
    });
  }

  return index;
}

function analyzeStyling(
  codeFiles: SourceFile[],
  cfg: Cfg,
  adapter: FrameworkAdapter,
  globalIndex: Set<string>,
  jsxUsedOut: Set<string>
): {
  distribution: CodebaseReport["stylingMethodDistribution"];
  forbidden: CodebaseReport["forbiddenClassCount"];
} {
  const policy = cfg.stylingPolicy;
  const codeExts = new Set(cfg.scan.codeExts);

  const allowedCounts: Record<string, number> = {};
  const forbiddenFileCounts: Record<string, number> = {};
  const forbiddenOccurrences: Record<string, number> = {};
  for (const a of policy.allowed) allowedCounts[a.id] = 0;
  for (const f of policy.forbidden) {
    forbiddenFileCounts[f.id] = 0;
    forbiddenOccurrences[f.id] = 0;
  }

  const perFile = new Map<
    string,
    { byId: Record<string, number>; total: number }
  >();

  let allowedGlobalCount = 0;
  let orphanClassCount = 0;
  let noClassCount = 0;
  const orphanClassUsage = new Map<
    string,
    { occurrences: number; files: Set<string> }
  >();

  let preferredUsed = 0;
  let forbiddenUsed = 0;
  let totalFiles = 0;

  for (const f of codeFiles) {
    if (!codeExts.has(f.ext)) continue;
    totalFiles += 1;
    const parsed = adapter.parse(f.content, f.relPath);
    const signals = adapter.extractSignals(parsed);
    // jsxUsedClassNames 누적 — 컴포넌트 매칭 (B 그룹 단계 3) 의 분자 source.
    // tokenize 로 split (className="foo bar baz" → ["foo","bar","baz"]).
    for (const cn of signals.classNames) {
      for (const tok of tokenize(cn)) jsxUsedOut.add(tok);
    }
    let matchedAny = false;

    for (const a of policy.allowed) {
      if (matchesDetect(signals, a.detect)) {
        allowedCounts[a.id] += 1;
        if (a.id === policy.preferred) preferredUsed += 1;
        matchedAny = true;
      }
    }

    const fileById: Record<string, number> = {};
    let fileForbiddenTotal = 0;
    for (const fb of policy.forbidden) {
      let count = 0;
      for (const cn of signals.classNames) {
        for (const tok of tokenize(cn)) {
          if (fb.classPatterns.some((p) => p.test(tok))) count += 1;
        }
      }
      const moduleHit = fb.importModules?.some((m) =>
        signals.imports.some((s) => s === m || s.startsWith(m + "/"))
      );
      if (count > 0 || moduleHit) {
        forbiddenFileCounts[fb.id] += 1;
        forbiddenOccurrences[fb.id] += count;
        fileById[fb.id] = count;
        fileForbiddenTotal += count;
        matchedAny = true;
      }
    }
    if (fileForbiddenTotal > 0) {
      forbiddenUsed += 1;
      perFile.set(f.relPath, { byId: fileById, total: fileForbiddenTotal });
    }

    // v0.4: allowed / forbidden 아무것도 매치 안 된 파일을
    // className 과 globalIndex 관계에 따라 3분할.
    if (!matchedAny) {
      const allTokens: string[] = [];
      for (const cn of signals.classNames) {
        for (const tok of tokenize(cn)) allTokens.push(tok);
      }

      if (allTokens.length === 0) {
        noClassCount += 1;
      } else if (allTokens.some((tok) => globalIndex.has(tok))) {
        allowedGlobalCount += 1;
      } else {
        orphanClassCount += 1;
        for (const tok of allTokens) {
          if (globalIndex.has(tok)) continue;
          const entry = orphanClassUsage.get(tok) ?? {
            occurrences: 0,
            files: new Set<string>(),
          };
          entry.occurrences += 1;
          if (entry.files.size < 5) entry.files.add(f.relPath);
          orphanClassUsage.set(tok, entry);
        }
      }
    }
  }

  const preferredCompliance = buildPreferredCompliance({
    preferredId: policy.preferred,
    preferredUsed,
    allowedGlobalUsed: allowedGlobalCount,
    forbiddenFileCounts,
    orphanClassUsed: orphanClassCount,
    noClassUsed: noClassCount,
  });
  const forbiddenFileRatio = totalFiles === 0 ? 0 : forbiddenUsed / totalFiles;

  const topFiles = Array.from(perFile.entries())
    .map(([file, v]) => ({ file, byId: v.byId, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  const totalOccurrences = Object.values(forbiddenOccurrences).reduce(
    (s, n) => s + n,
    0
  );

  const orphanSamples = Array.from(orphanClassUsage.entries())
    .map(([className, v]) => ({
      className,
      occurrences: v.occurrences,
      sampleFiles: Array.from(v.files),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 20);

  return {
    distribution: {
      allowed: allowedCounts,
      forbidden: forbiddenFileCounts,
      allowedGlobal: allowedGlobalCount,
      orphanClass: orphanClassCount,
      noClass: noClassCount,
      orphanSamples,
      totalFiles,
      preferredId: policy.preferred,
      preferredCompliance,
      forbiddenFileCount: forbiddenUsed,
      forbiddenFileRatio: round(forbiddenFileRatio, 4),
    },
    forbidden: {
      byId: forbiddenOccurrences,
      total: totalOccurrences,
      topFiles,
    },
  };
}

/**
 * 1-depth 기준 디렉토리 버킷 — 단 `apps/` 만 2-depth (apps/material 등).
 * 이유: apps 안 도메인 (material / ml / ecosystem 등) 이 의미 단위.
 *      그 외 (components, pages, store 등) 는 1-depth 자체가 의미 단위.
 */
function getDirBucket(relPath: string): string {
  const parts = relPath.split("/");
  if (parts[0] === "apps" && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

function analyzeTsMigration(
  codeFiles: SourceFile[]
): CodebaseReport["tsMigration"] {
  let ts = 0;
  let js = 0;
  const byDirMap = new Map<
    string,
    { ts: number; js: number; total: number }
  >();
  for (const f of codeFiles) {
    const isTs = f.ext === ".ts" || f.ext === ".tsx";
    const isJs = f.ext === ".js" || f.ext === ".jsx";
    if (!isTs && !isJs) continue;
    if (isTs) ts += 1;
    else js += 1;
    const dir = getDirBucket(f.relPath);
    const cur = byDirMap.get(dir) ?? { ts: 0, js: 0, total: 0 };
    if (isTs) cur.ts += 1;
    else cur.js += 1;
    cur.total += 1;
    byDirMap.set(dir, cur);
  }
  const byDir = [...byDirMap.entries()]
    .map(([dir, v]) => ({
      dir,
      tsFiles: v.ts,
      jsFiles: v.js,
      totalFiles: v.total,
      ratio: v.total === 0 ? 0 : round(v.ts / v.total, 4),
    }))
    .sort((a, b) => b.jsFiles - a.jsFiles);
  const total = ts + js;
  return {
    tsFiles: ts,
    jsFiles: js,
    ratio: total === 0 ? 0 : round(ts / total, 4),
    byDir,
  };
}

function analyzeDsCoverage(
  codeFiles: SourceFile[],
  cfg: Cfg,
  adapter: FrameworkAdapter
): CodebaseReport["dsCoverage"] {
  const byImport = new Map<string, number>();
  let filesUsingDs = 0;
  let consumerFiles = 0;

  for (const f of codeFiles) {
    if (isDsPath(f.relPath, cfg)) continue;
    if (!isComponentFile(f, cfg)) continue;
    consumerFiles += 1;

    const parsed = adapter.parse(f.content, f.relPath);
    const signals = adapter.extractSignals(parsed);

    let used = false;
    for (const src of signals.imports) {
      if (isDsImport(src, cfg)) {
        used = true;
        byImport.set(src, (byImport.get(src) || 0) + 1);
      }
    }
    if (used) filesUsingDs += 1;
  }

  const topDsImports = Array.from(byImport.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    filesUsingDs,
    totalConsumerFiles: consumerFiles,
    coverage: consumerFiles === 0 ? 0 : round(filesUsingDs / consumerFiles, 4),
    topDsImports,
  };
}

function analyzeMigrationCandidates(
  codeFiles: SourceFile[],
  cfg: Cfg,
  adapter: FrameworkAdapter
): CodebaseReport["migrationCandidates"] {
  // 0.6.0 (W): nativeTags 가 string | { tag, type? } union 으로 확장됨.
  // 매칭 시점에는 모두 { tag, type? } 정규형으로 다룹니다.
  type TagCandidate = {
    ds: string;
    aliases: string[];
    /** undefined = type attribute 무관 매칭 (모든 태그). */
    type?: string;
  };
  const tagToDs = new Map<string, TagCandidate[]>();
  for (const [dsName, spec] of Object.entries(cfg.migrationTargets)) {
    for (const raw of spec.nativeTags) {
      const tag = typeof raw === "string" ? raw : raw.tag;
      const type = typeof raw === "string" ? undefined : raw.type;
      const list = tagToDs.get(tag) ?? [];
      list.push({ ds: dsName, aliases: spec.aliases, type });
      tagToDs.set(tag, list);
    }
  }
  const allTags = Array.from(tagToDs.keys());

  const byTarget: Record<string, number> = {};
  const perFile = new Map<
    string,
    { occurrences: number; targets: Set<string> }
  >();
  const samples: CodebaseReport["migrationCandidates"]["samples"] = [];
  const SAMPLE_LIMIT = 50;

  for (const f of codeFiles) {
    if (!isComponentFile(f, cfg)) continue;
    if (isDsPath(f.relPath, cfg)) continue;

    const parsed = adapter.parse(f.content, f.relPath);
    const signals = adapter.extractSignals(parsed);
    const hits = adapter.findNativeElementsWithClass(parsed, allTags);

    if (hits.length === 0) continue;

    // 0.6.1 (X): named import 까지 보고 컴포넌트 단위로 정확 분류합니다.
    // 옛 흐름 (`isImported(aliases)`) 은 alias prefix 매칭만 했기 때문에,
    // barrel import (`import { Button } from "@/laon-web-ui"`) 환경에서는
    // Button 만 import 한 파일이 Input / Select 등 다른 컴포넌트 후보에서도
    // 잘못 제외되곤 했습니다. 본 흐름은 named import 의 원본 명을 컴포넌트 키
    // (migrationTargets key) 와 정확 비교합니다.
    //
    // 보수적 fallback:
    //   - default import (`import X from "..."`)        → 옛 동작 유지 (alias 매칭만으로 제외)
    //   - namespace import (`import * as X from "..."`) → 옛 동작 유지
    //   - importEntries 가 비어 있는 (옛 어댑터 호환) 환경 → 옛 동작 유지
    //
    // hit.type 제약과의 관계: W 단계에서 후보 좁히기, X 단계에서 import 검사.
    const importEntries = signals.importEntries ?? [];
    const importSources = new Set(signals.imports);
    const aliasMatchesSource = (alias: string, source: string): boolean =>
      source === alias || source.startsWith(alias + "/");
    const isImportedComponent = (
      componentName: string,
      aliases: string[]
    ): boolean => {
      // 옛 호환 — importEntries 미지원 어댑터인 경우 옛 alias-only 검사로 폴백.
      if (importEntries.length === 0) {
        return aliases.some((a) =>
          Array.from(importSources).some((s) => aliasMatchesSource(a, s))
        );
      }
      for (const entry of importEntries) {
        const aliasMatched = aliases.some((a) =>
          aliasMatchesSource(a, entry.source)
        );
        if (!aliasMatched) continue;
        // named import 가 컴포넌트 명과 정확 일치 → 정확하게 "이미 import 됨".
        if (entry.named.includes(componentName)) return true;
        // namespace / default 는 어떤 컴포넌트를 가리키는지 정확히 알 수 없어
        // 보수적으로 옛 동작 (alias 매칭만으로 import 인정) 을 유지합니다.
        if (entry.hasNamespace || entry.hasDefault) return true;
        // alias 는 일치하지만 named 에 componentName 이 없고 default /
        // namespace 도 아닌 import 라면 — 다른 컴포넌트만 가져온 것이므로 이 import
        // 만으로는 componentName 이 import 됐다고 볼 수 없습니다 (다른 entry 계속 확인).
      }
      return false;
    };

    for (const hit of hits) {
      if (hit.classString.length < cfg.migrationMinClassLength) continue;
      const all = tagToDs.get(hit.tag);
      if (!all) continue;
      // 0.6.0 (W): type 제약이 있는 candidate 는 hit.type 과 정확 일치할 때만
      // 매칭. type 무관 candidate (type === undefined) 는 type 과 무관하게 매칭.
      const candidates = all.filter(
        (c) => c.type === undefined || c.type === hit.type
      );
      if (candidates.length === 0) continue;
      const unusedDs = candidates.filter(
        (c) => !isImportedComponent(c.ds, c.aliases)
      );
      if (unusedDs.length === 0) continue;

      const suggestedDs = unusedDs.map((c) => c.ds).join("|");
      byTarget[suggestedDs] = (byTarget[suggestedDs] || 0) + 1;

      const entry = perFile.get(f.relPath) ?? {
        occurrences: 0,
        targets: new Set<string>(),
      };
      entry.occurrences += 1;
      entry.targets.add(suggestedDs);
      perFile.set(f.relPath, entry);

      if (samples.length < SAMPLE_LIMIT) {
        samples.push({
          file: f.relPath,
          line: hit.line,
          nativeTag: hit.tag,
          suggestedDs,
          classSample: hit.classString.slice(0, 80),
        });
      }
    }
  }

  const topFiles = Array.from(perFile.entries())
    .map(([file, v]) => ({
      file,
      occurrences: v.occurrences,
      targets: Array.from(v.targets),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 30);

  const totalOccurrences = Array.from(perFile.values()).reduce(
    (sum, v) => sum + v.occurrences,
    0
  );

  return {
    byTarget,
    totalOccurrences,
    totalFilesAffected: perFile.size,
    topFiles,
    samples,
  };
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

const PREFERRED_COMPLIANCE_EXCLUDED_REASON =
  "orphanClass 는 정의 못 찾은 className, noClass 는 스타일 미사용 — 정상 스타일링 방식 분포 측정 대상 아님";

/**
 * preferredCompliance 메타 객체 빌드 (v0.7, 2026-04-28).
 *
 * 정의:
 *   numerator   = preferred + allowedGlobal
 *   denominator = numerator + sum(forbidden)
 *   excluded    = orphanClass + noClass (분모/분자 어디에도 안 들어감)
 *
 * v0.6 이전엔 numerator = preferred 만, denominator = preferred + forbidden.
 * allowedGlobal 을 분자에 포함하도록 정의 변경 — 시계열 단절 (measurementHistory v0.7).
 */
function buildPreferredCompliance(args: {
  preferredId: string;
  preferredUsed: number;
  allowedGlobalUsed: number;
  forbiddenFileCounts: Record<string, number>;
  orphanClassUsed: number;
  noClassUsed: number;
}): PreferredComplianceMeta {
  const {
    preferredId,
    preferredUsed,
    allowedGlobalUsed,
    forbiddenFileCounts,
    orphanClassUsed,
    noClassUsed,
  } = args;

  // 분자
  const numCounts: Record<string, number> = {
    [preferredId]: preferredUsed,
    allowedGlobal: allowedGlobalUsed,
  };
  const numItems = [preferredId, "allowedGlobal"];
  const numTotal = preferredUsed + allowedGlobalUsed;

  // 분모 = 분자 + forbidden 각각
  const denCounts: Record<string, number> = { ...numCounts };
  const denItems: string[] = [preferredId];
  let forbiddenSum = 0;
  for (const [id, count] of Object.entries(forbiddenFileCounts)) {
    const key = `forbidden.${id}`;
    denCounts[key] = count;
    denItems.push(key);
    forbiddenSum += count;
  }
  denItems.push("allowedGlobal");
  const denTotal = numTotal + forbiddenSum;

  const value = denTotal === 0 ? 1 : numTotal / denTotal;

  return {
    value: round(value, 4),
    numerator: { items: numItems, counts: numCounts, total: numTotal },
    denominator: { items: denItems, counts: denCounts, total: denTotal },
    excluded: {
      items: ["orphanClass", "noClass"],
      counts: { orphanClass: orphanClassUsed, noClass: noClassUsed },
      reason: PREFERRED_COMPLIANCE_EXCLUDED_REASON,
    },
  };
}

function emptyDist(cfg: Cfg): CodebaseReport["stylingMethodDistribution"] {
  const allowed: Record<string, number> = {};
  const forbidden: Record<string, number> = {};
  for (const a of cfg.stylingPolicy.allowed) allowed[a.id] = 0;
  for (const f of cfg.stylingPolicy.forbidden) forbidden[f.id] = 0;
  return {
    allowed,
    forbidden,
    allowedGlobal: 0,
    orphanClass: 0,
    noClass: 0,
    orphanSamples: [],
    totalFiles: 0,
    preferredId: cfg.stylingPolicy.preferred,
    preferredCompliance: buildPreferredCompliance({
      preferredId: cfg.stylingPolicy.preferred,
      preferredUsed: 0,
      allowedGlobalUsed: 0,
      forbiddenFileCounts: forbidden,
      orphanClassUsed: 0,
      noClassUsed: 0,
    }),
    forbiddenFileCount: 0,
    forbiddenFileRatio: 0,
  };
}

export async function analyzeCodebase(
  cfg: Cfg
): Promise<{ report: CodebaseReport; classIndex: ClassIndex }> {
  const adapter = getFrameworkAdapter(cfg.framework.id);
  const [codeFiles, styleFiles] = await Promise.all([
    collectCodeFiles(cfg),
    collectStyleFiles(cfg),
  ]);

  const hardcoded = cfg.metrics.hardcodedColors
    ? analyzeHardcodedColors(styleFiles, cfg)
    : { total: 0, byFile: [] };
  const scss = cfg.metrics.scssVariableCompliance
    ? analyzeScssCompliance(styleFiles, cfg)
    : { variableUsages: 0, hardcodedLiterals: 0, compliance: 1 };

  // v0.4 orphan class 분류용 글로벌 인덱스. stylingDistribution 비활성 시
  // 생략 (빌드 실패가 그대로 에러로 종료되므로 fail-fast 원칙 유지).
  const globalIndex = cfg.metrics.stylingDistribution
    ? await buildGlobalClassIndex(cfg)
    : new Set<string>();

  // 컴포넌트 매칭 (B 그룹 단계 3) 분자용 jsx className 인덱스.
  // analyzeStyling 안 walk 에서 같이 누적 — 별도 walk 회피.
  const jsxUsedClassNames = new Set<string>();

  const stylingResult = cfg.metrics.stylingDistribution
    ? analyzeStyling(codeFiles, cfg, adapter, globalIndex, jsxUsedClassNames)
    : {
        distribution: emptyDist(cfg),
        forbidden: { byId: {}, total: 0, topFiles: [] },
      };

  const ts = cfg.metrics.tsMigration
    ? analyzeTsMigration(codeFiles)
    : { tsFiles: 0, jsFiles: 0, ratio: 0, byDir: [] };

  const ds = cfg.metrics.dsCoverage
    ? analyzeDsCoverage(codeFiles, cfg, adapter)
    : {
        filesUsingDs: 0,
        totalConsumerFiles: 0,
        coverage: 0,
        topDsImports: [],
      };

  const migration = cfg.metrics.migrationCandidates
    ? analyzeMigrationCandidates(codeFiles, cfg, adapter)
    : {
        byTarget: {},
        totalOccurrences: 0,
        totalFilesAffected: 0,
        topFiles: [],
        samples: [],
      };

  const dsComponentFiles = codeFiles.filter(
    (f) => isDsPath(f.relPath, cfg) && isComponentFile(f, cfg)
  ).length;
  const nonDsComponentFiles = codeFiles.filter(
    (f) => !isDsPath(f.relPath, cfg) && isComponentFile(f, cfg)
  ).length;

  const report: CodebaseReport = {
    generatedAt: new Date().toISOString(),
    projectRoot: cfg.__absRoot,
    totals: {
      codeFiles: codeFiles.length,
      styleFiles: styleFiles.length,
      tsFiles: ts.tsFiles,
      jsFiles: ts.jsFiles,
      dsComponentFiles,
      nonDsComponentFiles,
    },
    hardcodedColors: hardcoded,
    scssVariableCompliance: scss,
    stylingMethodDistribution: stylingResult.distribution,
    forbiddenClassCount: stylingResult.forbidden,
    tsMigration: ts,
    dsCoverage: ds,
    migrationCandidates: migration,
  };

  return {
    report,
    classIndex: {
      globalClassNames: globalIndex,
      jsxUsedClassNames,
    },
  };
}
