#!/usr/bin/env node
import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { analyzeCodebase } from "./analyzers/codebase";
import { analyzeFigma } from "./analyzers/figma";
import { generateLintBaseline } from "./analyzers/lintBaseline";
import { writeReport } from "./reporters/json";
import { findLatestReportJson, generateMarkdown } from "./reporters/markdown";
import { generateOverview } from "./reporters/overview";
import { exportMigrationCsv } from "./reporters/migrationCsv";
import { attachAbsRoot } from "./utils/walker";
import { renderDashboard } from "./dashboard";
import type {
  UIHealthConfig,
  CodebaseReport,
  FigmaInstancesFile,
} from "./types";

// dotenv 즉시 로드 블록 제거 (이전: __dirname/../.env.local 강제).
// configPath 확정 후 main() 안에서 위치 결정 — 분리 후에도 동작하도록.

async function loadConfig(configPath: string): Promise<UIHealthConfig> {
  const abs = path.resolve(configPath);
  // v0.1.0: 사용자 측 dsmonitor.config.ts (.ts) import 흐름 = tsx/esm/api 활용.
  // .js / .mjs 케이스는 native dynamic import 활용.
  // tsx 안 default export quirk — `{ default: { default: <config> } }` 형식 가능.
  const isTs = abs.endsWith(".ts") || abs.endsWith(".mts") || abs.endsWith(".cts");
  let mod: any;
  if (isTs) {
    const { tsImport } = await import("tsx/esm/api");
    mod = await tsImport(url.pathToFileURL(abs).href, import.meta.url);
  } else {
    mod = await import(url.pathToFileURL(abs).href);
  }
  // default export unwrap — tsx quirk 일치 (mod.default.default → mod.default → mod)
  const cfg = (mod?.default?.default ?? mod?.default ?? mod) as UIHealthConfig;
  return cfg;
}

/**
 * cwd 부터 위로 거슬러 올라가며 dsmonitor 설정 파일을 검색.
 *
 * 후보 (각 디렉토리에서 순서대로):
 *   1. <dir>/dsmonitor.config.ts          ← cd dsmonitor 안에서 직접 실행 케이스
 *   2. <dir>/dsmonitor/dsmonitor.config.ts ← 루트에서 호출 시 프로젝트 측 디렉토리 케이스
 *   3. <dir>/vitaui.config.ts             ← legacy (vitaui → dsmonitor rename, 0.2.0 부터 deprecation)
 *   4. <dir>/vitaui/vitaui.config.ts      ← legacy (vitaui → dsmonitor rename, 0.2.0 부터 deprecation)
 */
