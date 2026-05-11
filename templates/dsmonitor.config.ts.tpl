/**
 * dsmonitor 설정 — 본 파일은 `dsmonitor init` 안 자동 생성됨 (v0.1.0).
 *
 * 자세한 안내:
 *   - 패키지 안내 — node_modules/dsmonitor/README.md
 *   - figma config 가이드 — node_modules/dsmonitor/docs/figma-config-guide.md
 *   - 사이드카 plugin 가이드 — node_modules/dsmonitor/docs/plugin-development.md
 */

import type { UIHealthConfig } from "dsmonitor";

const config: UIHealthConfig = {
  projectRoot: ".",

  // ────── 프로젝트 이름 (선택) ──────
  // dashboard header / footer 안 표시. 미지정 시 = `package.json` 안
  // `name` 자동 read. 둘 다 없는 시점 = "Unknown Project".
  // projectName: "MyProject",

  // ────── 스타일링 정책 ──────
  // 4종 preset 중 골라 require:
  //   - dsmonitor/presets/scss-project       (SCSS 기반)
  //   - dsmonitor/presets/bootstrap-project  (Bootstrap)
  //   - dsmonitor/presets/tailwind-project   (Tailwind)
  //   - dsmonitor/presets/css-modules-project (CSS Modules)
  stylingPolicy: require("dsmonitor/presets/scss-project"),

  // ────── 분석 대상 ──────
  scan: {
    codeRoots: ["src", "components", "pages", "app"],
    styleRoots: ["src", "styles"],
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    codeExts: [".ts", ".tsx", ".js", ".jsx"],
    styleExts: [".scss", ".css"],
  },

  // ────── 글로벌 스타일 출처 ──────
  globalStyleSources: ["styles/**/*.{scss,css}"],

  // ────── DS 부분 ──────
  // componentExts: 컴포넌트 파일 판정 핵심 (cli.js 안 isComponentFile 일치)
  designSystem: {
    officialPaths: ["src/components/ds/**"],
    officialAliases: ["@ds/*"],
    componentExts: [".tsx", ".jsx"],
  },

  // ────── 하드코딩 색상 ──────
  // 정보 형식 핵심: 모두 RegExp 배열 (cli.js 안 countMatches 일치).
  // - colorPatterns: SCSS/CSS 하드코딩 색상 탐지 패턴.
  // - scssVariableUsagePatterns: 변수 참조 탐지 (CSS var() + SCSS $).
  // - scssVariableDefFiles: 하드코딩 검출에서 제외할 변수 정의 원본 파일 경로.
  hardcodedValues: {
    colorPatterns: [
      /#[0-9a-fA-F]{3,8}\b/g,
      /\brgba?\s*\([^)]*\)/g,
      /\bhsla?\s*\([^)]*\)/g,
    ],
    scssVariableUsagePatterns: [
      /\bvar\s*\(\s*--[\w-]+/g,
      /\$[\w-]+/g,
    ],
    scssVariableDefFiles: [],
  },

  // ────── 마이그레이션 대상 ──────
  // 형식 핵심: Record<string, { aliases: string[]; nativeTags: string[] }>
  // 예) Button: { aliases: ["@atoms/Button"], nativeTags: ["button"] }
  migrationTargets: {
    // TODO: 본 프로젝트 안 마이그레이션 대상 컴포넌트 추가
  },

  // ────── 마이그레이션 후보 안 최소 className 길이 ──────
  // 본 길이 미만 className = 후보 식별 안 됨 (noise 감소).
  migrationMinClassLength: 3,

  // ────── 프레임워크 ──────
  // analyzeCodebase 안 framework adapter 결정 — id 누락 시점에 throw.
  // 지원: "react" / 다른 framework 추가 시점에 본 항목 변경.
  framework: {
    id: "react",
  },

  // ────── 측정 부분 토글 ──────
  // 본 프로젝트 상황에 맞춰 false 결정 가능 (예: 순수 TS 프로젝트 안 tsMigration: false).
  metrics: {
    tsMigration: true,
    dsCoverage: true,
    migrationCandidates: true,
    stylingDistribution: true,
    hardcodedColors: true,
    scssVariableCompliance: true,
    figmaAnalysis: {{FIGMA_METRIC}},
  },

  // ────── figma 부분 ──────
  {{FIGMA_BLOCK}}

  // ────── lighthouse 부분 ──────
  {{LIGHTHOUSE_BLOCK}}

  // ────── 임계 ──────
  // 정보 형식 핵심: Threshold = { good: number; warn: number; direction: "higher" | "lower" }
  // - direction: "higher" — 값 높을수록 좋음 (good ≥, warn ≥)
  // - direction: "lower" — 값 낮을수록 좋음 (good ≤, warn ≤)
  thresholds: {
    dsCoverage: { good: 0.8, warn: 0.5, direction: "higher" },
    tsMigration: { good: 0.7, warn: 0.3, direction: "higher" },
    scssVariableCompliance: { good: 0.9, warn: 0.7, direction: "higher" },
    preferredCompliance: { good: 0.8, warn: 0.5, direction: "higher" },
    hardcodedColors: { good: 20, warn: 50, direction: "lower" },
    forbiddenClassOccurrences: { good: 100, warn: 500, direction: "lower" },
    forbiddenFileRatio: { good: 0.1, warn: 0.3, direction: "lower" },
  },

  // ────── 리포트 출력 ──────
  report: {
    outputDir: "reports",
    baselineFilenamePrefix: "baseline-",
  },

  // ────── Phase 진척 ──────
  reportStatus: {
    completedPhases: [],
  },

  // ────── 측정 도구 자체 변경 이력 ──────
  // 본 필드는 `dsmonitor init` 안 빈 배열로 시작. 측정 정의 변경 시점에 추가 entry.
  // 사용 예시 (역순 정렬 — 최신 entry 가 첫 row):
  //
  //   measurementHistory: [
  //     {
  //       version: "v0.3.0",
  //       date: "2026-05-11",
  //       summary: "통합 측정 chain (audit --all) 도입.",
  //       notes: [
  //         "code + figma + Lighthouse + report + dashboard 자동 chain.",
  //         "--skip-lighthouse flag 활용 시 빠른 측정 (~1-2분).",
  //       ],
  //     },
  //   ],
  measurementHistory: [],
};

export default config;
