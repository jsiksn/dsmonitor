/**
 * Figma DS 컴포넌트 ↔ 코드 className 매칭 (B 그룹 단계 3, 2026-04-29).
 *
 * 핵심: 사용자 옛 직관 — "Figma 의 btn 컴포넌트가 코드에서 className 으로 쓰이는가" — 측정.
 * 본 프로젝트는 Figma 이름 = CSS class 동기화 정책이라 같은 kebab-case 직접 비교 가능.
 *
 * 분모 (Figma DS 컴포넌트):
 *   - variantGroup 이름 (componentSet.name) — "btn / Primary / Default" 같은 variant 가
 *     아니라 그룹 자체의 이름 ("btn"). variant 단위 (componentSetId 보유 component) 는
 *     같은 그룹으로 분배되므로 분모에서 제외.
 *   - standalone component 이름 — variantGroup 에 안 속한 단독 component 의 첫 segment.
 *
 * 분자 (코드 className):
 *   - globalCss: globalStyleSources 인덱스에 정의된 className
 *   - jsx: jsx/tsx 의 className= 속성 토큰 (analyzer/codebase 가 누적)
 *
 * 매칭 알고리즘 (B1):
 *   - 정확 일치 (case sensitive). 정규화 / 변환 없음.
 *   - 본 프로젝트 정책 일관 — 정확 일치 안 되면 진짜 안 되는 것.
 *
 * 호환성: 다른 프로젝트가 className 정책 다르면 매칭률 0 에 가까움 — Phase 0.6 호환성
 * 검증 시 별도 mode (folder / className 분기) 검토.
 */

import type {
  ClassIndex,
  FigmaComponentMatch,
  FigmaComponentMatchEntry,
  FigmaComponentCodeOnlyEntry,
  FigmaComponentMatchSource,
  FigmaComponentMatchSummary,
  FigmaDesignSystemCount,
} from "../../types";

/** DS 1개의 매칭 분모 input — analyzer/figma.ts 가 designSystemCounts 에서 추출. */
export interface DsComponentInput {
  label: string;
  /** variantGroup 이름 리스트 (componentSet.name). */
  componentSetNames: string[];
  /** standalone component 이름 리스트 (variantGroup 외, 첫 segment dedup). */
  standaloneComponentNames: string[];
}

// 옛 isPlausibleComponentClass 간이 필터 (B 그룹 단계 3, 2026-04-29) 제거.
// 보정 3 (γ, 2026-04-29 후속): codeOnly = globalCss 정의 + jsx 사용 둘 다 + Figma 미매칭.
// 옛 β 의 "globalCss 정의 만" (dead 가능성) 부분은 별도 트랙 검토 — codeOnly 핵심은
// "DS 외부 (정상 동작 중인 className)" 으로 의미 명확화.

