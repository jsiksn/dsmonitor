# Lighthouse CI 연동 가이드 (참고용 — 현재 미적용)

> ⚠️ **STALE (2026-04-22)**: 본 문서의 CI 자동화 예시(Jenkins / GitLab /
> GitHub Actions) 는 쿠키 파일 (`.cookies.local.json`) restore 플로우
> 기반으로 작성됨. Plan B (Puppeteer 자동 로그인) 전환 후 쿠키 파일은
> 폐기됐고, CI 시크릿도 `LIGHTHOUSE_TEST_ID` / `LIGHTHOUSE_TEST_PW` /
> `LIGHTHOUSE_ZONE_ACCOUNT_UUID` / `LIGHTHOUSE_ZONE_ACCOUNT_LABEL` /
> `LIGHTHOUSE_BASE_URL` 5종 환경변수로 주입해야 함. 본 문서 예시는
> 실제 CI 도입 시점에 Plan B 기준으로 재작성 예정.
>
> 현재 구현 참조: [`../lighthouse/README.md`](../lighthouse/README.md),
> [`./lighthouse-plan-b.md`](./lighthouse-plan-b.md),
> [`./planning.md`](./planning.md) §7.

> **현재 정책**: Lighthouse 측정은 **로컬 수동 실행**만 사용. CI 자동화 미도입.
> 본 문서는 **Phase A 완료 후 정기 회귀 측정이 필요해질 때** 참고용.
>
> (이 문서는 Lighthouse 전용 CI 통합 가이드입니다. ESLint 룰의 CI 연동 단계는
> 같은 디렉토리의 [`eslint-ci-integration.md`](./eslint-ci-integration.md) 를 참조하세요.)

---

## 1. 왜 지금은 CI 연동을 안 하는가

- **Phase 0.5 의 목표**: **Phase A Before 수치 확보**. 즉 한 시점의 측정이 정확하면 충분.
- 자동화는 **운영 부담**: 쿠키 만료 대응, dev 환경 상태 관리, 결과 보관 정책 등 연쇄 과제.
- 측정 빈도가 낮음 (Phase A 착수 직전 + 완료 직후 2회가 핵심): 주간 cron 은 가치보다 관리 비용 큼.
- 인증 방식이 **쿠키 수동 추출** 이므로 CI 에서 시크릿 관리 추가 설정 필요 → 지금은 오버킬.

## 2. 언제 도입 검토할지

- Phase A 완료 + baseline 지속 추적 필요해질 때 (예: 주간 회귀 감시).
- Phase B 에서 axe-core / Chromatic 등 **다른 자동화 측정**과 통합 대시보드를 만들 때.
- 다른 프로젝트로 도구 이식(Phase C) 할 때 — 이식 대상 프로젝트의 CI 에 올리는 형태.

---

## 3. CI 연동 시 공통 요구사항

### 3-1. 실행 환경
- **Node**: 20.x 권장 (현재 프로젝트 기준).
- **Chrome / Chromium**: Lighthouse 가 headless Chrome 필요.
  - GitHub Actions: `ubuntu-latest` 러너에 기본 포함.
  - 자체 호스팅 (Jenkins slave, GitLab runner): `apt-get install google-chrome-stable` 또는 Puppeteer 에 동봉된 Chromium 재사용.
- **디스크**: 36 runs × 평균 1~2MB = 회차당 수십 MB. 주간 실행 시 수개월 분 보관하려면 아티팩트 정책 필요.

### 3-2. 시크릿 관리
- **쿠키 JSON** 또는 **Plan B 의 테스트 계정 비밀번호** 를 **평문으로 리포지토리에 두지 말 것**.
- 플랫폼별 시크릿 매니저:
  - Jenkins: **Credentials** (Secret file 타입에 쿠키 JSON 업로드).
  - GitLab CI: **CI/CD Variables** (File 타입 추천).
  - GitHub Actions: **Repository Secrets** + `actions/checkout` 후 파일로 복원.
- 쿠키 만료는 자동 해결 불가 → 실패 시 담당자에게 알림 + 수동 쿠키 갱신 절차 필요.

### 3-3. 결과 보관
- `reports/YYYY-MM-DD/` 를 **빌드 아티팩트** 로 업로드.
- 장기 비교가 목적이면 **LHCI Server** (자체 호스팅) 검토.

---

## 4. Jenkins Pipeline 예시 (Declarative)

`Jenkinsfile` 예시:
```groovy
pipeline {
  agent { label 'linux && node' }

  options {
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  triggers {
    // 주간 cron: 매주 월요일 오전 3시
    cron('H 3 * * 1')
  }

  environment {
    LHCI_BASE_URL = 'https://portal-dev.internal.example.com'
  }

  stages {
    stage('Install') {
      steps {
        sh 'node --version'
        sh 'npm ci'
      }
    }

    stage('Prepare Cookies') {
      steps {
        // Jenkins Credentials > Secret file > ID: 'lighthouse-cookies-dev'
        withCredentials([file(
          credentialsId: 'lighthouse-cookies-dev',
          variable: 'COOKIES_JSON'
        )]) {
          sh 'cp "$COOKIES_JSON" dsmonitor/lighthouse/.cookies.local.json'
        }
      }
    }

    stage('Lighthouse') {
      steps {
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          sh 'npm run lighthouse'
        }
      }
    }

    stage('Archive') {
      steps {
        archiveArtifacts(
          artifacts: 'dsmonitor/lighthouse/reports/**/*',
          allowEmptyArchive: true
        )
      }
    }
  }

  post {
    always {
      // 쿠키 파일 제거 (보안)
      sh 'rm -f dsmonitor/lighthouse/.cookies.local.json'
    }
    unstable {
      // Slack/메일 알림 — 쿠키 만료 의심 시
      echo '⚠️ Lighthouse 측정 실패. 쿠키 만료 가능성 확인 필요.'
    }
  }
}
```

