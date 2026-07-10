import fs from "node:fs/promises";
import path from "node:path";
import type { CodebaseReport, UIHealthConfig } from "../types";
// 0.8.10 — 날짜 stamp 공유 유틸로 이동. 본 파일은 옛 로컬 today() 와 같은
//   로컬 타임존 의미 (todayStampLocal) 유지 — cli 쪽 UTC stamp 와 의미가 달라
//   통일은 동작 변경이라 보류 (utils/dateStamp.ts 주석 참조).
import { todayStampLocal as today } from "../utils/dateStamp";

export async function writeReport(
  report: CodebaseReport,
  cfg: UIHealthConfig,
  configDir: string,
  opts: { baseline: boolean }
): Promise<string> {
  const outDir = path.resolve(configDir, cfg.report.outputDir);
  await fs.mkdir(outDir, { recursive: true });
  const prefix = opts.baseline ? `${cfg.report.baselineFilenamePrefix}-` : "";
  const filename = `${prefix}${today()}.json`;
  const target = path.join(outDir, filename);
  await fs.writeFile(target, JSON.stringify(report, null, 2), "utf8");
  return target;
}
