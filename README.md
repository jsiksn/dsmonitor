# dsmonitor

> UI Health Monitoring Framework — 코드베이스 / 스타일 / 디자인 일관성을 정량 측정하는 도구.
>
> **EN —** UI Health Monitoring Framework — a tool that quantifies codebase / style / design consistency.

**측정 도구**입니다 (개선 도구 아님). 분석 결과를 baseline JSON + markdown 리포트로 출력합니다.

**EN —** This is a **measurement tool** (not an improvement tool). Outputs analysis as baseline JSON + markdown reports.

![dsmonitor dashboard](docs/images/dashboard.png)

## 측정 항목 3가지 / Measurement Areas

| 부분 / Area    | 분석 대상 / Target                                                                                                                                    | 출력 / Output                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **code**       | TS/JS/JSX 코드베이스 정적 분석 (forbidden class, DS coverage, TS migration, hardcoded color, SCSS 변수 준수율, migration candidates, orphan class 등) | `dsmonitor/reports/baseline-*.json`, `dsmonitor/docs/baseline.md` |
| **figma**      | DS 파일 Styles/Components 카운트 + 도메인 파일 INSTANCE 의 출처 미상 비율 + DS↔코드 토큰 매트릭스                                                     | 위 JSON 의 `figma` 필드                                           |
| **lighthouse** | 페이지별 Performance / Accessibility / Best Practices / SEO 점수                                                                                      | `dsmonitor/lighthouse/reports/YYYY-MM-DD/`                        |

**EN —**

- **code** — TS/JS/JSX codebase static analysis (forbidden class, DS coverage, TS migration, hardcoded color, SCSS variable compliance, migration candidates, orphan class, etc.). Output: `dsmonitor/reports/baseline-*.json`, `dsmonitor/docs/baseline.md`.
- **figma** — DS file Styles/Components count + domain file INSTANCE source-unknown ratio + DS↔code token matrix. Output: `figma` field in the JSON above.
- **lighthouse** — Per-page Performance / Accessibility / Best Practices / SEO scores. Output: `dsmonitor/lighthouse/reports/YYYY-MM-DD/`.

## 사이드카 plugin 시스템 / Sidecar Plugin System (v0.15, 2026-04-30)

dsmonitor 자체 측정 외 외부 측정 결과 (단위 테스트 / 번들 크기 / 접근성 검사 등)가 dashboard에 자동 표시. plugin 측 자체 도구 실행 + JSON 파일 출력만 — dsmonitor ↔ plugin 직접 코드 의존 없음.

**EN —** Beyond dsmonitor's own measurements, external measurement data (unit tests / bundle size / accessibility audit / etc.) is auto-displayed in the dashboard. Plugins run their own tools and emit a JSON file — no direct code dependency between dsmonitor and plugin.

- 정보 위치: `dsmonitor/reports/plugins/{id}/{date}.json` (id 알파벳 순 정렬)
- 자동 표시: `npx dsmonitor dashboard` (별도 명령 없음 — dashboard 빌드 시점에 자동 검색)
- Summary 탭 안 plugin 1개당 Layer 04+ 자동 추가 + plugin 탭 동적 생성
- 검증 실패 (필수 필드 / id 불일치 / JSON 형식) 빨간 알림 + 오래된 정보 (7일+) 회색 배지
- 자세한 내용: [docs/plugin-development.md](./docs/plugin-development.md)

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

ESLint plugin 활용 시점 = wrapper 패키지 (`eslint-plugin-dsmonitor`) 도 추가 install. ESLint legacy config(`.eslintrc.js`) 안 plugin 자동 검색 흐름 호환 위해 별도 패키지 형태로 publish.

**EN —** When using the ESLint plugin, also install the wrapper package (`eslint-plugin-dsmonitor`). It is published separately to satisfy ESLint legacy config's automatic `eslint-plugin-{name}` resolution.

```bash
npm install --save-dev dsmonitor eslint-plugin-dsmonitor
```

선택 의존 (peer optional — 활용 시점에만 install):

**EN —** Optional peer dependencies (install only when used):

