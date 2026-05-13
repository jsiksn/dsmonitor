/**
 * `dsmonitor init` — 외부 사용자 dsmonitor/ 디렉토리 부트스트랩 (0.4.0).
 *
 * 동작:
 *   Q1. Lighthouse 측정 사용? (Y/n)
 *   Q2. Figma 측정 사용? (Y/n)
 *   Q1=Y → 인증 방식 select (1. 인증 없음 / 2. ID/PW 기본 / 3. 커스텀 어댑터)
 *
 *   Q1=Y → npm install --save-dev @lhci/cli (spawn). 실패 시 manual 명령 안내.
 *   Q2=Y → 별도 install 없음. .env.local 안 FIGMA_API_TOKEN 안내.
 *
 *   dsmonitor/ 폴더 자동 생성:
 *     - dsmonitor.config.ts (templates/dsmonitor.config.ts.tpl 안에서 Q1/Q2 + authType 토큰 치환)
 *     - .env.local.example (Q1 = N → BASE_URL 자리 X / authType 별 동적 본문)
 *     - reports/.gitkeep
 *     - (Q1=Y) lighthouse/config.js (authType 별 자동 생성)
 *     - (Q1=Y + authType=custom) lighthouse/auth/custom.js 스켈레톤
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

type LighthouseAuthType = "none" | "basic" | "custom";

interface InitAnswers {
  lighthouse: boolean;
  figma: boolean;
  authType?: LighthouseAuthType;
  overwrite?: boolean;
}

export async function runInit(): Promise<void> {
  console.log("");
  console.log("DSMonitor init — 외부 사용자 dsmonitor/ 폴더 부트스트랩");
  console.log("─".repeat(60));

  const baseAnswers = await prompts(
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

  const answers: InitAnswers = { ...baseAnswers };

  // Lighthouse=Y → 인증 방식 select prompt (0.4.0)
  if (answers.lighthouse) {
    const authAnswer = await prompts(
      {
        type: "select",
        name: "authType",
        message: "Lighthouse 인증 방식?",
        choices: [
          { title: "1. 인증 없음 (공개 사이트)", value: "none" },
          { title: "2. ID/PW 기본 form login (dsmonitor 내장 어댑터)", value: "basic" },
          { title: "3. 커스텀 어댑터 (스켈레톤 자동 생성)", value: "custom" },
        ],
        initial: 0,
      },
      {
        onCancel: () => {
          console.log("\n[dsmonitor init] 취소됨");
          process.exit(0);
        },
      }
    );
    answers.authType = authAnswer.authType as LighthouseAuthType;
  }

  // 1. 외부 사용자 dsmonitor/ 부분 검증 (덮어쓰기 확인)
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
      console.warn("\n⚠ @lhci/cli 자동 install 실패 — 직접 명령:");
      console.warn("    npm install --save-dev @lhci/cli");
      console.warn("  (yarn / pnpm 환경은 자체 명령 활용. 본 0.1.x = npm only.)");
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
    .replace(
      /\{\{LIGHTHOUSE_BLOCK\}\}/g,
      answers.lighthouse
        ? renderLighthouseBlock(answers.authType ?? "none")
        : "// lighthouse 부분 누락 (dsmonitor init 안 N 선택)"
    )
    .replace(
      /\{\{FIGMA_BLOCK\}\}/g,
      answers.figma ? renderFigmaBlock() : "// figma 부분 누락 (dsmonitor init 안 N 선택)"
    )
    .replace(/\{\{FIGMA_METRIC\}\}/g, answers.figma ? "true" : "false");
  writeFileSync(configPath, config);

  // 3-b. .env.local.example (figma + lighthouse 안내 — authType 동적 생성)
  const envTpl = readFileSync(path.join(TEMPLATES_DIR, ".env.local.example.tpl"), "utf8");
  const envContent = envTpl
    .replace(
      /\{\{FIGMA_ENV_BLOCK\}\}/g,
      answers.figma ? renderFigmaEnvBlock() : "# (figma 측정 미사용 — dsmonitor init 안 N 선택)"
    )
    .replace(
      /\{\{LIGHTHOUSE_ENV_BLOCK\}\}/g,
      answers.lighthouse
        ? renderLighthouseEnvBlock(answers.authType ?? "none")
        : "# (lighthouse 측정 미사용 — dsmonitor init 안 N 선택)"
    );
  writeFileSync(path.join(projectDir, ".env.local.example"), envContent);

  // 3-c. reports/.gitkeep
  writeFileSync(path.join(projectDir, "reports", ".gitkeep"), "");

  // 3-d. lighthouse/config.js + (custom 케이스) lighthouse/auth/custom.js — Y 케이스만
  if (answers.lighthouse) {
    const lighthouseDir = path.join(projectDir, "lighthouse");
    mkdirSync(lighthouseDir, { recursive: true });
    const lighthouseConfigPath = path.join(lighthouseDir, "config.js");
    if (!existsSync(lighthouseConfigPath)) {
      writeFileSync(lighthouseConfigPath, renderLighthouseConfigJs(answers.authType ?? "none"));
    }

    if (answers.authType === "custom") {
      const authDir = path.join(lighthouseDir, "auth");
      mkdirSync(authDir, { recursive: true });
      const customAdapterPath = path.join(authDir, "custom.js");
      if (!existsSync(customAdapterPath)) {
        writeFileSync(customAdapterPath, renderCustomAdapterSkeleton());
      }
    }
  }

  // 4. 끝 안내
  console.log("");
  console.log("✓ dsmonitor/ 부트스트랩 끝");
  console.log("  - dsmonitor/dsmonitor.config.ts");
  console.log("  - dsmonitor/.env.local.example");
  console.log("  - dsmonitor/reports/.gitkeep");
  if (answers.lighthouse) {
    console.log("  - dsmonitor/lighthouse/config.js");
    if (answers.authType === "custom") {
      console.log("  - dsmonitor/lighthouse/auth/custom.js (스켈레톤)");
    }
  }
  console.log("");
  console.log("다음 단계:");
  console.log("  1.   dsmonitor/.env.local.example → dsmonitor/.env.local (cp 후 키 입력)");
  console.log("  1.5. dsmonitor/dsmonitor.config.ts 검토 + Figma file ID / Lighthouse URL 입력");
  if (answers.authType === "custom") {
    console.log("  1.6. dsmonitor/lighthouse/auth/custom.js 어댑터 본문 작성");
  }
  console.log("  2.   npx dsmonitor audit --only code   # codebase 측정");
  if (answers.figma) {
    console.log("  3.   npx dsmonitor audit               # code + figma 통합 측정");
  }
  if (answers.lighthouse) {
    console.log("  4.   npx dsmonitor audit --all         # 통합 chain (code + figma + Lighthouse + report + dashboard)");
    console.log("  5.   npx dsmonitor dashboard           # dashboard 빌드 (단독)");
  }
  console.log("");
  console.log("CLI 옵션 안내:");
  console.log("  - npx dsmonitor audit --all              # 통합 chain (code + figma + Lighthouse + report + dashboard)");
  console.log("  - npx dsmonitor audit --baseline         # baseline-YYYY-MM-DD.json 생성");
  console.log("  - npx dsmonitor audit --only lighthouse  # Lighthouse 단독 측정");
  console.log("  - npx dsmonitor audit --skip-lighthouse  # Lighthouse 건너뜀 (빠른 cycle)");
  console.log("  - npx dsmonitor --help                   # 전체 명령 안내");
  console.log("");
  console.log("참고 안내:");
  console.log("  - README — node_modules/dsmonitor/README.md");
  console.log("  - plugin 개발 — node_modules/dsmonitor/docs/plugin-development.md");
  console.log("");
}

function renderLighthouseBlock(authType: LighthouseAuthType): string {
  return `lighthouse: {
    baseUrl: process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000",
    pages: [
      // TODO: 측정 대상 페이지 추가 (예: { path: "/", name: "Home" })
    ],
    runs: 3,
    // ── 인증 방식 — 3종 중 선택 ──
    //   1. 인증 없음:     { type: 'none' }
    //   2. ID/PW 기본:    { type: 'basic', loginUrl: '/login' }
    //   3. 커스텀 어댑터: { type: 'custom', adapter: './lighthouse/auth/<name>.js' }
    //
    // 자세한 안내: node_modules/dsmonitor/README.md 안 "Lighthouse 인증 흐름" sub-section.
    auth: ${renderAuthLiteral(authType)},
  },`;
}

function renderAuthLiteral(authType: LighthouseAuthType): string {
  switch (authType) {
    case "basic":
      return `{ type: "basic", loginUrl: "/login" }`;
    case "custom":
      return `{ type: "custom", adapter: "./lighthouse/auth/custom.js" }`;
    case "none":
    default:
      return `{ type: "none" }`;
  }
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

function renderFigmaEnvBlock(): string {
  return `# FIGMA_API_TOKEN=figd_<personal access token>
# 발급: Figma → Settings → Security → Personal access tokens. scope "File content read-only".`;
}

function renderLighthouseEnvBlock(authType: LighthouseAuthType): string {
  switch (authType) {
    case "none":
      return [
        "# LIGHTHOUSE_BASE_URL=http://localhost:3000",
        "#   (인증 없음 — auth: { type: 'none' } 안 BASE_URL 만 필요)",
      ].join("\n");
    case "basic":
      return [
        "# LIGHTHOUSE_BASE_URL=http://localhost:3000",
        "# LIGHTHOUSE_LOGIN_URL=/login",
        "# LIGHTHOUSE_TEST_ID=<테스트 계정 ID>",
        "# LIGHTHOUSE_TEST_PW=<테스트 계정 PW>",
        "#",
        "# (선택) selector override — 기본 추론으로 안 잡히는 케이스만 명시:",
        "# LIGHTHOUSE_BASIC_SELECTOR_ID_INPUT=input[name=\"username\"]",
        "# LIGHTHOUSE_BASIC_SELECTOR_PW_INPUT=input[name=\"password\"]",
        "# LIGHTHOUSE_BASIC_SELECTOR_SUBMIT=button.login-submit",
      ].join("\n");
    case "custom":
      return [
        "# LIGHTHOUSE_BASE_URL=http://localhost:3000",
        "#",
        "# 커스텀 어댑터 = 자유 환경변수. 어댑터 본문 (`lighthouse/auth/custom.js`) 안",
        "# 활용하는 변수 그대로 본 파일 안 정의. 예시:",
        "# LIGHTHOUSE_TEST_ID=<테스트 계정 ID>",
        "# LIGHTHOUSE_TEST_PW=<테스트 계정 PW>",
        "# LIGHTHOUSE_SESSION_COOKIE=<...>",
        "# LIGHTHOUSE_OAUTH_TOKEN=<...>",
      ].join("\n");
  }
}

function renderLighthouseConfigJs(authType: LighthouseAuthType): string {
  const header = [
    "/**",
    " * Lighthouse CI 설정 — dsmonitor init 안 자동 생성 (0.4.0).",
    " *",
    " * 측정 대상 URL = dsmonitor.config.ts 안 lighthouse.pages 정정.",
    " * 인증 방식 = dsmonitor.config.ts 안 lighthouse.auth 정정.",
    " */",
    "",
    'const path = require("path");',
    "",
  ].join("\n");

  switch (authType) {
    case "none":
      return (
        header +
        `const baseUrl = (process.env.LIGHTHOUSE_BASE_URL || "http://localhost:3000").replace(/\\/$/, "");

// 측정 대상 페이지 — dsmonitor.config.ts 안 lighthouse.pages 와 일관 정정.
const PAGES = ["/"];

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((p) => \`\${baseUrl}\${p}\`),
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: process.env.LHCI_OUTPUT_DIR || "./reports",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
`
      );
    case "basic":
      return (
        header +
        `const baseUrl = (process.env.LIGHTHOUSE_BASE_URL || "http://localhost:3000").replace(/\\/$/, "");

// 측정 대상 페이지 — dsmonitor.config.ts 안 lighthouse.pages 와 일관 정정.
const PAGES = ["/"];

// dsmonitor 내장 basic-form-login 어댑터 — 패키지 경로 자동 검색.
const basicAdapter = require.resolve("dsmonitor/lighthouse/auth/basic-form-login.js");

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((p) => \`\${baseUrl}\${p}\`),
      numberOfRuns: 3,
      puppeteerScript: path.relative(process.cwd(), basicAdapter),
      puppeteerLaunchOptions: { headless: true },
      settings: {
        preset: "desktop",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        // 어댑터 안 심은 세션 (cookie / localStorage) 보존 — 매 측정 storage clear 회피.
        disableStorageReset: true,
      },
    },
    upload: {
      target: "filesystem",
      outputDir: process.env.LHCI_OUTPUT_DIR || "./reports",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
`
      );
    case "custom":
      return (
        header +
        `const baseUrl = (process.env.LIGHTHOUSE_BASE_URL || "http://localhost:3000").replace(/\\/$/, "");

// 측정 대상 페이지 — dsmonitor.config.ts 안 lighthouse.pages 와 일관 정정.
const PAGES = ["/"];

// 커스텀 어댑터 — dsmonitor init 안 lighthouse/auth/custom.js 스켈레톤 자동 생성.
//   본문 작성: 어댑터 안 module.exports = async (browser, context) => { ... }
//   메타데이터: module.exports.getMetadata = () => ({ ... }) 추가 → summary.json 누적.
const customAdapter = path.join(__dirname, "auth/custom.js");

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((p) => \`\${baseUrl}\${p}\`),
      numberOfRuns: 3,
      puppeteerScript: path.relative(process.cwd(), customAdapter),
      puppeteerLaunchOptions: { headless: true },
      settings: {
        preset: "desktop",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        disableStorageReset: true,
      },
    },
    upload: {
      target: "filesystem",
      outputDir: process.env.LHCI_OUTPUT_DIR || "./reports",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
`
      );
  }
}

