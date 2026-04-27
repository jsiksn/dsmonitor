/**
 * Figma REST API 클라이언트.
 *
 * 설계 원칙:
 *   - Node 18+ 내장 fetch. 추가 dep 없음.
 *   - 재시도: 5xx / 네트워크 / 타임아웃 / 429 최대 3회 지수 백오프 (1s → 2s → 4s).
 *   - 429 Rate limit: `Retry-After` 헤더 존중 후 재시도.
 *   - 401 / 403 / 404: 즉시 에러 (토큰/scope/파일 문제). 재시도 무의미.
 *   - V8 문자열 한계 초과 ("Cannot create a string longer than..."): 즉시 에러.
 *     재시도해도 같은 응답이면 같은 결과라 의미 없음. 파일 분할 호출이 필요.
 *   - 타임아웃: 60초 (2026-04-23 재설계 — 이전 30초 응답이 실패 빈발해 상향).
 *
 * 응답 구조는 사전 조사 (2026-04-23 1-3단계) 에서 검증된 형태 기준.
 * 자세한 필드 설명: docs/figma-config-guide.md 부록.
 */

const FIGMA_API_BASE = "https://api.figma.com";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;

export class FigmaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = "FigmaApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** V8 엔진의 문자열 최대 길이 초과 에러 감지. 재시도 무의미. */
function isV8StringLimitError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /Cannot create a string longer than/i.test(msg);
}

/**
 * 내부 fetch 래퍼. 재시도 정책 + 타임아웃 적용.
 */
