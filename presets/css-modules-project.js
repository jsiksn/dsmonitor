"use strict";

const tailwindDetect = require("./_tailwind-detect.js");

/**
 * css-modules-project preset — CSS Modules 가 정식인 프로젝트.
 *
 * 특징:
 *   - `styles.xxx` 접근을 AST 레벨에서 정확히 탐지하려면 detector 확장 필요.
 *     v0.1 에서는 `*.module.{css,scss}` import 만 탐지.
 *
 * 0.8.1 — forbidden tailwind-classes detect 를 `_tailwind-detect.js` 공통 helper 로 통일.
 */

/** @type {import('../../src/policy').StylingPolicy} */
module.exports = {
  allowed: [
    {
      id: "css-modules",
      label: "CSS/SCSS Modules",
      detect: {
        importPathPatterns: [/\.module\.(s?css|sass)$/i],
      },
    },
  ],
  preferred: "css-modules",
  forbidden: [
    {
      id: "bootstrap-utilities",
      label: "Bootstrap utility classes",
      severity: "error",
      classPatterns: [
        /^d-(?:none|inline|inline-block|block|flex|inline-flex|grid)$/,
        /^(?:m|p|mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py)-(?:[0-5]|auto)$/,
        /^justify-content-\w+$/,
        /^btn(?:-\w+)?$/,
      ],
      importModules: ["reactstrap", "react-bootstrap", "bootstrap"],
    },
    {
      id: "tailwind-classes",
      label: "Tailwind utility classes",
      severity: "error",
      // 0.8.1 — 공통 helper 활용.
      classPatterns: tailwindDetect.classPatterns,
    },
    {
      id: "global-css",
      label: "Non-module SCSS/CSS imports",
      severity: "warn",
      classPatterns: [],
      // 전역 CSS import 자체를 강제 차단하려면 importPathPatterns 지원이 rule에 필요.
    },
  ],
};
