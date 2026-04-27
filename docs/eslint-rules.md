# ESLint Rules (eslint-plugin-ui-health)

`packages/vitaui/eslint/`에 번들링된 커스텀 ESLint 플러그인.
프로젝트 **스타일링 정책**(`stylingPolicy.js`)을 주입받아 동작한다.

## Policy Decisions

프로젝트의 스타일링 정책 결정 사항 — 이 결정이 바뀌면 `stylingPolicy.js`와 이 문서를 같이 갱신한다.

### 결정 (2026-04-20 기준)
- **정식**: SCSS (이 프로젝트는 `styles/css/scss/` 중심. DS 내부도 SCSS/reactstrap 혼합 기반)
- **레거시**:
  - **Bootstrap 유틸리티 클래스** (`btn`, `d-flex`, `mt-3`, `col-*` 등) — 정리 대상
  - **Tailwind 클래스** — 정리 대상
- **Tailwind에 대한 보충 메모**:
  - 현재 코드에 남아있는 Tailwind 잔재는 **비체계적**으로 쓰인 것들 (정식 도입 없이 일부 파일에서만 임의 사용). 이 잔재는 정식 Tailwind 도입 여부와 **별개**로 정리 대상.
  - **향후 Tailwind를 정식 도입할 가능성 있음**. 그 시점에는 이 정책 재평가:
    - `stylingPolicy.js`의 `allowed`에 `tailwind` 추가
    - `forbidden.tailwind-classes` 제거
    - `preferred`를 단일 값 → 배열로 확장하거나 `preferredFamilies` 도입 검토
    - `docs/config-examples/tailwind-project.js` 참고해서 정책 재구성
  - 재평가 트리거: 정식 Tailwind 도입 결정 / Tailwind config (`tailwind.config.js`) 추가 / DS 컴포넌트가 Tailwind 기반으로 재작성 시작

## 룰 목록 (v0.2)

### `ui-health/no-forbidden-classes`

#### 의도
프로젝트 정책에 의해 금지된 className 토큰(+ 선택적으로 금지 모듈 import)이 코드에 들어오는 것을 차단한다.
정책은 `stylingPolicy.forbidden` 배열로 주어지며, 한 룰이 **모든 금지 그룹을 통합 검사**한다.

#### 동작 방식
- JSX `className` / `class` attribute의 모든 string literal을 토큰 단위로 분해
- 각 토큰을 `forbidden[*].classPatterns` 정규식에 매치
- 매치되면 해당 `forbidden[*].label`과 함께 보고
- 선택: `forbidden[*].importModules` 지정 시 import source도 차단
- 탐지 범위:
  - `className="d-flex mt-3"` — Literal
  - `` className={`menu-item btn ${active ? 'active' : ''}`} `` — TemplateLiteral
  - `className={clsx('form-control', { 'is-invalid': err })}` — CallExpression + ObjectExpression의 **문자열 key**
  - `className={cond ? 'btn' : 'ok'}` — ConditionalExpression

#### 래칫 (심각도)
`fromPolicy(policy, { baselinePath })` 가 자동으로:
- `lint-baseline.json`에 등록된 파일 → **warn** (기존 부채)
- 그 외 파일(신규 포함) → **error**
- 베이스라인이 없으면 모든 파일 **error** (start-from-clean)

#### 예시 — 현재 프로젝트 기준 (SCSS 정식)

**❌ Before (error on new file / warn on baseline file)**
```jsx
// apps/new-feature/index.jsx
export default function Panel() {
  return (
    <div className="d-flex mt-3 justify-content-between">
      <button className="btn btn-primary">Save</button>
      <input className="form-control form-control-sm" />
    </div>
  );
}
```

