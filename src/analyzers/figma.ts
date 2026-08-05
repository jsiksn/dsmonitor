/**
 * Figma baseline analyzer — Phase 0.5 최소 버전.
 *
 * 입력: `UIHealthConfig.figma` + `FIGMA_API_TOKEN` env
 * 출력: `FigmaReport` (DS 파일별 카운트 + 출처 미상 Instance 분석 + 정상 instance 출처)
 *
 * 원칙:
 *   - 도메인 파일은 **순차 처리**. 응답 크기 수십 MB 규모이므로 병렬 시 메모리 피크 위험.
 *   - 개별 파일 실패는 errors 에 수집 후 계속 진행 (401/403 만 즉시 중단).
 *   - 엔드포인트 축소 전략 (2026-04-23 재설계):
 *     · DS 파일: 2-pass (fetchFileMeta → fetchFileNodes(pageIds)) — V8 문자열 한계 회피
 *     · 도메인 파일: fetchNodes(frame/page id 목록) — 응답 크기 억제
 *
 * planning.md §7 2026-04-23 블록에서 "Detach → 출처 미상 Instance" 용어로 통일됨.
 */

import type {
  ClassIndex,
  CodeTokenParserWarning,
  UIHealthConfig,
  FigmaReport,
  FigmaDesignSystemCount,
  FigmaDomainFile,
  FigmaDomainFrameResult,
  FigmaDomainPageResult,
  FigmaDomainResult,
  FigmaInstanceAnalysis,
  FigmaInstanceSources,
  FigmaInstancesDomain,
  FigmaInstancesFile,
  FigmaInstancesFrame,
  FigmaInstancesPage,
  FigmaPageSelection,
  FigmaVariableEntry,
} from "../types";
import { parseFigmaUrl, FigmaUrlParseError } from "./figma/urlParser";
import {
  FigmaApiError,
  resetFigmaApiCallCount,
  getFigmaApiCallCount,
  type FigmaStyleEntry,
} from "./figma/apiClient";
import { scanDesignSystem } from "./figma/designSystemScan";
import {
  scanDomain,
  type DomainScanResult,
  type TargetMeasurement,
} from "./figma/domainScan";
import {
  resetSplitCounters,
  getSplitFetchCount,
  getSplitEntryCount,
  SPLIT_CALL_WARN_THRESHOLD,
} from "./figma/responseSplitting";
import { validateSameFile } from "./figma/fileKeyValidator";
import { loadCodeTokens } from "./codeTokens";
import { buildTokenMatrix, type TokenMatrixDsInput } from "./tokenMatrix";
import {
  applyTokenNameMapping,
  validateTokenNameMapping,
} from "./tokenNameMapping";
import {
  analyzeComponentMatch,
  dsInputsFromCounts,
} from "./figma/componentMatch";

/**
 * analyzeCodebase 와 동일하게 attachAbsRoot 가 주입한 __absRoot 를 사용.
 * cli.ts 는 이미 확장된 cfg 를 전달하지만 타입은 UIHealthConfig 라서 맞춰둔다.
 */
type Cfg = UIHealthConfig & { __absRoot: string };

/**
 * Figma analyzer 엔트리.
 *
 * `cfg.metrics.figmaAnalysis` 가 false 면 호출 자체를 안 함 — cli.ts 에서 게이팅.
 * 이 함수는 `true` 전제로 동작. 검증 실패 시 명확한 에러 throw.
 *
 * @param classIndex (B 그룹 단계 3, 2026-04-29) 코드 className 인덱스. analyzeCodebase
 *   결과에서 전달. 미제공 시 컴포넌트 매칭 (componentMatch) 미생성.
 */
