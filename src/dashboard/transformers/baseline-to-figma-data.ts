/**
 * baseline.figma + cfg.figma → FigmaTabData 변환.
 *
 * 시안 (Claude Design 핸드오프) 의 figma-tab-data shape 1:1 호환.
 * 대부분 baseline.figma 그대로 + cfg.figma 에서 measurementScope derive + stamp date.
 *
 * v0.9 note 17 (2026-04-28): MigrationPrioritySection 용 frameRanking + domainSummary
 * derive 추가.
 */

import type { FigmaConfig, FigmaDomainResult, FigmaReport } from "../../types";
import type {
  FigmaDomainSummaryEntry,
  FigmaFrameRankingEntry,
  FigmaTabData,
} from "./types";

const PRIMARY_RATIO_MET_THRESHOLD = 0.95;
const PRIMARY_RATIO_STRONG_BELOW_THRESHOLD = 0.1;

/**
 * primary DS label 결정 — config.designSystemFiles 중 "ds-new" 우선, 없으면 첫 DS.
 * 본 프로젝트의 의도: ds-new 가 primary (현재 권장 DS).
 */
function resolvePrimaryDsLabel(cfg: FigmaConfig): string | null {
  const labels = cfg.designSystemFiles.map((d) => d.label);
  if (labels.includes("ds-new")) return "ds-new";
  return labels[0] ?? null;
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
  const frameRanking = buildFrameRanking(figma.domainResults, primaryLabel);
  const domainSummary = buildDomainSummary(figma.domainResults, primaryLabel);

  return {
    stamp,
    measurementScope: {
      domainFiles: cfg.domainFiles.length,
      domainNames,
      frames,
    },
    tokenMatrix: figma.tokenMatrix,
    instanceSources: figma.instanceSources,
    domainResults: figma.domainResults,
    dsStats: figma.tokenMatrix.summary.dsStats,
    unmatchedInstances: figma.instanceAnalysis.unmatchedInstances,
    totalInstances: figma.instanceAnalysis.totalInstances,
    frameRanking,
    domainSummary,
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