function renderCustomAdapterSkeleton(): string {
  return `/**
 * 커스텀 인증 어댑터 스켈레톤 — dsmonitor init 안 자동 생성 (0.4.0).
 *
 * 인터페이스 (LHCI puppeteerScript + dsmonitor 확장):
 *   - module.exports = async (browser, context) => void   (LHCI 호환)
 *   - module.exports.getMetadata = () => Record<string, any>  (run.js 안 summary 누적)
 *
 * 환경변수 = 자유. dsmonitor/.env.local.example 안 변수 명시 후 본 파일 안 read.
 */

"use strict";

const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env.local"),
});

const TIMEOUTS = {
  navigation: 15000,
  selector: 10000,
};

module.exports = async (browser /* , context */) => {
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  // TODO: 인증 흐름 본문 작성.
  //
  // 예시 흐름:
  //   1. await page.goto(process.env.LIGHTHOUSE_LOGIN_URL, { waitUntil: "networkidle2" });
  //   2. await page.type('input[name="username"]', process.env.LIGHTHOUSE_TEST_ID);
  //   3. await page.type('input[name="password"]', process.env.LIGHTHOUSE_TEST_PW);
  //   4. await Promise.all([
  //        page.click('button[type="submit"]'),
  //        page.waitForNavigation({ waitUntil: "networkidle2" }),
  //      ]);
  //
  // 다중 단계 (zone/account select 등) 케이스 = 옛 portal-gateway 어댑터
  // (https://github.com/jsiksn/dsmonitor 외부 사용자 사례) 참조.

  console.log("[custom auth] TODO: 인증 흐름 본문 작성");
};

/**
 * 어댑터 메타데이터 — summary.json 안 누적.
 * dsmonitor lighthouse/run.js 가 본 함수 export 시 자동 호출.
 */
module.exports.getMetadata = function getMetadata() {
  return {
    authType: "custom",
    // 자유 메타데이터 — 예시:
    // testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
    // adapterVersion: "0.1.0",
  };
};
`;
}
