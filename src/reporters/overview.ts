import fs from "node:fs/promises";
import path from "node:path";
import type { CodebaseReport, UIHealthConfig } from "../types";

/**
 * 비개발자용 overview 문서 생성.
 * 템플릿 파일의 {{placeholder}}를 Report/Config의 값으로 치환한다.
 *
 * 템플릿이 없으면 조용히 skip — 선택적 기능.
 */
export async function generateOverview(
  report: CodebaseReport,
  cfg: UIHealthConfig,
  opts: { templatePath: string; outputPath: string }
): Promise<boolean> {
  let tpl: string;
  try {
    tpl = await fs.readFile(opts.templatePath, "utf8");
  } catch {
    return false;
  }
  const values = buildValues(report, cfg);
  const missing = new Set<string>();
  const rendered = tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key]);
    }
    missing.add(key);
    return `{{${key}?}}`;
  });

  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await fs.writeFile(opts.outputPath, rendered, "utf8");

  if (missing.size > 0) {
    console.warn(
      `[overview] unknown placeholders: ${Array.from(missing).join(", ")}`
    );
  }
  return true;
}

function pct(n: number, digits = 1): string {
  return (n * 100).toFixed(digits) + "%";
}

function buildValues(
  r: CodebaseReport,
  c: UIHealthConfig
): Record<string, string | number> {
  const d = r.stylingMethodDistribution;
  const fb = r.forbiddenClassCount;
  const mc = r.migrationCandidates;
  const completed = c.reportStatus?.completedPhases ?? [];
  const last = completed[completed.length - 1];
  const curr = c.reportStatus?.currentPhase;
  const upcoming = c.reportStatus?.upcomingPhases ?? [];
  const nextUpcoming = upcoming[0];

  return {
    // 타이밍
    generatedAt: r.generatedAt,
    generatedDate: r.generatedAt.slice(0, 10),

    // 규모
    codeFiles: r.totals.codeFiles,
    styleFiles: r.totals.styleFiles,
    tsFiles: r.totals.tsFiles,
    jsFiles: r.totals.jsFiles,
    dsComponentFiles: r.totals.dsComponentFiles,
    nonDsComponentFiles: r.totals.nonDsComponentFiles,
    totalUIComponentFiles:
      r.totals.dsComponentFiles + r.totals.nonDsComponentFiles,

    // TS
    tsRatioPct: pct(r.tsMigration.ratio),

    // DS
    dsCoveragePct: pct(r.dsCoverage.coverage),

    // Forbidden
    forbiddenFileCount: d.forbiddenFileCount,
    totalFiles: d.totalFiles,
    forbiddenFileRatioPct: pct(d.forbiddenFileRatio),
    forbiddenClassTotal: fb.total,
    bootstrapClassCount: fb.byId["bootstrap-utilities"] ?? 0,
    tailwindClassCount: fb.byId["tailwind-classes"] ?? 0,

    // Hardcoded
    hardcodedColors: r.hardcodedColors.total,

    // SCSS Variable
    scssVariableCompliancePct: pct(r.scssVariableCompliance.compliance),

    // Migration candidates
    migrationTotal: mc.totalOccurrences,
    migrationFilesAffected: mc.totalFilesAffected,
    migrationInputCount: mc.byTarget.Input ?? 0,
    migrationSelectCount: mc.byTarget.Select ?? 0,
    migrationButtonCount: mc.byTarget.Button ?? 0,
    migrationTableCount: mc.byTarget.Table ?? 0,

    // Phase
    currentPhaseName: curr?.name ?? "—",
    currentPhaseStartedAt: curr?.startedAt ?? "—",
    currentPhaseNote: curr?.note ?? "",
    lastCompletedPhaseName: last?.name ?? "—",
    lastCompletedPhaseAt: last?.completedAt ?? "—",
    lastCompletedPhaseNote: last?.note ?? "",
    nextUpcomingPhaseName: nextUpcoming?.name ?? "—",
    nextUpcomingPhaseNote: nextUpcoming?.note ?? "",
  };
}