export async function analyzeFigma(
  cfg: Cfg,
  classIndex?: ClassIndex
): Promise<{ report: FigmaReport; instancesFile: FigmaInstancesFile }> {
  // ───── 1. 초기 검증 ─────
  if (!cfg.figma) {
    throw new Error(
      "figmaAnalysis 가 true 지만 `cfg.figma` 가 없습니다. " +
        "dsmonitor.config.ts 에 figma 블록을 추가하거나, " +
        "dsmonitor.config.local.ts 파일을 생성해 designSystemFiles/domainFiles 를 export 하세요. " +
        "템플릿: dsmonitor.config.local.example.ts"
    );
  }
  const fc = cfg.figma;

  const token = process.env.FIGMA_API_TOKEN;
  if (!token || token.trim() === "") {
    throw new Error(
      "FIGMA_API_TOKEN 환경변수가 없습니다. " +
        "dsmonitor/.env.local 에 토큰을 설정하세요 " +
        "(템플릿: .env.local.example). 발급: Figma > Settings > Personal access tokens."
    );
  }

  if (fc.designSystemFiles.length === 0 && fc.domainFiles.length === 0) {
    throw new Error(
      "figma.designSystemFiles 와 figma.domainFiles 가 모두 비어있습니다. " +
        "dsmonitor.config.local.ts 에서 최소 한 개 이상 추가하세요. " +
        "템플릿: dsmonitor.config.local.example.ts"
    );
  }

  // URL 사전 파싱 검증 — analyzer 시작 전 구조적 오류 먼저 차단.
  preflightUrls(fc.designSystemFiles, "designSystemFiles");
  preflightDomainUrls(fc.domainFiles);

  // 0.11.0 — tokenNameMapping 규칙 구조 검증. API 호출 전에 fail-fast
  // (규칙 오류를 안고 측정하면 매트릭스가 조용히 어긋난 채 저장되므로).
  for (const ds of fc.designSystemFiles) {
    if (!ds.tokenNameMapping) continue;
    const ruleErrors = validateTokenNameMapping(ds.tokenNameMapping);
    if (ruleErrors.length > 0) {
      throw new Error(
        `designSystemFiles["${ds.label}"].tokenNameMapping 규칙 오류:\n` +
          ruleErrors.map((e) => `  - ${e}`).join("\n") +
          `\n힌트: npx dsmonitor doctor 로 정적 검증 가능.`
      );
    }
  }

  // 0.2.2 — 호출 횟수 카운터 / 분할 카운터 초기화. 측정 끝 시점에 출력 + warning.
  resetFigmaApiCallCount();
  resetSplitCounters();

  const errors: string[] = [];
  // DS 스캔에서 개별 페이지 실패 등 비치명적 경고. FigmaReport.warnings 로 bubble up.
  // 도메인 scanDomain 의 warnings 는 기존대로 errors 로 병합 (의도된 비대칭).
  const warnings: string[] = [];

  // ───── 2. DS 파일 순차 스캔 ─────
  console.log(`[figma] DS 파일 ${fc.designSystemFiles.length}개 스캔 시작`);
  const designSystemCounts: FigmaDesignSystemCount[] = [];
  // Phase 0.7 후속 (2026-04-30): componentMap entry 에 masterName 추가.
  // variant component 의 componentSet.name 보존 — CSV / instance JSON 활용.
  const componentMap = new Map<
    string,
    { label: string; name: string; masterName: string | null }
  >();
  const conflicts: string[] = [];
  // tokenMatrix 용 — DS 순서(config 순) 유지를 위해 label 배열로 관리.
  const dsStylesByLabel = new Map<string, FigmaStyleEntry[]>();
  const dsVariablesByLabel = new Map<string, FigmaVariableEntry[]>();

  for (const ds of fc.designSystemFiles) {
    try {
      const { fileKey } = parseFigmaUrl(ds.url);
      const result = await scanDesignSystem(fileKey, ds.label, token);
      designSystemCounts.push(result.count);
      for (const w of result.warnings) warnings.push(w);
      // componentMap 병합 + conflict 검출 (기존 buildComponentMap 로직을 메인으로 흡수).
      for (const [nodeId, entry] of result.componentMapEntries) {
        const prev = componentMap.get(nodeId);
        if (prev) {
          if (prev.label !== entry.label) {
            conflicts.push(
              `컴포넌트 ID 중복: ${nodeId} ("${entry.name}") 이미 "${prev.label}" 에 등록됨. "${entry.label}" 무시.`
            );
          }
          continue;
        }
        componentMap.set(nodeId, entry);
      }
      dsStylesByLabel.set(ds.label, result.styleMapEntries);
      dsVariablesByLabel.set(ds.label, result.variableMapEntries);
      console.log(
        `[figma]   "${ds.label}": styles=${result.count.styles}, components=${result.count.components}, variantGroups=${result.count.variantGroups}, variables=${result.variableMapEntries.length}`
      );
    } catch (e) {
      if (e instanceof FigmaApiError && (e.status === 401 || e.status === 403)) {
        // 인증/권한 문제는 나머지도 다 실패할 것이므로 즉시 중단.
        throw e;
      }
      const msg = formatErr(e);
      errors.push(`DS "${ds.label}" 스캔 실패: ${msg}`);
      console.warn(`[figma]   ⚠ DS "${ds.label}" 실패: ${msg}`);
      // 실패해도 tokenMatrix 가 빈 입력으로 정상 동작하도록 빈 배열 세팅.
      dsStylesByLabel.set(ds.label, []);
      dsVariablesByLabel.set(ds.label, []);
    }
  }
  // 같은 stable library key 가 ds-legacy / ds-new 양쪽에 등장하는 경우는 에러가 아닌
  // 운영 상황 (컴포넌트 이관 중 양쪽 library 공존). warnings 로 분류.
  for (const c of conflicts) warnings.push(c);

  // ───── 3. 도메인 파일 순차 스캔 ─────
  console.log(`[figma] 도메인 파일 ${fc.domainFiles.length}개 스캔 시작 (순차)`);
  const domainResults: DomainScanResult[] = [];
  for (const d of fc.domainFiles) {
    try {
      // 도메인 파일 내 모든 URL 이 같은 fileKey 인지 + 파일 루트 URL 자리에 node-id 가
      // 붙었는지 등 구조 검증. 성공 시 확정된 fileKey 를 넘겨받음.
      const check = validateSameFile(d);
      if (!check.ok) {
        errors.push(check.error);
        console.warn(`[figma]   ⚠ 도메인 "${d.label}" 검증 실패: ${check.error}`);
        continue;
      }
      const r = await scanDomain(d, check.fileKey, token, componentMap);
      domainResults.push(r);
      for (const w of r.warnings) errors.push(`[도메인 "${d.label}"] ${w}`);
      console.log(
        `[figma]   "${d.label}": instances=${r.totalInstances}, unmatched=${r.unmatchedInstances}`
      );
    } catch (e) {
      if (e instanceof FigmaApiError && (e.status === 401 || e.status === 403)) {
        throw e;
      }
      const msg = formatErr(e);
      errors.push(`도메인 "${d.label}" 스캔 실패: ${msg}`);
      console.warn(`[figma]   ⚠ 도메인 "${d.label}" 실패: ${msg}`);
    }
  }

  // ───── 4. 집계 ─────
  const instanceAnalysis = aggregateInstanceAnalysis(domainResults, fc.unknownInstances.topN);
  const instanceSources = aggregateInstanceSources(
    domainResults,
    fc.designSystemFiles.map((d) => d.label)
  );

  // ───── 5. 코드 토큰 파싱 + tokenMatrix 생성 (단계 3, 2026-04-24) ─────
  // 파서 플러그인 구조: config.figma.codeTokens.parsers 의 각 엔트리를 레지스트리
  // 에서 찾아 실행. 현재 지원 파서: scss / cssVariables / tailwind.
  // 0.7.0 (Z): 파서 진단을 구조화 warning 으로 수집해 tokenMatrix.warnings 로 bubble up.
  const parserWarnings: CodeTokenParserWarning[] = [];
  const codeTokens = await loadCodeTokens(
    fc.codeTokens.parsers,
    cfg.__absRoot,
    warnings,
    parserWarnings
  );
  console.log(`[figma] 코드 토큰 ${codeTokens.length}개 추출`);

  // 0.7.0 (Z): path 진단을 stderr 로 한 줄씩 emit. baseline JSON 에는 tokenMatrix.warnings
  // 로 그대로 보존되어 dashboard 가 badge 로 표시합니다.
  for (const w of parserWarnings) {
    const detail = w.message ? ` (${w.message})` : "";
    const hint =
      w.issue === "file_not_found"
        ? " 힌트: `npx dsmonitor doctor` 로 path 진단 가능."
        : "";
    console.warn(
      `⚠ codeTokens.parsers (${w.parser}): "${w.path}" — ${w.issue}${detail}.${hint}`
    );
  }

  // 0.11.0 — tokenNameMapping: DS 쪽 이름을 코드 CSS 변수명 형태로 변환
  // (canonicalTokenKey 이전 적용). 0.11.1 — variables 전체 + styles 중
  // FILL/EFFECT 에 적용 (TEXT/GRID 는 변환 없이 통과 — 모듈 주석 참조).
  // 미설정 DS 는 기존 그대로. 규칙 경고 (0매치 / 퇴화) 는 FigmaReport.warnings 로.
  // 입력이 전부 비어 있으면 (예: 스캔 실패) 적용 생략 — 전 규칙 0매치라는
  // 오해성 경고 방지 (원인은 규칙이 아니라 조회 실패이므로).
  const dsInputs: TokenMatrixDsInput[] = fc.designSystemFiles.map((d) => {
    const rawVariables = dsVariablesByLabel.get(d.label) ?? [];
    const rawStyles = dsStylesByLabel.get(d.label) ?? [];
    let variables: TokenMatrixDsInput["variables"] = rawVariables;
    let styles: TokenMatrixDsInput["styles"] = rawStyles;
    if (
      d.tokenNameMapping &&
      d.tokenNameMapping.length > 0 &&
      rawVariables.length + rawStyles.length > 0
    ) {
      const applied = applyTokenNameMapping(
        { variables: rawVariables, styles: rawStyles },
        d.tokenNameMapping,
        d.label
      );
      variables = applied.variables;
      styles = applied.styles;
      for (const w of applied.warnings) {
        warnings.push(w);
        console.warn(`[figma]   ⚠ ${w}`);
      }
    }
    return { label: d.label, styles, variables };
  });
  const tokenMatrix = buildTokenMatrix(codeTokens, dsInputs);
  if (parserWarnings.length > 0) {
    tokenMatrix.warnings = parserWarnings;
  }

  const registeredLabels = fc.designSystemFiles.map((d) => d.label);
  const domainResultsTree = buildDomainResults(
    fc.domainFiles,
    domainResults,
    registeredLabels
  );

  // Phase 0.7 (2026-04-29): instance level raw 부분 별도 파일용 트리 빌드.
  // baseline JSON 회귀 회피 — instances[] 는 별도 파일 (figma-instances-{date}.json) 으로 출력.
  const instancesFile = buildInstancesFile(fc.domainFiles, domainResults);

  // ───── 6. 컴포넌트 매칭 (B 그룹 단계 3, 2026-04-29) ─────
  // classIndex 미제공 시 (figma 단독 호출 등) 부분 자체 생략.
  // 핵심: Figma DS 컴포넌트 (variantGroup + standalone) 이름 ↔ 코드 className 매칭.
  let componentMatch: FigmaReport["componentMatch"];
  if (classIndex) {
    const dsInputs = dsInputsFromCounts(designSystemCounts);
    componentMatch = analyzeComponentMatch(dsInputs, classIndex);
    console.log(
      `[figma] componentMatch: total=${componentMatch.totals.figmaTotal}, ` +
        `matched=${componentMatch.totals.matched} (${(
          componentMatch.totals.matchRatio * 100
        ).toFixed(1)}%), ` +
        `figmaOnly=${componentMatch.totals.figmaOnly}, codeOnly=${componentMatch.totals.codeOnly}`
    );
    for (const [label, s] of Object.entries(componentMatch.summary)) {
      console.log(
        `[figma]   "${label}": matched=${s.matched}/${s.figmaTotal} (${(
          s.matchRatio * 100
        ).toFixed(1)}%) — both=${s.matchedBreakdown.both}, ` +
          `jsxOnly=${s.matchedBreakdown.jsxOnly}, globalCssOnly=${s.matchedBreakdown.globalCssOnly}`
      );
    }
  } else {
    console.log(
      `[figma] componentMatch: classIndex 미제공 (figma 단독 호출 등) — 생략`
    );
  }

  const report: FigmaReport = {
    generatedAt: new Date().toISOString(),
    validationLevel: fc.validationLevel,
    designSystemCounts,
    instanceAnalysis,
    instanceSources,
    domainResults: domainResultsTree,
    tokenMatrix,
    componentMatch,
    errors,
    warnings,
  };

  console.log(
    `[figma] 완료: 출처 미상 비율 ${(instanceAnalysis.unmatchedRatio * 100).toFixed(1)}% ` +
      `(${instanceAnalysis.unmatchedInstances} / ${instanceAnalysis.totalInstances})`
  );
  console.log(
    `[figma] tokenMatrix: codeCount=${tokenMatrix.summary.codeCount}, ` +
      `totalUnique=${tokenMatrix.summary.totalUniqueTokens}, duplicates=${tokenMatrix.duplicates.length}`
  );
  for (const ds of fc.designSystemFiles) {
    const s = tokenMatrix.summary.dsStats[ds.label];
    if (!s) continue;
    console.log(
      `[figma]   "${ds.label}": total=${s.total}, matchedWithCode=${s.matchedWithCode}, duplicates=${s.duplicateCount}`
    );
  }
  if (errors.length > 0) {
    console.warn(`[figma] 경고/에러 ${errors.length}건 수집됨 — 리포트 errors 섹션 참고`);
  }

  // 0.2.2 — Figma API 호출 통계 출력. 분할 진입 + 임계 호출 횟수 초과 시 warning.
  const totalCalls = getFigmaApiCallCount();
  const splitEntries = getSplitEntryCount();
  const splitFetches = getSplitFetchCount();
  console.log(
    `[figma] API 호출 통계: total=${totalCalls}, split-entries=${splitEntries}, split-fetches=${splitFetches}`
  );
  if (totalCalls > SPLIT_CALL_WARN_THRESHOLD) {
    console.warn(
      `[figma] ⚠ API 호출 횟수 ${totalCalls} > 임계 ${SPLIT_CALL_WARN_THRESHOLD} — ` +
        `frame 분할 호출 폭증 케이스. rate limit 위험 가능. ` +
        `figma 파일 구조 검토 (큰 page → 작은 frame 분할) 권고.`
    );
  }

  return { report, instancesFile };
}

