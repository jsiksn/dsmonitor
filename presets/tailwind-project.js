"use strict";

/**
 * tailwind-project preset — Tailwind 가 정식, SCSS / Bootstrap 이 레거시인 프로젝트.
 *
 * 활용: dsmonitor.config.ts 안 `stylingPolicy` 자리에 본 preset 을 import 후 적용.
 *
 * 0.8.1 — utility detect 정규식을 `_tailwind-detect.js` 공통 helper 로 통일.
 * 옛 0.8.0 까지 좁은 union 정규식 (예: `(?:m|p)-\d+`) 이었던 흐름이 `mr-auto` /
 * `space-y-6` / `text-xs` / `font-bold` 등 흔한 utility 를 누락해 tailwind-project
 * 환경에서 정상 활용이 orphanClass 로 잘못 카운트되는 false negative 가 발생했습니다.
 */

const tailwindDetect = require("./_tailwind-detect.js");

/** @type {import('../../src/policy').StylingPolicy} */
module.exports = {
  allowed: [
    {
      id: "tailwind",
      label: "Tailwind utility classes",
      detect: {
        classPatterns: tailwindDetect.classPatterns,
      },
    },
  ],
  preferred: "tailwind",
  forbidden: [
    {
      id: "bootstrap-utilities",
      label: "Bootstrap utility classes",
      severity: "error",
      classPatterns: [
        /^d-(?:none|inline|inline-block|block|flex|inline-flex|grid)$/,
        /^justify-content-\w+$/,
        /^align-items-\w+$/,
        /^btn(?:-(?:sm|lg|primary|secondary|success|danger|warning|info|light|dark|outline-\w+))?$/,
        /^col(?:-(?:sm|md|lg|xl|xxl))?(?:-(?:auto|\d{1,2}))?$/,
        /^row$/,
      ],
      importModules: ["reactstrap", "react-bootstrap", "bootstrap"],
    },
    {
      id: "scss-imports",
      label: "SCSS / Sass imports",
      severity: "warn",
      classPatterns: [], // className에는 걸지 않음
      importModules: [],
      // 0.8.8 — 감지 규칙 의도적 비활성 (항상 0 카운트) + dashboard 매트릭스 미등재.
      //   단순 import 경로 검출 (importPathPatterns) 은 pure-@apply 허용 방침과 충돌:
      //   tailwind-project 는 @apply wrapper 용 SCSS import 가 정상이라 (codebase.ts
      //   matrix — pure-@apply 정상 / apply-mixed·raw-css 금지), 경로만으로 금지 판정
      //   시 오검출. 매트릭스 연계 구현 (이월된 추가개발 — docs/roadmap.md §1 참조)
      //   전까지 본 상태 유지.
    },
  ],
};
