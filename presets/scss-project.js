"use strict";

/**
 * scss-project preset — 클래스 기반 스타일링 전반 대상.
 *
 * .scss / .css 두 형식 모두 포함. preset 명칭은 "scss" 지만 순수 CSS 프로젝트도
 * 동일하게 적용됩니다 (.css 만 활용하는 React + CSS files 환경 / SCSS 환경 /
 * 혼합 환경 모두 OK).
 *
 * 활용 예:
 *   - 컴포넌트 .module.css / .module.scss 활용
 *   - 전역 .css / .scss 파일에서 클래스 정의
 *
 * Tailwind / Bootstrap 활용 시점에는 각각 tailwind-project / bootstrap-project preset 활용.
 *
 * EN — scss-project preset covers class-based styling broadly. Despite the "scss"
 * name in the file, both `.scss` and `.css` projects fit. For Tailwind use
 * tailwind-project; for Bootstrap use bootstrap-project.
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
        // ... 전체 목록은 dsmonitor/stylingPolicy.js 참고
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
        // ... 전체 목록은 dsmonitor/stylingPolicy.js 참고
      ],
    },
  ],
};
