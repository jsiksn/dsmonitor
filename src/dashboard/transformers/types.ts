/**
 * Dashboard 탭 데이터 타입 — transformer 출력 = 컴포넌트 (`code-tab.jsx` /
 * `figma-tab.jsx` / `lighthouse-tab.jsx` / `root.jsx`) 가 `window.__*_DATA` 로 읽는 shape.
 *
 * 시안 (Claude Design 핸드오프) 의 `code-tab-data.json` / `lighthouse-data.json` 및
 * 인라인 figma-tab-data / SUMMARY DATA 객체와 1:1 호환.
 */

import type {
  CodebaseReport,
  FigmaComponentMatch,
  FigmaReport,
  PreferredComplianceMeta,
  TokenMatrix,
  TokenMatrixDsStats,
} from "../../types";
import type { DashboardPluginEntry } from "../../plugins/types";

// ═══════════════════════════════════════════════════════════════════
// CodeTabData
// ═══════════════════════════════════════════════════════════════════

export interface CodeTabData {
  totals: CodebaseReport["totals"];
  smd: {
    preferredId: string;
    preferredCompliance: PreferredComplianceMeta;
    forbiddenFileCount: number;
    forbiddenFileRatio: number;
    counts: {
      allowed: Record<string, number>;
      forbidden: Record<string, number>;
      allowedGlobal: number;
      orphanClass: number;
      noClass: number;
    };
    totalFiles: number;
    orphanSamples: CodebaseReport["stylingMethodDistribution"]["orphanSamples"];
  };
  scss: CodebaseReport["scssVariableCompliance"];
  forbidden: CodebaseReport["forbiddenClassCount"];
  hardcoded: { total: number; byFile: CodebaseReport["hardcodedColors"]["byFile"] };
  ts: CodebaseReport["tsMigration"];
  ds: CodebaseReport["dsCoverage"];
  mig: CodebaseReport["migrationCandidates"];
}

// ═══════════════════════════════════════════════════════════════════
// FigmaTabData
// ═══════════════════════════════════════════════════════════════════

export interface FigmaTabData {
  stamp: string;
  measurementScope: {
    domainFiles: number;
    domainNames: string[];
    frames: string[];
  };
  tokenMatrix: TokenMatrix;
  instanceSources: FigmaReport["instanceSources"];
  domainResults: FigmaReport["domainResults"];
  /**
   * 시안 figma-tab.jsx 호환 — baseline 보다 한 단계 flat 화된 형식.
   * `tokenMatrix.summary.dsStats` 그대로.
   */
  dsStats: Record<string, TokenMatrixDsStats>;
  /** 시안 figma-tab.jsx 호환 — `instanceAnalysis.unmatchedInstances` 그대로. */
  unmatchedInstances: number;
  /** 시안 figma-tab.jsx 호환 — `instanceAnalysis.totalInstances` 그대로. */
  totalInstances: number;
  /**
   * 마이그레이션 작업 우선순위 — frame flat 리스트, primary (ds-new) 비중 오름차순 정렬.
   * v0.9 note 17 (2026-04-28): figma-tab MigrationPrioritySection 가 직접 사용.
   */
  frameRanking: FigmaFrameRankingEntry[];
  /** 도메인 단위 합산 — config 순서 보존. */
  domainSummary: FigmaDomainSummaryEntry[];
  /**
   * 컴포넌트 매칭 (B 그룹 단계 3, 2026-04-29).
   * Figma DS 컴포넌트 (variantGroup + standalone) ↔ 코드 className 매칭 결과.
   * baseline.figma.componentMatch 미존재 시 null — figma-tab 가 카드 숨김.
   */
  componentMatch: FigmaComponentMatch | null;
}

/**
 * 한 frame 의 마이그레이션 우선순위 entry.
 *
 * 임계 (v0.9 note 17):
 *   primaryRatio ≥ 0.95          → badge="met"           (기준 도달)
 *   0.10 < primaryRatio < 0.95   → badge="below"         (↓ 우선)
 *   primaryRatio ≤ 0.10          → badge="below-strong"  (↓ 가장 우선)
 *
 * primary DS 결정: config.figma.designSystemFiles 중 label="ds-new" 우선,
 * 없으면 첫 designSystemFile. (본 프로젝트는 "ds-new" 가 primary 의도.)
 */
export interface FigmaFrameRankingEntry {
  /** frame comment (예: "Preprocess-Main"). */
  label: string;
  /** "도메인 > 페이지" 경로 (예: "Material > Content"). */
  domainPath: string;
  /** primary DS instance / total (0~1). */
  primaryRatio: number;
  badge: "met" | "below" | "below-strong";
  counts: {
    /** primary DS instance 수 (본 프로젝트 ds-new). */
    dsNew: number;
    /** primary 외 모든 등록 DS 합 (본 프로젝트 ds-legacy). */
    dsLegacy: number;
    /** 미등록 DS 출처 (본 프로젝트 ds-legacy 등 외주 옛 DS — figma analyzer 의 unmatchedInstances). */
    unmatched: number;
  };
  total: number;
}

