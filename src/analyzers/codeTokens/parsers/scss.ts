/**
 * SCSS 토큰 파서 플러그인 — 기존 `analyzers/scssTokens.ts` 의 core 로직을
 * `CodeTokenParser` 인터페이스로 래핑.
 *
 * 2026-04-24 리팩토링: 파싱 로직은 원본 그대로 재사용 (재작성 금지 원칙).
 * 파서 추가 방법은 `analyzers/codeTokens/index.ts` 상단 주석 참조.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
  CodeTokenParserWarning,
} from "../../../types";
import { parseScssTokens } from "../../scssTokens";

/**
 * 0.7.3 — files entry 안 glob 문자 (*, ?, {, [) 포함 시 `fast-glob` 으로 확장.
 * literal path 는 옛 흐름 그대로 (existsSync 검사).
 * glob 확장 결과 0건은 warning, ≥1건은 본 결과를 그대로 활용.
 */
function isGlob(pattern: string): boolean {
  return /[*?{}\[\]]/.test(pattern);
}

function expandFiles(absRoot: string, files: string[]): { resolved: string[]; misses: string[] } {
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

export const scssParser: CodeTokenParser = {
  type: "scss",
  async parse(
    config: CodeTokenParserConfig,
    absRoot: string,
    warnings?: CodeTokenParserWarning[]
  ): Promise<CodeTokenEntry[]> {
    if (config.type !== "scss") {
      throw new Error(
        `scssParser: expected config.type === "scss", got "${config.type}"`
      );
    }
    // 0.7.0 (Z): 지정된 SCSS 파일이 실제로 존재하는지 확인.
    // 0.7.3: glob 문자 포함 시 fast-glob 으로 확장. literal path 는 옛 흐름 유지.
    const { resolved, misses } = expandFiles(absRoot, config.files);
    if (warnings) {
      for (const miss of misses) {
        warnings.push({
          parser: "scss",
          path: miss,
          issue: "file_not_found",
        });
      }
    }
    return parseScssTokens(absRoot, resolved);
  },
};
