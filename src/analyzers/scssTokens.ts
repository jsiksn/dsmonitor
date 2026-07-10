/**
 * SCSS 토큰 파서 — `cfg.hardcodedValues.scssVariableDefFiles` 에서 변수 추출.
 *
 * 단계 3 (2026-04-24) 신규. 기존 `analyzeScssCompliance` 는 정규식 match **횟수만**
 * 세고 이름/값을 추출하지 않아, DS ↔ 코드 토큰 이름 매칭에는 재활용 불가.
 *
 * 추출 대상 2종:
 *
 *   1. CSS 커스텀 프로퍼티 — `--name: value;` 형태. 위치 무관하게 전역 매칭.
 *      `var(--foo)` 같은 참조는 앞에 `(` 가 있어 안 걸림 (줄 앞 공백 + `--` 앵커).
 *
 *   2. SCSS 맵 + `@each` 로 생성되는 동적 변수 —
 *      `$light-theme: (point-color-0: var(--color-white), ...)` 정의 후
 *      `@each $k, $v in $light-theme { #{"--" + $k}: #{$v}; }` 로 emit 되는 케이스.
 *      파서는 맵 본문을 정적 해석해 `--{key}: {value}` 형태로 등록.
 *
 * dedup: 같은 이름이 2번 이상 정의돼 있어도 첫 등장만 등록 (light/dark 테마 맵이
 * 양쪽에서 같은 `--point-color-*` 를 emit — 이름 관점에선 1개).
 *
 * 비대상: SCSS `$variable: value;` 자체는 제외. 이유: 런타임에 CSS 로 출력되지 않고,
 * Figma Styles/Variables 이름과 체계가 다름 (Figma 쪽은 CSS 변수 이름 체계 사용).
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { CodeTokenEntry } from "../types";
// 0.8.10 — CSS 변수 스캔 + countLines 를 공유 유틸로 이동 (cssVariables 파서와 복제였음).
import { countLines, scanCssVarDecls } from "../utils/cssVars";

/**
 * 여러 def 파일을 파싱해 토큰 목록 반환.
 *
 * @param absRoot projectRoot 절대 경로
 * @param defFiles projectRoot 기준 상대 경로 배열
 * @returns 이름순 정렬은 하지 않음 (상위에서 tokenMatrix 가 dedup/sort)
 */
export async function parseScssTokens(
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
      // 파일 없음 — 조용히 스킵 (def 파일이 프로젝트마다 다를 수 있음).
      continue;
    }

    const fileTokens = parseScssFile(content, relPath);
    for (const t of fileTokens) {
      if (seenNames.has(t.name)) continue;
      seenNames.add(t.name);
      results.push(t);
    }
  }

  return results;
}

/**
 * 파일 1개 파싱. 파일 내부에서도 첫 등장 우선 dedup.
 *
 * 분리된 내보내기: 파일 단위 테스트/호출을 위한 api. 상위에서 파일간 dedup 은
 * `parseScssTokens` 가 담당.
 */
