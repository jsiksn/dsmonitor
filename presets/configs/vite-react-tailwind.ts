/**
 * 예시 config — Vite + React + Tailwind 정식 + 순수 TypeScript.
 *
 * 특징:
 * - Tailwind가 정식, Bootstrap/SCSS가 레거시
 * - 순수 TS → tsMigration 지표 OFF
 * - src/components 하위에 DS (components/ui)
 * - 빌드 설정은 vite.config.ts
 */

import type { UIHealthConfig } from "../../../src/types";
import type { StylingPolicy } from "../../../src/policy";

const stylingPolicy: StylingPolicy = {
  allowed: [
    {
      id: "tailwind",
      label: "Tailwind utility classes",
      detect: {
        classPatterns: [
          /^(?:text|bg|border)-(?:slate|gray|red|blue|green|yellow)-(?:100|200|300|400|500|600|700|800|900)$/,
          /^(?:flex|grid|items-\w+|justify-\w+)$/,
          /^(?:m|p|mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py)-\d+$/,
        ],
      },
    },
  ],
  preferred: "tailwind",
  forbidden: [
    {
      id: "bootstrap-utilities",
      label: "Bootstrap utility classes",
      severity: "error",
      classPatterns: [
        /^d-(?:none|inline|inline-block|block|flex|inline-flex|grid)$/,
        /^justify-content-\w+$/,
        /^btn(?:-\w+)?$/,
        /^col(?:-(?:sm|md|lg|xl|xxl))?(?:-(?:auto|\d{1,2}))?$/,
        /^row$/,
      ],
      importModules: ["reactstrap", "react-bootstrap", "bootstrap"],
    },
    {
      id: "scss-imports",
      label: "SCSS/Sass imports (legacy)",
      severity: "warn",
      classPatterns: [],
    },
  ],
};

const config: UIHealthConfig = {
  projectRoot: "../..",
  framework: { id: "react" },
  stylingPolicy,

  scan: {
    codeRoots: ["src"],
    styleRoots: ["src/styles"],
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.d.ts",
      "**/vite.config.*",
    ],
    codeExts: [".ts", ".tsx"], // 순수 TS
    styleExts: [".css"], // Tailwind + 간단한 CSS만
  },

  designSystem: {
    officialPaths: ["src/components/ui"],
    officialAliases: ["@/components/ui/", "~/components/ui/"],
    componentExts: [".tsx"],
  },

  hardcodedValues: {
    colorPatterns: [
      /#[0-9a-fA-F]{3,8}\b/g,
      /\brgba?\s*\([^)]*\)/g,
    ],
    scssVariableUsagePatterns: [/\bvar\s*\(\s*--[\w-]+/g],
    scssVariableDefFiles: [], // SCSS 없음
  },

  migrationTargets: {
    Button: { aliases: ["@/components/ui/button"], nativeTags: ["button"] },
    Input: { aliases: ["@/components/ui/input"], nativeTags: ["input"] },
    Select: { aliases: ["@/components/ui/select"], nativeTags: ["select"] },
  },
  migrationMinClassLength: 2,

  metrics: {
    tsMigration: false, // 순수 TS 프로젝트
    dsCoverage: true,
    migrationCandidates: true,
    stylingDistribution: true,
    hardcodedColors: true,
    scssVariableCompliance: false, // SCSS 없음
  },

  thresholds: {
    dsCoverage: { good: 0.8, warn: 0.5, direction: "higher" },
    tsMigration: { good: 0.7, warn: 0.3, direction: "higher" },
    scssVariableCompliance: { good: 0.9, warn: 0.7, direction: "higher" },
    preferredCompliance: { good: 0.8, warn: 0.5, direction: "higher" },
    hardcodedColors: { good: 10, warn: 30, direction: "lower" },
    forbiddenClassOccurrences: { good: 0, warn: 20, direction: "lower" },
    // Tailwind 정식 프로젝트 — Bootstrap 유입은 더 엄격하게
    forbiddenFileRatio: { good: 0.05, warn: 0.2, direction: "lower" },
  },

  report: { outputDir: "./reports", baselineFilenamePrefix: "baseline" },
  softBaseline: { path: "./.lint-baseline.json" },
};

export default config;
