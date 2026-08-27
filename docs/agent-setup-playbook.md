# dsmonitor 에이전트 세팅 플레이북 (정본)

> 이 문서는 **코딩 에이전트(Claude Code, Codex 등)를 위한 지시서**입니다. 사용자가
> "dsmonitor 설정해줘" 류의 요청을 하면, 에이전트는 이 문서를 끝까지 읽고 그대로
> 수행합니다. 이 문서가 유일한 정본이며, 프로젝트에 설치된 어댑터
> (`.claude/skills/dsmonitor-setup/SKILL.md`, `AGENTS.md` 블록) 는 여기로 오는
> 포인터일 뿐입니다. 사람 독자는 README 의 "AI 에이전트로 세팅하기" 섹션을 보세요.

## 목표

사용자 프로젝트 리포지토리를 검토해 `dsmonitor/dsmonitor.config.ts` 를 완성하고,
`doctor` 검증과 `audit --only code` 실측까지 통과시킨다. 리포만으로 알 수 없는
값(Figma URL·토큰, Lighthouse URL·계정)은 **지어내지 말고 사용자에게 질문**한다.

## 0. 패키지 루트 해석 (모든 자료 경로의 기준)

```bash
node -e "console.log(require('path').dirname(require.resolve('dsmonitor/package.json')))"
```

이 경로를 `<pkg>` 라 부른다. 실패하면 dsmonitor 미설치이므로 먼저 설치를 안내/실행:
`npm install --save-dev dsmonitor` (yarn/pnpm 프로젝트면 해당 명령).

읽어 둘 자료 (전부 `<pkg>` 안에 있음):

| 자료 | 용도 |
|---|---|
| `<pkg>/presets/configs/*.ts` | 스택별 **완성 config 예시 3종** (few-shot) — vite-react-tailwind / next-pages-scss / next-app-css-modules |
| `<pkg>/presets/*.js` | stylingPolicy preset 4종 본문 + `_tailwind-detect.js` (Tailwind 클래스 감지 패턴) |
| `<pkg>/templates/dsmonitor.config.ts.tpl` | config 전체 필드와 주석 (스키마 문서 역할) |
| `<pkg>/README.md` §7 | 각 필드의 정의·규칙 (특히 §7.3 stylingPolicy, §7.8 migrationTargets, §7.11 figma) |
| `<pkg>/docs/figma-config-guide.md` | Figma 측정 설정 상세 |

## 1. 리포 탐색 — 무엇을 보고 무엇을 결정하는가

**config 를 쓰기 전에** 아래를 순서대로 조사한다. 각 항목은 "증거 → 결정" 형태로
기록해 두고, 마지막 보고에서 사용자에게 요약한다 (추정한 항목은 추정임을 밝힌다).

### 1-1. stylingPolicy preset 선택 (4종 중 1)

| 증거 | 결정 |
|---|---|
| package.json 에 `tailwindcss` 의존 + 유틸리티 클래스가 실제 JSX 에서 다수 사용 | `dsmonitor/presets/tailwind-project.js` |
| `*.module.{css,scss}` 파일이 스타일의 주류 | `dsmonitor/presets/css-modules-project.js` |
| `bootstrap`/`react-bootstrap`/`reactstrap` 의존 + `btn-*`/`d-*` 클래스 사용 | `dsmonitor/presets/bootstrap-project.js` |
| 그 외 — `.scss`/`.css` 클래스 기반 스타일링 (전역 CSS 포함) | `dsmonitor/presets/scss-project.js` |

혼재 프로젝트(예: Tailwind 도입 중 + 레거시 SCSS 잔존)는 **"프로젝트가 지향하는
방식"** 이 preferred 다 — 최근 커밋·신규 파일이 어느 쪽인지로 판단하고, 확신이
없으면 사용자에게 묻는다 ("정식 스타일링 방식이 무엇인가요?"). preset 이 딱 맞지
않으면 README §7.3 의 custom StylingPolicy 작성 경로를 쓴다.

### 1-2. scan (codeRoots / styleRoots / ignore / exts)

- `codeRoots`: 컴포넌트 소스가 실제로 사는 최상위 폴더 (`src`, `app`, `packages/*/src` 등 — 실존 확인).
- `styleRoots`: 스타일 파일이 사는 폴더.
- `ignore`: 빌드 산출물(`dist`, `build`, `.next`, `out`), `node_modules`, 스토리북 산출물, 테스트 스냅샷 등 — 빌드 도구를 보고 결정 (Vite→`dist`, CRA→`build`, Next→`.next`).
- `codeExts`/`styleExts`: 실존 파일 확장자 분포로 (`.tsx` 만인지 `.jsx` 혼재인지).

### 1-3. designSystem (officialPaths / officialAliases) — doctor 가 error 로 잡는 항목

