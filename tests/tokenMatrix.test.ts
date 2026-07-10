import { describe, expect, it } from "vitest";
import { buildTokenMatrix, canonicalTokenKey } from "../src/analyzers/tokenMatrix";
import type { CodeTokenEntry } from "../src/types";

const code = (name: string): CodeTokenEntry => ({
  name,
  value: "#000",
  file: "styles/tokens.css",
  line: 1,
});

const style = (name: string) => ({
  key: `k-${name}`,
  name,
  styleType: "FILL",
});

describe("buildTokenMatrix", () => {
  it("이름 완전 일치만 매칭 — dsStats matchedWithCode", () => {
    const tm = buildTokenMatrix(
      [code("--color-a"), code("--color-b")],
      [{ label: "ds-new", styles: [style("--color-a"), style("--color-x")], variables: [] }]
    );
    expect(tm.summary.codeCount).toBe(2);
    expect(tm.summary.dsStats["ds-new"]).toEqual({
      total: 2,
      matchedWithCode: 1,
      duplicateCount: 0,
    });
    // rows = code ∪ ds 이름 union, 알파벳순
    expect(tm.rows.map((r) => r.name)).toEqual(["--color-a", "--color-b", "--color-x"]);
  });

  it("DS 내 동명 2개 이상은 duplicates 로 수집", () => {
    const tm = buildTokenMatrix(
      [],
      [{ label: "ds", styles: [style("dup"), style("dup")], variables: [] }]
    );
    expect(tm.duplicates).toEqual([{ name: "dup", designSystem: "ds", count: 2 }]);
    expect(tm.summary.dsStats["ds"].duplicateCount).toBe(1);
  });

  it("styles + variables 합산 카운트", () => {
    const tm = buildTokenMatrix(
      [code("--v-1")],
      [
        {
          label: "ds",
          styles: [style("--s-1")],
          variables: [{ id: "1", name: "--v-1", resolvedType: "COLOR" }],
        },
      ]
    );
    expect(tm.summary.dsStats["ds"].total).toBe(2);
    expect(tm.summary.dsStats["ds"].matchedWithCode).toBe(1);
  });

  it("DS 여러 개 — 각 라벨별 inDs 셀 생성", () => {
    const tm = buildTokenMatrix(
      [code("--a")],
      [
        { label: "ds-new", styles: [style("--a")], variables: [] },
        { label: "ds-legacy", styles: [], variables: [] },
      ]
    );
    const row = tm.rows.find((r) => r.name === "--a")!;
    expect(row.inDs["ds-new"].exists).toBe(true);
    expect(row.inDs["ds-legacy"].exists).toBe(false);
  });
});

// 0.9.0 — Tailwind v3 (dot-path) ↔ v4 (CSS 변수) 이름 정규화 매칭.
describe("canonicalTokenKey", () => {
  it("알려진 카테고리 dot-path → v4 CSS 변수형", () => {
    expect(canonicalTokenKey("colors.primary.500")).toBe("--color-primary-500");
    expect(canonicalTokenKey("spacing.md")).toBe("--spacing-md");
    expect(canonicalTokenKey("fontSize.xl")).toBe("--text-xl");
    expect(canonicalTokenKey("borderRadius.lg")).toBe("--radius-lg");
  });

  it("CSS 변수형은 그대로", () => {
    expect(canonicalTokenKey("--color-primary-500")).toBe("--color-primary-500");
  });

  it("알 수 없는 카테고리 dot-path 는 정규화하지 않음 (보수적 — 오매칭 방지)", () => {
    expect(canonicalTokenKey("zIndex.modal")).toBe("zIndex.modal");
  });

  it("dot-path 아닌 일반 이름은 그대로", () => {
    expect(canonicalTokenKey("Point/Color 0")).toBe("Point/Color 0");
  });
});

describe("buildTokenMatrix — v3/v4 정규화 매칭 (0.9.0)", () => {
  it("코드 v3 dot-path 와 DS CSS 변수형이 같은 논리 토큰으로 매칭", () => {
    const tm = buildTokenMatrix(
      [code("colors.primary.500")],
      [{ label: "ds", styles: [style("--color-primary-500")], variables: [] }]
    );
    expect(tm.summary.dsStats["ds"].matchedWithCode).toBe(1);
    // 같은 논리 토큰 = row 1개 (union 에 2개로 갈라지지 않음)
    expect(tm.rows).toHaveLength(1);
    const row = tm.rows[0];
    expect(row.inCode.exists).toBe(true);
    expect(row.inDs["ds"].exists).toBe(true);
  });

  it("정확 일치 케이스는 옛 동작 그대로 (정규화 영향 없음)", () => {
    const tm = buildTokenMatrix(
      [code("--color-a")],
      [{ label: "ds", styles: [style("--color-a")], variables: [] }]
    );
    expect(tm.summary.dsStats["ds"].matchedWithCode).toBe(1);
  });

  it("무관한 이름은 여전히 미매칭", () => {
    const tm = buildTokenMatrix(
      [code("colors.primary.500")],
      [{ label: "ds", styles: [style("--color-secondary-500")], variables: [] }]
    );
    expect(tm.summary.dsStats["ds"].matchedWithCode).toBe(0);
    expect(tm.rows).toHaveLength(2);
  });
});