// ───── 집계 유틸 ──────────────────────────────────────────────────

function aggregateInstanceAnalysis(
  results: DomainScanResult[],
  topN: number
): FigmaInstanceAnalysis {
  let total = 0;
  let unmatched = 0;
  const merged = new Map<string, { count: number; firstPath: string }>();

  for (const r of results) {
    total += r.totalInstances;
    unmatched += r.unmatchedInstances;
    for (const [name, entry] of r.unknownByName) {
      const prev = merged.get(name);
      if (prev) prev.count += entry.count;
      else merged.set(name, { ...entry });
    }
  }

  const ratio = total === 0 ? 0 : unmatched / total;

  const sorted = [...merged.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN)
    .map(([name, v]) => ({
      name,
      count: v.count,
      sourceLabel: null as string | null, // Phase 0.5 에선 미추정 (외주 옛 DS 검토 제외)
      samplePath: v.firstPath,
    }));

  return {
    totalInstances: total,
    unmatchedInstances: unmatched,
    unmatchedRatio: ratio,
    topN: sorted,
  };
}

/**
 * 정상 instance 의 출처 분포를 config.designSystemFiles 등록 label 기반 동적 구조로 집계.
 *
 * 반환 객체 키는 `registeredLabels` 순서로 0 초기화 후 채움 — 매칭 0건인 DS 도 `{label: 0}`
 * 으로 포함되어 대시보드/리포터가 config 순서 그대로 렌더 가능. 등록 외 label 은 애초
 * componentMap 에 없어 매칭 실패로 흘러가므로 이 함수에 도달하지 않는다.
 */
