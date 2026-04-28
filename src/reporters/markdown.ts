import fs from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type {
  CodebaseReport,
  UIHealthConfig,
  Threshold,
  FigmaDesignSystemFile,
  TokenMatrix,
  TokenMatrixCell,
} from "../types";

type Status = "good" | "warn" | "bad" | "info";

const BADGE: Record<Status, string> = {
  good: "✅",
  warn: "⚠️",
  bad: "❌",
  info: "ℹ️",
};

function evaluate(value: number, t: Threshold): Status {
  if (t.direction === "higher") {
    if (value >= t.good) return "good";
    if (value >= t.warn) return "warn";
    return "bad";
  }
  if (value <= t.good) return "good";
  if (value <= t.warn) return "warn";
  return "bad";
}

function thresholdHint(t: Threshold, formatter: (n: number) => string): string {
  if (t.direction === "higher") {
    return `good ≥ ${formatter(t.good)}, warn ≥ ${formatter(t.warn)}`;
  }
  return `good ≤ ${formatter(t.good)}, warn ≤ ${formatter(t.warn)}`;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number) => String(n);

/** `reports/` 디렉토리에서 가장 최근 JSON 파일 경로를 찾는다. */
export function findLatestReportJson(reportsDir: string): string | null {
  if (!existsSync(reportsDir)) return null;
  const files = readdirSync(reportsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(reportsDir, f));
  if (files.length === 0) return null;
  // 파일명 기준 내림차순 (baseline-YYYY-MM-DD.json 포맷 가정)
  files.sort((a, b) => (a < b ? 1 : -1));
  return files[0];
}

