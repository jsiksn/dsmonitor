/**
 * 날짜 stamp (YYYY-MM-DD) 공유 유틸 (0.8.10).
 *
 * 옛 흐름: 두 형태가 산재 —
 *   - 로컬 타임존 기준 (reporters/json.ts today())
 *   - UTC 기준 `toISOString().slice(0, 10)` (cli.ts / shell.ts)
 * 두 의미가 달라 (자정 전후 타임존 차이) 통일은 동작 변경 — 본 유틸은 두 의미를
 * 각각 보존해 이름으로 구분만 한다. 통일 여부는 별도 결정.
 */

/** 로컬 타임존 기준 오늘 날짜. */
export function todayStampLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** UTC 기준 오늘 날짜 (`toISOString().slice(0, 10)` 동작 그대로). */
export function todayStampUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
