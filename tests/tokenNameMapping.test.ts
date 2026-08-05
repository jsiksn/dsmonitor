import { describe, expect, it } from "vitest";
import {
  applyTokenNameMapping,
  validateTokenNameMapping,
} from "../src/analyzers/tokenNameMapping";
import { buildTokenMatrix } from "../src/analyzers/tokenMatrix";
import type { FigmaVariableEntry, TokenNameMappingRule } from "../src/types";

const v = (name: string): FigmaVariableEntry => ({
  id: `id-${name}`,
  name,
  resolvedType: "COLOR",
});

describe("validateTokenNameMapping", () => {
  it("유효한 규칙 — 빈 오류 배열", () => {
    expect(
      validateTokenNameMapping([
        { from: "spacing/", to: "--myds-space-" },
        { from: "", to: "--myds-" },
      ])
    ).toEqual([]);
  });

  it("같은 from 중복 — 에러", () => {
    const errors = validateTokenNameMapping([
      { from: "spacing/", to: "--a-" },
      { from: "spacing/", to: "--b-" },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("중복");
  });

  it("catch-all 2개 — 에러", () => {
    // from "" 이 2개면 from 중복 에러와 catch-all 에러가 모두 잡힌다.
    const errors = validateTokenNameMapping([
      { from: "", to: "--a-" },
      { from: "", to: "--b-" },
    ]);
    expect(errors.some((e) => e.includes("catch-all"))).toBe(true);
  });

  it('to 가 "--" 로 시작하지 않으면 에러', () => {
    const errors = validateTokenNameMapping([{ from: "spacing/", to: "myds-" }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("--");
  });
});

describe("applyTokenNameMapping", () => {
  const rules: TokenNameMappingRule[] = [
    { from: "spacing/", to: "--myds-space-" },
    { from: "", to: "--myds-" },
  ];

  it("접두어 변환 + mappedFrom 보존", () => {
    const { variables } = applyTokenNameMapping([v("spacing/4")], rules, "ds");
    expect(variables[0].name).toBe("--myds-space-4");
    expect(variables[0].mappedFrom).toBe("spacing/4");
  });

  it("최장 from 우선 — spacing/ 이 catch-all 을 이김", () => {
    const { variables } = applyTokenNameMapping(
      [v("spacing/4"), v("logo/blue")],
      rules,
      "ds"
    );
    expect(variables.map((x) => x.name)).toEqual([
      "--myds-space-4",
      "--myds-logo-blue", // catch-all 경로: "/" → "-"
    ]);
  });

  it("문자 정규화 고정 — 대소문자·공백·슬래시", () => {
    const { variables } = applyTokenNameMapping(
      [v("Light / 100"), v("Logo/Blue-Dark")],
      [{ from: "", to: "--myds-" }],
      "ds"
    );
    expect(variables.map((x) => x.name)).toEqual([
      "--myds-light-100",
      "--myds-logo-blue-dark",
    ]);
  });

  it("매치 판정도 대소문자 무시", () => {
    const { variables } = applyTokenNameMapping(
      [v("Spacing/4")],
      [{ from: "spacing/", to: "--myds-space-" }],
      "ds"
    );
    expect(variables[0].name).toBe("--myds-space-4");
  });

  it("catch-all 없으면 미매치 이름은 그대로 (mappedFrom 없음)", () => {
    const { variables } = applyTokenNameMapping(
      [v("logo/blue")],
      [{ from: "spacing/", to: "--myds-space-" }],
      "ds"
    );
    expect(variables[0].name).toBe("logo/blue");
    expect(variables[0].mappedFrom).toBeUndefined();
  });

  it("0매치 규칙 — warning", () => {
    const { warnings } = applyTokenNameMapping(
      [v("logo/blue")],
      [
        { from: "spacing/", to: "--myds-space-" }, // 0건
        { from: "", to: "--myds-" },
      ],
      "ds"
    );
    expect(warnings.some((w) => w.includes('"spacing/"') && w.includes("0건"))).toBe(true);
  });

  it("1건 이하 매치 규칙 3개 이상 — 퇴화 warning (누적 판정)", () => {
    const { warnings } = applyTokenNameMapping(
      [v("a/x"), v("b/x"), v("c/x")],
      [
        { from: "a/", to: "--t-a-" },
        { from: "b/", to: "--t-b-" },
        { from: "c/", to: "--t-c-" },
      ],
      "ds"
    );
    expect(warnings.some((w) => w.includes("수동 매핑 테이블"))).toBe(true);
  });

  it("풍부한 매치 (규칙당 2건 이상) — 퇴화 warning 없음", () => {
    const { warnings } = applyTokenNameMapping(
      [v("a/x"), v("a/y"), v("b/x"), v("b/y")],
      [
        { from: "a/", to: "--t-a-" },
        { from: "b/", to: "--t-b-" },
      ],
      "ds"
    );
    expect(warnings).toEqual([]);
  });
});

describe("buildTokenMatrix + tokenNameMapping 통합", () => {
  const code = (name: string) => ({
    name,
    value: "#000",
    file: "tokens.css",
    line: 1,
  });

  it("매핑 적용 시 dsforge 형태가 매칭되고 row.mappedFrom 보존", () => {
    const { variables } = applyTokenNameMapping(
      [v("spacing/4"), v("logo/blue")],
      [
        { from: "spacing/", to: "--myds-space-" },
        { from: "", to: "--myds-" },
      ],
      "ds"
    );
    const tm = buildTokenMatrix(
      [code("--myds-space-4"), code("--myds-logo-blue")],
      [{ label: "ds", styles: [], variables }]
    );
    expect(tm.summary.dsStats["ds"].matchedWithCode).toBe(2);
    const spaceRow = tm.rows.find((r) => r.name === "--myds-space-4")!;
    expect(spaceRow.mappedFrom).toBe("spacing/4");
    // 표시 이름은 코드 우선 규칙 그대로 코드 변수명.
    expect(tm.rows.every((r) => r.name.startsWith("--myds-"))).toBe(true);
  });

  it("매핑 미사용 (mappedFrom 없는 입력) — row 에 mappedFrom 필드 없음", () => {
    const tm = buildTokenMatrix(
      [code("--a")],
      [{ label: "ds", styles: [], variables: [v("--a")] }]
    );
    expect(tm.rows[0].mappedFrom).toBeUndefined();
    expect("mappedFrom" in tm.rows[0]).toBe(false);
  });
});
