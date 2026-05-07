/**
 * Figma API 응답 크기 한계 (V8 문자열 ~512MB) 케이스 자동 처리 (0.2.2 추가).
 *
 * 시점: 페이지 / 도메인 단위 호출이 RESPONSE_TOO_LARGE 로 실패하면 진입.
 * 흐름: parent subtree → depth=1 메타데이터 호출 → 직속 children 단위 분할 호출.
 *       자식 호출도 RESPONSE_TOO_LARGE 면 한 단계 더 들어가 재귀.
 *
 * MAX_DEPTH 도달까지 분할 시도, 그래도 실패하면 throw (silent fail 회피).
 * Phase 1 권고치 = 4 (사용자 승인). depth=0 진입점 → depth=4 까지 시도.
 *
 * helper 변종 분리 (사용자 권고):
 *   - DS 용 fetchPageWithSplit  : `/v1/files/{key}?ids=...` 응답 (top-level
 *     components/componentSets/styles 맵 보존). designSystemScan 진입점 호환.
 *   - 도메인 용 fetchNodesWithSplit : `/v1/files/{key}/nodes?ids=...` 응답
 *     (`nodes[id]` wrapper 안 자체 components 맵 보존). domainScan 진입점 호환.
 *
 * 호출 폭증 모니터링: 분할 진입 횟수를 별도 카운터로 추적. 임계값 초과 시 warning.
 */

import {
  fetchFileNodes,
  fetchNodes,
  isResponseTooLarge,
  FigmaApiError,
  type FigmaFileResponse,
  type FigmaFileNodeEntry,
  type FigmaNode,
  type FigmaNodesResponse,
  type FigmaComponentEntry,
  type FigmaComponentSetEntry,
  type FigmaStyleEntry,
} from "./apiClient";

/** 재귀 분할 깊이 한계. 사용자 승인 (2026-05-07). */
export const MAX_SPLIT_DEPTH = 4;

/** 분할 진입 발생 케이스 임계 호출 횟수 — 초과 시 warning 메시지 출력 권고. */
export const SPLIT_CALL_WARN_THRESHOLD = 100;

// ─── 분할 카운터 ──────────────────────────────────────────────────
//
// 단일 측정 동안의 누적치. figmaFetch 측 전체 호출 횟수와 별도 — "분할 흐름이
// 추가 발생시킨" 호출만 추적. 측정 시작 시 reset, 끝에 get.

let splitFetchCount = 0;
let splitEntryCount = 0;

export function resetSplitCounters(): void {
  splitFetchCount = 0;
  splitEntryCount = 0;
}

/** 분할 흐름이 추가 호출한 fetch 누적 횟수. */
export function getSplitFetchCount(): number {
  return splitFetchCount;
}

/** 분할 흐름 진입 (RESPONSE_TOO_LARGE 검출) 누적 횟수. */
export function getSplitEntryCount(): number {
  return splitEntryCount;
}

// ═══════════════════════════════════════════════════════════════════
// DS 용 — `/v1/files/{key}?ids=...` 분할
// ═══════════════════════════════════════════════════════════════════

/**
 * DS 페이지 호출의 분할 wrapper.
 *
 * 동작:
 *   1. 옛 흐름 그대로 fetchFileNodes(fileKey, [pageId]) 1회 시도.
 *   2. 성공 시 그 응답 그대로 반환 (회귀 회피 — 옛 정상 케이스 호출 횟수 변화 0).
 *   3. RESPONSE_TOO_LARGE 시 fetchByFramesForFile(...) 진입 — depth=1 메타데이터
 *      호출로 직속 children 수집 → 각 child 별 재귀 분할.
 *   4. 그 외 에러는 그대로 rethrow (네트워크 / 인증 / 권한 등 분할 무의미).
 *
 * 반환: FigmaFileResponse 와 동일 형태. 분할 케이스에선 components/componentSets/
 *       styles 가 합산된 가상 합성 응답. document 부분은 호출 측 미사용.
 *
 * @throws FigmaApiError MAX_SPLIT_DEPTH 도달 시.
 */
