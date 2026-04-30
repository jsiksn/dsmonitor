/**
 * plugin DashboardPluginEntry → dashboard 직접 활용 형식 변환 영역.
 *
 * 본 0.1.0 영역에서는 단순 pass-through — DashboardPluginEntry 영역 그대로 활용.
 * meta 영역 보존만 (자료 형식 약속 영역 — dashboard 표시 빠짐 영역, 추후 0.2.0 영역에서 추가).
 *
 * 추후 0.2.0 영역에서 시계열 / 추이 영역 추가 시점에 transformer 영역 확장
 * (이력 자료 합산 등).
 */

import type { DashboardPluginEntry } from "../../plugins/types";

export function pluginsToData(
  entries: DashboardPluginEntry[]
): DashboardPluginEntry[] {
  // 0.1.0 영역에서는 변환 빠짐 — 그대로 dashboard 안 inject.
  // meta 영역 자료 보존 (output.meta 영역 그대로 — dashboard 시각 빠짐).
  return entries;
}
