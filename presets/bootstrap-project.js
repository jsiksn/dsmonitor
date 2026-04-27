"use strict";

/**
 * 예시 정책 — Bootstrap이 정식, Tailwind/inline이 레거시인 프로젝트.
 *
 * 사용: vitaui/stylingPolicy.js를 이 내용으로 교체.
 */

/** @type {import('../../src/policy').StylingPolicy} */
module.exports = {
  allowed: [
    {
      id: "bootstrap",
      label: "Bootstrap utility classes / components",
      detect: {
        classPatterns: [
          /^d-(?:none|inline|inline-block|block|flex|inline-flex|grid)$/,
          /^justify-content-\w+$/,
          /^btn(?:-\w+)?$/,
          /^col(?:-(?:sm|md|lg|xl|xxl))?(?:-(?:auto|\d{1,2}))?$/,
        ],
        importModules: ["reactstrap", "react-bootstrap", "bootstrap"],
      },
    },
  ],
  preferred: "bootstrap",
  forbidden: [
    {
      id: "tailwind-classes",
      label: "Tailwind utility classes",
      severity: "error",
      classPatterns: [
        /^(?:text|bg|border)-(?:slate|gray|red|blue|green|yellow|orange|purple)-(?:100|200|300|400|500|600|700|800|900)$/,
        /^items-(?:start|end|center|baseline|stretch)$/,
        /^text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl)$/,
        /^font-(?:thin|light|medium|semibold|bold|extrabold|black)$/,
        /^rounded-(?:none|sm|md|lg|xl|2xl|3xl|full)$/,
      ],
    },
    {
      id: "inline-styles",
      label: "JSX inline style={{}}",
      severity: "warn",
      classPatterns: [],
      // 현재 detect spec에 inlineStyleJSX forbidden까지 연결하려면 rule 확장 필요.
      // 초기 버전에서는 analyzer가 distribution에 반영하고, ESLint는 경고만.
    },
  ],
};
