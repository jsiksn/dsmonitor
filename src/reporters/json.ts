import fs from "node:fs/promises";
import path from "node:path";
import type { CodebaseReport, UIHealthConfig } from "../types";

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
