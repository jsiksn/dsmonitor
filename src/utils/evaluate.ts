/**
 * Threshold 판정 공유 유틸 (0.8.8).
 *
 * 옛 흐름: markdown 리포터 안 private evaluate() 로만 존재 — dashboard 는
 * thresholds 를 읽지 않고 배지 / 목표를 리터럴로 표기해 두 산출물 판정이
 * 어긋날 수 있었습니다. 본 모듈로 단일화해 markdown / dashboard 가 같은
 * 로직으로 판정합니다.
 */

import type { Threshold } from "../types";

export type ThresholdStatus = "good" | "warn" | "bad";

export function evaluate(value: number, t: Threshold): ThresholdStatus {
  if (t.direction === "higher") {
    if (value >= t.good) return "good";
    if (value >= t.warn) return "warn";
    return "bad";
  }
  if (value <= t.good) return "good";
  if (value <= t.warn) return "warn";
  return "bad";
}

/**
 * dashboard 데이터로 내려보내는 판정 payload.
 *
 * status 는 transformer (TS) 에서 계산 — babel-inline jsx 가 판정 로직을
 * 다시 구현하지 않게 하는 취지 (표기 화석화 재발 방지). good / warn /
 * direction 은 jsx 가 "목표 ≥ 80%" 류 표기를 만들 때 사용.
 */
export interface MetricJudgment {
  status: ThresholdStatus;
  good: number;
  warn: number;
  direction: "higher" | "lower";
}

/** Threshold 가 config 에 없으면 null — jsx 는 null 시점에 상태 pill 을 숨김. */
export function judge(
  value: number,
  t: Threshold | undefined
): MetricJudgment | null {
  if (!t) return null;
  return {
    status: evaluate(value, t),
    good: t.good,
    warn: t.warn,
    direction: t.direction,
  };
}
