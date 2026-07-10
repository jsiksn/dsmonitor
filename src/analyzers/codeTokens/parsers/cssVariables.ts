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
import path from "node:path";
import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
  CodeTokenParserWarning,
} from "../../../types";
// 0.8.10 — glob 확장 + CSS 변수 스캔을 공유 유틸로 이동 (옛 로컬 복제 — scss 파서 /
//   scssTokens.ts 와 동일 구현이었음).
import { countLines, scanCssVarDecls } from "../../../utils/cssVars";
import { expandFiles } from "../../../utils/glob";

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

  // 스캔 규칙 (앵커 / 참조 배제) 은 utils/cssVars.ts 참조.
  for (const decl of scanCssVarDecls(content)) {
    if (results.has(decl.name)) continue;
    results.set(decl.name, {
      name: decl.name,
      value: decl.value,
      file: relPath,
      line: countLines(content, decl.offset),
    });
  }

  return [...results.values()];
}
