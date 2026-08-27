/**
 * `dsmonitor agent-setup` — AI 에이전트 세팅 어댑터 설치 (0.12.0).
 *
 * 동작 모델: dsmonitor 가 AI 를 부르는 게 아니라 **AI 가 dsmonitor 를 부린다.**
 * 이 명령은 에이전트가 정본 플레이북 (`docs/agent-setup-playbook.md`, 패키지 안)
 * 을 발견하게 만드는 얇은 포인터 파일만 프로젝트에 심는다:
 *
 *   - Claude Code: `.claude/skills/dsmonitor-setup/SKILL.md`
 *   - Codex:       `AGENTS.md` 안 센티널 블록 (없으면 생성, 있으면 말미 append,
 *                  센티널 존재 시 블록 교체 — 멱등)
 *
 * 설계 결정:
 *   - 플레이북 본문은 프로젝트로 복사하지 않는다 — node_modules 정본을 읽게 해
 *     `npm update dsmonitor` 만으로 갱신 (dsforge 식 사본 복사의 낡음 문제 회피).
 *   - AI 도구 설치 여부를 감지하지 않는다 — 어댑터는 해당 도구가 있을 때만
 *     읽히는 무해한 텍스트라 무조건 설치가 단순하고 부작용이 없다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// init.ts 와 동일한 dev/dist 이중 해석 패턴 (templates/ 위치).
const TRY_TEMPLATES_DIRS = [
  path.resolve(__dirname, "..", "..", "templates"),
  path.resolve(__dirname, "..", "templates"),
];
const TEMPLATES_DIR =
  TRY_TEMPLATES_DIRS.find((p) => existsSync(path.join(p, "agent", "SKILL.md.tpl"))) ??
  TRY_TEMPLATES_DIRS[0];

const SENTINEL_START = "<!-- dsmonitor:agent-setup:start -->";
const SENTINEL_END = "<!-- dsmonitor:agent-setup:end -->";

export interface AgentSetupOptions {
  /** 기존 SKILL.md 를 덮어쓴다 (기본: 존재 시 skip). */
  force?: boolean;
  /** Claude Code 어댑터만 설치. */
  claudeOnly?: boolean;
  /** Codex 어댑터만 설치. */
  codexOnly?: boolean;
}

/**
 * AGENTS.md 센티널 블록 설치 규칙 (멱등):
 *   - 파일 없음 → 블록만으로 생성
 *   - 파일 있음 + 센티널 없음 → 말미에 append (비파괴 — 기존 내용 보존)
 *   - 센티널 있음 → 블록 교체 (재실행/업그레이드 안전)
 *
 * dsforge 식 폴백 파일 (AGENTS.dsmonitor.md) 은 쓰지 않는다 — Codex 가 읽지
 * 않는 파일이라 사람이 병합할 때까지 기능이 죽는 문제가 있어 append 가 우월.
 */
export function upsertAgentsSection(existing: string | null, block: string): string {
  const trimmedBlock = block.trimEnd();
  if (existing === null) return trimmedBlock + "\n";

  const start = existing.indexOf(SENTINEL_START);
  const end = existing.indexOf(SENTINEL_END);
  if (start >= 0 && end > start) {
    return (
      existing.slice(0, start) +
      trimmedBlock +
      existing.slice(end + SENTINEL_END.length)
    );
  }
  const sep = existing.endsWith("\n") ? "\n" : "\n\n";
  return existing + sep + trimmedBlock + "\n";
}

export async function runAgentSetup(opts: AgentSetupOptions = {}): Promise<void> {
  if (opts.claudeOnly && opts.codexOnly) {
    console.error("[dsmonitor agent-setup] --claude-only 와 --codex-only 는 동시 사용 불가.");
    process.exit(1);
  }
  const installClaude = !opts.codexOnly;
  const installCodex = !opts.claudeOnly;

  console.log("");
  console.log("DSMonitor agent-setup — AI 에이전트 세팅 어댑터 설치");
  console.log("─".repeat(60));

  const cwd = process.cwd();
  const written: string[] = [];
  const skipped: string[] = [];

  // 1. Claude Code 어댑터 — .claude/skills/dsmonitor-setup/SKILL.md
  if (installClaude) {
    const skillDir = path.join(cwd, ".claude", "skills", "dsmonitor-setup");
    const skillPath = path.join(skillDir, "SKILL.md");
    if (existsSync(skillPath) && !opts.force) {
      skipped.push(`.claude/skills/dsmonitor-setup/SKILL.md (이미 존재 — 갱신하려면 --force)`);
    } else {
      const tpl = readFileSync(path.join(TEMPLATES_DIR, "agent", "SKILL.md.tpl"), "utf8");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(skillPath, tpl);
      written.push(".claude/skills/dsmonitor-setup/SKILL.md");
    }
  }

  // 2. Codex 어댑터 — AGENTS.md 센티널 블록 (멱등 upsert 라 --force 불필요)
  if (installCodex) {
    const agentsPath = path.join(cwd, "AGENTS.md");
    const block = readFileSync(
      path.join(TEMPLATES_DIR, "agent", "AGENTS.section.md.tpl"),
      "utf8"
    );
    const existing = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : null;
    const next = upsertAgentsSection(existing, block);
    if (existing === next) {
      skipped.push("AGENTS.md (이미 최신 블록)");
    } else {
      writeFileSync(agentsPath, next);
      written.push(
        existing === null
          ? "AGENTS.md (생성)"
          : existing.includes(SENTINEL_START)
            ? "AGENTS.md (dsmonitor 블록 갱신)"
            : "AGENTS.md (말미에 dsmonitor 블록 추가 — 기존 내용 보존)"
      );
    }
  }

  // 3. 안내
  console.log("");
  for (const w of written) console.log(`✓ ${w}`);
  for (const s of skipped) console.log(`• ${s}`);
  console.log("");
  console.log("다음 단계 — 이 폴더에서 AI 에이전트를 열고 이렇게 말하세요:");
  if (installClaude) console.log('  Claude Code: "dsmonitor 설정해줘"');
  if (installCodex) console.log('  Codex:       "dsmonitor 설정해줘"');
  console.log("");
  console.log("에이전트가 리포를 검토해 config 를 작성하고 doctor/audit 검증까지 수행합니다.");
  console.log("정본 플레이북: node_modules/dsmonitor/docs/agent-setup-playbook.md");
  console.log("(npm update dsmonitor 만으로 플레이북이 갱신됩니다 — 프로젝트에 사본 없음)");
  console.log("");
}
