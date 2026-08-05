/**
 * 토큰 이름 매핑 (0.11.0, 2026-08-05 설계 확정).
 *
 * 배경: dsforge 류 파이프라인은 Figma 변수명 (`spacing/4`) 을 규칙으로 변환한
 * CSS 변수 (`--<ds>-space-4`) 를 코드에 쓴다. tokenMatrix 는 이름 일치 매칭이라
 * 이대로는 양방향 0% 로 표시됨 — 선언적 접두어 규칙으로 DS 쪽 이름을 코드
 * 이름 형태로 변환해 매칭을 살린다.
 *
 * 설계 결정 (배제 사항 포함):
 *   - 토큰별 수동 매핑 테이블 없음 — 규칙은 접두어 일괄 변환만.
 *   - 측정에 개입하는 값 기반 추론 없음 — 적용은 항상 명시 규칙만.
 *   - regex / 함수형 규칙 없음 — 감사 가능성 (리포트에 규칙 인쇄, 퇴화 감지).
 *
 * 적용 지점: figma.ts 의 tokenMatrix 입력 조립 시 DS variables 에만.
 * styles (텍스트 스타일) 는 대상 아님 — 코드 대응물이 클래스라 형태가 다름.
 * 변환 결과는 `--` 시작이므로 canonicalTokenKey 를 무변경 통과한다.
 */

import type { FigmaVariableEntry, TokenNameMappingRule } from "../types";

/** 매핑 적용 결과의 variables 엔트리 — 변환된 행은 원래 이름을 보존. */
export type MappedVariableEntry = FigmaVariableEntry & {
  /** 변환 전 Figma 변수명. 변환 안 된 엔트리는 필드 없음. */
  mappedFrom?: string;
};

/**
 * 규칙 배열의 구조 오류 목록 반환 (빈 배열 = 유효).
 *
 * 측정 시작 전 (figma.ts) 과 doctor 정적 검증이 공유하는 단일 소스.
 * 오류는 조용한 선착순 처리 대신 전부 명시 에러 — 측정 결과가 규칙 순서에
 * 따라 달라지는 비결정성을 차단한다.
 */
export function validateTokenNameMapping(
  rules: TokenNameMappingRule[]
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  let catchAll = 0;
  rules.forEach((r, i) => {
    if (typeof r.from !== "string" || typeof r.to !== "string") {
      errors.push(`[${i}] from/to 는 문자열이어야 합니다.`);
      return;
    }
    if (seen.has(r.from)) {
      errors.push(
        `[${i}] from "${r.from}" 중복 — 같은 접두어 규칙이 2개 이상입니다.`
      );
    }
    seen.add(r.from);
    if (r.from === "") catchAll += 1;
    if (!r.to.startsWith("--")) {
      errors.push(
        `[${i}] to "${r.to}" 는 "--" 로 시작해야 합니다 (변환 결과가 코드 CSS 변수명이어야 매칭이 의미 있음).`
      );
    }
  });
  if (catchAll > 1) {
    errors.push(`catch-all (from: "") 규칙은 최대 1개입니다 (현재 ${catchAll}개).`);
  }
  return errors;
}

/**
 * 접두어 제거 후 나머지 부분의 고정 정규화 (설정 아님).
 * 소문자화 + `/`·공백 → `-`. 연속 하이픈은 1개로 접음 ("Light / 100" 같은
 * 공백 섞인 이름이 `--x-light---100` 이 되는 것 방지).
 */
function normalizeRest(rest: string): string {
  return rest
    .toLowerCase()
    .replace(/[/\s]+/g, "-")
    .replace(/-{2,}/g, "-");
}

/**
 * DS variables 에 매핑 규칙 적용.
 *
 * - 매치 판정: `from` 이 변수명의 접두어인지 **대소문자 무시** 비교.
 *   여러 규칙 매치 시 가장 긴 `from` 승리 (동률 없음 — from 중복은 validate 에서 에러).
 * - 변환: `to` + normalizeRest(접두어 이후 나머지). 원래 이름은 mappedFrom 으로 보존.
 * - 어떤 규칙에도 안 맞는 이름: 변환 없이 그대로 (mappedFrom 없음).
 *
 * warnings (측정은 계속 — 규칙 오타 / 수동 테이블 퇴화 신호):
 *   - 매치 0건 규칙: 규칙별 warning.
 *   - 매치 1건 이하 규칙이 3개 이상: 퇴화 warning 1건 (누적 판정 —
 *     소규모 카테고리의 정당한 1건 매치는 개별로는 문제 아님).
 */
export function applyTokenNameMapping(
  variables: FigmaVariableEntry[],
  rules: TokenNameMappingRule[],
  dsLabel: string
): { variables: MappedVariableEntry[]; warnings: string[] } {
  // 최장 from 우선 — 미리 내림차순 정렬해 첫 매치 = 최장 매치.
  const sorted = [...rules].sort((a, b) => b.from.length - a.from.length);
  const matchCount = new Map<TokenNameMappingRule, number>();
  for (const r of rules) matchCount.set(r, 0);

  const mapped: MappedVariableEntry[] = variables.map((v) => {
    const lower = v.name.toLowerCase();
    const rule = sorted.find((r) => lower.startsWith(r.from.toLowerCase()));
    if (!rule) return v;
    matchCount.set(rule, (matchCount.get(rule) ?? 0) + 1);
    return {
      ...v,
      name: rule.to + normalizeRest(v.name.slice(rule.from.length)),
      mappedFrom: v.name,
    };
  });

  const warnings: string[] = [];
  const prefix = `[tokenNameMapping "${dsLabel}"]`;
  let lowMatchRules = 0;
  for (const r of rules) {
    const n = matchCount.get(r) ?? 0;
    if (n === 0) {
      warnings.push(
        `${prefix} 규칙 "${r.from}" → "${r.to}" 매치 0건 — 접두어 오타이거나 DS 에서 사라진 카테고리인지 확인하세요.`
      );
    }
    if (n <= 1) lowMatchRules += 1;
  }
  if (lowMatchRules >= 3) {
    warnings.push(
      `${prefix} 매치 1건 이하 규칙이 ${lowMatchRules}개 — 접두어 규칙이 수동 매핑 테이블처럼 사용되고 있습니다. 명명 규약 정렬을 권장합니다.`
    );
  }
  return { variables: mapped, warnings };
}
