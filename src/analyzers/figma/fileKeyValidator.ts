/**
 * `FigmaDomainFile` 내 모든 URL 의 파일 키 일관성 검증.
 *
 * 새 union 구조(2026-04-23)에서는 도메인 파일 안에 페이지/프레임 URL 이 섞여
 * 있을 수 있다. 각 URL 의 fileKey 가 모두 같은 파일 소속이어야 측정이 의미 있음.
 * 다른 파일 URL 이 섞여 있으면 사용자 실수 — 즉시 에러로 차단.
 */

import type { FigmaDomainFile } from "../../types";
import { parseFigmaUrl, FigmaUrlParseError } from "./urlParser";

export type SameFileCheck =
  | { ok: true; fileKey: string; totalUrls: number }
  | { ok: false; error: string };

/**
 * 같은 파일 소속 검증. 실패 시 친절한 에러 메시지와 함께 `{ ok: false }` 반환.
 * 성공 시 확정된 fileKey 반환 (analyzer 에서 한 번 더 파싱할 필요 없음).
 *
 * 파일 루트 URL 에 node-id 가 붙어있으면(예: 페이지 URL 을 파일 URL 자리에
 * 잘못 넣음) 경고 포함.
 */
export function validateSameFile(domainFile: FigmaDomainFile): SameFileCheck {
  const fileKeys = new Set<string>();
  const parseFails: string[] = [];
  const nodeIdInRootUrl: string[] = [];

  const tryCollect = (url: string, role: string): void => {
    try {
      const parsed = parseFigmaUrl(url);
      fileKeys.add(parsed.fileKey);
      // 파일 루트 URL 이어야 하는 자리에 node-id 가 붙어있으면 기록 (루트 url 케이스만).
      if (role === "file-root" && parsed.nodeId) {
        nodeIdInRootUrl.push(url);
      }
    } catch (e) {
      const msg = e instanceof FigmaUrlParseError ? e.message : String(e);
      parseFails.push(`[${role}] ${msg}`);
    }
  };

  // 패턴 a) 파일 전체 — url 분기
  if (domainFile.url) {
    tryCollect(domainFile.url, "file-root");
  }

  // 패턴 b) pages 분기
  if (domainFile.pages) {
    for (let pi = 0; pi < domainFile.pages.length; pi++) {
      const page = domainFile.pages[pi];
      if (page.url) {
        tryCollect(page.url, `pages[${pi}].url`);
      }
      if (page.frames) {
        for (let fi = 0; fi < page.frames.length; fi++) {
          tryCollect(page.frames[fi].url, `pages[${pi}].frames[${fi}].url`);
        }
      }
    }
  }

  if (parseFails.length > 0) {
    return {
      ok: false,
      error:
        `[${domainFile.label}] URL 파싱 실패 ${parseFails.length}건:\n` +
        parseFails.map((s) => `  ${s}`).join("\n"),
    };
  }

  if (nodeIdInRootUrl.length > 0) {
    return {
      ok: false,
      error:
        `[${domainFile.label}] 파일 루트 URL 자리에 node-id 가 붙어있습니다 ` +
        `(${nodeIdInRootUrl.length}건). 파일 전체를 측정할 때는 파일 Copy link ` +
        `(node-id 없는 형태) 를 사용하세요. 특정 페이지/프레임을 측정하려면 ` +
        `url 필드 대신 pages 배열을 사용하세요. (예: ${nodeIdInRootUrl[0]})`,
    };
  }

  if (fileKeys.size === 0) {
    return {
      ok: false,
      error:
        `[${domainFile.label}] 유효한 Figma URL 이 하나도 없습니다. ` +
        `url 또는 pages[].url / pages[].frames[].url 중 최소 하나는 필요합니다.`,
    };
  }

  if (fileKeys.size > 1) {
    const keys = Array.from(fileKeys).join(", ");
    return {
      ok: false,
      error:
        `[${domainFile.label}] 여러 파일 URL 이 섞여 있습니다. ` +
        `한 domainFile 은 하나의 Figma 파일에 대한 설정만 포함해야 합니다. ` +
        `발견된 파일 키: ${keys}. 파일이 서로 다르면 domainFiles 배열에 ` +
        `별도 엔트리로 분리하세요.`,
    };
  }

  const [fileKey] = fileKeys;
  const totalUrls =
    (domainFile.url ? 1 : 0) +
    (domainFile.pages?.reduce(
      (acc, p) => acc + (p.url ? 1 : 0) + (p.frames?.length ?? 0),
      0
    ) ?? 0);

  return { ok: true, fileKey, totalUrls };
}