| 부분 / Area                     | 시점 / When                                                  | 명령 / Command                                       |
| ------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| `eslint` >=8                    | dsmonitor ESLint plugin 활용 / Using dsmonitor ESLint plugin | `npm install --save-dev eslint`                      |
| `eslint-plugin-dsmonitor`       | dsmonitor ESLint plugin 활용 / Using dsmonitor ESLint plugin | `npm install --save-dev eslint-plugin-dsmonitor`     |
| `@lhci/cli` >=0.13              | Lighthouse 측정 활용 / Lighthouse measurement                | `dsmonitor init` 안 자동 / auto via `dsmonitor init` |
| `typescript` >=5.0              | dsmonitor.config.ts 작성 시점 / Writing dsmonitor.config.ts  | 보통 이미 install됨 / usually already installed      |

### 2. 부트스트랩 / Bootstrap (`dsmonitor init`)

```bash
npx dsmonitor init
```

→ 인터랙티브 prompt:

- Lighthouse 측정 사용? (Y → @lhci/cli 자동 install)
- Figma 측정 사용? (Y → 정보 형식만 토큰 치환)

→ 자동 생성:

- `dsmonitor/dsmonitor.config.ts` (선택에 맞춰 토큰 치환)
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

수동 부트스트랩 (init 없이) / Manual bootstrap (without init):

```
my-project/
└── dsmonitor/
    ├── dsmonitor.config.ts        ← presets / config 사용자 작성 / user-authored
    ├── .env.local                 ← gitignored. LIGHTHOUSE_* / FIGMA_API_TOKEN
    ├── .env.local.example
    ├── reports/                   ← 측정 결과 JSON 자동 출력 / measurement JSON output
    └── lighthouse/                ← Lighthouse=Y 케이스만
        ├── config.js              ← LHCI config (init 안 자동 생성)
        └── auth/custom.js         ← (커스텀 어댑터 케이스만)
```

#### init 이후 `.env.local` 작성 / Filling `.env.local` After Init

`.env.local.example` 안 안내 키를 실제 값으로 채워 `dsmonitor/.env.local` 로 cp:

```bash
cp dsmonitor/.env.local.example dsmonitor/.env.local
# 편집기로 열어 실제 값 입력
```

| 변수 / Variable | 인증 방식 / Auth Type | 용도 / Purpose |
|---|---|---|
| `FIGMA_API_TOKEN` | — | Figma 측정 활용 시 (`figmaAnalysis = true`). Figma → Settings → Personal access tokens 발급 |
| `LIGHTHOUSE_BASE_URL` | none / basic / custom | Lighthouse 측정 대상 base URL. 환경 전환 시 본 값만 정정 |
| `LIGHTHOUSE_LOGIN_URL` | basic | 로그인 페이지 path (예: `/login`) 또는 절대 URL |
| `LIGHTHOUSE_TEST_ID` | basic | 테스트 계정 ID (basic 어댑터 read) |
| `LIGHTHOUSE_TEST_PW` | basic | 테스트 계정 PW (basic 어댑터 read) |
| `LIGHTHOUSE_BASIC_SELECTOR_*` | basic (선택) | basic 어댑터 selector override — `ID_INPUT` / `PW_INPUT` / `SUBMIT` 3종 |

- `.env.local` 자체 = `.gitignore` 권고 (민감 정보).
- 커스텀 어댑터 케이스 = 자유 변수 정의. 어댑터 본문 안 read 흐름과 `.env.local.example` 안 안내 한 줄 일관 유지.

**EN —** Fill `.env.local.example` with real values, then `cp` to `dsmonitor/.env.local`:

| Variable | Auth Type | Purpose |
|---|---|---|
| `FIGMA_API_TOKEN` | — | Required when `figmaAnalysis = true`. Generate at Figma → Settings → Personal access tokens. |
| `LIGHTHOUSE_BASE_URL` | none / basic / custom | Lighthouse target base URL. Change this single value when switching dev/it/prod. |
| `LIGHTHOUSE_LOGIN_URL` | basic | Login page path (e.g. `/login`) or absolute URL. |
| `LIGHTHOUSE_TEST_ID` | basic | Test account ID (read by the basic adapter). |
| `LIGHTHOUSE_TEST_PW` | basic | Test account password (read by the basic adapter). |
| `LIGHTHOUSE_BASIC_SELECTOR_*` | basic (optional) | Override default selectors — `ID_INPUT` / `PW_INPUT` / `SUBMIT`. |

