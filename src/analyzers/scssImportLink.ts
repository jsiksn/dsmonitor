/**
 * scss-imports 매트릭스 연계 (0.10.0 — roadmap 이월분 구현).
 *
 * 취지: tailwind-project 에서 "코드 파일이 레거시 SCSS 를 import 하는가" 를 센다.
 * 단순 "import 경로가 .scss 면 금지" 는 pure-@apply 허용 방침과 충돌 (wrapper 용
 * SCSS import 는 정상) — 그래서 **import 된 파일의 클래스 정의 분류에 연동**한다:
 *
 *   - 금지 분류 (applyMixed / pureCss) 클래스가 1개 이상 → 레거시 import
 *   - 클래스 전부 pureApply, 또는 클래스 0개 (변수·믹스인 전용) → 정상 import
 *   - 경로 해석 실패 / 파일 없음 / 파싱 실패 → **미집계** (오검출 방지 우선)
 *
 * 분류 규칙은 매트릭스 (buildGlobalClassDefinitions) 와 동일 — 본 모듈의
 * `collectClassTypeEntries` 를 양쪽이 공유한다.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import type { ClassDefinitionType } from "../types";

// ───── 클래스 정의 분류 walk (매트릭스와 공유) ─────────────────────

export interface ClassTypeEntry {
  className: string;
  type: ClassDefinitionType;
}

/**
 * 스타일 파일 내용에서 클래스별 분류 (pureApply / applyMixed / pureCss) 추출.
 * 규칙: rule 안에 @apply 만 → pureApply, 일반 선언만 → pureCss, 둘 다 → applyMixed.
 * (파싱 실패는 throw — 호출부가 문맥에 맞게 처리: 전역 소스는 fail-fast,
 *  import 연계는 lenient.)
 */
export function collectClassTypeEntries(
  content: string,
  isScss: boolean,
  from: string
): ClassTypeEntry[] {
  const root = isScss
    ? postcssScss.parse(content, { from })
    : postcss.parse(content, { from });
  const out: ClassTypeEntry[] = [];
  root.walkRules((rule) => {
    let hasApply = false;
    let hasCssDecl = false;
    rule.walkAtRules((at) => {
      if (at.name === "apply") hasApply = true;
    });
    rule.walkDecls(() => {
      hasCssDecl = true;
    });
    if (!hasApply && !hasCssDecl) return; // 빈 rule 은 분류 X
    const type: ClassDefinitionType =
      hasApply && hasCssDecl ? "applyMixed" : hasApply ? "pureApply" : "pureCss";
    for (const sel of rule.selectors) {
      for (const cn of extractClassNamesFromSelector(sel)) {
        out.push({ className: cn, type });
      }
    }
  });
  return out;
}

/**
 * 셀렉터 문자열에서 클래스 이름 추출 — codebase.ts 의 옛 로컬 구현을 그대로 이동
 * (0.10.0 부터 단일 원천, codebase.ts 가 import). attribute selector 는 제거 후 매칭.
 */
export function extractClassNamesFromSelector(selector: string): string[] {
  const sanitized = selector.replace(/\[[^\]]*\]/g, "");
  const re = /\.(-?[_a-zA-Z][\w-]*)/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sanitized)) !== null) {
    out.push(m[1]);
  }
  return out;
}

// ───── import 경로 해석 ─────────────────────────────────────────────

/**
 * import source 문자열 → 실제 스타일 파일 절대 경로.
 *
 * 지원 형태:
 *   - 상대 경로: "./x.scss", "../styles/x" (확장자 생략 허용)
 *   - `@/` 별칭: 관례상 `<root>/src/` 또는 `<root>/` 매핑을 순서대로 시도
 *   - 루트 기준: "src/styles/x.scss" (`.scss`/`.sass` 로 끝날 때만 — 패키지명 오인 방지)
 *   - SCSS partial 관례: "x" → "_x.scss" 도 시도
 *
 * 그 외 (npm 패키지명 등) 와 미발견은 null — 호출부가 미집계 처리.
 */
