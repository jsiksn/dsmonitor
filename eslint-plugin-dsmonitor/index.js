"use strict";

// ESLint plugin wrapper — re-export dsmonitor/eslint so that ESLint legacy
// config (.eslintrc.js) can resolve `plugins: ["dsmonitor"]` automatically
// via its `eslint-plugin-{name}` convention.
//
// dsmonitor 패키지 안 ESLint plugin (dsmonitor/eslint) 을 그대로 재노출.
// ESLint legacy config 의 `eslint-plugin-{name}` 자동 검색 흐름과 호환 위해
// 별도 패키지 형태로 publish.
module.exports = require("dsmonitor/eslint");
