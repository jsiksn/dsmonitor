import { describe, expect, it } from "vitest";
import { baselineToCodeData } from "../src/dashboard/transformers/baseline-to-code-data";
import { buildSummaryData } from "../src/dashboard/transformers/baseline-to-summary-data";
import type { CodebaseReport } from "../src/types";
import baselineJson from "./fixtures/baseline.json";
import { LOOSE_THRESHOLDS, STRICT_THRESHOLDS } from "./fixtures/thresholds";

const baseline = baselineJson as unknown as CodebaseReport;

describe("baselineToCodeData — judge (0.8.8)", () => {
  it("느슨한 thresholds → 전부 good", () => {
    const d = baselineToCodeData(baseline, LOOSE_THRESHOLDS);
    const statuses = Object.values(d.judge).map((j) => j?.status);
    expect(statuses).toEqual(["good", "good", "good", "good", "good", "good"]);
  });

  it("엄격한 thresholds → 전부 bad (같은 baseline, 판정만 변화)", () => {
    const d = baselineToCodeData(baseline, STRICT_THRESHOLDS);
    const statuses = Object.values(d.judge).map((j) => j?.status);
    expect(statuses).toEqual(["bad", "bad", "bad", "bad", "bad", "bad"]);
  });

  it("thresholds 미전달 → judge 전부 null (상태 pill 숨김 신호)", () => {
    const d = baselineToCodeData(baseline);
    expect(Object.values(d.judge).every((j) => j === null)).toBe(true);
  });
});

describe("buildSummaryData", () => {
  const summary = buildSummaryData({
    report: baseline,
    lighthouse: null,
    figmaWarningsCount: 0,
    thresholds: LOOSE_THRESHOLDS,
  });

  it("forbiddenByPreset — preset 매트릭스 필터 + 카운트 내림차순 (0.8.5/0.8.6)", () => {
    expect(summary.code.forbiddenByPreset.map((r) => r.id)).toEqual([
      "bootstrap-utilities",
      "apply-mixed",
      "raw-css",
      "scss-imports",
    ]);
    const values = summary.code.forbiddenByPreset.map((r) => r.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it("scss-imports — 0.10.0 매트릭스 연계 측정과 함께 등재 (옛 의도적 미등재 해제)", () => {
    expect(summary.code.forbiddenByPreset.some((r) => r.id === "scss-imports")).toBe(true);
  });

  it("tsTopJsDirs — jsFiles 내림차순 상위 3 디렉토리 (0.8.8)", () => {
    expect(summary.code.tsTopJsDirs).toEqual(["pages", "components", "store"]);
  });

  it("judge — markdown 리포터와 같은 evaluate 로직", () => {
    expect(summary.code.judge.dsCoverage?.status).toBe("good");
    const strict = buildSummaryData({
      report: baseline,
      lighthouse: null,
      figmaWarningsCount: 0,
      thresholds: STRICT_THRESHOLDS,
    });
    expect(strict.code.judge.dsCoverage?.status).toBe("bad");
  });

  it("figma 미존재 → figma null (Layer 03 hide 신호)", () => {
    expect(summary.figma).toBeNull();
  });
});
