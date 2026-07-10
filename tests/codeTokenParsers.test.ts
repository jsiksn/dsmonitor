import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCodeTokens } from "../src/analyzers/codeTokens";
import type { CodeTokenParserWarning } from "../src/types";

const FIXTURE_ROOT = path.resolve(__dirname, "fixtures");

describe("cssVariables 파서", () => {
  it(":root 커스텀 프로퍼티 수집 (참조 var(...) 는 이름으로 오집계 X)", async () => {
    const tokens = await loadCodeTokens(
      [{ type: "cssVariables", files: ["styles/tokens.css"] }],
      FIXTURE_ROOT,
      []
    );
    const names = tokens.map((t) => t.name);
    expect(names).toContain("--color-primary-500");
    expect(names).toContain("--spacing-md");
    // 정의 4개 — var(--color-primary-500) 참조가 별도 이름을 만들지 않음
    expect(names).toHaveLength(4);
    const alias = tokens.find((t) => t.name === "--alias-primary")!;
    expect(alias.value).toBe("var(--color-primary-500)");
  });

  it("존재하지 않는 파일은 file_not_found warning", async () => {
    const warnings: CodeTokenParserWarning[] = [];
    await loadCodeTokens(
      [{ type: "cssVariables", files: ["styles/nope.css"] }],
      FIXTURE_ROOT,
      [],
      warnings
    );
    expect(warnings).toEqual([
      { parser: "cssVariables", path: "styles/nope.css", issue: "file_not_found" },
    ]);
  });
});

describe("scss 파서", () => {
  it("커스텀 프로퍼티 + 맵/@each 동적 emit 수집", async () => {
    const tokens = await loadCodeTokens(
      [{ type: "scss", files: ["styles/tokens.scss"] }],
      FIXTURE_ROOT,
      []
    );
    const names = tokens.map((t) => t.name);
    expect(names).toContain("--point-color-0");
    expect(names).toContain("--point-color-1");
    // @each 로 emit 되는 맵 키
    expect(names).toContain("--gray-100");
    expect(names).toContain("--gray-900");
  });

  it("glob 패턴 확장", async () => {
    const tokens = await loadCodeTokens(
      [{ type: "scss", files: ["styles/*.scss"] }],
      FIXTURE_ROOT,
      []
    );
    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe("tailwind 파서", () => {
  it("theme.extend 를 dot-path 로 flatten", async () => {
    const tokens = await loadCodeTokens(
      [{ type: "tailwind", config: "styles/tailwind.config.js" }],
      FIXTURE_ROOT,
      []
    );
    const names = tokens.map((t) => t.name);
    expect(names).toContain("colors.primary.500");
    expect(names).toContain("colors.primary.900");
    expect(names).toContain("colors.surface");
    expect(names).toContain("spacing.md");
  });

  // 0.9.0 — presets 병합 + 함수형 카테고리 stub + fontSize tuple sub-token.
  it("presets 배열의 theme 병합 (사용자 config 가 우선)", async () => {
    const tokens = await loadCodeTokens(
      [{ type: "tailwind", config: "styles/tailwind.config.advanced.js" }],
      FIXTURE_ROOT,
      []
    );
    const byName = new Map(tokens.map((t) => [t.name, t.value]));
    // preset 에만 있는 토큰
    expect(byName.get("colors.brand")).toBe("#ff0000");
    // preset + 사용자 config 겹침 — 사용자 값 우선
    expect(byName.get("colors.primary.500")).toBe("#6c91f5");
  });

  it("함수형 카테고리 — theme helper stub 으로 호출", async () => {
    const tokens = await loadCodeTokens(
      [{ type: "tailwind", config: "styles/tailwind.config.advanced.js" }],
      FIXTURE_ROOT,
      []
    );
    const byName = new Map(tokens.map((t) => [t.name, t.value]));
    // theme("colors.white", "#ffffff") → 두 번째 인자 (기본값) 반환
    expect(byName.get("colors.surface")).toBe("#ffffff");
  });

  it("fontSize tuple — 첫 요소 + 2번째 객체 sub-token", async () => {
    const tokens = await loadCodeTokens(
      [{ type: "tailwind", config: "styles/tailwind.config.advanced.js", categories: ["fontSize"] }],
      FIXTURE_ROOT,
      []
    );
    const byName = new Map(tokens.map((t) => [t.name, t.value]));
    expect(byName.get("fontSize.xl")).toBe("1.25rem");
    expect(byName.get("fontSize.xl.lineHeight")).toBe("1.75rem");
  });
});

describe("loadCodeTokens 로더", () => {
  it("파서 간 같은 이름은 첫 등장만 유지 (dedup)", async () => {
    const tokens = await loadCodeTokens(
      [
        { type: "cssVariables", files: ["styles/tokens.css"] },
        { type: "cssVariables", files: ["styles/tokens.css"] },
      ],
      FIXTURE_ROOT,
      []
    );
    const names = tokens.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("미등록 파서 type 은 warning + skip", async () => {
    const warnings: string[] = [];
    const tokens = await loadCodeTokens(
      [{ type: "unknown-type" } as never],
      FIXTURE_ROOT,
      warnings
    );
    expect(tokens).toEqual([]);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("unknown-type");
  });
});