- Keep `.env.local` in `.gitignore` (sensitive material).
- For custom adapters, define your own variables. Keep the body of the adapter and the comment line in `.env.local.example` in sync.

#### init 이후 `dsmonitor.config.ts` 작성 / Filling `dsmonitor.config.ts` After Init

`dsmonitor init` 안 생성된 `dsmonitor/dsmonitor.config.ts` 안 다음 항목 외부 사용자 환경에 맞게 입력:

- **`projectRoot`** — 보통 `..` 그대로 (`dsmonitor/` 폴더 한 단계 위).
- **`scan.include` / `scan.exclude`** — 분석 대상 / 제외 경로 (외부 사용자 환경 폴더 구조에 맞게 정정).
- **`figma.designSystemFiles` + `figma.domainFiles`** — Figma file key 입력 (Figma 측정 활용 시). Figma URL 안 `https://www.figma.com/design/<fileKey>/...` 자세 추출.
- **`lighthouse.baseUrl`** — Lighthouse 측정 대상 URL. init 안 기본 작성 = `.env.local` 안 `LIGHTHOUSE_BASE_URL` 자동 read 형태 (직접 hard-code 가능).
- **`lighthouse.pages`** — 측정 대상 페이지 목록 (path + name).
- **`lighthouse.auth`** — 인증 방식 (다음 sub-section 자세 안내).

자세한 안내: [docs/figma-config-guide.md](./docs/figma-config-guide.md).

**EN —** After `dsmonitor init` writes `dsmonitor/dsmonitor.config.ts`, fill the entries below to match your environment:

- **`projectRoot`** — usually `..` (the parent of `dsmonitor/`).
- **`scan.include` / `scan.exclude`** — analysis targets / exclusions (adjust to your folder layout).
- **`figma.designSystemFiles` + `figma.domainFiles`** — Figma file keys (when using Figma measurement). Extract `<fileKey>` from a Figma URL: `https://www.figma.com/design/<fileKey>/...`.
- **`lighthouse.baseUrl`** — Lighthouse target URL. By default `init` writes it to read `LIGHTHOUSE_BASE_URL` from `.env.local`; hard-coding is fine.
- **`lighthouse.pages`** — list of measurement pages (path + name).
- **`lighthouse.auth`** — authentication strategy (see the next sub-section).

Details: [docs/figma-config-guide.md](./docs/figma-config-guide.md).

#### Lighthouse 인증 흐름 / Lighthouse Auth Flow (0.4.0)

`dsmonitor.config.ts` 안 `lighthouse.auth` 필드 = discriminated union (3종 중 선택):

```ts
// 1. 인증 없음 — 공개 사이트
auth: { type: "none" }

// 2. ID/PW 기본 form login — dsmonitor 내장 어댑터 (lighthouse/auth/basic-form-login.js)
auth: { type: "basic", loginUrl: "/login" }

// 3. 커스텀 어댑터 — 자유 본문 (init 안 lighthouse/auth/custom.js 스켈레톤 자동 생성)
auth: { type: "custom", adapter: "./lighthouse/auth/custom.js" }
```

- **none** — `LIGHTHOUSE_BASE_URL` 만 필요. LHCI 가 인증 단계 없이 측정 진입.
- **basic** — dsmonitor 패키지 내장 어댑터 활용. 환경변수: `LIGHTHOUSE_LOGIN_URL` / `LIGHTHOUSE_TEST_ID` / `LIGHTHOUSE_TEST_PW`. selector 기본 추론 (`input[type="email"]` / `input[type="password"]` / `button[type="submit"]`) — 사이트 DOM 구조에 따라 `LIGHTHOUSE_BASIC_SELECTOR_*` 환경변수로 override 가능.
- **custom** — 다단계 인증 / OAuth / 세션 쿠키 복원 등 자유 흐름. `init` 안 스켈레톤 자동 생성 → `lighthouse/auth/custom.js` 본문 정정.

