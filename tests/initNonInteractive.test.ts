import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInit } from "../src/cli/init";

// runInit 은 process.cwd() 기준 — 임시 디렉토리로 chdir (pool=forks 전제).
// 전 케이스 비대화형 플래그만 사용 — 프롬프트가 뜨면 테스트가 hang 하므로
// 그 자체가 회귀 신호가 된다. lighthouse 켜는 케이스는 --skip-install 로
// npm spawn 을 회피한다 (네트워크/속도).
let tmp: string;
let prevCwd: string;

beforeEach(() => {
  prevCwd = process.cwd();
  tmp = mkdtempSync(path.join(tmpdir(), "dsmonitor-init-"));
  process.chdir(tmp);
});

afterEach(() => {
  process.chdir(prevCwd);
  rmSync(tmp, { recursive: true, force: true });
});

const CONFIG_REL = "dsmonitor/dsmonitor.config.ts";

describe("runInit — 비대화형 (0.12.0)", () => {
  it("--yes 단독: 프롬프트 없이 3종 산출물, figma/lighthouse off 기본", async () => {
    await runInit({ yes: true });
    expect(existsSync(path.join(tmp, CONFIG_REL))).toBe(true);
    expect(existsSync(path.join(tmp, "dsmonitor/.env.local.example"))).toBe(true);
    expect(existsSync(path.join(tmp, "dsmonitor/reports/.gitkeep"))).toBe(true);
    const config = readFileSync(path.join(tmp, CONFIG_REL), "utf8");
    expect(config).toContain("figmaAnalysis: false");
    expect(config).toContain("lighthouse 부분 누락");
  });

  it("--yes --figma: figma 블록 활성", async () => {
    await runInit({ yes: true, figma: true });
    const config = readFileSync(path.join(tmp, CONFIG_REL), "utf8");
    expect(config).toContain("figmaAnalysis: true");
    expect(config).toContain("designSystemFiles");
    const env = readFileSync(path.join(tmp, "dsmonitor/.env.local.example"), "utf8");
    expect(env).toContain("FIGMA_API_TOKEN");
  });

  it("--yes --lighthouse --auth custom --skip-install: 어댑터 스켈레톤 생성 + install 미실행", async () => {
    await runInit({ yes: true, lighthouse: true, authType: "custom", skipInstall: true });
    expect(existsSync(path.join(tmp, "dsmonitor/lighthouse/auth/custom.js"))).toBe(true);
    // --skip-install 이므로 npm install 부산물 (package.json/node_modules) 없음
    expect(existsSync(path.join(tmp, "node_modules"))).toBe(false);
    const config = readFileSync(path.join(tmp, CONFIG_REL), "utf8");
    expect(config).toContain('type: "custom"');
  });

  it("--yes: 기존 config 존재 시 덮어쓰지 않음 / --force 로 덮어씀", async () => {
    mkdirSync(path.join(tmp, "dsmonitor"), { recursive: true });
    writeFileSync(path.join(tmp, CONFIG_REL), "// 사용자 수정본");
    await runInit({ yes: true });
    expect(readFileSync(path.join(tmp, CONFIG_REL), "utf8")).toBe("// 사용자 수정본");
    await runInit({ yes: true, force: true });
    expect(readFileSync(path.join(tmp, CONFIG_REL), "utf8")).toContain("projectRoot");
  });

  it("개별 플래그만 (yes 없이): 명시 항목은 스킵되고 나머지만 물어야 하므로 — 전 항목 명시 시 무프롬프트", async () => {
    await runInit({ lighthouse: false, figma: true });
    const config = readFileSync(path.join(tmp, CONFIG_REL), "utf8");
    expect(config).toContain("figmaAnalysis: true");
    expect(config).toContain("lighthouse 부분 누락");
  });
});
