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
  const theme = tailwindCfg?.theme;
  if (!theme || typeof theme !== "object") return [];

  const targets =
    categories === undefined ? DEFAULT_CATEGORIES : categories;
  const keys = targets.length === 0 ? Object.keys(theme) : targets;

  const seenNames = new Set<string>();
  const results: CodeTokenEntry[] = [];

  for (const cat of keys) {
    const base = resolveCategoryValue(theme[cat]);
    const extend = resolveCategoryValue(theme.extend?.[cat]);

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
 * Tailwind 의 카테고리 값은 plain object 또는 함수 (`({ colors }) => ({...})`).
 * 함수형이면 빈 인자로 호출해 결과를 가져옵니다. 호출 실패 / 비-object 결과는 undefined.
 */
function resolveCategoryValue(raw: unknown): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  if (typeof raw === "function") {
    try {
      const result = (raw as (...args: any[]) => unknown)({});
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
    // 첫 element 만 value 로 emit, 나머지는 nested entry 가 있으면 그대로 flatten.
    if (value.length > 0) {
      yield [prefix, value[0]];
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
