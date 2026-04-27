/**
 * Styling Policy — 프로젝트별로 "무엇이 정식이고 무엇이 금지인지"를 선언한다.
 *
 * 이식 전략:
 * - 실제 정책 값은 CJS 파일(예: `stylingPolicy.js`)로 작성해서
 *   analyzer(TS)와 ESLint 플러그인(JS) 양쪽에서 동일한 파일을 참조할 수 있게 한다.
 * - 이 파일은 **타입 정의만** 제공한다.
 */

export type DetectSpec = {
  /** import source path에 매치되는 정규식 (예: /\.scss$/i) */
  importPathPatterns?: RegExp[];
  /** import source가 정확히 일치해야 하는 모듈명 (예: 'reactstrap') */
  importModules?: string[];
  /** className 토큰에 매치되는 정규식 */
  classPatterns?: RegExp[];
  /** `style={{...}}` 사용 탐지 */
  inlineStyleJSX?: boolean;
};

export type AllowedMethodSpec = {
  /** 방식 식별자. preferred 참조 키 (예: 'scss', 'tailwind', 'css-modules') */
  id: string;
  label: string;
  detect: DetectSpec;
};

export type ForbiddenPatternSpec = {
  /** 패턴 그룹 식별자 (예: 'bootstrap-utilities') */
  id: string;
  label: string;
  /** 기본 심각도. ESLint 래칫에서 baseline-등록 파일은 warn으로 완화된다. */
  severity: "warn" | "error";
  /** className 토큰에 매치되는 정규식들. */
  classPatterns: RegExp[];
  /** 모듈 import 자체를 금지하려면 여기에 (예: ['react-bootstrap']) */
  importModules?: string[];
};

export type StylingPolicy = {
  /** 허용되는 스타일링 방식 */
  allowed: AllowedMethodSpec[];
  /** 정식으로 권장하는 방식의 id (allowed 중 하나) */
  preferred: string;
  /** 금지/경고할 패턴들 */
  forbidden: ForbiddenPatternSpec[];
};

export type SerializedRegex = { source: string; flags?: string };

export type SerializedForbiddenPattern = {
  id: string;
  label: string;
  severity: "warn" | "error";
  classPatterns: SerializedRegex[];
  importModules?: string[];
};

/** ESLint 룰 옵션 전달 시 RegExp → {source, flags}로 직렬화 (ESLint schema 호환). */
export function serializeForbidden(
  forbidden: ForbiddenPatternSpec[]
): SerializedForbiddenPattern[] {
  return forbidden.map((f) => ({
    id: f.id,
    label: f.label,
    severity: f.severity,
    classPatterns: f.classPatterns.map((r) => ({
      source: r.source,
      flags: r.flags || "",
    })),
    importModules: f.importModules,
  }));
}

/** SerializedRegex | RegExp → RegExp */
export function toRegExp(r: SerializedRegex | RegExp): RegExp {
  if (r instanceof RegExp) return r;
  return new RegExp(r.source, r.flags || "");
}