function aggregateInstanceSources(
  results: DomainScanResult[],
  registeredLabels: string[]
): FigmaInstanceSources {
  const out: FigmaInstanceSources = {};
  for (const label of registeredLabels) out[label] = 0;
  for (const r of results) {
    for (const [label, count] of r.sourcesByLabel) {
      out[label] = (out[label] ?? 0) + count;
    }
  }
  return out;
}

// ───── 도메인 raw 트리 빌더 (B-2 단계 2, 2026-04-28) ─────────────

/**
 * config 의 figmaDomainFiles 트리 구조 그대로 + 각 노드에 측정값 attach.
 *
 * 매칭:
 *   - 도메인 단위: cfg.label ↔ scanResult.label
 *   - target 단위: nodeId 추출 (config 의 url) ↔ TargetMeasurement.nodeId
 *
 * scan 실패한 도메인 (validateSameFile 실패 / API 에러 등) 은 빈 측정값 + 라벨/구조
 * 보존 (`scanFailed: true`). errors 배열에 상세 사유 별도 기록.
 *
 * page/domain 단위 합산 (frames 합산 → page, pages 합산 → domain) 모두 출력 —
 * 시각화에서 drill-down 시 매번 re-aggregate 안 해도 됨.
 */
function buildDomainResults(
  domainCfgs: FigmaDomainFile[],
  scanResults: DomainScanResult[],
  registeredLabels: string[]
): FigmaDomainResult[] {
  const scanByLabel = new Map<string, DomainScanResult>();
  for (const sr of scanResults) scanByLabel.set(sr.label, sr);

  return domainCfgs.map((cfg): FigmaDomainResult => {
    const sr = scanByLabel.get(cfg.label);
    if (!sr) {
      return buildFailedDomainResult(cfg, registeredLabels);
    }

    const targetByNodeId = new Map<string, TargetMeasurement>();
    for (const t of sr.targets) targetByNodeId.set(t.nodeId, t);

    if (cfg.url) {
      // 패턴 A — file URL. scanDomain 이 비권장 처리 후 빈 result 반환 (warning 만).
      // 도메인 합산도 0. 측정값은 이대로 0 으로 출력.
      return {
        label: cfg.label,
        totalInstances: sr.totalInstances,
        unmatchedInstances: sr.unmatchedInstances,
        instanceSources: mapToObject(sr.sourcesByLabel, registeredLabels),
        measurementUnit: "file",
      };
    }

    const pages = (cfg.pages ?? []).map((p) =>
      buildPageResult(p, targetByNodeId, registeredLabels)
    );

    return {
      label: cfg.label,
      totalInstances: sr.totalInstances,
      unmatchedInstances: sr.unmatchedInstances,
      instanceSources: mapToObject(sr.sourcesByLabel, registeredLabels),
      pages,
    };
  });
}

