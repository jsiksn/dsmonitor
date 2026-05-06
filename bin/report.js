#!/usr/bin/env node
"use strict";

/**
 * Root-level wrapper for `npm run report`. Spawns the compiled CLI.
 *
 * 사용자 cwd 그대로 유지 — cli.js 의 findConfigUpward 가 cwd 기반으로
 * dsmonitor.config.ts 를 자동 검색. --config 로 명시 지정도 가능.
 *
 * Usage:
 *   npm run report
 *   npm run report -- --config <path>
 *   npm run report -- --input reports/baseline-2026-04-20.json --output ...
 */

const path = require("path");
const { spawnSync } = require("child_process");

// dist/cli.js 절대경로 — bin/report.js 기준 패키지부 안 고정.
// (npm publish 자료 안 src/ 미포함이라 dist/cli.js 직접 호출.)
const cliPath = path.resolve(__dirname, "..", "dist", "cli.js");
const args = process.argv.slice(2);

const res = spawnSync(process.execPath, [cliPath, "report", ...args], {
  // cwd 미지정 → 사용자 호출 cwd 유지 (cli.js 가 cwd 기반 config 검색).
  stdio: "inherit",
});
process.exit(res.status || 0);