function findConfigUpward(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const candidates = [
      path.join(dir, "dsmonitor.config.ts"),
      path.join(dir, "dsmonitor", "dsmonitor.config.ts"),
      // legacy fallback — vitaui → dsmonitor rename (0.1.1 부터) 호환성 보존
      path.join(dir, "vitaui.config.ts"),
      path.join(dir, "vitaui", "vitaui.config.ts"),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

type AuditOnly = "code" | "figma" | "lighthouse" | undefined;

function parseArgs(argv: string[]): {
  cmd: string;
  baseline: boolean;
  configPath: string | null;
  only: AuditOnly;
  all: boolean;
  skipLighthouse: boolean;
  envPath?: string;
  inputPath?: string;
  outputPath?: string;
} {
  const args = argv.slice(2);
  const cmd = args[0] || "audit";
  const baseline = args.includes("--baseline");
  const all = args.includes("--all");
  const skipLighthouse = args.includes("--skip-lighthouse");
  const readOpt = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
  };
  const explicitConfig = readOpt("--config");
  const configPath = explicitConfig
    ? path.resolve(explicitConfig)
    : findConfigUpward(process.cwd());

  // --only <code|figma|lighthouse> 인자 검증
  const onlyRaw = readOpt("--only");
  let only: AuditOnly;
  if (onlyRaw === "code" || onlyRaw === "figma" || onlyRaw === "lighthouse") {
    only = onlyRaw;
  } else if (onlyRaw !== undefined) {
    console.error(
      `[dsmonitor] --only 인자는 "code" / "figma" / "lighthouse" 만 허용. 받은 값: "${onlyRaw}"`
    );
    process.exit(1);
  }

  // --only 와 --all 동시 사용 X — 의미 충돌 (only=부분 측정, all=통합 측정).
  if (only !== undefined && all) {
    console.error(
      `[dsmonitor] --only 와 --all 은 동시 사용 불가. ` +
        `--all 은 모든 측정 (code + figma + Lighthouse) + report + dashboard 통합 chain 흐름.`
    );
    process.exit(1);
  }

  return {
    cmd,
    baseline,
    configPath,
    only,
    all,
    skipLighthouse,
    envPath: readOpt("--env"),
    inputPath: readOpt("--input"),
    outputPath: readOpt("--output"),
  };
}

async function main() {
  const { cmd, baseline, configPath, only, all, skipLighthouse, envPath, inputPath, outputPath } =
    parseArgs(process.argv);

  // v0.1.0: init subcommand — config 없어도 작동 (사용자 측 dsmonitor/ 부트스트랩).
  if (cmd === "init") {
    const { runInit } = await import("./cli/init");
    await runInit();
    return;
  }

  if (!configPath) {
    console.error(
      `[dsmonitor] dsmonitor.config.ts 를 찾지 못했습니다.\n` +
        `  검색: cwd(${process.cwd()}) 부터 부모 디렉토리로 올라가며\n` +
        `    - <dir>/dsmonitor.config.ts\n` +
        `    - <dir>/dsmonitor/dsmonitor.config.ts\n` +
        `    - <dir>/vitaui.config.ts (legacy)\n` +
        `    - <dir>/vitaui/vitaui.config.ts (legacy)\n` +
        `  해결:\n` +
        `    1) npx dsmonitor init   # 부트스트랩 (인터랙티브)\n` +
        `    2) dsmonitor/ 디렉토리 안에서 실행하거나\n` +
        `    3) --config <path> 로 명시 지정`
    );
    process.exit(1);
  }

  // .env.local 로드 — configPath 확정 후 위치 결정.
  // 우선순위: --env <path>  >  VITAUI_ENV_FILE  >  <configDir>/.env.local
  // 파일 부재는 에러 아님 (figmaAnalysis=false 경로에선 env 불필요).
  const envCandidate =
    (envPath ? path.resolve(envPath) : undefined) ??
    process.env.VITAUI_ENV_FILE ??
    path.join(path.dirname(configPath), ".env.local");
  if (existsSync(envCandidate)) {
    // v0.1.0: ESM 호환 — dynamic import 흐름. dotenv 가 dependencies 안 보장됨.
    try {
      const dotenv = await import("dotenv");
      dotenv.config({ path: envCandidate });
    } catch {
      // dotenv 모듈 부재 (사용자 측 미설치 환경) — figmaAnalysis=true 일 때만 analyzer 친절 오류.
    }
  }

  console.log(`[dsmonitor] config: ${configPath}`);
  const rawCfg = await loadConfig(configPath);
  const cfg = attachAbsRoot(configPath, rawCfg);
  console.log(`[dsmonitor] projectRoot: ${cfg.__absRoot}`);

  if (cmd === "audit") {
    // v0.3.1 (2026-05-11): --only lighthouse — Lighthouse 단독 측정.
    // code analyzer + figma analyzer 호출 X. 옛 `node node_modules/dsmonitor/lighthouse/run.js` 단독 호출 흐름 일관 + 사용자 측 직관 강화.
    if (only === "lighthouse") {
      const configDir = path.dirname(configPath);
      console.log(`[dsmonitor] --only lighthouse — Lighthouse 단독 측정`);
      await runLighthouse(configDir);
      return;
    }

    // --only figma: 기존 reports/ 의 최신 JSON 을 base 로 읽어 figma 섹션만 갱신.
    // 사용 시나리오 — code 측정 결과는 그대로 유지하고 figma 만 빠르게 재측정.
    if (only === "figma") {
      const configDir = path.dirname(configPath);
      const reportsDir = path.resolve(configDir, cfg.report.outputDir);
      const baseInput = findLatestReportJson(reportsDir, cfg.report.baselineFilenamePrefix);
      if (!baseInput) {
        console.error(
          `[dsmonitor] --only figma 는 기존 reports/ JSON 을 base 로 사용합니다. ` +
            `${reportsDir} 에 base 파일이 없습니다. ` +
            `먼저 'npx dsmonitor audit' 또는 'npx dsmonitor audit --only code' 로 base 생성하세요.`
        );
        process.exit(1);
      }
      if (!cfg.metrics.figmaAnalysis) {
        console.error(
          `[dsmonitor] cfg.metrics.figmaAnalysis=false. --only figma 사용 불가.`
        );
        process.exit(1);
      }
      console.log(`[dsmonitor] --only figma — base: ${baseInput}`);
      const raw = await fs.readFile(baseInput, "utf8");
      const report = JSON.parse(raw) as CodebaseReport;
      const fT0 = Date.now();
      let instancesFile: FigmaInstancesFile | undefined;
      try {
        // --only figma 는 코드 측정을 다시 하지 않으므로 classIndex 미제공.
        // 컴포넌트 매칭 (B 그룹 단계 3) 미생성 — 통합 측정 (npx dsmonitor audit) 시점에만 산출.
        console.log(
          `[dsmonitor]   note: --only figma 는 componentMatch 미생성 ` +
            `(코드 인덱스 필요). 통합 측정 사용 권장.`
        );
        const result = await analyzeFigma(cfg);
        report.figma = result.report;
        instancesFile = result.instancesFile;
        const figmaElapsed = Date.now() - fT0;
        console.log(`[dsmonitor] figma analysis done in ${figmaElapsed}ms`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[dsmonitor] figma analysis failed: ${msg}`);
        process.exit(1);
      }
      const target = await writeReport(report, cfg, configDir, { baseline });
      console.log(`[dsmonitor] report: ${target}`);
      if (instancesFile) {
        await writeInstancesFile(instancesFile, cfg, configDir);
      }
      printSummary(report);
      return;
    }

    // 기본 흐름 (--only 미지정 또는 --only code)
    console.log(`[dsmonitor] analyzing codebase...`);
    const t0 = Date.now();
    // B 그룹 단계 3 (2026-04-29): analyzeCodebase 가 { report, classIndex } 반환.
    // classIndex 는 figma analyzer 의 컴포넌트 매칭 (B 그룹 단계 3) 분자 source.
    const { report, classIndex } = await analyzeCodebase(cfg);
    const codebaseElapsed = Date.now() - t0;
    console.log(`[dsmonitor] codebase analysis done in ${codebaseElapsed}ms`);

    // --only code 시 figma 강제 skip. 미지정 시 cfg.metrics.figmaAnalysis 그대로.
    const runFigma = only !== "code" && cfg.metrics.figmaAnalysis;
    let instancesFile: FigmaInstancesFile | undefined;
    if (runFigma) {
      console.log(`[dsmonitor] figma baseline enabled — analyzing...`);
      const fT0 = Date.now();
      try {
        const result = await analyzeFigma(cfg, classIndex);
        report.figma = result.report;
        instancesFile = result.instancesFile;
        const figmaElapsed = Date.now() - fT0;
        console.log(`[dsmonitor] figma analysis done in ${figmaElapsed}ms`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[dsmonitor] figma analysis failed: ${msg}`);
        console.error(
          `[dsmonitor] codebase 측정은 유지하고 figma 섹션 없이 리포트 생성합니다.`
        );
      }
    } else if (only === "code") {
      console.log(`[dsmonitor] --only code — figma 단계 건너뜀`);
    } else {
      console.log(`[dsmonitor] figma baseline disabled (metrics.figmaAnalysis=false)`);
    }

    const configDir = path.dirname(configPath);
    const target = await writeReport(report, cfg, configDir, { baseline });
    console.log(`[dsmonitor] report: ${target}`);
    if (instancesFile) {
      await writeInstancesFile(instancesFile, cfg, configDir);
    }
    printSummary(report);

    // v0.3.0 (2026-05-11): --all flag — 통합 측정 chain.
    // audit (code + figma) 완료 후 Lighthouse 호출 + report (markdown) + dashboard 자동 chain.
    // 사용자 측 한 번 명령 호출로 모든 측정 + 출력 자동 흐름 진입.
    if (all) {
      console.log(``);
      console.log(`[dsmonitor] --all chain — Lighthouse + report + dashboard 진입`);

      // 1. Lighthouse 호출 (--skip-lighthouse X 시)
      if (!skipLighthouse) {
        await runLighthouse(configDir);
      } else {
        console.log(`[dsmonitor]   skip-lighthouse — Lighthouse 측정 건너뜀`);
      }

      // 2. markdown report 생성 (옛 report 명령 흐름 일관)
      console.log(`[dsmonitor] --all chain — markdown report 생성`);
      await runReportChain(cfg, configPath, target);

      // 3. dashboard 생성 (옛 dashboard 명령 흐름 일관)
      console.log(`[dsmonitor] --all chain — dashboard 빌드`);
      await runDashboardChain(cfg, configPath, target);

      console.log(``);
      console.log(`[dsmonitor] --all chain 완료.`);
    }
    return;
  }

  if (cmd === "baseline-lint") {
    console.log(`[dsmonitor] scanning for legacy utility class violations...`);
    const t0 = Date.now();
    const outPath = path.resolve(path.dirname(configPath), "lint-baseline.json");
    const baseline = await generateLintBaseline(cfg, outPath);
    const elapsed = Date.now() - t0;
    console.log(`[dsmonitor] done in ${elapsed}ms`);
    console.log(`[dsmonitor] baseline: ${outPath}`);
    console.log(`
=== Lint Baseline Summary ===
files scanned:           ${baseline.totals.filesScanned}
files with violations:   ${baseline.totals.filesWithViolations}
total violations:        ${baseline.totals.totalViolations}
by id:                   ${Object.entries(baseline.totals.byId).map(([k, v]) => `${k}=${v}`).join(", ") || "-"}
`);
    return;
  }

  if (cmd === "report") {
    const configDir = path.dirname(configPath);
    const reportsDir = path.resolve(configDir, cfg.report.outputDir);
    const resolvedInput = inputPath
      ? path.resolve(inputPath)
      : findLatestReportJson(reportsDir, cfg.report.baselineFilenamePrefix);
    if (!resolvedInput) {
      console.error(
        `[dsmonitor] no report JSON found in ${reportsDir}. Run 'npm run audit' or 'npm run audit:baseline' first.`
      );
      process.exit(2);
    }
    const resolvedOutput = outputPath
      ? path.resolve(outputPath)
      : path.resolve(path.dirname(configPath), "docs/baseline.md");
    console.log(`[dsmonitor] input:  ${resolvedInput}`);
    console.log(`[dsmonitor] output: ${resolvedOutput}`);
    const raw = await fs.readFile(resolvedInput, "utf8");
    const report = JSON.parse(raw) as CodebaseReport;
    await generateMarkdown(report, cfg, {
      inputPath: resolvedInput,
      outputPath: resolvedOutput,
    });
    console.log(`[dsmonitor] markdown report written.`);

    // Overview for stakeholders — 템플릿이 있으면 함께 생성
    const configDir2 = path.dirname(configPath);
    const templatePath = path.resolve(
      configDir2,
      "docs/overview-for-stakeholders.template.md"
    );
    const overviewOutPath = path.resolve(
      configDir2,
      "docs/overview-for-stakeholders.md"
    );
    const wroteOverview = await generateOverview(report, cfg, {
      templatePath,
      outputPath: overviewOutPath,
    });
    if (wroteOverview) {
      console.log(`[dsmonitor] overview written: ${overviewOutPath}`);
    } else {
      console.log(
        `[dsmonitor] overview template not found at ${templatePath} — skipped`
      );
    }
    return;
  }

  if (cmd === "dashboard") {
    const configDir = path.dirname(configPath);
    const reportsDir = path.resolve(configDir, cfg.report.outputDir);
    const resolvedInput = inputPath
      ? path.resolve(inputPath)
      : findLatestReportJson(reportsDir, cfg.report.baselineFilenamePrefix);
    if (!resolvedInput) {
      console.error(
        `[dsmonitor] no baseline JSON found in ${reportsDir}. ` +
          `Run 'npx dsmonitor audit' or 'npx dsmonitor audit --baseline' first.`
      );
      process.exit(2);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const resolvedOutput = outputPath
      ? path.resolve(outputPath)
      : path.resolve(reportsDir, `dashboard-${stamp}.html`);
    console.log(`[dsmonitor] input:  ${resolvedInput}`);
    console.log(`[dsmonitor] output: ${resolvedOutput}`);
    await renderDashboard({
      inputPath: resolvedInput,
      outputPath: resolvedOutput,
      cfg,
      configDir,
    });
    console.log(`[dsmonitor] dashboard written.`);
    return;
  }

  if (cmd === "export-migration") {
    // Phase 0.7 (2026-04-29): figma-instances-{date}.json + frame 필터링 → CSV.
    const configDir = path.dirname(configPath);
    const reportsDir = path.resolve(configDir, cfg.report.outputDir);
    const frame = readArg(process.argv, "--frame");
    const ds = readArg(process.argv, "--ds") ?? "ds-legacy";
    if (!frame) {
      console.error(
        `[dsmonitor] export-migration: --frame=<frame-comment> 필수.\n` +
          `  사용 예: npx dsmonitor export-migration --frame=Test-Perform [--ds=ds-legacy]\n` +
          `  --ds 기본값: ds-legacy. 다른 값: ds-new / unmatched / all`
      );
      process.exit(2);
    }
    const instancesPath = inputPath
      ? path.resolve(inputPath)
      : findLatestInstancesJson(reportsDir);
    if (!instancesPath) {
      console.error(
        `[dsmonitor] export-migration: figma-instances-{date}.json 없음. ` +
          `먼저 'npx dsmonitor audit --baseline' 으로 측정 + 별도 파일 생성하세요.`
      );
      process.exit(2);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const safeFrame = frame.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeDs = ds.replace(/[^a-zA-Z0-9_-]/g, "_");
    const resolvedOutput = outputPath
      ? path.resolve(outputPath)
      : path.resolve(
          configDir,
          "reports",
          "migration",
          `${safeFrame}-${safeDs}-${stamp}.csv`
        );
    console.log(`[dsmonitor] export-migration`);
    console.log(`[dsmonitor]   input:  ${instancesPath}`);
    console.log(`[dsmonitor]   output: ${resolvedOutput}`);
    console.log(`[dsmonitor]   frame:  ${frame}`);
    console.log(`[dsmonitor]   ds:     ${ds}`);
    const result = await exportMigrationCsv(instancesPath, {
      frame,
      ds,
      outputPath: resolvedOutput,
    });
    console.log(`[dsmonitor]   rows:   ${result.rowCount.toLocaleString()}`);
    console.log(`[dsmonitor] CSV written.`);
    return;
  }

  console.error(
    `[dsmonitor] Unknown command: ${cmd}.\n` +
      `  Supported:\n` +
      `    audit [--only code|figma|lighthouse] [--baseline]       — 측정 (code + figma 통합 또는 부분별, v0.3.1: lighthouse 추가)\n` +
      `    audit --all [--baseline] [--skip-lighthouse]            — 통합 측정 chain (code + figma + Lighthouse + report + dashboard, v0.3.0)\n` +
      `    baseline-lint                                           — ESLint 위반 baseline 생성\n` +
      `    report [--input <path>] [--output <path>]               — 측정 JSON → markdown 변환\n` +
      `    dashboard [--input <path>] [--output <path>]            — 측정 JSON → HTML 대시보드\n` +
      `    export-migration --frame=<comment> [--ds=<label>]       — frame 별 instance CSV (Phase 0.7)`
  );
  process.exit(2);
}

/** 명령행 인자 헬퍼 — `--key=value` 또는 `--key value` 둘 다 지원. */
function readArg(argv: string[], key: string): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === key) return argv[i + 1];
    if (a.startsWith(`${key}=`)) return a.slice(key.length + 1);
  }
  return undefined;
}