export async function fetchPageWithSplit(
  fileKey: string,
  pageId: string,
  token: string
): Promise<FigmaFileResponse> {
  try {
    return await fetchFileNodes(fileKey, [pageId], token);
  } catch (e) {
    if (!isResponseTooLarge(e)) throw e;
    splitEntryCount++;
    console.warn(
      `[figma] page ${pageId} 응답 크기 한계 초과 — frame 분할 호출 진입 (depth=0)`
    );
    return await fetchByFramesForFile(fileKey, pageId, 0, token);
  }
}

/**
 * 재귀 분할 — DS 응답 형태 (`/v1/files/{key}?ids=...`).
 *
 * Endpoint depth 의미 차이 (0.2.2 정정 — 향후 혼동 회피):
 *   - `/v1/files/{key}?ids=X&depth=N`        → **root 기준** N 레벨까지.
 *     X 가 root depth=1 (CANVAS) 이면 depth=1 = X 자체까지만, 자식 안 펼침.
 *   - `/v1/files/{key}/nodes?ids=X&depth=N`  → **X 기준** N 레벨까지.
 *     depth=1 = X 직속 children 까지. 우리가 원하는 것.
 *
 * 그래서 메타데이터 호출은 `/nodes?ids=X&depth=1` (parent 기준) 사용. 자식 fetch
 * 는 옛대로 `/v1/files/{key}?ids=childId` (DS 응답 형태 보존 — 호출 측 designSystem
 * Scan 의 mergeInto 흐름 호환).
 *
 * 1. depth >= MAX_SPLIT_DEPTH 시 throw (분할 한계 도달).
 * 2. /nodes?ids=parentId&depth=1 메타데이터 호출 — children 수집.
 *    호출 자체가 RESPONSE_TOO_LARGE 시 명시 메시지로 wrapping throw.
 * 3. children 0개면 빈 합성 응답 반환 (옛 흐름 보존 — 빈 page / 단순 leaf 케이스).
 * 4. 각 child 별 fetchFileNodes 호출 (DS 응답 형태). 성공 시 mergeRecord.
 *    RESPONSE_TOO_LARGE 시 재귀 (depth+1). 그 외 에러는 rethrow.
 * 5. 합산 결과 = 가상 FigmaFileResponse.
 */
