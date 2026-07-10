/**
 * Tailwind 파서 (0.6.0+, R 항목).
 *
 * 대상: `tailwind.config.{js,cjs,mjs,ts}` 의 export. `theme` 과 `theme.extend`
 * 의 nested object 를 dot-path 로 flatten 해 토큰으로 등록합니다.
 *
 * 예) `theme.colors.primary[500] = "#1234ab"` → name = `colors.primary.500`,
 *     value = `"#1234ab"`.
 *
 * 카테고리 (`config.categories`):
 *   - 미지정 시 기본 `["colors", "spacing", "fontSize", "borderRadius"]`.
 *   - 빈 배열이면 `theme` 의 모든 top-level 키를 시도합니다.
 *
 * 동적 import 흐름:
 *   - `.ts` / `.mts` / `.cts` — `tsx/esm/api` 의 `tsImport` 활용 (옛 cli.ts 와 동일).
 *   - 그 외 (`.js`, `.cjs`, `.mjs`) — native dynamic `import()`.
 *   - tsx quirk 대응: `mod.default.default ?? mod.default ?? mod`.
 *
 * 비대상:
 *   - Tailwind v4 의 CSS-only `@theme { --color-primary-500: ... }` 정의 — 이는
 *     `cssVariables` 파서로 처리합니다.
 *   - 함수형 `colors: ({ colors }) => ({...})` 같은 동적 정의 — 함수 호출 시점에
 *     필요한 인자를 제공하지 못해 값이 안 잡힐 수 있습니다 (현재는 빈 인자로 호출).
 */

import { existsSync } from "node:fs";
import path from "node:path";
import url from "node:url";
import type {
  CodeTokenEntry,
  CodeTokenParser,
  CodeTokenParserConfig,
  CodeTokenParserWarning,
} from "../../../types";

const DEFAULT_CATEGORIES = ["colors", "spacing", "fontSize", "borderRadius"];

export const tailwindParser: CodeTokenParser = {
  type: "tailwind",
  async parse(
    config: CodeTokenParserConfig,
    absRoot: string,
    warnings?: CodeTokenParserWarning[]
  ): Promise<CodeTokenEntry[]> {
    if (config.type !== "tailwind") {
      throw new Error(
        `tailwindParser: expected config.type === "tailwind", got "${config.type}"`
      );
    }
    // 0.7.0 (Z): config 파일 부재 / 로드 실패를 warning 으로 보고.
    return parseTailwindConfig(absRoot, config.config, config.categories, warnings);
  },
};