ESLint 출력:
```
3:10  error  'd-flex' is forbidden (Bootstrap utility classes).                 ui-health/no-forbidden-classes
3:10  error  'mt-3' is forbidden (Bootstrap utility classes).                   ui-health/no-forbidden-classes
3:10  error  'justify-content-between' is forbidden (Bootstrap utility classes).ui-health/no-forbidden-classes
4:15  error  'btn' is forbidden (Bootstrap utility classes).                    ui-health/no-forbidden-classes
4:15  error  'btn-primary' is forbidden (Bootstrap utility classes).            ui-health/no-forbidden-classes
```

**✅ After — SCSS + DS로 교체**
```jsx
import Button from "@atoms/Button";
import Input from "@atoms/Input";
import styles from "./Panel.module.scss"; // 또는 프로젝트 SCSS 규칙

export default function Panel() {
  return (
    <div className={styles.panel}>
      <Button variant="primary" onClick={save}>Save</Button>
      <Input size="sm" />
    </div>
  );
}
```
- Bootstrap utility 클래스 **제거**
- `<button>` / `<input>` native → `Button` / `Input` DS 컴포넌트로 대체 (migration candidates 지표도 함께 감소)
- 레이아웃/간격은 SCSS 클래스(`styles.panel`)로 정의

#### 주 탐지 카테고리 (현재 policy 기준)

| forbidden.id | 대표 패턴 예시 | 설명 |
|---|---|---|
| `bootstrap-utilities` | `d-flex`, `mt-3`, `btn`, `col-6`, `text-center` | Bootstrap 5 유틸 |
| `tailwind-classes` | `text-blue-500`, `text-xl`, `rounded-md`, `items-center` | Tailwind 유틸 |

전체 패턴은 `vitaui/stylingPolicy.js` 참조.

## 임시 비활성화

### 한 줄만 비활성화
```jsx
{/* eslint-disable-next-line ui-health/no-forbidden-classes */}
<div className="d-flex">legacy reason</div>
```

### 블록 단위
```jsx
/* eslint-disable ui-health/no-forbidden-classes */
<table className="table">
  <thead className="text-center">...</thead>
</table>
/* eslint-enable ui-health/no-forbidden-classes */
```

### 파일 전체 (비추천)
```jsx
/* eslint-disable ui-health/no-forbidden-classes */
```

### 남용 방지
- `eslint-disable` 주석은 **이유 주석을 함께** 쓴다: `eslint-disable-next-line ui-health/no-forbidden-classes -- 3rd party <Tooltip> 요구사항`
- 일시적 회피는 PR description에 기록
- 가능하면 `lint-baseline.json` 재생성으로 기존 위반을 warn으로 돌리는 쪽이 기록 추적에 유리

## 설정 방법

루트 `.eslintrc.js`:
```js
const { fromPolicy } = require("eslint-plugin-ui-health");
const stylingPolicy = require("./vitaui/stylingPolicy");

module.exports = {
  extends: ["next/core-web-vitals"],
  ...fromPolicy(stylingPolicy, {
    baselinePath: "./vitaui/lint-baseline.json",
  }),
};
```

정책 교체 (이식) 시: `stylingPolicy.js` 내용만 바꾸면 된다. 룰 코드는 건드릴 필요 없음.

## 베이스라인 파일 두 종류

이 프로젝트에는 **서로 다른 목적의 baseline 파일 두 개**가 있다. 혼동 주의.

| 파일 | 역할 | 생성 | CI 블로킹 |
|---|---|---|---|
| `lint-baseline.json` | 파일별 위반 수 맵. ESLint **심각도 오버라이드**(warn/error)에 사용 | (별도 생성 미지원 — `lint:update-baseline` 와 분리된 트랙. 자세한 건 ratchet 작업 시 별도 결정) | — (룰 자체의 심각도만 제어) |
| `.lint-baseline.json` | **Soft baseline** — 전체 카운트 + breakdown + per-file 스냅샷. `lint:summary`가 비교에 사용 | `npm run lint:update-baseline` (루트) | ❌ Phase 1에서는 비차단 |

