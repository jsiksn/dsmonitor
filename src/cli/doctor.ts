/**
 * `dsmonitor doctor` — 0.7.0 (BB) 신규 진단 명령.
 *
 * config 파일과 환경변수를 점검해 흔한 결함 (path 부재, 잘못된 URL, 환경변수 누락 등)
 * 을 한꺼번에 보여줍니다. audit 실행 전에 설정이 잘 잡혔는지 확인하기 위한 도구이며,
 * 측정 자체는 수행하지 않으므로 매우 빠릅니다 (네트워크 호출 없음).
 *
 * 사용 예:
 *   npx dsmonitor doctor
 *   npx dsmonitor doctor --json     # CI 통합용 JSON 출력
 *   npx dsmonitor doctor --strict   # warning 도 오류로 취급
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { UIHealthConfig } from "../types";
// 0.8.10 — glob 판정을 공유 유틸로 이동 (옛 로컬 isGlobPattern — 파서 2곳과 동일 구현).
import { isGlob as isGlobPattern } from "../utils/glob";

type Severity = "ok" | "warn" | "error";

export interface DoctorEntry {
  severity: Severity;
  category: string;
  message: string;
  /** 정정 힌트 (선택). */
  hint?: string;
}

export interface DoctorReport {
  entries: DoctorEntry[];
  summary: {
    ok: number;
    warn: number;
    error: number;
  };
}

export interface DoctorOptions {
  json?: boolean;
  strict?: boolean;
}

/**
 * doctor 본문. config 와 configPath 를 받아 진단을 수행하고 결과를 stdout 으로 출력합니다.
 * 종료 코드는 호출 측 (cli.ts) 이 결정합니다 — `runDoctor` 는 결과 보고서를 그대로 반환합니다.
 */