export function parseScssFile(
  content: string,
  relPath: string
): CodeTokenEntry[] {
  const results: Map<string, CodeTokenEntry> = new Map();

  // ───── Pass 1: CSS 커스텀 프로퍼티 `--name: value;` ─────
  // 0.8.10 — 스캔 규칙은 공유 유틸 (utils/cssVars.ts) 로 이동 (cssVariables 파서와
  //   동일 구현 복제였음). 앵커 / 참조 배제 규칙 설명도 그쪽 참조.
  for (const decl of scanCssVarDecls(content)) {
    if (results.has(decl.name)) continue;
    results.set(decl.name, {
      name: decl.name,
      value: decl.value,
      file: relPath,
      line: countLines(content, decl.offset),
    });
  }

  // ───── Pass 2: SCSS 맵 + @each 동적 변수 ─────
  // 맵을 먼저 모두 파싱해 두고, @each 블록이 발견된 맵만 동적 변수로 emit.
  const maps = extractScssMaps(content);
  const eachBlocks = findEachBlocks(content);

  for (const eb of eachBlocks) {
    // 맵 엔트리의 value 를 `#{"--" + $k}: #{$v};` 형태로 emit 하는지 확인.
    // 구체 정규식 대신 "`--` 와 `$` + valVar 가 body 안에 등장" 을 느슨히 검사 —
    // 단계 3 용으로 충분. 엄격한 검사가 필요해지면 AST 도입.
    const hasCssEmit =
      /(#\{\s*["']?--["']?\s*\+\s*\$|--#\{\s*\$|#\{\s*\$)/.test(eb.body) &&
      eb.body.includes("$" + eb.valVar);
    if (!hasCssEmit) continue;

    const mapEntries = maps.get(eb.mapName);
    if (!mapEntries) continue;

    const eachLine = countLines(content, eb.index);
    for (const me of mapEntries) {
      const name = `--${me.key}`;
      if (results.has(name)) continue;
      results.set(name, {
        name,
        value: me.value,
        file: relPath,
        line: eachLine,
      });
    }
  }

  return [...results.values()];
}

// ───── 내부 유틸 ─────────────────────────────────────────────────

type ScssMapEntry = { key: string; value: string };

/**
 * `$name: ( ... );` 패턴의 맵을 모두 추출.
 * 괄호 깊이 추적으로 중첩 `var(...)` 값 안전 파싱.
 */
function extractScssMaps(content: string): Map<string, ScssMapEntry[]> {
  const out = new Map<string, ScssMapEntry[]>();
  const headRe = /\$([\w-]+)\s*:\s*\(/g;
  let m: RegExpExecArray | null;

  while ((m = headRe.exec(content)) !== null) {
    const name = m[1];
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < content.length && depth > 0) {
      const c = content[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      if (depth === 0) break;
      i++;
    }
    if (depth !== 0) continue; // 불균형 — 스킵

    const inner = content.slice(bodyStart, i);
    const entries: ScssMapEntry[] = [];
    // top-level 콤마 기준 split (paren depth 0 일 때만).
    let buf = "";
    let d = 0;
    for (const c of inner) {
      if (c === "(") d++;
      else if (c === ")") d--;
      if (c === "," && d === 0) {
        const parsed = parseMapEntry(buf);
        if (parsed) entries.push(parsed);
        buf = "";
      } else {
        buf += c;
      }
    }
    const tail = parseMapEntry(buf);
    if (tail) entries.push(tail);

    if (entries.length > 0) out.set(name, entries);
  }

  return out;
}

function parseMapEntry(raw: string): ScssMapEntry | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx < 0) return null;
  const key = trimmed.slice(0, colonIdx).trim();
  const value = trimmed.slice(colonIdx + 1).trim();
  if (!key) return null;
  return { key, value };
}

type EachBlock = {
  keyVar: string;
  valVar: string;
  mapName: string;
  body: string;
  /** @each 토큰 시작 위치 (파일 내 index). */
  index: number;
};

/**
 * `@each $k, $v in $mapName { ... }` 블록 추출.
 * 중괄호 깊이 추적으로 `#{...}` 인터폴레이션의 중첩 `}` 안전 처리.
 */
function findEachBlocks(content: string): EachBlock[] {
  const out: EachBlock[] = [];
  const headRe = /@each\s+\$([\w-]+)\s*,\s*\$([\w-]+)\s+in\s+\$([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;

  while ((m = headRe.exec(content)) !== null) {
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < content.length && depth > 0) {
      const c = content[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      if (depth === 0) break;
      i++;
    }
    if (depth !== 0) continue;
    out.push({
      keyVar: m[1],
      valVar: m[2],
      mapName: m[3],
      body: content.slice(bodyStart, i),
      index: m.index,
    });
  }
  return out;
}

