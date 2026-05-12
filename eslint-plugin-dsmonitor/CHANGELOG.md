# Changelog

본 형식 = [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 형식을 따름. 버전 규칙 = [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**EN —** Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-05-12

### 정정 / Fixed

- **한 —** `peerDependencies.dsmonitor` 측 `^0.1.7` → `>=0.1.7` 확장. dsmonitor 0.2.x / 0.3.x 호환 회복 — 외부 사용자 측 `npm install --save-dev dsmonitor eslint-plugin-dsmonitor` 시점 ERESOLVE 해소.
- **EN —** Expanded `peerDependencies.dsmonitor` from `^0.1.7` to `>=0.1.7`. Restores compatibility with dsmonitor 0.2.x / 0.3.x — resolves ERESOLVE for external users running `npm install --save-dev dsmonitor eslint-plugin-dsmonitor`.

### 참고 / Notes

- **한 —** wrapper 자체 동작 변경 0건 — `index.js` 측 1줄 re-export 흐름 그대로 (`module.exports = require("dsmonitor/eslint")`).
- **한 —** dsmonitor 0.1.7 release 시점 (2026-05-06) wrapper 0.1.0 publish 후 dsmonitor 측 0.1.8 → 0.3.2 까지 11 release 진입 동안 wrapper 측 peer dep 정정 누락 — 본 release 측 정정.
- **한 —** publish 전 sandbox 회귀 검증 통과 — `npm pack` + local install 측 dsmonitor@0.3.2 + wrapper@0.1.1 dependency tree 정상 + `require('eslint-plugin-dsmonitor')` smoke test 통과.
- **EN —** No wrapper runtime change — `index.js` is unchanged (`module.exports = require("dsmonitor/eslint")`).
- **EN —** Wrapper 0.1.0 was published alongside dsmonitor 0.1.7 (2026-05-06) but its peer dep was not advanced as dsmonitor went 0.1.8 → 0.3.2 over 11 releases. This release closes that gap.
- **EN —** Verified before publish — `npm pack` + local install resolves `dsmonitor@0.3.2` + `eslint-plugin-dsmonitor@0.1.1` cleanly, and `require('eslint-plugin-dsmonitor')` loads expected `{ rules, fromPolicy }` exports.

[0.1.1]: https://github.com/jsiksn/dsmonitor/releases/tag/eslint-plugin-dsmonitor-v0.1.1
[0.1.0]: https://github.com/jsiksn/dsmonitor/releases/tag/v0.1.7

## [0.1.0] — 2026-05-06

> ⓘ 본 entry = dsmonitor 0.1.7 release 측 동반 publish — 루트 CHANGELOG 측 dsmonitor 0.1.7 section 측 자세 안내 참조 (`### 추가 / Added` 안 wrapper publish 기록).

> **EN —** Wrapper 0.1.0 was published alongside dsmonitor 0.1.7 — see the dsmonitor 0.1.7 section in the root CHANGELOG for full context.
