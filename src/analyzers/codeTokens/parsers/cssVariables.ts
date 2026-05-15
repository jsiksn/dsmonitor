/**
 * CSS variables 파서 (0.6.0+, R 항목).
 *
 * 대상: 사용자가 지정한 CSS / SCSS 파일에 정의된 `--name: value;` 형식의
 * CSS custom property. selector (`:root`, `.dark`, `[data-theme="dark"]`,
 * Tailwind v4 의 `@theme` 등) 안에 있든 밖에 있든 동일하게 추출합니다.
 *
 * 동작은 SCSS 파서의 Pass 1 (CSS 커스텀 프로퍼티) 과 동일합니다 — 같은
 * 정규식을 재사용해 의미 일관성을 유지합니다. SCSS 맵 / `@each` 흐름은
 * 본 파서의 범위 밖입니다 (SCSS 파서가 담당).
 *
 * dedup: 같은 이름이 여러 selector / 여러 파일에서 정의돼도 처음 등장만 등록.
 *
 * 비대상: `var(--foo)` 같은 참조 (값 추적 X), SCSS `$variable: value` 정의.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
  CodeTokenParserWarning,
} from "../../../types";

export const cssVariablesParser: CodeTokenParser = {
  type: "cssVariables",
  async parse(
    config: CodeTokenParserConfig,
    absRoot: string,
    warnings?: CodeTokenParserWarning[]
  ): Promise<CodeTokenEntry[]> {
    if (config.type !== "cssVariables") {
      throw new Error(
        `cssVariablesParser: expected config.type === "cssVariables", got "${config.type}"`
      );
    }
    // 0.7.0 (Z): path 존재 확인 → 부재 file 은 warning 으로 보고.
    if (warnings) {
      for (const rel of config.files) {
        if (!existsSync(path.resolve(absRoot, rel))) {
          warnings.push({
            parser: "cssVariables",
            path: rel,
            issue: "file_not_found",
          });
        }
      }
    }
    return parseCssVariableFiles(absRoot, config.files);
  },
};

export async function parseCssVariableFiles(
  absRoot: string,
  defFiles: string[]
): Promise<CodeTokenEntry[]> {
  const results: CodeTokenEntry[] = [];
  const seenNames = new Set<string>();

  for (const relPath of defFiles) {
    const absPath = path.resolve(absRoot, relPath);
    let content: string;
    try {
      content = await fs.readFile(absPath, "utf8");
    } catch {
      // 파일 부재 — 조용히 스킵 (프로젝트마다 경로가 달라질 수 있어 fatal 처리 X).
      continue;
    }

    const fileTokens = parseCssVariablesInFile(content, relPath);
    for (const t of fileTokens) {
      if (seenNames.has(t.name)) continue;
      seenNames.add(t.name);
      results.push(t);
    }
  }

  return results;
}

/**
 * 파일 1개의 CSS 커스텀 프로퍼티 추출. 파일 내부에서도 첫 등장 우선 dedup.
 */
export function parseCssVariablesInFile(
  content: string,
  relPath: string
): CodeTokenEntry[] {
  const results: Map<string, CodeTokenEntry> = new Map();

  // 앵커: 줄 시작 또는 화이트스페이스 / `{` / `;` 직후. `var(--foo)` 같은 참조는
  // 앞에 `(` 가 와서 안 걸립니다.
  const cssVarRe = /(^|[\s{;])(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = cssVarRe.exec(content)) !== null) {
    const name = m[2];
    if (results.has(name)) continue;
    const value = m[3].trim().replace(/\s+/g, " ");
    const line = countLines(content, m.index + m[1].length);
    results.set(name, { name, value, file: relPath, line });
  }

  return [...results.values()];
}

function countLines(content: string, offset: number): number {
  let n = 1;
  const end = Math.min(offset, content.length);
  for (let i = 0; i < end; i++) {
    if (content.charCodeAt(i) === 10) n++;
  }
  return n;
}
