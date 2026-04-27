/**
 * DS 파일 스캔 — 2-pass + **페이지별 순차 호출** 전략 (2026-04-24 재작업).
 *
 * Pass 1: fetchFileMeta(fileKey) — `?depth=1` 으로 페이지 id 목록 수집
 * Pass 2: 각 페이지를 **단일 id 단위** 로 fetchFileNodes 호출 후 맵 병합
 *
 * 배경: 페이지 id 를 콤마로 묶어 한 번에 요청하면 파일 용량 큰 DS 는
 * V8 문자열 한계(~512MB) 초과로 실패 (ds-legacy 4페이지 일괄 요청 = 실패).
 * 사전 조사 (e2) 로 ds-legacy 단일 페이지(478:9931) 는 70MB 로 성공 확인.
 * 페이지별 순회하면 각 응답이 작아 한계 안에 수신 가능하고, 맵은 누적 병합.
 *
 * dedup: 한 파일 내 node-id 는 유일하므로 같은 key 중복 가능성은 낮으나
 * 방어적으로 첫 등장만 유지 (나중 페이지 응답의 같은 key 는 무시).
 *
 * 에러 처리:
 *   - 개별 페이지 실패: warnings 에 기록 후 다음 페이지 진행
 *   - 모든 페이지 실패: throw (메인 catch 가 errors 로 수집)
 *   - 401/403 (인증): 즉시 rethrow — 다른 파일도 다 실패할 것이므로 전체 중단
 */

import type { FigmaDesignSystemCount, FigmaVariableEntry } from "../../types";
import {
  fetchFileMeta,
  fetchFileNodes,
  fetchLocalVariables,
  FigmaApiError,
  type FigmaComponentEntry,
  type FigmaComponentSetEntry,
  type FigmaStyleEntry,
} from "./apiClient";

export type DesignSystemScanResult = {
  count: FigmaDesignSystemCount;
  /**
   * componentMap 에 등록할 엔트리. figma.ts 메인에서 conflict 검증 후 병합.
   *
   * **key = stable library key (component entry 의 `.key` 필드, 긴 hash)**.
   * 2026-04-24 수정 — 이전엔 DS 파일의 local nodeId 를 key 로 썼으나, 도메인
   * INSTANCE.componentId 는 그 도메인 파일의 local nodeId 라 직접 비교 불가능
   * (서로 다른 파일의 id 체계). stable library key 가 Figma library 참조의
   * 교집합 namespace 이므로 이것으로 매칭해야 함 (사전 조사 g1/g2 확인).
   */
  componentMapEntries: Array<[string, { label: string; name: string }]>;
  /**
   * Styles 전체 엔트리 (단계 3, 2026-04-24). 토큰 매칭은 name 기준이라
   * componentMapEntries 와 달리 stable key 튜플이 아닌 엔트리 배열 형태.
   * 동명 중복은 그대로 유지 — tokenMatrix 에서 count 로 표현.
   */
  styleMapEntries: FigmaStyleEntry[];
  /**
   * Variables 엔트리 (단계 3, 2026-04-24). `/v1/files/:key/variables/local`
   * 응답을 normalize. Phase 0.5 에선 Enterprise plan 미보유로 대부분 0 건.
   * 403 은 warnings 로, 기타 에러는 상위에서 errors 로 분류.
   */
  variableMapEntries: FigmaVariableEntry[];
  /** 개별 페이지 스캔 실패 등 비치명적 경고. string 형식 (errors 배열과 대칭). */
  warnings: string[];
};

/**
 * DS 파일 1개의 2-pass 스캔 (페이지별 순차 호출).
 *
 * @throws FigmaApiError Pass 1 실패 시 또는 모든 페이지 실패 시. 메인에서 errors 수집.
 * @throws FigmaApiError 401/403 은 페이지 순회 중에도 즉시 rethrow — 전체 중단.
 */
