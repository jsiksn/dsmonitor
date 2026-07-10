/**
 * 대시보드 jsx 문법 검사 (F-0, 0.8.10).
 *
 * 대시보드 컴포넌트는 브라우저 Babel 로 런타임 변환되어 빌드/타입체크가 문법을
 * 잡아주지 않음 — esbuild parse 를 상시 테스트로 편입 (0.8.8 검증 때 수동으로
 * 하던 것을 자동화).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { transform } from "esbuild";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = path.resolve(__dirname, "../src/dashboard/components");
const jsxFiles = readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith(".jsx"));

describe("dashboard jsx 문법", () => {
  it("컴포넌트 5종이 모두 존재", () => {
    expect(jsxFiles.sort()).toEqual([
      "code-tab.jsx",
      "figma-tab.jsx",
      "lighthouse-tab.jsx",
      "plugin-tab.jsx",
      "root.jsx",
    ]);
  });

  for (const file of jsxFiles) {
    it(`${file} — esbuild jsx parse 통과`, async () => {
      const source = readFileSync(path.join(COMPONENTS_DIR, file), "utf8");
      await expect(transform(source, { loader: "jsx" })).resolves.toBeTruthy();
    });
  }
});