export function runDoctor(
  cfg: UIHealthConfig & { __absRoot: string },
  configPath: string,
  options: DoctorOptions = {}
): DoctorReport {
  const absRoot = cfg.__absRoot;
  const entries: DoctorEntry[] = [];

  const resolve = (rel: string): string => path.resolve(absRoot, rel);
  const exists = (rel: string): boolean => existsSync(resolve(rel));
  const isDir = (rel: string): boolean => {
    const abs = resolve(rel);
    try {
      return statSync(abs).isDirectory();
    } catch {
      return false;
    }
  };

  const push = (e: DoctorEntry): void => {
    entries.push(e);
  };

  // ─── scan.codeRoots / styleRoots ───────────────────────────────────
  for (const root of cfg.scan.codeRoots) {
    if (!exists(root)) {
      push({
        severity: "error",
        category: "scan.codeRoots",
        message: `${root} (not found)`,
        hint: "scan.codeRoots 에 등록한 경로 중 실제로 없는 폴더가 있습니다. projectRoot 기준 상대 경로인지 확인하세요.",
      });
    } else if (!isDir(root)) {
      push({
        severity: "warn",
        category: "scan.codeRoots",
        message: `${root} (exists, but not a directory)`,
      });
    } else {
      push({
        severity: "ok",
        category: "scan.codeRoots",
        message: `${root} (found)`,
      });
    }
  }
  for (const root of cfg.scan.styleRoots) {
    if (!exists(root)) {
      push({
        severity: "warn",
        category: "scan.styleRoots",
        message: `${root} (not found)`,
        hint: "프로젝트에 따라 styles 디렉토리가 없을 수 있습니다. globals.css 가 다른 위치에 있다면 그대로 두어도 됩니다.",
      });
    } else if (isDir(root)) {
      push({
        severity: "ok",
        category: "scan.styleRoots",
        message: `${root} (found)`,
      });
    }
  }

  // ─── stylingPolicy 의미 검증 (0.9.0) ───────────────────────────────
  // 옛 흐름: 경로 존재만 검사 — preferred 가 allowed 에 없는 잘못된 설정이
  // doctor 를 통과하고 실제 측정 단계에서야 드러났음.
  {
    const policy = cfg.stylingPolicy;
    const allowedIds = policy.allowed.map((a) => a.id);
    if (!allowedIds.includes(policy.preferred)) {
      push({
        severity: "error",
        category: "stylingPolicy",
        message: `preferred "${policy.preferred}" 가 allowed 목록에 없습니다 (allowed: ${allowedIds.join(", ") || "없음"})`,
        hint: "stylingPolicy.preferred 는 allowed[].id 중 하나여야 합니다. preset 을 그대로 쓰면 자동으로 일치합니다.",
      });
    } else {
      push({
        severity: "ok",
        category: "stylingPolicy",
        message: `preferred "${policy.preferred}" — allowed 목록에 존재`,
      });
    }
  }

  // ─── globalStyleSources ────────────────────────────────────────────
  // 0.9.0 — 옛 root 부분 존재 가늠 → glob 실매치 검사 (codeTokens.parsers 와 같은 방식).
  for (const pattern of cfg.globalStyleSources) {
    if (isGlobPattern(pattern)) {
      const matches = fg.sync(pattern, { cwd: absRoot, dot: false });
      if (matches.length > 0) {
        push({
          severity: "ok",
          category: "globalStyleSources",
          message: `${pattern} (glob match ${matches.length}건)`,
        });
      } else {
        push({
          severity: "warn",
          category: "globalStyleSources",
          message: `${pattern} (glob match 0건)`,
          hint: "globalStyleSources 가 실제 styles 위치를 가리키는지 확인하세요.",
        });
      }
    } else if (exists(pattern)) {
      push({
        severity: "ok",
        category: "globalStyleSources",
        message: `${pattern} (found)`,
      });
    } else {
      push({
        severity: "warn",
        category: "globalStyleSources",
        message: `${pattern} (not found)`,
        hint: "globalStyleSources 가 실제 styles 위치를 가리키는지 확인하세요.",
      });
    }
  }

  // ─── hardcodedValues.scssVariableDefFiles ─────────────────────────
  for (const file of cfg.hardcodedValues.scssVariableDefFiles) {
    if (!exists(file)) {
      push({
        severity: "warn",
        category: "scssVariableDefFiles",
        message: `${file} (not found)`,
        hint: "Tailwind @theme 색상 noise 제외용이라면 실제 globals.css 경로로 정정하세요.",
      });
    } else {
      push({
        severity: "ok",
        category: "scssVariableDefFiles",
        message: `${file} (found)`,
      });
    }
  }

  // ─── designSystem.officialPaths ────────────────────────────────────
  // 0.9.0 — 옛 root 부분 존재 가늠 → glob 실매치 검사.
  for (const p of cfg.designSystem.officialPaths) {
    if (isGlobPattern(p)) {
      const matches = fg.sync(p, { cwd: absRoot, dot: false });
      if (matches.length > 0) {
        push({
          severity: "ok",
          category: "designSystem.officialPaths",
          message: `${p} (glob match ${matches.length}건)`,
        });
      } else {
        push({
          severity: "error",
          category: "designSystem.officialPaths",
          message: `${p} (glob match 0건)`,
          hint: "DS 본체 파일이 실제로 위치한 디렉토리로 정정하세요. (officialPaths = 파일시스템 경로 / officialAliases = import alias)",
        });
      }
    } else if (exists(p)) {
      push({
        severity: "ok",
        category: "designSystem.officialPaths",
        message: `${p} (found)`,
      });
    } else {
      push({
        severity: "error",
        category: "designSystem.officialPaths",
        message: `${p} (not found)`,
        hint: "DS 본체 파일이 실제로 위치한 디렉토리로 정정하세요. (officialPaths = 파일시스템 경로 / officialAliases = import alias)",
      });
    }
  }

  // ─── figma.codeTokens.parsers ──────────────────────────────────────
  if (cfg.figma) {
    cfg.figma.codeTokens.parsers.forEach((parser, i) => {
      const idx = `[${i}]`;
      if (parser.type === "tailwind") {
        if (!exists(parser.config)) {
          push({
            severity: "error",
            category: "codeTokens.parsers",
            message: `${idx} tailwind: ${parser.config} (not found)`,
            hint: "tailwind.config 확장자 (ts / js / mjs / cjs) 가 다를 수 있습니다.",
          });
        } else {
          push({
            severity: "ok",
            category: "codeTokens.parsers",
            message: `${idx} tailwind: ${parser.config} (found)`,
          });
        }
      } else if (parser.type === "cssVariables" || parser.type === "scss") {
        // 0.7.3 — glob 문자 포함 entry 는 fast-glob 으로 확장 후 match 수 확인.
        //   literal path 는 옛 existsSync 흐름 유지.
        //   globalStyleSources 와 동일한 입력 형식 (예: "src/styles/**/*.css") 그대로 활용 가능.
        for (const f of parser.files) {
          if (isGlobPattern(f)) {
            const matches = fg.sync(f, { cwd: absRoot, dot: false });
            if (matches.length === 0) {
              push({
                severity: "error",
                category: "codeTokens.parsers",
                message: `${idx} ${parser.type}: ${f} (glob match 0건)`,
                hint: "glob 패턴이 매치되는 실제 파일이 없습니다. 패턴 또는 globalStyleSources 와 같은 경로를 활용 중인지 확인하세요.",
              });
            } else {
              push({
                severity: "ok",
                category: "codeTokens.parsers",
                message: `${idx} ${parser.type}: ${f} (glob match ${matches.length}건)`,
              });
            }
          } else if (!exists(f)) {
            push({
              severity: "error",
              category: "codeTokens.parsers",
              message: `${idx} ${parser.type}: ${f} (not found)`,
              hint: "globals.css / tokens.scss 위치가 다를 수 있습니다. App Router 는 src/app/globals.css, Pages Router 는 src/styles/globals.css 가 흔합니다.",
            });
          } else {
            push({
              severity: "ok",
              category: "codeTokens.parsers",
              message: `${idx} ${parser.type}: ${f} (found)`,
            });
          }
        }
      }
    });
  }

  // ─── figma.designSystemFiles / domainFiles URL 형식 ────────────────
  if (cfg.figma) {
    const checkUrl = (url: string, where: string): void => {
      // 허용 형식은 분석기 (figma/urlParser) 수용 범위와 동일: /design/ + 구 /file/.
      // 0.9.0 — hint 보강: FigJam (/board/) · Slides 링크는 측정 대상이 아님을 명시
      //   (허용 폭을 넓히면 분석기에서 실패할 URL 이 doctor 를 통과하게 되므로 X).
      if (!/^https:\/\/(?:www\.)?figma\.com\/(?:design|file)\//.test(url)) {
        push({
          severity: "error",
          category: "figma.url",
          message: `${where}: ${url}`,
          hint:
            "Figma 'Copy link' URL 그대로 붙여 넣으세요. https://www.figma.com/design/<fileKey>/... 형식. " +
            "FigJam (/board/) · Slides 링크는 측정 대상이 아닙니다 — 디자인 파일 링크가 필요합니다.",
        });
      }
    };
    for (const ds of cfg.figma.designSystemFiles) {
      if (ds.url) checkUrl(ds.url, `designSystemFiles[${ds.label}]`);
    }
    for (const dom of cfg.figma.domainFiles) {
      if ("url" in dom && dom.url) checkUrl(dom.url, `domainFiles[${dom.label}]`);
      if ("pages" in dom && Array.isArray(dom.pages)) {
        for (const page of dom.pages) {
          if ("url" in page && page.url) {
            checkUrl(page.url, `domainFiles[${dom.label}].pages`);
          }
          // 0.8.10 — any cast 제거: FigmaPageSelection union 이 frames?: undefined
          //   분기를 명시하므로 직접 접근 가능.
          if (Array.isArray(page.frames)) {
            for (const fr of page.frames) {
              if (fr.url) checkUrl(fr.url, `domainFiles[${dom.label}].frames`);
            }
          }
        }
      }
    }
    if (cfg.figma.designSystemFiles.length > 0) {
      push({
        severity: "ok",
        category: "figma.designSystemFiles",
        message: `${cfg.figma.designSystemFiles.length} entries`,
      });
    }
  }

  // ─── lighthouse.auth.adapter ───────────────────────────────────────
  if (cfg.lighthouse?.auth?.type === "custom") {
    const adapter = cfg.lighthouse.auth.adapter;
    if (!exists(adapter)) {
      push({
        severity: "error",
        category: "lighthouse.auth.adapter",
        message: `${adapter} (not found)`,
        hint: "lighthouse.auth.adapter 가 가리키는 어댑터 스크립트 경로를 확인하세요. dsmonitor init 으로 lighthouse/auth/custom.js 스켈레톤을 다시 생성할 수 있습니다.",
      });
    } else {
      push({
        severity: "ok",
        category: "lighthouse.auth.adapter",
        message: `${adapter} (found)`,
      });
    }
  }

  // ─── 환경변수 ──────────────────────────────────────────────────────
  if (cfg.metrics.figmaAnalysis) {
    if (process.env.FIGMA_API_TOKEN) {
      push({
        severity: "ok",
        category: "env",
        message: "FIGMA_API_TOKEN: 설정됨",
      });
    } else {
      push({
        severity: "error",
        category: "env",
        message: "FIGMA_API_TOKEN: 미설정",
        hint: "figmaAnalysis 가 true 인데 토큰이 없습니다. dsmonitor/.env.local 에 FIGMA_API_TOKEN 을 추가하세요.",
      });
    }
  }
  if (cfg.lighthouse) {
    if (process.env.LIGHTHOUSE_BASE_URL) {
      push({
        severity: "ok",
        category: "env",
        message: `LIGHTHOUSE_BASE_URL: ${process.env.LIGHTHOUSE_BASE_URL}`,
      });
    } else if (cfg.lighthouse.baseUrl) {
      push({
        severity: "ok",
        category: "env",
        message: `LIGHTHOUSE_BASE_URL: config 안에서 직접 명시됨`,
      });
    } else {
      push({
        severity: "warn",
        category: "env",
        message: "LIGHTHOUSE_BASE_URL: 미설정",
        hint: "Lighthouse 측정 활용 시 .env.local 에 LIGHTHOUSE_BASE_URL 을 추가하거나 config 의 lighthouse.baseUrl 에 직접 적으세요.",
      });
    }
    if (cfg.lighthouse.auth?.type === "basic") {
      if (!process.env.LIGHTHOUSE_TEST_ID || !process.env.LIGHTHOUSE_TEST_PW) {
        push({
          severity: "warn",
          category: "env",
          message: "LIGHTHOUSE_TEST_ID / LIGHTHOUSE_TEST_PW: 미설정",
          hint: "basic 인증을 쓰려면 두 변수 모두 필요합니다.",
        });
      }
    }
  }

  // 요약 카운트
  const summary = { ok: 0, warn: 0, error: 0 };
  for (const e of entries) summary[e.severity] += 1;

  const report: DoctorReport = { entries, summary };

  if (options.json) {
    console.log(
      JSON.stringify(
        { configPath, summary, entries },
        null,
        2
      )
    );
  } else {
    printHuman(report, configPath, options);
  }

  return report;
}