/**
 * dsmonitor/reports/ 안에서 가장 최근 figma-instances-{date}.json 검색.
 * findLatestReportJson 과 같은 흐름 — prefix "figma-instances" 만 우선.
 */
function findLatestInstancesJson(reportsDir: string): string | null {
  if (!existsSync(reportsDir)) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs2 = require("node:fs") as typeof import("node:fs");
  const all = fs2
    .readdirSync(reportsDir)
    .filter((f) => /^figma-instances-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => path.join(reportsDir, f));
  if (all.length === 0) return null;
  all.sort((a, b) => (a < b ? 1 : -1));
  return all[0];
}

/**
 * v0.3.0 (2026-05-11) — --all chain 측 Lighthouse 호출.
 *
 * lighthouse/run.js 측 spawnSync 호출. 사용자 측 사전 준비 필수:
 *   - dsmonitor/lighthouse/config.js (LHCI config)
 *   - dsmonitor/lighthouse/auth/<project>.js (Puppeteer 자동 로그인 어댑터)
 *   - dsmonitor/.env.local (LIGHTHOUSE_BASE_URL / LIGHTHOUSE_TEST_ID 등)
 *
 * 사전 준비 X 측 친절 에러 안내 + chain 계속 진행 (report + dashboard 측 호출).
 */
