/**
 * scss-imports 매트릭스 연계 (0.10.0 — roadmap 이월분).
 *
 * 핵심 방침: "SCSS import = 금지" 가 아니라 import 된 파일의 클래스 분류에 연동.
 *   - 금지 분류 (applyMixed / pureCss) 포함 → 레거시
 *   - 전부 pure-@apply / 클래스 없음 (변수·믹스인 전용) → 정상
 *   - 해석 실패 → 미집계 (오검출 방지)
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeCodebase } from "../src/analyzers/codebase";
import {
  createStyleFileClassifier,
  isLegacyStyleFile,
  resolveStyleImport,
} from "../src/analyzers/scssImportLink";
// preset 은 CJS(JS) — 선언 파일이 없어 테스트 한정으로 require 로 로드.
import { createRequire } from "node:module";
import type { UIHealthConfig } from "../src/types";
const require = createRequire(import.meta.url);
const tailwindPreset = require("../presets/tailwind-project.js") as UIHealthConfig["stylingPolicy"];

const SAMPLE = path.resolve(__dirname, "fixtures/sample-project");
const STYLES = path.join(SAMPLE, "src/styles");
const COMPONENTS = path.join(SAMPLE, "src/components");

describe("resolveStyleImport", () => {
  it("상대 경로 + 확장자", () => {
    expect(resolveStyleImport("../styles/legacy.scss", COMPONENTS, SAMPLE))
      .toBe(path.join(STYLES, "legacy.scss"));
  });

  it("상대 경로 + 확장자 생략", () => {
    expect(resolveStyleImport("../styles/legacy", COMPONENTS, SAMPLE))
      .toBe(path.join(STYLES, "legacy.scss"));
  });

  it("@/ 별칭 → src/ 매핑", () => {
    expect(resolveStyleImport("@/styles/legacy.scss", COMPONENTS, SAMPLE))
      .toBe(path.join(STYLES, "legacy.scss"));
  });

  it("npm 패키지명은 null (미집계)", () => {
    expect(resolveStyleImport("bootstrap", COMPONENTS, SAMPLE)).toBeNull();
    expect(resolveStyleImport("@scope/pkg", COMPONENTS, SAMPLE)).toBeNull();
  });

  it("미발견 경로는 null", () => {
    expect(resolveStyleImport("./nope.scss", COMPONENTS, SAMPLE)).toBeNull();
  });
});

describe("createStyleFileClassifier + isLegacyStyleFile", () => {
  const classify = createStyleFileClassifier();

  it("raw CSS 클래스 파일 → 레거시", () => {
    const s = classify(path.join(STYLES, "legacy.scss"))!;
    expect(s.pureCss).toBeGreaterThan(0);
    expect(isLegacyStyleFile(s)).toBe(true);
  });

  it("pure-@apply wrapper 파일 → 정상", () => {
    const s = classify(path.join(STYLES, "wrapper.scss"))!;
    expect(s.pureApply).toBeGreaterThan(0);
    expect(s.applyMixed + s.pureCss).toBe(0);
    expect(isLegacyStyleFile(s)).toBe(false);
  });

  it("변수 전용 파일 (클래스 0개) → 정상", () => {
    const s = classify(path.join(STYLES, "tokens-only.scss"))!;
    expect(s.pureApply + s.applyMixed + s.pureCss).toBe(0);
    expect(isLegacyStyleFile(s)).toBe(false);
  });

  it("없는 파일 → null", () => {
    expect(classify(path.join(STYLES, "missing.scss"))).toBeNull();
  });
});

// ───── 통합: 샘플 프로젝트 전체 측정 ─────────────────────────────────

function sampleCfg(): UIHealthConfig & { __absRoot: string } {
  return {
    projectName: "sample-project",
    framework: { id: "react" },
    scan: {
      codeRoots: ["src"],
      styleRoots: ["src/styles"],
      codeExts: [".tsx", ".ts", ".jsx", ".js"],
      styleExts: [".scss", ".css"],
      ignore: [],
    },
    globalStyleSources: ["src/styles/globals.scss"],
    hardcodedValues: {
      colorPatterns: [/#[0-9a-fA-F]{3,8}\b/g],
      scssVariableUsagePatterns: [/var\(--[\w-]+\)/g, /\$[\w-]+/g],
      scssVariableDefFiles: ["src/styles/globals.scss"],
    },
    designSystem: {
      officialPaths: [],
      officialAliases: [],
      componentExts: [".tsx"],
    },
    stylingPolicy: tailwindPreset,
    migrationTargets: {},
    migrationMinClassLength: 2,
    metrics: {
      hardcodedColors: true,
      scssVariableCompliance: true,
      stylingDistribution: true,
      tsMigration: true,
      dsCoverage: true,
      migrationCandidates: true,
    },
    thresholds: {
      dsCoverage: { good: 0.8, warn: 0.5, direction: "higher" },
      tsMigration: { good: 0.9, warn: 0.5, direction: "higher" },
      scssVariableCompliance: { good: 0.9, warn: 0.7, direction: "higher" },
      preferredCompliance: { good: 0.8, warn: 0.5, direction: "higher" },
      hardcodedColors: { good: 20, warn: 50, direction: "lower" },
      forbiddenClassOccurrences: { good: 100, warn: 500, direction: "lower" },
      forbiddenFileRatio: { good: 0.1, warn: 0.3, direction: "lower" },
    },
    report: { outputDir: "reports", baselineFilenamePrefix: "baseline-" },
    __absRoot: SAMPLE,
  } as unknown as UIHealthConfig & { __absRoot: string };
}

describe("analyzeCodebase — scss-imports 연계 통합 (sample-project)", () => {
  it("레거시 import 2건 (상대 + @/ 별칭) 만 카운트, wrapper·변수 전용은 미집계", async () => {
    const { report } = await analyzeCodebase(sampleCfg());
    // occurrence: LegacyImporter(상대) + AliasImporter(@/) = 2
    expect(report.forbiddenClassCount.byId["scss-imports"]).toBe(2);
    // 파일 수: 2 (WrapperImporter / TokensImporter 는 0)
    expect(report.stylingMethodDistribution.forbidden["scss-imports"]).toBe(2);
    // 기존 항목은 이번 연계와 무관하게 유지 (Bootstrapish 1파일 3건)
    expect(report.forbiddenClassCount.byId["bootstrap-utilities"]).toBe(3);
    expect(report.stylingMethodDistribution.forbidden["bootstrap-utilities"]).toBe(1);
    // perFile 검증 — 어떤 파일이 잡혔는지
    const files = report.forbiddenClassCount.topFiles
      .filter((f) => f.byId["scss-imports"])
      .map((f) => f.file)
      .sort();
    expect(files).toEqual([
      "src/components/AliasImporter.tsx",
      "src/components/LegacyImporter.tsx",
    ]);
  });
});
