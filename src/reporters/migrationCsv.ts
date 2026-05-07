/**
 * 마이그레이션 CSV reporter (Phase 0.7, 2026-04-29).
 *
 * figma-instances-{date}.json (analyzeFigma 의 별도 출력) 을 input → frame 필터링 +
 * ds 필터링 + figmaUrl 자동 조립 → CSV 출력.
 *
 * 핵심: ds-legacy frame 안 instance 의 정확한 위치 (nodeId + Figma URL) 작업 정보.
 * Test-Perform / 다른 frame 마이그레이션 작업 진입 사전 단계.
 *
 * CSV 컬럼:
 *   nodeId, masterName, componentName, instanceName, dsLabel, contextPath, figmaUrl
 *
 * Phase 0.7 후속 (2026-04-30): masterName 컬럼 추가 — variant component 의 master
 * (componentSet.name) 노출. 단독 component (raw 안에서 masterName null) 는
 * CSV 출력 시점에 componentName 강제 주입 — 사용자 인지 핵심 (masterName === componentName
 * 이면 단독 / 다르면 variant). instance JSON 부분은 raw 보존 (null 그대로).
 *
 * figmaUrl 자동 조립: `https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId 콜론 → 하이픈}`
 *
 * 사용 예:
 *   npx dsmonitor export-migration --frame=Test-Perform [--ds=ds-legacy]
 */

import fs from "node:fs/promises";
import path from "node:path";
import type {
  FigmaInstanceEntry,
  FigmaInstancesFile,
  FigmaInstancesDomain,
  FigmaInstancesPage,
  FigmaInstancesFrame,
} from "../types";

export interface MigrationExportOptions {
  /**
   * frame comment 또는 "all".
   *   - "all": 모든 frame 포함 (단일 CSV)
   *   - 그 외: 정확 일치하는 frame.comment 만 (대소문자 구분)
   */
  frame: string;
  /**
   * dsLabel 필터.
   *   - "ds-legacy" (기본): 마이그레이션 작업 대상
   *   - "ds-new" / "unmatched" / 다른 라벨
   *   - "all": 모든 dsLabel 포함
   */
  ds: string;
  /** 출력 파일 경로 (절대). */
  outputPath: string;
}

export interface MigrationExportRow {
  nodeId: string;
  /**
   * variant component 의 master name (componentSet.name).
   * 단독 component 는 raw 에서 null — CSV 출력 시점에 componentName 강제 주입.
   * 매칭 실패 (unmatched) 는 빈 문자열.
   */
  masterName: string;
  componentName: string;
  instanceName: string;
  dsLabel: string;
  contextPath: string;
  figmaUrl: string;
}

/**
 * figma-instances-{date}.json 트리 → CSV row (필터링 적용).
 *
 * frame 매칭은 frame.comment / page.comment (패턴 B) 둘 다 검사 — 사용자 인지 일관
 * (사용자가 frame 이름으로 부르는 단위와 일치).
 */
export function collectMigrationRows(
  instancesFile: FigmaInstancesFile,
  opts: { frame: string; ds: string }
): MigrationExportRow[] {
  const rows: MigrationExportRow[] = [];
  const wantAllFrames = opts.frame === "all";
  const wantAllDs = opts.ds === "all";

  for (const domain of instancesFile.domains) {
    for (const page of domain.pages ?? []) {
      // 패턴 B — page 자체에 instances (frames 없음).
      if (page.instances && (!page.frames || page.frames.length === 0)) {
        if (!wantAllFrames && page.comment !== opts.frame) continue;
        for (const inst of page.instances) {
          if (!wantAllDs && inst.dsLabel !== opts.ds) continue;
          rows.push(buildRow(domain, inst));
        }
        continue;
      }
      // 패턴 C — frames.
      for (const frame of page.frames ?? []) {
        if (!wantAllFrames && frame.comment !== opts.frame) continue;
        for (const inst of frame.instances) {
          if (!wantAllDs && inst.dsLabel !== opts.ds) continue;
          rows.push(buildRow(domain, inst));
        }
      }
    }
  }

  return rows;
}

function buildRow(
  domain: FigmaInstancesDomain,
  inst: FigmaInstanceEntry
): MigrationExportRow {
  // node-id 콜론 → 하이픈 (Figma URL 표기 일관). parseFigmaUrl 의 정규화 역.
  const nodeIdHyphen = inst.nodeId.replace(/:/g, "-");
  const figmaUrl = domain.fileKey
    ? `https://www.figma.com/design/${domain.fileKey}/${domain.fileName ?? ""}?node-id=${nodeIdHyphen}`
    : "";
  // 단독 component 강제 주입 (Phase 0.7 후속, 2026-04-30):
  // masterName 이 raw 에서 null (단독 component) 이면 componentName 주입.
  // 매칭 실패 (unmatched) 케이스는 둘 다 null — 빈 문자열.
  // 사용자 인지 — masterName === componentName 이면 단독, 다르면 variant.
  const masterName = inst.masterName ?? inst.componentName ?? "";
  return {
    nodeId: inst.nodeId,
    masterName,
    componentName: inst.componentName ?? "",
    instanceName: inst.name,
    dsLabel: inst.dsLabel,
    contextPath: inst.contextPath,
    figmaUrl,
  };
}

/**
 * CSV 직렬화 — RFC 4180 준수 (콤마 / 따옴표 / 줄바꿈 처리).
 */
export function rowsToCsv(rows: MigrationExportRow[]): string {
  // Phase 0.7 후속 (2026-04-30): masterName 컬럼 추가 (componentName 직전).
  const headers = [
    "nodeId",
    "masterName",
    "componentName",
    "instanceName",
    "dsLabel",
    "contextPath",
    "figmaUrl",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.nodeId),
        csvEscape(r.masterName),
        csvEscape(r.componentName),
        csvEscape(r.instanceName),
        csvEscape(r.dsLabel),
        csvEscape(r.contextPath),
        csvEscape(r.figmaUrl),
      ].join(",")
    );
  }
  return lines.join("\n") + "\n";
}

function csvEscape(s: string): string {
  if (s == null) return "";
  // 콤마 / 따옴표 / 줄바꿈 케이스 — 따옴표 wrap + 따옴표 escape.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * 메인 entry — figma-instances JSON read + 필터링 + CSV 출력.
 */
export async function exportMigrationCsv(
  instancesPath: string,
  opts: MigrationExportOptions
): Promise<{ outputPath: string; rowCount: number }> {
  const raw = await fs.readFile(instancesPath, "utf8");
  const instancesFile = JSON.parse(raw) as FigmaInstancesFile;

  const rows = collectMigrationRows(instancesFile, {
    frame: opts.frame,
    ds: opts.ds,
  });

  const csv = rowsToCsv(rows);
  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await fs.writeFile(opts.outputPath, csv, "utf8");

  return { outputPath: opts.outputPath, rowCount: rows.length };
}