async function runLighthouse(configDir: string): Promise<void> {
  const { spawnSync } = await import("node:child_process");
  // packages/dsmonitor/dist/cli.js 측 build 후 위치 기준 — lighthouse/run.js = ../lighthouse/run.js
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../lighthouse/run.js"),
    path.resolve(here, "../../lighthouse/run.js"),
  ];
  let lighthouseScript: string | null = null;
  for (const c of candidates) {
    if (existsSync(c)) {
      lighthouseScript = c;
      break;
    }
  }
  if (!lighthouseScript) {
    console.error(
      `[dsmonitor]   lighthouse/run.js 위치 자동 검색 실패. 건너뜀.\n` +
        `  검색 위치:\n` +
        candidates.map((c) => `    - ${c}`).join("\n")
    );
    return;
  }

  // 사용자 측 dsmonitor/lighthouse/config.js 사전 준비 확인
  const userLighthouseConfig = path.resolve(configDir, "lighthouse/config.js");
  if (!existsSync(userLighthouseConfig)) {
    console.error(
      `[dsmonitor]   Lighthouse 사전 준비 누락 — 건너뜀.\n` +
        `  필요: ${userLighthouseConfig}\n` +
        `  자세: node_modules/dsmonitor/docs/lighthouse-ci-integration.md 안내 일관.`
    );
    return;
  }

  console.log(
    `[dsmonitor]   running Lighthouse (~25분 예상) — script: ${lighthouseScript}`
  );
  const res = spawnSync(process.execPath, [lighthouseScript], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) {
    console.error(
      `[dsmonitor]   Lighthouse 측정 실패 (status ${res.status}). chain 계속 진행 (report + dashboard).`
    );
  } else {
    console.log(`[dsmonitor]   Lighthouse 측정 완료.`);
  }
}