async function fetchByFramesForFile(
  fileKey: string,
  parentId: string,
  depth: number,
  token: string
): Promise<FigmaFileResponse> {
  if (depth >= MAX_SPLIT_DEPTH) {
    throw new FigmaApiError(
      `Figma 응답 크기 한계 초과 — frame 분할 깊이 한계 (MAX=${MAX_SPLIT_DEPTH}) 도달. ` +
        `parent=${parentId}. 더 작은 단위 분할 불가 — figma 파일 구조 검토 필요.`,
      null,
      `/v1/files/${fileKey}?ids=${parentId}`
    );
  }

  // 1단계 children 수집 — `/nodes?ids=X&depth=1` (parent 기준 depth=1).
  // depth=1 응답 자체가 RESPONSE_TOO_LARGE 인 케이스 = parent 직속 children 수가
  // 비현실적으로 많은 figma 파일 구조. 분할 더 못 함 — 명시 메시지로 throw.
  splitFetchCount++;
  let metaForChildren: FigmaNodesResponse;
  try {
    metaForChildren = await fetchNodes(fileKey, [parentId], token, { depth: 1 });
  } catch (e) {
    if (isResponseTooLarge(e)) {
      throw new FigmaApiError(
        `page 직속 children 메타데이터 호출도 응답 크기 초과 — figma 파일 구조 검토 필요 (parentId=${parentId})`,
        null,
        `/v1/files/${fileKey}/nodes?ids=${parentId}&depth=1`,
        "RESPONSE_TOO_LARGE"
      );
    }
    throw e;
  }

  const parentEntry = metaForChildren.nodes[parentId];
  if (!parentEntry) {
    throw new FigmaApiError(
      `frame 분할 메타데이터 응답에 parent=${parentId} 항목이 없습니다 (삭제됐거나 권한 변경?).`,
      null,
      `/v1/files/${fileKey}/nodes?ids=${parentId}&depth=1`
    );
  }
  const children = parentEntry.document?.children ?? [];

  if (children.length === 0) {
    console.warn(
      `[figma]   - frame ${parentId} (depth=${depth}) children 0개 — 분할 대상 없음`
    );
    return emptyFileResponse();
  }

  console.log(
    `[figma]   - frame ${parentId} (depth=${depth}) → ${children.length}개 child 분할 호출`
  );

  const mergedComponents = new Map<string, FigmaComponentEntry>();
  const mergedComponentSets = new Map<string, FigmaComponentSetEntry>();
  const mergedStyles = new Map<string, FigmaStyleEntry>();

  for (const child of children) {
    try {
      // 자식 fetch — `/v1/files/{key}?ids=childId` (DS 응답 형태 보존).
      splitFetchCount++;
      const childRes = await fetchFileNodes(fileKey, [child.id], token);
      mergeRecord(mergedComponents, childRes.components);
      mergeRecord(mergedComponentSets, childRes.componentSets);
      mergeRecord(mergedStyles, childRes.styles);
    } catch (e) {
      if (isResponseTooLarge(e)) {
        splitEntryCount++;
        console.warn(
          `[figma]   - child ${child.id} (depth=${depth + 1}) 응답 크기 한계 초과 — 재귀 분할`
        );
        const sub = await fetchByFramesForFile(fileKey, child.id, depth + 1, token);
        mergeRecord(mergedComponents, sub.components);
        mergeRecord(mergedComponentSets, sub.componentSets);
        mergeRecord(mergedStyles, sub.styles);
      } else {
        throw e;
      }
    }
  }

  return {
    name: "",
    lastModified: "",
    version: "",
    schemaVersion: 0,
    role: "",
    editorType: "",
    document: parentEntry.document,
    components: mapToRecord(mergedComponents),
    componentSets: mapToRecord(mergedComponentSets),
    styles: mapToRecord(mergedStyles),
  };
}

// ═══════════════════════════════════════════════════════════════════
// 도메인 용 — `/v1/files/{key}/nodes?ids=...` 분할
// ═══════════════════════════════════════════════════════════════════

/**
 * 도메인 노드 호출의 분할 wrapper.
 *
 * 동작:
 *   1. 옛 흐름 그대로 fetchNodes(fileKey, nodeIds) 1회 시도 — nodeIds 모두 묶어 호출.
 *   2. 성공 시 응답 그대로 반환 (회귀 회피).
 *   3. RESPONSE_TOO_LARGE 시:
 *      a. nodeIds 가 2개 이상이면 절반씩 분할 호출 (재귀 wrap) — 묶음이 큰 케이스.
 *      b. nodeIds 가 1개면 fetchByFramesForNodes(nodeId, depth=0) 진입 — 단일 node
 *         자체가 큰 케이스.
 *   4. 그 외 에러는 rethrow.
 *
 * 반환: FigmaNodesResponse 와 동일 형태. 분할 케이스에선 nodes 맵 합성.
 */