function buildFailedDomainResult(
  cfg: FigmaDomainFile,
  registeredLabels: string[]
): FigmaDomainResult {
  const emptySources = emptyLabelCounts(registeredLabels);
  if (cfg.url) {
    return {
      label: cfg.label,
      totalInstances: 0,
      unmatchedInstances: 0,
      instanceSources: emptySources,
      measurementUnit: "file",
      scanFailed: true,
    };
  }
  // 패턴 B/C — 빈 measure 로 페이지/프레임 구조만 보존 (시각화에서 "측정 실패" 표시).
  const pages = (cfg.pages ?? []).map((p) =>
    buildEmptyPageResult(p, registeredLabels)
  );
  return {
    label: cfg.label,
    totalInstances: 0,
    unmatchedInstances: 0,
    instanceSources: emptySources,
    pages,
    scanFailed: true,
  };
}

function buildPageResult(
  pageCfg: FigmaPageSelection,
  targetByNodeId: Map<string, TargetMeasurement>,
  registeredLabels: string[]
): FigmaDomainPageResult {
  // 패턴 B — page URL. 페이지 자체 subtree 측정.
  if (pageCfg.url) {
    const target = lookupTarget(pageCfg.url, targetByNodeId);
    return {
      comment: pageCfg.comment,
      url: pageCfg.url,
      measurementUnit: target
        ? target.measurementUnit === "page"
          ? "page"
          : "other"
        : "other",
      totalInstances: target?.totalInstances ?? 0,
      unmatchedInstances: target?.unmatchedInstances ?? 0,
      instanceSources: mapToObject(
        target?.sourcesByLabel ?? new Map(),
        registeredLabels
      ),
    };
  }

  // 패턴 C — frames. 각 frame measure 후 페이지 합산.
  const frames = (pageCfg.frames ?? []).map((f): FigmaDomainFrameResult => {
    const target = lookupTarget(f.url, targetByNodeId);
    return {
      url: f.url,
      comment: f.comment,
      measurementUnit:
        target?.measurementUnit === "frame"
          ? "frame"
          : "other",
      totalInstances: target?.totalInstances ?? 0,
      unmatchedInstances: target?.unmatchedInstances ?? 0,
      instanceSources: mapToObject(
        target?.sourcesByLabel ?? new Map(),
        registeredLabels
      ),
    };
  });

  // 페이지 합산 = frames 합 (drill-down 편의).
  const pageSources = emptyLabelCounts(registeredLabels);
  let pageTotal = 0;
  let pageUnmatched = 0;
  for (const f of frames) {
    pageTotal += f.totalInstances;
    pageUnmatched += f.unmatchedInstances;
    for (const [k, v] of Object.entries(f.instanceSources)) {
      pageSources[k] = (pageSources[k] ?? 0) + v;
    }
  }

  return {
    comment: pageCfg.comment,
    totalInstances: pageTotal,
    unmatchedInstances: pageUnmatched,
    instanceSources: pageSources,
    frames,
  };
}

