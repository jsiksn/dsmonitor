/**
 * doctor 확장 (0.9.0 — 8): stylingPolicy 의미 검증 + glob 실매치 검사.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runDoctor } from "../src/cli/doctor";
import type { UIHealthConfig } from "../src/types";

const FIXTURE_ROOT = path.resolve(__dirname, "fixtures");

function makeCfg(overrides: {
  preferred?: string;
  globalStyleSources?: string[];
  officialPaths?: string[];
}): UIHealthConfig & { __absRoot: string } {
  return {
    scan: { codeRoots: [], styleRoots: [], codeExts: [".tsx"], ignore: [] },
    globalStyleSources: overrides.globalStyleSources ?? [],
    hardcodedValues: { colorPatterns: [], scssVariableUsagePatterns: [], scssVariableDefFiles: [] },
    designSystem: { officialPaths: overrides.officialPaths ?? [], officialAliases: [], componentExts: [".tsx"] },
    stylingPolicy: {
      allowed: [{ id: "tailwind", label: "Tailwind", detect: {} }],
      preferred: overrides.preferred ?? "tailwind",
      forbidden: [],
    },
    migrationTargets: {},
    metrics: {},
    thresholds: {},
    report: { outputDir: "reports", baselineFilenamePrefix: "baseline-" },
    __absRoot: FIXTURE_ROOT,
  } as unknown as UIHealthConfig & { __absRoot: string };
}

function entriesOf(cfg: UIHealthConfig & { __absRoot: string }, category: string) {
  const report = runDoctor(cfg, "/fixture/dsmonitor.config.ts", { json: true });
  return report.entries.filter((e) => e.category === category);
}

describe("doctor — stylingPolicy 의미 검증 (0.9.0)", () => {
  it("preferred 가 allowed 에 있으면 ok", () => {
    const entries = entriesOf(makeCfg({}), "stylingPolicy");
    expect(entries).toHaveLength(1);
    expect(entries[0].severity).toBe("ok");
  });

  it("preferred 가 allowed 에 없으면 error", () => {
    const entries = entriesOf(makeCfg({ preferred: "scss" }), "stylingPolicy");
    expect(entries[0].severity).toBe("error");
    expect(entries[0].message).toContain('"scss"');
  });
});

describe("doctor — glob 실매치 검사 (0.9.0)", () => {
  it("globalStyleSources glob — 매치 있으면 ok + 건수", () => {
    const entries = entriesOf(
      makeCfg({ globalStyleSources: ["styles/*.css"] }),
      "globalStyleSources"
    );
    expect(entries[0].severity).toBe("ok");
    expect(entries[0].message).toContain("glob match");
  });

  it("globalStyleSources glob — 매치 0건이면 warn", () => {
    const entries = entriesOf(
      makeCfg({ globalStyleSources: ["nope/**/*.css"] }),
      "globalStyleSources"
    );
    expect(entries[0].severity).toBe("warn");
    expect(entries[0].message).toContain("0건");
  });

  it("officialPaths glob — 매치 0건이면 error (옛 root 가늠으로는 통과되던 케이스)", () => {
    // styles/ 디렉토리는 존재하지만 매치되는 .tsx 는 없음 — 옛 검사 (root 존재) 는 ok 였음.
    const entries = entriesOf(
      makeCfg({ officialPaths: ["styles/**/*.tsx"] }),
      "designSystem.officialPaths"
    );
    expect(entries[0].severity).toBe("error");
    expect(entries[0].message).toContain("0건");
  });
});
