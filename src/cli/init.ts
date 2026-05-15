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
 *     - (Q1=Y + authType=custom) lighthouse/auth/custom.js 스켈레톤
 *
 *   0.5.0 BREAKING — 옛 lighthouse/config.js 자체 자동 생성 흐름 폐기. dsmonitor
 *   자체 안 LHCI config 자체 동적 생성 (node_modules/.cache/dsmonitor/lighthouserc.js).
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

/**
 * 0.7.0 (Y): cwd 기준으로 흔한 path 들을 탐색해 init template 의 default 값을
 * 자동으로 채우기 위한 결과. 발견 0건이면 각 필드는 null 이고 template 안에는
 * "자동 감지 안 됨" 안내 + 흔한 옵션을 주석으로 노출합니다.
 *
 * 탐색은 dsmonitor/ 폴더가 생기는 자리 (cwd) 기준입니다. 결과 경로는 dsmonitor/
 * 폴더 안 config 에서 projectRoot = ".." 으로 두는 흐름을 가정해 그대로 보존
 * (config 안에서는 projectRoot 기준으로 해석되므로 상대 경로 그대로 활용 가능).
 */
export interface DetectedPaths {
  tailwindConfig: string | null;
  cssGlobals: string | null;
  scssTokens: string | null;
  hasStylesDir: boolean;
  hasSrcStylesDir: boolean;
}

const TAILWIND_CONFIG_CANDIDATES = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

const CSS_GLOBALS_CANDIDATES = [
  "src/app/globals.css",     // Next.js App Router
  "src/styles/globals.css",  // Next.js Pages Router / Vite
  "app/globals.css",         // App Router (no src/)
  "styles/globals.css",      // Pages Router (no src/)
  "src/index.css",           // Vite default
  "src/styles/main.css",
];

const SCSS_TOKENS_CANDIDATES = [
  "styles/tokens.scss",
  "src/styles/tokens.scss",
  "styles/variables.scss",
  "src/styles/variables.scss",
];

