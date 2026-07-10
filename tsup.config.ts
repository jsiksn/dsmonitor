import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, readdirSync, chmodSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";

/**
 * dsmonitor 패키지 빌드 설정.
 *
 * - format = ESM only (사용자 의뢰 A-3)
 * - entry = index (types) / cli / plugins/types
 *   eslint/* + presets/* = dist 빌드 안 함 — raw 그대로 발행
 *   (사용자 측 .eslintrc.js (CJS) 호환 — eslint/package.json 안 type:commonjs).
 * - shebang = cli.ts 첫 줄 명시. tsup banner 사용 안 함 (모든 entry 적용 회피).
 * - onSuccess 안 raw 파일 (jsx + css) cp.
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
  // 외부 dependencies / peer 는 번들 안 함
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

    // 1. dashboard 안 jsx + css raw cp
    const compSrc = join(root, "src/dashboard/components");
    const compDst = join(root, "dist/dashboard/components");
    mkdirSync(compDst, { recursive: true });
    for (const f of readdirSync(compSrc)) {
      if (/\.(jsx|css)$/.test(f)) {
        copyFileSync(join(compSrc, f), join(compDst, f));
      }
    }

    // 2. cli.js chmod +x (shebang 흐름 일치)
    const cliPath = join(root, "dist/cli.js");
    if (existsSync(cliPath)) {
      chmodSync(cliPath, 0o755);
    }

    console.log("[tsup] post-build 끝 — dashboard/components/*.{jsx,css} cp + cli.js chmod +x");
  },
});