export async function generateMarkdown(
  report: CodebaseReport,
  cfg: UIHealthConfig & { __absRoot?: string },
  opts: { inputPath: string; outputPath: string }
): Promise<void> {
  const th = cfg.thresholds;
  const m = cfg.metrics;

  type Row = {
    label: string;
    value: string;
    status: Status;
    hint: string;
    enabled: boolean;
    /** 참고 지표 — 강점/개선 분류에서 제외. 뱃지는 ℹ️ 로 표시. */
    informational?: boolean;
  };

  const dist = report.stylingMethodDistribution;

  const rows: Row[] = [
    {
      label: "Forbidden file ratio",
      enabled: m.stylingDistribution,
      value: `${pct(dist.forbiddenFileRatio)}  (${dist.forbiddenFileCount}/${dist.totalFiles})`,
      status: evaluate(dist.forbiddenFileRatio, th.forbiddenFileRatio),
      hint: thresholdHint(th.forbiddenFileRatio, pct),
    },
    {
      label: "Forbidden class 발생",
      enabled: m.stylingDistribution,
      value: num(report.forbiddenClassCount.total),
      status: evaluate(
        report.forbiddenClassCount.total,
        th.forbiddenClassOccurrences
      ),
      hint: thresholdHint(th.forbiddenClassOccurrences, num),
    },
    {
      label: "DS Coverage",
      enabled: m.dsCoverage,
      value: pct(report.dsCoverage.coverage),
      status: evaluate(report.dsCoverage.coverage, th.dsCoverage),
      hint: thresholdHint(th.dsCoverage, pct),
    },
    {
      label: "TS Migration",
      enabled: m.tsMigration,
      value: pct(report.tsMigration.ratio),
      status: evaluate(report.tsMigration.ratio, th.tsMigration),
      hint: thresholdHint(th.tsMigration, pct),
    },
    {
      label: "SCSS 변수 준수율",
      enabled: m.scssVariableCompliance,
      value: pct(report.scssVariableCompliance.compliance),
      status: evaluate(
        report.scssVariableCompliance.compliance,
        th.scssVariableCompliance
      ),
      hint: thresholdHint(th.scssVariableCompliance, pct),
    },
    {
      label: "하드코딩 색상",
      enabled: m.hardcodedColors,
      value: num(report.hardcodedColors.total),
      status: evaluate(report.hardcodedColors.total, th.hardcodedColors),
      hint: thresholdHint(th.hardcodedColors, num),
    },
    {
      label: `명시적 ${dist.preferredId} 신호 비율 (참고)`,
      enabled: m.stylingDistribution,
      value: pct(dist.preferredCompliance.value),
      status: "info" as const,
      informational: true,
      hint: "참고 지표 — 글로벌 스타일 구조 프로젝트는 낮게 나옴. 주 지표는 Forbidden file ratio",
    },
  ].filter((r) => r.enabled);

  // informational은 강점/개선 분류에서 제외
  const strengths = rows.filter((r) => !r.informational && r.status === "good");
  const improvements = rows.filter((r) => !r.informational && r.status === "bad");

  const lines: string[] = [];
  lines.push(`# VitaUI Report`);
  lines.push("");

  // Phase 배지 (config.reportStatus 있을 때만)
  const status = cfg.reportStatus;
  if (status) {
    const completed = status.completedPhases ?? [];
    const current = status.currentPhase;
    const upcoming = status.upcomingPhases ?? [];
    if (completed.length > 0) {
      for (const p of completed) {
        lines.push(`> ✅ **${p.name} 완료** (${p.completedAt})${p.note ? ` — ${p.note}` : ""}`);
      }
    }
    if (current) {
      const startedSuffix = current.startedAt ? ` (시작: ${current.startedAt})` : "";
      lines.push(`> 🚧 **${current.name} 진행${startedSuffix}**${current.note ? ` — ${current.note}` : ""}`);
    }
    for (const p of upcoming) {
      lines.push(`> 🗓️ **${p.name} 예정**${p.note ? ` — ${p.note}` : ""}`);
    }
    if (completed.length > 0 || current || upcoming.length > 0) lines.push("");
  }

  lines.push(`- **Generated**: ${report.generatedAt}`);
  lines.push(`- **Source JSON**: \`${cfg.__absRoot ? path.relative(cfg.__absRoot, opts.inputPath) : opts.inputPath}\``);
  lines.push(`- **Project root**: \`${report.projectRoot}\``);
  lines.push("");

  // 프로젝트 규모
  lines.push(`## 프로젝트 규모`);
  lines.push("");
  lines.push(`| 분류 | 파일 수 |`);
  lines.push(`|---|---:|`);
  lines.push(`| 코드 파일 | ${report.totals.codeFiles} |`);
  lines.push(`| 스타일 파일 | ${report.totals.styleFiles} |`);
  lines.push(`| DS 컴포넌트 | ${report.totals.dsComponentFiles} |`);
  lines.push(`| Non-DS 컴포넌트 | ${report.totals.nonDsComponentFiles} |`);
  if (m.tsMigration) {
    lines.push(`| TypeScript | ${report.tsMigration.tsFiles} |`);
    lines.push(`| JavaScript | ${report.tsMigration.jsFiles} |`);
  }
  lines.push("");

  // 핵심 지표 테이블
  lines.push(`## 핵심 지표`);
  lines.push("");
  lines.push(`| 지표 | 값 | 상태 | 임계값 |`);
  lines.push(`|---|---:|:---:|---|`);
  for (const r of rows) {
    lines.push(`| ${r.label} | ${r.value} | ${BADGE[r.status]} | ${r.hint} |`);
  }
  lines.push("");

  // 참고 지표(informational) 설명
  const infoRows = rows.filter((r) => r.informational);
  if (infoRows.length > 0) {
    lines.push(`> ℹ️ **참고 지표**: 강점/개선 분류에서 제외됨. 프로젝트 구조(예: 글로벌 SCSS import, 컴포넌트별 CSS Modules)에 따라 수치가 왜곡될 수 있어 절대값 해석보다 **시계열 추이**로 참고.`);
    lines.push("");
  }

  if (strengths.length > 0) {
    lines.push(`### 💪 강점`);
    for (const r of strengths) {
      lines.push(`- **${r.label}** ${r.value} — ${r.hint}`);
    }
    lines.push("");
  }
  if (improvements.length > 0) {
    lines.push(`### 🎯 개선 필요`);
    for (const r of improvements) {
      lines.push(`- **${r.label}** ${r.value} — 목표: ${r.hint}`);
    }
    lines.push("");
  }

  // 스타일링 분포
  if (m.stylingDistribution) {
    const d = report.stylingMethodDistribution;
    lines.push(`## 스타일링 방식 분포`);
    lines.push("");
    lines.push(`> 파일이 여러 방식을 동시에 쓰면 각각 카운트됨 (non-exclusive).`);
    lines.push("");
    lines.push(`| 분류 | ID | 파일 수 |`);
    lines.push(`|---|---|---:|`);
    for (const [id, n] of Object.entries(d.allowed)) {
      const mark = id === d.preferredId ? "✅ preferred" : "✅ 허용";
      lines.push(`| ${mark} | ${id} | ${n} |`);
    }
    for (const [id, n] of Object.entries(d.forbidden)) {
      lines.push(`| ❌ 금지 | ${id} | ${n} |`);
    }
    lines.push(`| ⚪ 글로벌 재사용 | allowedGlobal | ${d.allowedGlobal} |`);
    lines.push(`| ⚠️ orphan class | orphanClass | ${d.orphanClass} |`);
    lines.push(`| ⚪ className 없음 | noClass | ${d.noClass} |`);
    lines.push("");

    if (d.orphanSamples.length > 0) {
      lines.push(`### Orphan Class Top 20`);
      lines.push("");
      lines.push(
        `> 글로벌 스타일(\`styles/css/scss/\`)에도 어디에도 정의되지 않은 클래스 이름. ` +
          `정리 대상 부채. 사용 파일은 최대 5개까지 표시.`
      );
      lines.push("");
      lines.push(`| 클래스 | 등장 횟수 | 사용 파일 |`);
      lines.push(`|---|---:|---|`);
      for (const s of d.orphanSamples) {
        const filesCell = s.sampleFiles
          .map((f) => `\`${f}\``)
          .join("<br>");
        lines.push(`| \`${s.className}\` | ${s.occurrences} | ${filesCell} |`);
      }
      lines.push("");
    }

    if (report.forbiddenClassCount.total > 0) {
      lines.push(`### 금지 클래스 발생 상위 파일`);
      lines.push("");
      lines.push(`| 파일 | 총 | 세부 |`);
      lines.push(`|---|---:|---|`);
      for (const f of report.forbiddenClassCount.topFiles.slice(0, 10)) {
        const detail = Object.entries(f.byId)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        lines.push(`| \`${f.file}\` | ${f.total} | ${detail} |`);
      }
      lines.push("");
    }
  }

  // Migration candidates
  if (m.migrationCandidates) {
    const mc = report.migrationCandidates;
    lines.push(`## Migration Candidates (DS로 교체 가능한 native 요소)`);
    lines.push("");
    lines.push(
      `전체 **${mc.totalOccurrences}건** / **${mc.totalFilesAffected} 파일**`
    );
    lines.push("");
    if (Object.keys(mc.byTarget).length > 0) {
      lines.push(`### 대상별 분포`);
      lines.push("");
      lines.push(`| DS 대상 | 건수 |`);
      lines.push(`|---|---:|`);
      for (const [target, count] of Object.entries(mc.byTarget).sort(
        (a, b) => b[1] - a[1]
      )) {
        lines.push(`| ${target} | ${count} |`);
      }
      lines.push("");
    }
    if (mc.topFiles.length > 0) {
      lines.push(`### Top 10 파일 (교체 우선순위)`);
      lines.push("");
      lines.push(`| 파일 | 건수 | 대상 |`);
      lines.push(`|---|---:|---|`);
      for (const f of mc.topFiles.slice(0, 10)) {
        lines.push(`| \`${f.file}\` | ${f.occurrences} | ${f.targets.join(", ")} |`);
      }
      lines.push("");
    }
    if (mc.samples.length > 0) {
      lines.push(`### 샘플 (실제 JSX 사용 예)`);
      lines.push("");
      lines.push(`| 파일:라인 | native | className | → DS |`);
      lines.push(`|---|---|---|---|`);
      for (const s of mc.samples.slice(0, 10)) {
        lines.push(
          `| \`${s.file}:${s.line}\` | \`<${s.nativeTag}>\` | \`${s.classSample}\` | ${s.suggestedDs} |`
        );
      }
      lines.push("");
    }
  }

  // DS Coverage detail
  if (m.dsCoverage && report.dsCoverage.topDsImports.length > 0) {
    lines.push(`## DS 컴포넌트 사용 빈도 (상위 20)`);
    lines.push("");
    lines.push(`| Import source | 참조 파일 수 |`);
    lines.push(`|---|---:|`);
    for (const { source, count } of report.dsCoverage.topDsImports) {
      lines.push(`| \`${source}\` | ${count} |`);
    }
    lines.push("");
  }

  // Hardcoded colors detail
  if (m.hardcodedColors && report.hardcodedColors.byFile.length > 0) {
    lines.push(`## 하드코딩 색상 Top 파일`);
    lines.push("");
    lines.push(`| 파일 | 건수 | 샘플 |`);
    lines.push(`|---|---:|---|`);
    for (const f of report.hardcodedColors.byFile.slice(0, 10)) {
      lines.push(
        `| \`${f.file}\` | ${f.count} | ${f.samples.slice(0, 3).map((s) => `\`${s}\``).join(", ")} |`
      );
    }
    lines.push("");
  }

  // Figma baseline (Phase 0.5)
  if (m.figmaAnalysis && report.figma) {
    appendFigmaSection(
      lines,
      report.figma,
      cfg.figma?.designSystemFiles ?? []
    );
  }

  // 측정 도구 개선 이력
  if (cfg.measurementHistory && cfg.measurementHistory.length > 0) {
    lines.push(`## 측정 도구 개선 이력`);
    lines.push("");
    lines.push(
      `> 분석 로직이 바뀌면 과거 수치와 현재 수치를 **그대로 비교하면 안 된다**. ` +
        `이 섹션은 방법론 변경 시점을 기록해, 시계열을 해석할 때의 맥락을 제공한다.`
    );
    lines.push("");
    lines.push(`| 버전 | 날짜 | 요약 |`);
    lines.push(`|---|---|---|`);
    for (const h of cfg.measurementHistory) {
      lines.push(`| ${h.version} | ${h.date} | ${h.summary} |`);
    }
    lines.push("");
    for (const h of cfg.measurementHistory) {
      lines.push(`### ${h.version} — ${h.date}`);
      lines.push("");
      lines.push(`**${h.summary}**`);
      lines.push("");
      for (const n of h.notes) {
        lines.push(`- ${n}`);
      }
      lines.push("");
    }
  }

  lines.push(`---`);
  lines.push(
    `*자동 생성 — 수동 편집 금지. 갱신: \`npm run ui-health:report\`. 기획서: \`vitaui/docs/planning.md\`.*`
  );
  lines.push("");

  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await fs.writeFile(opts.outputPath, lines.join("\n"), "utf8");
}

