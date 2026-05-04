# dsmonitor

> UI Health Monitoring Framework — 코드베이스 / 스타일 / 디자인 일관성을 정량 측정하는 도구.
>
> **EN —** UI Health Monitoring Framework — a tool that quantifies codebase / style / design consistency.

**측정 도구**입니다 (개선 도구 아님). 분석 결과를 baseline JSON + markdown 리포트로 출력합니다.

**EN —** This is a **measurement tool** (not an improvement tool). Outputs analysis as baseline JSON + markdown reports.

## 측정 영역 3가지 / Measurement Areas

| 영역 / Area | 분석 대상 / Target | 출력 / Output |
|------|-----------|------|
| **code** | TS/JS/JSX 코드베이스 정적 분석 (forbidden class, DS coverage, TS migration, hardcoded color, SCSS 변수 준수율, migration candidates, orphan class 등) | `dsmonitor/reports/baseline-*.json`, `dsmonitor/docs/baseline.md` |
| **figma** | DS 파일 Styles/Components 카운트 + 도메인 파일 INSTANCE 의 출처 미상 비율 + DS↔코드 토큰 매트릭스 | 위 JSON 의 `figma` 필드 |
| **lighthouse** | 페이지별 Performance / Accessibility / Best Practices / SEO 점수 | `dsmonitor/lighthouse/reports/YYYY-MM-DD/` |

**EN —**
- **code** — TS/JS/JSX codebase static analysis (forbidden class, DS coverage, TS migration, hardcoded color, SCSS variable compliance, migration candidates, orphan class, etc.). Output: `dsmonitor/reports/baseline-*.json`, `dsmonitor/docs/baseline.md`.
- **figma** — DS file Styles/Components count + domain file INSTANCE source-unknown ratio + DS↔code token matrix. Output: `figma` field in the JSON above.
- **lighthouse** — Per-page Performance / Accessibility / Best Practices / SEO scores. Output: `dsmonitor/lighthouse/reports/YYYY-MM-DD/`.

## 사이드카 plugin 시스템 / Sidecar Plugin System (v0.15, 2026-04-30)

dsmonitor 자체 측정 외 외부 측정 자료 영역 (단위 테스트 / 번들 크기 / 접근성 검사 등) 영역 dashboard 자동 표시. plugin 측 자체 도구 실행 + JSON 파일 출력만 — dsmonitor ↔ plugin 직접 코드 의존 빠짐.

**EN —** Beyond dsmonitor's own measurements, external measurement data (unit tests / bundle size / accessibility audit / etc.) is auto-displayed in the dashboard. Plugins run their own tools and emit a JSON file — no direct code dependency between dsmonitor and plugin.

- 자료 위치: `dsmonitor/reports/plugins/{id}/{date}.json` (id 알파벳 순 정렬)
- 자동 표시: `npx dsmonitor dashboard` (별도 명령 빠짐 — dashboard 빌드 시점에 자동 검색)
- Summary 탭 안 plugin 1개당 Layer 04+ 자동 추가 + plugin 탭 동적 생성
- 검증 영역 (필수 필드 / id 불일치 / JSON 형식) 빨간 알림 + stale 영역 (7일+) 회색 배지
- 자세한 영역: [docs/plugin-development.md](./docs/plugin-development.md)

**EN —**
- Data location: `dsmonitor/reports/plugins/{id}/{date}.json` (sorted by id alphabetically)
- Auto-display: `npx dsmonitor dashboard` (no extra command needed — auto-discovered at dashboard build time)
- One Layer 04+ auto-added per plugin in the Summary tab + dynamic plugin tab generated
- Validation (required fields / id mismatch / JSON format) → red alert. Stale (7+ days) → gray badge
- Details: [docs/plugin-development.md](./docs/plugin-development.md)

## 빠른 시작 / Quick Start

### 1. 설치 / Installation

```bash
npm install --save-dev dsmonitor
```

선택 의존 (peer optional — 활용 시점에만 install):

**EN —** Optional peer dependencies (install only when used):

| 영역 / Area | 시점 / When | 명령 / Command |
|---|---|---|
| `eslint` >=8 | dsmonitor ESLint plugin 활용 / Using dsmonitor ESLint plugin | `npm install --save-dev eslint` |
| `@lhci/cli` >=0.13 | Lighthouse 측정 활용 / Lighthouse measurement | `dsmonitor init` 안 자동 / auto via `dsmonitor init` |
| `typescript` >=5.0 | dsmonitor.config.ts 작성 시점 / Writing dsmonitor.config.ts | 보통 이미 install됨 / usually already installed |

### 2. 부트스트랩 / Bootstrap (`dsmonitor init`)

```bash
npx dsmonitor init
```

→ 인터랙티브 prompt:
- Lighthouse 측정 사용? (Y → @lhci/cli 자동 install)
- Figma 측정 사용? (Y → 자료 형식만 토큰 치환)

→ 자동 생성:
- `dsmonitor/dsmonitor.config.ts` (선택 토큰 정합)
- `dsmonitor/.env.local.example`
- `dsmonitor/reports/.gitkeep`

