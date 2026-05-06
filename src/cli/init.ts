/**
 * `dsmonitor init` — 사용자 측 dsmonitor/ 디렉토리 부트스트랩 (v0.1.1).
 *
 * 동작:
 *   Q1. Lighthouse 측정 사용? (Y/n)
 *   Q2. Figma 측정 사용? (Y/n)
 *
 *   Q1=Y → npm install --save-dev @lhci/cli (spawn). 실패 시 manual 명령 안내.
 *   Q2=Y → 별도 install 빠짐. .env.local 안 FIGMA_API_TOKEN 영역 안내.
 *
 *   dsmonitor/ 폴더 자동 생성:
 *     - dsmonitor.config.ts (templates/dsmonitor.config.ts.tpl 영역에서 Q1/Q2 토큰 치환)
 *     - .env.local.example (templates/.env.local.example.tpl)
 *     - reports/.gitkeep
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import prompts from "prompts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 두 영역 호환 path —
//  - dev (tsx + src 영역): __dirname = src/cli/ → ../../templates
//  - bundled (dist/cli.js 영역 안 inline): __dirname = dist/ → ../templates
const TRY_TEMPLATES_DIRS = [
  path.resolve(__dirname, "..", "..", "templates"),
  path.resolve(__dirname, "..", "templates"),
];
const TEMPLATES_DIR =
  TRY_TEMPLATES_DIRS.find((p) => existsSync(path.join(p, "dsmonitor.config.ts.tpl"))) ??
  TRY_TEMPLATES_DIRS[0];

interface InitAnswers {
  lighthouse: boolean;
  figma: boolean;
  overwrite?: boolean;
}

export async function runInit(): Promise<void> {
  console.log("");
  console.log("DSMonitor init — 사용자 측 dsmonitor/ 폴더 부트스트랩");
  console.log("─".repeat(60));

  const answers: InitAnswers = await prompts(
    [
      {
        type: "confirm",
        name: "lighthouse",
        message: "Lighthouse 측정 사용? (페이지별 Performance / Accessibility / Best Practices / SEO)",
        initial: true,
      },
      {
        type: "confirm",
        name: "figma",
        message: "Figma 측정 사용? (DS 토큰 매트릭스 / instance 출처)",
        initial: true,
      },
    ],
    {
      onCancel: () => {
        console.log("\n[dsmonitor init] 취소됨");
        process.exit(0);
      },
    }
  );

  // 1. 사용자 측 dsmonitor/ 영역 검증 (덮어쓰기 확인)
  const cwd = process.cwd();
  const projectDir = path.join(cwd, "dsmonitor");
  const configPath = path.join(projectDir, "dsmonitor.config.ts");

  if (existsSync(configPath)) {
    const overwrite = await prompts(
      {
        type: "confirm",
        name: "overwrite",
        message: `이미 ${path.relative(cwd, configPath)} 영역 존재. 덮어쓰기?`,
        initial: false,
      },
      {
        onCancel: () => {
          console.log("\n[dsmonitor init] 취소됨");
          process.exit(0);
        },
      }
    );
    if (!overwrite.overwrite) {
      console.log("\n[dsmonitor init] 덮어쓰기 빠짐 — 끝");
      return;
    }
  }

  // 2. Lighthouse Y → npm install --save-dev @lhci/cli (spawn)
  if (answers.lighthouse) {
    console.log("\n▶ @lhci/cli 자동 install 시도 (npm install --save-dev @lhci/cli)...");
    const result = spawnSync("npm", ["install", "--save-dev", "@lhci/cli"], {
      cwd,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      console.warn("\n⚠ @lhci/cli 자동 install 실패 — 사용자 측 직접 명령:");
      console.warn("    npm install --save-dev @lhci/cli");
      console.warn("  (yarn / pnpm 사용자 측은 자체 명령 영역 활용. 본 0.1.x 영역 = npm only.)");
    } else {
      console.log("✓ @lhci/cli install 끝");
    }
  }

  // 3. dsmonitor/ 폴더 + 자료 생성
  mkdirSync(projectDir, { recursive: true });
  mkdirSync(path.join(projectDir, "reports"), { recursive: true });

  // 3-a. dsmonitor.config.ts (templates/dsmonitor.config.ts.tpl 안 토큰 치환)
  const configTpl = readFileSync(path.join(TEMPLATES_DIR, "dsmonitor.config.ts.tpl"), "utf8");
  const config = configTpl
    .replace(/\{\{LIGHTHOUSE_BLOCK\}\}/g, answers.lighthouse ? renderLighthouseBlock() : "// lighthouse 영역 빠짐 (dsmonitor init 영역 안 N 선택)")
    .replace(/\{\{FIGMA_BLOCK\}\}/g, answers.figma ? renderFigmaBlock() : "// figma 영역 빠짐 (dsmonitor init 영역 안 N 선택)")
    .replace(/\{\{FIGMA_METRIC\}\}/g, answers.figma ? "true" : "false");
  writeFileSync(configPath, config);

  // 3-b. .env.local.example (figma + lighthouse 영역 키 안내)
  const envTpl = readFileSync(path.join(TEMPLATES_DIR, ".env.local.example.tpl"), "utf8");
  writeFileSync(path.join(projectDir, ".env.local.example"), envTpl);

  // 3-c. reports/.gitkeep
  writeFileSync(path.join(projectDir, "reports", ".gitkeep"), "");

  // 4. 끝 안내
  console.log("");
  console.log("✓ dsmonitor/ 부트스트랩 끝");
  console.log("  - dsmonitor/dsmonitor.config.ts");
  console.log("  - dsmonitor/.env.local.example");
  console.log("  - dsmonitor/reports/.gitkeep");
  console.log("");
  console.log("다음 단계:");
  console.log("  1. dsmonitor/.env.local.example → dsmonitor/.env.local (cp 후 키 입력)");
  console.log("  2. npx dsmonitor audit --only code   # codebase 측정 (Phase 0.6 B 영역 — 자연 작동)");
  if (answers.figma) {
    console.log("  3. npx dsmonitor audit               # figma 통합 측정");
  }
  if (answers.lighthouse) {
    console.log("  4. npx dsmonitor dashboard           # dashboard 빌드");
  }
  console.log("");
  console.log("자료실 영역:");
  console.log("  - README — node_modules/dsmonitor/README.md");
  console.log("  - plugin 개발 — node_modules/dsmonitor/docs/plugin-development.md");
  console.log("");
}

function renderLighthouseBlock(): string {
  return `lighthouse: {
    baseUrl: process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000",
    pages: [
      // TODO: 측정 대상 페이지 영역 추가 (예: { path: "/", name: "Home" })
    ],
    runs: 3,
  },`;
}

function renderFigmaBlock(): string {
  return `figma: {
    apiToken: process.env.FIGMA_API_TOKEN ?? "",
    // 라벨 규칙 / Label rules:
    //   - "ds-new"    = primary (마이그레이션 목표, 자라야 하는 DS / migration target, the DS that should grow)
    //   - "ds-legacy" = 옛 DS (없어져야 하는 DS / legacy DS that should shrink)
    // dashboard 안 "primary 비중 높을수록" = ds-new 비중 자료.
    // DS 파일이 1개뿐이면 "ds-new" 라벨로 등록 권고.
    // (0.2.0 영역에서 primary 자료 라벨이 아닌 별도 필드(예: primary: true)로 받을 자료 — breaking change 자료.)
    designSystemFiles: [
      // TODO: { label: "ds-new", fileKey: "<Figma file key>", nodes: [...] }
      // TODO: { label: "ds-legacy", fileKey: "<Figma file key>", nodes: [...] }
    ],
    domainFiles: [
      // TODO: { label: "domain", fileKey: "<Figma file key>", frames: [...] }
    ],
  },`;
}
