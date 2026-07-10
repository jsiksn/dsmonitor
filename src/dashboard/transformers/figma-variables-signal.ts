/**
 * Figma Variables 조회 신호 derive (0.8.8).
 *
 * 옛 흐름: dashboard 가 "Variables 는 plan 제약으로 미포함" 을 리터럴로 표기
 * (시안 잔재 — 사용처 plan 상태와 무관하게 노출). 실제 스캔은 이미
 * `/v1/files/:key/variables/local` 을 조건부 호출하고 있어 (designSystemScan),
 * baseline 에 남는 두 신호로 판별 가능:
 *   - 403 시 warnings 에 "Variables:" prefix 경고 기록
 *   - 성공 시 designSystemCounts[].variables 에 조회 수 기록 (0.8.8+)
 *
 * summary / figma 두 transformer 가 공유.
 */

import type { FigmaReport } from "../../types";

export interface FigmaVariablesSignal {
  /** Variables API 403 warning 존재 — Enterprise plan 미보유로 미조회. */
  restricted: boolean;
  /** 조회 성공 시 DS 합산 변수 수. 신호 없음 (옛 baseline 포함) = null. */
  count: number | null;
}

export function deriveVariablesSignal(figma: FigmaReport): FigmaVariablesSignal {
  const restricted = (figma.warnings ?? []).some((w) =>
    w.startsWith("Variables:")
  );
  let count: number | null = null;
  for (const c of figma.designSystemCounts ?? []) {
    if (typeof c.variables === "number") {
      count = (count ?? 0) + c.variables;
    }
  }
  return { restricted, count };
}
