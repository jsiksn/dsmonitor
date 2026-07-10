/**
 * DS ↔ 코드 토큰 매칭 (단계 3, 2026-04-24).
 *
 * 입력: 코드 토큰 목록 + DS 별 styles/variables 엔트리
 * 출력: TokenMatrix (rows / duplicates / summary)
 *
 * 매칭 규칙:
 *   - 이름 정규화 키 (canonicalTokenKey) 비교. 0.8.x 까지는 완전 일치만이었으나,
 *     0.9.0 부터 Tailwind v3 dot-path (`colors.primary.500`) 와 v4 CSS 변수형
 *     (`--color-primary-500`) 을 같은 논리 토큰으로 매칭 (알려진 카테고리 한정 —
 *     그 외 이름은 옛 완전 일치 동작 그대로).
 *   - 값 기반 / 수동 매핑 없음.
 *   - 중복은 한 항목으로 치되 count 를 매트릭스 셀에 기록.
 *   - rows 는 표시 이름 알파벳순 (표시 이름 = 첫 등장 원 이름 — 코드 우선).
 *
 * 확장성: DS N 개가 와도 designSystems 배열 길이에 맞춰 각 row.inDs 가 생성됨.
 */

import type {
  FigmaVariableEntry,
  CodeTokenEntry,
  TokenMatrix,
  TokenMatrixCell,
  TokenMatrixDsStats,
  TokenMatrixDuplicate,
  TokenMatrixRow,
} from "../types";
import type { FigmaStyleEntry } from "./figma/apiClient";

export type TokenMatrixDsInput = {
  label: string;
  styles: FigmaStyleEntry[];
  variables: FigmaVariableEntry[];
};

/**
 * Tailwind v3 dot-path 카테고리 → v4 CSS 변수 namespace 매핑 (0.9.0).
 *
 * Tailwind v4 의 `@theme` 변수 명명 규칙 기준. 여기 없는 카테고리 (zIndex 등
 * v4 에 대응 namespace 가 없는 것) 는 정규화하지 않음 — 보수적 (오매칭 방지).
 */
const TAILWIND_V4_NAMESPACE: Record<string, string> = {
  colors: "color",
  spacing: "spacing",
  fontSize: "text",
  fontFamily: "font",
  fontWeight: "font-weight",
  lineHeight: "leading",
  letterSpacing: "tracking",
  borderRadius: "radius",
  boxShadow: "shadow",
  screens: "breakpoint",
};

/**
 * 이름 정규화 키 (0.9.0).
 *
 * - `--...` CSS 변수형 → 그대로.
 * - 알려진 카테고리의 dot-path (`colors.primary.500`) → v4 CSS 변수형
 *   (`--color-primary-500`) 으로 변환 — v3 config 파서 출력과 v4 `@theme` /
 *   Figma Variables 이름이 같은 논리 토큰으로 매칭되게.
 * - 그 외 이름 → 그대로 (옛 완전 일치 동작).
 */
export function canonicalTokenKey(name: string): string {
  if (name.startsWith("--")) return name;
  const dot = name.indexOf(".");
  if (dot <= 0) return name;
  const category = name.slice(0, dot);
  const ns = TAILWIND_V4_NAMESPACE[category];
  if (!ns) return name;
  const rest = name.slice(dot + 1).split(".").join("-");
  return `--${ns}-${rest}`;
}

export function buildTokenMatrix(
  codeTokens: CodeTokenEntry[],
  designSystems: TokenMatrixDsInput[]
): TokenMatrix {
  // 0.9.0 — 정규화 키 기준으로 집계. 표시 이름은 첫 등장 원 이름 보존 (코드 우선).
  // 코드 측은 파서에서 이미 dedup. 방어적으로 다시 set 화.
  const displayName = new Map<string, string>();
  const codeSet = new Set<string>();
  for (const t of codeTokens) {
    const key = canonicalTokenKey(t.name);
    codeSet.add(key);
    if (!displayName.has(key)) displayName.set(key, t.name);
  }

  // DS 별 정규화키→count 맵. styles + variables 를 합쳐 카운트.
  const dsCounts = new Map<string, Map<string, number>>();
  for (const ds of designSystems) {
    const counts = new Map<string, number>();
    for (const s of ds.styles) {
      const key = canonicalTokenKey(s.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!displayName.has(key)) displayName.set(key, s.name);
    }
    for (const v of ds.variables) {
      const key = canonicalTokenKey(v.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!displayName.has(key)) displayName.set(key, v.name);
    }
    dsCounts.set(ds.label, counts);
  }

  // 모든 키 union.
  const allKeys = new Set<string>(codeSet);
  for (const counts of dsCounts.values()) {
    for (const key of counts.keys()) allKeys.add(key);
  }

  // rows 구성 (표시 이름 알파벳순).
  const sortedKeys = [...allKeys].sort((a, b) =>
    (displayName.get(a) ?? a).localeCompare(displayName.get(b) ?? b)
  );
  const rows: TokenMatrixRow[] = sortedKeys.map((key) => {
    const inCode: TokenMatrixCell = codeSet.has(key)
      ? { exists: true, count: 1 }
      : { exists: false, count: 0 };

    const inDs: Record<string, TokenMatrixCell> = {};
    for (const ds of designSystems) {
      const c = dsCounts.get(ds.label)?.get(key) ?? 0;
      inDs[ds.label] = { exists: c > 0, count: c };
    }

    return { name: displayName.get(key) ?? key, inCode, inDs };
  });

  // duplicates — DS 내 같은 논리 토큰 (정규화 키) 이 2개 이상인 항목.
  const duplicates: TokenMatrixDuplicate[] = [];
  for (const ds of designSystems) {
    const counts = dsCounts.get(ds.label)!;
    for (const [key, count] of counts) {
      if (count > 1) {
        duplicates.push({
          name: displayName.get(key) ?? key,
          designSystem: ds.label,
          count,
        });
      }
    }
  }
  duplicates.sort(
    (a, b) =>
      a.designSystem.localeCompare(b.designSystem) ||
      a.name.localeCompare(b.name)
  );

  // summary.
  const dsStats: Record<string, TokenMatrixDsStats> = {};
  for (const ds of designSystems) {
    const counts = dsCounts.get(ds.label)!;
    let matched = 0;
    let duplicateCount = 0;
    for (const [key, count] of counts) {
      if (codeSet.has(key)) matched++;
      if (count > 1) duplicateCount++;
    }
    dsStats[ds.label] = {
      total: counts.size,
      matchedWithCode: matched,
      duplicateCount,
    };
  }

  return {
    designSystems: designSystems.map((d) => d.label),
    rows,
    duplicates,
    summary: {
      totalUniqueTokens: allKeys.size,
      codeCount: codeSet.size,
      dsStats,
    },
  };
}
