"use strict";

const tailwindDetect = require("./_tailwind-detect.js");

/**
 * bootstrap-project preset — Bootstrap 이 정식, Tailwind / inline 이 레거시인 프로젝트.
 *
 * 0.8.1 — forbidden tailwind-classes detect 를 `_tailwind-detect.js` 공통 helper 로 통일.
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
      // 0.8.1 — 공통 helper 활용.
      classPatterns: tailwindDetect.classPatterns,
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
