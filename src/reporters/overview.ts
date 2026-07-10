import fs from "node:fs/promises";
import path from "node:path";
import type { CodebaseReport, UIHealthConfig } from "../types";

/**
 * 비개발자용 overview 문서 생성.
 * 템플릿 파일의 {{placeholder}}를 Report/Config의 값으로 치환한다.
 *
 * 템플릿이 없으면 조용히 skip — 선택적 기능.
 */
export async function generateOverview(
  report: CodebaseReport,
  cfg: UIHealthConfig,
  opts: { templatePath: string; outputPath: string }
): Promise<boolean> {
  let tpl: string;
  try {
    tpl = await fs.readFile(opts.templatePath, "utf8");
  } catch {
    return false;
  }
  const values = buildValues(report, cfg);
  const missing = new Set<string>();
  // 0.8.9 — 키 문자에 hyphen 허용: forbidden id (`bootstrap-utilities` 등) 를
  //   `{{forbiddenById.<id>}}` 로 참조 가능해야 함. 옛 regex ([\w.]+) 는 hyphen
  //   포함 placeholder 를 매치하지 못해 경고 없이 원문 그대로 남았음.
  const rendered = tpl.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key]);
    }
    missing.add(key);
    return `{{${key}?}}`;
  });

  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await fs.writeFile(opts.outputPath, rendered, "utf8");

  if (missing.size > 0) {
    console.warn(
      `[overview] unknown placeholders: ${Array.from(missing).join(", ")}`
    );
  }
  return true;
}

function pct(n: number, digits = 1): string {
  return (n * 100).toFixed(digits) + "%";
}

/**
 * 0.8.9 — 이름 자유 값 placeholder 전개.
 *
 * `{{migrationByTarget.Checkbox}}` 처럼 "prefix.이름" 형태의 placeholder 를
 * 지원하기 위해 record 를 dot 키로 펼친다 (치환 regex 가 dot 포함 키 허용).
 * 사용자 문장 양식은 그대로 두고 숫자만 끼우는 방식 — config 에 등록한
 * 어떤 이름이든 쓸 수 있다.
 */
function expandDotKeys(
  prefix: string,
  record: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, count] of Object.entries(record)) {
    out[`${prefix}.${name}`] = count;
  }
  return out;
}

/**
 * 0.8.9 — 전체 나열용 목록 블록 placeholder 값.
 *
 * 카운트 내림차순 "- 이름 N건" 줄 목록. 이름을 하나하나 쓰지 않고 전부
 * 나열하고 싶을 때 사용 (`{{migrationByTargetList}}` / `{{forbiddenByIdList}}`).
 * 형식을 dsmonitor 가 정하므로 값 빈칸과 같은 데이터에 혼용하지 않기를 권장.
 */
function formatCountList(
  record: Record<string, number>,
  unit: string
): string {
  const entries = Object.entries(record).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "- (등록된 항목 없음)";
  return entries.map(([name, count]) => `- ${name} ${count}${unit}`).join("\n");
}

function buildValues(
  r: CodebaseReport,
  c: UIHealthConfig
): Record<string, string | number> {
  const d = r.stylingMethodDistribution;
  const fb = r.forbiddenClassCount;
  const mc = r.migrationCandidates;
  const completed = c.reportStatus?.completedPhases ?? [];
  const last = completed[completed.length - 1];
  const curr = c.reportStatus?.currentPhase;
  const upcoming = c.reportStatus?.upcomingPhases ?? [];
  const nextUpcoming = upcoming[0];

  return {
    // 타이밍
    generatedAt: r.generatedAt,
    generatedDate: r.generatedAt.slice(0, 10),

    // 규모
    codeFiles: r.totals.codeFiles,
    styleFiles: r.totals.styleFiles,
    tsFiles: r.totals.tsFiles,
    jsFiles: r.totals.jsFiles,
    dsComponentFiles: r.totals.dsComponentFiles,
    nonDsComponentFiles: r.totals.nonDsComponentFiles,
    totalUIComponentFiles:
      r.totals.dsComponentFiles + r.totals.nonDsComponentFiles,

    // TS
    tsRatioPct: pct(r.tsMigration.ratio),

    // DS
    dsCoveragePct: pct(r.dsCoverage.coverage),

    // Forbidden
    forbiddenFileCount: d.forbiddenFileCount,
    totalFiles: d.totalFiles,
    forbiddenFileRatioPct: pct(d.forbiddenFileRatio),
    forbiddenClassTotal: fb.total,
    // 0.8.9 — 옛 고정 키 (bootstrapClassCount / tailwindClassCount) 제거.
    //   원 측정 프로젝트 설정이 코드에 박힌 잔재 — preset 따라 의미 없는 0 이 나옴.
    //   대체: `{{forbiddenById.<id>}}` 동적 전개 (아래) — config preset 의 어떤 id 든 사용 가능.
    ...expandDotKeys("forbiddenById", fb.byId),
    forbiddenByIdList: formatCountList(fb.byId, "건"),

    // Hardcoded
    hardcodedColors: r.hardcodedColors.total,

    // Variable compliance (지표 이름은 baseline 필드명 유지 — scssVariableCompliance)
    scssVariableCompliancePct: pct(r.scssVariableCompliance.compliance),

    // Migration candidates
    migrationTotal: mc.totalOccurrences,
    migrationFilesAffected: mc.totalFilesAffected,
    // 0.8.9 — 옛 고정 키 4개 (migrationInput/Select/Button/TableCount) 제거.
    //   검수 대상 이름은 사용자 config (migrationTargets) 가 정하므로 특정 이름을
    //   코드에 고정할 근거 없음 (다른 프로젝트에선 항상 0 이던 잔재).
    //   대체: `{{migrationByTarget.<이름>}}` — 등록한 이름이 곧 placeholder 이름.
    //   옛 키를 쓰는 템플릿은 unknown placeholder 흐름 ({{key?}} + warning) 으로 진단됨.
    ...expandDotKeys("migrationByTarget", mc.byTarget),
    migrationByTargetList: formatCountList(mc.byTarget, "건"),

    // Phase
    currentPhaseName: curr?.name ?? "—",
    currentPhaseStartedAt: curr?.startedAt ?? "—",
    currentPhaseNote: curr?.note ?? "",
    lastCompletedPhaseName: last?.name ?? "—",
    lastCompletedPhaseAt: last?.completedAt ?? "—",
    lastCompletedPhaseNote: last?.note ?? "",
    nextUpcomingPhaseName: nextUpcoming?.name ?? "—",
    nextUpcomingPhaseNote: nextUpcoming?.note ?? "",
  };
}
