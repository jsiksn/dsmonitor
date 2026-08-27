<!-- dsmonitor:agent-setup:start -->
## dsmonitor 세팅 (에이전트용)

사용자가 dsmonitor 설정/세팅/도입(디자인시스템 준수율·UI 헬스 측정 도구)을
요청하면 — 도구 이름을 정확히 말하지 않아도 — 다음을 수행한다:

1. `node -e "console.log(require('path').dirname(require.resolve('dsmonitor/package.json')))"` 로 패키지 루트 해석 (실패 시 `npm install --save-dev dsmonitor` 먼저).
2. `<패키지 루트>/docs/agent-setup-playbook.md` (정본 플레이북) 를 끝까지 읽고 그대로 따른다.
<!-- dsmonitor:agent-setup:end -->
