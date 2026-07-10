import { describe, expect, it } from "vitest";
import { evaluate, judge } from "../src/utils/evaluate";

describe("evaluate — direction: higher", () => {
  const t = { good: 0.8, warn: 0.5, direction: "higher" as const };

  it("good 이상이면 good (경계 포함)", () => {
    expect(evaluate(0.8, t)).toBe("good");
    expect(evaluate(0.95, t)).toBe("good");
  });

  it("warn 이상 good 미만이면 warn (경계 포함)", () => {
    expect(evaluate(0.5, t)).toBe("warn");
    expect(evaluate(0.79, t)).toBe("warn");
  });

  it("warn 미만이면 bad", () => {
    expect(evaluate(0.49, t)).toBe("bad");
    expect(evaluate(0, t)).toBe("bad");
  });
});

describe("evaluate — direction: lower", () => {
  const t = { good: 20, warn: 50, direction: "lower" as const };

  it("good 이하이면 good (경계 포함)", () => {
    expect(evaluate(20, t)).toBe("good");
    expect(evaluate(0, t)).toBe("good");
  });

  it("warn 이하 good 초과이면 warn (경계 포함)", () => {
    expect(evaluate(21, t)).toBe("warn");
    expect(evaluate(50, t)).toBe("warn");
  });

  it("warn 초과이면 bad", () => {
    expect(evaluate(51, t)).toBe("bad");
  });
});

describe("judge", () => {
  it("threshold 있으면 status + 기준값 payload", () => {
    const j = judge(0.9, { good: 0.8, warn: 0.5, direction: "higher" });
    expect(j).toEqual({ status: "good", good: 0.8, warn: 0.5, direction: "higher" });
  });

  it("threshold 없으면 null (config 미설정 지표 — 상태 pill 숨김 신호)", () => {
    expect(judge(0.9, undefined)).toBeNull();
  });
});
