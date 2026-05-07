/**
 * baseline.figma + cfg.figma → FigmaTabData 변환.
 *
 * 시안 (Claude Design 핸드오프) 의 figma-tab-data shape 1:1 호환.
 * 대부분 baseline.figma 그대로 + cfg.figma 에서 measurementScope derive + stamp date.
 *
 * v0.9 note 17 (2026-04-28): MigrationPrioritySection 용 frameRanking + domainSummary
 * derive 추가.
 */

import type {
  FigmaConfig,
  FigmaDomainResult,
  FigmaReport,
  TokenMatrix,
} from "../../types";
import type {
  FigmaDomainSummaryEntry,
  FigmaFrameRankingEntry,
  FigmaTabData,
} from "./types";

const PRIMARY_RATIO_MET_THRESHOLD = 0.95;
const PRIMARY_RATIO_STRONG_BELOW_THRESHOLD = 0.1;

/**
 * primary DS label 결정 (0.2.0).
 *
 * 규칙:
 *   - DS 1개 = 자동 primary (primary 필드 검증 안 함)
 *   - DS 2개 이상 = 정확히 1개에 `primary: true` 명시 필수
 *     - primary 0개 → throw
 *     - primary 2개 이상 → throw
 *   - DS 0개 = null
 *
 * 0.1.x 흐름 (`ds-new` 라벨 자동 primary) = 0.2.0 부터 변경.
 * 사용자 측 정정 = `dsmonitor.config.local.ts` 안 ds-new 항목에 `primary: true` 1줄 추가.
 */
function resolvePrimaryDsLabel(cfg: FigmaConfig): string | null {
  const files = cfg.designSystemFiles;

  if (files.length === 0) return null;

  // DS 1개 = 자동 primary
  if (files.length === 1) {
    return files[0].label;
  }

  // DS 2개 이상 = primary 정확히 1개 필수
  const primaries = files.filter((f) => f.primary === true);

  if (primaries.length === 0) {
    throw new Error(
      "[dsmonitor] DS 파일이 2개 이상이면 figmaDesignSystemFiles 안 정확히 1개에 `primary: true`를 명시해야 합니다. " +
      `등록된 DS 라벨: ${files.map((f) => f.label).join(", ")}. ` +
      "자세한 안내: https://github.com/jsiksn/dsmonitor#ds-file-labels"
    );
  }

  if (primaries.length > 1) {
    throw new Error(
      `[dsmonitor] figmaDesignSystemFiles 안 \`primary: true\` 항목이 ${primaries.length}건 발견되었습니다. ` +
      "정확히 1개만 명시해 주세요. " +
      `현재 primary 라벨: ${primaries.map((p) => p.label).join(", ")}`
    );
  }

  return primaries[0].label;
}

export function baselineToFigmaData(
  figma: FigmaReport,
  cfg: FigmaConfig
): FigmaTabData {
  const stamp = (figma.generatedAt || "").slice(0, 10);

  const domainNames = cfg.domainFiles.map((d) => d.label);
  const frames: string[] = [];
  for (const d of figma.domainResults) {
    for (const p of d.pages ?? []) {
      const pageLabel = p.comment ?? "(no comment)";
      for (const f of p.frames ?? []) {
        const frameLabel = f.comment ?? "(no comment)";
        frames.push(`${d.label} > ${pageLabel} > ${frameLabel}`);
      }
      if (!p.frames || p.frames.length === 0) {
        if (p.url) frames.push(`${d.label} > ${pageLabel}`);
      }
    }
    if ((!d.pages || d.pages.length === 0) && d.measurementUnit === "file") {
      frames.push(`${d.label} (file)`);
    }
  }

  const primaryLabel = resolvePrimaryDsLabel(cfg);
  const allLabels = cfg.designSystemFiles.map((d) => d.label);
  const nonPrimaryLabels = allLabels.filter((l) => l !== primaryLabel);
  const frameRanking = buildFrameRanking(figma.domainResults, primaryLabel);
  const domainSummary = buildDomainSummary(figma.domainResults, primaryLabel);

  // tokenMatrix derive (3차 시각 검증 후 보정 2, 2026-04-29 후속).
  // v0.9 note 12 의 transformer flat 화 패턴 누락 보완 — 시안 figma-tab.jsx
  // TokenMatrixSection 이 기대하는 형식 (rows c/dn/dl + summary both/codeOnly/dsOnly).
  // 0.2.0 부터 = primary / non-primary 형태로 변경 (옛 ds-new/ds-legacy hardcoded 제거).
  // baseline JSON 부분은 안 건드림 (시계열 보존). 다른 프로젝트 호환성 별도 트랙.
  const tokenMatrixForUi = enrichTokenMatrix(
    figma.tokenMatrix,
    primaryLabel,
    nonPrimaryLabels
  );

  return {
    stamp,
    primaryLabel,
    nonPrimaryLabels,
    measurementScope: {
      domainFiles: cfg.domainFiles.length,
      domainNames,
      frames,
    },
    tokenMatrix: tokenMatrixForUi,
    instanceSources: figma.instanceSources,
    domainResults: figma.domainResults,
    dsStats: figma.tokenMatrix.summary.dsStats,
    unmatchedInstances: figma.instanceAnalysis.unmatchedInstances,
    totalInstances: figma.instanceAnalysis.totalInstances,
    frameRanking,
    domainSummary,
    // B 그룹 단계 3 (2026-04-29): 컴포넌트 매칭 — baseline 안 미존재 시 null.
    componentMatch: figma.componentMatch ?? null,
  };
}

