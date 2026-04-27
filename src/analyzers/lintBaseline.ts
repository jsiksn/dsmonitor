import fs from "node:fs/promises";
import path from "node:path";
import type { UIHealthConfig } from "../types";
import type { ForbiddenPatternSpec } from "../policy";
import { collectCodeFiles } from "../utils/walker";
import { getFrameworkAdapter } from "../frameworks";

type Cfg = UIHealthConfig & { __absRoot: string };

interface FileViolation {
  count: number;
  byId: Record<string, number>;
}

interface BaselineFile {
  version: 2;
  generatedAt: string;
  projectRoot: string;
  totals: {
    filesScanned: number;
    filesWithViolations: number;
    totalViolations: number;
    byId: Record<string, number>;
  };
  files: Record<string, FileViolation>;
}

function tokenize(str: string): string[] {
  return str.split(/\s+/).filter(Boolean);
}

function checkClassString(
  str: string,
  forbidden: ForbiddenPatternSpec[],
  violation: FileViolation
): void {
  if (!str) return;
  for (const tok of tokenize(str)) {
    for (const fb of forbidden) {
      if (fb.classPatterns.some((p) => p.test(tok))) {
        violation.count += 1;
        violation.byId[fb.id] = (violation.byId[fb.id] || 0) + 1;
        break;
      }
    }
  }
}

export async function generateLintBaseline(
  cfg: Cfg,
  outPath: string
): Promise<BaselineFile> {
  const files = await collectCodeFiles(cfg);
  const forbidden = cfg.stylingPolicy.forbidden;
  const adapter = getFrameworkAdapter(cfg.framework.id);
  const codeExts = new Set(cfg.scan.codeExts);

  const baseline: BaselineFile = {
    version: 2,
    generatedAt: new Date().toISOString(),
    projectRoot: cfg.__absRoot,
    totals: {
      filesScanned: 0,
      filesWithViolations: 0,
      totalViolations: 0,
      byId: {},
    },
    files: {},
  };

  for (const f of files) {
    if (!codeExts.has(f.ext)) continue;
    baseline.totals.filesScanned += 1;

    const parsed = adapter.parse(f.content, f.relPath);
    const signals = adapter.extractSignals(parsed);

    const violation: FileViolation = { count: 0, byId: {} };
    for (const cn of signals.classNames) {
      checkClassString(cn, forbidden, violation);
    }

    if (violation.count > 0) {
      baseline.files[f.relPath] = violation;
      baseline.totals.filesWithViolations += 1;
      baseline.totals.totalViolations += violation.count;
      for (const [k, v] of Object.entries(violation.byId)) {
        baseline.totals.byId[k] = (baseline.totals.byId[k] || 0) + v;
      }
    }
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(baseline, null, 2), "utf8");
  return baseline;
}