export async function fetchNodesWithSplit(
  fileKey: string,
  nodeIds: string[],
  token: string
): Promise<FigmaNodesResponse> {
  try {
    return await fetchNodes(fileKey, nodeIds, token);
  } catch (e) {
    if (!isResponseTooLarge(e)) throw e;
    splitEntryCount++;

    if (nodeIds.length > 1) {
      // 묶음 분할 — 절반씩 호출 후 합성
      const mid = Math.floor(nodeIds.length / 2);
      const left = nodeIds.slice(0, mid);
      const right = nodeIds.slice(mid);
      console.warn(
        `[figma] nodes 묶음 ${nodeIds.length}개 응답 크기 한계 초과 — 절반 분할 (${left.length} / ${right.length})`
      );
      const [resL, resR] = await Promise.all([
        fetchNodesWithSplit(fileKey, left, token),
        fetchNodesWithSplit(fileKey, right, token),
      ]);
      return mergeNodesResponses(resL, resR);
    }

    // 단일 node 분할 — frame 단위 재귀
    const onlyId = nodeIds[0];
    console.warn(
      `[figma] node ${onlyId} 단일 호출 응답 크기 한계 초과 — frame 분할 진입 (depth=0)`
    );
    const synthEntry = await fetchByFramesForNodes(fileKey, onlyId, 0, token);
    return {
      name: "",
      lastModified: "",
      version: "",
      role: "",
      editorType: "",
      nodes: { [onlyId]: synthEntry },
    };
  }
}

/**
 * 재귀 분할 — 도메인 응답 형태 (`/v1/files/{key}/nodes?ids=...`).
 *
 * Endpoint depth 의미: `/nodes?ids=X&depth=N` = X 기준 N 레벨까지. depth=1 =
 * X 직속 children 까지 (DS 변종의 fetchByFramesForFile 머리 주석 참고 — 두 endpoint
 * depth 의미 차이로 0.2.2 안 정정 사례 있음).
 *
 * DS 변종과 차이:
 *   - 응답 = `{ nodes: { [id]: entry } }` wrapper. entry 안에 자체 document /
 *     components / styles. 합성 시 entry 단위로 합산.
 *   - 도메인 측 walkSubtree 는 entry.document.children 을 따라 INSTANCE 매칭. 합성
 *     entry 의 document 도 children 합쳐 walk 가능 형태로 재구성.
 */
