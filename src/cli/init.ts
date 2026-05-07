/**
 * `dsmonitor init` — 사용자 측 dsmonitor/ 디렉토리 부트스트랩 (v0.1.1).
 *
 * 동작:
 *   Q1. Lighthouse 측정 사용? (Y/n)
 *   Q2. Figma 측정 사용? (Y/n)
 *
 *   Q1=Y → npm install --save-dev @lhci/cli (spawn). 실패 시 manual 명령 안내.
 *   Q2=Y → 별도 install 없음. .env.local 안 FIGMA_API_TOKEN 안내.
 *
 *   dsmonitor/ 폴더 자동 생성:
 *     - dsmonitor.config.ts (templates/dsmonitor.config.ts.tpl 안에서 Q1/Q2 토큰 치환)
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

// 두 케이스 호환 path —
//  - dev (tsx + src): __dirname = src/cli/ → ../../templates
//  - bundled (dist/cli.js inline): __dirname = dist/ → ../templates
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

  // 1. 사용자 측 dsmonitor/ 부분 검증 (덮어쓰기 확인)
  const cwd = process.cwd();
  const projectDir = path.join(cwd, "dsmonitor");
  const configPath = path.join(projectDir, "dsmonitor.config.ts");

  if (existsSync(configPath)) {
    const overwrite = await prompts(
      {
        type: "confirm",
        name: "overwrite",
        message: `이미 ${path.relative(cwd, configPath)} 존재. 덮어쓰기?`,
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
      console.log("\n[dsmonitor init] 덮어쓰기 안 함 — 끝");
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
      console.warn("  (yarn / pnpm 사용자 측은 자체 명령 활용. 본 0.1.x = npm only.)");
    } else {
      console.log("✓ @lhci/cli install 끝");
    }
  }

  // 3. dsmonitor/ 폴더 + 파일 생성
  mkdirSync(projectDir, { recursive: true });
  mkdirSync(path.join(projectDir, "reports"), { recursive: true });

  // 3-a. dsmonitor.config.ts (templates/dsmonitor.config.ts.tpl 안 토큰 치환)
  const configTpl = readFileSync(path.join(TEMPLATES_DIR, "dsmonitor.config.ts.tpl"), "utf8");
  const config = configTpl
    .replace(/\{\{LIGHTHOUSE_BLOCK\}\}/g, answers.lighthouse ? renderLighthouseBlock() : "// lighthouse 부분 누락 (dsmonitor init 안 N 선택)")
    .replace(/\{\{FIGMA_BLOCK\}\}/g, answers.figma ? renderFigmaBlock() : "// figma 부분 누락 (dsmonitor init 안 N 선택)")
    .replace(/\{\{FIGMA_METRIC\}\}/g, answers.figma ? "true" : "false");
  writeFileSync(configPath, config);

  // 3-b. .env.local.example (figma + lighthouse 키 안내)
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
  console.log("  2. npx dsmonitor audit --only code   # codebase 측정 (Phase 0.6 B — 자연 작동)");
  if (answers.figma) {
    console.log("  3. npx dsmonitor audit               # figma 통합 측정");
  }
  if (answers.lighthouse) {
    console.log("  4. npx dsmonitor dashboard           # dashboard 빌드");
  }
  console.log("");
  console.log("참고 안내:");
  console.log("  - README — node_modules/dsmonitor/README.md");
  console.log("  - plugin 개발 — node_modules/dsmonitor/docs/plugin-development.md");
  console.log("");
}

function renderLighthouseBlock(): string {
  return `lighthouse: {
    baseUrl: process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000",
    pages: [
      // TODO: 측정 대상 페이지 추가 (예: { path: "/", name: "Home" })
    ],
    runs: 3,
  },`;
}

function renderFigmaBlock(): string {
  return `figma: {
    apiToken: process.env.FIGMA_API_TOKEN ?? "",
    // Primary 명시 규칙 / Primary specification rules (0.2.0):
    //   - DS 1개뿐 = 자동 primary (primary 필드 생략 가능)
    //   - DS 2개 이상 = 정확히 1개에 primary: true 명시 필수
    //   - primary 0개 또는 2개 이상 = 에러 throw
    // 라벨 형태 = 사용자 자유 결정 (예: "v1", "v2", "main", "legacy").
    // dashboard 안 사용자 라벨 그대로 표시.
    //
    // (KO above / EN below — same rules)
    //   - 1 DS file  = automatically primary (primary field can be omitted)
    //   - 2+ files   = exactly one must have primary: true
    //   - 0 or 2+ primaries = error
    designSystemFiles: [
      // TODO: { label: "v1", fileKey: "<Figma file key>", nodes: [...] }
      // TODO: { label: "v2", fileKey: "<Figma file key>", primary: true, nodes: [...] }
    ],
    domainFiles: [
      // TODO: { label: "domain", fileKey: "<Figma file key>", frames: [...] }
    ],
  },`;
}
