#!/usr/bin/env node
"use strict";

/**
 * Soft lint summary.
 *
 * - 현재 ui-health/no-forbidden-classes 위반 수와 baseline을 비교해서 출력.
 * - baseline 파일이 없으면 "baseline 없음" 메시지만 출력 후 그대로 종료.
 * - **항상 exit 0** — CI 블로킹 용도 아님. Phase 1(가시화)용 도구.
 *
 * Usage:
 *   node packages/dsmonitor/bin/lint-summary.js
 *   node packages/dsmonitor/bin/lint-summary.js --baseline ./custom.json
 *   VITAUI_LINT_BASELINE=./custom.json node packages/dsmonitor/bin/lint-summary.js
 */

const path = require("path");
const fs = require("fs");
const {
  TARGET_RULE,
  resolveBaselinePath,
  runLintJson,
  tally,
} = require("./lib/lint-shared");

function readBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (e) {
    console.error(`[lint-summary] failed to parse baseline: ${e.message}`);
    return null;
  }
}

function fmtSign(n) {
  if (n === 0) return "±0";
  return n > 0 ? `+${n}` : `${n}`;
}

function fmtBreakdown(bd) {
  const entries = Object.entries(bd || {});
  if (entries.length === 0) return "(empty)";
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

function main() {
  const baselinePath = resolveBaselinePath();
  const baseline = baselinePath ? readBaseline(baselinePath) : null;

  console.log(
    `[lint-summary] baseline file: ${baselinePath ?? "(not found — fail-soft mode)"}`
  );
  console.log(`[lint-summary] running next lint...`);
  const results = runLintJson();
  const curr = tally(results);

  console.log("");
  console.log("=".repeat(64));
  console.log(" DSMonitor — Lint Summary (soft, non-blocking)");
  console.log("=".repeat(64));
  console.log(` rule: ${TARGET_RULE}`);
  console.log("");

  if (!baselinePath) {
    console.log(
      " baseline 파일을 찾지 못했습니다 (fail-soft — 현재 수치만 출력 후 종료)."
    );
    console.log(
      "   검색: <cwd>/dsmonitor/.lint-baseline.json"
    );
    console.log(
      "   해결: --baseline <path> 인자 또는 VITAUI_LINT_BASELINE 환경변수,"
    );
    console.log(
      "         또는 'npm run lint:update-baseline' 으로 baseline 최초 생성."
    );
    console.log("");
    console.log(
      ` Current:   ${curr.total} warnings (warn=${curr.warnings}, error=${curr.errors})`
    );
    console.log(`            files: ${Object.keys(curr.files).length}`);
    console.log(`            breakdown: ${fmtBreakdown(curr.breakdown)}`);
    console.log("=".repeat(64));
    process.exit(0);
  }

  if (!baseline) {
    console.log(
      " No baseline file yet. Establish one with 'npm run lint:update-baseline'."
    );
    console.log(
      ` Current:   ${curr.total} warnings (warn=${curr.warnings}, error=${curr.errors})`
    );
    console.log(`            files: ${Object.keys(curr.files).length}`);
    console.log(`            breakdown: ${fmtBreakdown(curr.breakdown)}`);
    console.log("=".repeat(64));
    process.exit(0);
  }

  const max =
    typeof baseline.maxWarnings === "number" ? baseline.maxWarnings : null;
  const updatedAt = baseline.updatedAt || "-";
  const note = baseline.note || "";
  const baseBd = baseline.breakdown || {};
  const baseFiles = baseline.files || {};

  const delta = max === null ? null : curr.total - max;
  const arrow =
    delta === null ? "" : delta > 0 ? "↑" : delta < 0 ? "↓ (improvement)" : "=";

  console.log(` Baseline:  ${max === null ? "(no maxWarnings set)" : max}  (updated ${updatedAt})${note ? `\n            note: "${note}"` : ""}`);
  console.log(`            breakdown: ${fmtBreakdown(baseBd)}`);
  console.log("");
  console.log(
    ` Current:   ${curr.total}  (warn=${curr.warnings}, error=${curr.errors})`
  );
  console.log(`            breakdown: ${fmtBreakdown(curr.breakdown)}`);
  console.log(`            files contributing: ${Object.keys(curr.files).length}`);
  console.log("");

  if (delta !== null) {
    console.log(` Delta:     ${fmtSign(delta)}  ${arrow}`);
  }

  // 증가한 경우: 어느 파일에서 늘었는지 표시 (cwd-relative, 파일명 그대로 비교)
  if (delta !== null && delta > 0) {
    const cwd = process.cwd();
    const diffs = [];
    for (const [absFile, v] of Object.entries(curr.files)) {
      const rel = path.relative(cwd, absFile);
      const prev = baseFiles[rel] ?? baseFiles[absFile];
      const prevCount =
        typeof prev === "number"
          ? prev
          : typeof prev === "object" && prev
          ? prev.total || 0
          : 0;
      const d = v.total - prevCount;
      if (d > 0) diffs.push({ file: rel, delta: d, current: v.total });
    }
    diffs.sort((a, b) => b.delta - a.delta);

    if (diffs.length > 0) {
      console.log("");
      console.log(" Increased files (capped at 15):");
      for (const d of diffs.slice(0, 15)) {
        console.log(`   +${d.delta}  (now ${d.current})  ${d.file}`);
      }
    }
  }

  if (delta !== null && delta < 0) {
    console.log("");
    console.log(
      ` Nice! Run 'npm run lint:update-baseline' to lock in progress.`
    );
  }

  console.log("=".repeat(64));
  // 항상 exit 0 — soft, non-blocking.
  process.exit(0);
}

main();