function buildEmptyPageResult(
  pageCfg: FigmaPageSelection,
  registeredLabels: string[]
): FigmaDomainPageResult {
  if (pageCfg.url) {
    return {
      comment: pageCfg.comment,
      url: pageCfg.url,
      measurementUnit: "other",
      totalInstances: 0,
      unmatchedInstances: 0,
      instanceSources: emptyLabelCounts(registeredLabels),
    };
  }
  const frames = (pageCfg.frames ?? []).map(
    (f): FigmaDomainFrameResult => ({
      url: f.url,
      comment: f.comment,
      measurementUnit: "other",
      totalInstances: 0,
      unmatchedInstances: 0,
      instanceSources: emptyLabelCounts(registeredLabels),
    })
  );
  return {
    comment: pageCfg.comment,
    totalInstances: 0,
    unmatchedInstances: 0,
    instanceSources: emptyLabelCounts(registeredLabels),
    frames,
  };
}

function lookupTarget(
  url: string,
  targetByNodeId: Map<string, TargetMeasurement>
): TargetMeasurement | undefined {
  try {
    const { nodeId } = parseFigmaUrl(url);
    if (!nodeId) return undefined;
    return targetByNodeId.get(nodeId);
  } catch {
    return undefined;
  }
}

// ───── instance JSON 빌더 (Phase 0.7, 2026-04-29) ────────────────

