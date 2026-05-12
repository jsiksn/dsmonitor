# eslint-plugin-dsmonitor

ESLint plugin wrapper for [dsmonitor](https://github.com/jsiksn/dsmonitor).

## 한국어

ESLint legacy config(`.eslintrc.js`)는 plugin을 `eslint-plugin-{name}` 형식으로 자동 검색합니다. `dsmonitor`는 CLI 도구와 ESLint plugin이 통합된 패키지라 패키지명이 `eslint-plugin-dsmonitor`가 아닙니다.

이 wrapper 패키지는 `dsmonitor/eslint`를 그대로 재노출하여 ESLint가 자동으로 plugin을 찾을 수 있게 합니다 (1줄짜리 re-export).

### 설치

```bash
npm install --save-dev dsmonitor eslint-plugin-dsmonitor
```

### 호환

이 wrapper 측 `dsmonitor >=0.1.7` 측 호환합니다 (0.2.x / 0.3.x 포함).

### 사용법

`.eslintrc.js`:

```js
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

`policyConfig.plugins`는 `["dsmonitor"]`를 반환하며, ESLint가 자동으로 `eslint-plugin-dsmonitor` (이 wrapper)를 require합니다.

### Note

이 패키지의 모든 룰 정의 / API는 `dsmonitor` 패키지 안에 있습니다. 변경 / 업데이트는 [dsmonitor 메인 repo](https://github.com/jsiksn/dsmonitor)에서 진행됩니다.

## English

ESLint legacy config (`.eslintrc.js`) automatically resolves plugins by the `eslint-plugin-{name}` convention. Since `dsmonitor` is a unified package (CLI + ESLint plugin) named `dsmonitor` (not `eslint-plugin-dsmonitor`), ESLint cannot auto-resolve it directly.

This wrapper re-exports `dsmonitor/eslint` under the expected name (a 1-line re-export).

### Installation

```bash
npm install --save-dev dsmonitor eslint-plugin-dsmonitor
```

### Compatibility

This wrapper is compatible with `dsmonitor >=0.1.7` (including 0.2.x / 0.3.x).

### Usage

`.eslintrc.js`:

```js
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

`policyConfig.plugins` returns `["dsmonitor"]`, which ESLint resolves to `eslint-plugin-dsmonitor` (this wrapper) automatically.

### Note

All rule definitions / APIs live in the `dsmonitor` package itself. Changes and updates happen in the [dsmonitor main repo](https://github.com/jsiksn/dsmonitor).

## License

MIT
