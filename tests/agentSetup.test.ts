import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runAgentSetup, upsertAgentsSection } from "../src/cli/agentSetup";

// runAgentSetup 은 process.cwd() 기준으로 파일을 심는다 — 임시 디렉토리로 chdir
// (vitest 기본 pool=forks 라 chdir 가능).
let tmp: string;
let prevCwd: string;

beforeEach(() => {
  prevCwd = process.cwd();
  tmp = mkdtempSync(path.join(tmpdir(), "dsmonitor-agent-setup-"));
  process.chdir(tmp);
});

afterEach(() => {
  process.chdir(prevCwd);
  rmSync(tmp, { recursive: true, force: true });
});

const SKILL_REL = ".claude/skills/dsmonitor-setup/SKILL.md";

describe("runAgentSetup", () => {
  it("빈 프로젝트 — SKILL.md + AGENTS.md 생성", async () => {
    await runAgentSetup();
    const skill = readFileSync(path.join(tmp, SKILL_REL), "utf8");
    expect(skill).toContain("name: dsmonitor-setup");
    expect(skill).toContain("agent-setup-playbook.md");
    const agents = readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
    expect(agents).toContain("<!-- dsmonitor:agent-setup:start -->");
    expect(agents).toContain("<!-- dsmonitor:agent-setup:end -->");
  });

  it("기존 AGENTS.md 보존 + 말미 append", async () => {
    writeFileSync(path.join(tmp, "AGENTS.md"), "# 우리 팀 규칙\n\n- 기존 내용\n");
    await runAgentSetup();
    const agents = readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
    expect(agents.startsWith("# 우리 팀 규칙")).toBe(true);
    expect(agents).toContain("- 기존 내용");
    expect(agents).toContain("<!-- dsmonitor:agent-setup:start -->");
    // 블록이 기존 내용 뒤에 위치
    expect(agents.indexOf("- 기존 내용")).toBeLessThan(
      agents.indexOf("<!-- dsmonitor:agent-setup:start -->")
    );
  });

  it("재실행 멱등 — 센티널 블록 중복 없음", async () => {
    await runAgentSetup();
    const first = readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
    await runAgentSetup({ force: true });
    const second = readFileSync(path.join(tmp, "AGENTS.md"), "utf8");
    expect(second).toBe(first);
    expect(second.split("<!-- dsmonitor:agent-setup:start -->").length).toBe(2); // 1회 등장
  });

  it("SKILL.md 존재 시 skip, --force 로 덮어쓰기", async () => {
    mkdirSync(path.join(tmp, ".claude", "skills", "dsmonitor-setup"), { recursive: true });
    writeFileSync(path.join(tmp, SKILL_REL), "사용자 수정본");
    await runAgentSetup();
    expect(readFileSync(path.join(tmp, SKILL_REL), "utf8")).toBe("사용자 수정본");
    await runAgentSetup({ force: true });
    expect(readFileSync(path.join(tmp, SKILL_REL), "utf8")).toContain("name: dsmonitor-setup");
  });

  it("--claude-only / --codex-only 분리 설치", async () => {
    await runAgentSetup({ claudeOnly: true });
    expect(existsSync(path.join(tmp, SKILL_REL))).toBe(true);
    expect(existsSync(path.join(tmp, "AGENTS.md"))).toBe(false);

    rmSync(path.join(tmp, ".claude"), { recursive: true });
    await runAgentSetup({ codexOnly: true });
    expect(existsSync(path.join(tmp, SKILL_REL))).toBe(false);
    expect(existsSync(path.join(tmp, "AGENTS.md"))).toBe(true);
  });
});

describe("upsertAgentsSection (순수 함수)", () => {
  const block =
    "<!-- dsmonitor:agent-setup:start -->\n내용 v2\n<!-- dsmonitor:agent-setup:end -->\n";

  it("null → 블록만으로 생성", () => {
    expect(upsertAgentsSection(null, block)).toBe(block.trimEnd() + "\n");
  });

  it("센티널 있으면 사이만 교체 — 앞뒤 내용 보존", () => {
    const existing =
      "# 앞\n\n<!-- dsmonitor:agent-setup:start -->\n옛 내용\n<!-- dsmonitor:agent-setup:end -->\n\n# 뒤\n";
    const next = upsertAgentsSection(existing, block);
    expect(next).toContain("# 앞");
    expect(next).toContain("# 뒤");
    expect(next).toContain("내용 v2");
    expect(next).not.toContain("옛 내용");
  });
});