async function figmaFetch(
  endpoint: string,
  token: string,
  opts: { timeoutMs?: number } = {}
): Promise<unknown> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${FIGMA_API_BASE}${endpoint}`;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: { "X-Figma-Token": token },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        // 본문 파싱 — V8 문자열 한계 초과 가능 지점. catch 에서 별도 처리.
        return await res.json();
      }

      // 즉시 에러 (재시도 없음)
      if (res.status === 401 || res.status === 403) {
        const body = await safeReadText(res);
        throw new FigmaApiError(
          `Figma API 인증/권한 실패 (HTTP ${res.status}). ` +
            `토큰이 유효한지, 필요한 scope 가 있는지 확인하세요. ` +
            `응답: ${body.slice(0, 300)}`,
          res.status,
          endpoint
        );
      }
      if (res.status === 404) {
        throw new FigmaApiError(
          `Figma 파일을 찾을 수 없습니다 (HTTP 404). 엔드포인트: ${endpoint}. ` +
            `파일 URL 이 올바른지, 토큰이 해당 파일에 접근 권한이 있는지 확인하세요.`,
          res.status,
          endpoint
        );
      }

      // 429: Retry-After 존중 후 재시도
      if (res.status === 429) {
        const retryAfter = parseRetryAfter(res.headers.get("Retry-After"));
        const waitMs = retryAfter ?? backoffDelay(attempt);
        if (attempt >= MAX_RETRIES) {
          throw new FigmaApiError(
            `Figma API rate limit (HTTP 429) 재시도 ${MAX_RETRIES}회 초과. 엔드포인트: ${endpoint}`,
            res.status,
            endpoint
          );
        }
        console.warn(
          `[figma] rate limit (429). retry-after=${retryAfter ?? "none"} → ${waitMs}ms 후 재시도 (attempt=${attempt + 1})`
        );
        await sleep(waitMs);
        attempt++;
        continue;
      }

      // 5xx: 지수 백오프 후 재시도
      if (res.status >= 500 && res.status < 600) {
        if (attempt >= MAX_RETRIES) {
          const body = await safeReadText(res);
          throw new FigmaApiError(
            `Figma API 서버 에러 (HTTP ${res.status}) 재시도 ${MAX_RETRIES}회 초과. ` +
              `응답: ${body.slice(0, 200)}`,
            res.status,
            endpoint
          );
        }
        const waitMs = backoffDelay(attempt);
        console.warn(
          `[figma] server error (${res.status}). ${waitMs}ms 후 재시도 (attempt=${attempt + 1})`
        );
        await sleep(waitMs);
        attempt++;
        continue;
      }

      // 그 외 상태 — 즉시 에러
      const body = await safeReadText(res);
      throw new FigmaApiError(
        `Figma API 예상 외 응답 (HTTP ${res.status}). 엔드포인트: ${endpoint}. ` +
          `응답: ${body.slice(0, 200)}`,
        res.status,
        endpoint
      );
    } catch (e) {
      clearTimeout(timer);

      if (e instanceof FigmaApiError) throw e;

      // V8 문자열 한계 — 재시도해도 같은 응답이면 같은 결과. 즉시 실패.
      if (isV8StringLimitError(e)) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new FigmaApiError(
          `Figma 응답 크기가 Node 런타임 문자열 한계(~512MB)를 초과했습니다. ` +
            `엔드포인트: ${endpoint}. 재시도해도 같은 결과 — 파일을 페이지/프레임 ` +
            `단위로 분할 호출하세요. 원인: ${msg}`,
          null,
          endpoint
        );
      }

      const isAbort =
        e instanceof Error && (e.name === "AbortError" || /abort/i.test(e.message));
      if (isAbort) {
        if (attempt >= MAX_RETRIES) {
          throw new FigmaApiError(
            `Figma API 타임아웃 (${timeoutMs}ms) 재시도 ${MAX_RETRIES}회 초과. 엔드포인트: ${endpoint}`,
            null,
            endpoint
          );
        }
        const waitMs = backoffDelay(attempt);
        console.warn(
          `[figma] timeout. ${waitMs}ms 후 재시도 (attempt=${attempt + 1})`
        );
        await sleep(waitMs);
        attempt++;
        lastError = e;
        continue;
      }

      // 네트워크 에러 등
      if (attempt >= MAX_RETRIES) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new FigmaApiError(
          `Figma API 네트워크 에러 재시도 ${MAX_RETRIES}회 초과. 엔드포인트: ${endpoint}. 원인: ${msg}`,
          null,
          endpoint
        );
      }
      const waitMs = backoffDelay(attempt);
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[figma] network error: ${msg}. ${waitMs}ms 후 재시도 (attempt=${attempt + 1})`
      );
      await sleep(waitMs);
      attempt++;
      lastError = e;
    }
  }

  throw new FigmaApiError(
    `Figma API 재시도 로직 탈출 (예상 외). 엔드포인트: ${endpoint}. 마지막 에러: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
    null,
    endpoint
  );
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "(응답 본문 읽기 실패)";
  }
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const asNum = Number(header);
  if (Number.isFinite(asNum) && asNum >= 0) return asNum * 1000;
  const asDate = Date.parse(header);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

function backoffDelay(attempt: number): number {
  // 1s → 2s → 4s
  return 1000 * Math.pow(2, attempt);
}

// ═══════════════════════════════════════════════════════════════════
// Figma API 응답 타입 (사전 조사 2026-04-23 기준, 측정에 필요한 필드만)
// ═══════════════════════════════════════════════════════════════════

export type FigmaStyleEntry = {
  key: string;
  name: string;
  styleType: "FILL" | "TEXT" | "EFFECT" | "GRID" | string;
  remote?: boolean;
  description?: string;
};

export type FigmaComponentEntry = {
  key: string;
  name: string;
  componentSetId?: string;
  description?: string;
  remote?: boolean;
  documentationLinks?: unknown[];
};

export type FigmaComponentSetEntry = {
  key: string;
  name: string;
  description?: string;
  documentationLinks?: unknown[];
};

export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  /** INSTANCE 노드에만 존재. 사전 조사로 확인. */
  componentId?: string;
  componentSetId?: string;
};

/**
 * `GET /v1/files/{key}` 또는 `GET /v1/files/{key}?ids=...` 의 응답.
 * 두 경우 모두 최상위 구조는 동일. `?ids=` 사용 시 document.children 에서
 * 지정 안 된 페이지는 children=0 으로 껍데기만 남는다 (사전 조사 3단계 확인).
 */
export type FigmaFileResponse = {
  name: string;
  lastModified: string;
  version: string;
  schemaVersion: number;
  role: string;
  editorType: string;
  document: FigmaNode;
  components: Record<string, FigmaComponentEntry>;
  componentSets: Record<string, FigmaComponentSetEntry>;
  styles: Record<string, FigmaStyleEntry>;
};

/**
 * `/v1/files/{key}/nodes?ids=...` 의 각 노드 엔트리.
 * 사전 조사 (d) 로 확인한 구조: 각 node 별로 자체 components/componentSets/styles 맵 포함.
 */
export type FigmaFileNodeEntry = {
  document: FigmaNode;
  components: Record<string, FigmaComponentEntry>;
  componentSets: Record<string, FigmaComponentSetEntry>;
  styles: Record<string, FigmaStyleEntry>;
  schemaVersion: number;
};

/**
 * `/v1/files/{key}/nodes?ids=...` 의 최상위 응답.
 * 사전 조사 (d) 로 확인: top-level 에는 nodes 래퍼만. 파일 레벨 components/styles 없음.
 */
export type FigmaNodesResponse = {
  name: string;
  lastModified: string;
  version: string;
  role: string;
  editorType: string;
  thumbnailUrl?: string;
  linkAccess?: string;
  nodes: Record<string, FigmaFileNodeEntry | null>;
};

// ═══════════════════════════════════════════════════════════════════
// Public API — 2026-04-23 재설계 3함수 (엔드포인트 축소 전략)
// ═══════════════════════════════════════════════════════════════════

/**
 * DS 파일 2-pass 의 Pass 1 — 페이지 id 수집 전용 경량 요청.
 * `?depth=1` 로 document.children (페이지 CANVAS 노드) 만 반환. 응답 ~2KB 수준.
 *
 * 주의: 이 응답의 top-level components/componentSets/styles 는 **항상 빈 객체**
 * (사전 조사 2단계 확인). DS 카운트에 사용 금지 — Pass 2 결과를 사용.
 */
export async function fetchFileMeta(
  fileKey: string,
  token: string
): Promise<FigmaFileResponse> {
  const endpoint = `/v1/files/${fileKey}?depth=1`;
  console.log(`[figma] GET ${endpoint}`);
  const t0 = Date.now();
  const res = (await figmaFetch(endpoint, token)) as FigmaFileResponse;
  const elapsed = Date.now() - t0;
  const pageCount = res.document?.children?.length ?? 0;
  console.log(`[figma]   → "${res.name}" (${pageCount} pages, ${elapsed}ms)`);
  return res;
}

/**
 * DS 파일 2-pass 의 Pass 2 — 지정 페이지들로 한정해 파일 응답 획득.
 * `?ids=pageId1,pageId2,...` 를 사용. 응답의 top-level components/componentSets/
 * styles 맵이 **선택된 페이지 subtree 기반으로 채워짐** (사전 조사 3단계 확인).
 *
 * 모든 페이지 id 를 넘기면 full 호출과 동일한 카운트를 얻되, full 호출에서
 * 실패하던 대형 파일도 성공 가능 (사전 조사 e2: ds-legacy 73MB 로 성공).
 */
export async function fetchFileNodes(
  fileKey: string,
  pageIds: string[],
  token: string
): Promise<FigmaFileResponse> {
  if (pageIds.length === 0) {
    throw new FigmaApiError(
      "fetchFileNodes: pageIds 가 비어있습니다. Pass 1 (fetchFileMeta) 결과에서 " +
        "document.children[].id 를 모아서 넘겨야 합니다.",
      null,
      `/v1/files/${fileKey}`
    );
  }
  const ids = pageIds.join(",");
  const endpoint = `/v1/files/${fileKey}?ids=${encodeURIComponent(ids)}`;
  console.log(`[figma] GET ${endpoint.slice(0, 100)}${endpoint.length > 100 ? "..." : ""}`);
  const t0 = Date.now();
  const res = (await figmaFetch(endpoint, token)) as FigmaFileResponse;
  const elapsed = Date.now() - t0;
  console.log(
    `[figma]   → "${res.name}" (components=${Object.keys(res.components ?? {}).length}, styles=${Object.keys(res.styles ?? {}).length}, ${elapsed}ms)`
  );
  return res;
}

/**
 * Variables API 응답 타입 (단계 3, 2026-04-24). Figma Enterprise 전용.
 *
 * 권한 오류(403) 는 figmaFetch 가 FigmaApiError(status=403) 로 throw.
 * 상위 designSystemScan.scanLocalVariables 에서 catch → warnings 로 분류.
 *
 * variableCollections 는 현재 매칭에 불필요해 선언만 해두고 사용 안 함.
 */
export type FigmaVariable = {
  id: string;
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN" | string;
  description?: string;
  hiddenFromPublishing?: boolean;
  variableCollectionId?: string;
};

export type FigmaLocalVariablesResponse = {
  status: number;
  error: boolean;
  meta: {
    variables: Record<string, FigmaVariable>;
    variableCollections: Record<string, unknown>;
  };
};

/**
 * `/v1/files/{key}/variables/local` — 로컬 Variables 반환. Enterprise plan 필요.
 *
 * Phase 0.5 시점 본 프로젝트 토큰은 403 예상. 성공 케이스는 plan 업그레이드 +
 * 토큰 재발급 이후. 응답 포맷: docs/figma-config-guide.md 부록 참조.
 */
export async function fetchLocalVariables(
  fileKey: string,
  token: string
): Promise<FigmaLocalVariablesResponse> {
  const endpoint = `/v1/files/${fileKey}/variables/local`;
  console.log(`[figma] GET ${endpoint}`);
  const t0 = Date.now();
  const res = (await figmaFetch(
    endpoint,
    token
  )) as FigmaLocalVariablesResponse;
  const elapsed = Date.now() - t0;
  const count = Object.keys(res?.meta?.variables ?? {}).length;
  console.log(`[figma]   → variables=${count} (${elapsed}ms)`);
  return res;
}

/**
 * 도메인 파일 전용 — 지정 노드들만 subtree 로 반환.
 * `/v1/files/{key}/nodes?ids=id1,id2,...` 를 사용. 응답은 `{ nodes: { [id]: entry } }`
 * 래퍼 구조이며, 각 entry 가 자체 document / components / componentSets / styles 를 가짐.
 *
 * 사전 조사 (d) 로 확인: machine-learning 파일(full 호출 실패)이 프레임 2개 /nodes 로
 * 27MB / 8초에 성공.
 */
export async function fetchNodes(
  fileKey: string,
  nodeIds: string[],
  token: string
): Promise<FigmaNodesResponse> {
  if (nodeIds.length === 0) {
    throw new FigmaApiError(
      "fetchNodes: nodeIds 가 비어있습니다.",
      null,
      `/v1/files/${fileKey}/nodes`
    );
  }
  const ids = nodeIds.join(",");
  const endpoint = `/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`;
  console.log(`[figma] GET ${endpoint.slice(0, 100)}${endpoint.length > 100 ? "..." : ""}`);
  const t0 = Date.now();
  const res = (await figmaFetch(endpoint, token)) as FigmaNodesResponse;
  const elapsed = Date.now() - t0;
  const hits = Object.values(res.nodes ?? {}).filter((v) => v != null).length;
  console.log(`[figma]   → ${hits}/${nodeIds.length} nodes (${elapsed}ms)`);
  return res;
}