- `officialPaths`: 디자인시스템(공용 UI) 컴포넌트 폴더의 glob. `src/components/ds/**`, `src/design-system/**`, `packages/ui/**` 류를 실제로 찾아서 지정. **glob 이 실파일에 매치되는지 확인** (doctor 가 0매치를 error 처리).
- `officialAliases`: `tsconfig.json` `compilerOptions.paths`, vite `resolve.alias`, webpack alias 를 파싱해 DS 를 가리키는 import 접두어를 도출 (예: `@ds/`, `@/components/ds/`).
- DS 폴더가 아예 없는 프로젝트면 사용자에게 확인 후 `metrics.dsCoverage: false` 로 끈다.

### 1-4. globalStyleSources / hardcodedValues.scssVariableDefFiles

- `globalStyleSources`: "여기 정의된 클래스는 정상 재사용" 으로 취급할 전역 스타일 파일 glob. 앱 진입점에서 import 되는 전역 CSS/SCSS 를 추적해 지정.
- `scssVariableDefFiles`: 토큰(변수) **정의** 파일 목록 — 하드코딩 색상 카운트의 분모에서 제외할 파일. 토큰 정의 파일을 전수 탐색해 나열 (`tokens.css`, `variables.scss`, `@theme` 블록이 있는 파일 등).

### 1-5. figma.codeTokens.parsers

코드 토큰 정의가 사는 곳에 맞춰 파서 배열 구성 (복수 등록 가능):
- SCSS 변수/맵 → `{ type: "scss", files: [...] }`
- 순수 CSS `--*` 정의 (Tailwind v4 `@theme` 포함) → `{ type: "cssVariables", files: [...] }`
- Tailwind v3 config → `{ type: "tailwind", config: "tailwind.config.ts" }`

### 1-6. migrationTargets (가장 노동집약적 — 후보 제시 후 사용자 확정)

레거시→DS 이관을 추적할 대상. 리포에서 후보를 찾는 법:
- DS 컴포넌트 이름 목록 (officialPaths 안 파일명) 을 뽑고,
- 같은 역할의 native 태그/레거시 컴포넌트 사용을 grep (`<button`, `<input`, 옛 공용 컴포넌트 import).
- README §7.8 형식으로 후보 표를 만들어 **사용자에게 제시하고 무엇을 추적할지 확정받는다** — 무엇을 "없애려는 대상" 으로 볼지는 비즈니스 의도라 리포만으로 확정 불가.
- 사용자가 관심 없다면 빈 객체 + `metrics.migrationCandidates: false`.

### 1-7. framework / metrics

- `framework.id`: 현재 `"react"` 만 지원 — React 프로젝트가 아니면 여기서 중단하고 사용자에게 지원 범위를 알린다.
- `metrics.tsMigration`: 순수 TS 프로젝트(JS 파일이 사실상 없음)면 `false`.
- figma/lighthouse 메트릭은 2절의 외부 입력 확보 여부에 따라.

## 2. 외부 입력 — 사용자에게 질문할 것 (지어내기 금지)

다음은 리포에 없다. **한 번에 모아서** 질문한다 (하나씩 여러 번 묻지 말 것):

1. **Figma 측정을 켤지** — 켠다면: DS 파일 Figma URL(들)과 label, (DS 2개 이상이면) primary 지정, 도메인(시안) 파일 URL, 그리고 `FIGMA_API_TOKEN` 발급 안내 (Figma → Settings → Security → Personal access tokens, File content read-only). **토큰 값은 받지 말고** 사용자가 직접 `dsmonitor/.env.local` 에 넣도록 안내한다.
2. **Lighthouse 측정을 켤지** — 켠다면: 실행 중인 dev 서버 base URL (Next/Vite 기본 포트로 추정치 제시 가능), 인증 방식(none/basic/custom), basic 이면 테스트 계정은 사용자가 `.env.local` 에 직접.
3. **migrationTargets 확정** (1-6 의 후보 표에 대한 답).

반자동 항목 (리포 힌트 + 확인):
- `lighthouse.pages`: Next `app/`/`pages/` 라우트 트리에서 경로 후보를 추출해 제시 — 동적 세그먼트(`[id]`)와 인증 필요 페이지는 사용자 판단.
- `figma.tokenNameMapping`: Figma 변수명과 코드 CSS 변수명의 규약이 다르면 필요 (README §7.11.3). 코드 쪽 접두어(`--myds-`)는 리포에서 추출 가능하고, **dsforge 로 만든 프로젝트면** descriptor 의 `tokenCssNaming` 을 §7.11.3 변환표로 기계 변환. 그 외에는 첫 figma 측정에서 매칭 0% 가 보이면 그때 제안.

## 3. 스캐폴딩 — init 비대화형 실행

조사·질문이 끝나면 실행 (프롬프트 없음):

