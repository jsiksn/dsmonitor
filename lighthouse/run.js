#!/usr/bin/env node
/**
 * Phase 0.5 Lighthouse 실행 스크립트 — 로컬 수동 실행 전용.
 *
 * 동작 (2단계):
 *  1) LIGHTHOUSE_BASE_URL 검증 + 날짜별 outputDir 준비 → `lhci autorun` 실행
 *  2) manifest.json 을 읽어 페이지별 점수(perf/a11y/bp/seo) 요약 summary.json 생성
 *
 * 인증은 config.js 의 `puppeteerScript` (Plan B Puppeteer 어댑터,
 * `auth/<프로젝트명>.js`) 가 LHCI 내부에서 수행. run.js 는 인증 관련
 * 처리 없음.
 *
 * 상세 사용법: dsmonitor/lighthouse/README.md
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// dsmonitor/.env.local 로드 (LIGHTHOUSE_* 변수 공급).
// LHCI 는 기본적으로 .env 파일을 읽지 않으므로 run.js 가 명시 로드 후
// child process 로 전파 (lighthouse/plan-b.md §4-4 결정).
//
// 패키지 분리 후 .env.local / config.js / reports/ 모두 외부 사용자 환경 안
// (dsmonitor/lighthouse/) 에 있음. run.js 는 패키지부 (packages/dsmonitor/lighthouse/)
// 에 있어 자기 위치 (__dirname) 와 다름. cwd 기반으로 외부 사용자 환경 dsmonitor/ 검색.
const PROJECT_VITAUI_DIR = path.resolve(process.cwd(), "dsmonitor");
const LH_DIR = path.join(PROJECT_VITAUI_DIR, "lighthouse");
const ENV_FILE =
  process.env.VITAUI_ENV_FILE ?? path.join(PROJECT_VITAUI_DIR, ".env.local");
require("dotenv").config({ path: ENV_FILE });

const REPORTS_DIR = path.join(LH_DIR, "reports");

// 0.5.0 BREAKING — 옛 dsmonitor/lighthouse/config.js 자체 read 흐름 자체 폐기.
// 새 LHCI config = cli.ts 안 writeLighthouseTempConfig() 자체 동적 생성한
// node_modules/.cache/dsmonitor/lighthouserc.js 자체 자세 inject.
const CONFIG_PATH = process.env.DSMONITOR_LIGHTHOUSE_CONFIG_PATH || null;

function fail(msg) {
  console.error(`\n[lighthouse] ERROR\n${msg}\n`);
  process.exit(1);
}

function info(msg) {
  console.log(`[lighthouse] ${msg}`);
}

// ───────── CHROME_PATH 자동 export (0.4.2 추가) ─────────
// @lhci/cli healthcheck 안 chrome-launcher 자체 호출 흐름이 일부 환경 안
// (옛 chrome-launcher version + 최신 macOS + 사용자 권한 Chrome install
// path 등 조합) 빈 배열 반환 → "Chrome installation not found" healthcheck
// fail.
//
// dsmonitor 자체 안 chrome-launcher 호출 + 첫 항목 자동 export →
// healthcheck 안 process.env.CHROME_PATH 자연 활용 → 본 케이스 우회.
//
// 외부 사용자 자체 CHROME_PATH 명시 X 흐름 = 자연 작동.
//
// chrome-launcher 자체 = 1.x ESM only (require fail) / 0.x CommonJS 양쪽
// version 자연 호환 위해 두 path 자체 fallback 흐름 진입:
//   (a) top-level node_modules/chrome-launcher (외부 사용자 자체 install)
//   (b) @lhci/cli nested node_modules/chrome-launcher (transitive 옛 CJS version)
function autoDetectChromePath() {
  const candidates = ["chrome-launcher", "@lhci/cli/node_modules/chrome-launcher"];
  for (const mod of candidates) {
    try {
      const ChromeLauncher = require(mod);
      const installations = ChromeLauncher.Launcher.getInstallations();
      if (installations.length > 0) return installations[0];
    } catch (_e) {
      // require fail (ESM only / 자체 부재) = 다음 candidate 진입
    }
  }
  return undefined;
}

if (!process.env.CHROME_PATH) {
  const detected = autoDetectChromePath();
  if (detected) {
    process.env.CHROME_PATH = detected;
    info(`CHROME_PATH auto-set: ${detected}`);
  } else {
    info(
      "Chrome 자체 미감지 — @lhci/cli healthcheck fail 가능. " +
        "Chrome (또는 Chromium / Brave) 사전 install 권고 " +
        "(예: brew install --cask google-chrome)."
    );
  }
}

// ───────── 1. LHCI 실행 (환경 검증 + outputDir 준비 + autorun) ─────────

if (!CONFIG_PATH) {
  fail(
    [
      "DSMONITOR_LIGHTHOUSE_CONFIG_PATH 환경변수 자체 X — 0.5.0 안 본 흐름 자체 X.",
      "",
      "본 진입 흐름 자체 = cli.ts 자체 안 runLighthouse() 자체 자세 진입 흐름.",
      "옛 'node node_modules/dsmonitor/lighthouse/run.js' 자체 직접 호출 흐름 = 0.5.0 안 자체 폐기.",
      "",
      "해결: 'npx dsmonitor audit --only lighthouse' 자체 자세 호출",
      "      (또는 'npx dsmonitor audit --all' 자체 통합 chain).",
    ].join("\n")
  );
}

if (!process.env.LIGHTHOUSE_BASE_URL) {
  fail(
    [
      "LIGHTHOUSE_BASE_URL 환경변수가 설정되지 않았습니다.",
      "",
      "해결 방법:",
      "  1) dsmonitor/.env.local.example 을 복사해 .env.local 생성",
      "  2) LIGHTHOUSE_BASE_URL 포함 LIGHTHOUSE_* 변수들을 채움",
      "  3) 재실행",
    ].join("\n")
  );
}

const today = new Date().toISOString().slice(0, 10);
const outputDir = path.join(REPORTS_DIR, today);
fs.mkdirSync(outputDir, { recursive: true });

info(`baseUrl  : ${process.env.LIGHTHOUSE_BASE_URL}`);
info(`output   : ${path.relative(process.cwd(), outputDir)}`);

const env = {
  ...process.env,
  LIGHTHOUSE_BASE_URL: process.env.LIGHTHOUSE_BASE_URL,
  LHCI_OUTPUT_DIR: outputDir,
};

// 0.5.0 — dynamic log (cli.ts 자체 안 inject env 자체 read).
const pagesCount = parseInt(process.env.DSMONITOR_LIGHTHOUSE_PAGES_COUNT || "1", 10);
const runsCount = parseInt(process.env.DSMONITOR_LIGHTHOUSE_RUNS_COUNT || "3", 10);
const totalRuns = pagesCount * runsCount;
info(`lhci autorun 시작 (${pagesCount} URL × ${runsCount}회 = ${totalRuns} runs)`);
const result = spawnSync(
  "npx",
  ["--no-install", "lhci", "autorun", `--config=${CONFIG_PATH}`],
  { stdio: "inherit", env, cwd: process.cwd() }
);

if (result.error) {
  fail(`lhci 실행 오류: ${result.error.message}`);
}
if (result.status !== 0) {
  fail(
    [
      `lhci autorun 실패 (exit ${result.status}).`,
      "",
      "흔한 원인:",
      "  - 인증 실패 (Plan B 어댑터) → headful 재실행으로 진단",
      "    (node dsmonitor/lighthouse/auth/run-headful.js keep-open)",
      "  - 측정 URL 의 dev 환경 미구동 또는 네트워크 차단",
      "  - LIGHTHOUSE_* 환경변수 오설정 — .env.local 재확인",
    ].join("\n")
  );
}

// ───────── 2. summary.json 생성 ─────────

try {
  const manifestPath = path.join(outputDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.warn(
      `\n[lighthouse] manifest.json 미발견 (${path.relative(process.cwd(), manifestPath)}).` +
        " lhci 출력을 확인하세요.\n"
    );
    process.exit(0);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  const scoresByUrl = {};
  for (const entry of manifest) {
    if (!entry.isRepresentativeRun) continue;
    const s = entry.summary || {};
    scoresByUrl[entry.url] = {
      performance: s.performance,
      accessibility: s.accessibility,
      "best-practices": s["best-practices"],
      seo: s.seo,
    };
  }

  // 0.4.0 — 어댑터 자체가 `getMetadata()` export → summary 안 누적.
  // 옛 LIGHTHOUSE_TEST_ID / LIGHTHOUSE_ZONE_ACCOUNT_LABEL 직접 read 제거.
  let adapterMeta = {};
  const adapterPath = process.env.DSMONITOR_LIGHTHOUSE_AUTH_ADAPTER;
  if (adapterPath) {
    try {
      const adapter = require(adapterPath);
      if (typeof adapter.getMetadata === "function") {
        adapterMeta = adapter.getMetadata() || {};
      }
    } catch (err) {
      console.warn(
        `[lighthouse] 어댑터 메타데이터 read 실패 (${adapterPath}): ${err.message}`
      );
    }
  }

  const summary = {
    runAt: new Date().toISOString(),
    baseUrl: process.env.LIGHTHOUSE_BASE_URL,
    authType: process.env.DSMONITOR_LIGHTHOUSE_AUTH_TYPE || "none",
    ...adapterMeta,
    numberOfRuns: 3,
    totalUrls: Object.keys(scoresByUrl).length,
    scoresByUrl,
  };

  const summaryPath = path.join(outputDir, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");

  console.log("\n[lighthouse] ✅ 완료");
  console.log(`  결과: ${path.relative(process.cwd(), outputDir)}`);
  console.log(`  요약: ${path.relative(process.cwd(), summaryPath)}`);
  console.log("");
  console.log("  페이지별 점수 (대표 run):");
  for (const [url, sc] of Object.entries(scoresByUrl)) {
    const pct = (v) => (typeof v === "number" ? String(Math.round(v * 100)).padStart(3) : " - ");
    console.log(
      `    ${pct(sc.performance)} P / ${pct(sc.accessibility)} A / ${pct(sc["best-practices"])} BP / ${pct(sc.seo)} SEO  ${url}`
    );
  }
  console.log("");
} catch (e) {
  console.warn(`[lighthouse] summary.json 생성 실패: ${e.message}`);
}