// ═══════════════════════════════════════════════════════════════════
// Figma 섹션 렌더링 (Phase 0.5)
// ═══════════════════════════════════════════════════════════════════

function appendFigmaSection(
  lines: string[],
  figma: NonNullable<CodebaseReport["figma"]>,
  dsFiles: FigmaDesignSystemFile[]
): void {
  lines.push(`## Figma 측정 (DS 파일별 카운트 + 출처 미상 Instance 비율)`);
  lines.push("");
  lines.push(
    `> DS 파일별 Styles / Main Components 카운트 + 도메인 파일들의 "출처 미상 Instance" 비율.`
  );
  lines.push(
    `> *출처 미상 Instance* = 도메인 파일 내 INSTANCE 노드 중 componentId 가 등록된 어떤 DS 파일의 components dict 에도 매칭되지 않는 것. ` +
      `(과거 "detach" 표기를 REST API 제약상 더 정확한 용어로 변경 — planning.md §7 2026-04-23 참조)`
  );
  lines.push("");

  // ─── DS 파일별 카운트 ───
  lines.push(`### DS 파일별 카운트`);
  lines.push("");
  if (figma.designSystemCounts.length === 0) {
    lines.push(`> DS 파일 측정 결과가 없습니다.`);
    lines.push("");
  } else {
    lines.push(`| DS 파일 | Styles | Main Components | Variant 그룹 | Variables |`);
    lines.push(`|---|---:|---:|---:|---:|`);
    for (const c of figma.designSystemCounts) {
      const vars = c.variables === null ? "—" : String(c.variables);
      lines.push(
        `| ${formatDsLabel(c.label, dsFiles)} | ${c.styles} | ${c.components} | ${c.variantGroups} | ${vars} |`
      );
    }
    lines.push("");
    const anyStyleBreak = figma.designSystemCounts.some(
      (c) => Object.keys(c.stylesByType).length > 0
    );
    if (anyStyleBreak) {
      lines.push(`*Styles 세부 (styleType 별):*`);
      for (const c of figma.designSystemCounts) {
        const parts = Object.entries(c.stylesByType)
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => `${t}=${n}`)
          .join(", ");
        lines.push(`- **${formatDsLabel(c.label, dsFiles)}**: ${parts || "-"}`);
      }
      lines.push("");
    }
    lines.push(
      `> *Variables* 열은 Phase B 이월 — 현재 토큰 scope 가 \`file_variables:read\` 를 포함하지 않아 측정 불가.`
    );
    lines.push("");
  }

  // ─── 토큰 매칭 매트릭스 (단계 3, 2026-04-24) ───
  // DS 정의(위) 와 도메인 사용(아래) 사이에 배치 — 코드 매칭은 둘 사이의 다리 역할.
  if (figma.tokenMatrix) {
    appendTokenMatrixSection(lines, figma.tokenMatrix, dsFiles);
  }

  // ─── 도메인 파일 출처 미상 Instance 분석 ───
  const ia = figma.instanceAnalysis;
  lines.push(`### 도메인 파일 — 출처 미상 Instance 분석`);
  lines.push("");
  lines.push(`- 전체 INSTANCE 수: **${ia.totalInstances}**`);
  lines.push(`- 출처 미상 INSTANCE 수: **${ia.unmatchedInstances}**`);
  lines.push(
    `- **출처 미상 비율: ${(ia.unmatchedRatio * 100).toFixed(1)}%**`
  );
  lines.push("");

  // 정상 instance 출처 분포 — config 에 등록된 DS label 만 키로 등장.
  // 2026-04-24 (단계 5) 동적 구조로 전환: 이전 dsNew/dsLegacy/unknown 고정 3행
  // 테이블에서 dsFiles 순회 기반으로 변경. unknown 행은 영구 0 이라 제거.
  const src = figma.instanceSources;
  const sumKnown = Object.values(src).reduce((s, n) => s + n, 0);
  const pctKnown = (n: number) =>
    sumKnown === 0 ? "0.0%" : `${((n / sumKnown) * 100).toFixed(1)}%`;

  lines.push(`#### 정상 Instance 출처 분포`);
  lines.push("");
  lines.push(`| 출처 | 개수 | 비율 |`);
  lines.push(`|---|---:|---:|`);
  // config.designSystemFiles 순서대로 렌더. comment 있으면 "label (comment)".
  for (const d of dsFiles) {
    const n = src[d.label] ?? 0;
    lines.push(`| ${formatDsLabel(d.label, dsFiles)} | ${n} | ${pctKnown(n)} |`);
  }
  lines.push("");

  // ─── Top N ───
  if (ia.topN.length > 0) {
    lines.push(
      `#### Top ${ia.topN.length} 출처 미상 Instance (마이그레이션 우선순위)`
    );
    lines.push("");
    lines.push(`| 순 | 이름 | 횟수 | 추정 출처 | 샘플 위치 |`);
    lines.push(`|---:|---|---:|---|---|`);
    ia.topN.forEach((t, i) => {
      // sourceLabel 은 현재 항상 null (외주 옛 DS 검토 제외). 향후 값이 들어오면
      // config 의 comment 를 formatDsLabel 로 병기해 다른 DS 레이블과 일관 표시.
      const src = t.sourceLabel
        ? formatDsLabel(t.sourceLabel, dsFiles)
        : "미추정";
      const path = t.samplePath ?? "-";
      lines.push(`| ${i + 1} | \`${t.name}\` | ${t.count} | ${src} | ${path} |`);
    });
    lines.push("");
    lines.push(
      `> 이름 기준 집계. 같은 이름이라도 서로 다른 컴포넌트 인스턴스일 수 있음. ` +
        `"외주 옛 DS 에서 자주 쓰이는 컴포넌트" 후보 목록으로 활용 — 마이그레이션 시 우선순위 참고.`
    );
    lines.push("");
  }

  // ─── 에러/경고 ───
  if (figma.errors.length > 0) {
    lines.push(`### ⚠️ 측정 중 발생한 경고/에러`);
    lines.push("");
    for (const e of figma.errors) {
      lines.push(`- ${e}`);
    }
    lines.push("");
  }
}

