/**
 * baseline JSON → CodeTabData 변환.
 *
 * 시안 (Claude Design 핸드오프) 의 `code-tab-data.json` shape 1:1 호환.
 * baseline 의 필드를 rename / 일부 cap 후 출력.
 */

import type { CodebaseReport, UIHealthConfig } from "../../types";
import { judge } from "../../utils/evaluate";
import type { CodeTabData } from "./types";

const HARDCODED_BYFILE_CAP = 5;

export function baselineToCodeData(
  report: CodebaseReport,
  /**
   * 0.8.8 — cfg.thresholds. code 탭 상태 pill / 목표 표기를 markdown 리포터와
   * 같은 evaluate() 판정으로 derive (옛 리터럴 상태 대체). 미전달 = 판정 null.
   */
  thresholds?: UIHealthConfig["thresholds"]
): CodeTabData {
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
    judge: {
      dsCoverage: judge(report.dsCoverage.coverage, thresholds?.dsCoverage),
      tsMigration: judge(report.tsMigration.ratio, thresholds?.tsMigration),
      scssCompliance: judge(
        report.scssVariableCompliance.compliance,
        thresholds?.scssVariableCompliance
      ),
      // 옛 baseline 호환 — preferredCompliance 가 number 단독이던 형식 방어 (code-tab 흐름 일치).
      preferredCompliance: judge(
        typeof smd.preferredCompliance === "object"
          ? smd.preferredCompliance.value
          : (smd.preferredCompliance as number),
        thresholds?.preferredCompliance
      ),
      hardcodedColors: judge(
        report.hardcodedColors.total,
        thresholds?.hardcodedColors
      ),
      forbidden: judge(
        report.forbiddenClassCount.total,
        thresholds?.forbiddenClassOccurrences
      ),
    },
  };
}
