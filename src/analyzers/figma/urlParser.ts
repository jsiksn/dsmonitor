/**
 * Figma URL 파서.
 *
 * 사용자 입력은 Figma "Copy link" 로 복사한 문자열. 실제 형태 예시:
 *   - 파일 루트:   https://www.figma.com/design/{fileKey}/{urlName}
 *   - 파일 루트+쿼리: https://www.figma.com/design/{fileKey}/{urlName}?m=auto&t=...
 *   - 페이지/프레임: https://www.figma.com/design/{fileKey}/{urlName}?node-id=2-2
 *   - 구 URL 형식:  https://www.figma.com/file/{fileKey}/...   (같은 규칙으로 수용)
 *
 * node-id 표기:
 *   - URL 상 표기는 하이픈:   `node-id=2-2`
 *   - REST API 표기는 콜론:   `2:2`
 *   - 이 파서는 하이픈/콜론 둘 다 입력으로 받고, 내부 표기는 **콜론** 으로 통일.
 */

export type FigmaUrlParsed = {
  fileKey: string;
  /** node-id 가 있으면 콜론 표기로 정규화 (예: "2:2"). 없으면 undefined. */
  nodeId?: string;
};

export class FigmaUrlParseError extends Error {
  constructor(message: string, public readonly url: string) {
    super(message);
    this.name = "FigmaUrlParseError";
  }
}

/**
 * Figma URL 한 개를 파싱해 `{ fileKey, nodeId? }` 로 반환.
 * 파싱 실패 시 `FigmaUrlParseError` throw — 어느 URL 이 문제인지, 어떻게 복사해야 하는지 힌트 포함.
 */
export function parseFigmaUrl(input: string): FigmaUrlParsed {
  if (typeof input !== "string" || input.trim() === "") {
    throw new FigmaUrlParseError(
      "URL 이 비어있습니다. Figma 에서 Copy link 로 복사한 전체 URL 을 넣어주세요.",
      String(input)
    );
  }
  const url = input.trim();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FigmaUrlParseError(
      `URL 형식이 올바르지 않습니다: '${url}'. ` +
        `Figma 에서 Copy link 로 다시 복사해주세요 (https:// 로 시작해야 함).`,
      url
    );
  }

  if (!/(^|\.)figma\.com$/.test(parsed.hostname)) {
    throw new FigmaUrlParseError(
      `Figma URL 이 아닙니다: '${url}'. hostname='${parsed.hostname}'.`,
      url
    );
  }

  // /design/{fileKey}/{name}  또는  /file/{fileKey}/{name}
  // path[0]=="", path[1]="design"|"file", path[2]=fileKey
  const parts = parsed.pathname.split("/").filter(Boolean);
  const segIdx = parts.findIndex((p) => p === "design" || p === "file");
  if (segIdx < 0 || !parts[segIdx + 1]) {
    throw new FigmaUrlParseError(
      `URL 파싱 실패. '${url}' 에서 /design/ 또는 /file/ 경로를 찾을 수 없습니다. ` +
        `Figma 에서 Copy link 로 다시 복사해주세요.`,
      url
    );
  }
  const fileKey = parts[segIdx + 1];
  if (!/^[A-Za-z0-9]+$/.test(fileKey)) {
    throw new FigmaUrlParseError(
      `fileKey 형식이 이상합니다: '${fileKey}' (from ${url}). 영숫자만 허용.`,
      url
    );
  }

  const nodeIdRaw = parsed.searchParams.get("node-id");
  const nodeId = nodeIdRaw ? normalizeNodeId(nodeIdRaw) : undefined;

  return { fileKey, nodeId };
}

/** `"2-2"` / `"2:2"` 둘 다 허용해 REST API 형식인 콜론 표기로 통일. */
export function normalizeNodeId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") {
    throw new FigmaUrlParseError(
      `node-id 값이 비어있습니다.`,
      `node-id=${raw}`
    );
  }
  // 허용 문자: 숫자, 하이픈, 콜론, "I" (인스턴스 ID 접두어에 쓰이기도 함)
  if (!/^[\dIi:\-;,]+$/.test(trimmed)) {
    throw new FigmaUrlParseError(
      `node-id 형식이 이상합니다: '${raw}'.`,
      `node-id=${raw}`
    );
  }
  return trimmed.replace(/-/g, ":");
}

/** 배열 일괄 파싱. 각 항목 인덱스와 에러를 같이 담아 반환 — 어느 항목이 실패했는지 추적 가능. */
export function parseFigmaUrls(
  urls: Array<{ url: string; label?: string }>
): Array<
  | { ok: true; index: number; label?: string; input: string; parsed: FigmaUrlParsed }
  | { ok: false; index: number; label?: string; input: string; error: string }
> {
  return urls.map((entry, index) => {
    try {
      const parsed = parseFigmaUrl(entry.url);
      return { ok: true as const, index, label: entry.label, input: entry.url, parsed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false as const, index, label: entry.label, input: entry.url, error: msg };
    }
  });
}
