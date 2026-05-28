/**
 * dsmonitor 설정 — 본 파일은 `dsmonitor init` 안 자동 생성됨 (v0.1.0).
 *
 * 상세 안내:
 *   - 패키지 안내 — node_modules/dsmonitor/README.md
 *   - figma config 가이드 — node_modules/dsmonitor/docs/figma-config-guide.md
 *   - 사이드카 plugin 가이드 — node_modules/dsmonitor/docs/plugin-development.md
 */

import type { UIHealthConfig } from "dsmonitor";
import scssPreset from "dsmonitor/presets/scss-project.js";
// 다른 preset 활용 시점에 본 import 한 줄을 교체:
//   import bootstrapPreset from "dsmonitor/presets/bootstrap-project.js";
//   import tailwindPreset  from "dsmonitor/presets/tailwind-project.js";
//   import cssModulesPreset from "dsmonitor/presets/css-modules-project.js";

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
  // 4종 preset 중 골라 import (위쪽 import 한 줄 교체):
  //   - dsmonitor/presets/scss-project.js       (SCSS 기반)
  //   - dsmonitor/presets/bootstrap-project.js  (Bootstrap)
  //   - dsmonitor/presets/tailwind-project.js   (Tailwind)
  //   - dsmonitor/presets/css-modules-project.js (CSS Modules)
  //
  // 0.7.3 부터 ESM 흐름으로 통일됨. 옛 `require("dsmonitor/presets/...")` 형식은
  // ESM 프로젝트 (`"type": "module"`) 에서 `ReferenceError: require is not defined` 발생.
  stylingPolicy: scssPreset,

  // ────── 분석 대상 ──────
  scan: {
    codeRoots: ["src", "components", "pages", "app"],
    styleRoots: ["src", "styles"],
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    codeExts: [".ts", ".tsx", ".js", ".jsx"],
    styleExts: [".scss", ".css"],
  },

  // ────── 글로벌 스타일 출처 ──────
  //
  // 전역에서 허용되는 스타일이 정의된 파일의 glob 패턴입니다.
  // 매치된 파일에서 정의된 모든 CSS 셀렉터가 "글로벌 인덱스" 로 모입니다.
  // 컴포넌트 className 중 하나라도 이 인덱스에 있으면 allowedGlobal,
  // 하나도 없으면 orphanClass 로 분류됩니다.
  //
  // 0.7.0 부터 `dsmonitor init` 이 cwd 기준으로 흔한 styles 디렉토리를
  // 자동 감지해 채웁니다. 다른 위치라면 직접 정정:
  //   - SCSS:        ["styles/**/*.{scss,css}"] / ["src/styles/**/*.{scss,css}"]
  //   - Tailwind v4: ["src/app/globals.css", "src/styles/**/*.css"]
  //   - CSS Modules: ["src/styles/global*.{scss,css}"]
  globalStyleSources: {{GLOBAL_STYLE_SOURCES}},

  // ────── 디자인 시스템 ──────
  //
  // dsmonitor 가 DS 본체와 DS 사용처를 구분하기 위한 두 갈래 설정입니다.
  // 둘은 서로 다른 차원이고 보통 값이 다릅니다.
  //
  //   officialPaths   = DS 소스가 실제로 위치하는 파일 경로 (projectRoot 기준 glob)
  //                     영향 지표 = totals.dsComponentFiles (DS 본체 파일 수).
  //                     이 경로 안 파일은 마이그레이션 후보 검출 대상에서 제외됩니다.
  //
  //   officialAliases = 코드에서 DS 를 import 할 때 쓰는 alias prefix
  //                     영향 지표 = dsCoverage.filesUsingDs / dsCoverage.coverage
  //                     (DS 사용 비율). 상대 경로 import 만 쓰는 환경이라면 빈 배열로
  //                     둬도 됩니다.
  //
  //   componentExts   = 컴포넌트 파일로 인정할 확장자.
  //
  // 보통 같은 DS 를 두 가지 "언어" 로 가리킵니다:
  //   officialPaths:   ["src/components/ds/**"]
  //   officialAliases: ["@ds/", "@/components/ds/"]
  //
  // 두 값이 동일하면 alias 가 없는 환경 (직접 경로 import 만 쓰는 경우) 입니다.
  designSystem: {
    officialPaths: ["src/components/ds/**"],
    officialAliases: ["@ds/", "@/components/ds/"],
    componentExts: [".tsx", ".jsx"],
  },

  // ────── 하드코딩 색상 ──────
  // 정보 형식 핵심: 모두 RegExp 배열 (cli.js 안 countMatches 일치).
  // - colorPatterns: SCSS/CSS 하드코딩 색상 탐지 패턴.
  // - scssVariableUsagePatterns: 변수 참조 탐지 (CSS var() + SCSS $).
  // - scssVariableDefFiles: 하드코딩 검출에서 제외할 변수 정의 원본 파일 경로.
  //     0.7.0 부터 `dsmonitor init` 이 흔한 globals.css / tokens.scss 를 자동
  //     감지해 등록합니다. Tailwind 의 @theme 블록 안 hex 가 noise 로 잡힐 때
  //     globals.css 를 본 배열에 넣어 두면 제외됩니다.
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
    scssVariableDefFiles: {{SCSS_VAR_DEF_FILES}},
  },

  // ────── 마이그레이션 대상 ──────
  //
  // 의미:
  //   프로젝트의 사용자 정의 컴포넌트와 native HTML 태그를 매칭해 두는 표입니다.
  //   dsmonitor 는 이 표를 활용해 "native 태그가 그대로 쓰이는 자리" 가운데
  //   DS 컴포넌트로 마이그레이션할 후보를 추출합니다.
  //
  // 형식: Record<ComponentName, { aliases: string[]; nativeTags: NativeTagSpec[] }>
  //   - key (ComponentName)
  //       리포트와 대시보드에 표시되는 컴포넌트 이름입니다.
  //       보통 DS 컴포넌트 파일명 또는 named import 이름과 동일하게 적습니다.
  //   - aliases: string[]
  //       해당 컴포넌트의 import 경로 또는 그 prefix 입니다.
  //       0.6.1 부터 alias 일치 + named import 명 일치 조합으로 정확히 매칭합니다.
  //       barrel import 환경에서는 두 형식을 함께 등록해 두는 패턴을 권장합니다:
  //         aliases: ["@/laon-web-ui", "@/laon-web-ui/Button"]
  //       앞쪽 barrel alias 는 named import 매칭용, 뒤쪽 구체 경로는 default /
  //       per-component import 매칭용입니다.
  //   - nativeTags: NativeTagSpec[]
  //       같은 컴포넌트로 대체 가능한 native HTML 태그입니다.
  //       두 가지 형식을 함께 쓸 수 있습니다:
  //         · "button"                              — tag 만 비교 (type 무관 매칭)
  //         · { tag: "input" }                      — 모든 <input> 매칭 (type 무관)
  //         · { tag: "input", type: "checkbox" }    — <input type="checkbox"> 만 매칭
  //       옛 0.5.x 의 `nativeTags: ["input"]` 형식 그대로 사용해도 됩니다.
  //
  // 예시 (필요한 항목만 골라 작성하면 됩니다):
  migrationTargets: {
    // Button: {
    //   aliases: ["@/components/ds/Button"],
    //   nativeTags: ["button"],
    // },
    // Input: {
    //   aliases: ["@/components/ds/Input"],
    //   nativeTags: ["input", "textarea"],
    // },
    // Checkbox: {
    //   aliases: ["@/components/ds/Checkbox"],
    //   nativeTags: [{ tag: "input", type: "checkbox" }],
    // },
    // Radio: {
    //   aliases: ["@/components/ds/Radio"],
    //   nativeTags: [{ tag: "input", type: "radio" }],
    // },
  },

  // ────── 마이그레이션 후보의 최소 className 길이 ──────
  // 이 길이 미만의 className 은 후보에서 제외됩니다 (noise 감소).
  // 예) 3 으로 두면 `btn`, `nav` 같은 짧은 클래스는 후보에 포함되고,
  //     4 로 올리면 더 보수적으로 줄어듭니다.
  migrationMinClassLength: 3,

  // ────── 마이그레이션 후보 옵션 (0.7.2+) ──────
  //
  // excludeOfficialPaths:
  //   true (default) — designSystem.officialPaths 에 매치되는 파일을 마이그레이션
  //   후보 검출에서 자동 제외합니다. DS 본체가 자체적으로 native HTML 을 쓰는
  //   케이스 (예: Button.tsx 가 내부에서 <button> 사용) 가 false positive 로 잡히지
  //   않습니다. scan.ignore 에 DS 폴더를 따로 추가하지 않아도 됩니다.
  //
  //   false — 옛 (~ 0.7.1) 동작. DS 본체 파일도 후보 검출 대상이 됩니다. DS 본체 자체의
  //   native HTML 패턴을 그대로 보고 싶을 때만 활용하세요.
  //
  //   영향 범위: 본 옵션은 마이그레이션 후보 검출 흐름만 정정합니다.
  //   totals.dsComponentFiles 같은 다른 지표는 영향을 받지 않습니다.
  migrationCandidates: {
    excludeOfficialPaths: true,
  },

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
