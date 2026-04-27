/**
 * DS ↔ 코드 토큰 매칭 (단계 3, 2026-04-24).
 *
 * 입력: 코드 토큰 목록 + DS 별 styles/variables 엔트리
 * 출력: TokenMatrix (rows / duplicates / summary)
 *
 * 매칭 규칙:
 *   - 이름 완전 일치만. 정규화 / 값 기반 / 수동 매핑 없음.
 *   - 중복은 한 항목으로 치되 count 를 매트릭스 셀에 기록.
 *   - rows 는 name 알파벳순.
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

export function buildTokenMatrix(
  codeTokens: CodeTokenEntry[],
  designSystems: TokenMatrixDsInput[]
): TokenMatrix {
  // 코드 측은 파서에서 이미 dedup. 방어적으로 다시 set 화.
  const codeSet = new Set<string>();
  for (const t of codeTokens) codeSet.add(t.name);

  // DS 별 이름→count 맵. styles + variables 를 합쳐 카운트.
  const dsCounts = new Map<string, Map<string, number>>();
  for (const ds of designSystems) {
    const counts = new Map<string, number>();
    for (const s of ds.styles) {
      counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    }
    for (const v of ds.variables) {
      counts.set(v.name, (counts.get(v.name) ?? 0) + 1);
    }
    dsCounts.set(ds.label, counts);
  }

  // 모든 이름 union.
  const allNames = new Set<string>(codeSet);
  for (const counts of dsCounts.values()) {
    for (const name of counts.keys()) allNames.add(name);
  }

  // rows 구성 (알파벳순).
  const sortedNames = [...allNames].sort((a, b) => a.localeCompare(b));
  const rows: TokenMatrixRow[] = sortedNames.map((name) => {
    const inCode: TokenMatrixCell = codeSet.has(name)
      ? { exists: true, count: 1 }
      : { exists: false, count: 0 };

    const inDs: Record<string, TokenMatrixCell> = {};
    for (const ds of designSystems) {
      const c = dsCounts.get(ds.label)?.get(name) ?? 0;
      inDs[ds.label] = { exists: c > 0, count: c };
    }

    return { name, inCode, inDs };
  });

  // duplicates — DS 내 동명이 2개 이상인 항목.
  const duplicates: TokenMatrixDuplicate[] = [];
  for (const ds of designSystems) {
    const counts = dsCounts.get(ds.label)!;
    for (const [name, count] of counts) {
      if (count > 1) {
        duplicates.push({ name, designSystem: ds.label, count });
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
    for (const [name, count] of counts) {
      if (codeSet.has(name)) matched++;
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
      totalUniqueTokens: allNames.size,
      codeCount: codeSet.size,
      dsStats,
    },
  };
}
