/**
 * dsmonitor 설정 — 본 파일은 `dsmonitor init` 안 자동 생성됨 (v0.1.0).
 *
 * 상세 안내:
 *   - 패키지 안내 — node_modules/dsmonitor/README.md
 *   - figma config 가이드 — node_modules/dsmonitor/docs/figma-config-guide.md
 *   - 사이드카 plugin 가이드 — node_modules/dsmonitor/docs/plugin-development.md
 */

import type { UIHealthConfig } from "dsmonitor";

const config: UIHealthConfig = {
  // ".." = dsmonitor/ 폴더 한 단계 위 (실제 프로젝트 root). 본 흐름 = dsmonitor init
  // 자체가 dsmonitor/ sub-folder 부트스트랩 진입 = 측정 대상 root = parent 폴더.
  // 옛 default "." 그대로 활용 시점 = dsmonitor/ 자체 안 측정 진입 (의미 X 결과).
  projectRoot: "..",

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
  //
  // 의미:
  //   프로젝트의 사용자 정의 컴포넌트와 native HTML 태그를 매칭해 두는 표입니다.
  //   dsmonitor 는 이 표를 활용해 "native 태그가 그대로 쓰이는 자리" 가운데
  //   DS 컴포넌트로 마이그레이션할 후보를 추출합니다.
  //
  // 형식: Record<ComponentName, { aliases: string[]; nativeTags: string[] }>
  //   - key (ComponentName)
  //       리포트와 대시보드에 표시되는 컴포넌트 이름입니다.
  //       보통 DS 컴포넌트 파일명 또는 named import 이름과 동일하게 적습니다.
  //   - aliases: string[]
  //       해당 컴포넌트의 import 경로 또는 그 prefix 입니다.
  //       옛 prefix 매칭 흐름이므로 barrel import 안의 named import 는
  //       정확히 검출되지 않을 수 있습니다 (0.6.0 에서 named import 분석 예정).
  //   - nativeTags: string[]
  //       같은 컴포넌트로 대체 가능한 native HTML 태그 이름입니다.
  //       JSX/TSX 안에서 발견된 native 태그가 마이그레이션 후보로 잡힙니다.
  //
  // 예시 (필요한 항목만 골라 작성하면 됩니다):
  migrationTargets: {
    // Button: {
    //   aliases: ["@/components/ds/Button"],
    //   nativeTags: ["button"],
    // },
    // Input: {
    //   aliases: ["@/components/ds/Input"],
    //   nativeTags: ["input"],
    // },
  },

  // ────── 마이그레이션 후보의 최소 className 길이 ──────
  // 이 길이 미만의 className 은 후보에서 제외됩니다 (noise 감소).
  // 예) 3 으로 두면 `btn`, `nav` 같은 짧은 클래스는 후보에 포함되고,
  //     4 로 올리면 더 보수적으로 줄어듭니다.
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
  //       version: "v0.3.2",
  //       date: "2026-05-11",
  //       summary: "README export-migration sub-section 신규 추가 (docs only patch).",
  //       notes: [
  //         "동작 / --frame / --ds flag 사양 / 사전 준비 / 출력 CSV 상세 / figmaUrl 자동 조립 / 활용 시점 안내.",
  //         "코드 변경 0건 (cli.ts / analyzers / reporters / templates 모두 옛 동작 일관 유지).",
  //       ],
  //     },
  //     {
  //       version: "v0.3.1",
  //       date: "2026-05-11",
  //       summary: "--only lighthouse flag 추가 (옛 --only code / --only figma 일관 확장).",
  //       notes: [
  //         "Lighthouse 측정 단독 호출 — npx dsmonitor audit --only lighthouse.",
  //         "옛 node node_modules/dsmonitor/lighthouse/run.js 단독 호출 흐름 일관 (사용자 환경 직관 강화).",
  //       ],
  //     },
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
