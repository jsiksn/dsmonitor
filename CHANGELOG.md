# Changelog

본 형식 = [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 형식을 따름. 버전 규칙 = [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**EN —** Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-05-07

### Breaking change / 자료 변경

- **한 —** `figmaDesignSystemFiles` 안 primary DS 결정 흐름 변경. 0.1.x 자료 = `ds-new` 라벨 자료 자동 primary 처리. 0.2.0 자료 = `primary: true` 자료 명시 자료. 라벨 자료 = 사용자 자유 결정 가능.
- **EN —** Changed how primary DS is determined in `figmaDesignSystemFiles`. In 0.1.x, the `ds-new` label was auto-treated as primary. From 0.2.0, primary must be explicitly specified via `primary: true`. Labels are now free-form / user-defined.

### 추가 / Added

- **한 —** `FigmaDesignSystemFile.primary?: boolean` 필드 추가 (`src/types.ts`).
- **한 —** primary 검증 흐름 추가 (`src/dashboard/transformers/baseline-to-figma-data.ts` `resolvePrimaryDsLabel`):
  - DS 1개 = 자동 primary (검증 안 함)
  - DS 2개 이상 + primary 0개 = 에러 throw
  - DS 2개 이상 + primary 2개 이상 = 에러 throw
  - DS 2개 이상 + primary 정확히 1개 = 정상
- **한 —** `FigmaTabData` 안 `primaryLabel: string | null` + `nonPrimaryLabels: string[]` 필드 추가.
- **한 —** `SummaryTabData.figma` 안 같은 두 필드 추가 (옛 `dsNew*` / `dsLegacy*` 변수 이름은 호환 자료 보존 — primary / 첫 non-primary 자료 자료 자료).
- **EN —** Added `FigmaDesignSystemFile.primary?: boolean` field (`src/types.ts`).
- **EN —** Added primary validation in `resolvePrimaryDsLabel`:
  - 1 DS = auto-primary (no validation)
  - 2+ DS + 0 primaries = throws error
  - 2+ DS + 2+ primaries = throws error
  - 2+ DS + exactly 1 primary = OK
- **EN —** Added `primaryLabel: string | null` + `nonPrimaryLabels: string[]` to `FigmaTabData`.
- **EN —** Added the same two fields to `SummaryTabData.figma` (legacy `dsNew*` / `dsLegacy*` variable names retained for component compatibility — they now point to primary / first non-primary).

### 변경 / Changed

- **한 —** dashboard 안 라벨 hardcoded 자료 (`ds-new` / `ds-legacy`) 자료 자료. 사용자 자료 라벨 자료 자료 자료 표시. `figma-tab.jsx` (TokenMatchSection / TokenMatrixSection / DsInstanceShareSection / MigrationPrioritySection / ComponentMatchSection) + `root.jsx` (Summary 탭 Layer 03) 자료 정정.
- **한 —** dashboard 안 "Primary" 영어 자료 자료 자료 안 함. 사용자 자료 라벨 + "기준" / "참고" 한글 자료 유지.
- **한 —** `enrichTokenMatrix(tm, primaryLabel, nonPrimaryLabels)` 자료 변경 — 옛 `inDs["ds-new"]` / `inDs["ds-legacy"]` hardcoded 자료 → primary / non-primary 자료 자료.
- **한 —** `markdown.ts` 안 DS 별 카드 정렬 = config 순서 자료 (옛 ds-new 우선 hardcoded 정렬 제거).
- **한 —** `src/cli/init.ts renderFigmaBlock()` 자료 안 라벨 안내 = 옛 `ds-new` / `ds-legacy` 권고 자료 → primary 명시 규칙 자료. 자료 자료 자료 = `"v1"` / `"v2"` 본질.
- **EN —** Removed hardcoded label references (`ds-new` / `ds-legacy`) in dashboard. User-defined labels are now displayed. Affected: `figma-tab.jsx` (TokenMatchSection / TokenMatrixSection / DsInstanceShareSection / MigrationPrioritySection / ComponentMatchSection) + `root.jsx` (Summary tab Layer 03).
- **EN —** The English word "Primary" is no longer displayed in the dashboard. User labels + "기준" / "참고" Korean labels retained.
- **EN —** `enrichTokenMatrix(tm, primaryLabel, nonPrimaryLabels)` signature change — old hardcoded `inDs["ds-new"]` / `inDs["ds-legacy"]` → primary / non-primary fields.
- **EN —** DS card ordering in `markdown.ts` now follows config order (removed legacy `ds-new` first hardcoded sort).
- **EN —** `src/cli/init.ts renderFigmaBlock()` label guidance switched from old `ds-new` / `ds-legacy` recommendation to a primary specification rule. Sample labels are now `"v1"` / `"v2"`.

### 마이그레이션 가이드 / Migration

- **한 —** 0.1.x 사용자 측 정정:
  ```diff
  // dsmonitor.config.local.ts
  - { url: "...", label: "ds-new" },
  + { url: "...", label: "ds-new", primary: true },
  ```
  라벨 자료 = `ds-new` / `ds-legacy` 그대로 유지 가능 (자료 자료 자료 사용자 자료 결정). 정정 자료 자료 자료 자료 = `npm install --save-dev dsmonitor@0.2.0` 자료 자료 자료 자료. README 안 "Migration from 0.1.x" 영역 자료.
- **EN —** 0.1.x users — required edit:
  ```diff
  // dsmonitor.config.local.ts
  - { url: "...", label: "ds-new" },
  + { url: "...", label: "ds-new", primary: true },
  ```
  Labels can stay (`ds-new` / `ds-legacy`) or be freely renamed. After updating the config, run `npm install --save-dev dsmonitor@0.2.0`. See "Migration from 0.1.x" in README for details.

### 자료 자료 / Notes

- **한 —** 옛 `ds-new` 자동 호환 자료 자료 = 빠짐. 명시 자료 자료 자료 자료 자료 자료 자료 빠짐 자료 = 에러 throw 본질.
- **한 —** 본 0.2.0 = 의도 자료 breaking change (옛 사용자 = 본 시점 사용자 자료 1명 — 본 의뢰 자료 자료 자료).
- **EN —** Auto-fallback to `ds-new` label has been removed. Missing primary specification (with 2+ DS files) will throw an error.
- **EN —** This 0.2.0 is an intentional breaking change (current user count = 1 — confirmed via this issue thread).

[0.2.0]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.2.0

## [0.1.9] — 2026-05-07

### 추가 / Added

- **한 —** 새 `docs/measurement-flow.md` 자료. 측정 명령별 차이 + 자료 흐름 + 권고 사용 흐름 자세 안내. 한/영 병기. `audit --only figma` 단독 자료 dashboard 반영 빠짐 본질, `audit --baseline` 자료 자료 자료 자료 명시.
- **EN —** Added new `docs/measurement-flow.md` describing measurement command differences, data flow, and recommended usage. Bilingual (Korean / English). Documents that `audit --only figma` standalone does not reach the dashboard, and recommends `audit --baseline` for integrated runs.

### 갱신 / Updated

- **한 —** README 안 측정 명령 차이표 + DS 파일 라벨 안내 (`ds-new` = primary, `ds-legacy` = 옛 DS) 추가. `dsmonitor:figma` 단독 시점에 dashboard 반영 안 되는 자료 명시.
- **한 —** `docs/figma-config-guide.md` 안 "`ds-new` = primary 라벨" 영역 자료 추가. `resolvePrimaryDsLabel` 흐름 + 라벨 1개 시점 등록 권고 명시.
- **한 —** `src/cli/init.ts` 안 `renderFigmaBlock()` 자료 자료 안 ds-new / ds-legacy 라벨 안내 주석 추가 (`dsmonitor init` 자료 자료 사용자 자료 안 자동 자료 자료 자료).
- **EN —** Updated README with measurement command comparison table and DS file label guide (`ds-new` = primary, `ds-legacy` = legacy). Documented that standalone `dsmonitor:figma` does not update the dashboard.
- **EN —** Added a "`ds-new` is the primary label" section to `docs/figma-config-guide.md`, explaining the `resolvePrimaryDsLabel` flow and the recommendation to use `ds-new` when registering a single DS file.
- **EN —** Added inline label guidance comments to `renderFigmaBlock()` in `src/cli/init.ts`, so user `dsmonitor.config.ts` files generated by `dsmonitor init` carry the convention.

### 안내 / Notes

- **한 —** 0.2.0 자료 = primary 자료 라벨이 아닌 별도 필드 (예: `primary: true`) 자료 자료 자료 자료. Breaking change 안내 자료 별도 자료. 본 0.1.9 자료 = 라벨 기반 흐름 그대로 유지 + 안내 강화 자료.
- **EN —** In 0.2.0, `primary` will be specified as a separate field (e.g. `primary: true`) instead of relying on the label name. Breaking change to be announced separately. This 0.1.9 release keeps the label-based flow but strengthens the documentation.

[0.1.9]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.9

## [0.1.8] — 2026-05-06

### 정정 / Fixed

- **한 —** `lighthouse/run.js` 가 root `"type": "module"` 자료 자료 ES module 자료 자료 → `require()` 호출 시 throw 짚힘 정정. `lighthouse/package.json` 안 `{"type": "commonjs"}` override 추가. 0.1.6 시점에 `bin/` 자료 자료 자료 자료, `lighthouse/` 자료 자료 자료 자료라 같은 짚힘 재발.
- **한 — 전수 검증**: `require()` 사용하는 모든 `.js` 파일 (6건) 자료 폴더별 `package.json` `"type": "commonjs"` override 자료 자료. 본 시점 정합: `bin/`, `bin/lib/`, `eslint/`, `lighthouse/`, `presets/` 모두 commonjs override 자료. 추후 새 폴더 추가 시점에 같은 자료 본질.
- **EN —** Fixed `lighthouse/run.js` being treated as ES module due to root `"type": "module"`, causing `require()` to throw. Added `{"type": "commonjs"}` override in `lighthouse/package.json`. The 0.1.6 fix only covered `bin/` and `bin/lib/`, leaving `lighthouse/` for the same regression.
- **EN — Audit**: Verified all `.js` files using `require()` (6 total) have a sibling `package.json` `"type": "commonjs"` override. Currently aligned: `bin/`, `bin/lib/`, `eslint/`, `lighthouse/`, `presets/`. Same convention applies to any future folders.

[0.1.8]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.8

## [0.1.7] — 2026-05-06

### 변경 / Changed

- **한 —** ESLint plugin 이름 변경: `ui-health` → `dsmonitor`. 기존 이름은 npm 패키지명(`dsmonitor`)과 달라 ESLint legacy config(`.eslintrc.js`)의 자동 plugin 검색 흐름과 호환 안 됨. plugin 이름을 패키지명과 통일.
- **한 —** 새 wrapper 패키지 `eslint-plugin-dsmonitor` 0.1.0 publish. ESLint legacy config 가 plugin 을 자동 검색할 수 있도록 다리 역할 (1줄짜리 re-export, `module.exports = require("dsmonitor/eslint")`).
- **한 —** `bin/lib/lint-shared.js`, `bin/lint-summary.js`, `eslint/index.js`, `src/cli.ts`, `src/types.ts`, `src/dashboard/components/root.jsx`, `src/reporters/migrationCsv.ts`, `src/reporters/markdown.ts` 안 `ui-health` 표기 → `dsmonitor` 일괄 정정.
- **한 —** `README.md` + `docs/eslint-rules.md` + `docs/eslint-ci-integration.md` + `docs/figma-config-guide.md` 안 옛 `npm run ui-health:*` 스크립트 자료 → 새 `npx dsmonitor *` 자료 일괄 정정. `eslint-plugin-ui-health` → `eslint-plugin-dsmonitor`.
- **한 — Breaking change**: 0.1.7 사용자는 (1) `eslint-plugin-dsmonitor` 도 추가 install + (2) `.eslintrc.js` + soft baseline JSON 안 `ui-health/...` → `dsmonitor/...` 정정 필요.

### EN — Changed

- **EN —** Renamed ESLint plugin from `ui-health` to `dsmonitor` to align with npm package name. The old name was incompatible with ESLint legacy config's automatic plugin resolution.
- **EN —** Published new wrapper package `eslint-plugin-dsmonitor` 0.1.0. Acts as a bridge for ESLint legacy config (1-line re-export of `dsmonitor/eslint`).
- **EN —** Replaced `ui-health` mentions with `dsmonitor` across `bin/lib/lint-shared.js`, `bin/lint-summary.js`, `eslint/index.js`, `src/cli.ts`, `src/types.ts`, `src/dashboard/components/root.jsx`, `src/reporters/migrationCsv.ts`, `src/reporters/markdown.ts`.
- **EN —** Replaced legacy `npm run ui-health:*` script references with new `npx dsmonitor *` invocations across `README.md`, `docs/eslint-rules.md`, `docs/eslint-ci-integration.md`, `docs/figma-config-guide.md`. Replaced `eslint-plugin-ui-health` with `eslint-plugin-dsmonitor`.
- **EN — Breaking change**: Users upgrading must (1) additionally install `eslint-plugin-dsmonitor` + (2) update `.eslintrc.js` and soft baseline JSON to replace `ui-health/...` with `dsmonitor/...`.

[0.1.7]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.7

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