/**
 * v0.3.0 (2026-05-11) — --all chain 측 markdown report 생성.
 *
 * 옛 report 명령 흐름 일관 — generateMarkdown + generateOverview chain.
 * baseline JSON path = audit 측 방금 작성한 target (writeReport 결과).
 */
async function runReportChain(
  cfg: UIHealthConfig & { __absRoot: string },
  configPath: string,
  baselineJsonPath: string
): Promise<void> {
  const configDir = path.dirname(configPath);
  const outputPath = path.resolve(configDir, "docs/baseline.md");
  console.log(`[dsmonitor]   input:  ${baselineJsonPath}`);
  console.log(`[dsmonitor]   output: ${outputPath}`);
  const raw = await fs.readFile(baselineJsonPath, "utf8");
  const report = JSON.parse(raw) as CodebaseReport;
  await generateMarkdown(report, cfg, {
    inputPath: baselineJsonPath,
    outputPath,
  });
  console.log(`[dsmonitor]   markdown report written.`);

  // overview-for-stakeholders 측 템플릿 존재 시 함께 생성
  const templatePath = path.resolve(
    configDir,
    "docs/overview-for-stakeholders.template.md"
  );
  const overviewOutPath = path.resolve(
    configDir,
    "docs/overview-for-stakeholders.md"
  );
  const wroteOverview = await generateOverview(report, cfg, {
    templatePath,
    outputPath: overviewOutPath,
  });
  if (wroteOverview) {
    console.log(`[dsmonitor]   overview written: ${overviewOutPath}`);
  }
}

