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
import fg from "fast-glob";
import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
  CodeTokenParserWarning,
} from "../../../types";

/**
 * 0.7.3 — files entry 안 glob 문자 (*, ?, {, [) 포함 시 `fast-glob` 으로 확장.
 * literal path 는 옛 흐름 그대로 (existsSync 검사 + fs.readFile).
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
    // 0.7.3: glob 문자 포함 시 fast-glob 으로 확장. literal path 는 옛 흐름 유지.
    const { resolved, misses } = expandFiles(absRoot, config.files);
    if (warnings) {
      for (const miss of misses) {
        warnings.push({
          parser: "cssVariables",
          path: miss,
          issue: "file_not_found",
        });
      }
    }
    return parseCssVariableFiles(absRoot, resolved);
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
