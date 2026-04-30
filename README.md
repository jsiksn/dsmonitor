# VitaUI

> UI Health Monitoring Framework — 코드베이스 / 스타일 / 디자인 일관성을 정량 측정하는 도구.

**측정 도구**입니다 (개선 도구 아님). 분석 결과를 baseline JSON + markdown 리포트로 출력합니다.

## 측정 영역 3가지

| 영역 | 분석 대상 | 출력 |
|------|-----------|------|
| **code** | TS/JS/JSX 코드베이스 정적 분석 (forbidden class, DS coverage, TS migration, hardcoded color, SCSS 변수 준수율, migration candidates, orphan class 등) | `vitaui/reports/baseline-*.json`, `vitaui/docs/baseline.md` |
| **figma** | DS 파일 Styles/Components 카운트 + 도메인 파일 INSTANCE 의 출처 미상 비율 + DS↔코드 토큰 매트릭스 | 위 JSON 의 `figma` 필드 |
| **lighthouse** | 페이지별 Performance / Accessibility / Best Practices / SEO 점수 | `vitaui/lighthouse/reports/YYYY-MM-DD/` |

## 사이드카 plugin 시스템 (v0.15, 2026-04-30)

vitaui 자체 측정 외 외부 측정 자료 영역 (단위 테스트 / 번들 크기 / 접근성 검사 등) 영역 dashboard 자동 표시. plugin 측 자체 도구 실행 + JSON 파일 출력만 — vitaui ↔ plugin 직접 코드 의존 빠짐.

- 자료 위치: `vitaui/reports/plugins/{id}/{date}.json` (id 알파벳 순 정렬)
- 자동 표시: `npx vitaui dashboard` (별도 명령 빠짐 — dashboard 빌드 시점에 자동 검색)
- Summary 탭 안 plugin 1개당 Layer 04+ 자동 추가 + plugin 탭 동적 생성
- 검증 영역 (필수 필드 / id 불일치 / JSON 형식) 빨간 알림 + stale 영역 (7일+) 회색 배지
- 자세한 영역: [docs/plugin-development.md](./docs/plugin-development.md) (plugin 개발자용 자료실)

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

npm 발행은 **Phase C 패키지화 단계** (phase-c-plan.md 1.5) 에서 진행 예정. 그 전까지 `file:` 의존성 영역으로 monorepo 안에서 사용. 다른 프로젝트 도입 호환성 — Phase 0.6 (v0.12, 2026-04-29) 시점에 figma / Lighthouse optional 보장 (B 본질) 추가 완료 — codebase 미설정 외 영역은 자연 작동.

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
| `ui-health` | code + figma 측정 + markdown + dashboard 자동 chain | 전체 cycle (non-baseline 출력 — `YYYY-MM-DD.json`) |
| `ui-health:code` | code 영역만 측정 | figma 단계 건너뜀 |
| `ui-health:figma` | figma 영역만 측정 | base JSON 필요. **componentMatch 영역 미생성** — 통합 측정 권장 (cli.ts 명시) |
| `ui-health:lighthouse` | Lighthouse 측정 | 약 20-35분 (10 URL × 3 runs) |
| `ui-health:report` | markdown 만 재생성 | 측정 안 다시 함 |
| `ui-health:baseline` | `--baseline` 모드로 정식 측정 + markdown + dashboard 자동 chain | `baseline-YYYY-MM-DD.json` + `figma-instances-YYYY-MM-DD.json` (v0.14) 생성 |
| `ui-health:dashboard` | dashboard html 재빌드 | 측정 안 다시 함. baseline JSON + lighthouse summary 결합 |
| `ui-health:export-migration` | frame 별 instance CSV (v0.14, Phase 0.7) | `-- --frame=<comment> [--ds=<label>]`. 출력 — `vitaui/reports/migration/` |
| `lint:summary` | ESLint forbidden class 위반 baseline 비교 | soft, exit 0 |
| `lint:update-baseline` | baseline 갱신 | |
| `lighthouse:clean` | LHR 결과 폴더 정리 | |

루트 `package.json` 등록 예시:

