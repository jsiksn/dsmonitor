/**
 * dsmonitor/reports/plugins/* 폴더 검색 + JSON 검증.
 *
 * 폴더 구조: dsmonitor/reports/plugins/{id}/{date}.json
 * - {id} = plugin 폴더 이름 (= JSON 의 id 필드와 일치)
 * - {date} = YYYY-MM-DD 형식
 * - 가장 최신 날짜 파일 1개만 활용 (과거 파일은 보존, 추후 시계열 활용)
 *
 * 검증 실패 케이스 (필수 필드 누락 / id 불일치 / JSON 형식 오류) 도 entry 반환 —
 * dashboard 안 빨간 알림으로 시각화.
 *
 * stale 케이스: measuredAt 가 7일 이상 지난 plugin 정보 — 회색 배지로 시각화.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  DashboardPluginEntry,
  DSMonitorPluginOutput,
} from "./types";

const STALE_THRESHOLD_DAYS = 7;

/**
 * dsmonitor/reports/plugins/ 폴더 검색 + 모든 plugin entry 반환.
 * id 알파벳 순 정렬 (탭 / Summary Layer 정렬 순서와 일치).
 */
export function loadPlugins(pluginsRoot: string): DashboardPluginEntry[] {
  if (!fs.existsSync(pluginsRoot)) return [];
  const folders = fs
    .readdirSync(pluginsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return folders.map((id) =>
    loadPluginFolder(path.join(pluginsRoot, id), id)
  );
}

function loadPluginFolder(
  folderPath: string,
  expectedId: string
): DashboardPluginEntry {
  // 1. 가장 최신 {date}.json 검색
  const datedFiles = fs
    .readdirSync(folderPath)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse();
  if (datedFiles.length === 0) {
    return {
      ok: false,
      id: expectedId,
      reason: `{date}.json 파일 누락 (dsmonitor/reports/plugins/${expectedId}/ 안 YYYY-MM-DD.json 형식 파일 없음)`,
    };
  }
  const latestPath = path.join(folderPath, datedFiles[0]);

  // 2. JSON parse
  let raw: unknown;
  try {
    const text = fs.readFileSync(latestPath, "utf8");
    raw = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      id: expectedId,
      reason: `JSON 형식 오류 (${datedFiles[0]}): ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }

  // 3. schema 검증
  const validation = validatePluginJson(raw, expectedId);
  if (!validation.ok) {
    return { ok: false, id: expectedId, reason: validation.reason };
  }

  // 4. stale 케이스 검증
  const stale = isStale(validation.output.measuredAt);
  return { ok: true, output: validation.output, stale };
}

/**
 * plugin JSON schema 검증 — 필수 필드 (id / label / measuredAt / summary.primary)
 * + id 일치. 외부 plugin 개발자 측 가이드 (docs/plugin-development.md Section 3.2)
 * 와 일치.
 */
function validatePluginJson(
  raw: unknown,
  expectedId: string
):
  | { ok: true; output: DSMonitorPluginOutput }
  | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "JSON root 가 객체 아님" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") {
    return { ok: false, reason: "id 필드 누락 또는 string 아님" };
  }
  if (o.id !== expectedId) {
    return {
      ok: false,
      reason: `id 값 (${o.id}) ≠ 폴더 이름 (${expectedId})`,
    };
  }
  if (typeof o.label !== "string") {
    return { ok: false, reason: "label 필드 누락 또는 string 아님" };
  }
  if (typeof o.measuredAt !== "string") {
    return { ok: false, reason: "measuredAt 필드 누락 또는 string 아님" };
  }
  if (!o.summary || typeof o.summary !== "object") {
    return { ok: false, reason: "summary 필드 누락 또는 객체 아님" };
  }
  const summary = o.summary as Record<string, unknown>;
  if (!summary.primary || typeof summary.primary !== "object") {
    return { ok: false, reason: "summary.primary 누락 또는 객체 아님" };
  }
  const primary = summary.primary as Record<string, unknown>;
  if (typeof primary.label !== "string") {
    return { ok: false, reason: "summary.primary.label 누락" };
  }
  if (typeof primary.value !== "string" && typeof primary.value !== "number") {
    return {
      ok: false,
      reason: "summary.primary.value 누락 (string 또는 number 기대)",
    };
  }
  return { ok: true, output: o as unknown as DSMonitorPluginOutput };
}

/**
 * measuredAt 가 STALE_THRESHOLD_DAYS (7일) 이상 지난 시점인지 검증.
 * 잘못된 measuredAt (parse 실패) 케이스는 stale=false (사용자 인지 누락 회피).
 */
function isStale(measuredAt: string): boolean {
  const measured = new Date(measuredAt).getTime();
  if (isNaN(measured)) return false;
  const diffDays = (Date.now() - measured) / (1000 * 60 * 60 * 24);
  return diffDays > STALE_THRESHOLD_DAYS;
}
