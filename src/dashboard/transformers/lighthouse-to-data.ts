/**
 * Lighthouse summary.json [+ N LHR raw JSON] → LighthouseTabData 변환.
 *
 * 입력 source:
 *   - summary.json (vitaui/lighthouse/reports/{date}/summary.json — run.js 출력)
 *   - LHR raw JSON N개 (cwvSample 용; 자동 검색)
 *
 * v0.9 note 13 (2026-04-28): 옛 흐름은 1 URL 의 LHR 만 검색했으나, 본 환경엔 모든 URL
 *   (10 × 3 run = 30 LHR) 이 있어 모두 매칭하도록 변경. 같은 URL 의 3 run 중 첫 매칭
 *   1개만 사용 (파일명 lex sort — timestamp 가장 빠른 run). cwvSample 단일 객체 → 배열.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  LighthouseCwvEntry,
  LighthouseSummaryFile,
  LighthouseTabData,
  LighthouseTabUrl,
} from "./types";

export function lighthouseToData(
  summary: LighthouseSummaryFile,
  reportsDir: string
): LighthouseTabData {
  const measuredAt = (summary.runAt || "").slice(0, 10);

  const urls: LighthouseTabUrl[] = [];
  for (const [url, scores] of Object.entries(summary.scoresByUrl)) {
    urls.push({
      url,
      path: extractPath(url, summary.baseUrl),
      perf: scores.performance ?? 0,
      a11y: scores.accessibility ?? 0,
      bp: scores["best-practices"] ?? 0,
      seo: scores.seo ?? 0,
    });
  }

  const averages = {
    perf: avg(urls.map((u) => u.perf)),
    a11y: avg(urls.map((u) => u.a11y)),
    bp: avg(urls.map((u) => u.bp)),
    seo: avg(urls.map((u) => u.seo)),
  };

  const cwvSample = collectCwvSamples(reportsDir, urls);

  return {
    measuredAt,
    baseUrl: summary.baseUrl,
    testAccount: summary.testAccount ?? null,
    zoneAccountLabel: summary.zoneAccountLabel ?? null,
    numberOfRuns: summary.numberOfRuns,
    totalUrls: summary.totalUrls,
    urls,
    averages,
    cwvSample,
  };
}

function extractPath(url: string, baseUrl: string): string {
  if (baseUrl && url.startsWith(baseUrl)) {
    return url.slice(baseUrl.length) || "/";
  }
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * summary.urls 의 모든 URL 별로 LHR raw JSON 매칭.
 *
 * 매칭 전략:
 *   - 각 URL path 의 slug 로 LHR 파일명 prefix 매칭
 *   - 같은 slug 의 3 run 중 파일명 lex sort 첫 매칭 1개 (= timestamp 가장 빠른 run)
 *   - 매칭 실패한 URL 은 entry 에서 누락 (배열 길이 ≤ totalUrls)
 *
 * LHR 파일명 형식: `{path_underscore}-{YYYY_MM_DD_HH_MM_SS}-report.json` 또는
 *                   `lhr-{path}-{ts}-report.json` (다른 도구 변형) 등.
 */
function collectCwvSamples(
  reportsDir: string,
  urls: LighthouseTabUrl[]
): LighthouseCwvEntry[] {
  if (!fs.existsSync(reportsDir)) return [];
  const all = fs
    .readdirSync(reportsDir)
    .filter(
      (f) => f.endsWith(".json") && f !== "summary.json" && f !== "manifest.json"
    )
    .sort();
  if (all.length === 0) return [];

  const out: LighthouseCwvEntry[] = [];
  for (const u of urls) {
    const slug = u.path.replace(/^\//, "").replace(/\//g, "_") || "root";
    // 시안 형식 (slug 로 시작) + lhr- prefix 변형 모두 시도.
    const candidate = all.find(
      (f) =>
        f.startsWith(`${slug}-`) ||
        f.startsWith(`lhr-${slug}-`) ||
        f.includes(`-${slug}-`)
    );
    if (!candidate) continue;
    const lhr = readLhr(path.join(reportsDir, candidate));
    if (!lhr) continue;
    out.push({
      url: u.path,
      fcp: lhr.fcp,
      lcp: lhr.lcp,
      cls: lhr.cls,
      tbt: lhr.tbt,
      si: lhr.si,
      tti: lhr.tti,
    });
  }
  return out;
}

function readLhr(filePath: string): {
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  si: number;
  tti: number;
} | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lhr = JSON.parse(raw);
    const audits = lhr.audits ?? {};
    return {
      fcp: audits["first-contentful-paint"]?.numericValue ?? 0,
      lcp: audits["largest-contentful-paint"]?.numericValue ?? 0,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? 0,
      tbt: audits["total-blocking-time"]?.numericValue ?? 0,
      si: audits["speed-index"]?.numericValue ?? 0,
      tti: audits["interactive"]?.numericValue ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * vitaui/lighthouse/reports/ 의 가장 최신 측정 디렉토리 찾기.
 * 디렉토리명 형식: YYYY-MM-DD. 없으면 null.
 */
export function findLatestLighthouseDir(lhRoot: string): string | null {
  if (!fs.existsSync(lhRoot)) return null;
  const dirs = fs
    .readdirSync(lhRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name);
  if (dirs.length === 0) return null;
  dirs.sort().reverse();
  return path.join(lhRoot, dirs[0]);
}