### 언제 갱신하는가
- **`lint-baseline.json`**: 기존 위반 파일을 정리한 뒤. 갱신하면 해당 파일이 baseline에서 빠져서, 이후 같은 파일에서 위반 재발 시 **error**로 뜬다.
- **`.lint-baseline.json`**: 정리 작업으로 전체 수가 줄거나, 불가피하게 늘어야 할 때. baseline을 의식적으로 이동시키는 기록.

## Soft Baseline 메커니즘 (Phase 1: 가시화)

현재 CI는 `ui-health/no-forbidden-classes` 위반으로 차단하지 않는다. 대신 `lint:summary` 가 baseline 대비 변동을 표시한다.

### `.lint-baseline.json` 스키마
```json
{
  "maxWarnings": 984,
  "updatedAt": "2026-04-20T...",
  "note": "Initial baseline — Phase 1 (가시화)",
  "breakdown": {
    "Bootstrap utility classes": 982,
    "Tailwind utility classes": 2
  },
  "stats": { "rule": "ui-health/no-forbidden-classes", "filesWithViolations": 254 },
  "files": { "apps/login/index.jsx": 31, ... }
}
```

### `lint:summary` 출력 예 (증가 감지)
```
================================================================
 VitaUI — Lint Summary (soft, non-blocking)
================================================================
 rule: ui-health/no-forbidden-classes

 Baseline:  984  (updated 2026-04-20T...)
            breakdown: Bootstrap utility classes=982, Tailwind utility classes=2

 Current:   987  (warn=984, error=3)
            breakdown: Bootstrap utility classes=985, Tailwind utility classes=2
            files contributing: 255

 Delta:     +3  ↑

 Increased files (capped at 15):
   +3  (now 3)  components/__new_file__.jsx
================================================================
```
→ **exit code는 항상 0**. 경고만 남기고 파이프라인 진행.

### 해야 할 일 (PR에서 summary 가 +N을 띄우면)
1. **기본**: diff에 들어간 `btn`, `d-flex`, `text-xl` 등 레거시 클래스를 DS 컴포넌트 + SCSS로 교체.
2. **불가피하면** 의식적으로 baseline 상향:
   ```bash
   npm run lint:update-baseline -- --note "3rd party Chart 위젯이 Bootstrap 클래스 요구"
   git add vitaui/.lint-baseline.json
   ```
   PR description에도 이유 기재.

### Soft baseline 설정 위치
- config 필드: `vitaui.config.ts` → `softBaseline: { path: "./.lint-baseline.json" }`
- CLI override: `--baseline <path>`
- env override: `VITAUI_LINT_BASELINE=<path>`
- 파일 없음 → `lint:summary`는 "baseline 없음" 안내 후 그대로 종료. **신규 프로젝트에서는 `npm run lint:update-baseline` 한 번만 돌리면 시작**.

### 현재 프로젝트 수치
- `maxWarnings`: 984 (bootstrap-utilities 982 + tailwind-classes 2)
- 254 파일이 기여
- 줄이는 건 **목표**, 지금은 **증가 감시**에 집중.

## Adoption Phases

팀 문화와 부채 감소 추세에 맞춰 단계적으로 강도를 높인다. 현재 Phase 1.

| Phase | 상태 | 동작 | CI 처리 | 전환 조건 |
|---|---|---|---|---|
| **1 (현재)** | 가시화 | `lint:summary`가 baseline 대비 변동 출력 | ❌ 차단 안 함 (exit 0) | — |
| **2** | 리포트 자동 발송 | summary 결과를 Slack/메일 등 사내 채널로 자동 전달 | ❌ 차단 안 함 | `lint:summary`가 1~2주 이상 꾸준히 팀에 visible 해진 뒤 |
| **3** | CI 경고 | summary 출력 + delta > 0 이면 CI UI에서 경고 배지 (non-blocking warning) | ❌ 차단 안 함 | Phase 2에서 팀이 경고를 읽고 반응하는 문화가 자리잡은 뒤 |
| **4** | CI 차단 | delta > 0 이면 exit 1. PR 병합 차단 | ✅ 차단 | 아래 체크리스트 참조 |