/**
 * config 트리 + scan results.targets → FigmaInstancesFile (별도 파일용 트리).
 *
 * 핵심: domainResults 트리와 같은 구조 + 각 leaf (frame 또는 page) 에 instances[]
 * 배열 추가. fileKey + fileName 도메인 단위 보존 — figmaUrl 자동 조립 핵심.
 *
 * scan 실패한 도메인 (validateSameFile 실패 / API 에러) 은 fileKey 추출 실패 가능 —
 * 빈 부분 유지 (instances 0).
 */
function buildInstancesFile(
  domainCfgs: FigmaDomainFile[],
  scanResults: DomainScanResult[]
): FigmaInstancesFile {
  const scanByLabel = new Map<string, DomainScanResult>();
  for (const sr of scanResults) scanByLabel.set(sr.label, sr);

  const domains: FigmaInstancesDomain[] = domainCfgs.map((cfg) => {
    // fileKey + fileName — 도메인 안 첫 URL (frame 또는 page) 에서 추출.
    // 같은 도메인 안 모든 URL 은 같은 fileKey (validateSameFile 보장).
    const firstUrl = findFirstUrl(cfg);
    const { fileKey, fileName } = extractFileMeta(firstUrl);
    const sr = scanByLabel.get(cfg.label);
    const targetByNodeId = new Map<string, ReturnType<DomainScanResult["targets"]["find"]>>();
    if (sr) {
      for (const t of sr.targets) targetByNodeId.set(t.nodeId, t as never);
    }

    const pages: FigmaInstancesPage[] = (cfg.pages ?? []).map((p) => {
      // 패턴 B — page url 직접 측정.
      if (p.url) {
        const nodeId = parseNodeIdFromUrl(p.url);
        const target = nodeId ? (targetByNodeId.get(nodeId) as DomainScanResult["targets"][number] | undefined) : undefined;
        return {
          comment: p.comment,
          url: p.url,
          nodeId: nodeId ?? undefined,
          instances: target?.instances ?? [],
        };
      }
      // 패턴 C — frames 단위.
      const frames: FigmaInstancesFrame[] = (p.frames ?? []).map((f) => {
        const nodeId = parseNodeIdFromUrl(f.url);
        const target = nodeId ? (targetByNodeId.get(nodeId) as DomainScanResult["targets"][number] | undefined) : undefined;
        return {
          comment: f.comment,
          url: f.url,
          nodeId: nodeId ?? "",
          instances: target?.instances ?? [],
        };
      });
      return { comment: p.comment, frames };
    });

    return {
      label: cfg.label,
      fileKey,
      fileName,
      pages,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    domains,
  };
}

/** 도메인 cfg 의 첫 URL (frame 또는 page url) 추출 — fileKey/fileName 추출용. */
function findFirstUrl(cfg: FigmaDomainFile): string {
  if (cfg.url) return cfg.url;
  for (const p of cfg.pages ?? []) {
    if (p.url) return p.url;
    if (p.frames && p.frames.length > 0) return p.frames[0].url;
  }
  return "";
}

/** URL pathname 의 [design, fileKey, fileName] 부분에서 fileKey + fileName 추출. */
function extractFileMeta(url: string): { fileKey: string; fileName: string } {
  if (!url) return { fileKey: "", fileName: "" };
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "design" || p === "file");
    if (idx < 0) return { fileKey: "", fileName: "" };
    return {
      fileKey: parts[idx + 1] ?? "",
      fileName: parts[idx + 2] ?? "",
    };
  } catch {
    return { fileKey: "", fileName: "" };
  }
}

