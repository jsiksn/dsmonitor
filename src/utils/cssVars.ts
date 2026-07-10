/**
 * CSS 커스텀 프로퍼티 (`--name: value;`) 선언 스캔 공유 유틸 (0.8.10).
 *
 * 옛 흐름: 같은 정규식 + countLines 가 scssTokens.ts (Pass 1) 와
 * codeTokens/parsers/cssVariables.ts 에 복제 (주석은 "재사용" 이라 했으나 실제 복사).
 *
 * 앵커: 줄 시작 또는 화이트스페이스 / `{` / `;` 직후 — `var(--foo)` 같은 참조는
 * 앞에 `(` 가 와서 안 걸림.
 *
 * 0.9.0 보강:
 *   - 주석 제거 전처리 (블록 + SCSS 라인 주석) — 주석 안 선언 오집계 방지.
 *     offset 보존 위해 주석을 같은 길이의 공백으로 치환 (줄바꿈 유지).
 *   - 값 종결: `;` 또는 블록 끝 `}` 직전 — 마지막 선언의 세미콜론 생략 허용,
 *     세미콜론 누락 시 값이 `}` 를 넘어 다음 rule 로 번지지 않음.
 */

export interface CssVarDecl {
  name: string;
  /** trim + 공백 정규화된 값. */
  value: string;
  /** content 안 이름 시작 offset (countLines 입력용). */
  offset: number;
}

/** 주석을 같은 길이 공백으로 치환 (줄바꿈 보존 → offset / 줄 번호 유지). */
function blankComments(content: string): string {
  return content.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (m) => m.replace(/[^\n]/g, " ")
  );
}

export function scanCssVarDecls(content: string): CssVarDecl[] {
  const scanned = blankComments(content);
  // 종결: `;` / `}` 직전 / 문자열 끝. m 플래그 없음 — `$` 가 줄 끝이 아니라
  // 문자열 끝만 의미 (여러 줄 값 `calc(...)` 이 줄 끝에서 잘리지 않게).
  const re = /(^|[\s{;])(--[\w-]+)\s*:\s*([^;{}]+?)\s*(?:;|(?=\})|$)/g;
  const out: CssVarDecl[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(scanned)) !== null) {
    out.push({
      name: m[2],
      value: m[3].trim().replace(/\s+/g, " "),
      offset: m.index + m[1].length,
    });
  }
  return out;
}

/** offset 위치의 1-based 줄 번호. */
export function countLines(content: string, offset: number): number {
  let n = 1;
  const end = Math.min(offset, content.length);
  for (let i = 0; i < end; i++) {
    if (content.charCodeAt(i) === 10) n++;
  }
  return n;
}
