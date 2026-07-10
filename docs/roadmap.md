# Roadmap — 이월된 추가개발 후보

> 본 문서는 조사·논의를 거쳐 **이월된 추가개발 후보**를 기록합니다. 착수 순서는 정해져 있지 않으며,
> 각 항목은 규모가 있어 **착수 시 설계 논의가 선행**됩니다. 완료되면 CHANGELOG 로 옮겨지고
> 여기서는 제거됩니다. (배경: 2026-07 전수 조사 — 아래 "조사 배치 이력" 참조.)

---

## 1. `scss-imports` 매트릭스 연계 검출

**배경 (왜 이월됐나)** — tailwind-project preset 은 금지 항목으로 `scss-imports` (SCSS 파일 import 자체)
를 선언하지만, 감지 규칙이 의도적으로 비어 있어 항상 0 으로 측정됩니다. 단순하게 "import 경로가
`.scss` 로 끝나면 금지" 로 구현하면 **pure-@apply 허용 방침과 충돌**합니다 — tailwind-project 에서
`@apply` wrapper 용 SCSS import 는 정상 사용인데 (codebase.ts matrix: pure-@apply 정상 /
apply-mixed·raw-css 금지), 경로만 보면 이것까지 금지로 오검출됩니다. (2026-07 논의로 이월 확정.)

**현재 상태** — 항목만 등록되어 baseline JSON 에 항상 0. dashboard 매트릭스에도 의도적으로 미등재
(주석: `src/dashboard/forbidden-meta.ts`, `presets/tailwind-project.js`).

**구현 방향** — import 문 자체가 아니라 **import 된 SCSS 파일의 클래스 정의가 매트릭스에서 어떻게
분류됐는지에 연동**: 전부 pure-@apply 로 정의된 파일의 import 는 정상, 혼합(apply-mixed)·raw-css
클래스를 담은 파일의 import 만 금지로 카운트.

**선행 조각** — 금지 규칙(`ForbiddenPatternSpec`)에 `importPathPatterns` 지원 추가 (허용 규칙의
`DetectSpec` 에는 이미 있음 — `src/policy.ts`). 그 위에 매트릭스 분류 결과와의 연결 계층.

## 2. Bootstrap `@extend` / `@include` 검출

**배경** — bootstrap-project preset 은 JSX `className` 패턴과 import 모듈명으로만 Bootstrap 을
감지합니다. SCSS 에서 `@extend .btn`, `@include button-variant(...)` 로 Bootstrap 을 소비하는
파일은 **전혀 측정되지 않습니다.** 신규 개발 규모라 이월.

**현재 상태** — 구현 0. 더불어 bootstrap / css-modules preset 은 스타일링 매트릭스 분석 자체가
비활성 (`src/analyzers/codebase.ts` matrix 주석 — scss / tailwind preset 한정). bootstrap preset 의
`inline-styles` 금지 항목도 감지 규칙 미연결 상태.

**구현 방향** — SCSS 구문 분석 (postcss-scss 등) 으로 `@extend` / `@include` 대상 추적 + bootstrap /
css-modules preset 의 매트릭스 활성화 여부를 함께 결정. 측정 결과가 달라지는 변경이므로 minor
버전 + CHANGELOG 에 변화 방향 명시.

## 3. 대시보드 인라인 번들 (CDN 의존 제거)

**배경** — 대시보드 HTML 은 React / ReactDOM / Babel 을 열 때마다 unpkg CDN 에서 내려받고,
컴포넌트 (jsx) 를 브라우저에서 런타임 변환합니다. **인터넷이 안 되는 환경 (사내 보안망·폐쇄망)
에서는 빈 화면**이고, CDN 장애·방화벽 차단에도 취약하며, 첫 표시가 느립니다.

**현재 상태** — `src/dashboard/builder/shell.ts` 가 unpkg URL + integrity 고정으로 로드.

**구현 방향** — 패키지 빌드 시점에 jsx 를 사전 변환하고 React 를 포함해 **단일 HTML 자급자족**
형태로 출력. 대시보드 빌드 구조 자체를 바꾸는 큰 작업이라 별도 설계 선행. 구형 브라우저 색상
소실 위험이 있는 oklch()/color-mix fallback 도 이 트랙에서 함께 처리.

---

## 조사 배치 이력 (참고)

2026-07 전수 조사에서 나온 정정·개선 배치. 상세는 [CHANGELOG.md](../CHANGELOG.md).

| 버전 | 내용 한 줄 |
|---|---|
| 0.8.8 | dashboard 배지·목표를 thresholds 판정으로 동적화 + 시안 잔재 문구 정리 |
| 0.8.9 | 리포터 표기 동기화 + overview placeholder 동적화 + README 영어 섹션 + `--help` |
| 0.8.10 | 테스트 인프라 (vitest) + 동작 불변 리팩토링 (FORBIDDEN 단일화·공유 유틸) + 접근성 |
| 0.9.0 | 파서 개선 (v3/v4 토큰 정규화·className 수집 정밀화 등) + doctor/init 확장 |