/**
 * tokenMatrix 를 시안 figma-tab.jsx TokenMatrixSection 기대 형식으로 enrich.
 *
 * 추가 부분:
 *   - rows[i].n / .c / .dn / .dl  — flat 형식 (시안 직접 접근)
 *   - summary.both / .codeOnly / .dsOnly — 분류 카운트
 *
 * 옛 형식 (rows[i].name / .inCode / .inDs, summary.totalUniqueTokens 등) 도 보존
 * — baseline JSON 형식과 호환 (다른 코드 의존 시).
 *
 * derive 정의:
 *   - both     = code 매칭 + 어떤 DS 에라도 매칭
 *   - codeOnly = code 매칭 + 모든 DS 미매칭
 *   - dsOnly   = code 미매칭 + 어떤 DS 에라도 매칭
 *   - (code 미매칭 + 모든 DS 미매칭 케이스는 row 자체 등장 안 함 — 분류 외)
 */
function enrichTokenMatrix(
  tm: TokenMatrix,
  primaryLabel: string | null,
  nonPrimaryLabels: string[]
): TokenMatrix & {
  rows: Array<TokenMatrix["rows"][number] & {
    n: string;
    c: 0 | 1;
    dn: 0 | 1;
    dl: 0 | 1;
  }>;
  summary: TokenMatrix["summary"] & {
    both: number;
    codeOnly: number;
    dsOnly: number;
  };
} {
  let both = 0;
  let codeOnly = 0;
  let dsOnly = 0;

  // 0.2.0: ds-new/ds-legacy hardcoded 형태 → primary / non-primary 형태로 변경.
  // dn = primary 매칭 / dl = non-primary 매칭 합집합.
  const enrichedRows = tm.rows.map((r) => {
    const inCode = r.inCode.exists;
    const inPrimary = primaryLabel ? r.inDs[primaryLabel]?.exists ?? false : false;
    const inNonPrimary = nonPrimaryLabels.some(
      (l) => r.inDs[l]?.exists ?? false
    );
    const inAnyDs = inPrimary || inNonPrimary;

    if (inCode && inAnyDs) both += 1;
    else if (inCode && !inAnyDs) codeOnly += 1;
    else if (!inCode && inAnyDs) dsOnly += 1;

    return {
      ...r,
      n: r.name,
      c: (inCode ? 1 : 0) as 0 | 1,
      dn: (inPrimary ? 1 : 0) as 0 | 1,
      dl: (inNonPrimary ? 1 : 0) as 0 | 1,
    };
  });

  return {
    ...tm,
    rows: enrichedRows,
    summary: { ...tm.summary, both, codeOnly, dsOnly },
  };
}

function buildFrameRanking(
  domains: FigmaDomainResult[],
  primaryLabel: string | null
): FigmaFrameRankingEntry[] {
  const out: FigmaFrameRankingEntry[] = [];
  for (const d of domains) {
    for (const p of d.pages ?? []) {
      const pageLabel = p.comment ?? "(no comment)";
      const domainPath = `${d.label} > ${pageLabel}`;
      for (const f of p.frames ?? []) {
        out.push({
          label: f.comment ?? "(no comment)",
          domainPath,
          ...computeRatio(
            f.instanceSources,
            f.unmatchedInstances,
            f.totalInstances,
            primaryLabel
          ),
        });
      }
      // 패턴 B (페이지 url 직접 측정) — frame 없으면 페이지 자체.
      if ((!p.frames || p.frames.length === 0) && p.url) {
        out.push({
          label: pageLabel,
          domainPath: d.label,
          ...computeRatio(
            p.instanceSources,
            p.unmatchedInstances,
            p.totalInstances,
            primaryLabel
          ),
        });
      }
    }
    // 패턴 A (file URL) — 도메인 자체.
    if ((!d.pages || d.pages.length === 0) && d.measurementUnit === "file") {
      out.push({
        label: d.label,
        domainPath: "(file)",
        ...computeRatio(
          d.instanceSources,
          d.unmatchedInstances,
          d.totalInstances,
          primaryLabel
        ),
      });
    }
  }
  // primary 비중 오름차순 — 가장 작업 우선순위 높은 frame 이 위.
  out.sort((a, b) => a.primaryRatio - b.primaryRatio);
  return out;
}

function buildDomainSummary(
  domains: FigmaDomainResult[],
  primaryLabel: string | null
): FigmaDomainSummaryEntry[] {
  return domains.map((d) => ({
    label: d.label,
    ...computeRatio(
      d.instanceSources,
      d.unmatchedInstances,
      d.totalInstances,
      primaryLabel
    ),
  }));
}

function computeRatio(
  instanceSources: Record<string, number>,
  unmatched: number,
  total: number,
  primaryLabel: string | null
): {
  primaryRatio: number;
  badge: "met" | "below" | "below-strong";
  counts: { dsNew: number; dsLegacy: number; unmatched: number };
  total: number;
} {
  const dsNew = primaryLabel ? instanceSources[primaryLabel] ?? 0 : 0;
  // primary 외 모든 등록 DS 합 — 본 프로젝트는 ds-legacy 1개.
  let dsLegacy = 0;
  for (const [k, v] of Object.entries(instanceSources)) {
    if (k !== primaryLabel) dsLegacy += v;
  }
  const primaryRatio = total === 0 ? 0 : dsNew / total;
  const badge: "met" | "below" | "below-strong" =
    primaryRatio >= PRIMARY_RATIO_MET_THRESHOLD
      ? "met"
      : primaryRatio <= PRIMARY_RATIO_STRONG_BELOW_THRESHOLD
      ? "below-strong"
      : "below";
  return {
    primaryRatio: round(primaryRatio, 4),
    badge,
    counts: { dsNew, dsLegacy, unmatched },
    total,
  };
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}
