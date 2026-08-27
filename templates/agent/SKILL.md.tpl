---
name: dsmonitor-setup
description: >-
  dsmonitor(디자인시스템 준수율·UI 헬스 측정 CLI) 세팅을 이 프로젝트에 맞게
  자동 완성한다. 트리거: "dsmonitor 설정/세팅/셋업/초기화/도입해줘",
  "UI 헬스 측정 도구 설정", "dsmonitor.config.ts 작성/수정", "디자인시스템
  준수율 측정 도구 붙여줘" — 사용자가 도구 이름을 정확히 말하지 않아도,
  디자인시스템 준수율·토큰 사용률·스타일링 부채 측정을 이 리포에 도입/설정
  하려는 요청이면 트리거된다.
---

# dsmonitor 세팅 (에이전트 어댑터)

이 파일은 포인터입니다. 정본 플레이북은 설치된 dsmonitor 패키지 안에 있으며,
`npm update dsmonitor` 로 항상 최신을 유지합니다.

1. 패키지 루트를 해석합니다:

```bash
node -e "console.log(require('path').dirname(require.resolve('dsmonitor/package.json')))"
```

(실패 = dsmonitor 미설치 → `npm install --save-dev dsmonitor` 먼저.)

2. `<위 경로>/docs/agent-setup-playbook.md` 를 **끝까지 읽고 그대로 따르세요.**
   요약본으로 대체하지 말 것 — 필드 결정 규칙·doctor 대응표·금지 사항이 전부
   그 문서에 있습니다.
