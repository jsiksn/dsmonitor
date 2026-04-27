/**
 * 도메인 파일 스캔 — `/v1/files/:key/nodes?ids=` 기반 (2026-04-23 재설계).
 *
 * 기존: 파일 전체 응답을 받아 트리에서 target subtree 를 추출.
 *       → 도메인 파일이 클 때 V8 문자열 한계 초과 또는 타임아웃으로 실패.
 * 신규: config 에서 측정 대상 node id 를 모아 `/nodes?ids=` 로 subtree 만 요청.
 *       응답의 `nodes[nodeId]` 각 엔트리에 자체 document 가 들어있어 바로 스캔 가능.
 *
 * 사전 조사 (d) 실측: machine-learning 파일(full 호출 실패) 이 프레임 2개 /nodes 로
 * 27MB / 8초 성공.
 *
 * 패턴별 처리:
 *   - 패턴 A (파일 전체 — `domainCfg.url` 존재): 응답 크기 제한 우려로 **비권장**.
 *     감지 시 warning 기록 후 스킵 (현재 config 은 전부 패턴 B/C 라 영향 없음).
 *   - 패턴 B (페이지 전체 — `pages[].url` 존재): 페이지 node id 를 /nodes 에 전달.
 *   - 패턴 C (프레임 단위 — `pages[].frames[].url` 존재): 프레임 node id 를 /nodes 에 전달.
 *   - 혼합: 같은 도메인 파일에서 B/C 혼용 가능 — 모든 id 를 한 호출로 묶어 요청.
 */

import type { FigmaDomainFile } from "../../types";
import type {
  FigmaFileNodeEntry,
  FigmaNode,
  FigmaNodesResponse,
} from "./apiClient";
import { fetchNodes } from "./apiClient";
import { parseFigmaUrl } from "./urlParser";
import { isNonContainerType } from "./nodeTypeResolver";

export type DomainScanResult = {
  label: string;
  totalInstances: number;
  unmatchedInstances: number;
  /** 출처 미상 INSTANCE 의 name 별 집계. */
  unknownByName: Map<string, { count: number; firstPath: string }>;
  /** 정상 instance 의 출처 분포 (label 별 카운트). */
  sourcesByLabel: Map<string, number>;
  /** 비치명적 에러 / 경고. */
  warnings: string[];
};

type ScanTarget = {
  nodeId: string;
  contextPath: string;
};

/**
 * 도메인 파일 1개 스캔. 내부에서 fetchNodes 호출.
 *
 * @param domainCfg - config 의 도메인 파일 엔트리 (union 타입)
 * @param fileKey - `validateSameFile` 로 확정된 파일 키
 * @param token - FIGMA_API_TOKEN
 * @param componentMap - 모든 DS 의 컴포넌트 맵 (nodeId → {label, name})
 */
export async function scanDomain(
  domainCfg: FigmaDomainFile,
  fileKey: string,
  token: string,
  componentMap: ReadonlyMap<string, { label: string; name: string }>
): Promise<DomainScanResult> {
  const result: DomainScanResult = {
    label: domainCfg.label,
    totalInstances: 0,
    unmatchedInstances: 0,
    unknownByName: new Map(),
    sourcesByLabel: new Map(),
    warnings: [],
  };

  // 패턴 A (파일 전체) — 비권장. 스킵.
  if (domainCfg.url) {
    result.warnings.push(
      `패턴 A (파일 전체 측정) 는 응답 크기 제한으로 비권장입니다. ` +
        `pages[].url (페이지 전체) 또는 pages[].frames[].url (프레임 단위) 로 전환해주세요. ` +
        `자세한 가이드: docs/figma-config-guide.md`
    );
    return result;
  }

  // 패턴 B/C — pages 순회하며 측정 대상 수집
  const targets = collectTargets(domainCfg, result.warnings);
  if (targets.length === 0) {
    result.warnings.push(
      `측정 대상이 없습니다. pages 배열에 최소 하나의 url 또는 frames 가 필요합니다.`
    );
    return result;
  }

  // 단일 /nodes 호출로 모든 target 한 번에 요청
  const nodeIds = targets.map((t) => t.nodeId);
  const resp: FigmaNodesResponse = await fetchNodes(fileKey, nodeIds, token);

  // 중복 제거 — 혼합 패턴에서 같은 subtree 를 둘 이상 target 이 포함할 때 재측정 차단
  const visited = new Set<string>();

  for (const target of targets) {
    const entry = resp.nodes[target.nodeId];
    if (!entry) {
      result.warnings.push(
        `${target.contextPath}: node id=${target.nodeId} 응답에 없음 (삭제됐거나 권한 문제일 수 있음).`
      );
      continue;
    }
    const actualType = entry.document.type;
    if (isNonContainerType(actualType)) {
      // 비컨테이너 (텍스트/도형 등) 는 instance 를 포함할 수 없어 측정 의미 없음.
      // Copy link 위치 실수 (프레임 대신 자식 노드 선택) 의심.
      result.warnings.push(
        `${target.contextPath}: 노드 type=${actualType} 는 instance 를 포함할 수 없는 타입. ` +
          `URL 재확인 필요 (id=${target.nodeId}). 측정은 계속 진행합니다.`
      );
      // 계속 진행 — 빈 subtree 라도 순회 자체는 안전.
    }

    // 도메인 /nodes 응답은 각 subtree 별로 자체 components 맵을 포함.
    // INSTANCE.componentId (local nodeId) → components[componentId].key (stable)
    // 2-hop 경로로 해당 subtree 의 맵을 사용해야 함.
    const localComponents = entry.components ?? {};

    walkSubtree(entry, target.contextPath, visited, (n, path) => {
      if (n.type !== "INSTANCE") return;
      result.totalInstances++;

      const cid = n.componentId;
      if (!cid) {
        // INSTANCE 인데 componentId 없음 — 드문 케이스 방어.
        result.unmatchedInstances++;
        tallyUnknown(result.unknownByName, n.name, path);
        return;
      }

      // Hop 1: local nodeId → stable library key (같은 subtree 응답 내 components 맵 사용)
      const stableKey = localComponents[cid]?.key;
      if (!stableKey) {
        // components 맵에 componentId 항목이 없거나 key 필드가 비어있음 — 출처 미상.
        result.unmatchedInstances++;
        tallyUnknown(result.unknownByName, n.name, path);
        return;
      }

      // Hop 2: stable library key → DS label (전역 componentMap 조회)
      const match = componentMap.get(stableKey);
      if (!match) {
        // stable key 는 있으나 등록된 DS 어디에도 없음 — 외주 옛 DS 등 미등록 출처.
        result.unmatchedInstances++;
        tallyUnknown(result.unknownByName, n.name, path);
        return;
      }

      result.sourcesByLabel.set(
        match.label,
        (result.sourcesByLabel.get(match.label) ?? 0) + 1
      );
    });
  }

  return result;
}

