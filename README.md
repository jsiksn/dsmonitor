# VitaUI

> UI Health Monitoring Framework — 코드베이스 / 스타일 / 디자인 일관성을 정량 측정하는 도구.

**측정 도구**입니다 (개선 도구 아님). 분석 결과를 baseline JSON + markdown 리포트로 출력합니다.

## 측정 영역 3가지

| 영역 | 분석 대상 | 출력 |
|------|-----------|------|
| **code** | TS/JS/JSX 코드베이스 정적 분석 (forbidden class, DS coverage, TS migration, hardcoded color, SCSS 변수 준수율, migration candidates, orphan class 등) | `vitaui/reports/baseline-*.json`, `vitaui/docs/baseline.md` |
| **figma** | DS 파일 Styles/Components 카운트 + 도메인 파일 INSTANCE 의 출처 미상 비율 + DS↔코드 토큰 매트릭스 | 위 JSON 의 `figma` 필드 |
| **lighthouse** | 페이지별 Performance / Accessibility / Best Practices / SEO 점수 | `vitaui/lighthouse/reports/YYYY-MM-DD/` |

## 빠른 시작

### 1. 설치

현재 (file: 의존성 — monorepo 환경):
```jsonc
// 루트 package.json
{
  "devDependencies": {
    "eslint-plugin-ui-health": "file:./packages/vitaui/eslint"
  }
}
```

`npm install` 실행 시 루트 `postinstall` 훅이 `packages/vitaui` 의존성도 자동 설치합니다.

npm 발행 후 (Phase 0.6 이후 예정): `npm install vitaui --save-dev`.

### 2. 프로젝트 측 디렉토리 구성

프로젝트 루트 직속에 `vitaui/` 폴더를 만들고 다음 파일 배치:

```
vitaui/
├── vitaui.config.ts                  ← presets/configs/ 에서 적절한 template 복사
├── vitaui.config.local.ts            ← gitignored. 민감 정보 (Figma URL/파일 키)
├── vitaui.config.local.example.ts    ← 템플릿 (커밋 대상)
├── stylingPolicy.js                  ← presets/ 4종 중 선택 (scss / bootstrap / tailwind / css-modules)
├── tsconfig.json                     ← paths 매핑 (vitaui → ../packages/vitaui/src/types)
├── .env.local                        ← gitignored. LIGHTHOUSE_*, FIGMA_API_TOKEN
├── .env.local.example
├── .lint-baseline.json               ← soft baseline (lint:summary 비교용)
├── lint-baseline.json                ← ESLint plugin ratchet 베이스라인
├── lighthouse/
│   ├── config.js                     ← LHCI 측정 페이지 + 인증 어댑터 path
│   └── auth/
│       └── portal-gateway.js         ← Puppeteer 자동 로그인 어댑터 (프로젝트별 작성)
├── reports/                          ← 측정 결과 JSON
└── docs/                             ← 자동 생성 markdown + 운영 기록
```

### 3. CLI 명령어

루트 `package.json` 에 등록 후 `npm run <name>`:

| 명령 | 동작 | 비고 |
|------|------|------|
| `ui-health` | code + figma 측정 + markdown 자동 변환 | 전체 cycle |
| `ui-health:code` | code 영역만 측정 | figma 단계 건너뜀 |
| `ui-health:figma` | figma 영역만 측정 | base JSON 필요 (`ui-health` 또는 `ui-health:code` 선행) |
| `ui-health:lighthouse` | Lighthouse 측정 | 약 20-35분 (10 URL × 3 runs) |
| `ui-health:report` | markdown 만 재생성 | 측정 안 다시 함 |
| `ui-health:baseline` | `--baseline` 모드로 정식 측정 | `baseline-YYYY-MM-DD.json` 생성 |
| `ui-health:dashboard` | 대시보드 (Phase 0.5 단계 5 이후) | 현재 placeholder |
| `lint:summary` | ESLint forbidden class 위반 baseline 비교 | soft, exit 0 |
| `lint:update-baseline` | baseline 갱신 | |
| `lighthouse:clean` | LHR 결과 폴더 정리 | |

루트 `package.json` 등록 예시:

```json
{
  "scripts": {
    "ui-health":            "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit && node packages/vitaui/bin/report.js",
    "ui-health:code":       "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit --only code",
    "ui-health:figma":      "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit --only figma",
    "ui-health:lighthouse": "node packages/vitaui/lighthouse/run.js",
    "ui-health:report":     "node packages/vitaui/bin/report.js",
    "ui-health:baseline":   "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit --baseline && node packages/vitaui/bin/report.js",
    "lint:summary":         "node packages/vitaui/bin/lint-summary.js",
    "lint:update-baseline": "node packages/vitaui/bin/lint-update-baseline.js",
    "lighthouse:clean":     "rm -rf vitaui/lighthouse/reports/*",
    "postinstall":          "cd packages/vitaui && npm install"
  }
}
```

## config 작성법

자세한 가이드: [docs/figma-config-guide.md](./docs/figma-config-guide.md)

