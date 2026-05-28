# Changelog

본 형식 = [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 형식을 따름. 버전 규칙 = [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**EN —** Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **eslint-plugin-dsmonitor** 측 version history → [eslint-plugin-dsmonitor/CHANGELOG.md](./eslint-plugin-dsmonitor/CHANGELOG.md)

> **EN —** **eslint-plugin-dsmonitor** version history → [eslint-plugin-dsmonitor/CHANGELOG.md](./eslint-plugin-dsmonitor/CHANGELOG.md)

## [0.8.0] — 2026-05-28

### 추가 / Added

- **한 —** baseline JSON 안 `code.classDefinitions` section 이 신규 추가됩니다 (3 배열 — `pureApply` / `applyMixed` / `pureCss`). `globalStyleSources` glob 에 매치되는 모든 SCSS / CSS 파일을 파싱해 각 클래스 정의 내용을 `@apply` directive 와 일반 CSS property 의 조합으로 분류한 결과입니다. 같은 className 이 여러 rule (예: light / dark theme) 에 등장하면 첫 정의를 우선 보존하고 분류는 OR 통합합니다 — 한 rule 라도 `@apply` 와 일반 CSS property 가 섞이면 전체를 `applyMixed` 로 격상. 본 결과 자체는 dashboard 에 별도 카드로 노출되지 않고, 아래 `forbiddenClassCount` 및 `stylingMethodDistribution` 의 matrix 산정 입력으로 활용됩니다.
- **EN —** A new `code.classDefinitions` section (`pureApply` / `applyMixed` / `pureCss` arrays) is added to baseline JSON. All SCSS / CSS files matched by `globalStyleSources` are parsed and every class definition is categorised by whether it contains `@apply` directives, regular CSS properties, or both. When the same className appears in multiple rules (e.g. light / dark theme), the first definition wins for ordering and the categorisation is OR-merged — a single rule mixing `@apply` with regular CSS escalates the whole entry to `applyMixed`. The section is not surfaced as a dedicated dashboard card; it feeds the matrix used by `forbiddenClassCount` and `stylingMethodDistribution`.
- **한 —** `forbiddenClassCount.byId` 와 `stylingMethodDistribution.counts.forbidden` 에 matrix 산정으로 검출되는 신규 sub-key 가 추가됩니다 — `apply-mixed` (두 preset 공통), `tailwind-via-wrapper` (scss-project 한정), `scss-style-raw-css` (tailwind-project 한정). 옛 sub-key (`bootstrap-utilities`, `tailwind-classes`) 는 그대로 보존되어 옛 분석 도구 호환성에 영향이 없습니다. dashboard 의 스타일링 방식 분포 카드 안 신규 row 는 tooltip 으로 위반 사유가 preset 기준으로 표시됩니다.
- **EN —** `forbiddenClassCount.byId` and `stylingMethodDistribution.counts.forbidden` gain new sub-keys driven by the matrix — `apply-mixed` (both presets), `tailwind-via-wrapper` (scss-project only), `scss-style-raw-css` (tailwind-project only). Existing sub-keys (`bootstrap-utilities`, `tailwind-classes`) are preserved so downstream analysis tooling remains compatible. The new rows in the styling-method-distribution card surface a preset-specific reason via tooltip.

### 변경 / Changed

- **한 —** `stylingMethodDistribution` 산정 흐름이 matrix 기반으로 갱신됩니다. preset 의 `preferred` 가 `scss` 또는 `tailwind` 일 때 한정해, 옛 `allowedGlobal` 로 분류되던 파일 가운데 사용 중인 global class 의 정의가 (1) `applyMixed` 면 모든 preset 에서 금지 (`apply-mixed`), (2) `pureApply` 면 scss-project 에서 금지 (`tailwind-via-wrapper`) / tailwind-project 에서 정상, (3) `pureCss` 면 scss-project 에서 정상 / tailwind-project 에서 금지 (`scss-style-raw-css`) 로 재분류됩니다. 한 파일이 여러 case 에 걸치는 경우 worst-first 우선순위로 결정됩니다. `preferred` 가 그 외 (`bootstrap` / `css-modules`) 인 경우 옛 흐름이 그대로 보존됩니다.
- **EN —** `stylingMethodDistribution` now uses a matrix-based classification. Only when the preset's `preferred` is `scss` or `tailwind`, files previously bucketed as `allowedGlobal` are re-checked against the definition type of the global classes they use: (1) `applyMixed` is forbidden in both presets (`apply-mixed`), (2) `pureApply` is forbidden in scss-project (`tailwind-via-wrapper`) but allowed in tailwind-project, (3) `pureCss` is allowed in scss-project but forbidden in tailwind-project (`scss-style-raw-css`). Files matching multiple cases resolve worst-first. Other `preferred` values (`bootstrap` / `css-modules`) keep the legacy flow as-is.
- **한 —** dashboard Code 탭 카드 순서가 테마별 그룹화 흐름으로 재정렬됩니다 — scope 개요 (파일 집계 / DS 커버리지) → 마이그레이션 (마이그레이션 후보 파일 / TypeScript 마이그레이션) → CSS 컴플라이언스 (금지 CSS 클래스 / 스타일링 방식 분포) → 변수 + 색상 (SCSS 변수 준수율 / 하드코딩 색상). 카드 자체 본문 / 데이터는 변경 X.
- **EN —** Code-tab card order is regrouped by theme — scope overview → migration → CSS compliance → variables + colors. Card bodies and data are unchanged.
- **한 —** dashboard 안 일부 한글 라벨이 정정됩니다 — 스타일링 방식 분포 카드 안 권장 방식 row 라벨은 `preferredId` 따라 동적 결정 (옛 "권장 (scss)" hard-code 정정), 고아 클래스 라벨은 preset 무관 표현으로 "고아 클래스 (정의 못 찾음)" (옛 "SCSS 정의 못 찾음" 정정). 옛 분석 도구가 활용하는 baseline JSON 안 machine key (`allowedGlobal`, `noClass`, `forbidden.*` 등) 는 그대로 보존됩니다.
- **EN —** A few Korean dashboard labels are corrected — the "preferred" row label in the styling distribution card is now derived from `preferredId` (replacing the hard-coded `"권장 (scss)"`), and the orphan-class label is preset-agnostic (`"고아 클래스 (정의 못 찾음)"`, dropping the misleading "SCSS"). The machine keys in baseline JSON (`allowedGlobal`, `noClass`, `forbidden.*`, etc.) are unchanged.
- **한 —** `dsmonitor init` 으로 생성되는 `dsmonitor.config.ts` 템플릿이 정리됩니다 — 변수명을 `stylingPolicy` 로 통일하고 (config key 와 동일), preset 선택을 import 한 줄 교체로 마무리하도록 shorthand 화 (`stylingPolicy: scssPreset` → `stylingPolicy,`). 옛 0.7.3 의 ESM 호환 흐름은 그대로 유지됩니다.
- **EN —** The `dsmonitor.config.ts` template emitted by `dsmonitor init` is tidied — the imported preset is now bound to the variable `stylingPolicy` (matching the config key), and the policy line is shortened to `stylingPolicy,` so switching presets is a one-line import swap. The 0.7.3 ESM compatibility behavior is preserved.
- **한 —** `presets/scss-project.js` 주석과 README 안 preset 설명이 정정됩니다 — preset 명칭은 "scss" 지만 `.css` 만 활용하는 React + CSS files 환경 / 혼합 환경 모두 적용된다는 점이 명시됩니다. README 안 옛 `stylingPolicy: require("dsmonitor/presets/...")` 흔적은 ESM `import` 형식으로 일괄 교체됩니다 (한국어 / 영어 정본 1:1).
- **EN —** `presets/scss-project.js` and the matching README entry are revised to make clear that the preset covers class-based CSS / SCSS broadly — both `.css`-only React projects and SCSS projects fit. Remaining `stylingPolicy: require("dsmonitor/presets/...")` snippets in the README are replaced with the ESM `import` form (Korean / English mirrored).

### 정정 / Fixed

- **한 —** dashboard 안 분모 0 케이스 (예: Figma DS 파일 안 styles=0 / variables=0 / tsFiles + jsFiles=0 / forbidden 전체 0건 등) 에서 `NaN%` 로 표시되던 카드들이 `0.0%` 로 정정됩니다. 영향 카드 — DS 토큰 매칭률 (Styles) (root.jsx), DS 토큰 매칭률 (Styles + Variables) (figma-tab.jsx, primary + DS 별 row), 금지 CSS 클래스 그룹 분포 (code-tab.jsx), 스타일링 방식 분포 카운트 (code-tab.jsx), 하드코딩 색상 상위 파일 점유 (code-tab.jsx), TypeScript 마이그레이션 카드 (code-tab.jsx). 측정 데이터 자체에는 영향이 없고 렌더링 layer 에만 영향이 있습니다.
- **EN —** Dashboard cards that previously rendered `NaN%` when a denominator was zero (e.g. Figma DS file with `styles=0` / `variables=0`, `tsFiles + jsFiles = 0`, total forbidden count = 0) now render `0.0%`. Affected cards — DS token match rate (Styles, in root.jsx), DS token match rate (Styles + Variables, primary + per-DS rows in figma-tab.jsx), forbidden CSS class group distribution (code-tab.jsx), styling-method-distribution counts (code-tab.jsx), top-file share of hardcoded colors (code-tab.jsx), TypeScript migration card (code-tab.jsx). No measurement data changes — render-layer only.

### 옛 사용자 영향 / Migration notes

- **한 —** matrix 산정 도입으로 `scss-project` / `tailwind-project` 환경에서 옛 baseline 의 `forbiddenClassCount` / `stylingMethodDistribution` 수치와 0.8.0 수치가 어긋날 수 있습니다 — 의도된 변경 (측정 로직 정확도 ↑). 0.7.x 이하 baseline 과 0.8.0 baseline 수치를 직접 비교하지 말고, 0.8.0 baseline 을 새 기준선으로 활용하시기 바랍니다. tailwind-project 환경에서는 raw CSS 클래스가 새로 금지로 잡혀 금지 카운트가 증가할 수 있고, scss-project 환경에서는 pure-@apply wrapper 가 새로 금지로 잡혀 금지 카운트가 증가할 수 있습니다. `preferred` 가 `bootstrap` / `css-modules` 인 환경은 옛 흐름 그대로 — 수치 변경 없습니다.
- **EN —** With the new matrix in place, `forbiddenClassCount` / `stylingMethodDistribution` values may diverge from prior baselines in `scss-project` / `tailwind-project` setups — this is intended (more accurate measurement). Do not compare 0.7.x and 0.8.0 baseline numbers directly; treat the 0.8.0 baseline as the new reference. In tailwind-project setups, raw CSS classes may newly count as forbidden; in scss-project setups, pure-`@apply` wrappers may newly count as forbidden. `preferred = bootstrap` / `css-modules` setups are unaffected.

### 참고 / Notes

- 0.x.x 유연성을 활용한 minor release — matrix 산정 도입은 측정 의미를 갱신하는 변경입니다. baseline JSON shape 자체는 옛 key 보존 + 신규 key 추가 흐름 (옛 분석 도구 호환).
- A minor release that updates the meaning of existing metrics. baseline JSON shape preserves prior keys and only adds new ones (compatible with existing analysis tooling).
- `npm run typecheck` + `npm run build` 통과 / Verified.

## [0.7.3] — 2026-05-28

### 정정 / Fixed

- **한 —** `dsmonitor init` 으로 생성되는 `dsmonitor.config.ts` 템플릿 안 `stylingPolicy: require("dsmonitor/presets/scss-project")` 호출이 ESM static import 로 교체되었습니다. dsmonitor cli 는 user config 를 `tsx/esm/api` 로 load 하기 때문에 `"type": "module"` 프로젝트는 항상 ESM context 로 평가되며, 옛 표기는 `ReferenceError: require is not defined` 로 실패했습니다. 0.7.3 부터 템플릿 상단에 `import scssPreset from "dsmonitor/presets/scss-project.js"` 한 줄이 emit 되고, 4종 preset 선택 안내 주석도 ESM import 형식으로 정정됩니다. 옛 user config (이미 `init` 으로 생성된 파일) 안 `require()` 호출은 본 import 한 줄로 교체하면 옛 동작 그대로 복구됩니다.
- **EN —** The `stylingPolicy: require("dsmonitor/presets/scss-project")` line in the `dsmonitor.config.ts` template emitted by `dsmonitor init` is now an ESM static import. The dsmonitor cli loads user configs through `tsx/esm/api`, so `"type": "module"` projects always evaluate the file as ESM, and the previous form threw `ReferenceError: require is not defined`. Starting with 0.7.3 the template emits `import scssPreset from "dsmonitor/presets/scss-project.js"` at the top and the four-preset selection comments are written in ESM import form. Existing user configs already produced by `init` can be fixed by replacing the `require()` call with the equivalent import line.
- **한 —** `codeTokens.parsers` 안 `scss` / `cssVariables` 파서의 `files` 항목이 glob 패턴을 정식 지원합니다 (예: `["src/styles/**/*.css"]`). 0.7.2 까지는 entry 를 literal path 로 해석해 `globalStyleSources` 와 같은 경로를 등록한 환경에서도 `dsmonitor doctor` 가 `not found` 로 보고하고 audit 실행 시점에 `file_not_found` warning 이 발생했습니다. 0.7.3 는 `*`, `?`, `{`, `[` 가 포함된 entry 를 `fast-glob` 으로 확장해 매치된 파일만 파서에 전달합니다. literal path 흐름은 옛 동작 그대로 보존되고, glob match 0건은 옛 file_not_found 와 동일한 자리 (`dsmonitor doctor` 결과 + parser warning) 에 보고됩니다.
- **EN —** `codeTokens.parsers` `scss` / `cssVariables` parsers now accept glob patterns in their `files` array (e.g. `["src/styles/**/*.css"]`). Through 0.7.2 each entry was treated as a literal file path, so setups that registered the same path as `globalStyleSources` would still be reported as `not found` by `dsmonitor doctor` and trigger `file_not_found` warnings during audit. 0.7.3 expands entries containing `*`, `?`, `{`, `[` via `fast-glob` and forwards only the matched files to the parser. Literal paths keep their existing behavior, and a glob with zero matches is reported in the same surfaces (`dsmonitor doctor` + parser warning).

### 참고 / Notes

- 본 release 는 두 버그 수정에 한정된 patch 입니다. 외부 API / config schema 변경 X.
- Patch release scoped to the two bug fixes — no public API or config schema changes.
- `npm run typecheck` + `npm run build` 통과 / Verified.

## [0.7.2] — 2026-05-26

### 추가 / Added

- **한 —** `migrationCandidates.excludeOfficialPaths` 옵션이 신규 추가되었습니다 (default `true`). `designSystem.officialPaths` 에 매치되는 파일을 마이그레이션 후보 검출에서 자동으로 제외해, DS 본체 안에서 자연스럽게 쓰이는 native HTML (예: `Button.tsx` 가 내부에서 `<button>` 사용) 이 false positive 로 잡히지 않습니다. 본 옵션은 마이그레이션 후보 검출 흐름만 정정하며, `totals.dsComponentFiles` 같은 다른 지표는 옛 그대로 officialPaths 안 파일을 DS 본체로 계속 인식합니다. 옛 (~ 0.7.1) 동작을 그대로 두고 싶으면 `migrationCandidates: { excludeOfficialPaths: false }` 로 명시하세요.
- **EN —** New `migrationCandidates.excludeOfficialPaths` option (default `true`). Files matched by `designSystem.officialPaths` are now skipped during migration-candidate detection, so DS source files that naturally use native HTML (e.g. `Button.tsx` rendering a `<button>` internally) are no longer flagged as false positives. The option scopes only the migration-candidate flow — `totals.dsComponentFiles` and other DS-side metrics keep counting `officialPaths` files. To opt back into the old behavior set `migrationCandidates: { excludeOfficialPaths: false }`.

### 정정 / Fixed

- **한 —** `designSystem.officialPaths` 매칭이 glob-aware 로 정정되었습니다. 0.7.1 까지는 단순 prefix 매칭 (`relPath.startsWith(p + "/")`) 만 사용해서 사용자가 `["src/laon-web-ui/**"]` 처럼 glob 표기를 그대로 적은 환경에서는 매칭이 항상 실패하고, 결과적으로 DS 본체 파일이 마이그레이션 후보에 그대로 들어가는 함정이 있었습니다. 0.7.2 는 glob 의 첫 wildcard 직전까지를 literal root 로 잘라 prefix 매칭이 의도대로 작동하게 합니다. wildcard 없이 적힌 옛 표기 (`["src/components/ds"]`) 의 동작은 변하지 않습니다.
- **EN —** `designSystem.officialPaths` matching is now glob-aware. Through 0.7.1 the matcher was a literal `relPath.startsWith(p + "/")`, which silently failed whenever users wrote glob entries like `["src/laon-web-ui/**"]`, causing DS source files to leak into the migration-candidate list. 0.7.2 normalizes each entry's literal root (the prefix before the first wildcard) so the match behaves as written. Entries without wildcards (e.g. `["src/components/ds"]`) keep their existing behavior.

### 변경 / Changed

- **한 —** `dsmonitor init` 으로 생성되는 template (`templates/dsmonitor.config.ts.tpl`) 에 `migrationCandidates: { excludeOfficialPaths: true }` 블록이 기본 안내 주석과 함께 추가됩니다. README §6.8 에 신규 sub-subsection (6.8.1) 과 §13 트러블슈팅에 "DS 본체 파일이 마이그레이션 후보로 잡힙니다" Q 가 한국어 / 영어 1:1 로 추가되었습니다.
- **EN —** The `dsmonitor init` template now renders a `migrationCandidates: { excludeOfficialPaths: true }` block with explanatory comments. README §6.8 gains a new §6.8.1 subsection, and §13 picks up a "DS source files appear as migration candidates" Q — mirrored across Korean and English.

### 옛 사용자 영향 / Migration notes

- **한 —** `designSystem.officialPaths` 가 설정된 환경에서는 0.7.2 업그레이드 후 마이그레이션 후보 검출 숫자가 **줄어들 수 있습니다**.
  - glob 표기 (`["src/laon-web-ui/**"]`) 를 쓰던 환경 — 옛 매칭 실패로 DS 본체가 후보에 잡히던 false positive 가 정리됩니다.
  - 옛 동작이 그대로 필요하면 `migrationCandidates: { excludeOfficialPaths: false }` 명시.
  - `officialPaths` 가 빈 배열이거나 설정되어 있지 않으면 본 옵션은 영향이 없습니다.
- **EN —** Setups with `designSystem.officialPaths` populated may see migration-candidate counts **decrease** after upgrading to 0.7.2.
  - Setups using glob entries (`["src/laon-web-ui/**"]`) get the matching-failure false positives cleared up.
  - To preserve the legacy behavior, set `migrationCandidates: { excludeOfficialPaths: false }`.
  - When `officialPaths` is empty or unset, this option has no effect.

### 참고 / Notes

- 본 release 는 pre-1.0 (0.x.x) 유연성을 활용한 patch 입니다. 옵션 신규 + default true 가 행동에 영향을 주지만 BREAKING 으로 분류하지 않았습니다.
- Released as a patch under the pre-1.0 cadence — the new option and its `true` default change behavior, but the change is not classified as BREAKING.
- `npm run typecheck` + `npm run build` 통과 / Verified.

## [0.7.1] — 2026-05-15

### 추가 / Added

- **한 —** (E) `LighthouseAuthAdapter<TBrowser>` 와 `LighthouseAuthContext` 타입을 export 합니다. `dsmonitor.config.ts` 의 `lighthouse.auth = { type: "custom", adapter: "./..." }` 가 가리키는 어댑터를 TypeScript 로 작성할 때 IDE 자동 완성과 컴파일 검증을 받을 수 있습니다. puppeteer 는 dsmonitor 가 직접 의존하지 않으므로 `Browser` 타입은 사용자가 generic 인자로 직접 전달합니다 (`LighthouseAuthAdapter<Browser>`). 런타임 동작은 그대로이고 옛 `.js` 어댑터는 변경 없이 작동합니다.
- **EN —** (E) The `LighthouseAuthAdapter<TBrowser>` and `LighthouseAuthContext` types are now exported. Use them when authoring the adapter referenced by `lighthouse.auth = { type: "custom", adapter: "./..." }` in TypeScript — you get IDE autocomplete and compile-time checks. Since dsmonitor does not depend on puppeteer directly, the `Browser` type is supplied by the user via a generic argument (`LighthouseAuthAdapter<Browser>`). Runtime behavior is unchanged and existing `.js` adapters continue to work as-is.
- **한 —** (D) `docs/auth-adapter-examples/` 디렉토리에 Lighthouse custom 인증 어댑터 예제 5종이 추가되었습니다 — `01-basic-auth.ts` (HTTP Basic), `02-form-login.ts` (ID/PW form), `03-sso.ts` (외부 IdP redirect), `04-jwt-persistence.ts` (JWT 주입), `05-oauth.ts` (OAuth 2.0 code flow). 각 예제는 E 의 타입을 그대로 활용한 50~100 줄짜리 작동 가능한 어댑터이며, 디렉토리 README 에 작성 흐름 / 환경변수 패턴 / TypeScript → JavaScript 변환 / `dsmonitor doctor` 로 검증하는 방법을 한국어 / 영어 둘 다 담았습니다.
- **EN —** (D) Five Lighthouse custom-auth adapter examples landed under `docs/auth-adapter-examples/` — `01-basic-auth.ts` (HTTP Basic), `02-form-login.ts` (ID/PW form), `03-sso.ts` (external IdP redirect), `04-jwt-persistence.ts` (JWT injection), `05-oauth.ts` (OAuth 2.0 code flow). Each example is a 50–100 line working adapter that uses the E type directly. The directory's README documents the writing workflow, env-var conventions, TS → JS conversion, and how to verify the setup with `dsmonitor doctor` — in both Korean and English.

### 변경 / Changed

- **한 —** README §6.12.1 (Lighthouse 인증 방식) 에 `LighthouseAuthAdapter` 활용 가이드와 예제 디렉토리 link, 다섯 시나리오 비교표를 추가했습니다. §13 트러블슈팅에 "로그인 필요한 페이지 측정" Q 를 신규 추가했고, §15 더 읽기 link 목록에도 어댑터 예제 디렉토리가 등록됩니다. 한국어 / 영어 두 정본 모두 1:1 대응.
- **EN —** README §6.12.1 (Lighthouse auth) gains a `LighthouseAuthAdapter` usage guide, a link to the examples directory, and a comparison table covering the five scenarios. §13 (Troubleshooting) adds a new "How do I run Lighthouse against a page that requires login?" Q, and the §15 reading list links the examples directory too. Mirrored across Korean and English.

### 참고 / Notes

- 본 release 는 BREAKING 변경이 없습니다. E 는 type-only export 이며 런타임 변경이 없고, D 는 문서 추가입니다. 옛 `.js` 어댑터와 옛 config 모두 그대로 작동합니다.
- This release has no BREAKING changes. E is a type-only export with zero runtime impact; D is documentation. Existing `.js` adapters and existing configs continue to work without modification.
- pre-1.0 (0.x.x) 페이스 정상화를 위해 patch bump 로 처리했습니다 — runtime 동작 변경 없음.
- Released as a patch bump given the pre-1.0 cadence — there is no runtime behavior change.
- `npm run typecheck` + `npm run build` 통과 / Verified.

## [0.7.0] — 2026-05-15

### 추가 / Added

- **한 —** (Y) `dsmonitor init` 이 cwd 기준으로 흔한 path 들을 자동 감지해 default 값을 채웁니다. Tailwind config 는 `tailwind.config.{ts,js,mjs,cjs}` 4종, globals.css 는 `src/app/globals.css` / `src/styles/globals.css` 등 6종, SCSS tokens 는 `styles/tokens.scss` 등 4종을 순서대로 탐색합니다. 감지된 경우 활성 entry 로 채우고, 감지 0건이면 흔한 옵션을 주석으로 함께 노출해 한 줄만 풀어 쓰면 됩니다. `globalStyleSources` 와 `hardcodedValues.scssVariableDefFiles` 도 같은 감지 결과를 활용합니다.
- **EN —** (Y) `dsmonitor init` now auto-detects common paths from cwd. It probes `tailwind.config.{ts,js,mjs,cjs}` for Tailwind, six locations (e.g. `src/app/globals.css`, `src/styles/globals.css`) for `globals.css`, and four for SCSS tokens. The first match becomes the active default; if nothing matches, common alternatives are listed as comments so a single uncomment is enough. `globalStyleSources` and `hardcodedValues.scssVariableDefFiles` also reuse the detection results.
- **한 —** (Z) 코드 토큰 파서가 path 부재 / 로드 실패를 구조화 warning 으로 보고합니다. audit 실행 시 stderr 에 `⚠ codeTokens.parsers (...) — file_not_found` 한 줄로 emit 되고, baseline JSON 의 `figma.tokenMatrix.warnings: CodeTokenParserWarning[]` 에 누적되며, dashboard 의 토큰 매트릭스 sub-section 헤더에 노란 배너로 표시됩니다. 옛 silent failure (path 가 달라도 0건으로 통과) 가 정리되어 잘못된 설정이 즉시 눈에 띕니다.
- **EN —** (Z) Code-token parsers now report missing or unloadable paths as structured warnings. Each one becomes a `⚠ codeTokens.parsers (...) — file_not_found` line on stderr at audit time, lands in `figma.tokenMatrix.warnings: CodeTokenParserWarning[]` in the baseline JSON, and is rendered as a yellow banner above the dashboard's token matrix subsection. This replaces the prior silent failure where a wrong path silently produced zero tokens.
- **한 —** (BB) `dsmonitor doctor` 명령이 추가되었습니다 — config 와 환경변수를 한 번에 점검하는 진단 도구입니다. `scan.codeRoots` / `styleRoots`, `globalStyleSources`, `hardcodedValues.scssVariableDefFiles`, `designSystem.officialPaths`, `figma.codeTokens.parsers`, `figma.designSystemFiles[].url` / `domainFiles[].url`, `lighthouse.auth.adapter` (custom 인증), `FIGMA_API_TOKEN` / `LIGHTHOUSE_BASE_URL` 환경변수를 모두 확인합니다. 네트워크 호출은 없습니다. `--json` 으로 CI 통합용 출력, `--strict` 로 경고도 오류 취급. exit code = 오류 있음 1 / 아니면 0.
- **EN —** (BB) New `dsmonitor doctor` command — a single-shot diagnostic that verifies config and environment variables without any network calls. It checks `scan.codeRoots` / `styleRoots`, `globalStyleSources`, `hardcodedValues.scssVariableDefFiles`, `designSystem.officialPaths`, `figma.codeTokens.parsers`, every Figma URL under `designSystemFiles` / `domainFiles`, `lighthouse.auth.adapter` (for custom auth), and the `FIGMA_API_TOKEN` / `LIGHTHOUSE_BASE_URL` env vars. Pass `--json` for CI-friendly output and `--strict` to treat warnings as errors. Exit code 1 when there are errors, 0 otherwise.

### 변경 / Changed

- **한 —** (AA) README §6.6 `designSystem` 부분이 `officialPaths` 와 `officialAliases` 의 차이를 명확히 설명하도록 다시 작성되었습니다. `officialPaths` 는 파일시스템 경로 (영향 지표 `totals.dsComponentFiles`), `officialAliases` 는 import alias prefix (영향 지표 `dsCoverage.coverage`) 라는 점을 풀어 적었고, 두 값이 보통 다르다는 안내를 추가했습니다.
- **EN —** (AA) README §6.6 `designSystem` was rewritten to make the distinction between `officialPaths` and `officialAliases` explicit — the former is a filesystem path (affecting `totals.dsComponentFiles`), the latter is an import-path prefix (affecting `dsCoverage.coverage`), and the two usually differ.
- **한 —** (AA) README §6.11 `figma.codeTokens.parsers` 항목에 자동 감지 흐름 안내, 흔한 path 후보 표, audit / dashboard / doctor 를 통한 진단 흐름을 추가했습니다.
- **EN —** (AA) Added an auto-detection guide, a candidate-paths table, and a how-to-diagnose flow (audit, dashboard, doctor) to README §6.11 `figma.codeTokens.parsers`.
- **한 —** (AA) README §13 트러블슈팅에 신규 Q 6개를 추가했습니다 — codeCount = 0, tailwind.config 위치, globals.css 위치, 파서 검증 신호, 버전 업그레이드 후 검출 변동, `officialPaths` vs `officialAliases`.
- **EN —** (AA) Added six new Q&As to README §13 — `codeCount = 0`, `tailwind.config` location, `globals.css` location, how to verify parsers, detection deltas after upgrades, and `officialPaths` vs `officialAliases`.
- **한 —** (AA) init template (`templates/dsmonitor.config.ts.tpl`) 의 `globalStyleSources` / `scssVariableDefFiles` / `designSystem` 주석이 풀려 작성되었고, `migrationTargets.aliases` 의 barrel + 구체 경로 함께 등록 패턴이 추가되었습니다. `dsmonitor init` 으로 생성되는 `codeTokens.parsers` 코멘트에도 자동 감지 / doctor 진단 안내가 추가되었습니다.
- **EN —** (AA) The init template (`templates/dsmonitor.config.ts.tpl`) gains expanded comments for `globalStyleSources`, `scssVariableDefFiles`, and `designSystem`, plus a barrel-plus-specific-path pattern for `migrationTargets.aliases`. The `codeTokens.parsers` block emitted by `dsmonitor init` also points users at the auto-detection flow and `dsmonitor doctor`.

### 참고 / Notes

- 본 release 는 BREAKING 변경이 없습니다. 옛 config 도 그대로 작동합니다 — Y 자동 감지는 새 `dsmonitor init` 실행 시에만 적용되고, Z warning 은 옛 baseline JSON 형식 위에 optional 로 더해집니다.
- This release has no BREAKING changes. Existing configs keep working — Y's auto-detection only applies to a fresh `dsmonitor init`, and Z's warnings are added as an optional field on top of the existing baseline JSON shape.
- `FileSignals` 는 0.6.1 의 `importEntries?` 추가 외 변경 없음. `CodeTokenParser.parse(...)` 에 4번째 인자 `warnings?: CodeTokenParserWarning[]` 가 추가되었지만 옛 어댑터 / 파서도 인자 무시로 호환됩니다.
- The `FileSignals` shape is unchanged since the 0.6.1 `importEntries?` addition. `CodeTokenParser.parse(...)` gained an optional fourth argument `warnings?: CodeTokenParserWarning[]`; existing adapters / parsers remain compatible by ignoring it.
- `npm run typecheck` + `npm run build` 통과 / Verified.

## [0.6.1] — 2026-05-15

### 변경 / Changed

- **한 —** (X) `migrationTargets.<Component>.aliases` 의 매칭 흐름을 AST 기반 named import 분석으로 전환했습니다. 옛 흐름은 alias prefix 가 일치하기만 하면 해당 컴포넌트를 "이미 import 됨" 으로 보고 후보에서 제외했기 때문에, barrel import 환경 (`import { Button } from "@/laon-web-ui"`) 에서 `<input>` / `<progress>` 같은 다른 native 태그 사용이 마이그레이션 후보에서 잘못 제외되곤 했습니다. 0.6.1 은 React 어댑터의 `extractSignals` 가 import 문을 `{ source, named, hasDefault, hasNamespace }` 구조로 emit 하도록 확장하고, `analyzeMigrationCandidates` 가 alias 가 일치한 import 중 **named import 이름이 컴포넌트 key 와 정확히 같을 때만** "이미 사용 중" 으로 인정하도록 매칭 로직을 갱신했습니다. namespace import (`import * as Ui from "..."`) 와 default import 는 어느 컴포넌트인지 단정할 수 없어 옛 동작 (alias 매칭만으로 후보 제외) 을 보수적으로 유지합니다. aliased named import (`import { Button as MyButton } from "..."`) 는 원본 명 `Button` 으로 매칭합니다.
- **EN —** (X) `migrationTargets.<Component>.aliases` matching is now AST-driven through named-import analysis. The legacy logic considered the component "already imported" whenever the alias prefix matched, which caused barrel-style imports (`import { Button } from "@/laon-web-ui"`) to wrongly exclude stray `<input>` / `<progress>` etc. from the migration candidate list. In 0.6.1 the React adapter's `extractSignals` now emits each import as a structured `{ source, named, hasDefault, hasNamespace }` entry, and `analyzeMigrationCandidates` flags a component as "already in use" **only when the named-import identifier exactly matches the component key**. Namespace imports (`import * as Ui from "..."`) and default imports keep the legacy behavior (alias match alone is treated as imported) because their target component cannot be determined. Aliased named imports (`import { Button as MyButton } from "..."`) match on the original name `Button`.

### 검출 결과 변동 안내 / Detection delta

- **한 —** 0.6.1 부터 마이그레이션 후보 검출 항목이 0.6.0 대비 **증가할 수 있습니다**. 옛 흐름이 잘못 제외하던 후보 (alias 만 일치하고 실제로는 다른 컴포넌트만 import 된 케이스) 가 새로 잡히기 때문입니다. 검출 항목 자체의 정확도가 향상된 결과이므로 설정 변경 없이 의도된 동작입니다. namespace / default import 만 쓰는 부분은 옛 동작이 유지되므로 변동이 없습니다.
- **EN —** Migration candidate counts may **increase** in 0.6.1 vs 0.6.0. Candidates that the legacy alias-only matcher used to exclude — when the alias matched but the file actually imported a different component — are now correctly surfaced. No configuration change is required; this is the intended outcome of the accuracy improvement. Files using only namespace or default imports remain unaffected because their behavior is preserved.

### 참고 / Notes

- 본 release 는 설정 schema 변경이 없습니다 (BREAKING 없음). 모든 옛 `migrationTargets` 설정이 그대로 작동합니다.
- This release has no schema changes (no BREAKING). All existing `migrationTargets` configurations keep working.
- `FileSignals` 에 `importEntries?: ImportEntry[]` 필드가 추가되었습니다. React 외 어댑터 (Vue / Svelte) 에서는 채우지 않아도 매칭 로직이 옛 alias-only 흐름으로 폴백합니다.
- A new optional `importEntries?: ImportEntry[]` field was added to `FileSignals`. Adapters other than React (Vue / Svelte) may leave it empty; the matcher falls back to the legacy alias-only flow.
- `npm run typecheck` + `npm run build` 통과 / Verified.

## [0.6.0] — 2026-05-15

### 추가 / Added

- **한 —** (W) `migrationTargets.nativeTags` 의 항목 형식이 확장되었습니다. 옛 string (`"button"`) 외에 `{ tag, type? }` 객체 형식도 받을 수 있습니다. 예) `{ tag: "input", type: "checkbox" }` 는 `<input type="checkbox">` 만 매칭합니다. HTML `<input>` 처럼 type attribute 로 의미가 갈라지는 태그를 Checkbox / Radio / Switch 등 별도 DS 컴포넌트로 분리하고 싶을 때 활용합니다. 옛 `nativeTags: ["input"]` 형식은 동일한 의미로 그대로 작동하며, 검출 결과도 0.5.x 와 같습니다. React 어댑터의 `NativeElementHit` 에 `type?: string` 필드를 추가해 정적 string literal 인 type 속성 값을 수집하고, `analyzeMigrationCandidates` 가 candidate 의 `type` 제약을 정확 일치로 검사합니다.
- **EN —** (W) `migrationTargets.nativeTags` entries now accept an object form in addition to the plain string. For example, `{ tag: "input", type: "checkbox" }` matches only `<input type="checkbox">`. Use it to split `<input>` cases such as Checkbox / Radio / Switch into separate DS components. The legacy `nativeTags: ["input"]` form keeps its previous semantics. The React adapter's `NativeElementHit` now also carries a `type?: string` field extracted from static string literals, and `analyzeMigrationCandidates` enforces the candidate's `type` constraint via exact match.
- **한 —** (R) `figma.codeTokens.parsers` 에 신규 파서 두 종을 추가했습니다 — `{ type: "cssVariables", files: [...] }` 와 `{ type: "tailwind", config: "...", categories?: [...] }`. cssVariables 파서는 CSS 파일에 정의된 `--*` 를 selector 안팎 가리지 않고 추출하며 Tailwind v4 의 `@theme {...}` 도 함께 처리합니다. tailwind 파서는 `tailwind.config.{js,cjs,mjs,ts}` 를 동적 import 해 `theme` 과 `theme.extend` 의 nested 값을 dot-path 로 flatten 합니다 (기본 카테고리 `colors / spacing / fontSize / borderRadius`, `categories: []` 를 넘기면 모든 top-level 키 시도). 옛 SCSS 파서의 흐름은 변경되지 않았고 신규 파서는 opt-in 입니다.
- **EN —** (R) Two new parsers landed under `figma.codeTokens.parsers` — `{ type: "cssVariables", files: [...] }` and `{ type: "tailwind", config: "...", categories?: [...] }`. The cssVariables parser extracts `--*` definitions from CSS files regardless of the surrounding selector and also covers Tailwind v4's `@theme {...}` directives. The tailwind parser dynamically imports `tailwind.config.{js,cjs,mjs,ts}` and flattens `theme` / `theme.extend` into dot paths (default categories `colors / spacing / fontSize / borderRadius`; pass `categories: []` to attempt every top-level key). The existing SCSS parser is untouched and the new parsers are opt-in.

### 변경 / Changed

- **한 —** README 의 `migrationTargets` 와 `figma.codeTokens.parsers` 설명을 갱신했습니다 (한국어 / 영어 두 정본 모두). init template (`templates/dsmonitor.config.ts.tpl`) 의 `migrationTargets` 예시에 객체 형식을 추가했고, `dsmonitor init` 으로 생성되는 `codeTokens.parsers` 코멘트에도 cssVariables / tailwind 예시를 함께 넣었습니다.
- **EN —** Refreshed the README sections covering `migrationTargets` and `figma.codeTokens.parsers` in both Korean and English. The init template (`templates/dsmonitor.config.ts.tpl`) gains object-form examples in `migrationTargets`, and the `codeTokens.parsers` block generated by `dsmonitor init` now lists the new cssVariables and tailwind parsers as commented examples.

### 참고 / Notes

- **한 —** 본 release 는 BREAKING 변경이 없습니다. 옛 string-only `nativeTags` 와 SCSS-only `codeTokens.parsers` 흐름은 변경 없이 작동합니다.
- **한 —** inspector 환경 (Tailwind + CSS variables) 에 직접 영향이 있습니다 — W 가 활성되면 Checkbox / Radio / Switch 검출이 분리되어 옛 보고서 숫자와 비교 시 항목별 분포가 달라질 수 있습니다. 옛 단일 `Input` 으로 묶여 있던 케이스는 그대로 유지됩니다.
- **한 —** 다음 release 는 0.6.1 patch 로 (X) aliases named import AST 분석을 단독 처리할 예정입니다. 검출 결과 변동의 원인을 W 와 분리하기 위함입니다.
- **한 —** `npm run typecheck` + `npm run build` 통과.
- **EN —** This release has no BREAKING changes. Existing string-only `nativeTags` and SCSS-only `codeTokens.parsers` configurations keep working.
- **EN —** Inspector projects (Tailwind + CSS variables) are directly affected — once you opt into W with object-form `nativeTags`, Checkbox / Radio / Switch are detected separately. Cases that were previously folded into a single `Input` remain as they were.
- **EN —** Next release will be the 0.6.1 patch carrying item X (aliases named-import AST analysis) on its own, so that any change in detection numbers can be separated from W.
- **EN —** Verified with `npm run typecheck` + `npm run build`.

## [0.5.2] — 2026-05-15

### 변경 / Changed

- **한 —** README 를 단일 파일로 통합하고 한국어 정본을 마무리했습니다. 옛 `README.ko.md` 는 삭제했고, `README.md` 상단에 한국어 정본, 하단에 영어 정본을 두어 두 정본이 같은 sub-section 순서로 1:1 대응되도록 구성했습니다. CLI 명령, 설정 schema, preset, Lighthouse 인증, Figma 매칭, ESLint 규칙, 사이드카 plugin, 환경변수 등 사용자가 dsmonitor 를 도입할 때 필요한 모든 항목을 한 문서에서 확인할 수 있습니다. 한국어 표기는 원어민 수준의 자연스러운 문장으로 작성했고, 조사 "안" 의 오용과 명사 나열식 단문은 제거했습니다.
- **EN —** Consolidated the README into a single file and finalized the Korean reference version. The previous `README.ko.md` has been deleted; `README.md` now hosts the Korean reference at the top and the English reference at the bottom, with every sub-section mirrored 1:1. Every dimension a new adopter needs — CLI commands, configuration schema, presets, Lighthouse auth, Figma matching, ESLint rules, sidecar plugins, environment variables — is now documented in one place. The Korean half is rewritten in natural prose, dropping the AI-style phrasing and noun-stacking from earlier revisions.

### 참고 / Notes

- **한 —** 본 patch 는 BREAKING 변경이 없습니다. 코드 변경도 없습니다 (`README.md`, `README.ko.md` 삭제, `CHANGELOG.md`, `package.json` 의 version bump 만).
- **한 —** `npm run typecheck` + `npm run build` 통과.
- **EN —** This patch has no BREAKING changes. No code changes either — only `README.md`, the deletion of `README.ko.md`, `CHANGELOG.md`, and the `package.json` version bump.
- **EN —** Verified with `npm run typecheck` + `npm run build`.

## [0.5.1] — 2026-05-15

### 정정 / Fixed

- **한 —** (S) Figma DS 파일이 1개일 때 토큰 매트릭스에 남아 있던 빈 컬럼을 제거했습니다. 옛 portal-gateway 시절 `ds-new` / `ds-legacy` 두 라벨을 하드코딩하던 잔재로 인해 DS 1개 환경에서 thead 와 tbody 의 컬럼 개수가 어긋나 있었습니다. transformer 의 `enrichTokenMatrix` 에 `rows[i].ds: Array<0|1>` 동적 배열을 추가하고, `figma-tab.jsx` 의 `TokenMatrixSection` tbody 를 dsLabels 길이에 맞춰 동적으로 출력하도록 정정했습니다. 옛 `dn` / `dl` 필드는 호환을 위해 보존합니다.
- **EN —** (S) Removed the dead column that appeared in the token matrix when there was only one Figma DS file. The transformer's `enrichTokenMatrix` now emits a dynamic `rows[i].ds: Array<0|1>` aligned with `dsLabels`, and `TokenMatrixSection`'s tbody iterates that array instead of hard-coding two columns. Legacy `dn` / `dl` fields are preserved for compatibility.

### 변경 / Changed

- **한 —** (U) "JSX 매칭" / "jsx만" 같은 옛 UI 표시 명칭을 "JSX/TSX 매칭" / "JSX/TSX만" 으로 정정했습니다. 실제 매칭 로직은 JSX 와 TSX 양쪽에서 모두 작동했지만 표시 명칭이 한쪽만 가리키고 있어 혼동을 줄 수 있었습니다. 대시보드 (`figma-tab.jsx`), markdown 리포트 (`src/reporters/markdown.ts`), 의미 설명 주석 (`types.ts`, `componentMatch.ts`) 의 표시 단어를 일괄 정정했습니다. 변수명 (`jsxOnly` 등) 과 데이터 source 값 (`"jsx"`) 은 호환을 위해 그대로 둡니다.
- **EN —** (U) Renamed user-facing labels from "JSX matching" / "jsx-only" to "JSX/TSX matching" / "JSX/TSX-only". The underlying logic always covered both JSX and TSX; only the display wording was misleading. Touched the dashboard (`figma-tab.jsx`), the markdown reporter (`src/reporters/markdown.ts`), and the explanatory comments in `types.ts` and `componentMatch.ts`. Variable names (`jsxOnly` etc.) and source values (`"jsx"`) are kept for compatibility.
- **한 —** (V) `dsmonitor init` 으로 생성되는 `dsmonitor.config.ts` 템플릿의 `migrationTargets` 필드에 의미 / 형식 / 예시 주석을 보충했습니다. 옛 `// TODO` 한 줄로는 사용자가 직접 채워야 하는 필드라는 점과 작성 방법을 알기 어려웠습니다. 더불어 `migrationMinClassLength` 필드에도 짧은 예시를 덧붙였습니다. 현재 (0.5.x) schema 기준으로 작성되었으며, `nativeTags` 의 type attribute 옵션은 0.6.0 의 (W) 작업 범위입니다.
- **EN —** (V) Beefed up the `migrationTargets` comments in the `dsmonitor init` template (`templates/dsmonitor.config.ts.tpl`): meaning, shape (`aliases` / `nativeTags`), and two concrete examples (Button / Input). Also clarified `migrationMinClassLength`. Written against the 0.5.x schema; the `nativeTags` type-attribute option is part of the 0.6.0 (W) work.
- **한 —** (M) README 한 / 영 분리를 시작했습니다. `README.md` 는 영어 정본으로 정리하고, 한국어 정본은 `README.ko.md` 로 분리해 신규 작성했습니다. 두 파일 상단에 언어 전환 링크를 추가했고, 본 패치에서는 핵심 sub-section (Installation / Quick Start / Configuration 핵심 필드) 만 1:1 로 분리했습니다. 나머지 sub-section 은 후속 패치에서 점진적으로 분리할 계획입니다. 한국어 정본은 조사 "안" 의 오용 등 부자연스러운 표기를 정리한 원어민 표기로 작성했습니다.
- **EN —** (M) Started the README KO / EN split. `README.md` is now the English source of truth; the Korean source of truth lives in the new `README.ko.md`. Each file links to the other at the top. This patch separates only the core sub-sections (Installation, Quick Start, Configuration key fields); the rest will be migrated in follow-up patches. The Korean version was rewritten in natural prose, dropping the awkward AI-style phrasing from earlier revisions.

### 참고 / Notes

- **한 —** 본 patch 는 BREAKING 변경이 없습니다. 0.5.0 의 동작과 동일하며, API 와 설정 schema 변경도 없습니다.
- **한 —** `npm run typecheck` + `npm run build` 통과 확인.
- **EN —** This patch has no BREAKING changes. Behavior is identical to 0.5.0; no API or schema changes.
- **EN —** Verified with `npm run typecheck` + `npm run build`.

## [0.5.0] — 2026-05-14

### 변경 (BREAKING) / Changed (BREAKING)

- **한 —** Lighthouse 측정 흐름 단일 source 자체 진입. 옛 `dsmonitor/lighthouse/config.js` 안 PAGES hard-code 흐름 자체 폐기. 측정 대상 자체 명시 = `dsmonitor.config.ts` 안 `lighthouse.{baseUrl, pages, runs, auth, advanced?}` 자체 단일 source. dsmonitor 자체 안 LHCI config 자체 동적 생성 (`node_modules/.cache/dsmonitor/lighthouserc.js` 자체 임시 파일 자세 inject). 외부 사용자 자체 옛 `dsmonitor/lighthouse/config.js` 잔여 = dsmonitor 자체 read 안 함 자연 무시.
- **한 —** `LighthouseConfig` 타입 자세 확장 — 옛 `{ auth? }` 자체 → 새 `{ baseUrl?, pages?, runs?, auth?, advanced? }` 5 필드. `LighthousePageRef = { path: string; name?: string }` 신규 type. `advanced?: Record<string, unknown>` 자체 = LHCI `ci.collect.settings` 안 deep-merge (untyped passthrough — `skipAudits` / `chromeFlags` / `throttlingMethod` / `screenEmulation` 등 흔한 자세 활용).
- **한 —** dsmonitor 자체 안 LHCI default options 자세 hard-code — `preset: "desktop"` / `formFactor: "desktop"` / `screenEmulation: 1350×940` / `onlyCategories: 4종` / `disableStorageReset: auth.type !== "none"` 자체 자동. 외부 사용자 자체 옵션 자체 정정 흐름 = `lighthouse.advanced` 자체 명시 → deep-merge.
- **한 —** `lighthouse/run.js` 안 옛 hard-code log `"12 URL × 3회 = 36 runs"` 자체 dynamic 정정. `DSMONITOR_LIGHTHOUSE_PAGES_COUNT` + `DSMONITOR_LIGHTHOUSE_RUNS_COUNT` 자체 env read → 실제 측정 자세 일관 출력.
- **한 —** `lighthouse/run.js` 안 옛 `--config=dsmonitor/lighthouse/config.js` 자체 hard-code 자체 폐기. 새 = `DSMONITOR_LIGHTHOUSE_CONFIG_PATH` 자체 env 자체 read (cli.ts 자체 inject). env 자체 X 케이스 = 친절 안내 + exit (옛 `node node_modules/dsmonitor/lighthouse/run.js` 자체 직접 호출 자체 폐기 — `npx dsmonitor audit --only lighthouse` 자체 권고).
- **한 —** `dsmonitor init` 안 `lighthouse/config.js` 자체 자동 생성 흐름 자체 폐기. `lighthouse/auth/custom.js` 자체 스켈레톤 자동 생성 흐름 자체 = custom 케이스 한정 자세 (옛 0.4.x 흐름 일관).
- **EN —** Switched Lighthouse to a single-source flow. The legacy `dsmonitor/lighthouse/config.js` with hard-coded PAGES is dropped. Measurement targets now live exclusively in `dsmonitor.config.ts` under `lighthouse.{baseUrl, pages, runs, auth, advanced?}`. dsmonitor auto-generates the LHCI rc at `node_modules/.cache/dsmonitor/lighthouserc.js` per run; leftover `dsmonitor/lighthouse/config.js` files in user repos are simply ignored.
- **EN —** Extended the `LighthouseConfig` type from `{ auth? }` to `{ baseUrl?, pages?, runs?, auth?, advanced? }`. Added `LighthousePageRef = { path: string; name?: string }`. The new `advanced?: Record<string, unknown>` is an untyped passthrough deep-merged into LHCI `ci.collect.settings` (commonly used for `skipAudits`, `chromeFlags`, `throttlingMethod`, `screenEmulation`, etc.).
- **EN —** Hard-coded sensible LHCI defaults inside dsmonitor — `preset: "desktop"`, `formFactor: "desktop"`, 1350×940 `screenEmulation`, the four standard categories, and automatic `disableStorageReset` when `auth.type !== "none"`. Override anything via `lighthouse.advanced`.
- **EN —** Replaced the hard-coded `"12 URL × 3회 = 36 runs"` log line in `lighthouse/run.js` with a dynamic one driven by `DSMONITOR_LIGHTHOUSE_PAGES_COUNT` and `DSMONITOR_LIGHTHOUSE_RUNS_COUNT`.
- **EN —** `lighthouse/run.js` no longer hard-codes `--config=dsmonitor/lighthouse/config.js`. It now reads `DSMONITOR_LIGHTHOUSE_CONFIG_PATH` (injected by `cli.ts`) and exits with guidance if that env var is missing — direct `node node_modules/dsmonitor/lighthouse/run.js` invocation is no longer supported (use `npx dsmonitor audit --only lighthouse`).
- **EN —** `dsmonitor init` no longer scaffolds `lighthouse/config.js`. The `lighthouse/auth/custom.js` skeleton (custom auth branch only) is still generated as in 0.4.x.

### 정정 / Fixed

- **한 —** archive-portal-inspector-web 외부 사용성 검증 흐름 안 발견 사항 (Q) — `dsmonitor.config.ts` 안 `lighthouse.pages` 자체 = 옛 dead field (자체 활용 X 흐름) → 본 release 안 자체 활용 흐름 진입. 외부 사용자 자체 본 필드 자체 자세 명시 = 자연 측정 대상 자세 정정 흐름.
- **EN —** Resolved finding (Q) from the archive-portal-inspector-web review: `dsmonitor.config.ts`'s `lighthouse.pages` was previously a dead field. It is now the authoritative source for measurement URLs.

### 변경 / Changed

- **한 —** `README.md` 안 "Lighthouse 측정 흐름 / Lighthouse Measurement Flow (0.5.0 BREAKING)" sub-section 신규 — `lighthouse.{baseUrl, pages, runs, auth, advanced}` 자체 자세 안내 + default LHCI options 자세 + migration 자세 표 (0.4.x → 0.5.0). 한 / EN mirror.
- **한 —** `README.md` 안 옛 "Lighthouse / 인증 어댑터 / Authentication Adapter" sub-section 자세 정정 — 옛 `dsmonitor/lighthouse/config.js` 자체 안내 자체 정정.
- **한 —** `docs/lighthouse-ci-integration.md` 안 §0 "LHCI config 자체 동적 생성 (0.5.0+)" sub-section 신규 — 자세 흐름 자세 + 옛 `dsmonitor/lighthouse/config.js` 자체 폐기 안내.
- **한 —** `templates/dsmonitor.config.ts.tpl` 안 `lighthouse` 블록 자체 sample 자체 정정 — `pages` 자체 단일 source 안내 + `advanced` 자체 활용 안내.
- **EN —** Added a "Lighthouse Measurement Flow (0.5.0 BREAKING)" sub-section to `README.md` covering the new `lighthouse.{baseUrl, pages, runs, auth, advanced}` shape, dsmonitor's default LHCI options, and a 0.4.x → 0.5.0 migration table. KO / EN mirrored.
- **EN —** Updated the existing "Authentication Adapter" sub-section to reflect that no `dsmonitor/lighthouse/config.js` is scaffolded any more.
- **EN —** Added §0 "Auto-generated LHCI config (0.5.0+)" to `docs/lighthouse-ci-integration.md` with the new flow and a note on the dropped `dsmonitor/lighthouse/config.js` file.
- **EN —** Updated the `lighthouse` block sample in `templates/dsmonitor.config.ts.tpl` to show the new `pages` single source and the `advanced` passthrough.

### 참고 (migration) / Notes (migration)

- **한 —** **옛 0.4.x 환경 안 migration 자세** — `dsmonitor/lighthouse/config.js` 안 hard-code 본문 자체 = `dsmonitor.config.ts` 안 `lighthouse` 자체 자세 옮김. 자세 자세:
  - `const PAGES = [...]` → `lighthouse.pages: [{ path, name }, ...]`
  - `numberOfRuns: 3` → `lighthouse.runs: 3`
  - `settings: { ... }` 자세 → `lighthouse.advanced: { settings: { ... } }`
  - `puppeteerScript: "..."` → `lighthouse.auth: { type: "custom", adapter: "..." }`
  - `disableStorageReset: true` → 자동 (auth.type !== "none" 자체) — override 필요 시 `advanced.settings.disableStorageReset`
- **한 —** 본 migration 진입 후 = `dsmonitor/lighthouse/config.js` 자체 삭제 권고 (혼동 자체 회피). 자체 잔존 = dsmonitor 자체 read 안 함 자연 무시.
- **한 —** 옛 `node node_modules/dsmonitor/lighthouse/run.js` 자체 직접 호출 흐름 자체 폐기 — 새 흐름 자체 = `npx dsmonitor audit --only lighthouse` (단독 측정) 또는 `npx dsmonitor audit --all` (통합 chain).
- **한 —** 자체 dsmonitor 자체 안 LHCI default options 자체 hard-code 흐름 = 옛 portal-gateway 환경 안 자세 자세 (desktop preset / 1350×940 / skipAudits 자체 없음 / disableStorageReset 자체 auth.type 안 자동) 자세 자세 자체 일관. 사내망 안 `skipAudits: ["uses-http2"]` 자체 활용 케이스 = `lighthouse.advanced.settings.skipAudits` 자체 명시.
- **한 —** dsmonitor 분석 동작 (`code` / `figma` analyzer + `report` + `dashboard`) 변경 0건. `npm run typecheck` + `npm run build` 통과 확인.
- **EN —** **0.4.x → 0.5.0 migration table** — move the hard-coded body in `dsmonitor/lighthouse/config.js` into `lighthouse` inside `dsmonitor.config.ts`:
  - `const PAGES = [...]` → `lighthouse.pages: [{ path, name }, ...]`
  - `numberOfRuns: 3` → `lighthouse.runs: 3`
  - `settings: { ... }` → `lighthouse.advanced: { settings: { ... } }`
  - `puppeteerScript: "..."` → `lighthouse.auth: { type: "custom", adapter: "..." }`
  - `disableStorageReset: true` → automatic when `auth.type !== "none"`; override via `advanced.settings.disableStorageReset` if needed
- **EN —** After migration, delete `dsmonitor/lighthouse/config.js` to avoid confusion. Leaving it in place is harmless (dsmonitor ignores it).
- **EN —** Direct invocation of `node node_modules/dsmonitor/lighthouse/run.js` is no longer supported. Use `npx dsmonitor audit --only lighthouse` (standalone) or `npx dsmonitor audit --all` (chained with code + figma + report + dashboard).
- **EN —** The hard-coded LHCI defaults match the portal-gateway-web setup (desktop preset, 1350×940, no `skipAudits`, automatic `disableStorageReset`). Add intranet-specific options like `skipAudits: ["uses-http2"]` via `lighthouse.advanced.settings.skipAudits`.
- **EN —** Zero changes to dsmonitor's analyzers (`code` / `figma`), `report`, or `dashboard`. `npm run typecheck` and `npm run build` pass.

[0.5.0]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.5.0

## [0.4.2] — 2026-05-14

### 정정 / Fixed

- **한 —** `@lhci/cli` healthcheck 안 "Chrome installation not found" fail 케이스 사전 회피 흐름 추가. `lighthouse/run.js` 진입부 안 `chrome-launcher.Launcher.getInstallations()` 자체 호출 + `installations[0]` 자동 `process.env.CHROME_PATH` export. `@lhci/cli` 안 `determineChromePath()` 흐름 안 두 번째 source (`process.env.CHROME_PATH`) 자연 활용 → 일부 환경 (옛 chrome-launcher version + 최신 macOS + 사용자 권한 Chrome install path 등 조합) 안 healthcheck fail 우회. 외부 사용자 자체 `CHROME_PATH` 명시 X 자연 작동. 사용자 명시 시점 = 자동 export skip.
- **한 —** `templates/dsmonitor.config.ts.tpl` 안 `projectRoot` default 정정 — `"."` → `".."`. 옛 default = dsmonitor/ 폴더 자체 측정 안 진입 (`attachAbsRoot` 안 `path.resolve(configDir, ".")` = `<project>/dsmonitor/` → 코드 검색 = 거의 항상 0 매치, 의미 X 결과). 새 default = parent 폴더 = 실제 프로젝트 root, 본 의도 동작. **옛 default 그대로 활용 사용자 환경 = 새 default 정정 후 측정 결과 변경 가능 — 본 의도 정상화 흐름** (### 참고 sub-section 안 자세 안내).
- **EN —** Avoided the `@lhci/cli` healthcheck "Chrome installation not found" failure observed in some environments (older `chrome-launcher` versions on recent macOS, user-scoped Chrome installs, etc.). `lighthouse/run.js` now calls `chrome-launcher.Launcher.getInstallations()` itself and exports the first hit as `process.env.CHROME_PATH` before spawning LHCI. The healthcheck then resolves Chrome via its second source (`process.env.CHROME_PATH`) and passes. Users who set `CHROME_PATH` themselves are left untouched.
- **EN —** Corrected the default `projectRoot` in `templates/dsmonitor.config.ts.tpl` from `"."` to `".."`. The old default pointed at the `dsmonitor/` folder itself, so codebase scanning ran against the wrong root and produced essentially empty results. The new default points at the parent project, matching the intent. **Existing users who kept `"."` will see different (correct) numbers after this fix** (more in the Notes section).

### 변경 / Changed

- **한 —** `README.md` 안 "외부 사용자 환경 처리 흐름 / Adopting `dsmonitor` to Your Stack (0.4.2)" sub-section 신규 추가. 위치 = "Filling `dsmonitor.config.ts` After Init" 직후. 본문 = 5종 환경 자세 (TS / JS, React / Vue, 빌드 도구, CSS, 추가 영향 필드) + `stylingPolicy` 4 preset (`scss-project` / `tailwind-project` / `css-modules-project` / `bootstrap-project`) + 환경별 정정 자세 (표 형태) + 측정 노이즈 사항 안내. 한국어 본문 (위) + 영어 본문 (아래) 분리 흐름 자체 도입 (옛 mirror 흐름 정정).
- **한 —** `README.md` 안 "environment-specific config sketch (0.4.2)" sub-section 신규 추가 — 4 케이스 sample (Next.js + SCSS / Next.js + Tailwind / Next.js + CSS Modules / Vite + Tailwind). Tailwind 환경 안 자세 정정 권고 (`scssVariableCompliance: false` / `scssVariableUsagePatterns: []` / `scssVariableDefFiles: ["src/app/globals.css"]` 등).
- **한 —** `README.md` 안 "Lighthouse 인증 흐름" sub-section 자체 정정 — 옛 안내 (`puppeteer 별도 install 불필요. LHCI가 self-host`) 정정. 새 안내 = Chrome 사전 install 필수 + OS별 install 흐름 (macOS / Linux / Windows / Docker / CI) + dsmonitor 0.4.2+ 자동 `CHROME_PATH` 흐름 + chrome-launcher 자체 검증 명령. 한 / EN mirror.
- **한 —** `src/cli/init.ts` 안 끝 안내 본문 보충 — Lighthouse=Y 케이스 안 "Lighthouse 측정 사전 안내" sub-section 신규. Chrome 자체 사전 install 안내 + OS별 install 명령 + `docs/lighthouse-ci-integration.md` 자세 안내 link.
- **한 —** `docs/lighthouse-ci-integration.md` 전면 재정리 — 옛 STALE 본문 (쿠키 파일 restore 플로우 기반 옛 안내) 자체 제거. 새 본문 = `@lhci/cli` 안 Chrome 감지 흐름 자세 + OS별 사전 install + `CHROME_PATH` 환경변수 자세 + CI 환경 (GitHub Actions / Jenkins / GitLab) 자세 + 사내 환경 다른 path 케이스 + 흔한 에러 정정 흐름.
- **EN —** Added a new "Adopting `dsmonitor` to Your Stack (0.4.2)" sub-section to `README.md`, placed right after "Filling `dsmonitor.config.ts` After Init". It walks through the five stack axes (TS/JS, React/Vue, build tool, CSS strategy, related fields), the four `stylingPolicy` presets, and per-stack adjustment tables, plus noise-handling notes. Korean above, English below.
- **EN —** Added an "environment-specific config sketch (0.4.2)" sub-section with four sample configs (Next.js + SCSS, Next.js + Tailwind, Next.js + CSS Modules, Vite + Tailwind). The Tailwind sample includes the correct toggles (`scssVariableCompliance: false`, empty SCSS var patterns, `globals.css` in `scssVariableDefFiles`).
- **EN —** Rewrote the "Lighthouse Auth Flow" sub-section in `README.md`. The earlier note (`puppeteer not required; LHCI self-hosts`) was wrong; Chrome itself must be installed. Added OS-specific install commands (macOS / Linux / Windows / Docker / CI) and a description of the 0.4.2 auto-`CHROME_PATH` behavior.
- **EN —** Extended the closing guidance printed by `src/cli/init.ts` with a "Lighthouse 측정 사전 안내" block on the Lighthouse=Y path. Chrome install hint, OS commands, and a pointer to `docs/lighthouse-ci-integration.md`.
- **EN —** Rewrote `docs/lighthouse-ci-integration.md` from scratch. The old body was a stale, cookie-restore-based note. The new body covers Chrome detection inside `@lhci/cli`, per-OS install steps, the `CHROME_PATH` env var, CI templates (GitHub Actions / Jenkins / GitLab), corporate path layouts, and common error remedies.

### 참고 / Notes

- **한 —** docs / template / init 출력 / `lighthouse/run.js` 정정. dsmonitor 분석 동작 (`code` / `figma` analyzer + `report` + `dashboard`) 변경 0건. `npm run typecheck` + `npm run build` 통과 확인. **BREAKING X** — 외부 사용자 환경 안 옛 0.4.1 config 그대로 작동.
- **한 —** **`projectRoot` default 정정 영향 안내** — 옛 `templates/dsmonitor.config.ts.tpl` 안 default = `"."` → 새 default = `".."`. 본 정정 자체 = bug fix (옛 default 동작 = dsmonitor/ 자체 측정 = 의미 X 결과). 옛 default 그대로 활용 사용자 환경 (init 후 자체 정정 X 케이스) = 새 default 정정 후 첫 측정 결과 변경 가능. 옛 의도 동작 = 본 정정 흐름 자체 — 옛 흐름 그대로 유지 안 권고. 옛 사용자 환경 안 `projectRoot: "."` 그대로 활용 케이스 = `".."` 정정 권고 (또는 적정한 다른 상대 경로). portal-gateway-web 환경 = 이미 `projectRoot: ".."` 명시 — 영향 X.
- **한 —** archive-portal-inspector-web 외부 사용성 검증 흐름 안 발견 사항 4종 누적 정정 — (M) environment guide 신규 / (N) projectRoot default / (O) README 핵심 sub-section 한정 한/영 분리 / (P) Chrome 자동 감지 흐름. 본 patch = 발견 사항 일괄 정정.
- **한 —** chrome-launcher 자체 fail 케이스 (env 자체 안 Chrome 부재) = `lighthouse/run.js` 안 친절 안내 (`Chrome 자체 미감지 — install 권고`) 출력 후 옛 흐름 그대로 진입. `@lhci/cli` 자체 healthcheck fail 흐름 그대로 만남 — 사용자 환경 안 Chrome install 필요.
- **EN —** Docs / template / init-output / `lighthouse/run.js` changes only. Zero changes to dsmonitor's analyzers (`code` / `figma`), `report`, or `dashboard`. `npm run typecheck` + `npm run build` pass. **Not breaking** — existing 0.4.1 configs keep working.
- **EN —** **Impact of the `projectRoot` default change** — the template default flipped from `"."` to `".."`. This is a bug fix: the old default scanned the `dsmonitor/` folder itself (essentially nothing). Users who kept `"."` will see their first post-upgrade measurement differ; update to `".."` (or another appropriate relative path) to keep the intended behavior. `portal-gateway-web` already sets `".."`, so it is unaffected.
- **EN —** Four findings from the archive-portal-inspector-web usability review consolidated into one patch — (M) environment guide, (N) `projectRoot` default, (O) Korean/English split for new sub-sections, (P) Chrome auto-detection.
- **EN —** When `chrome-launcher` itself can find no Chrome (the system has none), `lighthouse/run.js` prints a friendly install hint and proceeds; `@lhci/cli` will then fail its own healthcheck with the original error — install Chrome to resolve.

[0.4.2]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.4.2

## [0.4.1] — 2026-05-14

### 정정 / Fixed

- **한 —** `dsmonitor init` 자동 생성 본문 안 figma placeholder 주석 정정. 옛 본문 = `{ label: "v1", fileKey: "<Figma file key>", nodes: [...] }` 형태 안내 — 옛 0.1.x 시절 흐름. 0.2.0~0.4.0 안 실제 타입 = `{ url, label, primary?, comment? }` (DS) + 패턴 A/B/C union (도메인). 외부 사용자 환경 안 init 결과를 보고 옛 `fileKey` / `nodes` / `frames` 형태로 작성 시점에 외부 사용자 환경 tsc 안 type error 발생 가능. 새 본문 = `{ url: "https://www.figma.com/design/XXXXX/..." , label }` 형태 + 3 패턴 자세 안내 + 혼합 흐름 + URL 추출 방법 안내 (`Copy link to selection` 등) + node-id 정규화 안내.
- **한 —** `dsmonitor init` 자동 생성 본문 안 figma 항목 누락 4 필드 보충 — `validationLevel: "lite"` + `unknownInstances: { topN, allowUnknownSource }` + `codeTokens: { parsers }` + 새 figma 본문 안내. 옛 본문 = `apiToken / designSystemFiles / domainFiles` 3 필드만 출력 — 실제 `FigmaConfig` required 필드 5종 모두 안 만족. 외부 사용자 환경 안 tsc strict 안 실제 type error 발생 케이스 사전 회피.
- **EN —** Fixed the figma placeholder comments generated by `dsmonitor init`. The previous body suggested `{ label: "v1", fileKey: "<Figma file key>", nodes: [...] }` — a shape from the 0.1.x lineage. The actual types since 0.2.0 / 0.4.0 are `{ url, label, primary?, comment? }` for DS files and a discriminated union (Pattern A/B/C) for domain files, so users following the old TODO comments would hit a `tsc` error in their own project. The new body walks through the three patterns (whole-file / pages / frames), the mixed flow, the URL extraction steps ("Copy link to selection"), and the auto-normalization of `node-id` (hyphen ↔ colon).
- **EN —** Filled the missing required fields in the init-generated `figma` block — `validationLevel: "lite"`, `unknownInstances: { topN, allowUnknownSource }`, `codeTokens: { parsers }`. The previous body only emitted `apiToken / designSystemFiles / domainFiles`, leaving the user-side config short of the 5 required fields on `FigmaConfig` and provoking a strict-mode `tsc` error.

### 변경 / Changed

- **한 —** `README.md` 안 "Figma 입력 흐름 / Figma Input Flow (0.4.1)" sub-section 신규 추가. "Filling `dsmonitor.config.ts` After Init" sub-section 직후 위치. DS / 도메인 분리 의도 + 패턴 A/B/C 자세 안내 + 혼합 흐름 안내 + URL 추출 방법 (Copy link / Copy link to selection) + node-id 정규화 안내. 한 / EN mirror 일관.
- **EN —** Added a new "Figma Input Flow (0.4.1)" sub-section to `README.md`, immediately after "Filling `dsmonitor.config.ts` After Init". Covers the DS / domain split rationale, the three patterns (A/B/C), the mixed flow, URL extraction (Copy link / Copy link to selection), and the auto-normalized `node-id` form. KO / EN mirrored.

### 참고 / Notes

- **한 —** docs / template / init 출력 변경. dsmonitor 분석 동작 (`code` / `figma` / `lighthouse` analyzer + `report` + `dashboard`) 변경 0건. figma 입력 흐름 자체 (타입 / URL 파서 / processor) = 옛 0.4.0 흐름 그대로 작동 — 본 patch = 안내만 정정. **BREAKING X**. 외부 사용자 환경 안 옛 0.4.0 흐름 그대로 사용 가능 (config 변경 0건).
- **한 —** 옛 외부 사용자 환경 (init 결과를 그대로 사용했던 케이스) = 본 release 안 새 init 결과 본문이 정확한 흐름 안내. 옛 환경 안 옛 placeholder 주석 본문 그대로면 dsmonitor 자체 분석은 정상 작동하지만 외부 사용자 환경 tsc strict 안 type error 가능 — 본 release 안 새 본문 참조 후 정정 권고.
- **한 —** archive-portal-inspector-web 외부 사용성 검증 흐름 안 발견 — init 결과 본문이 옛 흐름이라 외부 사용자 환경 안 옛 형태로 작성 진입 케이스. 본 patch = 발견 사항 일괄 정정.
- **EN —** Docs / template / init-output changes only. Zero changes to dsmonitor's analyzers (`code` / `figma` / `lighthouse`), `report`, or `dashboard`. The figma input flow (types / URL parser / processor) keeps the 0.4.0 behavior — this patch only updates the guidance. **Not breaking**. Existing configs from 0.4.0 keep working untouched.
- **EN —** Users who copy-pasted directly from the old init output will find the new body more accurate. The analyzer still accepts the old (incomplete) shape at runtime, but the user-side `tsc` would have flagged it under strict mode. Refresh against the new init body when convenient.
- **EN —** Captured from the archive-portal-inspector-web usability review — the init body was steering external adopters toward the legacy `fileKey` / `nodes` shape. This patch fixes the guidance in one pass.

[0.4.1]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.4.1

## [0.4.0] — 2026-05-12

### 추가 / Added

- **한 —** Lighthouse 인증 흐름 재설계 — `lighthouse.auth` 필드 도입 (3종 discriminated union: `{ type: "none" }` / `{ type: "basic", loginUrl: string, selectors?: ... }` / `{ type: "custom", adapter: string }`). 옛 `LighthouseConfig.authAdapter?: string` 단일 필드 자리 = `lighthouse.auth` 안 자세 정정 (breaking — 아래 ### 변경 sub-section 참조).
- **한 —** dsmonitor 패키지 내장 인증 어댑터 `lighthouse/auth/basic-form-login.js` 신규 — 표준 form login (이메일/ID/사용자명 + 비밀번호 + submit). 환경변수: `LIGHTHOUSE_BASE_URL` / `LIGHTHOUSE_LOGIN_URL` / `LIGHTHOUSE_TEST_ID` / `LIGHTHOUSE_TEST_PW`. selector 자동 추론 (`input[type="email"]` / `input[type="password"]` / `button[type="submit"]`) + `LIGHTHOUSE_BASIC_SELECTOR_*` 환경변수 override 지원. baseUrl 진입 후 loginUrl path 안 머무름 여부로 `isAuthed` 사전 판별 → 매 측정 URL 풀 로그인 회피.
- **한 —** `dsmonitor init` 안 Lighthouse 인증 방식 select prompt 신규 — Lighthouse=Y 케이스에 (1. 인증 없음 / 2. ID/PW 기본 / 3. 커스텀 어댑터) 3종 안내. 선택에 따라 `dsmonitor.config.ts` 안 `auth` 블록 + `.env.local.example` 환경변수 + `dsmonitor/lighthouse/config.js` (LHCI config) 동적 생성. 커스텀 케이스 = `dsmonitor/lighthouse/auth/custom.js` 스켈레톤 자동 생성 (어댑터 인터페이스 + 환경변수 read 예시 + 다단계 인증 안내 주석 포함).
- **한 —** 어댑터 인터페이스 확장 — `module.exports.getMetadata = () => Record<string, any>` 함수 export 시 `lighthouse/run.js` 가 require 후 호출 → `summary.json` 안 누적. 옛 흐름 = `process.env.LIGHTHOUSE_TEST_ID` / `LIGHTHOUSE_ZONE_ACCOUNT_LABEL` 두 변수 hard-code read → 새 흐름 = 어댑터 자체가 메타데이터 결정. basic 어댑터 = `{ authType, testAccount, loginUrl }`. 커스텀 어댑터 = 자유 정의.
- **한 —** `dsmonitor.config.ts` 자동 생성본 안 인증 방식 3종 명확 주석 — `auth: { ... }` 옆 한 줄 주석 (`// 1. 인증 없음 / 2. ID/PW 기본 / 3. 커스텀 어댑터`) + 자세 안내 link.
- **EN —** Redesigned the Lighthouse auth flow — introduces `lighthouse.auth` as a 3-way discriminated union: `{ type: "none" }` / `{ type: "basic", loginUrl, selectors? }` / `{ type: "custom", adapter }`. Replaces the prior `LighthouseConfig.authAdapter?: string` field (breaking — see "Changed" below).
- **EN —** Added a package-internal auth adapter `lighthouse/auth/basic-form-login.js` — standard form login (email/ID/username + password + submit). Env vars: `LIGHTHOUSE_BASE_URL` / `LIGHTHOUSE_LOGIN_URL` / `LIGHTHOUSE_TEST_ID` / `LIGHTHOUSE_TEST_PW`. Auto-infers selectors (`input[type="email"]` / `input[type="password"]` / `button[type="submit"]`); override via `LIGHTHOUSE_BASIC_SELECTOR_*` env vars. Pre-checks `isAuthed` (does the baseUrl land on the login path?) to skip the full login on subsequent invocations.
- **EN —** `dsmonitor init` now prompts for an auth strategy on the Lighthouse=Y path (1. none / 2. basic ID-PW / 3. custom adapter). The choice drives generation of the `auth` block in `dsmonitor.config.ts`, the environment-variable block in `.env.local.example`, and the LHCI config at `dsmonitor/lighthouse/config.js`. The custom branch additionally scaffolds `dsmonitor/lighthouse/auth/custom.js` with the adapter contract, env-var examples, and notes on multi-step flows.
- **EN —** Extended the adapter contract — exporting `module.exports.getMetadata = () => Record<string, any>` lets `lighthouse/run.js` pick up metadata at summary time. Replaces the old hard-coded reads of `LIGHTHOUSE_TEST_ID` and `LIGHTHOUSE_ZONE_ACCOUNT_LABEL`. The built-in basic adapter returns `{ authType, testAccount, loginUrl }`; custom adapters define their own shape.
- **EN —** The generated `dsmonitor.config.ts` carries explicit comments next to `auth: { ... }` describing all three strategies and pointing at the README sub-section.

### 변경 / Changed

- **한 —** **BREAKING** — `LighthouseConfig.authAdapter?: string` 옛 필드 자리 제거. 새 `LighthouseConfig.auth?: LighthouseAuthConfig` 필드로 자세 정정. 옛 필드 = 실제 활용 사용처 0건 (Phase B 예약 자리만) — 외부 사용자 환경 영향 0건 예상. 옛 portal-gateway 어댑터 = `lighthouse/config.js` 안 `puppeteerScript` 직접 명시 흐름 그대로 작동 (config.ts 안 `auth` 필드 = 새 어댑터 메타데이터 inject 안 read 됨, 옛 어댑터는 `getMetadata()` 미export 안 자연 무시).
- **한 —** **BREAKING** — `lighthouse/run.js` 안 `summary.json` 생성 흐름 자세 정정. 옛 = `testAccount: process.env.LIGHTHOUSE_TEST_ID || null` + `zoneAccountLabel: process.env.LIGHTHOUSE_ZONE_ACCOUNT_LABEL || null` 두 필드 hard-code → 새 = `authType` + 어댑터 `getMetadata()` 반환값 spread. 옛 portal-gateway 어댑터 사용자 = `summary.json` 안 `testAccount` / `zoneAccountLabel` 필드 자동 누적 안 됨 → 어댑터 자체에 `getMetadata()` 추가 권고 (외부 사용자 환경 migration 안내 — 아래 ### 참고 sub-section).
- **한 —** `src/cli.ts` 안 `runLighthouse(configDir)` → `runLighthouse(configDir, lighthouseConfig?)` 시그니처 확장. `cfg.lighthouse.auth` read → 어댑터 path 결정 (basic = 패키지 내장 절대 path / custom = `configDir` 기준 상대 path) → `DSMONITOR_LIGHTHOUSE_AUTH_TYPE` + `DSMONITOR_LIGHTHOUSE_AUTH_ADAPTER` 환경변수 inject 후 `run.js` spawn.
- **한 —** `.env.local.example.tpl` 정정 — 옛 hard-code 본문 (BASE_URL + TEST_ID + ZONE_ACCOUNT_LABEL 3 줄) → 새 `{{FIGMA_ENV_BLOCK}}` + `{{LIGHTHOUSE_ENV_BLOCK}}` 두 토큰 자리. `init` 안 인증 방식에 따라 동적 본문 inject (none = BASE_URL 만 / basic = BASE_URL + LOGIN_URL + TEST_ID + TEST_PW + selector override 안내 / custom = BASE_URL + 자유 변수 안내 주석).
- **한 —** `src/cli/init.ts` 안 끝 안내 본문 자세 정정 — 신규 단계 `1.5. dsmonitor/dsmonitor.config.ts 검토 + Figma file ID / Lighthouse URL 입력` + (custom 케이스) `1.6. dsmonitor/lighthouse/auth/custom.js 어댑터 본문 작성` 진입. 신규 sub-section `CLI 옵션 안내` (`audit --all` / `--baseline` / `--only lighthouse` / `--skip-lighthouse` / `--help`) 누적.
- **한 —** `src/cli/init.ts` 안 "사용자 측" 표현 4곳 정정 — file header docstring (L2) / init banner output (L46) / 1단계 precheck 주석 / `@lhci/cli` 실패 warn 본문 → "외부 사용자" / 자연 호명.
- **한 —** `README.md` 안 sub-section 3종 신규 — (a) "init 이후 `.env.local` 작성 / Filling `.env.local` After Init" — auth 방식별 변수 표, (b) "init 이후 `dsmonitor.config.ts` 작성 / Filling `dsmonitor.config.ts` After Init" — config 입력 항목, (c) "Lighthouse 인증 흐름 / Lighthouse Auth Flow (0.4.0)" — 3 케이스 자세 + 어댑터 인터페이스 코드 블록. 한 / EN mirror 일관.
- **EN —** **BREAKING** — Removed `LighthouseConfig.authAdapter?: string`. Replaced with `LighthouseConfig.auth?: LighthouseAuthConfig`. The old field had zero consumers (it was a Phase B placeholder), so external users should not be affected. Existing portal-gateway-style adapters that wire `puppeteerScript` directly inside `lighthouse/config.js` keep working — the new `auth` field is only consulted when injecting adapter metadata, and adapters that don't export `getMetadata()` are silently ignored.
- **EN —** **BREAKING** — `lighthouse/run.js` no longer hard-codes `testAccount` / `zoneAccountLabel`. Instead it emits `authType` and spreads `adapter.getMetadata()`. Users on the legacy portal-gateway adapter will see those two fields disappear from `summary.json` until they add `getMetadata()` to their adapter (see migration notes below).
- **EN —** `runLighthouse(configDir)` in `src/cli.ts` now accepts an optional `lighthouseConfig`. It resolves the adapter path (built-in for `basic`, `configDir`-relative for `custom`) and injects `DSMONITOR_LIGHTHOUSE_AUTH_TYPE` / `DSMONITOR_LIGHTHOUSE_AUTH_ADAPTER` before spawning `run.js`.
- **EN —** `.env.local.example.tpl` switched from a hard-coded body to two token holes (`{{FIGMA_ENV_BLOCK}}` / `{{LIGHTHOUSE_ENV_BLOCK}}`). `init` substitutes a body that matches the chosen auth strategy.
- **EN —** Extended the closing guidance printed by `src/cli/init.ts` — adds a `1.5` step (review `dsmonitor.config.ts`, fill Figma file ID / Lighthouse URL), a `1.6` step for the custom branch (fill in the adapter), and a "CLI 옵션 안내" block enumerating `audit --all` / `--baseline` / `--only lighthouse` / `--skip-lighthouse` / `--help`.
- **EN —** Renamed four "사용자 측" phrasings in `src/cli/init.ts` to "외부 사용자" or natural alternatives.
- **EN —** Added three new sub-sections to `README.md` — (a) "Filling `.env.local` After Init" with an auth-type-aware variable table, (b) "Filling `dsmonitor.config.ts` After Init" with the config fields, (c) "Lighthouse Auth Flow (0.4.0)" walking through all three strategies and the adapter interface. KO / EN mirrored.

### 정정 / Fixed

- **한 —** 옛 `.env.local.example.tpl` 안 `LIGHTHOUSE_TEST_PW` 안내 부재 정정. 옛 = `LIGHTHOUSE_TEST_ID` + `LIGHTHOUSE_ZONE_ACCOUNT_LABEL` 두 줄만 안내 → 외부 사용자 환경 안 인증 어댑터 작성 시점에 PW 환경변수 자체 미확인 가능. 새 흐름 = 인증 방식별 동적 생성 안 PW 한 줄 자연 누적 (basic 케이스).
- **한 —** 옛 init 출력 안 "다음 단계" 본문 부재 정정 — `.env.local` 작성 후 `dsmonitor.config.ts` 안 어떤 항목 입력해야 하는지 안내 없음. 새 흐름 = 1.5 단계 신규 진입 + CLI 옵션 안내 sub-section 누적.
- **한 —** 옛 init 본문 안 "사용자 측" 자제어 표현 정정 (4곳 → "외부 사용자" / 자연 호명).
- **EN —** Restored the missing `LIGHTHOUSE_TEST_PW` guidance from `.env.local.example.tpl`. With the new auth-type-aware generation, `basic` always emits the password line.
- **EN —** Filled the gap in init's "next steps" output — the previous version stopped at `.env.local`, leaving users without guidance for the `dsmonitor.config.ts` review or the available CLI flags. The new step 1.5 and the CLI options sub-section cover both.
- **EN —** Replaced four occurrences of "사용자 측" inside init output and comments with "외부 사용자" / natural alternatives.

### 참고 / Notes

- **한 —** 외부 사용자 환경 migration 안내 — 옛 `LighthouseConfig.authAdapter` 필드 사용자 = 0건 예상 (Phase B 예약 자리). 옛 portal-gateway 어댑터 사용자 = 두 가지 흐름 선택 가능: (1) `lighthouse/config.js` 안 `puppeteerScript` 직접 명시 흐름 그대로 유지 (옛 본문 변경 0건, summary.json 안 옛 testAccount / zoneAccountLabel 필드 자동 누적 안 됨), (2) 어댑터 안 `module.exports.getMetadata = () => ({ testAccount, zoneAccountLabel })` 한 함수 추가 + `dsmonitor.config.ts` 안 `lighthouse.auth = { type: "custom", adapter: "./lighthouse/auth/portal-gateway.js" }` 한 줄 추가 → summary.json 안 메타데이터 자연 누적 회복.
- **한 —** docs / template / init 출력 + lighthouse/auth/ 신규 + run.js / cli.ts 정정. dsmonitor 분석 동작 (`code` / `figma` analyzer + `report` + `dashboard`) 변경 0건. `npm run typecheck` + `npm run build` 통과 확인.
- **한 —** release 절차 안내 누적 — GitHub Releases API 안 `target_commitish` 필드 = short SHA 미허용 (full 40자 SHA 사용 권고). `gh release create` 호출 cwd = repo 루트 진입 후 명시 (다른 cwd 안 호출 시 `not a git repository` 또는 `current directory does not match repo` 에러 가능). 본 안내 = 옛 0.3.3 publish 흐름 안 직접 만난 케이스 누적.
- **한 —** 후속 (Phase C 검토 중) — 인증 어댑터 패키지 분리 (`@dsmonitor/lighthouse-auth-*` scope) + selector 자동 추론 강화 (헤더 menu / cookie banner 등 페이지 안 noise 자연 회피) + 어댑터 인터페이스 정식화 (`AuthAdapter` interface — Phase B 옛 계획 자리 회복). 본 release 범위 외, 0.5.0+ major 분리 진입 예정.
- **EN —** Migration notes — the prior `LighthouseConfig.authAdapter` field had zero known consumers (a Phase B placeholder). Users running the legacy portal-gateway adapter have two paths: (1) keep wiring `puppeteerScript` directly in `lighthouse/config.js` and accept that `testAccount` / `zoneAccountLabel` no longer appear in `summary.json`, or (2) add a single `module.exports.getMetadata = () => ({ testAccount, zoneAccountLabel })` export to the adapter and set `lighthouse.auth = { type: "custom", adapter: "./lighthouse/auth/portal-gateway.js" }` in the config — metadata flows back into `summary.json` automatically.
- **EN —** Docs / template / init output + new `lighthouse/auth/` + `run.js` / `cli.ts` changes. Zero changes to dsmonitor's analyzers (`code` / `figma`), `report`, or `dashboard`. `npm run typecheck` + `npm run build` pass.
- **EN —** Release-procedure notes — GitHub Releases API's `target_commitish` field rejects short SHAs (use a full 40-character SHA). Always run `gh release create` from the repo root (other cwds raise `not a git repository` or a mismatching-repo error). Captured from the 0.3.3 publish flow.
- **EN —** Out of scope, deferred to 0.5.0+ — splitting the auth adapters into their own scoped packages (`@dsmonitor/lighthouse-auth-*`), stronger selector inference (handling header menus, cookie banners, and similar page noise automatically), and formalizing the `AuthAdapter` interface that was originally planned for Phase B.

[0.4.0]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.4.0

## [0.3.3] — 2026-05-12

### 정정 / Fixed

- **한 —** `dependencies.@typescript-eslint/parser` 의 `^7.18.0` → `^8.0.0` 으로 bump. 옛 7.x parser 의 peer eslint `^8.56.0` 제약 때문에 eslint 9 사용자 환경에서 `npm install dsmonitor` 시점에 WARN ERESOLVE (parser peer 충돌) 발생하던 케이스 회복. 8.x parser 의 peer 는 `eslint: ^8.57.0 || ^9.0.0 || ^10.0.0` 으로 eslint 9 / 10 까지 자연 호환.
- **EN —** Bumped `dependencies.@typescript-eslint/parser` from `^7.18.0` to `^8.0.0`. The 7.x parser carried `eslint ^8.56.0` as its peer, which produced an `npm install` ERESOLVE warning for users on eslint 9. The 8.x parser declares `eslint: ^8.57.0 || ^9.0.0 || ^10.0.0` and is compatible with eslint 9 / 10 out of the box.

### 변경 / Changed

- **한 —** `dependencies.@typescript-eslint/types` + `@typescript-eslint/visitor-keys` 두 항목 제거. dsmonitor 소스 코드 내 직접 import 가 없고, `@typescript-eslint/parser` 의 transitive 로 자연 만족되는 redundant 한 항목이었음. install 크기 감소 + dep tree 단순화.
- **한 —** `tsup.config.ts` 의 `external` 배열은 두 이름 그대로 유지 — 향후 parser 의 transitive 구조가 변경되어도 번들 회피 안전 망 보존.
- **EN —** Removed `@typescript-eslint/types` and `@typescript-eslint/visitor-keys` from `dependencies`. Neither is imported directly by dsmonitor's source — both are pulled in transitively by `@typescript-eslint/parser`. This trims the dep list and shrinks the install footprint.
- **EN —** The `external` array in `tsup.config.ts` still lists both names so that future changes in the parser's transitive structure cannot accidentally bundle them.

### 참고 / Notes

- **한 —** parser 7.x → 8.x 는 major bump 이지만 dsmonitor 가 호출하는 부분 (`parse()` 함수 1곳, `src/frameworks/react.ts`) 의 시그니처 + 옵션 (`jsx`, `loc`, `range`, `tokens`, `comment`, `errorOnUnknownASTType`, `ecmaFeatures`, `ecmaVersion`, `sourceType`, `filePath`) 모두 8.x 에서도 동일하게 유효. AST 노드 형태 (ESTree + JSX 확장) 도 동일.
- **한 —** dsmonitor 소스 코드 변경 0건. `npm run typecheck` + `npm run build` 통과, parser 8.59.3 직접 smoke test (`parse()` 호출 후 `Program` AST 정상 반환) 통과, `node dist/cli.js --help` CLI bootstrap 통과.
- **한 —** 사용자 환경 영향 — eslint 9 + 10 사용자: WARN ERESOLVE 해소, install 자연 통과. eslint 8.57+ 사용자: 변화 없음 (옛 동작 그대로). eslint 8.56 이하 사용자: 본 release 부터 install 시점에 parser 8.x peer 와 충돌 가능 (2026-05 시점에 8.56 이하 환경은 매우 드묾).
- **한 —** TypeScript 호환 범위 — parser 8.x 의 peer `typescript: >=4.8.4 <6.1.0`. 현재 dsmonitor 의 devDep `typescript ^5.5.4` 와 자연 호환. 사용자 TypeScript 6.0+ 사용 시점 = peer optional 이라 install 차단 X (WARN 만).
- **한 —** `eslint-visitor-keys@5.0.1` 의 `engines.node` (`^20.19.0 || ^22.13.0 || >=24`) 가 dsmonitor 본체의 `engines.node` (`>=18.0.0`) 보다 엄격 — Node 18 / 20.0~20.18 사용자 install 시점에 `EBADENGINE` WARN 가능. 단 transitive WARN 이라 install 차단 X.
- **한 —** flat config 어댑터 추가 (`fromPolicyFlat()`) 는 본 release 범위 외 — 별도 0.4.0 minor release 흐름 계획.
- **EN —** parser 7.x → 8.x is a major bump, but dsmonitor's only call site (`parse()` in `src/frameworks/react.ts`) keeps the same signature and options across 7.x and 8.x. AST node shape (ESTree + JSX) is unchanged.
- **EN —** Zero source changes in dsmonitor. `npm run typecheck` and `npm run build` succeed, a direct `parse()` smoke test against parser 8.59.3 returns a valid `Program` AST, and `node dist/cli.js --help` bootstraps cleanly.
- **EN —** User-side impact — eslint 9 + 10 users: ERESOLVE warning gone, install resolves cleanly. eslint 8.57+ users: no behavioral change. eslint 8.56 and below: parser 8.x peer will conflict from this release onward, but environments below 8.56 in mid-2026 are rare.
- **EN —** TypeScript compatibility — parser 8.x declares `typescript: >=4.8.4 <6.1.0`. The dsmonitor devDep (`typescript ^5.5.4`) sits comfortably inside that range. Users on TypeScript 6.0+ see a peer warning, not an install block, because the peer is optional.
- **EN —** Note on Node engines — `eslint-visitor-keys@5.0.1` (a transitive of parser 8.x) declares `engines.node` of `^20.19.0 || ^22.13.0 || >=24`, which is stricter than dsmonitor's own `>=18.0.0`. Users on Node 18 / 20.0~20.18 will see an `EBADENGINE` warning at install. The warning does not block install.
- **EN —** The flat config adapter (`fromPolicyFlat()`) is intentionally out of scope here — planned for a separate 0.4.0 minor.

[0.3.3]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.3.3

## [0.3.2] — 2026-05-11

### 변경 / Changed

- **한 —** README `export-migration` 명령 측 sub-section 신규 추가 — 동작 / `--frame` / `--ds` flag 사양 / 사전 준비 / 출력 CSV 위치 + 컬럼 자세 / figmaUrl 자동 조립 / 활용 시점 / frame name 측 가져오기 흐름 자세 안내. 옛 placeholder만 안내 (`<comment>` / `<label>`) → 자세 sub-section 정정.
- **EN —** Added a detailed `export-migration` sub-section to README — behavior, `--frame` / `--ds` flag specs, prerequisites, output CSV location + columns, figmaUrl auto-assembly, usage scenarios, frame name discovery. Replaces the prior placeholder-only mention (`<comment>` / `<label>`) with a complete reference.

### 참고 / Notes

- **한 —** docs only patch — 코드 변경 0건 (cli.ts / analyzers / reporters / templates 측 모두 옛 동작 일관 유지).
- **한 —** 외부 사용자 측 직관 강화 — `export-migration` 명령 측 실제 동작 + 활용 시점 자세 안내 진입.
- **EN —** Docs-only patch — no code changes (cli.ts / analyzers / reporters / templates all behave as before).
- **EN —** Improves external user discoverability — `export-migration` is now documented with concrete behavior and usage examples.

[0.3.2]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.3.2

## [0.3.1] — 2026-05-11

### 추가 / Added

- **한 —** `npx dsmonitor audit --only lighthouse` flag 추가 — Lighthouse 측정만 단독 호출. 옛 `--only code` / `--only figma` 일관 확장 측면 — 사용자 측 `--only` flag 안 3 측정 (code / figma / lighthouse) 모두 단독 호출 가능 흐름.
- **EN —** Added `npx dsmonitor audit --only lighthouse` — runs Lighthouse measurement only. Consistent extension of the existing `--only code` / `--only figma` flags — users can now invoke any of the 3 measurements (code / figma / lighthouse) individually via `--only`.

### 변경 / Changed

- **한 —** README CLI 명령어 §3 정정 — `--only lighthouse` row 추가 (측정 명령 차이 표 + 빠른 시작 코드 블록).
- **EN —** Updated README CLI Commands §3 — added `--only lighthouse` row to the command differences table and quick-start code block.

### 참고 / Notes

- **한 —** 옛 `node node_modules/dsmonitor/lighthouse/run.js` 단독 호출 흐름 일관 (사용자 측 직관 강화) — 옛 호출 방식 보존 + 새 `--only lighthouse` flag 형태 호환.
- **한 —** Lighthouse 사전 준비 누락 시 친절 안내 + 종료 (옛 `runLighthouse` 측 흐름 일관).
- **한 —** `--only lighthouse` 와 `--all` 동시 사용 X 검증 (옛 v0.3.0 진입 흐름 일관 — only / all 의미 충돌 친절 안내).
- **EN —** Behaves identically to direct invocation via `node node_modules/dsmonitor/lighthouse/run.js` — legacy invocation preserved alongside the new `--only lighthouse` flag.
- **EN —** Missing Lighthouse prerequisites → friendly notice + exit (consistent with `runLighthouse` flow).
- **EN —** `--only lighthouse` and `--all` cannot be combined (consistent with v0.3.0 validation — only / all semantic conflict).

[0.3.1]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.3.1

## [0.3.0] — 2026-05-11

### 추가 / Added

- **한 —** `npx dsmonitor audit --all` 통합 측정 chain 명령 추가 — code analyzer + figma analyzer + Lighthouse 측정 + markdown report 생성 + dashboard 빌드 한 번 호출 chain 진입. 사용자 측 한 명령으로 전체 측정 + 출력 자동 생성 흐름.
- **한 —** `--skip-lighthouse` flag 추가 — Lighthouse 측정 (~25분) 건너뜀. 빠른 측정 (code + figma + report + dashboard, ~1-2분) 권고 시점 활용.
- **EN —** Added `npx dsmonitor audit --all` — single-call chain running code analyzer + figma analyzer + Lighthouse measurement + markdown report generation + dashboard build. Users can run all measurements + outputs with one command.
- **EN —** Added `--skip-lighthouse` flag — skips Lighthouse measurement (~25 min). Useful for fast measurement cycles (code + figma + report + dashboard, ~1-2 min).

### 변경 / Changed

- **한 —** README CLI 명령어 §3 정정 — 통합 측정 명령 차이 표 안 `npx dsmonitor audit --all` row 추가 (권고 명령 안내). Lighthouse 실행 명령 sub-section 자세 안내 추가 (`node node_modules/dsmonitor/lighthouse/run.js` 측 사전 준비 사항 안내 일관).
- **EN —** Updated README CLI Commands §3 — added `npx dsmonitor audit --all` row to the command differences table (recommended). Added detailed sub-section for Lighthouse direct invocation (`node node_modules/dsmonitor/lighthouse/run.js`) with prerequisite setup notes.

### 참고 / Notes

- **한 —** `audit --all` + `audit --only` 동시 사용 X — 의미 충돌 (only=부분 측정, all=통합 측정). 사용자 측 실수 시 친절 에러 안내 + exit 1.
- **한 —** Lighthouse 사전 준비 자세 — `dsmonitor/lighthouse/config.js` + `dsmonitor/lighthouse/auth/<project>.js` (Puppeteer 어댑터) + `dsmonitor/.env.local` 안 `LIGHTHOUSE_*` 환경변수. 사전 준비 누락 시 친절 안내 + chain 계속 진행 (report + dashboard 측 진입).
- **한 —** Lighthouse 측정 실패 시 chain 계속 진행 — code + figma 측정값 기반 report + dashboard 빌드 자연 진입.
- **EN —** `audit --all` and `audit --only` cannot be combined — semantic conflict (only=partial, all=integrated). Friendly error + exit 1 on misuse.
- **EN —** Lighthouse prerequisites — `dsmonitor/lighthouse/config.js`, `dsmonitor/lighthouse/auth/<project>.js` (Puppeteer adapter), `dsmonitor/.env.local` with `LIGHTHOUSE_*` env vars. Missing setup → friendly notice + chain continues (report + dashboard still run).
- **EN —** On Lighthouse failure, chain continues — markdown report + dashboard still generated from code + figma measurements.

[0.3.0]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.3.0

## [0.2.3] — 2026-05-07

### 변경 / Changed

- **한 —** 옛 코드 / docs / CHANGELOG / README / templates / presets/package.json / tsup.config.ts 안 6단어 (525건) 자연 한국어로 정정. 의미별 분기 — 사물 핵심 의미 → 핵심/필요/필수, 부분/위치 의미 → 부분/위치/정보, 누락 의미 → 누락/없음/아님, 발견 의미 → 발견 사항, 일치 의미 → 일치/일관, 정보/사항 의미 → 정보/사항/결과/형태/항목.
- **한 —** 코드 흐름 변경 0 — 주석 / docstring / md 본문 / log 메시지 / template 텍스트만 정정 (함수명 / 변수명 / import / export 변경 0건).
- **한 —** 옛 dsmonitor 0.1.5 / 0.2.1 안 한국어 자연화 정정 패턴과 일관.
- **한 —** false positive 1건 (자연 한국어 동사 안 substring 매칭) 보존 — 자연 한국어 흐름 우선.
- **EN —** Naturalized Korean phrasing across src / docs / CHANGELOG / README / templates / presets/package.json / tsup.config.ts (525 word edits). Mapped by meaning — keyword nouns → 핵심/필요/필수, region/location nouns → 부분/위치/정보, missing → 누락/없음/아님, finding → 발견 사항, consistency → 일치/일관, data/item → 정보/사항/결과/형태/항목.
- **EN —** No code-flow change — comments / docstrings / md body / log messages / template text only (no rename of functions / variables / imports / exports).
- **EN —** Consistent with the prior dsmonitor 0.1.5 / 0.2.1 Korean-naturalization patches.
- **EN —** One false-positive substring match (within a natural Korean verb form) preserved — natural Korean phrasing prioritized.

[0.2.3]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.2.3

## [0.2.2] — 2026-05-07

### 정정 / Fixed

- **한 —** Figma API 응답 크기 ~512MB (V8 문자열 한계) 초과 케이스 자동 처리. 페이지 단위 호출 실패 시점에 frame 단위 자동 재귀 분할 호출 흐름 추가. ds-legacy 파일 안 큰 page 호출 정상화 (예: `1963:6686` 케이스 — 옛 흐름은 페이지 통째로 누락, 0.2.2 부터 frame 단위로 분할 호출 후 합산).
- **한 —** 도메인 측 같은 패턴 정정 — `fetchNodes` 묶음 호출도 응답 크기 한계 초과 시 nodeIds 절반 분할 → 단일 node 도 한계 초과 시 frame 단위 재귀 분할 진입.
- **한 —** DS 측 분할 helper `fetchByFramesForFile` 메타데이터 호출 endpoint 정정 — 옛 `/v1/files/{key}?ids=X&depth=1` (root 기준 depth, X children 펼침 안 됨) → 새 `/v1/files/{key}/nodes?ids=X&depth=1` (parent 기준 depth, X 직속 children 정상 반환). 옛 endpoint 의 depth 파라미터 의미 오해로 1차 구현에선 children 0개 반환되며 분할 못 함 — 본 정정으로 정상 작동. 자식 fetch 는 옛대로 `/v1/files/{key}?ids=childId` 유지 (DS 응답 형태 보존, 호출 측 mergeInto 흐름 호환).
- **EN —** Auto-handles Figma API responses that exceed Node's V8 string limit (~512MB). When a page-level request fails, the scanner now recursively splits the call into frame-level requests and merges results. Fixes the previous behavior where a page like `1963:6686` in `ds-legacy` was dropped entirely from the count.
- **EN —** Domain scan applies the same pattern — bundled `fetchNodes` calls split in half on size overflow, and single-node calls fall back to recursive frame splitting.
- **EN —** Corrected the metadata-call endpoint inside `fetchByFramesForFile` from `/v1/files/{key}?ids=X&depth=1` (root-relative depth — X children not expanded) to `/v1/files/{key}/nodes?ids=X&depth=1` (X-relative depth — direct children returned). The first split implementation misread the `depth` semantics and returned zero children. Child fetches remain on `/v1/files/{key}?ids=childId` to preserve the DS response shape for the caller's merge flow.

### 추가 / Added

- **한 —** `src/analyzers/figma/responseSplitting.ts` 새 파일 — 분할 호출 helper 두 변종:
  - `fetchPageWithSplit(fileKey, pageId, token)` — DS 측 (`/v1/files/{key}?ids=...` 응답 형태 합산)
  - `fetchNodesWithSplit(fileKey, nodeIds, token)` — 도메인 측 (`/v1/files/{key}/nodes?ids=...` 응답 형태 합산)
- **한 —** `MAX_SPLIT_DEPTH = 4` 재귀 분할 깊이 한계. 도달 시 명시 에러 throw (silent fail 회피). depth=1 메타데이터 호출 자체가 한계 초과인 케이스도 명시 메시지로 wrapping.
- **한 —** Figma API 호출 횟수 카운터 — `resetFigmaApiCallCount()` / `getFigmaApiCallCount()` (전체 호출 수) + `getSplitFetchCount()` / `getSplitEntryCount()` (분할 호출 수). 측정 끝 시점에 `[figma] API 호출 통계` 출력. `SPLIT_CALL_WARN_THRESHOLD = 100` 초과 시 warning — rate limit + figma 파일 구조 검토 알림.
- **한 —** `FigmaApiError.code` 필드 (`"RESPONSE_TOO_LARGE" | null`) — 분할 호출 helper 의 분기 검출용. 옛 throw 흐름 호환 (default null).
- **한 —** `isV8StringLimitError` / `isResponseTooLarge` helper export.
- **EN —** New `src/analyzers/figma/responseSplitting.ts` with two split helpers (DS variant + domain variant) and `MAX_SPLIT_DEPTH = 4` recursion limit; explicit errors at the limit, including when the depth=1 metadata call itself overflows.
- **EN —** Figma API call counters — total calls + split-only calls. Threshold-based warning when calls exceed `SPLIT_CALL_WARN_THRESHOLD = 100`.
- **EN —** `FigmaApiError.code` discriminator (`"RESPONSE_TOO_LARGE" | null`) plus exported `isV8StringLimitError` / `isResponseTooLarge` helpers.

### 변경 / Changed

- **한 —** `src/analyzers/figma/apiClient.ts` — `fetchFileNodes` / `fetchNodes` 안 `opts.depth?: number` 옵션 추가 (분할 helper 가 `?depth=1` 메타데이터 호출에 사용). 옛 호출 호환 — 옵션 미지정 시 옛 동작 그대로.
- **한 —** `src/analyzers/figma/designSystemScan.ts` — `fetchFileNodes` 직접 호출 → `fetchPageWithSplit` 호출로 교체. 정상 케이스 호출 횟수 변화 0 (회귀 회피).
- **한 —** `src/analyzers/figma/domainScan.ts` — `fetchNodes` 직접 호출 → `fetchNodesWithSplit` 호출로 교체.
- **한 —** `src/analyzers/figma.ts` — 측정 시작/끝 시점에 호출 카운터 reset / 출력. 임계 초과 시 warning.
- **EN —** `apiClient.ts`: optional `opts.depth` added to `fetchFileNodes` / `fetchNodes` (used by split helpers for metadata calls). Existing call sites unchanged.
- **EN —** `designSystemScan.ts` / `domainScan.ts` switched to the split wrappers. No behavior change in the success path.
- **EN —** `figma.ts` resets and prints API call counters around the measurement.

### 참고 / Notes

- **한 —** Breaking change 아님 — 옛 정상 호출 흐름 변경 없음. RESPONSE_TOO_LARGE 케이스에만 새 흐름 진입.
- **한 —** `fetchLocalVariables` 는 frame 분할 의미 없는 endpoint — 옛 403 처리 흐름 그대로 유지.
- **EN —** No breaking changes. The old success path is preserved; the new flow only activates on RESPONSE_TOO_LARGE.
- **EN —** `fetchLocalVariables` is left as-is — frame splitting is meaningless for that endpoint.

[0.2.2]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.2.2

## [0.2.1] — 2026-05-07

### 정정 / Fixed

- **한 —** `resolvePrimaryDsLabel()` 안 에러 메시지 자연 한국어 정정 ("명시 필수" → "명시해야 합니다" / "명시해 주세요"). 코드 흐름 변경 없음, 메시지 텍스트만 정정.
- **EN —** Polished error messages in `resolvePrimaryDsLabel()` for more natural Korean phrasing. No code-flow change — text only.

[0.2.1]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.2.1

## [0.2.0] — 2026-05-07

### Breaking change / 흐름 변경

- **한 —** `figmaDesignSystemFiles` 안 primary DS 결정 흐름 변경. 0.1.x 흐름 = `ds-new` 라벨이 자동 primary 처리. 0.2.0 부터 = `primary: true` 명시 필수. 라벨 형태 = 사용자 자유 결정 가능.
- **EN —** Changed how primary DS is determined in `figmaDesignSystemFiles`. In 0.1.x, the `ds-new` label was auto-treated as primary. From 0.2.0, primary must be explicitly specified via `primary: true`. Labels are now free-form / user-defined.

### 추가 / Added

- **한 —** `FigmaDesignSystemFile.primary?: boolean` 필드 추가 (`src/types.ts`).
- **한 —** primary 검증 흐름 추가 (`src/dashboard/transformers/baseline-to-figma-data.ts` `resolvePrimaryDsLabel`):
  - DS 1개 = 자동 primary (검증 안 함)
  - DS 2개 이상 + primary 0개 = 에러 throw
  - DS 2개 이상 + primary 2개 이상 = 에러 throw
  - DS 2개 이상 + primary 정확히 1개 = 정상
- **한 —** `FigmaTabData` 안 `primaryLabel: string | null` + `nonPrimaryLabels: string[]` 필드 추가.
- **한 —** `SummaryTabData.figma` 안 같은 두 필드 추가 (옛 `dsNew*` / `dsLegacy*` 변수 이름은 호환 위해 보존 — primary / 첫 non-primary 가리킴).
- **EN —** Added `FigmaDesignSystemFile.primary?: boolean` field (`src/types.ts`).
- **EN —** Added primary validation in `resolvePrimaryDsLabel`:
  - 1 DS = auto-primary (no validation)
  - 2+ DS + 0 primaries = throws error
  - 2+ DS + 2+ primaries = throws error
  - 2+ DS + exactly 1 primary = OK
- **EN —** Added `primaryLabel: string | null` + `nonPrimaryLabels: string[]` to `FigmaTabData`.
- **EN —** Added the same two fields to `SummaryTabData.figma` (legacy `dsNew*` / `dsLegacy*` variable names retained for component compatibility — they now point to primary / first non-primary).

### 변경 / Changed

- **한 —** dashboard 안 라벨 hardcoded 표기 (`ds-new` / `ds-legacy`) 제거. 사용자 정의 라벨 그대로 표시. `figma-tab.jsx` (TokenMatchSection / TokenMatrixSection / DsInstanceShareSection / MigrationPrioritySection / ComponentMatchSection) + `root.jsx` (Summary 탭 Layer 03) 정정.
- **한 —** dashboard 안 "Primary" 영어 단어 표기 안 함. 사용자 정의 라벨 + "기준" / "참고" 한글 표기 유지.
- **한 —** `enrichTokenMatrix(tm, primaryLabel, nonPrimaryLabels)` signature 변경 — 옛 `inDs["ds-new"]` / `inDs["ds-legacy"]` hardcoded 흐름 → primary / non-primary 필드로 변경.
- **한 —** `markdown.ts` 안 DS 별 카드 정렬 = config 순서 그대로 (옛 ds-new 우선 hardcoded 정렬 제거).
- **한 —** `src/cli/init.ts renderFigmaBlock()` 안 라벨 안내 = 옛 `ds-new` / `ds-legacy` 권고 → primary 명시 규칙으로 변경. 예시 라벨 = `"v1"` / `"v2"` 형태.
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
  라벨 형태 = `ds-new` / `ds-legacy` 그대로 유지 가능 (이름 변경은 사용자 자유 결정). 정정 끝난 후 = `npm install --save-dev dsmonitor@0.2.0` 진행. README 안 "Migration from 0.1.x" 부분 참고.
- **EN —** 0.1.x users — required edit:
  ```diff
  // dsmonitor.config.local.ts
  - { url: "...", label: "ds-new" },
  + { url: "...", label: "ds-new", primary: true },
  ```
  Labels can stay (`ds-new` / `ds-legacy`) or be freely renamed. After updating the config, run `npm install --save-dev dsmonitor@0.2.0`. See "Migration from 0.1.x" in README for details.

### 안내 / Notes

- **한 —** 옛 `ds-new` 자동 호환 흐름 = 제거. 명시 필요 (DS 2개 이상 시점) — primary 누락 시 = 에러 throw 핵심.
- **한 —** 본 0.2.0 = 의도된 breaking change (옛 사용자 = 본 시점 사용자 1명 — 본 의뢰 안 확인).
- **EN —** Auto-fallback to `ds-new` label has been removed. Missing primary specification (with 2+ DS files) will throw an error.
- **EN —** This 0.2.0 is an intentional breaking change (current user count = 1 — confirmed via this issue thread).

[0.2.0]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.2.0

## [0.1.9] — 2026-05-07

### 추가 / Added

- **한 —** 새 `docs/measurement-flow.md` 추가. 측정 명령별 차이 + 정보 흐름 + 권고 사용 흐름 자세 안내. 한/영 병기. `audit --only figma` 단독 시점에 dashboard 반영 누락 핵심, `audit --baseline` 권고 명시.
- **EN —** Added new `docs/measurement-flow.md` describing measurement command differences, data flow, and recommended usage. Bilingual (Korean / English). Documents that `audit --only figma` standalone does not reach the dashboard, and recommends `audit --baseline` for integrated runs.

### 갱신 / Updated

- **한 —** README 안 측정 명령 차이표 + DS 파일 라벨 안내 (`ds-new` = primary, `ds-legacy` = 옛 DS) 추가. `dsmonitor:figma` 단독 시점에 dashboard 반영 안 되는 점 명시.
- **한 —** `docs/figma-config-guide.md` 안 "`ds-new` = primary 라벨" 부분 추가. `resolvePrimaryDsLabel` 흐름 + 라벨 1개 시점 등록 권고 명시.
- **한 —** `src/cli/init.ts` 안 `renderFigmaBlock()` 안 ds-new / ds-legacy 라벨 안내 주석 추가 (`dsmonitor init` 자동 생성 사용자 config 안 안내 포함).
- **EN —** Updated README with measurement command comparison table and DS file label guide (`ds-new` = primary, `ds-legacy` = legacy). Documented that standalone `dsmonitor:figma` does not update the dashboard.
- **EN —** Added a "`ds-new` is the primary label" section to `docs/figma-config-guide.md`, explaining the `resolvePrimaryDsLabel` flow and the recommendation to use `ds-new` when registering a single DS file.
- **EN —** Added inline label guidance comments to `renderFigmaBlock()` in `src/cli/init.ts`, so user `dsmonitor.config.ts` files generated by `dsmonitor init` carry the convention.

### 안내 / Notes

- **한 —** 0.2.0 부터 = primary 가 라벨이 아닌 별도 필드 (예: `primary: true`) 로 명시 변경. Breaking change 안내는 별도. 본 0.1.9 = 라벨 기반 흐름 그대로 유지 + 안내 강화.
- **EN —** In 0.2.0, `primary` will be specified as a separate field (e.g. `primary: true`) instead of relying on the label name. Breaking change to be announced separately. This 0.1.9 release keeps the label-based flow but strengthens the documentation.

[0.1.9]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.9

## [0.1.8] — 2026-05-06

### 정정 / Fixed

- **한 —** `lighthouse/run.js` 가 root `"type": "module"` 으로 ES module 처리 → `require()` 호출 시 throw 발견 정정. `lighthouse/package.json` 안 `{"type": "commonjs"}` override 추가. 0.1.6 시점에 `bin/` 만 정정, `lighthouse/` 누락이라 같은 결함 재발.
- **한 — 전수 검증**: `require()` 사용하는 모든 `.js` 파일 (6건) 의 폴더별 `package.json` `"type": "commonjs"` override 확인. 본 시점 일치: `bin/`, `bin/lib/`, `eslint/`, `lighthouse/`, `presets/` 모두 commonjs override 적용. 추후 새 폴더 추가 시점에 같은 흐름 필수.
- **EN —** Fixed `lighthouse/run.js` being treated as ES module due to root `"type": "module"`, causing `require()` to throw. Added `{"type": "commonjs"}` override in `lighthouse/package.json`. The 0.1.6 fix only covered `bin/` and `bin/lib/`, leaving `lighthouse/` for the same regression.
- **EN — Audit**: Verified all `.js` files using `require()` (6 total) have a sibling `package.json` `"type": "commonjs"` override. Currently aligned: `bin/`, `bin/lib/`, `eslint/`, `lighthouse/`, `presets/`. Same convention applies to any future folders.

[0.1.8]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.8

## [0.1.7] — 2026-05-06

### 변경 / Changed

- **한 —** ESLint plugin 이름 변경: `ui-health` → `dsmonitor`. 기존 이름은 npm 패키지명(`dsmonitor`)과 달라 ESLint legacy config(`.eslintrc.js`)의 자동 plugin 검색 흐름과 호환 안 됨. plugin 이름을 패키지명과 통일.
- **한 —** 새 wrapper 패키지 `eslint-plugin-dsmonitor` 0.1.0 publish. ESLint legacy config 가 plugin 을 자동 검색할 수 있도록 다리 역할 (1줄짜리 re-export, `module.exports = require("dsmonitor/eslint")`).
- **한 —** `bin/lib/lint-shared.js`, `bin/lint-summary.js`, `eslint/index.js`, `src/cli.ts`, `src/types.ts`, `src/dashboard/components/root.jsx`, `src/reporters/migrationCsv.ts`, `src/reporters/markdown.ts` 안 `ui-health` 표기 → `dsmonitor` 일괄 정정.
- **한 —** `README.md` + `docs/eslint-rules.md` + `docs/eslint-ci-integration.md` + `docs/figma-config-guide.md` 안 옛 `npm run ui-health:*` 스크립트 표기 → 새 `npx dsmonitor *` 표기로 일괄 정정. `eslint-plugin-ui-health` → `eslint-plugin-dsmonitor`.
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

- **한 —** `bin/` 폴더 안 파일(`lint-summary.js`, `lint-update-baseline.js`, `report.js`, `lib/lint-shared.js`)가 패키지 root의 `"type": "module"` 설정으로 ES module로 처리되어 `require()` 호출 시 throw하는 결함 정정. `bin/package.json` + `bin/lib/package.json` 안 `{"type": "commonjs"}` override 추가하여 해당 폴더 안 파일을 CJS로 처리.
- **한 —** `bin/report.js` 안 `tsx src/cli.ts` 호출 정정. npm publish 안 `src/` 폴더 미포함이라 `ERR_MODULE_NOT_FOUND` 발생. `dist/cli.js` 직접 호출로 변경 (`process.execPath` 안 직접 spawn).
- **EN —** Fixed CJS bin scripts (`lint-summary.js`, `lint-update-baseline.js`, `report.js`, `lib/lint-shared.js`) being treated as ES modules due to package root's `"type": "module"` setting, causing `require()` calls to throw. Added `{"type": "commonjs"}` override in `bin/package.json` and `bin/lib/package.json` to ensure scripts in those directories are processed as CommonJS.
- **EN —** Fixed `bin/report.js` invoking `tsx src/cli.ts` which fails on the published package because the `src/` directory is excluded from publish. Now spawns `dist/cli.js` directly via `process.execPath`.

[0.1.6]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.6

## [0.1.5] — 2026-05-06

### Changed

- **Dashboard UI 안 프로젝트명 자동 read** — `dsmonitor.config.ts` 안 `projectName` field 추가 또는 `package.json` 안 `name` 값 자동 read. 본 시점까지 hardcoded 였던 (`monorepo`) 정정.
- **코드 주석 안 generic 표기 정정** — `lighthouse/run.js` / `presets/configs/next-pages-scss.ts` / `presets/scss-project.js` / `src/types.ts` 안 hardcoded `monorepo` → generic 표기.
- **README + CHANGELOG 한국어 표현 자연화 (추가)** — 직전 0.1.3 publish 후 발견 사항 정정 ("rename 끝" → "rename 완료", "throw 부분 부분" → "throw 발생", "표시 누락" → "표시 안 됨", "발행 누락" → "발행 없음" 등) + README markdown 표 padding 자연화.

### Fixed

- **`npm pkg fix` 적용** — `bin[dsmonitor]` script name auto-corrected warning 정정 (`"./dist/cli.js"` → `"dist/cli.js"`).

**EN —**

### Changed

- **Dashboard UI now reads project name automatically** — added `projectName` field to `dsmonitor.config.ts` or auto-reads from `package.json` `name` field. Replaces previously hardcoded `monorepo` value.
- **Generic comments in code** — replaced hardcoded `monorepo` with generic placeholder in `lighthouse/run.js`, `presets/configs/next-pages-scss.ts`, `presets/scss-project.js`, and `src/types.ts`.
- **Additional naturalization of Korean expressions in README and CHANGELOG** — follow-up to 0.1.3 ("rename 끝" → "rename 완료", "throw 부분 부분" → "throw 발생", "표시 누락" → "표시 안 됨", "발행 누락" → "발행 없음") + README markdown table padding cleanup.

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

- **README + CHANGELOG 한국어 표현 자연화** — 91건 단어 정리 ("부분" 76 / "핵심" 6 / "일치" 9) + 추가 2건 (이중 반복 1 / 중복 단어 1).

**EN —**

- **Naturalized Korean expressions in README and CHANGELOG** — 91 word edits (부분 76 / 핵심 6 / 일치 9) plus 2 additional cleanups (double-word repetition / duplicate phrase).

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

- **패키지 이름 = vitaui → dsmonitor** — npm 안 vitaui / vita-ui 유사 이름 + dsmon / bson / json 유사 이름 충돌 회피 목적. 0.1.0 = `dsmonitor@0.1.0`로 발행 (package.json name만 변경), 0.1.1 = 모든 파일 안 vitaui 단어 → dsmonitor로 통일.
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
- **사이드카 plugin 시스템** (v0.15) — 외부 측정 결과가 dashboard에 자동 표시
  - `vitaui/reports/plugins/{id}/{date}.json` 자동 검색 (id 알파벳 순)
  - 정보 형식 약속 (id / label / measuredAt / summary / details / meta)
  - plugin 1개당 Summary Layer 04+ 자동 추가 + plugin 탭 동적 생성
  - schema 검증 (필수 필드 / id 불일치 / JSON 형식 오류) 빨간 알림 + stale (7일+) 회색 배지
  - `meta` 필드 — 정보 형식 약속만 유지, 0.1.0 안 dashboard 표시 안 됨 (0.2.0 안 추가 검토)
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
- 시계열 (과거 plugin 정보 누적 차트) 미지원 — 0.2.0에서 추가 검토 / Time-series (cumulative past plugin data charts) not yet — to be revisited in 0.2.0

### measurementHistory

- `measurementHistory` v0.1 ~ v0.15 — 측정 도구 자체 변경 이력 보존 (`vitaui/vitaui.config.ts` 안 `measurementHistory` 필드, 사용자 측 측정 이력)
- **EN —** `measurementHistory` v0.1 ~ v0.15 — internal change history of the measurement tool itself (preserved in the `measurementHistory` field of `vitaui/vitaui.config.ts`).

[0.1.0]: https://github.com/jsiksn/vitaui/releases/tag/v0.1.0