/**
 * v0.3.0 (2026-05-11) — --all chain 측 dashboard 빌드.
 *
 * 옛 dashboard 명령 흐름 일관 — renderDashboard 호출.
 */
async function runDashboardChain(
  cfg: UIHealthConfig & { __absRoot: string },
  configPath: string,
  baselineJsonPath: string
): Promise<void> {
  const configDir = path.dirname(configPath);
  const reportsDir = path.resolve(configDir, cfg.report.outputDir);
  const stamp = new Date().toISOString().slice(0, 10);
  const outputPath = path.resolve(reportsDir, `dashboard-${stamp}.html`);
  console.log(`[dsmonitor]   input:  ${baselineJsonPath}`);
  console.log(`[dsmonitor]   output: ${outputPath}`);
  await renderDashboard({
    inputPath: baselineJsonPath,
    outputPath,
    cfg,
    configDir,
  });
  console.log(`[dsmonitor]   dashboard written.`);
}

/**
 * Phase 0.7 별도 파일 출력 — dsmonitor/reports/figma-instances-{date}.json.
 * baseline JSON 과 분리, 시계열 보존 필요.
 */
async function writeInstancesFile(
  instancesFile: FigmaInstancesFile,
  cfg: UIHealthConfig,
  configDir: string
): Promise<void> {
  const reportsDir = path.resolve(configDir, cfg.report.outputDir);
  const stamp = (instancesFile.generatedAt || "").slice(0, 10);
  const outPath = path.join(reportsDir, `figma-instances-${stamp}.json`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(instancesFile, null, 2), "utf8");
  // 합산 stat — 사용자 인지.
  let totalInstances = 0;
  for (const d of instancesFile.domains) {
    for (const p of d.pages) {
      for (const f of p.frames ?? []) totalInstances += f.instances.length;
      if (p.instances) totalInstances += p.instances.length;
    }
  }
  console.log(
    `[dsmonitor] instances JSON: ${outPath} (${totalInstances.toLocaleString()} instance)`
  );
}

