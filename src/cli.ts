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
import { attachAbsRoot } from "./utils/walker";
import { renderDashboard } from "./dashboard";
import type { UIHealthConfig, CodebaseReport } from "./types";

// dotenv 즉시 로드 블록 제거 (이전: __dirname/../.env.local 강제).
// configPath 확정 후 main() 안에서 위치 결정 — 분리 후에도 동작하도록.

async function loadConfig(configPath: string): Promise<UIHealthConfig> {
  const abs = path.resolve(configPath);
  const mod = await import(url.pathToFileURL(abs).href);
  const cfg = (mod.default ?? mod) as UIHealthConfig;
  return cfg;
}

/**
 * cwd 부터 위로 거슬러 올라가며 vitaui 설정 파일을 검색.
 *
 * 후보 (각 디렉토리에서 순서대로):
 *   1. <dir>/vitaui.config.ts        ← cd vitaui 안에서 직접 실행 케이스
 *   2. <dir>/vitaui/vitaui.config.ts ← 루트에서 호출 시 프로젝트 측 디렉토리 케이스
 */
function findConfigUpward(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const direct = path.join(dir, "vitaui.config.ts");
    if (existsSync(direct)) return direct;
    const nested = path.join(dir, "vitaui", "vitaui.config.ts");
    if (existsSync(nested)) return nested;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

type AuditOnly = "code" | "figma" | undefined;

function parseArgs(argv: string[]): {
  cmd: string;
  baseline: boolean;
  configPath: string | null;
  only: AuditOnly;
  envPath?: string;
  inputPath?: string;
  outputPath?: string;
} {
  const args = argv.slice(2);
  const cmd = args[0] || "audit";
  const baseline = args.includes("--baseline");
  const readOpt = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
  };
  const explicitConfig = readOpt("--config");
  const configPath = explicitConfig
    ? path.resolve(explicitConfig)
    : findConfigUpward(process.cwd());

  // --only <code|figma> 인자 검증
  const onlyRaw = readOpt("--only");
  let only: AuditOnly;
  if (onlyRaw === "code" || onlyRaw === "figma") {
    only = onlyRaw;
  } else if (onlyRaw !== undefined) {
    console.error(
      `[vitaui] --only 인자는 "code" 또는 "figma" 만 허용. 받은 값: "${onlyRaw}"`
    );
    process.exit(1);
  }

  return {
    cmd,
    baseline,
    configPath,
    only,
    envPath: readOpt("--env"),
    inputPath: readOpt("--input"),
    outputPath: readOpt("--output"),
  };
}

