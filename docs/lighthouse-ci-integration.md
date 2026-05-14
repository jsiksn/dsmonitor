# Lighthouse CI 연동 가이드 (0.5.0 재정리)

> 본 문서 = `@lhci/cli` 안 시스템 Chrome 자체 자동 감지 흐름 + 외부 사용자 환경별 사전 install 자세 + LHCI config 자체 동적 생성 흐름 자세. dsmonitor 0.4.2+ 안 자동 `CHROME_PATH` 감지 흐름. dsmonitor 0.5.0+ 안 LHCI config 자체 동적 생성 (옛 `lighthouse/config.js` 안 hard-code PAGES 흐름 폐기).

> **EN —** This guide covers system-Chrome detection by `@lhci/cli`, environment-specific install steps, and dsmonitor's auto-generated LHCI config. From `dsmonitor` 0.4.2, `CHROME_PATH` is auto-exported via `chrome-launcher`. From `dsmonitor` 0.5.0, the LHCI `lighthouserc.js` is auto-generated from `dsmonitor.config.ts` (the old `dsmonitor/lighthouse/config.js` with hard-coded PAGES is gone).

---

## 0. LHCI config 자체 동적 생성 (0.5.0+)

dsmonitor 자체 안 `runLighthouse()` 진입 시점에 LHCI config 자체 자세 동적 생성:

- 위치: `node_modules/.cache/dsmonitor/lighthouserc.js` (cwd 기준)
- source: `dsmonitor.config.ts` 안 `lighthouse.{baseUrl, pages, runs, auth, advanced}` 자체 자세
- LHCI default options (desktop preset / 1350×940 / 4 카테고리 / disableStorageReset 자동) 자체 + `lighthouse.advanced` 자체 deep-merge
- 외부 사용자 자체 본 파일 자체 직접 정정 X — 매 측정 시점 자세 재생성 (수정 자체 자세 자세 자체 자세 자세)

옛 0.4.x 안 `dsmonitor/lighthouse/config.js` 자체 흐름 = 폐기. 본 파일 자체 잔존 = dsmonitor 자체 read 안 함 자연 무시 (삭제 권고).

자세 흐름 자세 자세:

```
dsmonitor.config.ts 안 lighthouse 자체
   ↓ src/cli.ts 안 runLighthouse()
   ↓ writeLighthouseTempConfig()
node_modules/.cache/dsmonitor/lighthouserc.js (자동 생성)
   ↓ DSMONITOR_LIGHTHOUSE_CONFIG_PATH 자체 env inject
   ↓ lighthouse/run.js
   ↓ npx --no-install lhci autorun --config=<temp-path>
LHCI 측정 진입
```

---

## 1. 흐름 자체 — `@lhci/cli` 안 Chrome 감지 자세

`@lhci/cli` (transitive: `chrome-launcher`) = 시스템 안 Chrome / Chromium / Brave 자체 자동 감지. `puppeteer` 자체 self-host X — Chrome 자체 사전 install 필수.

`@lhci/cli` 안 `determineChromePath()` source 흐름:

```
options.chromePath
  || process.env.CHROME_PATH                 ← dsmonitor 0.4.2 안 자동 export
  || PuppeteerManager.getChromiumPath(...)   ← puppeteer 자체 install 시점만
  || chrome-launcher.Launcher.getInstallations()[0]
  || undefined
```

→ 옛 흐름 (0.4.1 이하) 안 일부 환경 (옛 chrome-launcher version + 최신 macOS + 사용자 권한 Chrome install path 조합) 안 `getInstallations()` 빈 배열 반환 → healthcheck fail.

→ 새 흐름 (0.4.2+) = `lighthouse/run.js` 자체 안 `chrome-launcher` 호출 + `installations[0]` 자동 export. `@lhci/cli` 안 두 번째 source (`process.env.CHROME_PATH`) 자연 활용 → healthcheck 통과.

**EN —** `@lhci/cli` resolves Chrome by trying (1) `options.chromePath`, (2) `process.env.CHROME_PATH` (auto-set by `dsmonitor` 0.4.2+), (3) `PuppeteerManager.getChromiumPath()` (only when `puppeteer` is installed), and (4) `chrome-launcher.Launcher.getInstallations()[0]`. Some environments cause (4) to return an empty array; (2) bypasses that.

---

## 2. OS별 Chrome 사전 install

### macOS

```bash
# Homebrew (권고):
brew install --cask google-chrome

# 또는 공식 download:
#   https://www.google.com/chrome/
```

표준 install path = `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. chrome-launcher 자체 자동 감지.

옛 install brand 호환:
- Google Chrome Canary — `/Applications/Google Chrome Canary.app/...`
- Chromium — `brew install --cask chromium`
- Brave — `brew install --cask brave-browser`

### Linux (Debian / Ubuntu)

```bash
# Google Chrome (권고):
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# 또는 Chromium (Snap / apt):
sudo apt-get install -y chromium-browser
```

### Linux (Fedora / RHEL)

```bash
sudo dnf install -y google-chrome-stable
```

### Windows

```powershell
# Chocolatey (권고):
choco install googlechrome