/** URL 의 node-id 추출 — 콜론 표기로 정규화. parseFigmaUrl 흐름 reuse. */
function parseNodeIdFromUrl(url: string): string | null {
  try {
    return parseFigmaUrl(url).nodeId ?? null;
  } catch {
    return null;
  }
}

function emptyLabelCounts(registeredLabels: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const label of registeredLabels) out[label] = 0;
  return out;
}

function mapToObject(
  source: Map<string, number>,
  registeredLabels: string[]
): Record<string, number> {
  const out = emptyLabelCounts(registeredLabels);
  for (const [k, v] of source) out[k] = (out[k] ?? 0) + v;
  return out;
}

// ───── preflight URL 검증 ─────────────────────────────────────────

function preflightUrls(
  entries: Array<{ url: string; label: string }>,
  which: string
): void {
  const fails: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    try {
      parseFigmaUrl(entries[i].url);
    } catch (e) {
      const msg = e instanceof FigmaUrlParseError ? e.message : String(e);
      fails.push(`  [${i}] label="${entries[i].label}": ${msg}`);
    }
  }
  if (fails.length > 0) {
    throw new Error(
      `${which} 중 URL 파싱 실패 ${fails.length}건:\n${fails.join("\n")}`
    );
  }
}

function preflightDomainUrls(
  entries: import("../types").FigmaDomainFile[]
): void {
  const fails: string[] = [];
  const dupLabels = new Map<string, number>();

  for (let i = 0; i < entries.length; i++) {
    const d = entries[i];
    // label 중복 체크
    dupLabels.set(d.label, (dupLabels.get(d.label) ?? 0) + 1);

    // union 전체 (url / pages / frames) 파싱 + 같은 파일 소속 + 루트 URL 에
    // node-id 섞임 여부까지 한 번에 검증.
    const check = validateSameFile(d);
    if (!check.ok) {
      fails.push(`  domainFiles[${i}] ${check.error}`);
    }
  }

  // label 중복
  for (const [label, count] of dupLabels) {
    if (count > 1) {
      fails.push(
        `  label "${label}" 이 ${count}회 중복. domainFiles 의 label 은 리포트 ` +
          `그룹핑 키라 중복 불가. 구분되는 이름으로 변경하세요.`
      );
    }
  }

  if (fails.length > 0) {
    throw new Error(
      `domainFiles 검증 실패 ${fails.length}건:\n${fails.join("\n")}`
    );
  }
}

function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