**EN —**

→ Interactive prompts:
- Use Lighthouse measurement? (Y → auto-install `@lhci/cli`)
- Use Figma measurement? (Y → token-substitute only)

→ Auto-generated files:
- `dsmonitor/dsmonitor.config.ts` (token-aligned with the choices)
- `dsmonitor/.env.local.example`
- `dsmonitor/reports/.gitkeep`

수동 부트스트랩 (init 빠짐 시점) / Manual bootstrap (without init):
```
my-project/
└── dsmonitor/
    ├── dsmonitor.config.ts        ← presets / config 사용자 작성 / user-authored
    ├── .env.local                 ← gitignored. LIGHTHOUSE_* / FIGMA_API_TOKEN
    ├── .env.local.example
    └── reports/                   ← 측정 결과 JSON 자동 출력 / measurement JSON output
```

### 3. CLI 명령어 / CLI Commands

```bash
npx dsmonitor audit               # code + figma 측정 (전체 cycle) / full cycle
npx dsmonitor audit --only code   # code 영역만 / code only
npx dsmonitor audit --only figma  # figma 영역만 (base JSON 필요) / figma only (requires base JSON)
npx dsmonitor audit --baseline    # 정식 baseline 모드 / official baseline mode (baseline-YYYY-MM-DD.json)
npx dsmonitor report              # markdown 재생성 / regenerate markdown
npx dsmonitor dashboard           # dashboard html 재빌드 (사이드카 plugin 자동 검색) / rebuild dashboard html (auto-discovers sidecar plugins)
npx dsmonitor export-migration --frame=<comment> [--ds=<label>]
npx dsmonitor baseline-lint       # ESLint forbidden class baseline 생성 / generate ESLint forbidden class baseline
```

### Phase 0.6 호환성 / Compatibility (B 가설 / B hypothesis)

- **codebase 측정 = 필수** — dsmonitor 자체 정체성 (코드 분석 도구)
- **figma / Lighthouse 측정 = optional** — config 안 빠지면 자연 hide. 다른 프로젝트 도입 시점에 부담 빠짐.

**EN —**
- **codebase measurement = required** — core identity of dsmonitor (a code-analysis tool)
- **figma / Lighthouse measurement = optional** — auto-hidden when missing from config. Lowers adoption cost in other projects.

### Lighthouse / 인증 어댑터 / Authentication Adapter

Lighthouse 영역 활용 시점에 사용자 측 `dsmonitor/lighthouse/` 안 config + auth 작성 (자세한 영역 — `node_modules/dsmonitor/docs/lighthouse-ci-integration.md`).

**EN —** When using Lighthouse, write `config + auth` under `dsmonitor/lighthouse/` on the user side. Details: `node_modules/dsmonitor/docs/lighthouse-ci-integration.md`.

## config 작성법 / Writing the Config

자세한 가이드: [docs/figma-config-guide.md](./docs/figma-config-guide.md)

**EN —** Detailed guide: [docs/figma-config-guide.md](./docs/figma-config-guide.md)

핵심 필드 / Key fields (`dsmonitor/dsmonitor.config.ts`):

- `projectRoot` — 프로젝트 루트 상대경로 (`dsmonitor/` 기준 보통 `..`) / Project root relative path (usually `..` from `dsmonitor/`)
- `scan` — 분석 대상 / 제외 경로 / Targets / excludes for analysis
- `designSystem.officialPaths` / `officialAliases` — DS 디렉토리 / import alias / DS directories / import aliases
- `hardcodedValues` — 색상 정규식 + SCSS 변수 사용 / 정의 패턴 / Color regex + SCSS variable usage / definition patterns
- `migrationTargets` — native HTML → DS 컴포넌트 매핑 / native HTML → DS component mapping
- `stylingPolicy` — `presets/` 4종 중 선택 후 require / Choose one of 4 presets and require
- `metrics` — 영역별 ON/OFF / Per-area ON/OFF
- `figma` / `lighthouse` — 선택 / Optional. Figma 는 `FIGMA_API_TOKEN` 필요 / Figma needs `FIGMA_API_TOKEN`
- `thresholds` — good/warn 임계값 / good/warn thresholds
- `reportStatus` — Phase 진척 배지 / Phase progress badge
- `measurementHistory` — 측정 도구 자체의 변경 이력 (역순 정렬) / Change history of the measurement tool itself (reverse-chronological)

## ESLint plugin 사용법 / ESLint Plugin Usage

```js
// .eslintrc.js
const { fromPolicy } = require("dsmonitor/eslint");
const stylingPolicy = require("./dsmonitor/stylingPolicy");

const policyConfig = fromPolicy(stylingPolicy, {
  baselinePath: "./dsmonitor/lint-baseline.json",
});

module.exports = {
  extends: ["next/core-web-vitals"],
  plugins: policyConfig.plugins,
  rules: policyConfig.rules,
  overrides: policyConfig.overrides,
};
```

