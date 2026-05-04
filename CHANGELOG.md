# Changelog

본 형식 = [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 정합.
대응 의미 = [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-05-04

### Changed (rename)

- **패키지 이름 영역 = vitaui → dsmonitor** — npm 안 vitaui / vita-ui 유사 영역 + dsmon / bson / json 유사 영역 충돌 회피 본질. 0.1.0 영역 = `dsmonitor@0.1.0` 영역 안 발행 끝 (package.json name 영역만 정정), 0.1.1 영역 = 모든 자료 안 vitaui 단어 영역 → dsmonitor 영역 정합.
- **bin 명령어** = `vitaui` → `dsmonitor` (`npx dsmonitor audit / init / dashboard / ...`)
- **사용자 측 폴더** = `vitaui/` → `dsmonitor/` (init 안 자동 생성 영역)
- **templates** = `vitaui.config.ts.tpl` → `dsmonitor.config.ts.tpl`
- **import** = `from "vitaui"` → `from "dsmonitor"` / `require("vitaui/presets/...")` → `require("dsmonitor/presets/...")` / `require("eslint-plugin-ui-health")` → `require("dsmonitor/eslint")`
- **GitHub repo** = vitaui → dsmonitor (rename 끝, https://github.com/jsiksn/dsmonitor)

### Fixed

- **minimal config 영역 정합** — 0.1.0 안 사용자 측 `dsmonitor.config.ts` 영역 작성 시점에 audit --only code 실행 시점 throw 영역 영역. templates/dsmonitor.config.ts.tpl 영역 안 누락 항목 모두 영역 추가:
  - `framework: { id: "react" }` (analyzeCodebase 안 framework adapter 결정 — 빠짐 시점에 throw)
  - `globalStyleSources` (orphan class 분류 영역 안 글로벌 스타일 영역 검색)
  - `hardcodedValues` 안 `colorPatterns` / `scssVariableUsagePatterns` / `scssVariableDefFiles` 형식 정합 (RegExp 배열)
  - `migrationTargets` 안 `Record<string, { aliases: string[]; nativeTags: string[] }>` 형식 정합
  - `migrationMinClassLength` (마이그레이션 후보 안 최소 className 길이)
  - `metrics` 안 모든 토글 (`tsMigration` / `dsCoverage` / `migrationCandidates` / `stylingDistribution` / `hardcodedColors` / `scssVariableCompliance` / `figmaAnalysis`)
  - `thresholds` 안 모든 영역 안 `direction: "higher" | "lower"` 영역 추가 (good/warn 비교 방향)
  - `designSystem.componentExts` (cli.js 안 isComponentFile 정합)

### Note

- **0.1.0 안 historical 영역** — 0.1.0 영역 안 [0.1.0] entry 영역 그대로 historical 본질 유지 (vitaui 단어 영역 = 0.1.0 시점 영역).

[0.1.1]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.1

## [0.1.0] — 2026-XX-XX

첫 npm 발행. 직전 portal-gateway-web monorepo 안 file: 의존 영역에서 분리 — 외부 사용자 측 `npm install vitaui` 영역 안 활용 가능.

### Added

- **`vitaui` 단일 bin** subcommand (audit / report / dashboard / export-migration / baseline-lint / init)
- **`vitaui init`** subcommand — 사용자 측 vitaui/ 폴더 인터랙티브 부트스트랩 (Lighthouse / Figma 옵션 prompt + @lhci/cli 자동 install + templates 토큰 치환)
- **사이드카 plugin 시스템** (v0.15) — 외부 측정 자료 영역 dashboard 자동 표시
  - `vitaui/reports/plugins/{id}/{date}.json` 자동 검색 (id 알파벳 순)
  - 자료 형식 약속 (id / label / measuredAt / summary / details / meta)
  - plugin 1개당 Summary Layer 04+ 자동 추가 + plugin 탭 동적 생성
  - schema 검증 (필수 필드 / id 불일치 / JSON 형식 오류) 빨간 알림 + stale (7일+) 회색 배지
  - `meta` 필드 — 자료 형식 약속만 유지, 0.1.0 안 dashboard 표시 빠짐 (0.2.0 안 추가 검토)
- **외부 plugin 개발자 자료실** (`docs/plugin-development.md`) — npm 사용자 / 추후 다른 plugin 개발자 영역
- **ESLint plugin 통합** — `vitaui/eslint` subpath (별도 패키지 발행 빠짐). `eslint-plugin-ui-health` 영역 흡수.

### Changed

- **빌드** — tsup 도입 / ESM only / dts 출력 / sourcemap 출력. `bin/vitaui` 단일 진입로 (shebang + chmod +x).
- **Header 측정 시점 영역** — Code / Figma / Lighthouse 3행 stamp 영역 삭제. 측정 시점은 각 Layer stamp + 각 탭 인라인 2곳에서만.
- **각 탭 측정 시점 표시 통일** — Figma 인라인 패턴 정합 (`.tab-stamp` 클래스). Code 탭 신규 추가, Lighthouse 박스 → 인라인 (URL / Run / Base URL 박스 그대로 유지), Plugin 별도 헤더 → 본문 시작 인라인.
- **검증 실패 plugin Summary Layer 압축** — layer-head 만 (사유 영역은 plugin 탭 안 PluginErrorView 영역에서만).

### Build / Publish

- `engines.node` `>=18.0.0`
- `type: "module"` — ESM 진입로
- `peer optional` 영역: `eslint` / `@lhci/cli` / `typescript` (활용 시점에만 install)
- `dotenv` dependencies 영역 추가 (이전 monorepo 호이스팅 의존 영역 정정)
- `tsx` dependencies 영역 추가 — 사용자 측 `vitaui.config.ts` (.ts 영역) 자연 작동
- `prompts` dependencies 영역 추가 — `vitaui init` 인터랙티브 prompt
- `eslint/` + `presets/` 폴더 = raw 영역 그대로 발행 (`type: "commonjs"` 영역 별도 package.json) — 사용자 측 `.eslintrc.js` (CJS) 영역 호환
- `lighthouse/` 폴더 = files 화이트리스트 안 포함 — `lighthouse/run.js` (CJS) 영역 그대로

### Known limitations (0.1.0)

- `vitaui init` 안 npm only (yarn / pnpm detect 빠짐) — 0.2.0 영역에서 추가 검토
- plugin meta 영역 dashboard 표시 빠짐 — 0.2.0 영역에서 추가 검토
- 시계열 영역 (과거 plugin 자료 누적 차트) 빠짐 — 0.2.0 영역에서 추가 검토

### measurementHistory

- `measurementHistory` v0.1 ~ v0.15 — 측정 도구 자체 변경 이력 보존 (`vitaui/vitaui.config.ts` 안 `measurementHistory` 필드 영역, 사용자 측 사용자 측 자체 측정 이력)

[0.1.0]: https://github.com/jsiksn/vitaui/releases/tag/v0.1.0
