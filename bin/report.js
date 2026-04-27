#!/usr/bin/env node
"use strict";

/**
 * Root-level wrapper for `npm run report`. Spawns the TS CLI via tsx.
 *
 * 사용자 cwd 그대로 유지 — cli.ts 의 findConfigUpward 가 cwd 기반으로
 * vitaui.config.ts 를 자동 검색. --config 로 명시 지정도 가능.
 *
 * Usage:
 *   npm run report
 *   npm run report -- --config <path>
 *   npm run report -- --input reports/baseline-2026-04-20.json --output ...
 */

const path = require("path");
const { spawnSync } = require("child_process");

// cli.ts 절대경로 — bin/report.js 기준 패키지부 안 고정.
const cliPath = path.resolve(__dirname, "..", "src", "cli.ts");
const args = process.argv.slice(2);

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const res = spawnSync(cmd, ["tsx", cliPath, "report", ...args], {
  // cwd 미지정 → 사용자 호출 cwd 유지 (cli.ts 가 cwd 기반 config 검색).
  stdio: "inherit",
  shell: true,
});
process.exit(res.status || 0);
