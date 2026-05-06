# CI Integration Guide

> (이 문서는 ESLint 룰의 CI 연동 가이드입니다. Lighthouse CI 연동 단계는
> 같은 디렉토리의 [`lighthouse-ci-integration.md`](./lighthouse-ci-integration.md) 를 참조하세요.)

현재 프로젝트는 **Phase 1 (가시화 전용)** 상태로 운영한다. CI에서 lint 결과를
블록하지 않고, 정보 제공만 한다. 팀 적응이 끝나면 Phase 4(차단 도입)로 단계 상향.

단계별 정의는 [eslint-rules.md](./eslint-rules.md) 의 **Adoption Phases** 섹션 참조.

---

## Phase 1 — 가시화 (현재 기본)

모든 CI 플랫폼에서 **`npm run lint:summary`** 를 실행. 항상 exit 0이므로 파이프라인을 실패시키지 않는다.

### GitLab CI (`.gitlab-ci.yml`)

```yaml
stages:
  - analyze

dsmonitor:lint-summary:
  stage: analyze
  image: node:20
  script:
    - npm ci
    - npm run lint:summary
  # lint-baseline이 갱신되는 브랜치만 baseline 재생성 알림
  artifacts:
    when: always
    paths:
      - dsmonitor/.lint-baseline.json
    expire_in: 1 week
  allow_failure: true   # Phase 1: 어떠한 경우에도 파이프라인 통과
```

### Bitbucket Pipelines (`bitbucket-pipelines.yml`)

```yaml
image: node:20

pipelines:
  default:
    - step:
        name: DSMonitor lint summary
        caches:
          - node
        script:
          - npm ci
          - npm run lint:summary
        # Phase 1: 실패해도 전체 파이프라인을 블록하지 않는`dsmonitor:figma` 단독 스텝.
        # 메인 빌드/테스트 스텝은 병렬로 돌려서 독립적으로 동작하도록.
```

### Jenkins (Declarative Pipeline)

```groovy
pipeline {
  agent any
  stages {
    stage('Install') {
      steps { sh 'npm ci' }
    }
    stage('DSMonitor lint summary') {
      steps {
        // catchError로 실패를 기록만 하고 파이프라인 진행.
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          sh 'npm run lint:summary | tee lint-summary.txt'
        }
        archiveArtifacts artifacts: 'lint-summary.txt',
                         allowEmptyArchive: true
      }
    }
  }
}
```

### 공통 권장 사항
- `lint:summary` 는 stdout에 **사람이 읽기 좋은 요약**을 출력한다. CI 로그 뷰어에서 바로 확인 가능.
- baseline(`dsmonitor/.lint-baseline.json`)은 **PR 머지와 함께** 커밋하는 습관. 아무도 lint:update-baseline을 돌리지 않으면 증가 탐지가 무의미해진다.

---

## Phase 2 — 리포트 자동 발송 (옵션)

요약을 단순 로그가 아니라 사내 채널/이메일로 보낼 때:

```bash
# 예: Slack Webhook (GitLab CI)
npm run lint:summary | tee /tmp/summary.txt
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"\`\`\`$(cat /tmp/summary.txt | sed 's/\"/\\\\\"/g')\`\`\`\"}" \
  "$SLACK_WEBHOOK_URL"
```

정기 리포트(`docs/baseline.md`)도 함께 발송:
```bash
npm run report -- --output /tmp/dsmonitor-report.md
# 그 다음 사내 메신저 업로드
```

---

## Phase 3 — CI 경고 (non-blocking warning)

`lint:summary`의 증가분(delta)이 양수일 때 **UI상 경고**만 표시하고 블록은 하지 않는 단계.

### 구현 예시 (Bash wrapper)

`tools/ci/lint-warn.sh`:
```bash
#!/usr/bin/env bash
set -e
OUTPUT=$(npm run lint:summary)
echo "$OUTPUT"
if echo "$OUTPUT" | grep -qE 'Delta:\s*\+[1-9]'; then
  echo "::warning::DSMonitor lint warnings increased. See summary above."
fi
# exit 0 유지 — 경고만 남긴다
```

GitLab CI/Bitbucket에서는 `allow_failure: true` 상태를 유지하되,
스크립트 안에서 `curl` 등으로 채널에 알림만 추가.

---

## Phase 4 — CI 차단 (hardening)

팀이 지표 감소 추세에 익숙해지고 baseline이 충분히 내려갔을 때 적용.

### 4-a) 증가 시에만 실패 (baseline 이 상향되지 않았을 때만 실패)

`tools/ci/lint-check.sh`:
```bash
#!/usr/bin/env bash
set -e
OUTPUT=$(npm run lint:summary)
echo "$OUTPUT"
# Delta 가 +N (양수)이면 exit 1
if echo "$OUTPUT" | grep -qE 'Delta:\s*\+[1-9]'; then
  echo ""
  echo "ERROR: DSMonitor lint warnings increased."
  echo "Fix the newly-added forbidden classes, or run"
  echo "  'npm run lint:update-baseline'"
  echo "to consciously raise the baseline (document the reason in --note)."
  exit 1
fi
```

`package.json`에 추가:
```json
"lint:ci": "bash tools/ci/lint-check.sh"
```

그리고 CI 설정에서 `allow_failure` 제거:
```yaml
# GitLab CI
dsmonitor:lint-ci:
  stage: test
  script:
    - npm ci
    - npm run lint:ci
  # allow_failure 제거 → 실패 시 파이프라인 차단
```

### 4-b) ESLint `--max-warnings` 직접 활용 (더 엄격)

baseline의 `maxWarnings` 값을 `next lint --max-warnings=N` 으로 주입해서
ESLint 자체의 실패 메커니즘을 쓰는 방법. 모든 ESLint 룰의 warning 합계를 기준으로 하기 때문에
`dsmonitor` 외 룰이 발생시키는 warning도 영향을 준다는 점 주의.

```bash
MAX=$(node -p "require('./dsmonitor/.lint-baseline.json').maxWarnings")
next lint --max-warnings=$MAX
```

이 방법은 정밀도가 떨어지지만 스크립트 분량이 짧다.

---

## Phase 4로 전환하는 체크리스트

Phase 4로 올릴지 결정할 때 확인:

- [ ] 현재 baseline이 초기 대비 **50% 이상 감소** 했는가?
- [ ] 최근 3개월 동안 **delta가 증가한 빈도가 10% 미만** 인가? (summary 기록을 모아보면 알 수 있음)
- [ ] 팀이 `lint:summary` 출력을 **정기적으로 확인** 하고 있는가? (생존 신호)
- [ ] baseline 갱신 PR이 **적절한 빈도로 발생** 하는가? (너무 드물면 의식적으로 무시 중일 가능성)
- [ ] 팀 회의에서 **차단 도입에 대한 합의** 를 얻었는가?

위 중 3개 이상 만족할 때 Phase 4를 시도한다. 그래도 **2주간 유예 기간**을 두고 모두에게 공지한 뒤 전환하는 것을 권장.

---

## 참고

- 룰 자체 동작: [eslint-rules.md](./eslint-rules.md)
- 스타일링 정책: [../stylingPolicy.js](../stylingPolicy.js)
- 리포트 샘플: `docs/baseline.md` (루트 repo 기준)
