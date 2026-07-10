/**
 * Dashboard 빌드 entry — baseline JSON + (옵션) lighthouse summary → HTML 출력.
 *
 * 흐름:
 *   1. baseline JSON 로드
 *   2. lighthouse summary 자동 검색 (옵션, 없어도 lighthouse 탭 빈 상태로 빌드)
 *   3. 4개 transformer 실행 → DashboardData 조립
 *   4. shell.ts 가 HTML 생성
 *   5. 파일 출력 (dsmonitor/reports/dashboard-{date}.html)
 */

import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CodebaseReport, UIHealthConfig } from "../../types";
import { baselineToCodeData } from "../transformers/baseline-to-code-data";
import { baselineToFigmaData } from "../transformers/baseline-to-figma-data";
import {
  findLatestLighthouseDir,
  lighthouseToData,
} from "../transformers/lighthouse-to-data";
import { buildSummaryData } from "../transformers/baseline-to-summary-data";
import { pluginsToData } from "../transformers/plugins-to-data";
import { loadPlugins } from "../../plugins/loader";
import type {
  DashboardData,
  LighthouseSummaryFile,
  LighthouseTabData,
} from "../transformers/types";
import { buildHtmlShell } from "./shell";

export interface RenderOptions {
  /** baseline JSON 경로 (절대). */
  inputPath: string;
  /** 출력 HTML 경로 (절대). */
  outputPath: string;
  /** Lighthouse reports 루트 (절대). 기본: configDir/lighthouse/reports. */
  lighthouseRoot?: string;
  /** 출력 stamp date (YYYY-MM-DD). 기본 today. 파일명 / 헤더에 사용. */
  cfg: UIHealthConfig & { __absRoot: string };
  configDir: string;
}

export async function renderDashboard(opts: RenderOptions): Promise<void> {
  const raw = await fs.readFile(opts.inputPath, "utf8");
  const report = JSON.parse(raw) as CodebaseReport;

  // ─── lighthouse 자동 검색 ───
  const lhRoot =
    opts.lighthouseRoot ??
    path.join(opts.configDir, "lighthouse", "reports");
  let lighthouse: LighthouseTabData | null = null;
  const latestLhDir = findLatestLighthouseDir(lhRoot);
  if (latestLhDir) {
    const summaryPath = path.join(latestLhDir, "summary.json");
    if (existsSync(summaryPath)) {
      try {
        const summary = JSON.parse(
          await fs.readFile(summaryPath, "utf8")
        ) as LighthouseSummaryFile;
        lighthouse = lighthouseToData(summary, latestLhDir);
      } catch (e) {
        console.warn(
          `[dashboard] lighthouse summary 파싱 실패 (${summaryPath}): ${
            e instanceof Error ? e.message : String(e)
          }. lighthouse 탭은 빈 상태로 빌드합니다.`
        );
      }
    }
  }

  // ─── transformers 실행 ───
  // 0.8.8 — cfg.thresholds 전달: 상태 배지 / 목표 표기를 markdown 리포터와 같은
  // evaluate() 판정으로 derive (옛 대시보드 리터럴 배지 대체).
  const code = baselineToCodeData(report, opts.cfg.thresholds);

  let figma: DashboardData["figma"] = null;
  if (report.figma && opts.cfg.figma) {
    figma = baselineToFigmaData(report.figma, opts.cfg.figma);
  }

  const summary = buildSummaryData({
    report,
    lighthouse,
    figmaWarningsCount: report.figma?.warnings?.length ?? 0,
    figmaTabData: figma,
    thresholds: opts.cfg.thresholds,
  });

  // ─── plugins 자동 검색 (v0.15, 사이드카 plugin) ───
  // 폴더 구조: configDir/reports/plugins/{id}/{date}.json
  // cfg.report.outputDir 안 plugins/ — id 알파벳 순 정렬.
  const pluginsRoot = path.resolve(
    opts.configDir,
    opts.cfg.report.outputDir,
    "plugins"
  );
  const pluginEntries = pluginsToData(loadPlugins(pluginsRoot));

  const projectName = resolveProjectName(opts.cfg);

  const data: DashboardData = {
    projectName,
    summary,
    code,
    figma,
    lighthouse,
    plugins: pluginEntries,
  };

  // ─── HTML 생성 + 출력 ───
  const html = buildHtmlShell(data);
  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await fs.writeFile(opts.outputPath, html, "utf8");
}

/**
 * 프로젝트 이름 자동 read.
 *
 * 우선순위:
 *   1. `UIHealthConfig.projectName` 명시 값
 *   2. `package.json` 안 `name` 자동 read
 *   3. fallback "Unknown Project"
 */
function resolveProjectName(
  cfg: UIHealthConfig & { __absRoot: string }
): string {
  if (cfg.projectName && cfg.projectName.trim() !== "") {
    return cfg.projectName.trim();
  }
  try {
    const pkgPath = path.join(cfg.__absRoot, "package.json");
    if (existsSync(pkgPath)) {
      const raw = readFileSync(pkgPath, "utf8");
      const pkg = JSON.parse(raw) as { name?: string };
      if (pkg.name && pkg.name.trim() !== "") {
        return pkg.name.trim();
      }
    }
  } catch {
    // ignore — fallback 사용.
  }
  return "Unknown Project";
}
