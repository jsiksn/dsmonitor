import fg from "fast-glob";
import path from "node:path";
import fs from "node:fs/promises";
import type { UIHealthConfig, SourceFile } from "../types";

/**
 * projectRoot 기준으로 절대경로를 계산하고, config에 __absRoot 주입.
 */
export function attachAbsRoot(
  configPath: string,
  cfg: UIHealthConfig
): UIHealthConfig & { __absRoot: string } {
  const absRoot = path.resolve(path.dirname(configPath), cfg.projectRoot);
  (cfg as any).__absRoot = absRoot;
  return cfg as UIHealthConfig & { __absRoot: string };
}

async function expandRoots(
  roots: string[],
  exts: string[],
  ignore: string[],
  absRoot: string
): Promise<string[]> {
  const out: string[] = [];
  for (const root of roots) {
    const abs = path.resolve(absRoot, root);
    let stat;
    try {
      stat = await fs.stat(abs);
    } catch {
      continue;
    }
    if (stat.isFile()) {
      if (exts.includes(path.extname(abs))) out.push(abs);
      continue;
    }
    const patterns = exts.map((e) => `${root}/**/*${e}`);
    const found = await fg(patterns, {
      cwd: absRoot,
      ignore,
      absolute: true,
      dot: false,
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    out.push(...found);
  }
  return Array.from(new Set(out));
}

export async function collectCodeFiles(
  cfg: UIHealthConfig & { __absRoot: string }
): Promise<SourceFile[]> {
  const files = await expandRoots(
    cfg.scan.codeRoots,
    cfg.scan.codeExts,
    cfg.scan.ignore,
    cfg.__absRoot
  );
  return Promise.all(files.map((f) => toSourceFile(f, cfg.__absRoot)));
}

export async function collectStyleFiles(
  cfg: UIHealthConfig & { __absRoot: string }
): Promise<SourceFile[]> {
  const files = await expandRoots(
    cfg.scan.styleRoots,
    cfg.scan.styleExts,
    cfg.scan.ignore,
    cfg.__absRoot
  );
  return Promise.all(files.map((f) => toSourceFile(f, cfg.__absRoot)));
}

async function toSourceFile(abs: string, absRoot: string): Promise<SourceFile> {
  const content = await fs.readFile(abs, "utf8");
  return {
    absPath: abs,
    relPath: path.relative(absRoot, abs).split(path.sep).join("/"),
    ext: path.extname(abs),
    content,
  };
}
