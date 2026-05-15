/**
 * SCSS 토큰 파서 플러그인 — 기존 `analyzers/scssTokens.ts` 의 core 로직을
 * `CodeTokenParser` 인터페이스로 래핑.
 *
 * 2026-04-24 리팩토링: 파싱 로직은 원본 그대로 재사용 (재작성 금지 원칙).
 * 파서 추가 방법은 `analyzers/codeTokens/index.ts` 상단 주석 참조.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
  CodeTokenParserWarning,
} from "../../../types";
import { parseScssTokens } from "../../scssTokens";

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
    if (warnings) {
      for (const rel of config.files) {
        if (!existsSync(path.resolve(absRoot, rel))) {
          warnings.push({
            parser: "scss",
            path: rel,
            issue: "file_not_found",
          });
        }
      }
    }
    return parseScssTokens(absRoot, config.files);
  },
};
