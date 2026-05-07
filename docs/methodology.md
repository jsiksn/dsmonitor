# DSMonitor Methodology

(Phase B 분리 작업 시 packaging 으로부터 측정 방법론 / Phase 개념 / Decision Log 작성 규칙 / 용어 정의를 추출해 작성 예정. 현재는 placeholder.)

## 현 시점 참조 (2026-04-30)

방법론 / 진행 / Phase 정의 / 측정 도구 진화 historical 은 프로젝트 측 운영 기록 안에 통합 정리:

- **`dsmonitor/docs/planning.md`** — 프로젝트 측 메인 기획. Phase × 레이어 매트릭스 / 진행 상태 / Phase 정의 / §7 Decision Log (v0.1 ~ v0.15, 2026-04-20 ~ 2026-04-30).
- **`dsmonitor/docs/phase-c-plan.md`** — Phase C 6 작업 (대시보드 고도화 + depth/parentInstance + case A/B 정정 + 레이어 3 + 패키지화 + 사이드카 plugin 시스템 ✅).
- **`dsmonitor/dsmonitor.config.ts`** measurementHistory — v0.1 ~ v0.15 entry (각 버전의 정의 변경 / 신규 기능 / 핵심 학습 historical).

## 패키지 측 사용자 가이드 reference

- **[../README.md](../README.md)** — 패키지 빠른 시작 / CLI 명령 / preset / 출력물 위치
- **[figma-config-guide.md](./figma-config-guide.md)** — Figma config 작성법
- **[eslint-rules.md](./eslint-rules.md)** — ESLint 룰 상세
- **[eslint-ci-integration.md](./eslint-ci-integration.md)** — ESLint CI 통합 패턴
- **[lighthouse-ci-integration.md](./lighthouse-ci-integration.md)** — Lighthouse CI 통합
- **[plugin-development.md](./plugin-development.md)** — 사이드카 plugin 개발 참고 (v0.15) — 외부 측정 결과를 dashboard 자동 표시 약속 + 정보 위치 / 정보 형식 / 검증 / 예시 코드

## 본 문서 작성 시점 (Phase B)

Phase A (코드 정리) 완료 후 Phase B 단계에서:
- 측정 방법론 — 3 레이어 정의 + 레이어 별 측정 핵심 + 다른 프로젝트 일반화 가능성
- Phase 개념 — Phase 0 ~ C 의 단계 정의 + 전환 조건
- Decision Log 작성 규칙 — §7 의사결정 로그 형식 + 시점 / 핵심 / 결정 사항 패턴
- 용어 정의 — DS / Forbidden / preferred / orphan / componentMatch / instance / variantGroup 등

위 4 항목을 packaging 시점에 본 문서로 추출 예정. 그 전까지는 위 reference 를 통해 접근.
