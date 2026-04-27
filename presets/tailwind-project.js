"use strict";

/**
 * 예시 정책 — Tailwind가 정식, SCSS/Bootstrap이 레거시인 프로젝트.
 *
 * 사용: vitaui/stylingPolicy.js를 이 내용으로 교체.
 */

/** @type {import('../../src/policy').StylingPolicy} */
module.exports = {
  allowed: [
    {
      id: "tailwind",
      label: "Tailwind utility classes",
      detect: {
        // 대표적인 tailwind 토큰이 하나라도 있으면 tailwind 사용으로 간주
        classPatterns: [
          /^(?:text|bg|border)-(?:slate|gray|red|blue|green|yellow)-(?:100|200|300|400|500|600|700|800|900)$/,
          /^(?:flex|grid|items-\w+|justify-\w+)$/,
          /^(?:m|p|mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py)-\d+$/,
        ],
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
      id: "scss-modules",
      label: "SCSS / Sass imports",
      severity: "warn",
      classPatterns: [], // className에는 걸지 않음
      importModules: [],
      // 실제로 SCSS import를 금지하려면 importPathPatterns가 필요 — 현재는 확장 여지
    },
  ],
};