export async function parseTailwindConfig(
  absRoot: string,
  configPath: string,
  categories?: string[],
  warnings?: CodeTokenParserWarning[]
): Promise<CodeTokenEntry[]> {
  const absPath = path.resolve(absRoot, configPath);
  const relPath = path.relative(absRoot, absPath) || configPath;

  if (!existsSync(absPath)) {
    if (warnings) {
      warnings.push({
        parser: "tailwind",
        path: configPath,
        issue: "file_not_found",
      });
    }
    return [];
  }

  let mod: any;
  try {
    mod = await loadConfigModule(absPath);
  } catch (e) {
    if (warnings) {
      warnings.push({
        parser: "tailwind",
        path: configPath,
        issue: "load_error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return [];
  }

  const tailwindCfg = mod?.default?.default ?? mod?.default ?? mod;
  const theme = collectTheme(tailwindCfg);
  if (!theme) return [];

  const targets =
    categories === undefined ? DEFAULT_CATEGORIES : categories;
  const keys =
    targets.length === 0
      ? [...new Set([...Object.keys(theme.base), ...Object.keys(theme.extend)])]
      : targets;

  const seenNames = new Set<string>();
  const results: CodeTokenEntry[] = [];

  for (const cat of keys) {
    if (cat === "extend") continue;
    const base = resolveCategoryValue(theme.base[cat]);
    const extend = resolveCategoryValue(theme.extend[cat]);

    // base + extend 병합 — extend 가 같은 이름을 override 합니다 (Tailwind 동작과 동일).
    const merged = mergeNested(base, extend);
    if (merged === undefined) continue;

    for (const [dotPath, value] of flatten(cat, merged)) {
      if (seenNames.has(dotPath)) continue;
      seenNames.add(dotPath);
      results.push({
        name: dotPath,
        value: stringifyValue(value),
        file: relPath,
        line: 1,
      });
    }
  }

  return results;
}

/**
 * 0.9.0 — `presets` 배열 theme 병합.
 *
 * Tailwind 병합 규칙과 동일 취지: preset 이 먼저 깔리고 사용자 config 가 override.
 * preset 이 다시 presets 를 가지면 재귀 (앞선 preset 이 먼저 깔림).
 * theme / theme.extend 를 분리 누적 — 카테고리 단위 병합은 기존 mergeNested 그대로.
 */
function collectTheme(cfg: any): {
  base: Record<string, unknown>;
  extend: Record<string, unknown>;
} | null {
  if (!cfg || typeof cfg !== "object") return null;
  const base: Record<string, unknown> = {};
  const extend: Record<string, unknown> = {};

  const apply = (c: any) => {
    if (!c || typeof c !== "object") return;
    if (Array.isArray(c.presets)) {
      for (const p of c.presets) apply(p);
    }
    const t = c.theme;
    if (!t || typeof t !== "object") return;
    for (const [k, v] of Object.entries(t)) {
      if (k === "extend") continue;
      base[k] = v;
    }
    if (t.extend && typeof t.extend === "object") {
      for (const [k, v] of Object.entries(t.extend)) {
        // extend 는 카테고리 값끼리 깊은 병합 (뒤에 적용되는 쪽 = 사용자 config 우선).
        const prev = resolveCategoryValue(extend[k]);
        const next = resolveCategoryValue(v);
        extend[k] = prev || next ? mergeNested(prev, next) : v;
      }
    }
  };
  apply(cfg);

  if (Object.keys(base).length === 0 && Object.keys(extend).length === 0) {
    return null;
  }
  return { base, extend };
}

async function loadConfigModule(absPath: string): Promise<any> {
  const isTs =
    absPath.endsWith(".ts") ||
    absPath.endsWith(".mts") ||
    absPath.endsWith(".cts");
  if (isTs) {
    const { tsImport } = await import("tsx/esm/api");
    return tsImport(url.pathToFileURL(absPath).href, import.meta.url);
  }
  return import(url.pathToFileURL(absPath).href);
}

/**
 * Tailwind 의 카테고리 값은 plain object 또는 함수 (`({ colors, theme }) => ({...})`).
 *
 * 0.9.0 — 옛 빈 인자 `{}` 호출은 `theme(...)` helper 를 쓰는 함수형 정의에서
 * TypeError 로 조용히 undefined 가 되던 한계. 최소 stub 을 전달:
 *   - theme(path, defaultValue) → defaultValue (없으면 {}) — 정적 해석이라
 *     실제 theme resolve 는 하지 않고 기본값만 취함.
 *   - colors / breakpoints → 빈 객체.
 * stub 으로도 실패하는 정의는 옛 흐름 그대로 undefined (경고 없음 — 선택 카테고리).
 */
function resolveCategoryValue(raw: unknown): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  if (typeof raw === "function") {
    const stub = {
      theme: (_path: string, defaultValue?: unknown) => defaultValue ?? {},
      colors: {},
      breakpoints: (v: unknown) => v ?? {},
    };
    try {
      const result = (raw as (...args: any[]) => unknown)(stub);
      return isPlainObject(result) ? (result as Record<string, unknown>) : undefined;
    } catch {
      return undefined;
    }
  }
  if (isPlainObject(raw)) return raw as Record<string, unknown>;
  return undefined;
}

function mergeNested(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const prev = out[k];
    if (isPlainObject(prev) && isPlainObject(v)) {
      out[k] = mergeNested(
        prev as Record<string, unknown>,
        v as Record<string, unknown>
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

function* flatten(
  prefix: string,
  value: unknown
): Generator<[string, unknown]> {
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = k === "DEFAULT" ? prefix : `${prefix}.${k}`;
      yield* flatten(next, v);
    }
  } else if (Array.isArray(value)) {
    // Tailwind 의 fontSize 등은 `["1rem", { lineHeight: "1.5rem" }]` 같은 tuple.
    // 첫 element 는 본 값으로 emit.
    if (value.length > 0) {
      yield [prefix, value[0]];
    }
    // 0.9.0 — 2번째 요소가 객체면 sub-token 으로 flatten (옛 흐름은 누락).
    //   예: fontSize.xl = ["1.25rem", { lineHeight: "1.75rem" }]
    //       → fontSize.xl.lineHeight = "1.75rem"
    if (value.length > 1 && isPlainObject(value[1])) {
      yield* flatten(prefix, value[1]);
    }
  } else {
    yield [prefix, value];
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    typeof v !== "function"
  );
}

function stringifyValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