export function resolveStyleImport(
  source: string,
  importerDir: string,
  absRoot: string
): string | null {
  const isStyleExt = /\.s[ac]ss$/.test(source);
  const bases: string[] = [];
  if (source.startsWith("./") || source.startsWith("../")) {
    bases.push(path.resolve(importerDir, source));
  } else if (source.startsWith("@/")) {
    bases.push(
      path.resolve(absRoot, "src", source.slice(2)),
      path.resolve(absRoot, source.slice(2))
    );
  } else if (!source.startsWith("@") && isStyleExt) {
    // 루트 기준 형태 — 확장자가 스타일일 때만 (bare 패키지명과 구분).
    bases.push(path.resolve(absRoot, source));
  } else {
    return null;
  }

  for (const base of bases) {
    for (const cand of candidatePaths(base, isStyleExt)) {
      if (existsSync(cand)) return cand;
    }
  }
  return null;
}

function candidatePaths(base: string, hasStyleExt: boolean): string[] {
  const dir = path.dirname(base);
  const name = path.basename(base);
  if (hasStyleExt) {
    // "x.scss" → 그대로 + partial "_x.scss"
    return [base, path.join(dir, `_${name}`)];
  }
  // 확장자 생략 → .scss / .sass + partial 관례
  return [
    `${base}.scss`,
    `${base}.sass`,
    path.join(dir, `_${name}.scss`),
    path.join(dir, `_${name}.sass`),
  ];
}

// ───── 파일 단위 분류기 (캐시) ──────────────────────────────────────

export interface StyleFileClassSummary {
  pureApply: number;
  applyMixed: number;
  pureCss: number;
}

/** 금지 분류 클래스가 1개라도 있으면 레거시 (tailwind preset 기준). */
export function isLegacyStyleFile(s: StyleFileClassSummary): boolean {
  return s.applyMixed + s.pureCss > 0;
}

/**
 * 절대 경로 → 클래스 분류 요약. 파일 단위 캐시.
 * 읽기/파싱 실패는 null (import 연계는 lenient — 측정 전체를 멈추지 않음).
 */
export function createStyleFileClassifier(): (
  absPath: string
) => StyleFileClassSummary | null {
  const cache = new Map<string, StyleFileClassSummary | null>();
  return (absPath: string) => {
    const hit = cache.get(absPath);
    if (hit !== undefined) return hit;
    let summary: StyleFileClassSummary | null = null;
    try {
      const content = readFileSync(absPath, "utf8");
      const isScss = path.extname(absPath).toLowerCase() !== ".css";
      const entries = collectClassTypeEntries(content, isScss, absPath);
      summary = { pureApply: 0, applyMixed: 0, pureCss: 0 };
      for (const e of entries) summary[e.type] += 1;
    } catch {
      summary = null;
    }
    cache.set(absPath, summary);
    return summary;
  };
}

/**
 * 한 코드 파일의 import 목록에서 레거시 SCSS import 수를 센다.
 * 같은 파일로 해석되는 중복 import 는 1건으로 dedup.
 */
export function countLegacyScssImports(
  imports: string[],
  importerDir: string,
  absRoot: string,
  classify: (absPath: string) => StyleFileClassSummary | null
): number {
  let count = 0;
  const seen = new Set<string>();
  for (const source of imports) {
    // 스타일 후보만 시도: 스타일 확장자로 끝나거나, 상대/별칭 경로.
    if (
      !/\.s[ac]ss$/.test(source) &&
      !source.startsWith("./") &&
      !source.startsWith("../") &&
      !source.startsWith("@/")
    ) {
      continue;
    }
    const abs = resolveStyleImport(source, importerDir, absRoot);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    // 해석은 됐지만 스타일 파일이 아닌 경우 (확장자 생략 상대 import 가 .ts 로
    // 해석될 일은 candidatePaths 가 스타일 확장자만 시도하므로 없음).
    const summary = classify(abs);
    if (summary && isLegacyStyleFile(summary)) count += 1;
  }
  return count;
}
