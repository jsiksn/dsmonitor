/**
 * 예시 config — Next.js (App Router) + CSS Modules + 순수 TypeScript.
 *
 * 특징:
 * - App Router → `app/` 디렉토리 구조
 * - `*.module.css` / `*.module.scss` 가 정식
 * - Bootstrap/Tailwind 모두 금지
 * - 순수 TS → tsMigration OFF
 */

import type { UIHealthConfig } from "../../../src/types";
import type { StylingPolicy } from "../../../src/policy";

const stylingPolicy: StylingPolicy = {
  allowed: [
    {
      id: "css-modules",
      label: "CSS / SCSS Modules",
      detect: {
        importPathPatterns: [/\.module\.(s?css|sass)$/i],
      },
    },
  ],
  preferred: "css-modules",
  forbidden: [
    {
      id: "bootstrap-utilities",
      label: "Bootstrap utility classes",
      severity: "error",
      classPatterns: [
        /^d-(?:none|inline|inline-block|block|flex|inline-flex|grid)$/,
        /^(?:m|p|mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py)-(?:[0-5]|auto)$/,
        /^justify-content-\w+$/,
        /^btn(?:-\w+)?$/,
        /^col(?:-(?:sm|md|lg|xl|xxl))?(?:-(?:auto|\d{1,2}))?$/,
      ],
      importModules: ["reactstrap", "react-bootstrap", "bootstrap"],
    },
    {
      id: "tailwind-classes",
      label: "Tailwind utility classes",
      severity: "error",
      classPatterns: [
        /^(?:text|bg|border)-(?:slate|gray|red|blue|green|yellow)-(?:100|200|300|400|500|600|700|800|900)$/,
        /^items-(?:start|end|center|baseline|stretch)$/,
        /^text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl)$/,
        /^rounded-(?:sm|md|lg|xl|2xl|full)$/,
      ],
    },
    {
      id: "global-styles",
      label: "Non-module CSS imports (prefer .module.css)",
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
    codeRoots: ["app", "components", "lib", "hooks"],
    styleRoots: ["app", "styles"],
    ignore: [
      "**/node_modules/**",
      "**/.next/**",
      "**/*.d.ts",
      "**/next-env.d.ts",
      "**/app/api/**",
    ],
    codeExts: [".ts", ".tsx"],
    styleExts: [".css", ".scss"],
  },

  designSystem: {
    officialPaths: ["components/ui"],
    officialAliases: ["@/components/ui/", "~/components/ui/"],
    componentExts: [".tsx"],
  },

  hardcodedValues: {
    colorPatterns: [
      /#[0-9a-fA-F]{3,8}\b/g,
      /\brgba?\s*\([^)]*\)/g,
    ],
    scssVariableUsagePatterns: [/\bvar\s*\(\s*--[\w-]+/g, /\$[\w-]+/g],
    scssVariableDefFiles: ["styles/tokens.scss", "styles/variables.scss"],
  },

  migrationTargets: {
    Button: { aliases: ["@/components/ui/button"], nativeTags: ["button"] },
    Input: { aliases: ["@/components/ui/input"], nativeTags: ["input"] },
    Select: { aliases: ["@/components/ui/select"], nativeTags: ["select"] },
    Table: { aliases: ["@/components/ui/table"], nativeTags: ["table"] },
  },
  migrationMinClassLength: 2,

  metrics: {
    tsMigration: false, // 순수 TS
    dsCoverage: true,
    migrationCandidates: true,
    stylingDistribution: true,
    hardcodedColors: true,
    scssVariableCompliance: true,
  },

  thresholds: {
    dsCoverage: { good: 0.9, warn: 0.6, direction: "higher" },
    tsMigration: { good: 0.7, warn: 0.3, direction: "higher" },
    scssVariableCompliance: { good: 0.9, warn: 0.7, direction: "higher" },
    preferredCompliance: { good: 0.9, warn: 0.6, direction: "higher" },
    hardcodedColors: { good: 10, warn: 30, direction: "lower" },
    forbiddenClassOccurrences: { good: 0, warn: 20, direction: "lower" },
    // CSS Modules는 파일 단위로 격리되어 레거시 유입이 적어야 함 — 가장 엄격
    forbiddenFileRatio: { good: 0.05, warn: 0.15, direction: "lower" },
  },

  report: { outputDir: "./reports", baselineFilenamePrefix: "baseline" },
  softBaseline: { path: "./.lint-baseline.json" },
};

export default config;
