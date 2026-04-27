"use strict";

/**
 * 예시 정책 — CSS Modules가 정식인 프로젝트.
 *
 * 사용: vitaui/stylingPolicy.js를 이 내용으로 교체.
 *
 * 특징:
 * - `styles.xxx` 접근을 AST 레벨에서 정확히 탐지하려면 detector 확장이 필요.
 *   v0.1에서는 `*.module.{css,scss}` import만 탐지한다.
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
      classPatterns: [
        /^(?:text|bg|border)-(?:slate|gray|red|blue|green|yellow)-(?:100|200|300|400|500|600|700|800|900)$/,
        /^items-(?:start|end|center|baseline|stretch)$/,
        /^text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl)$/,
      ],
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