어댑터 인터페이스 (LHCI `puppeteerScript` + dsmonitor 확장):

```js
// 필수 — LHCI 호환 (각 측정 URL 진입 전 호출)
module.exports = async (browser, context) => { /* ... */ };

// 선택 — summary.json 안 메타데이터 누적 (run.js 가 require 후 호출)
module.exports.getMetadata = () => ({
  authType: "custom",
  testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
  // ... 자유 필드
});
```

**EN —** `dsmonitor.config.ts` exposes `lighthouse.auth` as a 3-way discriminated union:

```ts
auth: { type: "none" }                                              // public site
auth: { type: "basic", loginUrl: "/login" }                         // built-in ID/PW adapter
auth: { type: "custom", adapter: "./lighthouse/auth/custom.js" }   // user-authored adapter
```

- **none** — only `LIGHTHOUSE_BASE_URL` is required. LHCI measures with no login step.
- **basic** — uses the package-internal `basic-form-login.js`. Reads `LIGHTHOUSE_LOGIN_URL` / `LIGHTHOUSE_TEST_ID` / `LIGHTHOUSE_TEST_PW`. Default selectors (`input[type="email"]` / `input[type="password"]` / `button[type="submit"]`) can be overridden with `LIGHTHOUSE_BASIC_SELECTOR_*` env vars.
- **custom** — for multi-step auth, OAuth redirects, cookie restoration, or anything bespoke. `init` writes a skeleton at `lighthouse/auth/custom.js` for you to fill in.

Adapter interface (LHCI `puppeteerScript` + dsmonitor extension):

```js
// Required — LHCI compatible (called before each measurement URL)
module.exports = async (browser, context) => { /* ... */ };

// Optional — adds metadata into summary.json (run.js requires the file and calls this)
module.exports.getMetadata = () => ({
  authType: "custom",
  testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
  // ... free-form fields
});
```

### 3. CLI 명령어 / CLI Commands

```bash
npx dsmonitor audit --all         # 통합 측정 chain (code + figma + Lighthouse + report + dashboard) / integrated chain (v0.3.0)
npx dsmonitor audit --all --skip-lighthouse  # 빠른 통합 측정 (Lighthouse 건너뜀) / fast integrated chain (skip Lighthouse)
npx dsmonitor audit               # code + figma 측정 (전체 cycle) / full cycle
npx dsmonitor audit --only code        # code만 / code only
npx dsmonitor audit --only figma       # figma만 (base JSON 필요) / figma only (requires base JSON)
npx dsmonitor audit --only lighthouse  # Lighthouse만 (v0.3.1) / Lighthouse only (v0.3.1)
npx dsmonitor audit --baseline    # 정식 baseline 모드 / official baseline mode (baseline-YYYY-MM-DD.json)
npx dsmonitor report              # markdown 재생성 / regenerate markdown
npx dsmonitor dashboard           # dashboard html 재빌드 (사이드카 plugin 자동 검색) / rebuild dashboard html (auto-discovers sidecar plugins)
npx dsmonitor export-migration --frame=<comment> [--ds=<label>]
npx dsmonitor baseline-lint       # ESLint forbidden class baseline 생성 / generate ESLint forbidden class baseline
```

#### 측정 명령 차이 / Measurement Command Differences

사용자 측 `package.json` 안 npm scripts 권고 패턴 / Recommended npm scripts in user-side `package.json`:

| 명령 / Command | baseline-{date}.json 생성 / Creates baseline JSON | dashboard 반영 / Reflected in dashboard | 사용 시점 / When to use |
|---|---|---|---|
| `npx dsmonitor audit --all --baseline` | ✓ | ✓ | **권고 (v0.3.0) / Recommended** — 통합 측정 chain (code + figma + Lighthouse + report + dashboard 자동 chain) / Integrated measurement chain |
| `npx dsmonitor audit --all --baseline --skip-lighthouse` | ✓ | ✓ | 빠른 통합 측정 (Lighthouse 건너뜀, ~1-2분) / Fast integrated chain (skip Lighthouse) |
| `npx dsmonitor audit && report && dashboard` | ✗ | ✓ | 빠른 측정 + dashboard 재생성 (옛 방식) / Quick measure + rebuild (legacy) |
| `npx dsmonitor audit --baseline && report && dashboard` | ✓ | ✓ | baseline 갱신 + dashboard (옛 방식) / Update baseline + dashboard (legacy) |
| `npx dsmonitor audit --only code` | ✗ | ✗ | code만 빠르게 / code only |
| `npx dsmonitor audit --only figma` | ✗ | ✗ | figma raw (`figma-instances-{date}.json`) / figma raw only |
| `npx dsmonitor audit --only lighthouse` | ✗ | ✓ | Lighthouse만 측정 (~25분 소요, dashboard 측 lighthouse 부분 갱신, v0.3.1) / Lighthouse only (~25 min, refreshes lighthouse section in dashboard, v0.3.1) |
| `node node_modules/dsmonitor/lighthouse/run.js` | — | ✓ (별도 input / separate input) | lighthouse 측정 단독 — 옛 호출 방식 (~25분 / ~25 min, legacy invocation) |

**짚어드릴 점 / Notes**:
- `audit --all` 권고 (v0.3.0) / `audit --all` is recommended (v0.3.0) — 한 번 명령으로 code + figma + Lighthouse + report + dashboard 자동 chain. 사전 준비 = `dsmonitor/lighthouse/config.js` + auth 어댑터 + `.env.local` 안 `LIGHTHOUSE_*` 환경변수 (Lighthouse 사용 시점만 필수). / Single command runs the full chain. Lighthouse setup required only when using it.
- `--only figma` 단독 = `figma-instances-{date}.json` (raw) 만 생성. dashboard input 누락 / standalone `--only figma` only writes `figma-instances-{date}.json` (raw); not picked up by dashboard.
- dashboard 흐름 = 가장 최근 `baseline-*.json` (prefix 매칭) read / dashboard reads the latest `baseline-*.json` (prefixed file).
- 자세한 안내 / Details: [docs/measurement-flow.md](./docs/measurement-flow.md).

#### Lighthouse 단독 실행 / Lighthouse Direct Invocation

`audit --all` 안 Lighthouse 자동 호출 외에도 단독 호출 가능 — 옛 방식 (v0.3.0 이전) 호환 + 디버그 / 재측정 시점 활용.

**EN —** Beyond Lighthouse being chained via `audit --all`, the script can also be invoked directly — for legacy compatibility (pre-v0.3.0) and debug / re-measurement scenarios.

```bash
node node_modules/dsmonitor/lighthouse/run.js
```

| 항목 / Item | 자세 / Detail |
|---|---|
| 시간 소요 / Duration | ~25분 (10 URL × 3 run = 30 LHR) / ~25 minutes (10 URLs × 3 runs = 30 LHRs) |
| 사전 준비 / Prerequisites | `dsmonitor/lighthouse/config.js` (LHCI config) + `dsmonitor/lighthouse/auth/<project>.js` (Puppeteer 자동 로그인 어댑터) + `dsmonitor/.env.local` 안 `LIGHTHOUSE_BASE_URL` / `LIGHTHOUSE_TEST_ID` / `LIGHTHOUSE_TEST_PW` / `LIGHTHOUSE_ZONE_ACCOUNT_UUID` / `LIGHTHOUSE_ZONE_ACCOUNT_LABEL` 환경변수 |
| 출력 / Output | `dsmonitor/lighthouse/reports/{date}/` (LHR raw + `summary.json` + `manifest.json`) |
| 자세 안내 / Details | [docs/lighthouse-ci-integration.md](./docs/lighthouse-ci-integration.md) |

#### export-migration 자세 / export-migration Details (v0.3.2 추가)

Figma 안 특정 frame 측 instance 측 마이그레이션 CSV 출력 — 새 DS / 옛 DS 마이그레이션 작업 진입 시점 source 정보. 디자이너 / 퍼블리셔 측 활용 흐름.