ratchet 동작 / Ratchet behavior:
- `baselinePath` JSON 의 `files` 에 등록된 파일 → `warn` / Files listed in `baselinePath` JSON's `files` → `warn`
- 그 외 (신규 파일 포함) → `error` / Otherwise (including new files) → `error`

## presets/ 4종 비교 / 4-Preset Comparison

| preset | 권장 (allowed) | 금지 (forbidden) | 적합 프로젝트 / Suitable for |
|--------|----------------|------------------|---------------|
| `scss-project.js` | SCSS / CSS imports | Bootstrap utility / Tailwind utility | SCSS 기반 (Bootstrap·Tailwind 레거시 정리 대상) / SCSS-based (with legacy Bootstrap·Tailwind cleanup target) |
| `bootstrap-project.js` | Bootstrap (utility + component) | Tailwind / inline | 정식 Bootstrap / Bootstrap-first |
| `tailwind-project.js` | Tailwind utility | Bootstrap / inline | Tailwind 정식 / Tailwind-first |
| `css-modules-project.js` | CSS Modules import | global utility | 모듈화 우선 / Modularity-first |

자세한 차이: 각 파일 상단 docstring + [docs/eslint-rules.md](./docs/eslint-rules.md).

**EN —** Details: each preset's top-level docstring + [docs/eslint-rules.md](./docs/eslint-rules.md).

`presets/configs/` — 프레임워크 + 스타일 조합별 `dsmonitor.config.ts` 템플릿 (next-pages-scss / next-app-css-modules / vite-react-tailwind 등).

**EN —** `presets/configs/` — `dsmonitor.config.ts` templates per framework + style combination (next-pages-scss / next-app-css-modules / vite-react-tailwind, etc.).

## 출력물 위치 / Output Locations

| 파일 / File | 내용 / Content |
|------|------|
| `dsmonitor/reports/baseline-YYYY-MM-DD.json` | 측정 결과 (정식 baseline) / Measurement result (official baseline) |
| `dsmonitor/reports/YYYY-MM-DD.json` | non-baseline (gitignored) |
| `dsmonitor/reports/figma-instances-YYYY-MM-DD.json` | Figma instance level raw (v0.14) — frame 별 nodeId / componentName / dsLabel / contextPath |
| `dsmonitor/reports/dashboard-YYYY-MM-DD.html` | 4 탭 dashboard / 4-tab dashboard (Summary / Code / Lighthouse / Figma, since v0.9) |
| `dsmonitor/reports/migration/{frame}-{ds}-YYYY-MM-DD.csv` | 마이그레이션 CSV / Migration CSV (v0.14, `dsmonitor export-migration` output) |
| `dsmonitor/docs/baseline.md` | markdown 리포트 (자동 생성, 수동 편집 금지) / markdown report (auto-generated, do not edit manually) |
| `dsmonitor/docs/overview-for-stakeholders.md` | 비개발자용 간결 요약 / Concise summary for non-developers |
| `dsmonitor/lighthouse/reports/YYYY-MM-DD/manifest.json` | LHCI manifest |
| `dsmonitor/lighthouse/reports/YYYY-MM-DD/summary.json` | 페이지별 4점수 요약 / Per-page 4-score summary |
| `dsmonitor/lighthouse/reports/YYYY-MM-DD/*-report.html` | 개별 LHR HTML (브라우저로 확인) / Individual LHR HTML (open in browser) |

## 더 읽기 / Further Reading

- [docs/figma-config-guide.md](./docs/figma-config-guide.md) — Figma config 작성법 (DS 파일 + 도메인 파일 등록 + 마이그레이션 CSV 추출) / Figma config authoring (DS file + domain file registration + migration CSV export)
- [docs/eslint-rules.md](./docs/eslint-rules.md) — ESLint 룰 상세 + ratchet 동작 / ESLint rule details + ratchet behavior
- [docs/eslint-ci-integration.md](./docs/eslint-ci-integration.md) — CI 통합 패턴 / CI integration patterns
- [docs/lighthouse-ci-integration.md](./docs/lighthouse-ci-integration.md) — Lighthouse CI 통합 / Lighthouse CI integration
- [docs/plugin-development.md](./docs/plugin-development.md) — 사이드카 plugin 개발 자료실 (자료 위치 / 자료 형식 / 자동 표시 / 검증 / 예시 코드 — v0.15) / Sidecar plugin development reference (data location / format / auto-display / validation / example code — v0.15)
- [docs/methodology.md](./docs/methodology.md) — 측정 방법론 (**Phase B 작성 예정** — 현재 placeholder) / Measurement methodology (**to be written in Phase B** — currently a placeholder)

## Acknowledgments

본 프로젝트 = 다음 공동 개발자 영역 도움 영역 안 작성됨:

**EN —** This project was built with help from the following contributors:

- **[chenjingdev](https://github.com/chenjingdev)** — 기획 도움 / Planning support
- **[servantcdh](https://github.com/servantcdh)** — 플러그인 개발 도움 / Plugin development support

## 라이선스 / License

MIT — [LICENSE](./LICENSE)