export function detectProjectPaths(cwd: string): DetectedPaths {
  const exists = (rel: string): boolean => existsSync(path.join(cwd, rel));
  const findFirst = (cands: string[]): string | null => {
    for (const c of cands) if (exists(c)) return c;
    return null;
  };
  return {
    tailwindConfig: findFirst(TAILWIND_CONFIG_CANDIDATES),
    cssGlobals: findFirst(CSS_GLOBALS_CANDIDATES),
    scssTokens: findFirst(SCSS_TOKENS_CANDIDATES),
    hasStylesDir: exists("styles"),
    hasSrcStylesDir: exists("src/styles"),
  };
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

  // 0.7.0 (Y): cwd 기준 path 자동 감지 — codeTokens / globalStyleSources /
  // scssVariableDefFiles 의 default 값을 흔한 위치에서 첫 발견되는 파일로 미리
  // 채워 줍니다. 발견 0건이면 주석으로 흔한 옵션 4종을 함께 노출합니다.
  const detected = detectProjectPaths(cwd);
  console.log("");
  console.log("▶ path 자동 감지 (cwd 기준)");
  console.log(`  tailwind.config: ${detected.tailwindConfig ?? "(없음)"}`);
  console.log(`  globals.css    : ${detected.cssGlobals ?? "(없음)"}`);
  console.log(`  scss tokens    : ${detected.scssTokens ?? "(없음)"}`);

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
      answers.figma ? renderFigmaBlock(detected) : "// figma 부분 누락 (dsmonitor init 안 N 선택)"
    )
    .replace(/\{\{FIGMA_METRIC\}\}/g, answers.figma ? "true" : "false")
    .replace(/\{\{GLOBAL_STYLE_SOURCES\}\}/g, renderGlobalStyleSources(detected))
    .replace(/\{\{SCSS_VAR_DEF_FILES\}\}/g, renderScssVarDefFiles(detected));
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

  // 3-d. lighthouse/auth/custom.js — custom 케이스만 (0.5.0 BREAKING)
  //   옛 0.4.x 안 lighthouse/config.js 자체 자동 생성 흐름 = 폐기. dsmonitor 자체
  //   안 LHCI config 자체 동적 생성 (node_modules/.cache/dsmonitor/lighthouserc.js).
  //   외부 사용자 자체 LHCI advanced 옵션 자체 정정 흐름 = dsmonitor.config.ts
  //   안 `lighthouse.advanced?: Record<string, unknown>` 자체 명시.
  if (answers.lighthouse && answers.authType === "custom") {
    const lighthouseDir = path.join(projectDir, "lighthouse");
    const authDir = path.join(lighthouseDir, "auth");
    mkdirSync(authDir, { recursive: true });
    const customAdapterPath = path.join(authDir, "custom.js");
    if (!existsSync(customAdapterPath)) {
      writeFileSync(customAdapterPath, renderCustomAdapterSkeleton());
    }
  }

  // 4. 끝 안내
  console.log("");
  console.log("✓ dsmonitor/ 부트스트랩 끝");
  console.log("  - dsmonitor/dsmonitor.config.ts");
  console.log("  - dsmonitor/.env.local.example");
  console.log("  - dsmonitor/reports/.gitkeep");
  if (answers.lighthouse && answers.authType === "custom") {
    console.log("  - dsmonitor/lighthouse/auth/custom.js (스켈레톤)");
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
  if (answers.lighthouse) {
    console.log("");
    console.log("Lighthouse 측정 사전 안내:");
    console.log("  ⚠ Chrome 자체 사전 install 필요 (https://www.google.com/chrome/)");
    console.log("    dsmonitor 0.4.2+ = 자동 CHROME_PATH 감지 흐름 진입");
    console.log("    OS별 install: macOS  → brew install --cask google-chrome");
    console.log("                  Linux  → apt-get install google-chrome-stable");
    console.log("                  Win    → choco install googlechrome");
    console.log("    상세 안내: node_modules/dsmonitor/docs/lighthouse-ci-integration.md");
  }
  console.log("");
  console.log("참고 안내:");
  console.log("  - README — node_modules/dsmonitor/README.md");
  console.log("  - plugin 개발 — node_modules/dsmonitor/docs/plugin-development.md");
  console.log("");
}

