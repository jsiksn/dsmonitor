/**
 * CSS 커스텀 프로퍼티 (`--name: value;`) 선언 스캔 공유 유틸 (0.8.10).
 *
 * 옛 흐름: 같은 정규식 + countLines 가 scssTokens.ts (Pass 1) 와
 * codeTokens/parsers/cssVariables.ts 에 복제 (주석은 "재사용" 이라 했으나 실제 복사).
 *
 * 앵커: 줄 시작 또는 화이트스페이스 / `{` / `;` 직후 — `var(--foo)` 같은 참조는
 * 앞에 `(` 가 와서 안 걸림. 값은 `;` 직전까지.
 * (알려진 한계 — 주석 안 선언 오집계 / 마지막 선언 세미콜론 생략 미매치.
 *  보강은 2단계 파서 개선 (0.9.0) 범위.)
 */

export interface CssVarDecl {
  name: string;
  /** trim + 공백 정규화된 값. */
  value: string;
  /** content 안 이름 시작 offset (countLines 입력용). */
  offset: number;
}

export function scanCssVarDecls(content: string): CssVarDecl[] {
  const re = /(^|[\s{;])(--[\w-]+)\s*:\s*([^;]+);/g;
  const out: CssVarDecl[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
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
