/**
 * SCSS 토큰 파서 플러그인 — 기존 `analyzers/scssTokens.ts` 의 core 로직을
 * `CodeTokenParser` 인터페이스로 래핑.
 *
 * 2026-04-24 리팩토링: 파싱 로직은 원본 그대로 재사용 (재작성 금지 원칙).
 * 파서 추가 방법은 `analyzers/codeTokens/index.ts` 상단 주석 참조.
 */

import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
  CodeTokenParserWarning,
} from "../../../types";
// 0.8.10 — glob 확장을 공유 유틸로 이동 (옛 로컬 복제 — cssVariables 파서와 동일 구현이었음).
import { expandFiles } from "../../../utils/glob";
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
