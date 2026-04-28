/**
 * baseline JSON → CodeTabData 변환.
 *
 * 시안 (Claude Design 핸드오프) 의 `code-tab-data.json` shape 1:1 호환.
 * baseline 의 필드를 rename / 일부 cap 후 출력.
 */

import type { CodebaseReport } from "../../types";
import type { CodeTabData } from "./types";

const HARDCODED_BYFILE_CAP = 5;

export function baselineToCodeData(report: CodebaseReport): CodeTabData {
  const smd = report.stylingMethodDistribution;
  return {
    totals: report.totals,
    smd: {
      preferredId: smd.preferredId,
      preferredCompliance: smd.preferredCompliance,
      forbiddenFileCount: smd.forbiddenFileCount,
      forbiddenFileRatio: smd.forbiddenFileRatio,
      counts: {
        allowed: smd.allowed,
        forbidden: smd.forbidden,
        allowedGlobal: smd.allowedGlobal,
        orphanClass: smd.orphanClass,
        noClass: smd.noClass,
      },
      totalFiles: smd.totalFiles,
      orphanSamples: smd.orphanSamples,
    },
    scss: report.scssVariableCompliance,
    forbidden: report.forbiddenClassCount,
    hardcoded: {
      total: report.hardcodedColors.total,
      // 시안과 동일하게 byFile 상위 5개로 cap (analyzer 는 30개까지 보존).
      byFile: report.hardcodedColors.byFile.slice(0, HARDCODED_BYFILE_CAP),
    },
    ts: report.tsMigration,
    ds: report.dsCoverage,
    mig: report.migrationCandidates,
  };
}