async function fetchByFramesForNodes(
  fileKey: string,
  parentId: string,
  depth: number,
  token: string
): Promise<FigmaFileNodeEntry> {
  if (depth >= MAX_SPLIT_DEPTH) {
    throw new FigmaApiError(
      `Figma 응답 크기 한계 초과 — frame 분할 깊이 한계 (MAX=${MAX_SPLIT_DEPTH}) 도달. ` +
        `parent=${parentId}. 더 작은 단위 분할 불가 — figma 파일 구조 검토 필요.`,
      null,
      `/v1/files/${fileKey}/nodes?ids=${parentId}`
    );
  }

  // 1단계 children 수집.
  // depth=1 응답 자체가 RESPONSE_TOO_LARGE 인 케이스 = node 직속 children 수가
  // 비현실적으로 많은 figma 파일 구조. 분할 더 못 함 — 명시 메시지로 throw.
  splitFetchCount++;
  let meta: FigmaNodesResponse;
  try {
    meta = await fetchNodes(fileKey, [parentId], token, { depth: 1 });
  } catch (e) {
    if (isResponseTooLarge(e)) {
      throw new FigmaApiError(
        `page 직속 children 메타데이터 호출도 응답 크기 초과 — figma 파일 구조 검토 필요 (parentId=${parentId})`,
        null,
        `/v1/files/${fileKey}/nodes?ids=${parentId}&depth=1`,
        "RESPONSE_TOO_LARGE"
      );
    }
    throw e;
  }
  const parentEntry = meta.nodes[parentId];
  if (!parentEntry) {
    throw new FigmaApiError(
      `frame 분할 메타데이터 응답에 parent=${parentId} 항목이 없습니다 (삭제됐거나 권한 변경?).`,
      null,
      `/v1/files/${fileKey}/nodes?ids=${parentId}&depth=1`
    );
  }

  const children = parentEntry.document?.children ?? [];

  if (children.length === 0) {
    console.warn(
      `[figma]   - node ${parentId} (depth=${depth}) children 0개 — 분할 대상 없음`
    );
    return {
      document: parentEntry.document,
      components: parentEntry.components ?? {},
      componentSets: parentEntry.componentSets ?? {},
      styles: parentEntry.styles ?? {},
      schemaVersion: parentEntry.schemaVersion,
    };
  }

  console.log(
    `[figma]   - node ${parentId} (depth=${depth}) → ${children.length}개 child 분할 호출`
  );

  const mergedDocChildren: FigmaNode[] = [];
  const mergedComponents = new Map<string, FigmaComponentEntry>();
  const mergedComponentSets = new Map<string, FigmaComponentSetEntry>();
  const mergedStyles = new Map<string, FigmaStyleEntry>();

  for (const child of children) {
    try {
      splitFetchCount++;
      const childRes = await fetchNodes(fileKey, [child.id], token);
      const childEntry = childRes.nodes[child.id];
      if (!childEntry) {
        console.warn(
          `[figma]   - child ${child.id} (depth=${depth + 1}) 응답에 항목 없음 — 건너뜀`
        );
        continue;
      }
      mergedDocChildren.push(childEntry.document);
      mergeRecord(mergedComponents, childEntry.components ?? {});
      mergeRecord(mergedComponentSets, childEntry.componentSets ?? {});
      mergeRecord(mergedStyles, childEntry.styles ?? {});
    } catch (e) {
      if (isResponseTooLarge(e)) {
        splitEntryCount++;
        console.warn(
          `[figma]   - child ${child.id} (depth=${depth + 1}) 응답 크기 한계 초과 — 재귀 분할`
        );
        const subEntry = await fetchByFramesForNodes(fileKey, child.id, depth + 1, token);
        mergedDocChildren.push(subEntry.document);
        mergeRecord(mergedComponents, subEntry.components ?? {});
        mergeRecord(mergedComponentSets, subEntry.componentSets ?? {});
        mergeRecord(mergedStyles, subEntry.styles ?? {});
      } else {
        throw e;
      }
    }
  }

  // 가상 합성 entry — parent 의 메타데이터 (id/name/type) 유지하되 children 만 교체.
  const synthDocument: FigmaNode = {
    id: parentEntry.document.id,
    name: parentEntry.document.name,
    type: parentEntry.document.type,
    children: mergedDocChildren,
  };

  return {
    document: synthDocument,
    components: mapToRecord(mergedComponents),
    componentSets: mapToRecord(mergedComponentSets),
    styles: mapToRecord(mergedStyles),
    schemaVersion: parentEntry.schemaVersion,
  };
}

// ─── 내부 helper ─────────────────────────────────────────────────

function mergeRecord<V>(target: Map<string, V>, source: Record<string, V> | undefined): void {
  if (!source) return;
  for (const [k, v] of Object.entries(source)) {
    if (target.has(k)) continue; // 첫 등장 유지 (DS scan dedup 흐름과 일관)
    target.set(k, v);
  }
}

function mapToRecord<V>(m: Map<string, V>): Record<string, V> {
  const out: Record<string, V> = {};
  for (const [k, v] of m) out[k] = v;
  return out;
}

function emptyFileResponse(): FigmaFileResponse {
  return {
    name: "",
    lastModified: "",
    version: "",
    schemaVersion: 0,
    role: "",
    editorType: "",
    document: { id: "", name: "", type: "DOCUMENT" },
    components: {},
    componentSets: {},
    styles: {},
  };
}

function mergeNodesResponses(
  a: FigmaNodesResponse,
  b: FigmaNodesResponse
): FigmaNodesResponse {
  return {
    name: a.name || b.name,
    lastModified: a.lastModified || b.lastModified,
    version: a.version || b.version,
    role: a.role || b.role,
    editorType: a.editorType || b.editorType,
    thumbnailUrl: a.thumbnailUrl ?? b.thumbnailUrl,
    linkAccess: a.linkAccess ?? b.linkAccess,
    nodes: { ...a.nodes, ...b.nodes },
  };
}