# 또는 직접 download:
#   https://www.google.com/chrome/
```

표준 install path = `C:\Program Files\Google\Chrome\Application\chrome.exe`.

### Docker

`node:20-bookworm-slim` base 안 Chromium 사전 install:

```dockerfile
FROM node:20-bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Chrome 자체 표준 path 아니면 명시:
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npx", "dsmonitor", "audit", "--all"]
```

핵심:
- `chromium` 자체 install
- `CHROME_PATH` 환경변수 명시 (Docker 안 chrome-launcher 자체 감지 fail 케이스 사전 회피)
- `--no-sandbox` 흐름 필요 시점에 `lighthouse/config.js` 안 `puppeteerLaunchOptions.args: ["--no-sandbox", "--disable-setuid-sandbox"]` 누적

---

## 3. `CHROME_PATH` 환경변수 자세

### 자동 export 흐름 (0.4.2+ default)

`lighthouse/run.js` 진입부 안 `chrome-launcher.Launcher.getInstallations()[0]` 자동 export. 외부 사용자 자체 명시 X 자연 작동.

log 예시:
```
[lighthouse] CHROME_PATH auto-set: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

### 사용자 자체 명시 흐름 (자동 export 우선 비활성)

옛 default 본문 안 또는 사내 환경 안 Chrome 다른 path install 케이스:

```bash
# dsmonitor/.env.local 안 추가:
CHROME_PATH=/path/to/chrome/binary

# 또는 명시 export:
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npx dsmonitor audit --only lighthouse
```

사용자 명시 시점 = `lighthouse/run.js` 안 자동 export 흐름 skip (옛 명시 값 자체 우선).

### chrome-launcher 자체 검증 명령

dsmonitor 진입 전 chrome-launcher 자체 호출 결과 검증:

```bash
node -e "console.log(require('chrome-launcher').Launcher.getInstallations())"
```

기대 결과 (1개 이상 path):
```
[
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
]
```

빈 배열 `[]` 반환 = Chrome 자체 미감지. install 필요 또는 `CHROME_PATH` 명시 진입.

---

## 4. CI 환경 자세

### GitHub Actions

`ubuntu-latest` runner = Chrome 자연 사전 install 끝. 별도 진입 X 자연 작동.

```yaml
name: dsmonitor
on: [push]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx dsmonitor audit --all
        env:
          LIGHTHOUSE_BASE_URL: ${{ secrets.LIGHTHOUSE_BASE_URL }}
          FIGMA_API_TOKEN: ${{ secrets.FIGMA_API_TOKEN }}
```

`macos-latest` runner = Google Chrome 자연 사전 install 끝.

### Jenkins

Jenkins worker (Linux) 안 Chrome 사전 install:

```bash
# worker 안 한 번 만 진입:
sudo apt-get install -y google-chrome-stable

# 또는 Docker base 안 한 번 build:
docker build -t jenkins-agent-with-chrome -f Dockerfile.agent .
```

Jenkinsfile 안 명시:
```groovy
pipeline {
  agent { docker { image 'jenkins-agent-with-chrome' } }
  stages {
    stage('audit') {
      steps {
        withCredentials([
          string(credentialsId: 'lighthouse-base-url', variable: 'LIGHTHOUSE_BASE_URL'),
          string(credentialsId: 'figma-api-token', variable: 'FIGMA_API_TOKEN'),
        ]) {
          sh 'npm ci'
          sh 'npx dsmonitor audit --all'
        }
      }
    }
  }
}
```

### GitLab CI / 다른 환경

자세 흐름 안 다른 환경 (`gitlab-ci.yml` / Bitbucket Pipelines / CircleCI) 모두 같은 흐름 — base image 안 Chrome 사전 install 또는 `before_script` 안 install 진입 + `CHROME_PATH` 환경변수 명시.

---

## 5. 사내 환경 안 다른 path install 케이스

사내 보안 정책 안 표준 `/Applications/` 또는 `/usr/bin/` 외 다른 path 안 Chrome install 케이스:

```bash
# 자세 검증:
ls -la /opt/google/chrome/google-chrome
# /opt/google/chrome/google-chrome 안 실제 binary 발견

# dsmonitor/.env.local 안 명시:
CHROME_PATH=/opt/google/chrome/google-chrome
```

chrome-launcher 자체 = OS별 표준 path 자동 감지. 표준 외 path = 자동 감지 fail → `CHROME_PATH` 명시 필수.

---

## 6. 진입 시점 안 흔한 에러 + 정정

### `Chrome installation not found` healthcheck fail

원인 = chrome-launcher 자체 감지 fail. 정정 흐름:

1. dsmonitor 0.4.2+ install 확인 (`npm view dsmonitor version` = 0.4.2 이상)
2. Chrome 자체 install 확인 (§2 OS별 install)
3. chrome-launcher 자체 검증 (§3 검증 명령)
4. 사내 환경 = `CHROME_PATH` 명시 (§5)

### `The "path" argument must be of type string. Received undefined`

원인 = healthcheck 안 chromePath 자체 undefined → `fs.accessSync(undefined)` fail.

정정 = 위 healthcheck fail 흐름 일관.

### `ENOENT: no such file or directory` 안 chromium

원인 = Docker / CI 안 chromium binary 자체 install 안 됨.

정정 = §2.5 Docker / §4 CI 환경 자체 install 흐름 진입.

---

## 7. 옛 lineage 안내 (참고용)

옛 0.3.x 시절 안 Plan B Puppeteer 자동 로그인 흐름 = portal-gateway 어댑터 자체 (옛 lineage 참고용). 자세 흐름 = dsmonitor README "Lighthouse 인증 흐름" sub-section + (외부 사용자 환경 안) `dsmonitor/lighthouse/plan-b.md` 옛 안내 (옵션).

dsmonitor 패키지 자체 = LHCI `puppeteerScript` 인터페이스 호환 어댑터 흐름 (basic / custom). 옛 portal-gateway 어댑터 본문 = 본 인터페이스 호환 그대로 활용 가능 — `dsmonitor.config.ts` 안 `lighthouse.auth = { type: "custom", adapter: "./lighthouse/auth/portal-gateway.js" }` 한 줄 진입.
