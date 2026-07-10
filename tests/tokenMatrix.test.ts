import { describe, expect, it } from "vitest";
import { buildTokenMatrix } from "../src/analyzers/tokenMatrix";
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
