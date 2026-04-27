/**
 * Figma 노드 타입 판정.
 *
 * 새 config 구조(2026-04-23)에서는 사용자가 페이지 URL 과 프레임 URL 을
 * 각각의 분기에 배치하는데, 둘 다 `?node-id=X-Y` 형식이라 URL 만으로는
 * 구분 불가. 응답의 document tree 에서 실제 노드 type 을 조회해 검증.
 *
 * API 호출을 추가하지 않는다 — analyzer 가 이미 `/v1/files/:key` 응답을
 * 받아둔 상태에서 트리를 조회만 함. `/v1/files/:key/nodes?ids=...` 최적화는
 * Phase 0.5 에선 보류 (planning.md §7 2026-04-23 결정).
 */

import type { FigmaNode } from "./apiClient";

/**
 * - `FILE`   : nodeId 없음 (파일 루트 URL)
 * - `CANVAS` : 페이지 (document.children[i].type === "CANVAS")
 * - `FRAME`  : 프레임 (type === "FRAME")
 * - `OTHER`  : 그 외 (COMPONENT / COMPONENT_SET / GROUP / 찾지 못함 등)
 */
export type FigmaNodeType = "FILE" | "CANVAS" | "FRAME" | "OTHER";

/**
 * document tree 전체를 받아 nodeId 에 해당하는 노드의 카테고리를 판정.
 * nodeId 가 없으면 "FILE" (파일 루트).
 * 찾지 못하면 "OTHER" (사용자에게 경고 필요 — 해당 파일에 없는 노드).
 */
export function resolveNodeType(
  document: FigmaNode,
  nodeId: string | undefined
): FigmaNodeType {
  if (!nodeId) return "FILE";
  const node = findNodeById(document, nodeId);
  if (!node) return "OTHER";
  if (node.type === "CANVAS") return "CANVAS";
  if (node.type === "FRAME") return "FRAME";
  return "OTHER";
}

/**
 * INSTANCE 를 포함할 수 없는 leaf/atomic 노드 타입.
 * 도메인 config 에 등록된 URL 이 이런 타입이면 Copy link 위치 실수 의심
 * (예: 프레임 대신 텍스트나 도형 노드를 선택한 채 Copy link to selection).
 *
 * 2026-04-24 수정 — 이전엔 FRAME / CANVAS 만 허용했으나, 사용자 설계상
 * variant/state 구현을 위해 COMPONENT 로 만들어지는 것이 정상이라 허용 범위
 * 확장. 허용: FRAME / COMPONENT / COMPONENT_SET / GROUP / SECTION / INSTANCE / CANVAS.
 */
const NON_CONTAINER_TYPES: ReadonlySet<string> = new Set([
  "TEXT",
  "VECTOR",
  "ELLIPSE",
  "RECTANGLE",
  "LINE",
  "POLYGON",
  "STAR",
  "BOOLEAN_OPERATION",
  "SLICE",
]);

/**
 * 주어진 Figma 노드 타입이 비컨테이너 (instance 를 포함할 수 없는 leaf/atomic) 인지.
 * 컨테이너 타입은 명시적 화이트리스트 없이 "비컨테이너가 아니면 컨테이너" 로 처리 —
 * Figma 가 새 컨테이너 타입을 추가해도 자동 허용되는 방향.
 */
export function isNonContainerType(type: string): boolean {
  return NON_CONTAINER_TYPES.has(type);
}

/**
 * document tree 에서 id 매칭 노드 탐색. 없으면 null.
 * 여러 모듈에서 공용으로 쓰므로 여기에 배치 (domainScan 에서 re-import).
 */
export function findNodeById(root: FigmaNode, id: string): FigmaNode | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  const stack: FigmaNode[] = [...root.children];
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.id === id) return n;
    if (n.children) stack.push(...n.children);
  }
  return null;
}
