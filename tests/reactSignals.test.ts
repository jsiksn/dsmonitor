/**
 * react 어댑터 className 수집 정밀화 (0.9.0 — 7b).
 *
 * 옛 흐름: className={...} 표현식 안 모든 문자열 리터럴을 무차별 수집 —
 * i18n 호출 (`t("common.title")`) / 비교 문자열 (`cond === "active"`) 이
 * 클래스 토큰으로 오집계되어 고아 클래스 / 금지 카운트를 부풀림.
 */
import { describe, expect, it } from "vitest";
import { reactAdapter } from "../src/frameworks/react";

function classNamesOf(source: string): string[] {
  const parsed = reactAdapter.parse(source, "test.tsx");
  const signals = reactAdapter.extractSignals(parsed);
  // 토큰 단위 비교를 위해 공백 join 후 split.
  return signals.classNames.flatMap((s) => s.split(/\s+/)).filter(Boolean);
}

describe("className 문자열 수집 (0.9.0 정밀화)", () => {
  it("plain 문자열 — 옛 동작 그대로", () => {
    expect(classNamesOf(`export const A = () => <div className="btn btn-lg" />;`))
      .toEqual(["btn", "btn-lg"]);
  });

  it("클래스 유틸 호출 (clsx/cn 등) 인자는 수집", () => {
    const out = classNamesOf(
      `export const A = ({open}) => <div className={clsx("btn", open && "btn-active", {"is-open": open})} />;`
    );
    expect(out).toContain("btn");
    expect(out).toContain("btn-active");
    expect(out).toContain("is-open");
  });

  it("클래스 유틸이 아닌 호출 (i18n t() 등) 인자는 제외", () => {
    const out = classNamesOf(
      `export const A = () => <div className={t("common.title")} />;`
    );
    expect(out).toEqual([]);
  });

  it("삼항 조건 — 결과 가지 수집, 비교 문자열 제외", () => {
    const out = classNamesOf(
      `export const A = ({s}) => <div className={s === "active" ? "text-red" : "text-gray"} />;`
    );
    expect(out).toContain("text-red");
    expect(out).toContain("text-gray");
    expect(out).not.toContain("active");
  });

  it("문자열 연결 (+) 은 수집", () => {
    expect(classNamesOf(`export const A = () => <div className={"a " + "b"} />;`))
      .toEqual(["a", "b"]);
  });

  it("computed member (CSS modules 키) 는 수집", () => {
    expect(classNamesOf(`export const A = () => <div className={styles["card"]} />;`))
      .toEqual(["card"]);
  });

  it("template literal — 고정 부분 + 조건 가지 수집", () => {
    const out = classNamesOf(
      "export const A = ({on}) => <div className={`btn ${on ? \"on\" : \"off\"}`} />;"
    );
    expect(out).toContain("btn");
    expect(out).toContain("on");
    expect(out).toContain("off");
  });
});
