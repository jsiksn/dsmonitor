#!/usr/bin/env node
"use strict";

/**
 * Update the soft lint baseline with CURRENT warning counts + per-file snapshot.
 *
 * Soft baseline file schema:
 *   {
 *     "maxWarnings": <int>,
 *     "updatedAt": "ISO8601",
 *     "note": "string",
 *     "breakdown": { "<label>": <count>, ... },    // forbidden 그룹별 분포
 *     "files": { "<relPath>": <total>, ... },      // 파일별 위반 수 (증감 추적용)
 *     "stats": { "rule": "...", "filesWithViolations": <int> }
 *   }
 *
 * Usage:
 *   npm run lint:update-baseline
 *   npm run lint:update-baseline -- --note "cleaned up login flow"
 *   node packages/vitaui/bin/lint-update-baseline.js --baseline ./custom.json
 */

const path = require("path");
const fs = require("fs");
const {
  TARGET_RULE,
  argOf,
  resolveBaselinePath,
  runLintJson,
  tally,
} = require("./lib/lint-shared");

function main() {
  const baselinePath = resolveBaselinePath();
  if (!baselinePath) {
    console.error(
      "[lint:update-baseline] baseline 파일 위치를 결정할 수 없습니다.\n" +
        "  검색: <cwd>/vitaui/.lint-baseline.json\n" +
        "  해결: --baseline <path> 인자 또는 VITAUI_LINT_BASELINE 환경변수로 명시 지정.\n" +
        "        baseline 갱신은 위치 명시 없이는 안전하게 수행할 수 없습니다."
    );
    process.exit(1);
  }
  const note = argOf("--note") || "";

  console.log(`[lint:update-baseline] running next lint...`);
  const results = runLintJson();
  const { total, files, breakdown } = tally(results);

  let previous = null;
  if (fs.existsSync(baselinePath)) {
    try {
      previous = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    } catch {
      /* ignore */
    }
  }

  // 파일별 요약 — 절대경로 → cwd 기준 상대경로로 정규화
  const cwd = process.cwd();
  const filesMap = {};
  for (const [abs, v] of Object.entries(files)) {
    filesMap[path.relative(cwd, abs)] = v.total;
  }

  const payload = {
    maxWarnings: total,
    updatedAt: new Date().toISOString(),
    note,
    breakdown,
    stats: {
      rule: TARGET_RULE,
      filesWithViolations: Object.keys(files).length,
    },
    files: filesMap,
  };

  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(
    baselinePath,
    JSON.stringify(payload, null, 2) + "\n",
    "utf8"
  );

  console.log(`[lint:update-baseline] wrote ${baselinePath}`);
  console.log(`  maxWarnings: ${total}`);
  console.log(`  files:       ${Object.keys(files).length}`);
  console.log(
    `  breakdown:   ${
      Object.entries(breakdown)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ") || "(empty)"
    }`
  );
  if (previous && typeof previous.maxWarnings === "number") {
    const delta = total - previous.maxWarnings;
    const arrow = delta === 0 ? "=" : delta > 0 ? `+${delta}` : `${delta}`;
    console.log(`  delta:       ${arrow} (previous: ${previous.maxWarnings})`);
  }
}

main();
