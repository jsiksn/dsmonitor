/**
 * vitaui plugin 시스템 타입 영역.
 *
 * 자료 형식 약속 — packages/vitaui/docs/plugin-development.md 영역과 정합.
 * 외부 plugin 개발자 측 가이드와 인터페이스 동일.
 */

export interface VitaUIPluginOutput {
  /** plugin 고유 id (폴더 이름과 일치) */
  id: string;
  /** 대시보드 탭 표시 이름 */
  label: string;
  /** 측정 시점 (ISO 8601 형식) */
  measuredAt: string;
  summary: {
    /** 가장 큰 영역 카드 (1개 필수) */
    primary: SummaryCard;
    /** 보조 카드 (배열 순서) */
    secondary?: SummaryCard[];
  };
  /** Plugin 탭의 표 영역 자료 (선택) */
  details?: DetailRow[];
  /**
   * 추가 자료 영역 (선택).
   * 0.1.0 영역에서 dashboard 표시 빠짐 — 자료 형식 보존만 (추후 0.2.0 영역에서 추가).
   */
  meta?: Record<string, string | number | boolean>;
}

export interface SummaryCard {
  label: string;
  value: string | number;
  hint?: string;
  status?: PluginStatus;
}

export type PluginStatus = "good" | "warn" | "bad" | "neutral";

export interface DetailRow {
  name: string;
  [key: string]: string | number | boolean;
}

/**
 * dashboard 안 plugin entry — 검증 통과 / 실패 분기.
 * 검증 실패 영역도 탭 표시 — 빨간 알림 + 오류 메시지 (사용자 디버깅 영역).
 */
export type DashboardPluginEntry =
  | {
      ok: true;
      output: VitaUIPluginOutput;
      /** measuredAt 가 7일 이상 지난 시점 영역 */
      stale: boolean;
    }
  | {
      ok: false;
      /** 폴더 이름 (= plugin id 후보) */
      id: string;
      /** 검증 실패 사유 */
      reason: string;
    };