**EN —** Exports a CSV of instances inside a specific Figma frame — useful as source data for new-DS / legacy-DS migration work. Used by designers / publishers.

```bash
npx dsmonitor export-migration --frame=<frame-comment> [--ds=<label>]
```

| 항목 / Item | 자세 / Detail |
|---|---|
| **동작 / Behavior** | `figma-instances-{date}.json` (v0.14 출력) 측 read + frame 필터링 + ds 필터링 + figmaUrl 자동 조립 → CSV 출력 |
| **`--frame=<comment>`** | Figma 안 frame 측 comment 또는 name 측 필터링 (예: `--frame=Test-Perform`). 정확 일치 — 부분 일치 X |
| **`--ds=<label>` (옵션)** | DS label 측 필터링. 기본값 = `ds-legacy`. 다른 값 = `ds-new` / `unmatched` / `all` |
| **사전 준비 / Prerequisites** | `npx dsmonitor audit --baseline` 측 figma 측정 끝 → `dsmonitor/reports/figma-instances-{date}.json` 자동 생성 끝난 상태 |
| **출력 / Output** | `dsmonitor/reports/migration/{frame}-{ds}-YYYY-MM-DD.csv` (frame name + ds label 측 안전 처리 — 영문/숫자/하이픈/언더스코어 외 문자 = 언더스코어 정정) |
| **CSV 컬럼 / CSV Columns** | `nodeId` / `componentName` / `instanceName` / `dsLabel` / `contextPath` / `figmaUrl` (자동 조립 — 직접 클릭 진입 가능) |
| **figmaUrl 자동 조립** | `https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId 콜론 → 하이픈}` 형태 |
| **활용 시점 / When to use** | 새 DS / 옛 DS 마이그레이션 작업 진입 시점 — frame 측 자세 instance 목록 + Figma 직접 진입 link 측 작업 정보 |
| **frame name 측 가져오기 / Frame discovery** | Figma 측 frame 직접 확인 또는 `dsmonitor/reports/figma-instances-{date}.json` 측 자세 검토 |

### DS 파일 라벨 / DS File Labels

`figmaDesignSystemFiles` 라벨 형태 = 사용자 자유 결정 (예: `"v1"`, `"v2"`, `"main"`, `"legacy"`). dashboard 안 사용자 라벨 그대로 표시.

**EN —** `figmaDesignSystemFiles` labels are free-form (e.g. `"v1"`, `"v2"`, `"main"`, `"legacy"`). The dashboard displays user-defined labels verbatim.

#### Primary 명시 / Primary specification (0.2.0)

DS 2개 이상이면 정확히 1개에 `primary: true` 명시 필수 / When you have 2 or more DS files, exactly one must have `primary: true`:

```typescript
export const figmaDesignSystemFiles = [
  { url: "...", label: "v1" },
  { url: "...", label: "v2", primary: true },   // ← primary 명시
];
```

DS 1개뿐 = 자동 primary (`primary` 필드 생략 가능) / Single DS = auto-primary (omit `primary` field).

#### 검증 규칙 / Validation rules

| 상태 / State | 처리 / Handling |
|---|---|
| DS 1개 (primary 생략) / 1 DS, no primary | 자동 primary / auto-primary |
| DS 2개 이상 + primary 0개 / 2+ DS, 0 primaries | 에러 throw / throws error |
| DS 2개 이상 + primary 1개 / 2+ DS, 1 primary | 정상 / OK |
| DS 2개 이상 + primary 2개 이상 / 2+ DS, 2+ primaries | 에러 throw / throws error |

### Migration from 0.1.x

0.1.x 흐름 = `ds-new` 라벨이 자동 primary 처리. 0.2.0 부터 = 명시 필수. 옛 사용자 측 `dsmonitor.config.local.ts` 안 `ds-new` 항목에 `primary: true` 1줄 추가:

```diff
- { url: "...", label: "ds-new" },
+ { url: "...", label: "ds-new", primary: true },
```

라벨 형태 = 그대로 유지 가능 (`ds-new` / `ds-legacy`). 새 라벨로 자유 변경.

