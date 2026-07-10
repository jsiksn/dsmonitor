/**
 * 파일 목록 glob 확장 공유 유틸 (0.8.10).
 *
 * 옛 흐름: 동일 구현이 codeTokens 파서 2곳 (scss / cssVariables) 에 복제,
 * doctor 의 isGlobPattern 도 같은 판정.
 *
 * 0.7.3 도입 동작 그대로: files entry 안 glob 문자 (*, ?, {, [) 포함 시
 * `fast-glob` 으로 확장, literal path 는 existsSync 검사. glob 확장 결과 0건은
 * misses 로 보고 (호출부가 warning 처리), ≥1건은 본 결과 그대로.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";

export function isGlob(pattern: string): boolean {
  return /[*?{}\[\]]/.test(pattern);
}

export function expandFiles(
  absRoot: string,
  files: string[]
): { resolved: string[]; misses: string[] } {
  const resolved: string[] = [];
  const misses: string[] = [];
  for (const entry of files) {
    if (isGlob(entry)) {
      const matches = fg.sync(entry, { cwd: absRoot, dot: false });
      if (matches.length === 0) {
        misses.push(entry);
      } else {
        resolved.push(...matches);
      }
    } else {
      if (!existsSync(path.resolve(absRoot, entry))) {
        misses.push(entry);
      } else {
        resolved.push(entry);
      }
    }
  }
  return { resolved, misses };
}
