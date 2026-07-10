/**
 * 테스트용 thresholds 2종 — fixture baseline (tests/fixtures/baseline.json) 의
 * 측정값 기준으로 "전부 good" / "전부 bad" 가 나오도록 설계.
 */
import type { UIHealthConfig } from "../../src/types";

export const LOOSE_THRESHOLDS: UIHealthConfig["thresholds"] = {
  dsCoverage: { good: 0.5, warn: 0.3, direction: "higher" },
  tsMigration: { good: 0.5, warn: 0.3, direction: "higher" },
  scssVariableCompliance: { good: 0.8, warn: 0.6, direction: "higher" },
  preferredCompliance: { good: 0.6, warn: 0.4, direction: "higher" },
  hardcodedColors: { good: 50, warn: 100, direction: "lower" },
  forbiddenClassOccurrences: { good: 200, warn: 500, direction: "lower" },
  forbiddenFileRatio: { good: 0.5, warn: 0.7, direction: "lower" },
};

export const STRICT_THRESHOLDS: UIHealthConfig["thresholds"] = {
  dsCoverage: { good: 0.9, warn: 0.8, direction: "higher" },
  tsMigration: { good: 0.9, warn: 0.8, direction: "higher" },
  scssVariableCompliance: { good: 0.95, warn: 0.9, direction: "higher" },
  preferredCompliance: { good: 0.9, warn: 0.8, direction: "higher" },
  hardcodedColors: { good: 0, warn: 10, direction: "lower" },
  forbiddenClassOccurrences: { good: 0, warn: 50, direction: "lower" },
  forbiddenFileRatio: { good: 0.05, warn: 0.1, direction: "lower" },
};