async function main() {
  const { cmd, baseline, configPath, only, envPath, inputPath, outputPath } =
    parseArgs(process.argv);

  if (!configPath) {
    console.error(
      `[vitaui] vitaui.config.ts 를 찾지 못했습니다.\n` +
        `  검색: cwd(${process.cwd()}) 부터 부모 디렉토리로 올라가며\n` +
        `    - <dir>/vitaui.config.ts\n` +
        `    - <dir>/vitaui/vitaui.config.ts\n` +
        `  해결:\n` +
        `    1) vitaui/ 디렉토리 안에서 실행하거나\n` +
        `    2) --config <path> 로 명시 지정`
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("dotenv").config({ path: envCandidate });
    } catch {
      // dotenv 모듈 부재 등 — figmaAnalysis=true 일 때만 analyzer 에서 친절한 에러 발생.
    }
  }

  console.log(`[vitaui] config: ${configPath}`);
  const rawCfg = await loadConfig(configPath);
  const cfg = attachAbsRoot(configPath, rawCfg);
  console.log(`[vitaui] projectRoot: ${cfg.__absRoot}`);

  if (cmd === "audit") {
    // --only figma: 기존 reports/ 의 최신 JSON 을 base 로 읽어 figma 섹션만 갱신.
    // 사용 시나리오 — code 측정 결과는 그대로 유지하고 figma 만 빠르게 재측정.
    if (only === "figma") {
      const configDir = path.dirname(configPath);
      const reportsDir = path.resolve(configDir, cfg.report.outputDir);
      const baseInput = findLatestReportJson(reportsDir, cfg.report.baselineFilenamePrefix);
      if (!baseInput) {
        console.error(
          `[vitaui] --only figma 는 기존 reports/ JSON 을 base 로 사용합니다. ` +
            `${reportsDir} 에 base 파일이 없습니다. ` +
            `먼저 'npm run ui-health' 또는 'npm run ui-health:code' 로 base 생성하세요.`
        );
        process.exit(1);
      }
      if (!cfg.metrics.figmaAnalysis) {
        console.error(
          `[vitaui] cfg.metrics.figmaAnalysis=false. --only figma 사용 불가.`
        );
        process.exit(1);
      }
      console.log(`[vitaui] --only figma — base: ${baseInput}`);
      const raw = await fs.readFile(baseInput, "utf8");
      const report = JSON.parse(raw) as CodebaseReport;
      const fT0 = Date.now();
      try {
        report.figma = await analyzeFigma(cfg);
        const figmaElapsed = Date.now() - fT0;
        console.log(`[vitaui] figma analysis done in ${figmaElapsed}ms`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[vitaui] figma analysis failed: ${msg}`);
        process.exit(1);
      }
      const target = await writeReport(report, cfg, configDir, { baseline });
      console.log(`[vitaui] report: ${target}`);
      printSummary(report);
      return;
    }

    // 기본 흐름 (--only 미지정 또는 --only code)
    console.log(`[vitaui] analyzing codebase...`);
    const t0 = Date.now();
    const report = await analyzeCodebase(cfg);
    const codebaseElapsed = Date.now() - t0;
    console.log(`[vitaui] codebase analysis done in ${codebaseElapsed}ms`);

    // --only code 시 figma 강제 skip. 미지정 시 cfg.metrics.figmaAnalysis 그대로.
    const runFigma = only !== "code" && cfg.metrics.figmaAnalysis;
    if (runFigma) {
      console.log(`[vitaui] figma baseline enabled — analyzing...`);
      const fT0 = Date.now();
      try {
        report.figma = await analyzeFigma(cfg);
        const figmaElapsed = Date.now() - fT0;
        console.log(`[vitaui] figma analysis done in ${figmaElapsed}ms`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[vitaui] figma analysis failed: ${msg}`);
        console.error(
          `[vitaui] codebase 측정은 유지하고 figma 섹션 없이 리포트 생성합니다.`
        );
      }
    } else if (only === "code") {
      console.log(`[vitaui] --only code — figma 단계 건너뜀`);
    } else {
      console.log(`[vitaui] figma baseline disabled (metrics.figmaAnalysis=false)`);
    }

    const configDir = path.dirname(configPath);
    const target = await writeReport(report, cfg, configDir, { baseline });
    console.log(`[vitaui] report: ${target}`);
    printSummary(report);
    return;
  }

  if (cmd === "baseline-lint") {
    console.log(`[vitaui] scanning for legacy utility class violations...`);
    const t0 = Date.now();
    const outPath = path.resolve(path.dirname(configPath), "lint-baseline.json");
    const baseline = await generateLintBaseline(cfg, outPath);
    const elapsed = Date.now() - t0;
    console.log(`[vitaui] done in ${elapsed}ms`);
    console.log(`[vitaui] baseline: ${outPath}`);
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
        `[vitaui] no report JSON found in ${reportsDir}. Run 'npm run audit' or 'npm run audit:baseline' first.`
      );
      process.exit(2);
    }
    const resolvedOutput = outputPath
      ? path.resolve(outputPath)
      : path.resolve(path.dirname(configPath), "docs/baseline.md");
    console.log(`[vitaui] input:  ${resolvedInput}`);
    console.log(`[vitaui] output: ${resolvedOutput}`);
    const raw = await fs.readFile(resolvedInput, "utf8");
    const report = JSON.parse(raw) as CodebaseReport;
    await generateMarkdown(report, cfg, {
      inputPath: resolvedInput,
      outputPath: resolvedOutput,
    });
    console.log(`[vitaui] markdown report written.`);

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
      console.log(`[vitaui] overview written: ${overviewOutPath}`);
    } else {
      console.log(
        `[vitaui] overview template not found at ${templatePath} — skipped`
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
        `[vitaui] no baseline JSON found in ${reportsDir}. ` +
          `Run 'npm run ui-health' or 'npm run ui-health:baseline' first.`
      );
      process.exit(2);
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const resolvedOutput = outputPath
      ? path.resolve(outputPath)
      : path.resolve(reportsDir, `dashboard-${stamp}.html`);
    console.log(`[vitaui] input:  ${resolvedInput}`);
    console.log(`[vitaui] output: ${resolvedOutput}`);
    await renderDashboard({
      inputPath: resolvedInput,
      outputPath: resolvedOutput,
      cfg,
      configDir,
    });
    console.log(`[vitaui] dashboard written.`);
    return;
  }

  console.error(
    `[vitaui] Unknown command: ${cmd}.\n` +
      `  Supported:\n` +
      `    audit [--only code|figma] [--baseline]    — 측정 (code + figma 통합 또는 영역별)\n` +
      `    baseline-lint                             — ESLint 위반 baseline 생성\n` +
      `    report [--input <path>] [--output <path>]    — 측정 JSON → markdown 변환\n` +
      `    dashboard [--input <path>] [--output <path>] — 측정 JSON → HTML 대시보드`
  );
  process.exit(2);
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
=== VitaUI Baseline Summary ===
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
