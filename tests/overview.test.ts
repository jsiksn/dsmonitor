import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateOverview } from "../src/reporters/overview";
import type { CodebaseReport, UIHealthConfig } from "../src/types";
import baselineJson from "./fixtures/baseline.json";

const baseline = baselineJson as unknown as CodebaseReport;
const cfg = { reportStatus: {} } as unknown as UIHealthConfig;

async function render(template: string): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "dsmonitor-overview-"));
  const templatePath = path.join(dir, "template.md");
  const outputPath = path.join(dir, "out.md");
  writeFileSync(templatePath, template);
  const ok = await generateOverview(baseline, cfg, { templatePath, outputPath });
  expect(ok).toBe(true);
  return readFileSync(outputPath, "utf8");
}

describe("generateOverview — 0.8.9 placeholder 체계", () => {
  it("이름 자유 값 빈칸: migrationByTarget.<이름>", async () => {
    const out = await render("Button: {{migrationByTarget.Button}}건");
    expect(out).toBe("Button: 12건");
  });

  it("hyphen 포함 키: forbiddenById.<id>", async () => {
    const out = await render("BS: {{forbiddenById.bootstrap-utilities}}건");
    expect(out).toBe("BS: 100건");
  });

  it("목록 블록: 카운트 내림차순 '- 이름 N건'", async () => {
    const out = await render("{{forbiddenByIdList}}");
    expect(out.split("\n")).toEqual([
      "- bootstrap-utilities 100건",
      "- apply-mixed 15건",
      "- raw-css 5건",
      "- scss-imports 0건",
    ]);
  });

  it("옛 고정 키(0.8.9 제거)는 조용히 사라지지 않고 {{key?}} 로 표시", async () => {
    const out = await render("옛: {{migrationInputCount}}");
    expect(out).toBe("옛: {{migrationInputCount?}}");
  });

  it("템플릿 파일이 없으면 false 반환 (선택 기능 — 조용히 skip)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "dsmonitor-overview-"));
    const ok = await generateOverview(baseline, cfg, {
      templatePath: path.join(dir, "missing.md"),
      outputPath: path.join(dir, "out.md"),
    });
    expect(ok).toBe(false);
  });
});
