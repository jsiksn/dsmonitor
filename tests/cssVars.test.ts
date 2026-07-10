/**
 * CSS 변수 선언 스캔 보강 (0.9.0 — 7c).
 *
 * 옛 한계: 주석 안 선언 오집계 / 마지막 선언 세미콜론 생략 미매치 /
 * 세미콜론 없이 `}` 를 넘어 다음 rule 까지 값이 이어지는 케이스.
 */
import { describe, expect, it } from "vitest";
import { scanCssVarDecls } from "../src/utils/cssVars";

describe("scanCssVarDecls (0.9.0 보강)", () => {
  it("기본 선언 수집 + var() 참조 배제 — 옛 동작 그대로", () => {
    const decls = scanCssVarDecls(`:root { --a: #fff; --b: var(--a); }`);
    expect(decls.map((d) => d.name)).toEqual(["--a", "--b"]);
    expect(decls[1].value).toBe("var(--a)");
  });

  it("블록 주석 안 선언은 오집계하지 않음", () => {
    const decls = scanCssVarDecls(`/* --fake: red; */ :root { --real: blue; }`);
    expect(decls.map((d) => d.name)).toEqual(["--real"]);
  });

  it("SCSS 라인 주석 안 선언은 오집계하지 않음", () => {
    const decls = scanCssVarDecls(`// --fake: red;\n:root { --real: blue; }`);
    expect(decls.map((d) => d.name)).toEqual(["--real"]);
  });

  it("마지막 선언 세미콜론 생략 허용", () => {
    const decls = scanCssVarDecls(`:root { --a: 1px; --last: 2px }`);
    expect(decls.map((d) => d.name)).toEqual(["--a", "--last"]);
    expect(decls[1].value).toBe("2px");
  });

  it("세미콜론 누락 값이 `}` 를 넘어 다음 rule 로 번지지 않음", () => {
    const decls = scanCssVarDecls(`:root { --a: red }\n.x { --b: blue; }`);
    expect(decls.map((d) => d.name)).toEqual(["--a", "--b"]);
    expect(decls[0].value).toBe("red");
  });

  it("주석 제거 후에도 줄 번호 offset 보존", () => {
    const content = `/* 헤더\n주석 */\n:root {\n  --x: 1;\n}`;
    const decls = scanCssVarDecls(content);
    expect(decls).toHaveLength(1);
    // offset 위치가 원본 문자열의 --x 위치와 일치 (줄 4)
    expect(content.slice(decls[0].offset, decls[0].offset + 3)).toBe("--x");
  });
});