**EN —** 0.1.x auto-treated `ds-new` label as primary. 0.2.0 requires explicit specification. Existing users: add `primary: true` 1 line to the `ds-new` entry in `dsmonitor.config.local.ts`. Labels themselves can stay (`ds-new` / `ds-legacy`) or be freely renamed.

### Phase 0.6 호환성 / Compatibility (B 가설 / B hypothesis)

- **codebase 측정 = 필수** — dsmonitor 자체 정체성 (코드 분석 도구)
- **figma / Lighthouse 측정 = optional** — config 안 빠지면 자동 hide. 다른 프로젝트 도입 시점에 부담 없음.

**EN —**

- **codebase measurement = required** — core identity of dsmonitor (a code-analysis tool)
- **figma / Lighthouse measurement = optional** — auto-hidden when missing from config. Lowers adoption cost in other projects.

### Lighthouse / 인증 어댑터 / Authentication Adapter

Lighthouse 인증 흐름 자세 = 위 **빠른 시작 §2 안 "Lighthouse 인증 흐름 / Lighthouse Auth Flow" sub-section** 참조. `dsmonitor init` 안 인증 방식 select (none / basic / custom) → `dsmonitor/lighthouse/config.js` 자동 생성 + (custom 케이스) `dsmonitor/lighthouse/auth/custom.js` 스켈레톤 자동 생성.

**EN —** See **"Lighthouse Auth Flow" under Quick Start §2** for the full guide. `dsmonitor init` prompts for an auth type (none / basic / custom), generates `dsmonitor/lighthouse/config.js`, and (for the custom case) writes a skeleton at `dsmonitor/lighthouse/auth/custom.js`.

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
- `metrics` — 측정 항목별 ON/OFF / Per-area ON/OFF
- `figma` / `lighthouse` — 선택 / Optional. Figma 는 `FIGMA_API_TOKEN` 필요 / Figma needs `FIGMA_API_TOKEN`
- `thresholds` — good/warn 임계값 / good/warn thresholds
- `reportStatus` — Phase 진척 배지 / Phase progress badge
- `measurementHistory` — 측정 도구 자체의 변경 이력 (역순 정렬) / Change history of the measurement tool itself (reverse-chronological)

## ESLint plugin 사용법 / ESLint Plugin Usage

사전 install (한 번만) / Prerequisite install (one-time):

```bash
npm install --save-dev dsmonitor eslint-plugin-dsmonitor
```

`.eslintrc.js`:

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

`policyConfig.plugins`는 `["dsmonitor"]`를 반환. ESLint legacy config가 `eslint-plugin-dsmonitor` (wrapper 패키지)를 자동 검색.

**EN —** `policyConfig.plugins` returns `["dsmonitor"]`. ESLint legacy config auto-resolves to `eslint-plugin-dsmonitor` (wrapper package).

ratchet 동작 / Ratchet behavior:

- `baselinePath` JSON 의 `files` 에 등록된 파일 → `warn` / Files listed in `baselinePath` JSON's `files` → `warn`
- 그 외 (신규 파일 포함) → `error` / Otherwise (including new files) → `error`

## presets/ 4종 비교 / 4-Preset Comparison

| preset                   | 권장 (allowed)                  | 금지 (forbidden)                     | 적합 프로젝트 / Suitable for                                                                                 |
| ------------------------ | ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `scss-project.js`        | SCSS / CSS imports              | Bootstrap utility / Tailwind utility | SCSS 기반 (Bootstrap·Tailwind 레거시 정리 대상) / SCSS-based (with legacy Bootstrap·Tailwind cleanup target) |
| `bootstrap-project.js`   | Bootstrap (utility + component) | Tailwind / inline                    | Bootstrap 우선 / Bootstrap-first                                                                             |
| `tailwind-project.js`    | Tailwind utility                | Bootstrap / inline                   | Tailwind 우선 / Tailwind-first                                                                               |
| `css-modules-project.js` | CSS Modules import              | global utility                       | 모듈화 우선 / Modularity-first                                                                               |

