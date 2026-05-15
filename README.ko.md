[English](./README.md) | **한국어**

# dsmonitor

> UI Health Monitoring Framework — 코드베이스, 스타일, 디자인의 일관성을 정량으로 측정하는 도구입니다.

이 문서는 한국어 정본입니다. 0.5.1 시점에는 **설치 / 빠른 시작 / 설정 핵심 필드** 세 항목만 한국어로 정리되어 있고, 그 외 항목은 [영문 README](./README.md)를 참고해 주세요. 후속 패치에서 점진적으로 한국어 정본을 늘려갈 계획입니다.

**dsmonitor는 측정 도구**입니다 (개선 도구가 아닙니다). 분석 결과를 baseline JSON과 markdown 리포트로 출력합니다.

![dsmonitor dashboard](docs/images/dashboard.png)

## 측정 항목

| 항목       | 분석 대상                                                                                                                                          | 출력                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| code       | TS / JS / JSX 코드베이스의 정적 분석 (forbidden class, DS coverage, TS migration, hardcoded color, SCSS 변수 준수율, 마이그레이션 후보, orphan 등) | `dsmonitor/reports/baseline-*.json`, `dsmonitor/docs/baseline.md` |
| figma      | DS 파일의 Styles / Components 카운트, 도메인 파일 INSTANCE의 출처 미상 비율, DS ↔ 코드 토큰 매트릭스                                               | 위 JSON의 `figma` 필드                                            |
| lighthouse | 페이지별 Performance / Accessibility / Best Practices / SEO 점수                                                                                   | `dsmonitor/lighthouse/reports/YYYY-MM-DD/`                        |

## 설치

```bash
npm install --save-dev dsmonitor
```

ESLint 플러그인을 함께 쓰는 경우에는 wrapper 패키지 `eslint-plugin-dsmonitor` 도 함께 설치합니다. ESLint legacy 설정 (`.eslintrc.js`) 의 `eslint-plugin-{name}` 자동 해석 규칙을 만족시키기 위해 별도 패키지로 배포되고 있습니다.

```bash
npm install --save-dev dsmonitor eslint-plugin-dsmonitor
```

선택 의존성 (peer optional — 실제로 사용하는 경우에만 설치):

| 의존성                          | 설치 시점                                       | 명령                                                |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `eslint` >= 8                   | dsmonitor ESLint 플러그인을 사용하는 경우       | `npm install --save-dev eslint`                     |
| `eslint-plugin-dsmonitor`       | dsmonitor ESLint 플러그인을 사용하는 경우       | `npm install --save-dev eslint-plugin-dsmonitor`    |
| `@lhci/cli` >= 0.13             | Lighthouse 측정을 사용하는 경우                 | `dsmonitor init` 실행 시 자동 설치                  |
| `typescript` >= 5.0             | `dsmonitor.config.ts` 를 직접 작성하는 경우     | 대개는 이미 설치되어 있습니다                       |

## 빠른 시작

### 1. 부트스트랩 (`dsmonitor init`)

```bash
npx dsmonitor init
```

→ 인터랙티브 프롬프트로 다음을 묻습니다.

- Lighthouse 측정을 사용하시겠습니까? (Y 를 선택하면 `@lhci/cli` 가 자동 설치됩니다.)
- Figma 측정을 사용하시겠습니까? (Y 를 선택하면 설정 파일에서 토큰만 치환합니다.)

→ 자동으로 생성되는 파일:

- `dsmonitor/dsmonitor.config.ts` (선택한 옵션에 맞춰 토큰이 치환된 상태)
- `dsmonitor/.env.local.example`
- `dsmonitor/reports/.gitkeep`

수동으로 부트스트랩하는 경우의 디렉토리 구조:

```
my-project/
└── dsmonitor/
    ├── dsmonitor.config.ts        ← presets 와 설정을 직접 작성합니다
    ├── .env.local                 ← gitignored. LIGHTHOUSE_* / FIGMA_API_TOKEN
    ├── .env.local.example
    ├── reports/                   ← 측정 결과 JSON 이 자동으로 출력됩니다
    └── lighthouse/                ← Lighthouse = Y 인 경우에만 생성됩니다
        ├── config.js              ← LHCI 설정 (init 단계에서 자동 생성됨)
        └── auth/custom.js         ← 커스텀 인증 어댑터를 쓰는 경우에만
```

### 2. init 이후 `.env.local` 작성

`.env.local.example` 의 키들을 실제 값으로 채워서 `dsmonitor/.env.local` 로 복사합니다.

```bash
cp dsmonitor/.env.local.example dsmonitor/.env.local
# 편집기로 열어서 실제 값을 입력하세요.
```