```json
{
  "scripts": {
    "ui-health":               "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit && node packages/vitaui/bin/report.js && node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts dashboard",
    "ui-health:code":          "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit --only code",
    "ui-health:figma":         "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit --only figma",
    "ui-health:lighthouse":    "node packages/vitaui/lighthouse/run.js",
    "ui-health:report":        "node packages/vitaui/bin/report.js",
    "ui-health:baseline":      "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts audit --baseline && node packages/vitaui/bin/report.js && node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts dashboard",
    "ui-health:dashboard":     "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts dashboard",
    "ui-health:export-migration": "node packages/vitaui/node_modules/.bin/tsx packages/vitaui/src/cli.ts export-migration",
    "lint:summary":            "node packages/vitaui/bin/lint-summary.js",
    "lint:update-baseline":    "node packages/vitaui/bin/lint-update-baseline.js",
    "lighthouse:clean":        "rm -rf vitaui/lighthouse/reports/*",
    "postinstall":             "cd packages/vitaui && npm install"
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
| `vitaui/reports/figma-instances-YYYY-MM-DD.json` | Figma instance level raw (v0.14, Phase 0.7) — frame 별 nodeId / componentName / dsLabel / contextPath |
| `vitaui/reports/dashboard-YYYY-MM-DD.html` | 4 탭 dashboard (Summary / Code / Lighthouse / Figma, v0.9 시점부터) |
| `vitaui/reports/migration/{frame}-{ds}-YYYY-MM-DD.csv` | 마이그레이션 CSV (v0.14, `ui-health:export-migration` 출력) |
| `vitaui/docs/baseline.md` | markdown 리포트 (자동 생성, 수동 편집 금지) |
| `vitaui/docs/overview-for-stakeholders.md` | 비개발자용 간결 요약 |
| `vitaui/lighthouse/reports/YYYY-MM-DD/manifest.json` | LHCI manifest |
| `vitaui/lighthouse/reports/YYYY-MM-DD/summary.json` | 페이지별 4점수 요약 |
| `vitaui/lighthouse/reports/YYYY-MM-DD/*-report.html` | 개별 LHR HTML (브라우저로 확인) |

## 패키지 구조

```
packages/vitaui/
├── src/
│   ├── analyzers/  ← codebase / figma (+ figma/componentMatch v0.11 + figma/domainScan v0.14) / lintBaseline / scssTokens / tokenMatrix / codeTokens
│   ├── plugins/    ← v0.15 사이드카 plugin (types / loader — vitaui/reports/plugins/* 자동 검색 + 검증)
│   ├── frameworks/ ← react adapter (확장 가능 — Vue / Svelte / Astro / Solid)
│   ├── reporters/  ← json / markdown / overview / migrationCsv (v0.14)
│   ├── dashboard/  ← v0.9 통합 + v0.15 plugin 영역 — components (root / code-tab / figma-tab / lighthouse-tab / plugin-tab) + transformers (baseline-to-{code,figma,summary}-data + lighthouse-to-data + plugins-to-data) + builder (render / shell)
│   ├── utils/walker.ts
│   ├── cli.ts      ← 진입점 (audit / report / dashboard / export-migration / baseline-lint)
│   ├── policy.ts
│   └── types.ts
├── bin/            ← report / lint-summary / lint-update-baseline
├── eslint/         ← eslint-plugin-ui-health (no-forbidden-classes 룰)
├── lighthouse/run.js  ← LHCI 실행 + summary.json 생성
├── presets/        ← 4종 stylingPolicy + 3종 config 템플릿 (configs/next-app-css-modules.ts / next-pages-scss.ts / vite-react-tailwind.ts)
└── docs/           ← figma-config-guide / eslint-rules / eslint-ci-integration / lighthouse-ci-integration / methodology (Phase B 작성 예정) / plugin-development (v0.15)
```

## 더 읽기

- [docs/figma-config-guide.md](./docs/figma-config-guide.md) — Figma config 작성법 (DS 파일 + 도메인 파일 등록 + 마이그레이션 CSV 추출)
- [docs/eslint-rules.md](./docs/eslint-rules.md) — ESLint 룰 상세 + ratchet 동작
- [docs/eslint-ci-integration.md](./docs/eslint-ci-integration.md) — CI 통합 패턴
- [docs/lighthouse-ci-integration.md](./docs/lighthouse-ci-integration.md) — Lighthouse CI 통합
- [docs/plugin-development.md](./docs/plugin-development.md) — 사이드카 plugin 개발 자료실 (자료 위치 / 자료 형식 / 자동 표시 / 검증 / 예시 코드 — v0.15)
- [docs/methodology.md](./docs/methodology.md) — 측정 방법론 (**Phase B 작성 예정** — 현재 placeholder, planning.md / phase-c-plan.md reference)
- 프로젝트 측 운영 기록 — `vitaui/docs/planning.md` (Phase × 레이어 매트릭스 + Phase 정의 + §7 Decision Log v0.1 ~ v0.15) / `vitaui/docs/phase-c-plan.md` (Phase C 6 작업, 1.6 사이드카 plugin ✅ 끝)

## 라이선스

(추후 npm 발행 시점에 결정)
