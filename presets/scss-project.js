"use strict";

/**
 * 예시 정책 — SCSS가 정식, Bootstrap/Tailwind가 레거시인 프로젝트.
 *
 * 현재 repo(portal-gateway-web)가 이 케이스. 루트 `vitaui/stylingPolicy.js`
 * 참고(동일 구조).
 */

/** @type {import('../../src/policy').StylingPolicy} */
module.exports = {
  allowed: [
    {
      id: "scss",
      label: "SCSS / CSS imports",
      detect: {
        importPathPatterns: [/\.(s?css|sass)$/i],
      },
    },
  ],
  preferred: "scss",
  forbidden: [
    {
      id: "bootstrap-utilities",
      label: "Bootstrap utility classes",
      severity: "error",
      classPatterns: [
        /^d-(?:none|inline|inline-block|block|flex|inline-flex|grid)$/,
        /^(?:m|p|mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py)-(?:[0-5]|auto)$/,
        /^justify-content-(?:start|end|center|between|around|evenly)$/,
        /^align-items-(?:start|end|center|baseline|stretch)$/,
        /^text-(?:start|center|end|primary|secondary|success|danger|warning|info|muted)$/,
        /^bg-(?:primary|secondary|success|danger|warning|info|light|dark)$/,
        /^btn(?:-(?:sm|lg|primary|secondary|success|danger|warning|info|light|dark|link|outline-\w+))?$/,
        /^col(?:-(?:sm|md|lg|xl|xxl))?(?:-(?:auto|\d{1,2}))?$/,
        /^row$/,
        // ... 전체 목록은 vitaui/stylingPolicy.js 참고
      ],
    },
    {
      id: "tailwind-classes",
      label: "Tailwind utility classes",
      severity: "error",
      classPatterns: [
        /^(?:text|bg|border)-(?:slate|gray|red|blue|green|yellow|orange|purple)-(?:50|100|200|300|400|500|600|700|800|900|950)$/,
        /^items-(?:start|end|center|baseline|stretch)$/,
        /^text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl)$/,
        /^font-(?:thin|light|normal|medium|semibold|bold|extrabold|black)$/,
        /^rounded-(?:none|sm|md|lg|xl|2xl|3xl|full)$/,
        // ... 전체 목록은 vitaui/stylingPolicy.js 참고
      ],
    },
  ],
};