| 변수                          | 인증 방식           | 용도                                                                                       |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| `FIGMA_API_TOKEN`             | —                   | Figma 측정을 사용할 때 필요합니다 (`figmaAnalysis = true`). Figma → Settings → Personal access tokens 에서 발급합니다. |
| `LIGHTHOUSE_BASE_URL`         | none / basic / custom | Lighthouse 측정 대상의 base URL. 환경을 전환할 때는 이 값 하나만 바꾸면 됩니다.            |
| `LIGHTHOUSE_LOGIN_URL`        | basic               | 로그인 페이지 경로 (예: `/login`) 또는 절대 URL.                                           |
| `LIGHTHOUSE_TEST_ID`          | basic               | 테스트 계정 ID — basic 어댑터가 읽습니다.                                                  |
| `LIGHTHOUSE_TEST_PW`          | basic               | 테스트 계정 비밀번호 — basic 어댑터가 읽습니다.                                            |
| `LIGHTHOUSE_BASIC_SELECTOR_*` | basic (선택)        | basic 어댑터의 기본 셀렉터를 덮어씁니다 — `ID_INPUT` / `PW_INPUT` / `SUBMIT` 세 가지.       |

- `.env.local` 은 `.gitignore` 에 추가하기를 권합니다 (민감 정보).
- 커스텀 어댑터를 사용하는 경우에는 변수를 자유롭게 정의해도 됩니다. 어댑터 본문에서 읽는 변수와 `.env.local.example` 의 안내 줄을 일치시켜 두세요.

### 3. init 이후 `dsmonitor.config.ts` 작성

`dsmonitor init` 으로 만들어진 `dsmonitor/dsmonitor.config.ts` 에서 다음 항목을 프로젝트 환경에 맞게 채웁니다.

- `projectRoot` — 대개 `..` 을 그대로 두면 됩니다 (`dsmonitor/` 폴더의 한 단계 위).
- `scan.include` / `scan.exclude` — 분석 대상과 제외 경로를 프로젝트 폴더 구조에 맞춰 적어 둡니다.
- `figma.designSystemFiles` 와 `figma.domainFiles` — Figma file key 를 입력합니다 (Figma 측정을 쓸 때). Figma URL 의 `https://www.figma.com/design/<fileKey>/...` 부분에서 그대로 가져옵니다.
- `lighthouse.baseUrl` — Lighthouse 측정 대상 URL 입니다. init 단계에서는 `.env.local` 의 `LIGHTHOUSE_BASE_URL` 을 읽는 형태로 작성되며, 필요하면 하드코딩해도 됩니다.
- `lighthouse.pages` — 측정 대상 페이지 목록 (path + name).
- `lighthouse.auth` — 인증 방식 (상세 설명은 [영문 README](./README.md#lighthouse--%EC%9D%B8%EC%A6%9D-%EC%96%B4%EB%8C%91%ED%84%B0--authentication-adapter) 의 Lighthouse Auth Flow 항목을 참고해 주세요).

Figma 설정의 상세 가이드는 [docs/figma-config-guide.md](./docs/figma-config-guide.md) 에 있습니다.

## 설정 — 핵심 필드 안내

`dsmonitor/dsmonitor.config.ts` 의 핵심 필드입니다.

- `projectRoot` — 프로젝트 루트의 상대 경로 입니다. `dsmonitor/` 폴더를 기준으로 보통 `..` 으로 두면 됩니다.
- `scan` — 분석 대상과 제외 경로 입니다.
- `designSystem.officialPaths` / `officialAliases` — 디자인 시스템의 디렉토리 경로와 import alias 입니다.
- `hardcodedValues` — 하드코딩된 색상을 잡는 정규식과, SCSS 변수의 사용 / 정의 패턴 입니다.
- `migrationTargets` — native HTML 태그를 어떤 DS 컴포넌트로 대체할지 매핑하는 표 입니다. (형식과 예시는 `dsmonitor init` 으로 생성되는 템플릿 주석에서 확인할 수 있습니다.)
- `stylingPolicy` — `presets/` 의 네 가지 프리셋 중 하나를 골라 require 합니다.
- `metrics` — 측정 항목별 ON / OFF 토글 입니다.
- `figma` / `lighthouse` — 선택 옵션 입니다. Figma 측정을 쓰려면 `FIGMA_API_TOKEN` 환경변수가 필요합니다.
- `thresholds` — good / warn 임계값 입니다.
- `reportStatus` — Phase 진척 배지 표시용 입니다.
- `measurementHistory` — 측정 도구 자체의 변경 이력 입니다 (최신 항목이 위로 오는 역순 정렬).

전체 옵션 설명과 환경별 설정 스케치, ESLint 플러그인 사용법, 출력물 위치, 추가 읽을거리는 [영문 README](./README.md) 를 참고해 주세요.

## 라이선스

MIT — [LICENSE](./LICENSE)