export function analyzeComponentMatch(
  designSystems: DsComponentInput[],
  classIndex: ClassIndex
): FigmaComponentMatch {
  const matched: FigmaComponentMatchEntry[] = [];
  const figmaOnly: FigmaComponentMatchEntry[] = [];
  const summary: Record<string, FigmaComponentMatchSummary> = {};

  // 매칭에 쓰인 Figma 이름 누적 — codeOnly 산출 시 차감용.
  const figmaUsedNames = new Set<string>();

  for (const ds of designSystems) {
    const dsSummary: FigmaComponentMatchSummary = {
      figmaTotal: 0,
      matched: 0,
      figmaOnly: 0,
      matchRatio: 0,
      matchedBreakdown: { both: 0, jsxOnly: 0, globalCssOnly: 0 },
    };

    const buckets: Array<{
      kind: "componentSet" | "standalone";
      names: string[];
    }> = [
      { kind: "componentSet", names: ds.componentSetNames },
      { kind: "standalone", names: ds.standaloneComponentNames },
    ];

    for (const bucket of buckets) {
      for (const name of bucket.names) {
        figmaUsedNames.add(name);
        dsSummary.figmaTotal += 1;

        const inGlobal = classIndex.globalClassNames.has(name);
        const inJsx = classIndex.jsxUsedClassNames.has(name);
        const matchedIn: FigmaComponentMatchSource[] = [];
        if (inGlobal) matchedIn.push("globalCss");
        if (inJsx) matchedIn.push("jsx");

        const entry: FigmaComponentMatchEntry = {
          name,
          figmaSource: ds.label,
          kind: bucket.kind,
          matchedIn,
        };

        if (matchedIn.length > 0) {
          matched.push(entry);
          dsSummary.matched += 1;
          if (inGlobal && inJsx) dsSummary.matchedBreakdown.both += 1;
          else if (inJsx) dsSummary.matchedBreakdown.jsxOnly += 1;
          else dsSummary.matchedBreakdown.globalCssOnly += 1;
        } else {
          figmaOnly.push(entry);
          dsSummary.figmaOnly += 1;
        }
      }
    }

    dsSummary.matchRatio =
      dsSummary.figmaTotal === 0
        ? 0
        : round(dsSummary.matched / dsSummary.figmaTotal, 4);
    summary[ds.label] = dsSummary;
  }

  // codeOnly — 코드 className 중 Figma DS 매칭 못한 토큰. globalCss / jsx union.
  const codeOnly = buildCodeOnly(classIndex, figmaUsedNames);

  // 정렬 — 사용자 시각 안정성 우선. figmaSource → kind → name.
  const figmaEntryComparator = (
    a: FigmaComponentMatchEntry,
    b: FigmaComponentMatchEntry
  ): number => {
    if (a.figmaSource !== b.figmaSource) {
      return a.figmaSource.localeCompare(b.figmaSource);
    }
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.name.localeCompare(b.name);
  };
  matched.sort(figmaEntryComparator);
  figmaOnly.sort(figmaEntryComparator);

  // 합계 카운트
  let totalFigma = 0;
  let totalMatched = 0;
  let totalFigmaOnly = 0;
  for (const s of Object.values(summary)) {
    totalFigma += s.figmaTotal;
    totalMatched += s.matched;
    totalFigmaOnly += s.figmaOnly;
  }
  const matchRatio = totalFigma === 0 ? 0 : round(totalMatched / totalFigma, 4);

  return {
    summary,
    matched,
    figmaOnly,
    codeOnly,
    totals: {
      figmaTotal: totalFigma,
      matched: totalMatched,
      figmaOnly: totalFigmaOnly,
      codeOnly: codeOnly.length,
      matchRatio,
    },
  };
}

/**
 * codeOnly — 코드에서 정상 사용 중이지만 Figma DS 카탈로그에 없는 className.
 *
 * 보정 3 (γ, 2026-04-29): globalCss 정의 + jsx 사용 둘 다 만족 + Figma 미매칭.
 * 핵심: "DS 외부에서 정상 동작 중인 className" — 사용자 인지 명료. dead 가능성
 * (globalCss 정의 만 + jsx 미사용) 부분은 별도 트랙 검토 (v0.12 이후 dead style 측정).
 *
 * 호환성: globalStyleSources / jsx className 둘 다 정의된 프로젝트만 의미. CSS
 * Modules / styled-components 는 0건. Phase 0.6 호환성 검증 시 별도 mode 검토.
 */
function buildCodeOnly(
  classIndex: ClassIndex,
  figmaUsedNames: Set<string>
): FigmaComponentCodeOnlyEntry[] {
  const entries: FigmaComponentCodeOnlyEntry[] = [];
  for (const name of classIndex.globalClassNames) {
    if (figmaUsedNames.has(name)) continue;
    if (!classIndex.jsxUsedClassNames.has(name)) continue;
    entries.push({ name });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

/** designSystemCounts → DsComponentInput 변환 헬퍼. figma.ts 메인에서 사용. */
export function dsInputsFromCounts(
  counts: FigmaDesignSystemCount[]
): DsComponentInput[] {
  return counts.map((c) => ({
    label: c.label,
    componentSetNames: c.componentSetNames ?? [],
    standaloneComponentNames: c.standaloneComponentNames ?? [],
  }));
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}