자세한 차이: 각 파일 상단 docstring + [docs/eslint-rules.md](./docs/eslint-rules.md).

**EN —** Details: each preset's top-level docstring + [docs/eslint-rules.md](./docs/eslint-rules.md).

`presets/configs/` — 프레임워크 + 스타일 조합별 `dsmonitor.config.ts` 템플릿 (next-pages-scss / next-app-css-modules / vite-react-tailwind 등).

**EN —** `presets/configs/` — `dsmonitor.config.ts` templates per framework + style combination (next-pages-scss / next-app-css-modules / vite-react-tailwind, etc.).

## 출력물 위치 / Output Locations

| 파일 / File                                               | 내용 / Content                                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `dsmonitor/reports/baseline-YYYY-MM-DD.json`              | 측정 결과 (정식 baseline) / Measurement result (official baseline)                                   |
| `dsmonitor/reports/YYYY-MM-DD.json`                       | non-baseline (gitignored)                                                                            |
| `dsmonitor/reports/figma-instances-YYYY-MM-DD.json`       | Figma instance level raw (v0.14) — frame 별 nodeId / componentName / dsLabel / contextPath           |
| `dsmonitor/reports/dashboard-YYYY-MM-DD.html`             | 4 탭 dashboard / 4-tab dashboard (Summary / Code / Lighthouse / Figma, since v0.9)                   |
| `dsmonitor/reports/migration/{frame}-{ds}-YYYY-MM-DD.csv` | 마이그레이션 CSV / Migration CSV (v0.14, `dsmonitor export-migration` output)                        |
| `dsmonitor/docs/baseline.md`                              | markdown 리포트 (자동 생성, 수동 편집 금지) / markdown report (auto-generated, do not edit manually) |
| `dsmonitor/docs/overview-for-stakeholders.md`             | 비개발자용 간결 요약 / Concise summary for non-developers                                            |
| `dsmonitor/lighthouse/reports/YYYY-MM-DD/manifest.json`   | LHCI manifest                                                                                        |
| `dsmonitor/lighthouse/reports/YYYY-MM-DD/summary.json`    | 페이지별 4점수 요약 / Per-page 4-score summary                                                       |
| `dsmonitor/lighthouse/reports/YYYY-MM-DD/*-report.html`   | 개별 LHR HTML (브라우저로 확인) / Individual LHR HTML (open in browser)                              |

## 더 읽기 / Further Reading

- [docs/figma-config-guide.md](./docs/figma-config-guide.md) — Figma config 작성법 (DS 파일 + 도메인 파일 등록 + 마이그레이션 CSV 추출) / Figma config authoring (DS file + domain file registration + migration CSV export)
- [docs/eslint-rules.md](./docs/eslint-rules.md) — ESLint 룰 상세 + ratchet 동작 / ESLint rule details + ratchet behavior
- [docs/eslint-ci-integration.md](./docs/eslint-ci-integration.md) — CI 통합 패턴 / CI integration patterns
- [docs/lighthouse-ci-integration.md](./docs/lighthouse-ci-integration.md) — Lighthouse CI 통합 / Lighthouse CI integration
- [docs/plugin-development.md](./docs/plugin-development.md) — 사이드카 plugin 개발 참고 문서 (정보 위치 / 정보 형식 / 자동 표시 / 검증 / 예시 코드 — v0.15) / Sidecar plugin development reference (data location / format / auto-display / validation / example code — v0.15)
- [docs/methodology.md](./docs/methodology.md) — 측정 방법론 (**Phase B 작성 예정** — 현재 placeholder) / Measurement methodology (**to be written in Phase B** — currently a placeholder)

## Acknowledgments

본 프로젝트 = 다음 공동 개발자분들 도움으로 작성:

**EN —** This project was built with help from the following contributors:

- **[chenjingdev](https://github.com/chenjingdev)** — 기획 도움 / Planning support
- **[june0-K](https://github.com/june0-K)** — 기획 도움 / Planning support
- **[servantcdh](https://github.com/servantcdh)** — 플러그인 개발 도움 / Plugin development support

## 라이선스 / License

MIT — [LICENSE](./LICENSE)