// ═══════════════════════════════════════════════════════════════════
// 토큰 매칭 매트릭스 렌더링 (단계 3, 2026-04-24)
// ═══════════════════════════════════════════════════════════════════

/**
 * DS ↔ 코드 토큰 매칭 매트릭스 섹션.
 *
 * 구성: 요약 (4~5줄 불릿) → 매트릭스 표 (<details> 로 기본 접힘) →
 * 중복 목록 (duplicates 가 있을 때만).
 *
 * rows 가 비면 표 안에 "데이터 없음" 을 출력 (섹션 자체는 유지).
 * duplicates 가 비면 "중복 (정리 권장)" 하위 섹션 전체 생략.
 */
function appendTokenMatrixSection(
  lines: string[],
  tm: TokenMatrix,
  dsFiles: FigmaDesignSystemFile[]
): void {
  const labelWithComment = (label: string): string =>
    formatDsLabel(label, dsFiles);

  lines.push(`### 토큰 매칭 매트릭스`);
  lines.push("");
  lines.push(
    `> 코드 SCSS 변수와 Figma DS Styles / Variables 의 **이름 완전 일치 매칭** 결과. ` +
      `정규화 / 값 기반 / 수동 매핑 없음. 동명 중복은 cell 에 \`×N\` 으로 표시.`
  );
  lines.push("");

  // ─── 요약 ───
  lines.push(`#### 요약`);
  lines.push("");
  lines.push(`- 총 고유 토큰: **${tm.summary.totalUniqueTokens}**개`);
  lines.push(`- 코드 변수: **${tm.summary.codeCount}**개`);
  for (const label of tm.designSystems) {
    const s = tm.summary.dsStats[label];
    if (!s) continue;
    const parts: string[] = [`코드 매칭 ${s.matchedWithCode}`];
    if (s.duplicateCount > 0) parts.push(`중복 ${s.duplicateCount}건`);
    lines.push(
      `- ${labelWithComment(label)}: ${s.total}개 (${parts.join(", ")})`
    );
  }
  lines.push("");

  // ─── 매트릭스 (접기) ───
  lines.push(`<details>`);
  lines.push(`<summary>전체 토큰 매트릭스 (${tm.rows.length}행) 보기</summary>`);
  lines.push("");
  const headerCells = [
    "토큰 이름",
    "코드",
    ...tm.designSystems.map(labelWithComment),
  ];
  lines.push(`| ${headerCells.join(" | ")} |`);
  lines.push(`| ${headerCells.map(() => "---").join(" | ")} |`);

  if (tm.rows.length === 0) {
    const pad = Array(1 + tm.designSystems.length).fill("-");
    lines.push(`| 데이터 없음 | ${pad.join(" | ")} |`);
  } else {
    for (const row of tm.rows) {
      const cells = [
        `\`${row.name}\``,
        renderMatrixCell(row.inCode),
        ...tm.designSystems.map((ds) =>
          renderMatrixCell(row.inDs[ds] ?? { exists: false, count: 0 })
        ),
      ];
      lines.push(`| ${cells.join(" | ")} |`);
    }
  }
  lines.push("");
  lines.push(`</details>`);
  lines.push("");

  // ─── 중복 (정리 권장) ───
  if (tm.duplicates.length > 0) {
    lines.push(`#### 중복 (정리 권장)`);
    lines.push("");
    lines.push(`다음 토큰이 같은 DS 내에 중복 등록되어 있습니다. 정리 권장:`);
    lines.push("");
    for (const d of tm.duplicates) {
      lines.push(
        `- ${labelWithComment(d.designSystem)}: \`${d.name}\` (${d.count}회)`
      );
    }
    lines.push("");
  }
}

/**
 * 매트릭스 한 셀 렌더링.
 *   exists=false       → "—" (em dash)
 *   exists=true, n=1   → "✅"
 *   exists=true, n≥2   → "✅ ×N"
 */
function renderMatrixCell(cell: TokenMatrixCell): string {
  if (!cell.exists) return "—";
  if (cell.count <= 1) return "✅";
  return `✅ ×${cell.count}`;
}

/**
 * DS 레이블 표시 포맷터 (공용). comment 있으면 "label (comment)", 없으면 "label".
 *
 * 토큰 매트릭스 섹션과 출처 분포 섹션이 동일 규칙으로 쓰도록 통합.
 * config 에 등록 안 된 label (fallback) 은 그대로 반환.
 */
function formatDsLabel(
  label: string,
  dsFiles: FigmaDesignSystemFile[]
): string {
  const entry = dsFiles.find((d) => d.label === label);
  return entry?.comment ? `${label} (${entry.comment})` : label;
}