export async function scanDesignSystem(
  fileKey: string,
  label: string,
  token: string
): Promise<DesignSystemScanResult> {
  const warnings: string[] = [];

  // Pass 1 — 페이지 id 목록
  const meta = await fetchFileMeta(fileKey, token);
  const pageIds = (meta.document?.children ?? []).map((c) => c.id);

  if (pageIds.length === 0) {
    // 빈 파일 또는 페이지 없음.
    return {
      count: emptyCount(label),
      componentMapEntries: [],
      styleMapEntries: [],
      variableMapEntries: [],
      warnings,
    };
  }

  // Pass 2 — 페이지별 순차 호출 + 병합
  const mergedComponents = new Map<string, FigmaComponentEntry>();
  const mergedComponentSets = new Map<string, FigmaComponentSetEntry>();
  const mergedStyles = new Map<string, FigmaStyleEntry>();

  let successCount = 0;

  for (const pageId of pageIds) {
    try {
      const file = await fetchFileNodes(fileKey, [pageId], token);

      // 맵 병합 — 같은 key 가 이미 있으면 첫 등장 유지
      mergeInto(mergedComponents, file.components ?? {});
      mergeInto(mergedComponentSets, file.componentSets ?? {});
      mergeInto(mergedStyles, file.styles ?? {});

      successCount++;
      const pc = Object.keys(file.components ?? {}).length;
      const ps = Object.keys(file.styles ?? {}).length;
      console.log(`[figma]   - page ${pageId} ... ok (components=${pc}, styles=${ps})`);
    } catch (e) {
      // 401/403 은 파일/페이지 무관 전역 문제. 즉시 rethrow.
      if (e instanceof FigmaApiError && (e.status === 401 || e.status === 403)) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(
        `DS "${label}": page ${pageId} 스캔 실패 — 이 페이지의 components/styles 는 최종 카운트에 누락. 원인: ${msg}`
      );
      console.warn(`[figma]   - page ${pageId} ... failed: ${msg}`);
    }
  }

  if (successCount === 0) {
    // 모든 페이지 실패 — 파일 단위 실패로 간주. warnings 내용을 한 문장으로 합쳐 throw.
    throw new FigmaApiError(
      `DS "${label}" 모든 페이지(${pageIds.length}개) 스캔 실패. ` +
        `페이지별 실패 원인:\n${warnings.join("\n")}`,
      null,
      `/v1/files/${fileKey}`
    );
  }

  // 병합 맵 기반 카운트 + 엔트리 구성
  const count = countFromMaps(label, mergedComponents, mergedComponentSets, mergedStyles);
  const entries = buildEntries(mergedComponents, label);
  const styleMapEntries = [...mergedStyles.values()];

  // Variables API — 조건부 호출. Enterprise plan 미보유 시 403 (warning).
  const variableMapEntries = await scanLocalVariables(fileKey, label, token, warnings);

  return {
    count,
    componentMapEntries: entries,
    styleMapEntries,
    variableMapEntries,
    warnings,
  };
}

/**
 * `/v1/files/:key/variables/local` 시도.
 *   - 200: normalize 해서 반환
 *   - 403: warnings 에 기록 후 빈 배열 반환 (에러 아님 — Enterprise 미보유 예상)
 *   - 기타 FigmaApiError: rethrow (상위 figma.ts 에서 errors 로 분류)
 *
 * 401 은 figmaFetch 가 이미 rethrow 상태 — 이 함수까지 오지 않음.
 */
async function scanLocalVariables(
  fileKey: string,
  label: string,
  token: string,
  warnings: string[]
): Promise<FigmaVariableEntry[]> {
  try {
    const resp = await fetchLocalVariables(fileKey, token);
    const vars = resp?.meta?.variables ?? {};
    const entries: FigmaVariableEntry[] = [];
    for (const [id, v] of Object.entries(vars)) {
      if (!v) continue;
      entries.push({
        id,
        name: v.name,
        resolvedType: v.resolvedType,
      });
    }
    return entries;
  } catch (e) {
    if (e instanceof FigmaApiError && e.status === 403) {
      warnings.push(
        `Variables: Enterprise plan 필요 ("${label}"). /v1/files/:key/variables/local 접근 거부 (HTTP 403). ` +
          `plan 업그레이드 + 토큰 재발급 시 자동 활성화.`
      );
      return [];
    }
    // 404 는 파일 없음이라 DS 스캔 자체가 이미 실패했어야 함 — 방어적으로 빈 배열.
    // 나머지는 rethrow (상위에서 errors 로 분류).
    throw e;
  }
}

// ───── 내부 헬퍼 ─────────────────────────────────────────────────

function mergeInto<V>(target: Map<string, V>, source: Record<string, V>): void {
  for (const [k, v] of Object.entries(source)) {
    if (target.has(k)) continue; // 첫 등장만 유지 (dedup)
    target.set(k, v);
  }
}

function countFromMaps(
  label: string,
  components: Map<string, FigmaComponentEntry>,
  componentSets: Map<string, FigmaComponentSetEntry>,
  styles: Map<string, FigmaStyleEntry>
): FigmaDesignSystemCount {
  const stylesByType: Record<string, number> = {};
  for (const v of styles.values()) {
    const t = v.styleType ?? "UNKNOWN";
    stylesByType[t] = (stylesByType[t] ?? 0) + 1;
  }

  return {
    label,
    // Variables 는 Phase B 이월 — file_variables:read scope 미보유.
    variables: null,
    styles: styles.size,
    stylesByType,
    components: components.size,
    variantGroups: componentSets.size,
  };
}

function buildEntries(
  components: Map<string, FigmaComponentEntry>,
  label: string
): Array<[string, { label: string; name: string }]> {
  // key 는 stable library key (component.key) — 도메인 INSTANCE 매칭을 위한
  // 교집합 namespace. local nodeId 는 여기서 쓰지 않음 (안 맞으므로).
  const entries: Array<[string, { label: string; name: string }]> = [];
  for (const entry of components.values()) {
    const stableKey = entry.key;
    if (!stableKey) continue; // 드문 방어 — stable key 없는 entry 는 매칭 불가
    entries.push([stableKey, { label, name: entry.name }]);
  }
  return entries;
}

function emptyCount(label: string): FigmaDesignSystemCount {
  return {
    label,
    variables: null,
    styles: 0,
    stylesByType: {},
    components: 0,
    variantGroups: 0,
  };
}