function printHuman(
  report: DoctorReport,
  configPath: string,
  options: DoctorOptions
): void {
  console.log("");
  console.log("🔍 dsmonitor doctor — config 검증");
  console.log(`   config: ${configPath}`);
  console.log("");

  // 카테고리별 그룹화 출력.
  const grouped = new Map<string, DoctorEntry[]>();
  for (const e of report.entries) {
    const list = grouped.get(e.category) ?? [];
    list.push(e);
    grouped.set(e.category, list);
  }

  for (const [cat, list] of grouped) {
    const worst = worstSeverity(list);
    const head = severityIcon(worst);
    console.log(`${head} ${cat}`);
    for (const e of list) {
      console.log(`   ${severityMark(e.severity)} ${e.message}`);
      if (e.hint && e.severity !== "ok") {
        console.log(`     힌트: ${e.hint}`);
      }
    }
  }

  console.log("");
  const { ok, warn, error } = report.summary;
  console.log(`요약: ✅ 정상 ${ok}, ⚠ 경고 ${warn}, ✗ 오류 ${error}`);
  if (options.strict && warn > 0 && error === 0) {
    console.log("(--strict: 경고도 오류로 취급되어 exit 1)");
  }
  console.log("");
}

function worstSeverity(list: DoctorEntry[]): Severity {
  if (list.some((e) => e.severity === "error")) return "error";
  if (list.some((e) => e.severity === "warn")) return "warn";
  return "ok";
}

function severityIcon(s: Severity): string {
  return s === "error" ? "✗" : s === "warn" ? "⚠" : "✅";
}

function severityMark(s: Severity): string {
  return s === "error" ? "✗" : s === "warn" ? "⚠" : "✓";
}

/** 종료 코드 결정. error 가 있으면 1, --strict 면 warn 도 1. */
export function doctorExitCode(
  report: DoctorReport,
  options: DoctorOptions = {}
): number {
  if (report.summary.error > 0) return 1;
  if (options.strict && report.summary.warn > 0) return 1;
  return 0;
}