/** 도메인 단위 합산 entry. */
export interface FigmaDomainSummaryEntry {
  label: string;
  primaryRatio: number;
  counts: { dsNew: number; dsLegacy: number; unmatched: number };
  total: number;
}

// ═══════════════════════════════════════════════════════════════════
// LighthouseTabData
// ═══════════════════════════════════════════════════════════════════

export interface LighthouseTabUrl {
  url: string;
  path: string;
  perf: number;
  a11y: number;
  bp: number;
  seo: number;
}

export interface LighthouseCwvEntry {
  /** path-only URL (예: "/ecosystem/report/management"). */
  url: string;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  si: number;
  tti: number;
}

export interface LighthouseTabData {
  measuredAt: string;
  baseUrl: string;
  testAccount: string | null;
  zoneAccountLabel: string | null;
  numberOfRuns: number;
  totalUrls: number;
  urls: LighthouseTabUrl[];
  averages: { perf: number; a11y: number; bp: number; seo: number };
  /**
   * v0.9 note 13 (2026-04-28): 시안 시점엔 1 URL 만 수집되어 단일 객체였으나, 본 환경엔
   * 모든 URL 의 LHR raw 가 vitaui/lighthouse/reports/{date}/ 에 있어 배열로 변경.
   * 매칭 실패한 URL 은 entry 에서 누락 (배열 길이 ≤ totalUrls).
   * 빈 배열이면 lighthouse-tab CwvSection 이 빈 상태 표시.
   */
  cwvSample: LighthouseCwvEntry[];
}

// ═══════════════════════════════════════════════════════════════════
// SummaryTabData (root JSX 의 const DATA — Summary 탭 압축 데이터)
// ═══════════════════════════════════════════════════════════════════

export interface SummaryTabData {
  stamp: { code: string; figma: string; lighthouse: string };
  code: {
    scssCompliance: number;
    scssVariableUsages: number;
    scssHardcoded: number;
    forbiddenTotal: number;
    forbiddenBootstrap: number;
    forbiddenTailwind: number;
    tsRatio: number;
    tsFiles: number;
    jsFiles: number;
    dsCoverage: number;
    dsFilesUsing: number;
    dsTotalConsumer: number;
    migrationCandidateFiles: number;
    migrationCandidateOccurrences: number;
  };
  lh: {
    urls: number;
    runs: number;
    avgPerf: number;
    avgA11y: number;
    avgBP: number;
    avgSeo: number;
    worst: { url: string; a11y: number };
    target: {
      url: string;
      lcp: string;
      fcp: string;
      cls: number;
      tbt: string;
      si: string;
      tti: string;
    } | null;
    /** [path, perf, a11y, bp, seo] + 선택적 6번째 boolean (target 표시) */
    urlTable: Array<[string, number, number, number, number] | [string, number, number, number, number, boolean]>;
  } | null;
  /**
   * v0.12 (2026-04-29, Phase 0.6): figmaAnalysis=false 인 프로젝트 호환 위해 null 가능.
   * baseline.figma 미존재 시 transformer 가 null 출력. root.jsx 가 가드로 Layer 03 hide.
   */
  figma: {
    dsNewTotal: number;
    dsNewMatched: number;
    dsLegacyTotal: number;
    dsLegacyMatched: number;
    tokenRowsTotal: number;
    unmatchedInstances: number;
    totalInstances: number;
    instanceSources: Record<string, number>;
    warningsCount: number;
  } | null;
}

// ═══════════════════════════════════════════════════════════════════
// 통합
// ═══════════════════════════════════════════════════════════════════

export interface DashboardData {
  summary: SummaryTabData;
  code: CodeTabData;
  figma: FigmaTabData | null;
  lighthouse: LighthouseTabData | null;
  /**
   * 사이드카 plugin 영역 entry 배열 (v0.15, 2026-04-30).
   * vitaui/reports/plugins/{id}/{date}.json 영역 자동 검색 — id 알파벳 순 정렬.
   * 검증 실패 영역도 entry 영역 (ok: false) 으로 보존 — dashboard 안 빨간 알림 영역.
   */
  plugins: DashboardPluginEntry[];
}

/**
 * Lighthouse summary.json shape — `vitaui/lighthouse/reports/{date}/summary.json` 출력.
 * 입력 source.
 */
export interface LighthouseSummaryFile {
  runAt: string;
  baseUrl: string;
  testAccount: string | null;
  zoneAccountLabel: string | null;
  numberOfRuns: number;
  totalUrls: number;
  scoresByUrl: Record<
    string,
    {
      performance: number | null;
      accessibility: number | null;
      "best-practices": number | null;
      seo: number | null;
    }
  >;
}
