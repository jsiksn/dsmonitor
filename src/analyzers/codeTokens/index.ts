/**
 * 코드 토큰 파서 레지스트리 + 통합 로더 (2026-04-24 리팩토링).
 *
 * 목적: DS ↔ 코드 토큰 매칭의 "코드 측" 입력 생성을 스타일링 환경별 플러그인으로
 * 분리. 현재 SCSS 만 지원, 향후 CSS / Tailwind / styled-components 확장.
 *
 * ─────────────────────────────────────────────────────────────────────
 * 파서 추가 가이드 (미래 작업용)
 * ─────────────────────────────────────────────────────────────────────
 *
 *   1) `CodeTokenParser` 인터페이스 구현체 작성 (`parsers/<name>.ts`).
 *   2) 이 파일에서 `register(<name>Parser)` 로 등록.
 *   3) `types.ts` 에 `<Name>ParserConfig` 추가 → `CodeTokenParserConfig` union 확장.
 *   4) 끝. 파서 내부는 `CodeTokenEntry[]` 반환만 맞추면 됨.
 *
 * 구현 힌트:
 *
 *   - CSS 파서 (`type: "css"`):
 *       SCSS 파서와 유사. `:root { --name: value; }` 만 대상. SCSS 맵 / `@each`
 *       처리 불필요 — 정규식 하나로 끝. 가장 단순.
 *
 *   - Tailwind 파서 (`type: "tailwind"`):
 *       v3: `tailwind.config.{js,ts}` 의 `theme.extend.*` 를 동적 import 로
 *            읽어 재귀 펼침. 색상/spacing 각각 "colors.primary.500" 같은 dot-path 로 emit.
 *       v4: `@theme { --color-primary-500: ...; }` 디렉티브 — CSS 파서와 거의 동일.
 *            `type: "css"` 로도 커버 가능. Tailwind 전용 path 정규화가 필요하면 별도 파서.
 *
 *   - styled-components 파서 (`type: "styled-components"`):
 *       `theme.{js,ts}` 의 export default 객체를 AST 파싱 (`@typescript-eslint/parser`
 *       재활용 가능). 동적 값(함수/참조)은 값 resolve 불가 — `value` 는 원문 그대로.
 *       Tailwind 와 마찬가지로 nested key → dot-path 로 flatten.
 *
 *   - Bootstrap: 지원 범위 제외 (Phase 0.5 2026-04-24 결정).
 *
 * 공통 주의:
 *   - 파서는 "가능한 토큰 수집" 에만 집중. 매칭/비교는 `tokenMatrix.ts` 담당.
 *   - dedup 은 로더(`loadCodeTokens`) 가 파서 간 차원에서 수행. 파서 내부 dedup 은
 *     선택 — 했어도 로더가 2중 dedup 해도 부작용 없음.
 *   - 파서 실패는 warnings 로 수집, 다른 파서 실행 계속 (fail-fast 아님).
 */

import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
} from "../../types";
import { scssParser } from "./parsers/scss";
import { cssVariablesParser } from "./parsers/cssVariables";
import { tailwindParser } from "./parsers/tailwind";

// ───── 레지스트리 ─────────────────────────────────────────────────

const registry = new Map<string, CodeTokenParser>();

function register(parser: CodeTokenParser): void {
  if (registry.has(parser.type)) {
    throw new Error(
      `codeTokens: 파서 type="${parser.type}" 중복 등록. 레지스트리 엔트리를 확인하세요.`
    );
  }
  registry.set(parser.type, parser);
}

// 등록된 파서 (알파벳순 / 우선순위순 아님 — type 매칭이라 순서 무관).
register(scssParser);
register(cssVariablesParser);
register(tailwindParser);

/** 테스트/디버깅용. 등록된 파서 타입 목록. */
export function listRegisteredParserTypes(): string[] {
  return [...registry.keys()];
}

// ───── 통합 로더 ──────────────────────────────────────────────────

/**
 * 여러 파서의 결과를 병합한 코드 토큰 배열을 반환.
 *
 * dedup 정책: 같은 `name` 이 여러 파서/파일에서 나오면 **처음 등장만** 유지.
 * (단계 3 2026-04-24 결정: "코드는 중복 없음, count 0 또는 1".)
 *
 * @param parsersCfg config.figma.codeTokens.parsers 배열
 * @param absRoot projectRoot 절대 경로
 * @param warnings 비치명적 경고를 누적할 외부 배열 (미등록 type / 파서 예외 등).
 *                 호출부에서 FigmaReport.warnings 로 bubble up.
 */
export async function loadCodeTokens(
  parsersCfg: CodeTokenParserConfig[],
  absRoot: string,
  warnings: string[]
): Promise<CodeTokenEntry[]> {
  const out: CodeTokenEntry[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < parsersCfg.length; i++) {
    const cfg = parsersCfg[i];
    const parser = registry.get(cfg.type);
    if (!parser) {
      warnings.push(
        `codeTokens: 미등록 파서 type="${cfg.type}" (parsers[${i}]). 스킵합니다. ` +
          `등록된 타입: [${[...registry.keys()].join(", ")}]`
      );
      continue;
    }

    let tokens: CodeTokenEntry[];
    try {
      tokens = await parser.parse(cfg, absRoot);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(
        `codeTokens: 파서 "${cfg.type}" (parsers[${i}]) 실행 실패 — ${msg}. 이 파서 결과는 매칭에서 제외.`
      );
      continue;
    }

    for (const t of tokens) {
      if (seenNames.has(t.name)) continue;
      seenNames.add(t.name);
      out.push(t);
    }
  }

  return out;
}
