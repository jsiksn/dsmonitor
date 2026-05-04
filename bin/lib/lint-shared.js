"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

const TARGET_RULE = "ui-health/no-forbidden-classes";
const DEFAULT_BASELINE_FILENAME = ".lint-baseline.json";

function argOf(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * Soft baseline 파일 경로 결정 (우선순위 순):
 *   1) --baseline CLI 인자
 *   2) VITAUI_LINT_BASELINE 환경변수
 *   3) <cwd>/dsmonitor/.lint-baseline.json (cwd 기반 단일 후보)
 *
 * 후보 모두 실패 시 null 반환. 호출부 (lint-summary / lint-update-baseline) 가
 * fail-soft / fail-fast 정책에 따라 처리.
 */
function resolveBaselinePath() {
  const cli = argOf("--baseline");
  if (cli) return path.resolve(cli);
  if (process.env.VITAUI_LINT_BASELINE) {
    return path.resolve(process.env.VITAUI_LINT_BASELINE);
  }
  const candidate = path.resolve(
    process.cwd(),
    "dsmonitor",
    DEFAULT_BASELINE_FILENAME
  );
  if (fs.existsSync(candidate)) return candidate;
  return null;
}

/**
 * next lint --format=json 을 실행하고 ESLint 결과 배열을 반환한다.
 * JSON은 stderr로 출력되며 크기가 수 MB에 달할 수 있어 임시 파일을 거친다.
 */
function runLintJson() {
  const tmp = path.join(
    os.tmpdir(),
    `ui-health-lint-${process.pid}-${Date.now()}.json`
  );
  const isWin = process.platform === "win32";
  const cmd = isWin
    ? `npx.cmd next lint --format=json 2> "${tmp}"`
    : `npx next lint --format=json 2> "${tmp}"`;
  spawnSync(cmd, {
    cwd: process.cwd(),
    shell: true,
    stdio: "ignore",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  let raw;
  try {
    raw = fs.readFileSync(tmp, "utf8");
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
  const i = raw.indexOf("[");
  const j = raw.lastIndexOf("]");
  if (i < 0 || j < 0 || j <= i) {
    console.error(raw.slice(0, 800));
    throw new Error("next lint did not emit parseable JSON");
  }
  try {
    return JSON.parse(raw.slice(i, j + 1));
  } catch (e) {
    console.error(raw.slice(0, 800));
    throw e;
  }
}

/**
 * ESLint 결과를 집계. TARGET_RULE 에 해당하는 warn + error 모두 합산.
 * 반환값:
 *   total, warnings, errors, files{ [absPath]: {total, warnings, errors} },
 *   breakdown{ [messageId|ruleId]: count } ← 현재는 단일 룰이므로 label 단위로 쪼갬
 */
function tally(results) {
  let total = 0;
  let warnings = 0;
  let errors = 0;
  const files = {};
  const breakdown = {};

  for (const r of results) {
    let n = 0;
    let w = 0;
    let e = 0;
    for (const msg of r.messages || []) {
      if (msg.ruleId !== TARGET_RULE) continue;
      n += 1;
      if (msg.severity === 2) e += 1;
      else w += 1;
      // message 안에 label을 포함시킨다: "'btn' is forbidden (Bootstrap utility classes)."
      // → 라벨 캡처해서 breakdown id로 사용.
      const label = extractLabel(msg.message);
      breakdown[label] = (breakdown[label] || 0) + 1;
    }
    if (n > 0) {
      total += n;
      warnings += w;
      errors += e;
      files[r.filePath] = { total: n, warnings: w, errors: e };
    }
  }
  return { total, warnings, errors, files, breakdown };
}

function extractLabel(message) {
  // "'btn' is forbidden (Bootstrap utility classes)." → "Bootstrap utility classes"
  const m = /\(([^)]+)\)\.?$/.exec(message || "");
  return m ? m[1] : "unknown";
}

module.exports = {
  TARGET_RULE,
  DEFAULT_BASELINE_FILENAME,
  argOf,
  resolveBaselinePath,
  runLintJson,
  tally,
};