핵심 필드 (`vitaui/vitaui.config.ts`):

- `projectRoot` — 프로젝트 루트 상대경로 (`vitaui/` 기준 보통 `..`)
- `scan` — 분석 대상 / 제외 경로
- `designSystem.officialPaths` / `officialAliases` — DS 디렉토리 / import alias
- `hardcodedValues` — 색상 정규식 + SCSS 변수 사용 / 정의 패턴
- `migrationTargets` — native HTML → DS 컴포넌트 매핑
- `stylingPolicy` — `presets/` 4종 중 선택 후 require
- `metrics` — 영역별 ON/OFF
- `figma` / `lighthouse` — 선택. Figma 는 `FIGMA_API_TOKEN` 필요
- `thresholds` — good/warn 임계값
- `reportStatus` — Phase 진척 배지
- `measurementHistory` — 측정 도구 자체의 변경 이력 (역순 정렬)

## ESLint plugin 사용법

```js
// .eslintrc.js
const { fromPolicy } = require("eslint-plugin-ui-health");
const stylingPolicy = require("./vitaui/stylingPolicy");

const policyConfig = fromPolicy(stylingPolicy, {
  baselinePath: "./vitaui/lint-baseline.json",
});

module.exports = {
  extends: ["next/core-web-vitals"],
  plugins: policyConfig.plugins,
  rules: policyConfig.rules,
  overrides: policyConfig.overrides,
};
```

ratchet 동작:
- `baselinePath` JSON 의 `files` 에 등록된 파일 → `warn`
- 그 외 (신규 파일 포함) → `error`

## presets/ 4종 비교

| preset | 권장 (allowed) | 금지 (forbidden) | 적합 프로젝트 |
|--------|----------------|------------------|---------------|
| `scss-project.js` | SCSS / CSS imports | Bootstrap utility / Tailwind utility | SCSS 기반 (Bootstrap·Tailwind 레거시 정리 대상) |
| `bootstrap-project.js` | Bootstrap (utility + component) | Tailwind / inline | 정식 Bootstrap |
| `tailwind-project.js` | Tailwind utility | Bootstrap / inline | Tailwind 정식 |
| `css-modules-project.js` | CSS Modules import | global utility | 모듈화 우선 |

자세한 차이: 각 파일 상단 docstring + [docs/eslint-rules.md](./docs/eslint-rules.md).

`presets/configs/` — 프레임워크 + 스타일 조합별 `vitaui.config.ts` 템플릿 (next-pages-scss / next-app-css-modules / vite-react-tailwind 등).

## 출력물 위치

| 파일 | 내용 |
|------|------|
| `vitaui/reports/baseline-YYYY-MM-DD.json` | 측정 결과 (정식 baseline) |
| `vitaui/reports/YYYY-MM-DD.json` | non-baseline (gitignored) |
| `vitaui/docs/baseline.md` | markdown 리포트 (자동 생성, 수동 편집 금지) |
| `vitaui/docs/overview-for-stakeholders.md` | 비개발자용 간결 요약 |
| `vitaui/lighthouse/reports/YYYY-MM-DD/manifest.json` | LHCI manifest |
| `vitaui/lighthouse/reports/YYYY-MM-DD/summary.json` | 페이지별 4점수 요약 |
| `vitaui/lighthouse/reports/YYYY-MM-DD/*-report.html` | 개별 LHR HTML (브라우저로 확인) |

## 패키지 구조

```
packages/vitaui/
├── src/
│   ├── analyzers/  ← codebase / figma / lintBaseline / scssTokens / tokenMatrix / codeTokens
│   ├── frameworks/ ← react adapter (확장 가능 — Vue / Svelte / Astro / Solid)
│   ├── reporters/  ← json / markdown / overview
│   ├── utils/walker.ts
│   ├── cli.ts      ← 진입점
│   ├── policy.ts
│   └── types.ts
├── bin/            ← report / lint-summary / lint-update-baseline
├── eslint/         ← eslint-plugin-ui-health (no-forbidden-classes 룰)
├── lighthouse/run.js  ← LHCI 실행 + summary.json 생성
├── presets/        ← 4종 stylingPolicy + 3종 config 템플릿
└── docs/           ← figma-config-guide / eslint-rules / methodology (placeholder)
```

## 더 읽기

- [docs/figma-config-guide.md](./docs/figma-config-guide.md) — Figma config 작성법 (DS 파일 + 도메인 파일 등록)
- [docs/eslint-rules.md](./docs/eslint-rules.md) — ESLint 룰 상세 + ratchet 동작
- [docs/eslint-ci-integration.md](./docs/eslint-ci-integration.md) — CI 통합 패턴
- [docs/lighthouse-ci-integration.md](./docs/lighthouse-ci-integration.md) — Lighthouse CI 통합
- [docs/methodology.md](./docs/methodology.md) — 측정 방법론 (**Phase B 작성 예정** — 현재 placeholder)

## 라이선스

(추후 npm 발행 시점에 결정)
