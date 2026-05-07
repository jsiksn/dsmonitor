/**
 * plugin DashboardPluginEntry → dashboard 직접 활용 형식 변환.
 *
 * 본 0.1.0 시점에서는 단순 pass-through — DashboardPluginEntry 그대로 활용.
 * meta 보존만 (정보 형식 약속 — dashboard 표시 누락, 추후 0.2.0 시점에서 추가).
 *
 * 추후 0.2.0 시점에서 시계열 / 추이 추가 시점에 transformer 확장
 * (이력 정보 합산 등).
 */

import type { DashboardPluginEntry } from "../../plugins/types";

export function pluginsToData(
  entries: DashboardPluginEntry[]
): DashboardPluginEntry[] {
  // 0.1.0 시점에서는 변환 없음 — 그대로 dashboard 안 inject.
  // meta 정보 보존 (output.meta 그대로 — dashboard 시각 누락).
  return entries;
}
