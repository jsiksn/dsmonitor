/**
 * 예시 config — 현재 프로젝트(portal-gateway-web):
 * - Next.js 13 (Pages Router)
 * - SCSS 정식, Bootstrap/Tailwind 레거시
 * - TypeScript 점진 마이그레이션 중 (JS/TS 혼용)
 * - Module Federation으로 atoms/molecules/organisms/templates 노출
 *
 * 루트 `dsmonitor/dsmonitor.config.ts` 와 동일 구조(참고용 스냅샷).
 */

import type { UIHealthConfig } from "../../../src/types";
import type { StylingPolicy } from "../../../src/policy";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stylingPolicy = require("../../../stylingPolicy") as StylingPolicy;

const config: UIHealthConfig = {
  projectRoot: "../..",
  framework: { id: "react" },
  stylingPolicy,

  scan: {
    codeRoots: [
      "pages",
      "components",
      "apps",
      "hooks",
      "queries",
      "store",
      "utils",
      "api",
      "interfaces",
    ],
    styleRoots: ["styles/css/scss", "styles/css/labeling.css"],
    ignore: [
      "**/node_modules/**",
      "**/.next/**",
      "**/libs/**",
      "**/styles/lib/**",
      "**/dsmonitor/**",
      "**/public/**",
      "**/dist/**",
      "**/*.d.ts",
      "**/copy.js",
      "**/next-env.d.ts",
      "**/pages/api/**",
    ],
    codeExts: [".ts", ".tsx", ".js", ".jsx"],
    styleExts: [".scss", ".sass", ".css"],
  },

  designSystem: {
    officialPaths: [
      "components/atoms",
      "components/molecules",
      "components/organisms",
      "components/templates",
    ],
    officialAliases: ["@atoms/", "@molecules/", "@organisms/", "@templates/"],
    componentExts: [".tsx", ".jsx"],
  },

  hardcodedValues: {
    colorPatterns: [
      /#[0-9a-fA-F]{3,8}\b/g,
      /\brgba?\s*\([^)]*\)/g,
      /\bhsla?\s*\([^)]*\)/g,
    ],
    scssVariableUsagePatterns: [/\bvar\s*\(\s*--[\w-]+/g, /\$[\w-]+/g],
    scssVariableDefFiles: [
      "styles/css/scss/setting.scss",
      "styles/css/scss/library.scss",
      "styles/css/scss/preprocess.scss",
    ],
  },

  migrationTargets: {
    Button: { aliases: ["@atoms/Button"], nativeTags: ["button"] },
    Input: { aliases: ["@atoms/Input"], nativeTags: ["input"] },
    Select: { aliases: ["@atoms/Select"], nativeTags: ["select"] },
    Table: {
      aliases: ["@molecules/Table", "@organisms/CheckableTable"],
      nativeTags: ["table"],
    },
    Progress: { aliases: ["@atoms/Progress"], nativeTags: ["progress"] },
    Switch: { aliases: ["@atoms/Switch"], nativeTags: [] },
  },
  migrationMinClassLength: 2,

  metrics: {
    tsMigration: true,
    dsCoverage: true,
    migrationCandidates: true,
    stylingDistribution: true,
    hardcodedColors: true,
    scssVariableCompliance: true,
  },

  thresholds: {
    dsCoverage: { good: 0.8, warn: 0.5, direction: "higher" },
    tsMigration: { good: 0.7, warn: 0.3, direction: "higher" },
    scssVariableCompliance: { good: 0.9, warn: 0.7, direction: "higher" },
    preferredCompliance: { good: 0.8, warn: 0.5, direction: "higher" },
    hardcodedColors: { good: 20, warn: 50, direction: "lower" },
    forbiddenClassOccurrences: { good: 100, warn: 500, direction: "lower" },
    forbiddenFileRatio: { good: 0.1, warn: 0.3, direction: "lower" },
  },

  report: { outputDir: "./reports", baselineFilenamePrefix: "baseline" },
  softBaseline: { path: "./.lint-baseline.json" },
};

export default config;