function renderLighthouseBlock(authType: LighthouseAuthType): string {
  return `lighthouse: {
    baseUrl: process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000",

    // ── 측정 대상 페이지 (0.5.0+ — 단일 source 흐름) ──
    // dsmonitor 자체 안 LHCI config 자체 동적 생성 → 본 pages 자체 활용.
    // 옛 0.4.x 안 dsmonitor/lighthouse/config.js 안 PAGES hard-code 흐름 = 폐기.
    pages: [
      // TODO: 측정 대상 페이지 추가
      // 예: { path: "/", name: "Home" },
      //     { path: "/dashboard", name: "Dashboard" },
      //     { path: "/inspector/management", name: "Management" },
    ],
    runs: 3,

    // ── 인증 방식 — 3종 중 선택 ──
    //   1. 인증 없음:     { type: 'none' }
    //   2. ID/PW 기본:    { type: 'basic', loginUrl: '/login' }
    //   3. 커스텀 어댑터: { type: 'custom', adapter: './lighthouse/auth/<name>.js' }
    //
    // type !== 'none' 자체 = disableStorageReset: true 자동 inject (어댑터 세션 보존).
    // 상세한 안내: node_modules/dsmonitor/README.md 안 "Lighthouse 인증 흐름" sub-section.
    auth: ${renderAuthLiteral(authType)},

    // ── LHCI advanced 옵션 (0.5.0+, 선택) ──
    // dsmonitor 자체 default options (desktop preset / 1350×940 / 4 카테고리)
    // 자체 위에 사용자 자체 옵션 자체 deep-merge. 흔한 활용:
    //   - skipAudits: ["uses-http2"]            // 사내망 자체
    //   - chromeFlags: ["--no-sandbox"]         // Docker / CI 자체
    //   - throttlingMethod: "provided"          // 자체 측정 흐름 정정
    //   - screenEmulation: { mobile: true }     // mobile 측정
    //   - formFactor: "mobile"
    //
    // 상세 안내: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
    //
    // advanced: {
    //   settings: { skipAudits: ["uses-http2"] },
    // },
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

function renderFigmaBlock(detected: DetectedPaths): string {
  const codeTokensBody = renderCodeTokensBody(detected);
  return `figma: {
    apiToken: process.env.FIGMA_API_TOKEN ?? "",
    validationLevel: "lite",

    // ═══ DS 파일 / Design System Files ═══════════════════════════
    //
    // DS 파일 = 컴포넌트 / Variables / Styles 정의 파일. 측정 = 파일 전체의
    // Styles / Main Components 카운트. 페이지 / 프레임 선택 X (파일 전체 대상).
    //
    // 입력 형태: { url, label, primary?, comment? }
    //   - url     = Figma "Copy link" (파일 루트 URL, node-id 자리 X)
    //   - label   = 리포트 / 매칭용 고유 라벨 (자유 결정 — "ds-new" / "v1" / "legacy" 등)
    //   - primary = 0.2.0 규칙: DS 1개 = 자동 / DS 2개 이상 = 정확히 1개에 명시 필수
    //   - comment = 가독성용 메모 (선택)
    //
    // Primary specification rules (0.2.0):
    //   - 1 DS file = automatically primary (primary field can be omitted)
    //   - 2+ files  = exactly one must have primary: true
    //   - 0 or 2+ primaries = error
    designSystemFiles: [
      // TODO: { url: "https://www.figma.com/design/XXXXXXXXXXXXXXXXXXXXXX/DS-Legacy", label: "ds-legacy" },
      // TODO: { url: "https://www.figma.com/design/YYYYYYYYYYYYYYYYYYYYYY/DS-New", label: "ds-new", primary: true },
    ],

    // ═══ 도메인 파일 / Domain Files ═══════════════════════════════
    //
    // 도메인 파일 = 실제 UI 시안 / 프로토타입 파일. 측정 = 출처 미상 Instance
    // 비율 + Top N 마이그레이션 우선순위. 3 패턴 중 선택:
    //
    // 패턴 A — 파일 전체 측정 (archive 등 섞여 있지 않을 때 적합):
    //   { label, url, comment? }
    //     - url = 파일 루트 URL (node-id 자리 X)
    //
    // 패턴 B — 특정 페이지 전체 측정:
    //   { label, pages: [{ url, comment? }, ...] }
    //     - pages[].url = 페이지 URL (Figma 페이지 탭 우클릭 → Copy link)
    //     - 각 페이지의 모든 frame 측정 대상
    //
    // 패턴 C — 페이지 안 특정 frame만 측정:
    //   { label, pages: [{ comment?, frames: [{ url, comment? }, ...] }, ...] }
    //     - pages[].comment = 페이지 이름 (URL X)
    //     - pages[].frames[].url = frame URL (Figma frame 선택 → Copy link to selection)
    //
    // 혼합 흐름: 한 도메인 파일 안 패턴 B + C 섞기 가능. 단 모든 URL이 같은 파일 소속.
    //
    // node-id 정규화: URL 안 \`node-id=2-2\` ↔ REST API \`2:2\` 자동 변환 (도구 자체 처리).
    //
    // 상세한 안내 = README 안 "Figma 입력 흐름 / Figma Input Flow" sub-section.
    //
    // (EN —)
    // Domain files = actual UI mockup / prototype files. Measured = unknown-source
    // Instance ratio + Top N migration priority. Choose one of 3 patterns:
    //   Pattern A — measure the entire file:    { label, url, comment? }
    //   Pattern B — measure selected pages:     { label, pages: [{ url, comment? }] }
    //   Pattern C — measure selected frames:    { label, pages: [{ comment?, frames: [{ url, comment? }] }] }
    //   Mixed: one domain file may combine B + C entries (same file scope).
    //   node-id auto-normalized: URL \`node-id=2-2\` ↔ REST API \`2:2\`.
    //   Full guide: see "Figma Input Flow" sub-section in README.
    domainFiles: [
      // TODO 패턴 A: { label: "domain-a", url: "https://www.figma.com/design/AAAAAAAAAAAAAAAAAAAAAA/Domain-A", comment: "파일 전체" },
      //
      // TODO 패턴 B:
      // {
      //   label: "domain-b",
      //   pages: [
      //     { url: "https://www.figma.com/design/BBBBBBBBBBBBBBBBBBBBBB/Domain-B?node-id=2-2", comment: "계정관리" },
      //     { url: "https://www.figma.com/design/BBBBBBBBBBBBBBBBBBBBBB/Domain-B?node-id=3-1", comment: "권한설정" },
      //   ],
      // },
      //
      // TODO 패턴 C:
      // {
      //   label: "domain-c",
      //   pages: [
      //     {
      //       comment: "대시보드",
      //       frames: [
      //         { url: "https://www.figma.com/design/CCCCCCCCCCCCCCCCCCCCCC/Domain-C?node-id=100-5", comment: "메인위젯" },
      //         { url: "https://www.figma.com/design/CCCCCCCCCCCCCCCCCCCCCC/Domain-C?node-id=100-10", comment: "상단요약" },
      //       ],
      //     },
      //   ],
      // },
    ],

    // ═══ 출처 미상 Instance 옵션 / Unknown Instance Options ═══════
    unknownInstances: {
      topN: 10,
      // true = 외주 / 옛 DS 등 미등록 출처도 결과에 포함 (planning.md §7 2026-04-23 합의).
      // EN — true: include instances whose source is unregistered (e.g. vendor / legacy DS).
      allowUnknownSource: false,
    },

    // ═══ 코드 측 토큰 파서 / Code Token Parsers ═══════════════════
    // 빈 배열이어도 에러 X (codeCount=0 으로 tokenMatrix 생성).
    // 0.6.0 부터 SCSS 외에 cssVariables / tailwind 파서를 지원합니다.
    // 0.7.0 부터 init 시점에 cwd 기준으로 흔한 path 들을 탐색해 default 를 채워
    // 줍니다. 자동 감지 안 된 항목은 주석에 흔한 옵션 4종이 함께 표시되며,
    // 측정 후 dashboard 의 "Figma 토큰 매트릭스 → code 컬럼" 이 0 으로 잡힌다면
    // path 를 다시 점검하세요. \`npx dsmonitor doctor\` 명령으로 일괄 진단 가능합니다.
    // EN — empty array is allowed (tokenMatrix is still generated with codeCount=0).
    //      Since 0.6.0, cssVariables and tailwind parsers are available in addition to scss.
    //      Since 0.7.0, \`dsmonitor init\` auto-detects common path candidates from cwd and
    //      fills in defaults. If detection misses, common alternatives are listed as comments.
    //      Run \`npx dsmonitor doctor\` to verify every path at once.
    codeTokens: {
      parsers: [
${codeTokensBody}      ],
    },
  },`;
}

/**
 * 0.7.0 (Y): codeTokens.parsers 의 본문을 자동 감지 결과로 생성.
 *
 * - 감지된 파일이 있으면 활성 entry 로 노출 (주석 X).
 * - 감지 0건이면 흔한 옵션을 주석으로 노출해 사용자가 한 줄만 풀어 쓰면 되게 합니다.
 */
function renderCodeTokensBody(detected: DetectedPaths): string {
  const lines: string[] = [];

  // SCSS — 자동 감지된 tokens 파일이 있으면 활성, 없으면 주석 옵션.
  if (detected.scssTokens) {
    lines.push("        // SCSS 변수 + SCSS map + @each 동적 emit 추출 (자동 감지됨)");
    lines.push(`        { type: "scss", files: ["${detected.scssTokens}"] },`);
  } else {
    lines.push("        // SCSS 변수 + SCSS map + @each 동적 emit 추출 (자동 감지 안 됨)");
    lines.push('        // { type: "scss", files: ["styles/tokens.scss"] },');
  }

  lines.push("");

  // cssVariables — 자동 감지된 globals.css 가 있으면 활성, 없으면 흔한 옵션 안내.
  if (detected.cssGlobals) {
    lines.push("        // 순수 CSS 의 --* 정의 추출 (Tailwind v4 의 @theme 포함, 자동 감지됨)");
    lines.push(`        { type: "cssVariables", files: ["${detected.cssGlobals}"] },`);
  } else {
    lines.push("        // 순수 CSS 의 --* 정의 추출 (Tailwind v4 의 @theme 포함)");
    lines.push("        // globals.css 가 자동 감지되지 않았습니다. 실제 경로로 정정:");
    lines.push('        // { type: "cssVariables", files: ["src/app/globals.css"] },     // App Router');
    lines.push('        // { type: "cssVariables", files: ["src/styles/globals.css"] },  // Pages Router / Vite');
    lines.push('        // { type: "cssVariables", files: ["app/globals.css"] },          // App Router (no src/)');
    lines.push('        // { type: "cssVariables", files: ["styles/globals.css"] },       // Pages Router (no src/)');
  }

  lines.push("");

  // tailwind — 자동 감지된 config 가 있으면 활성, 없으면 4종 확장자 안내.
  if (detected.tailwindConfig) {
    lines.push("        // Tailwind v3 의 theme 토큰 추출 (colors / spacing / fontSize / borderRadius 기본, 자동 감지됨)");
    lines.push(`        { type: "tailwind", config: "${detected.tailwindConfig}" },`);
  } else {
    lines.push("        // Tailwind v3 의 theme 토큰 추출 (colors / spacing / fontSize / borderRadius 기본)");
    lines.push("        // tailwind.config 가 자동 감지되지 않았습니다. 실제 확장자로 정정:");
    lines.push('        // { type: "tailwind", config: "tailwind.config.ts" },');
    lines.push('        // { type: "tailwind", config: "tailwind.config.js" },');
    lines.push('        // { type: "tailwind", config: "tailwind.config.mjs" },');
    lines.push('        // { type: "tailwind", config: "tailwind.config.cjs" },');
  }

  return lines.map((l) => l + "\n").join("");
}

/**
 * 0.7.0 (Y): globalStyleSources 의 default 를 자동 감지 결과로 생성.
 *
 * 단일 root 자체를 가리키는 단순 glob 만 emit 합니다 (모호한 경우 주석으로 흔한 옵션 안내).
 */
function renderGlobalStyleSources(detected: DetectedPaths): string {
  // src/styles/ 가 있으면 그 안의 SCSS/CSS, 없고 styles/ 만 있으면 그 안.
  if (detected.hasSrcStylesDir) {
    return '["src/styles/**/*.{scss,css}"]';
  }
  if (detected.hasStylesDir) {
    return '["styles/**/*.{scss,css}"]';
  }
  if (detected.cssGlobals) {
    // styles 디렉토리는 없지만 globals.css 가 있으면 그 디렉토리 기준.
    const dir = detected.cssGlobals.replace(/\/[^/]+$/, "");
    return `["${dir}/**/*.{scss,css}"]`;
  }
  return '["styles/**/*.{scss,css}"]';
}

/**
 * 0.7.0 (Y): scssVariableDefFiles 의 default. 감지된 globals.css 가 있으면
 * hex / rgba noise 제외용으로 자동 등록해 둡니다.
 */
function renderScssVarDefFiles(detected: DetectedPaths): string {
  const entries: string[] = [];
  if (detected.cssGlobals) entries.push(`"${detected.cssGlobals}"`);
  if (detected.scssTokens) entries.push(`"${detected.scssTokens}"`);
  if (entries.length === 0) return "[]";
  return `[${entries.join(", ")}]`;
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