### Phase 4 전환 체크리스트
- [ ] baseline이 초기 대비 **50% 이상 감소** 했는가?
- [ ] 최근 3개월간 **delta 증가 빈도 < 10%**?
- [ ] 팀이 `lint:summary` 출력을 정기적으로 확인하고 있는가?
- [ ] baseline 갱신 PR이 적절한 빈도로 발생하는가?
- [ ] 팀 회의에서 **차단 도입 합의**를 얻었는가?

3개 이상 만족 + 2주 공지 기간 이후 전환. 전환 방법과 플랫폼별 CI 설정 예시는 **[eslint-ci-integration.md](./eslint-ci-integration.md)** 참조.

## Scripts (루트 package.json)

| 명령 | Phase | 용도 |
|---|---|---|
| `npm run lint` | 전 Phase | 개발 중 `next lint` 전체 실행. 경고/에러 그대로 표시 |
| `npm run lint:summary` | 1~3 | baseline 대비 현재 수치와 delta 출력. **항상 exit 0** |
| `npm run lint:update-baseline` | 전 Phase | 현재 수치로 `.lint-baseline.json` 재생성. 옵션 `-- --note "이유"` |

Phase 4 도입 시 `lint:ci` 추가. [eslint-ci-integration.md](./eslint-ci-integration.md) 참고.

## 알려진 한계

1. **동적으로 생성된 className**은 탐지 불가
   ```jsx
   const cls = `d-${type}`; // type이 런타임에 결정 → 탐지 안 됨
   ```
2. **문자열 연결 불완전 지원** — `"btn " + variant` 같은 concat은 `"btn "` 부분만 검사
3. **변수에 담긴 className** — `const C = "d-flex"; <div className={C}>`는 탐지 안 됨 (scope 분석 미구현)
4. **CSS 파일 내부는 검사하지 않음** — 이 룰은 JSX 전용. CSS에 포함된 Bootstrap 클래스는 analyzer의 `forbiddenClassCount` 지표에서 별도 추적.

## Future Improvements

현재 시점에선 스킵된 개선 후보들. 필요 시 되살린다.

| # | 주제 | 배경 | 재검토 트리거 |
|---|---|---|---|
| 1 | `overrides.files` 배열 성능 최적화 | 베이스라인이 수천 개로 커지면 ESLint 매처 비용 증가 가능 | baseline 파일 수가 1,000 초과 또는 `next lint` 시간이 눈에 띄게 느려짐 |
| 2 | 동적 className 탐지 | 현 룰은 문자열 리터럴/템플릿만 본다. 변수에 담긴 className, 문자열 연결 미지원 | 런타임 할당으로 우회하는 사례가 다수 발견될 때 |
| 3 | 룰 그룹별 분리 | 지금은 `no-forbidden-classes` 하나가 `bootstrap-utilities`/`tailwind-classes` 모두 처리. 심각도를 그룹별로 나누려면 룰을 factory로 동적 생성해야 함 | 특정 그룹만 warn으로 유지하고 싶은 정책 요구 발생 시 |
| 4 | `forbidden[*].severity` 필드 활용 | 현재 severity는 문서/리포트용. ESLint 심각도는 baseline 여부로만 결정됨 | 정책상 "일부 그룹은 baseline 외에서도 warn으로만" 필요할 때 |
| 5 | `requireBaseline` 모드 | baseline 없는 초기 설정 시 IDE가 모든 파일 error로 시끄러울 수 있음. baseline 없으면 룰을 off로 내리는 모드 | 새 프로젝트에 이식하여 **처음부터 차단**이 부담될 때 |
