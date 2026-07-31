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
      classPatterns: [], // className에는 걸지 않음 — 선언용 (아래 참조)
      importModules: [],
      // 0.10.0 — 매트릭스 연계 검출로 측정 시작 (src/analyzers/scssImportLink.ts).
      //   본 항목은 "선언" 역할: 이 id 가 preset 에 있으면 분석기가 import 된 SCSS 의
      //   클래스 분류에 연동해 카운트한다 — 금지 분류 (raw CSS·@apply 혼합) 를 담은
      //   파일의 import 만 레거시. pure-@apply wrapper / 변수 전용 파일 import 는 정상.
      //   (단순 경로 검출을 쓰지 않는 이유: pure-@apply 허용 방침과 충돌 — 오검출.)
    },
  ],
};
