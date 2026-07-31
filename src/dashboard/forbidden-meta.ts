/**
 * FORBIDDEN 라벨 + preset 매트릭스 — 단일 원천 (0.8.10).
 *
 * 옛 흐름: 같은 정의가 `baseline-to-summary-data.ts` (TS) 와 `code-tab.jsx`
 * (babel-inline — ESM import 불가) 두 곳에 복제되어, 한쪽만 갱신하면 summary 탭과
 * code 탭 표시가 어긋나는 부류의 버그 (0.8.3~0.8.6 반복 정정) 가 재발할 수 있었음.
 * 0.8.10 부터 본 모듈이 유일한 정의 — TS 는 import, jsx 는 shell.ts 가 inject 하는
 * `window.__FORBIDDEN_META` 로 소비.
 *
 * `scss-imports` — 0.10.0 부터 측정·등재. 옛 흐름 (0.8.8~0.9.1) 은 감지 규칙이
 * 비어 있어 의도적으로 미등재였음. 현재는 매트릭스 연계 검출 (scssImportLink.ts —
 * import 된 SCSS 의 클래스 분류가 금지 분류를 포함할 때만 레거시로 카운트).
 */

export interface ForbiddenPresetSpec {
  id: string;
  /** dashboard tooltip 용 부가 설명 (선택). */
  title?: string;
}

/** preset forbidden id (영문) → 화면 표시 라벨. */
export const FORBIDDEN_LABELS: Record<string, string> = {
  "bootstrap-utilities":   "Bootstrap utility",
  "tailwind-classes":      "Tailwind utility",
  "apply-mixed":           "@apply-mixed",
  "tailwind-via-wrapper":  "Tailwind via wrapper",
  "raw-css":               "raw CSS",
  "inline-styles":         "inline styles",
  "global-css":            "global CSS imports",
  "scss-imports":          "SCSS imports",
};

/**
 * preset 별 의미 있는 forbidden sub-key 매트릭스 (0.8.3 도입 정의 그대로).
 * 카운트 0 row 도 노출 (preset 정의 존중). 알 수 없는 preset = row 0.
 * preset 추가 시점에 본 매핑 갱신 필요.
 */
export const FORBIDDEN_BY_PRESET: Record<string, ForbiddenPresetSpec[]> = {
  scss: [
    { id: "bootstrap-utilities" },
    { id: "tailwind-classes" },
    { id: "apply-mixed",          title: "@apply 유입 + raw CSS 혼합 — tailwind 의존 끌어옴" },
    { id: "tailwind-via-wrapper", title: "pure-@apply wrapper class — tailwind 의존" },
  ],
  tailwind: [
    { id: "bootstrap-utilities" },
    { id: "apply-mixed",          title: "@apply + raw CSS 혼합 — utility-first 위반" },
    { id: "raw-css",              title: "pure-css 클래스 — utility-first 위반" },
    // 0.10.0 — 매트릭스 연계 측정 시작과 함께 등재.
    { id: "scss-imports",         title: "레거시 SCSS import — 내용에 금지 분류 (raw CSS·혼합) 클래스를 담은 SCSS 를 불러옴" },
  ],
  bootstrap: [
    { id: "tailwind-classes" },
    { id: "inline-styles" },
  ],
  "css-modules": [
    { id: "bootstrap-utilities" },
    { id: "tailwind-classes" },
    { id: "global-css" },
  ],
};

/** shell.ts 가 `window.__FORBIDDEN_META` 로 inject 하는 payload. */
export function buildForbiddenMeta(): {
  labels: Record<string, string>;
  byPreset: Record<string, ForbiddenPresetSpec[]>;
} {
  return { labels: FORBIDDEN_LABELS, byPreset: FORBIDDEN_BY_PRESET };
}
