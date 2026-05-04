import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, readdirSync, chmodSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";

/**
 * dsmonitor 패키지 빌드 영역 (v0.1.0).
 *
 * - format = ESM only (사용자 의뢰 A-3)
 * - entry = index (types) / cli / plugins/types
 *   eslint/* 영역 + presets/* 영역 = dist 빌드 빠짐 — raw 영역 그대로 발행
 *   (사용자 측 .eslintrc.js (CJS) 영역 호환 — eslint/package.json 안 type:commonjs).
 * - shebang = cli.ts 첫 줄 명시. tsup banner 영역 빠짐 (모든 entry 적용 영역 회피).
 * - onSuccess 영역 안 raw 자료 (jsx + css) 영역 cp.
 */
export default defineConfig({
  entry: {
    index: "src/types.ts",
    cli: "src/cli.ts",
    "plugins/types": "src/plugins/types.ts",
  },
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  dts: true,
  sourcemap: true,
  clean: true,
  shims: false,
  splitting: false,
  // 외부 dependencies / peer 영역 영역은 번들 빠짐
  external: [
    "@typescript-eslint/parser",
    "@typescript-eslint/types",
    "@typescript-eslint/visitor-keys",
    "fast-glob",
    "postcss",
    "postcss-scss",
    "dotenv",
    "tsx",
    "prompts",
    // peer optional
    "eslint",
    "@lhci/cli",
    "typescript",
  ],
  onSuccess: async () => {
    const root = resolve(".");

    // 1. dashboard 안 jsx + css raw 영역 cp
    const compSrc = join(root, "src/dashboard/components");
    const compDst = join(root, "dist/dashboard/components");
    mkdirSync(compDst, { recursive: true });
    for (const f of readdirSync(compSrc)) {
      if (/\.(jsx|css)$/.test(f)) {
        copyFileSync(join(compSrc, f), join(compDst, f));
      }
    }

    // 2. cli.js 영역 chmod +x (shebang 영역 정합)
    const cliPath = join(root, "dist/cli.js");
    if (existsSync(cliPath)) {
      chmodSync(cliPath, 0o755);
    }

    console.log("[tsup] post-build 영역 끝 — dashboard/components/*.{jsx,css} cp + cli.js chmod +x");
  },
});
