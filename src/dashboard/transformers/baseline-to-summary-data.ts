/**
 * baseline JSON + lighthouse data → SummaryTabData 변환.
 *
 * 시안 (Claude Design 핸드오프) 의 root JSX 안 const DATA = {...} 객체와 1:1 호환.
 * Summary 탭은 root.jsx 가 window.__SUMMARY_DATA 로 읽음.
 */

import type { CodebaseReport } from "../../types";
import type { FigmaTabData, LighthouseTabData, SummaryTabData } from "./types";

export function buildSummaryData(args: {
  report: CodebaseReport;
  lighthouse: LighthouseTabData | null;
  /** baseline.figma.warnings.length (시안의 figma.warningsCount). */
  figmaWarningsCount: number;
  /** figma transformer 결과 — primary / non-primary 라벨 정보. null = figma 누락. */
  figmaTabData?: FigmaTabData | null;
}): SummaryTabData {
  const { report, lighthouse, figmaWarningsCount, figmaTabData } = args;
  const figmaReport = report.figma;

  const codeStamp = (report.generatedAt || "").slice(0, 10);
  const figmaStamp = (figmaReport?.generatedAt || "").slice(0, 10);
  const lhStamp = lighthouse?.measuredAt ?? "—";

  // ─── code 압축 ───
  const code: SummaryTabData["code"] = {
    scssCompliance: report.scssVariableCompliance.compliance,
    scssVariableUsages: report.scssVariableCompliance.variableUsages,
    scssHardcoded: report.hardcodedColors.total,
    forbiddenTotal: report.forbiddenClassCount.total,
    forbiddenBootstrap: report.forbiddenClassCount.byId["bootstrap-utilities"] ?? 0,
    forbiddenTailwind: report.forbiddenClassCount.byId["tailwind-classes"] ?? 0,
    tsRatio: report.tsMigration.ratio,
    tsFiles: report.tsMigration.tsFiles,
    jsFiles: report.tsMigration.jsFiles,
    dsCoverage: report.dsCoverage.coverage,
    dsFilesUsing: report.dsCoverage.filesUsingDs,
    dsTotalConsumer: report.dsCoverage.totalConsumerFiles,
    migrationCandidateFiles: report.migrationCandidates.totalFilesAffected,
    migrationCandidateOccurrences: report.migrationCandidates.totalOccurrences,
  };

  // ─── lh 압축 ───
  let lh: SummaryTabData["lh"] = null;
  if (lighthouse) {
    const sortedByA11y = [...lighthouse.urls].sort((a, b) => a.a11y - b.a11y);
    const worst = sortedByA11y[0];

    // v0.9 note 13: cwvSample 이 배열 — Summary 탭의 1 target URL 강조 디자인 보존
    // 위해 perf 가장 낮은 URL 자동 선택 (worst URL). 매칭 LHR 없으면 fallback 으로
    // cwvSample[0] 사용. 빈 배열이면 target null.
    const sortedByPerf = [...lighthouse.urls].sort((a, b) => a.perf - b.perf);
    const worstPerfPath = sortedByPerf[0]?.path ?? null;
    const targetEntry =
      (worstPerfPath
        ? lighthouse.cwvSample.find((s) => s.url === worstPerfPath)
        : null) ?? lighthouse.cwvSample[0] ?? null;

    const target = targetEntry
      ? {
          url: targetEntry.url.replace(/^\//, ""),
          lcp: fmtTimeS(targetEntry.lcp),
          fcp: fmtTimeS(targetEntry.fcp),
          cls: round(targetEntry.cls, 3),
          tbt: fmtTimeMs(targetEntry.tbt),
          si: fmtTimeS(targetEntry.si),
          tti: fmtTimeS(targetEntry.tti),
        }
      : null;
    const targetPath = targetEntry
      ? "/" + targetEntry.url.replace(/^\//, "")
      : null;
    type LhRow = NonNullable<SummaryTabData["lh"]>["urlTable"][number];
    const urlTable = lighthouse.urls.map((u): LhRow => {
      if (targetPath && u.path === targetPath) {
        return [u.path, u.perf, u.a11y, u.bp, u.seo, true];
      }
      return [u.path, u.perf, u.a11y, u.bp, u.seo];
    });
    lh = {
      urls: lighthouse.totalUrls,
      runs: lighthouse.numberOfRuns,
      avgPerf: lighthouse.averages.perf,
      avgA11y: lighthouse.averages.a11y,
      avgBP: lighthouse.averages.bp,
      avgSeo: lighthouse.averages.seo,
      worst: worst ? { url: worst.path.replace(/^\//, ""), a11y: worst.a11y } : { url: "—", a11y: 0 },
      target,
      urlTable,
    };
  }

  // ─── figma 압축 (v0.12, Phase 0.6) — figmaReport 없으면 null 출력 ───
  // 다른 프로젝트 호환 핵심: figmaAnalysis=false 인 프로젝트는 figma 자체 null →
  // root.jsx 가 Summary Layer 03 + Figma 탭 hide.
  // 0.2.0: ds-new/ds-legacy hardcoded 형태 → primaryLabel + nonPrimaryLabels 필드로 변경.
  // dsNew/dsLegacy 변수 이름 = 옛 dashboard component 호환 위해 보존 (primary / 첫 non-primary 가리킴).
  let figma: SummaryTabData["figma"] = null;
  if (figmaReport) {
    const dsStats = figmaReport.tokenMatrix?.summary?.dsStats ?? {};
    const primaryLabel = figmaTabData?.primaryLabel ?? null;
    const nonPrimaryLabels = figmaTabData?.nonPrimaryLabels ?? [];
    const primary = primaryLabel ? dsStats[primaryLabel] : undefined;
    const firstNonPrimary = nonPrimaryLabels[0]
      ? dsStats[nonPrimaryLabels[0]]
      : undefined;
    figma = {
      primaryLabel,
      nonPrimaryLabels,
      dsNewTotal: primary?.total ?? 0,
      dsNewMatched: primary?.matchedWithCode ?? 0,
      dsLegacyTotal: firstNonPrimary?.total ?? 0,
      dsLegacyMatched: firstNonPrimary?.matchedWithCode ?? 0,
      tokenRowsTotal: figmaReport.tokenMatrix?.summary?.totalUniqueTokens ?? 0,
      unmatchedInstances: figmaReport.instanceAnalysis?.unmatchedInstances ?? 0,
      totalInstances: figmaReport.instanceAnalysis?.totalInstances ?? 0,
      instanceSources: figmaReport.instanceSources ?? {},
      warningsCount: figmaWarningsCount,
    };
  }

  return {
    stamp: { code: codeStamp, figma: figmaStamp, lighthouse: lhStamp },
    code,
    lh,
    figma,
  };
}

function fmtTimeMs(v: number): string {
  if (v == null) return "—";
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(2)} s`;
}

function fmtTimeS(v: number): string {
  if (v == null) return "—";
  if (v < 1000) return `${(v / 1000).toFixed(1)} s`;
  return `${(v / 1000).toFixed(2)} s`;
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}
