/**
 * 자릿수 반올림 공유 유틸 (0.8.10).
 *
 * 옛 흐름: 동일 구현이 4곳 복제 (analyzers/codebase, analyzers/figma/componentMatch,
 * dashboard/transformers/baseline-to-figma-data, baseline-to-summary-data).
 */
export function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}
