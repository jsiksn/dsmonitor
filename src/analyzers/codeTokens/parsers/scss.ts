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
} from "../../../types";
import { parseScssTokens } from "../../scssTokens";

export const scssParser: CodeTokenParser = {
  type: "scss",
  async parse(
    config: CodeTokenParserConfig,
    absRoot: string
  ): Promise<CodeTokenEntry[]> {
    // 현재 union 에 scss 만 있지만, 향후 확장 대비 방어적 narrow.
    // 레지스트리가 type 매칭으로 호출하지만 타입 시스템상 union 전체를 받으므로 확인.
    if (config.type !== "scss") {
      throw new Error(
        `scssParser: expected config.type === "scss", got "${config.type}"`
      );
    }
    return parseScssTokens(absRoot, config.files);
  },
};