function printSummary(r: any) {
  const d = r.stylingMethodDistribution;
  const allowedLine = Object.entries(d.allowed)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "-";
  const forbiddenLine = Object.entries(d.forbidden)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "-";
  const forbiddenOcc = Object.entries(r.forbiddenClassCount.byId)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "-";

  console.log(`
=== DSMonitor Baseline Summary ===
code files:            ${r.totals.codeFiles}
style files:           ${r.totals.styleFiles}
DS component files:    ${r.totals.dsComponentFiles}
non-DS component files:${r.totals.nonDsComponentFiles}

Hardcoded colors:      ${r.hardcodedColors.total}
SCSS variable usages:  ${r.scssVariableCompliance.variableUsages}
SCSS compliance:       ${(r.scssVariableCompliance.compliance * 100).toFixed(1)}%

Styling method distribution (files; non-exclusive):
  allowed:             ${allowedLine}
  forbidden:           ${forbiddenLine}
  allowedGlobal:       ${d.allowedGlobal}
  orphanClass:         ${d.orphanClass}
  noClass:             ${d.noClass}
  preferred (${d.preferredId}) compliance: ${(d.preferredCompliance.value * 100).toFixed(1)}%

Forbidden class occurrences:
  total:               ${r.forbiddenClassCount.total}
  by id:               ${forbiddenOcc}

TS Migration:          ${(r.tsMigration.ratio * 100).toFixed(1)}%  (TS ${r.tsMigration.tsFiles} / JS ${r.tsMigration.jsFiles})

DS Coverage:           ${(r.dsCoverage.coverage * 100).toFixed(1)}%  (${r.dsCoverage.filesUsingDs} / ${r.dsCoverage.totalConsumerFiles})

Migration candidates:
  total occurrences:   ${r.migrationCandidates.totalOccurrences}
  affected files:      ${r.migrationCandidates.totalFilesAffected}
  by target:           ${Object.entries(r.migrationCandidates.byTarget).map(([k, v]) => `${k}=${v}`).join(", ") || "-"}
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