// ───── 측정 대상 수집 ─────────────────────────────────────────────

function collectTargets(
  domainCfg: FigmaDomainFile,
  warnings: string[]
): ScanTarget[] {
  const label = domainCfg.label;
  const targets: ScanTarget[] = [];
  const pages = domainCfg.pages ?? [];

  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];

    // 패턴 B — 페이지 전체
    if (page.url) {
      const parsed = safeParse(page.url, warnings, `pages[${pi}].url`);
      if (!parsed?.nodeId) {
        warnings.push(
          `pages[${pi}].url 에 node-id 가 없습니다 (${page.url}). ` +
            `페이지 URL 은 Figma 에서 페이지 탭 우클릭 → Copy link 로 얻어야 합니다.`
        );
        continue;
      }
      targets.push({
        nodeId: parsed.nodeId,
        contextPath: `${label} / ${page.comment ?? "(페이지 이름 없음)"}`,
      });
      continue;
    }

    // 패턴 C — 프레임 단위
    if (page.frames) {
      const pageLabel = page.comment ?? `(페이지 이름 없음 #${pi})`;
      for (let fi = 0; fi < page.frames.length; fi++) {
        const frame = page.frames[fi];
        const parsed = safeParse(
          frame.url,
          warnings,
          `pages[${pi}].frames[${fi}].url`
        );
        if (!parsed?.nodeId) {
          warnings.push(
            `pages[${pi}].frames[${fi}].url 에 node-id 가 없습니다 (${frame.url}). ` +
              `프레임 URL 은 Figma 에서 프레임 선택 → Copy link to selection 으로 얻어야 합니다.`
          );
          continue;
        }
        targets.push({
          nodeId: parsed.nodeId,
          contextPath: `${label} / ${pageLabel} / ${frame.comment ?? "(프레임 이름 없음)"}`,
        });
      }
      continue;
    }

    // 타입상 여기 도달 불가 — 런타임 방어
    warnings.push(
      `pages[${pi}] 에 url 도 frames 도 없습니다. 최소 하나는 필요합니다.`
    );
  }

  return targets;
}

function safeParse(
  url: string,
  warnings: string[],
  role: string
): { fileKey: string; nodeId?: string } | null {
  try {
    return parseFigmaUrl(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`[${role}] URL 파싱 실패: ${msg}`);
    return null;
  }
}

// ───── tree walker ────────────────────────────────────────────────

/**
 * fetchNodes 응답 엔트리의 document subtree 를 순회.
 * 중복 방문 방지 set 을 받아 혼합 패턴에서의 이중 측정 차단.
 */
function walkSubtree(
  entry: FigmaFileNodeEntry,
  pathPrefix: string,
  visited: Set<string>,
  visit: (node: FigmaNode, path: string) => void
): void {
  const root = entry.document;
  if (visited.has(root.id)) return;
  visited.add(root.id);
  visit(root, pathPrefix);

  if (!root.children || root.children.length === 0) return;

  type Frame = { node: FigmaNode; path: string };
  const stack: Frame[] = [];
  for (let i = root.children.length - 1; i >= 0; i--) {
    stack.push({ node: root.children[i], path: pathPrefix });
  }
  while (stack.length > 0) {
    const { node, path } = stack.pop()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    const thisPath = `${path} / ${node.name}`;
    visit(node, thisPath);
    if (node.children && node.children.length > 0) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[i], path: thisPath });
      }
    }
  }
}

function tallyUnknown(
  bucket: Map<string, { count: number; firstPath: string }>,
  name: string,
  path: string
): void {
  const key = name || "(unnamed)";
  const existing = bucket.get(key);
  if (existing) {
    existing.count++;
  } else {
    bucket.set(key, { count: 1, firstPath: path });
  }
}