**주의**:
- Jenkins `Secret file` 기능으로 쿠키 JSON 업로드 → `$COOKIES_JSON` 으로 임시 파일 경로 제공.
- `post { always }` 블록에서 쿠키 파일 **반드시 제거** (workspace 유출 방지).
- `catchError` 로 측정 실패가 파이프라인 전체를 빨갛게 하지 않도록 — 쿠키 만료 노이즈 대응.

---

## 5. GitLab CI 예시 (`.gitlab-ci.yml`)

```yaml
stages:
  - measure

variables:
  LHCI_BASE_URL: 'https://portal-dev.internal.example.com'

lighthouse:weekly:
  stage: measure
  image: node:20
  # GitLab scheduled pipeline 으로 주간 실행 걸어두기 (UI: CI/CD > Schedules)
  only:
    variables:
      - $CI_PIPELINE_SOURCE == "schedule"
  before_script:
    # Chrome 설치 (node:20 이미지엔 미포함)
    - apt-get update -qq && apt-get install -y --no-install-recommends google-chrome-stable
    - npm ci
    # CI/CD Variables > File 타입: LIGHTHOUSE_COOKIES_JSON
    - cp "$LIGHTHOUSE_COOKIES_JSON" dsmonitor/lighthouse/.cookies.local.json
  script:
    - npm run lighthouse
  after_script:
    - rm -f dsmonitor/lighthouse/.cookies.local.json
  artifacts:
    when: always
    paths:
      - dsmonitor/lighthouse/reports/
    expire_in: 3 months
  allow_failure: true
```

**주의**:
- `LIGHTHOUSE_COOKIES_JSON` 은 CI/CD Variables 에서 **File 타입** 으로 등록. 값으로 파일 경로가 주입됨.
- Chrome 미포함 이미지 사용 시 `apt-get install google-chrome-stable` 필요 — 설치 시간 단축하려면 사전 빌드한 Docker 이미지 사용 권장.
- `allow_failure: true` 로 이 job 실패가 다른 파이프라인 차단하지 않도록.

---

## 6. GitHub Actions 예시 (`.github/workflows/lighthouse.yml`)

```yaml
name: Lighthouse CI

on:
  schedule:
    - cron: '0 3 * * 1' # 매주 월요일 오전 3시 UTC
  workflow_dispatch: # 수동 트리거 허용

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Restore Lighthouse cookies
        run: |
          echo "$LIGHTHOUSE_COOKIES_JSON" > dsmonitor/lighthouse/.cookies.local.json
        env:
          LIGHTHOUSE_COOKIES_JSON: ${{ secrets.LIGHTHOUSE_COOKIES_JSON }}

      - name: Run Lighthouse
        env:
          LHCI_BASE_URL: ${{ vars.LHCI_BASE_URL }}
        run: npm run lighthouse
        continue-on-error: true

      - name: Archive reports
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-reports-${{ github.run_id }}
          path: dsmonitor/lighthouse/reports/
          retention-days: 90

      - name: Cleanup cookies
        if: always()
        run: rm -f dsmonitor/lighthouse/.cookies.local.json
```

**주의**:
- Secrets 에 JSON 전체를 넣는 방식. 개행 보존 위해 따옴표 이스케이프 주의 (필요 시 base64 인코딩 후 runtime decode).
- `continue-on-error: true` 로 쿠키 만료 실패가 워크플로 상태를 빨갛게 하지 않음.

---

## 7. 도입 전 체크리스트

CI 연동에 착수하기 전 다음이 준비되었는지 확인:

- [ ] Phase A Before/After 측정이 안정적으로 완료됨 (로컬 실행이 먼저 검증됨).
- [ ] 쿠키 만료 주기 파악 (예: 8시간 / 24시간 / 1주). 주기보다 짧은 cron 간격 설정 필요.
- [ ] 쿠키 갱신 담당자 지정 (실패 알림을 받고 수동 갱신할 사람).
- [ ] 측정 실패 시 대응 매뉴얼 문서화 (roughly: ① 쿠키 만료 확인 ② 재추출 ③ 시크릿 갱신 ④ 재실행).
- [ ] 장기적으로 Plan B (Puppeteer) 로 전환 여부 결정 — 쿠키 회전 자동화가 어렵다면 Puppeteer 가 유지비 낮음.
- [ ] 결과 비교/시각화 방법 결정 (간단히 artifact 로 끝낼지, LHCI Server 운영할지).

---

## 8. 관련 문서

- [`../lighthouse/README.md`](../lighthouse/README.md) — 로컬 실행 가이드 (현 1차 구현)
- [`./lighthouse-plan-b.md`](./lighthouse-plan-b.md) — Puppeteer 자동 로그인 전환 가이드
- [`./lighthouse-page-candidates.md`](./lighthouse-page-candidates.md) — 측정 URL 12개 + 운영 원칙
- [`./eslint-ci-integration.md`](./eslint-ci-integration.md) — ESLint 룰의 CI 연동 단계 (다른 주제)
