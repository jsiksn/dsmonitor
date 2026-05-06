# Changelog

본 형식 = [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 형식을 따름. 버전 규칙 = [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**EN —** Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.6] — 2026-05-06

### 정정 / Fixed

- **한 —** `bin/` 폴더 안 자료(`lint-summary.js`, `lint-update-baseline.js`, `report.js`, `lib/lint-shared.js`)가 패키지 root의 `"type": "module"` 자료로 인해 ES module로 처리되어 `require()` 호출 시 throw하는 결함 정정. `bin/package.json` + `bin/lib/package.json` 안 `{"type": "commonjs"}` override 추가하여 해당 폴더 안 자료를 CJS로 처리.
- **한 —** `bin/report.js` 안 `tsx src/cli.ts` 호출 자료 정정. npm publish 자료 안 `src/` 폴더 미포함 자료라 `ERR_MODULE_NOT_FOUND` 발생. `dist/cli.js` 자료 자료 자료 변경 (`process.execPath` 안 직접 spawn).
- **EN —** Fixed CJS bin scripts (`lint-summary.js`, `lint-update-baseline.js`, `report.js`, `lib/lint-shared.js`) being treated as ES modules due to package root's `"type": "module"` setting, causing `require()` calls to throw. Added `{"type": "commonjs"}` override in `bin/package.json` and `bin/lib/package.json` to ensure scripts in those directories are processed as CommonJS.
- **EN —** Fixed `bin/report.js` invoking `tsx src/cli.ts` which fails on the published package because the `src/` directory is excluded from publish. Now spawns `dist/cli.js` directly via `process.execPath`.

[0.1.6]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.6

## [0.1.5] — 2026-05-06

### Changed

- **Dashboard UI 안 프로젝트명 자동 read** — `dsmonitor.config.ts` 안 `projectName` field 추가 또는 `package.json` 안 `name` 자료 자동 read. 본 시점까지 hardcoded 자료 (`monorepo`) 정정.
- **코드 주석 안 generic 자료 정정** — `lighthouse/run.js` / `presets/configs/next-pages-scss.ts` / `presets/scss-project.js` / `src/types.ts` 안 hardcoded `monorepo` → generic 자료.
- **README + CHANGELOG 한국어 표현 자연화 (추가)** — 직전 0.1.3 publish 자료 외 발견 자료 정정 ("rename 끝" → "rename 완료", "throw 영역 영역" → "throw 발생", "표시 빠짐" → "표시 안 됨", "발행 빠짐" → "발행 없음" 등) + README markdown 표 padding 자연화.

### Fixed

- **`npm pkg fix` 적용** — `bin[dsmonitor]` script name auto-corrected warning 정정 (`"./dist/cli.js"` → `"dist/cli.js"`).

**EN —**

### Changed

- **Dashboard UI now reads project name automatically** — added `projectName` field to `dsmonitor.config.ts` or auto-reads from `package.json` `name` field. Replaces previously hardcoded `monorepo` value.
- **Generic comments in code** — replaced hardcoded `monorepo` with generic placeholder in `lighthouse/run.js`, `presets/configs/next-pages-scss.ts`, `presets/scss-project.js`, and `src/types.ts`.
- **Additional naturalization of Korean expressions in README and CHANGELOG** — follow-up to 0.1.3 ("rename 끝" → "rename 완료", "throw 영역 영역" → "throw 발생", "표시 빠짐" → "표시 안 됨", "발행 빠짐" → "발행 없음") + README markdown table padding cleanup.

### Fixed

- **Applied `npm pkg fix`** — resolved `bin[dsmonitor]` script name auto-correction warning (`"./dist/cli.js"` → `"dist/cli.js"`).

[0.1.5]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.5

## [0.1.4] — 2026-05-04

### Added

- **README 안 dashboard 스크린샷 추가** — `docs/images/dashboard.png` (1600 × 906 px, ~238 kB).

**EN —**

- **Added dashboard screenshot to README** — `docs/images/dashboard.png` (1600 × 906 px, ~238 kB).

[0.1.4]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.4

## [0.1.3] — 2026-05-04

### Changed

- **README + CHANGELOG 한국어 표현 자연화** — 91건 단어 정리 ("영역" 76 / "본질" 6 / "정합" 9) + 추가 2건 (이중 반복 1 / 중복 단어 1).

**EN —**

- **Naturalized Korean expressions in README and CHANGELOG** — 91 word edits (영역 76 / 본질 6 / 정합 9) plus 2 additional cleanups (double-word repetition / duplicate phrase).

### Added

- **기획 도움 contributor 추가** — june0-K (https://github.com/june0-K).

**EN —**

- **Added planning contributor** — june0-K (https://github.com/june0-K).

[0.1.3]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.3

## [0.1.2] — 2026-05-04

### Changed

- **README + CHANGELOG 한/영 병기** — 각 섹션은 한글이 우선 + `**EN —**` prefix 영문이 부가. npm 페이지 자동 노출과 호환.
- **Acknowledgments 섹션 신규** — README의 License 섹션 위. 공동 개발자 (chenjingdev / servantcdh) 명시.
- **`package.json`의 `contributors` 필드 추가** — chenjingdev (planning) / servantcdh (plugin development).

**EN —**

- **README + CHANGELOG bilingual (KO/EN)** — Each section has Korean primary + `**EN —**` prefix English secondary. Aligns with npm page auto-display.
- **Acknowledgments section added** — Above the License section in README. Lists co-contributors (chenjingdev / servantcdh).
- **`package.json` `contributors` field added** — chenjingdev (planning) / servantcdh (plugin development).

### Note

- 본 의뢰 범위 외 (`docs/` / `templates/` / `cli.ts` 출력 메시지) = 한글 그대로. 다음 세션 안 검토 가능.
- **EN —** Out of scope (`docs/` / `templates/` / `cli.ts` output messages) = Korean only. May be revisited in a later session.

[0.1.2]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.2

## [0.1.1] — 2026-05-04

### Changed (rename)

- **패키지 이름 = vitaui → dsmonitor** — npm 안 vitaui / vita-ui 유사 이름 + dsmon / bson / json 유사 이름 충돌 회피 목적. 0.1.0 = `dsmonitor@0.1.0`로 발행 (package.json name만 변경), 0.1.1 = 모든 자료 안 vitaui 단어 → dsmonitor로 통일.
- **bin 명령어** = `vitaui` → `dsmonitor` (`npx dsmonitor audit / init / dashboard / ...`)
- **사용자 측 폴더** = `vitaui/` → `dsmonitor/` (init이 자동 생성)
- **templates** = `vitaui.config.ts.tpl` → `dsmonitor.config.ts.tpl`
- **import** = `from "vitaui"` → `from "dsmonitor"` / `require("vitaui/presets/...")` → `require("dsmonitor/presets/...")` / `require("eslint-plugin-ui-health")` → `require("dsmonitor/eslint")`
- **GitHub repo** = vitaui → dsmonitor (rename 완료, https://github.com/jsiksn/dsmonitor)

**EN —**

- **Package name = vitaui → dsmonitor** — Avoiding collisions with vitaui / vita-ui look-alikes and dsmon / bson / json look-alikes on npm. 0.1.0 was published as `dsmonitor@0.1.0` (package.json name only renamed); 0.1.1 renames every `vitaui` mention across all files to `dsmonitor`.
- **bin command** = `vitaui` → `dsmonitor` (`npx dsmonitor audit / init / dashboard / ...`)
- **User-side folder** = `vitaui/` → `dsmonitor/` (auto-created by `init`)
- **templates** = `vitaui.config.ts.tpl` → `dsmonitor.config.ts.tpl`
- **import** = `from "vitaui"` → `from "dsmonitor"` / `require("vitaui/presets/...")` → `require("dsmonitor/presets/...")` / `require("eslint-plugin-ui-health")` → `require("dsmonitor/eslint")`
- **GitHub repo** = vitaui → dsmonitor (renamed, https://github.com/jsiksn/dsmonitor)

### Fixed

- **minimal config 보강** — 0.1.0 안 사용자 측 `dsmonitor.config.ts` 작성 시점에 audit --only code 실행 시 throw 발생. templates/dsmonitor.config.ts.tpl 안 누락 항목 모두 추가:
  - `framework: { id: "react" }` (analyzeCodebase 안 framework adapter 결정 — 없으면 throw)
  - `globalStyleSources` (orphan class 분류에서 글로벌 스타일 검색)
  - `hardcodedValues` 안 `colorPatterns` / `scssVariableUsagePatterns` / `scssVariableDefFiles` 형식 일치 (RegExp 배열)
  - `migrationTargets` 안 `Record<string, { aliases: string[]; nativeTags: string[] }>` 형식 일치
  - `migrationMinClassLength` (마이그레이션 후보 안 최소 className 길이)
  - `metrics` 안 모든 토글 (`tsMigration` / `dsCoverage` / `migrationCandidates` / `stylingDistribution` / `hardcodedColors` / `scssVariableCompliance` / `figmaAnalysis`)
  - `thresholds` 안 모든 항목에 `direction: "higher" | "lower"` 추가 (good/warn 비교 방향)
  - `designSystem.componentExts` (cli.js의 isComponentFile과 일치)

**EN —** Minimal config alignment — 0.1.0 threw errors at `audit --only code` when users wrote a minimal `dsmonitor.config.ts`. `templates/dsmonitor.config.ts.tpl` now includes every required field:

- `framework: { id: "react" }` (analyzeCodebase chooses the framework adapter — throws if missing)
- `globalStyleSources` (used by orphan-class classification to scan global styles)
- `hardcodedValues` with `colorPatterns` / `scssVariableUsagePatterns` / `scssVariableDefFiles` shape (RegExp arrays)
- `migrationTargets` shape `Record<string, { aliases: string[]; nativeTags: string[] }>`
- `migrationMinClassLength` (minimum className length to qualify as a migration candidate)
- `metrics` toggles (`tsMigration` / `dsCoverage` / `migrationCandidates` / `stylingDistribution` / `hardcodedColors` / `scssVariableCompliance` / `figmaAnalysis`)
- `thresholds` entries each include `direction: "higher" | "lower"` (good/warn comparison direction)
- `designSystem.componentExts` (matches isComponentFile in cli.js)

### Note

- **[0.1.0] historical entry** — [0.1.0] entry는 historical 그대로 보존 (vitaui 단어 = 0.1.0 시점 명칭).
- **EN —** [0.1.0] entry kept as historical — `vitaui` mentions are preserved as the legacy name at that point in time.

[0.1.1]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.1

## [0.1.0] — 2026-XX-XX

> ⓘ 본 entry의 `vitaui` = legacy name (0.1.1 안에서 `dsmonitor`로 rename 완료). historical 기록 그대로 보존.
>
> **EN —** `vitaui` mentions in this entry refer to the legacy name (renamed to `dsmonitor` in 0.1.1). Preserved as historical.

첫 npm 발행. 직전 monorepo 안 file: 의존에서 분리 — 외부 사용자 측 `npm install vitaui`로 활용 가능.

**EN —** First npm release. Extracted from a `file:` dependency inside the monorepo — external users can `npm install vitaui` (legacy name).

### Added

- **`vitaui` 단일 bin** subcommand (audit / report / dashboard / export-migration / baseline-lint / init)
- **`vitaui init`** subcommand — 사용자 측 vitaui/ 폴더 인터랙티브 부트스트랩 (Lighthouse / Figma 옵션 prompt + @lhci/cli 자동 install + templates 토큰 치환)
- **사이드카 plugin 시스템** (v0.15) — 외부 측정 자료가 dashboard에 자동 표시
  - `vitaui/reports/plugins/{id}/{date}.json` 자동 검색 (id 알파벳 순)
  - 자료 형식 약속 (id / label / measuredAt / summary / details / meta)
  - plugin 1개당 Summary Layer 04+ 자동 추가 + plugin 탭 동적 생성
  - schema 검증 (필수 필드 / id 불일치 / JSON 형식 오류) 빨간 알림 + stale (7일+) 회색 배지
  - `meta` 필드 — 자료 형식 약속만 유지, 0.1.0 안 dashboard 표시 안 됨 (0.2.0 안 추가 검토)
- **외부 plugin 개발자 참고 문서** (`docs/plugin-development.md`) — npm 사용자 / 추후 다른 plugin 개발자용
- **ESLint plugin 통합** — `vitaui/eslint` subpath (별도 패키지 발행 없음). `eslint-plugin-ui-health` 흡수.

**EN —**

- **Single `vitaui` bin** with subcommands (audit / report / dashboard / export-migration / baseline-lint / init)
- **`vitaui init`** subcommand — interactive bootstrap of the user-side `vitaui/` folder (Lighthouse / Figma prompts + `@lhci/cli` auto-install + template token substitution)
- **Sidecar plugin system** (v0.15) — external measurement data auto-displayed in the dashboard
  - Auto-discovers `vitaui/reports/plugins/{id}/{date}.json` (sorted by id alphabetically)
  - Data format contract (id / label / measuredAt / summary / details / meta)
  - One Layer 04+ auto-added per plugin in the Summary tab + dynamic plugin tab
  - Schema validation (required fields / id mismatch / JSON format errors) → red alert; stale (7+ days) → gray badge
  - `meta` field — preserved by contract; not displayed in 0.1.0 dashboard (revisited in 0.2.0)
- **External plugin author reference** (`docs/plugin-development.md`) — for npm users and future plugin authors
- **ESLint plugin integrated** — under the `vitaui/eslint` subpath (no separate package). Absorbs `eslint-plugin-ui-health`.

### Changed

- **빌드** — tsup 도입 / ESM only / dts 출력 / sourcemap 출력. `bin/vitaui` 단일 진입로 (shebang + chmod +x).
- **Header 측정 시점** — Code / Figma / Lighthouse 3행 stamp 삭제. 측정 시점은 각 Layer stamp + 각 탭 인라인 2곳에서만.
- **각 탭 측정 시점 표시 통일** — Figma 인라인 패턴과 일치 (`.tab-stamp` 클래스). Code 탭 신규 추가, Lighthouse 박스 → 인라인 (URL / Run / Base URL 박스 그대로 유지), Plugin 별도 헤더 → 본문 시작 인라인.
- **검증 실패 plugin Summary Layer 압축** — layer-head 만 (사유 본문은 plugin 탭 PluginErrorView에서만).

**EN —**

- **Build** — tsup adopted / ESM only / dts emit / sourcemap. Single `bin/vitaui` entry (shebang + `chmod +x`).
- **Header measurement timestamp** — 3-row Code / Figma / Lighthouse stamp removed. Timestamps now appear only at each Layer stamp + each tab's inline location.
- **Per-tab timestamp unified** — Figma inline pattern (`.tab-stamp` class). Code tab newly added; Lighthouse box → inline (URL / Run / Base URL boxes kept); Plugin separate header → inline at content top.
- **Validation-failure plugin Summary Layer compacted** — layer-head only (reason text shown only in PluginErrorView inside the plugin tab).

### Build / Publish

- `engines.node` `>=18.0.0`
- `type: "module"` — ESM 진입로 / ESM entry
- `peer optional`: `eslint` / `@lhci/cli` / `typescript` (활용 시점에만 install) / install only when used
- `dotenv` dependencies 추가 (이전 monorepo 호이스팅 의존 대체) / Added (replaces prior monorepo hoisting dependency)
- `tsx` dependencies 추가 — 사용자 측 `vitaui.config.ts` (.ts) 정상 작동 / Added — makes user-side `vitaui.config.ts` (`.ts`) work out of the box
- `prompts` dependencies 추가 — `vitaui init` 인터랙티브 prompt / Added — for `vitaui init` interactive prompts
- `eslint/` + `presets/` 폴더 = raw 그대로 발행 (`type: "commonjs"` 별도 package.json) — 사용자 측 `.eslintrc.js` (CJS) 호환 / `eslint/` + `presets/` shipped raw (each with own `package.json` `type: "commonjs"`) — compatible with user-side `.eslintrc.js` (CJS)
- `lighthouse/` 폴더 = files 화이트리스트 안 포함 — `lighthouse/run.js` (CJS) 그대로 / `lighthouse/` is in the files whitelist — `lighthouse/run.js` (CJS) shipped as-is

### Known limitations (0.1.0)

- `vitaui init` 안 npm only (yarn / pnpm 감지 없음) — 0.2.0에서 추가 검토 / `vitaui init` is npm-only (no yarn / pnpm detection) — to be revisited in 0.2.0
- plugin meta가 dashboard에 표시 안 됨 — 0.2.0에서 추가 검토 / Plugin `meta` not displayed in dashboard — to be revisited in 0.2.0
- 시계열 (과거 plugin 자료 누적 차트) 미지원 — 0.2.0에서 추가 검토 / Time-series (cumulative past plugin data charts) not yet — to be revisited in 0.2.0

### measurementHistory

- `measurementHistory` v0.1 ~ v0.15 — 측정 도구 자체 변경 이력 보존 (`vitaui/vitaui.config.ts` 안 `measurementHistory` 필드, 사용자 측 자체 측정 이력)
- **EN —** `measurementHistory` v0.1 ~ v0.15 — internal change history of the measurement tool itself (preserved in the `measurementHistory` field of `vitaui/vitaui.config.ts`).

[0.1.0]: https://github.com/jsiksn/vitaui/releases/tag/v0.1.0