```bash
npx dsmonitor init --yes [--figma] [--lighthouse --auth <none|basic|custom>] [--skip-install]
```

- `--yes` 단독은 figma/lighthouse **off** 기본 — 사용자가 켜기로 한 것만 플래그로 켠다.
- 기존 config 가 있으면 `--yes` 는 덮어쓰지 않고 종료한다. 사용자가 재생성을 원할 때만 `--force`.
- yarn/pnpm 프로젝트에서 lighthouse 를 켤 때는 `--skip-install` 후 해당 패키지 매니저로 `@lhci/cli` 를 직접 설치.

생성물: `dsmonitor/dsmonitor.config.ts`, `dsmonitor/.env.local.example`, `dsmonitor/reports/`, (custom auth 시) `dsmonitor/lighthouse/auth/custom.js`.

## 4. config 작성

1. `<pkg>/presets/configs/` 에서 **스택이 가장 가까운 완성 예시를 먼저 읽는다.**
2. 생성된 `dsmonitor/dsmonitor.config.ts` 를 1절에서 결정한 값으로 채운다. 주의:
   - config 파일은 `dsmonitor/` 폴더 안에 있고 `projectRoot: ".."` — **모든 경로는 프로젝트 루트 기준 상대 경로**.
   - stylingPolicy 는 preset import 한 줄 교체 (custom 이면 README §7.3 형식으로 직접 작성).
   - 모르는 필드를 지어내지 말 것 — 템플릿 주석과 README §7 에 없는 필드는 쓰지 않는다.
3. `.env.local` 은 **사용자가 직접** 만든다 (`cp dsmonitor/.env.local.example dsmonitor/.env.local` 안내 + `.gitignore` 등재 확인). 에이전트가 실제 토큰/비밀번호를 파일에 쓰지 않는다.

## 5. 자기검증 루프 — doctor

```bash
npx dsmonitor doctor --json
```

`summary` 의 error 가 0 이 될 때까지 config 를 수정하며 반복한다. 카테고리별 대응:

| category | 대응 |
|---|---|
| `scan.codeRoots` | 폴더 오타/부재 — 실존 폴더로 수정 |
| `stylingPolicy` | preferred 가 allowed[].id 에 없음 — preset/custom 정의 확인 |
| `designSystem.officialPaths` | glob 0매치 (error) — 실파일에 매치되게 수정, DS 없으면 dsCoverage off |
| `codeTokens.parsers` | 파서 files/config 경로 부재 — 1-5 재확인 |
| `figma.url` | Figma "Copy link" 형식 아님 — 사용자에게 올바른 링크 재요청 |
| `figma.tokenNameMapping` | from 중복 / catch-all 2개 / to 가 `--` 미시작 — §7.11.3 규칙으로 수정 |
| `env` (FIGMA_API_TOKEN) | figmaAnalysis=true 인데 토큰 없음 — 사용자에게 .env.local 안내 (대필 금지) |

warning 은 판단 후 처리하되, 남긴 warning 은 최종 보고에 사유와 함께 명시한다.

## 6. 실측 sanity check — audit

```bash
npx dsmonitor audit --only code
```

- 스캔된 파일 수가 0 이거나 비정상적으로 적으면 → scan 설정 오류로 돌아가 수정.
- 정상 완료되면 결과 요약(스캔 파일 수, 주요 지표 값)을 사용자에게 보고한다. **측정 수치의 해석(좋다/나쁘다)은 리포트의 임계값 판정을 인용**하고, 근거 없는 평가를 덧붙이지 않는다.
- figma 를 켰고 토큰이 준비됐다면 `npx dsmonitor audit` (code+figma) 까지. Variables 조회가 403 이면 Figma 플랜 제한(Enterprise 전용)이며 정상 동작임을 사용자에게 알린다 — styles 만으로 측정이 계속된다.

## 7. 완료 보고

사용자에게 다음을 보고하고 끝낸다:
- 결정한 설정 요약 (preset, scan, officialPaths 등 — 추정 항목은 근거와 함께)
- doctor 결과 (error 0, 남은 warning 과 사유)
- audit 실측 요약
- 사용자가 직접 할 남은 일 (.env.local 토큰 입력, migrationTargets 추가 검토 등)
- 다음 명령 안내: `npx dsmonitor audit --all`, `npx dsmonitor dashboard`

## 금지 사항

- `.env.local` 에 실제 토큰·비밀번호를 에이전트가 쓰지 않는다 (사용자 몫).
- 리포에 근거 없는 값을 지어내 config 에 넣지 않는다 — 모르면 질문.
- 측정 결과를 임계값 판정 밖에서 자의적으로 해석하지 않는다.
- 이 플레이북을 프로젝트로 복사하지 않는다 — 정본은 `node_modules/dsmonitor/docs/` 에 있고 `npm update dsmonitor` 로 갱신된다.
