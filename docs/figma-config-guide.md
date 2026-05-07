# Figma 측정 설정 가이드

Phase 0.5 Figma baseline 측정을 위한 설정 안내. 한 번 설정 후에는 `npx dsmonitor audit` 에 자동 편승.

## 개요

DSMonitor 의 Figma analyzer 는 Figma REST API 를 통해 다음을 측정합니다.

- **DS 파일별 카운트**: Styles / Main Components / Variant 그룹 (Variables 는 Phase B 이월)
- **도메인 파일 출처 미상 Instance 비율**: 등록된 DS 중 어디에도 매칭되지 않는 INSTANCE 비율 + Top N (마이그레이션 우선순위)
- **정상 Instance 출처 분포**: ds-new / ds-legacy / unknown 버킷

## 필드 이름 규칙

`label` / `comment` 2개만 사용합니다.

| 필드 | 용도 | 필수 여부 |
|---|---|---|
| `label` | 파일 식별자 (리포트 그룹핑 키, 중복 불가) | 필수 |
| `comment` | 가독성용 메모 (페이지/프레임 이름 등) | 선택 (권장) |

## 초기 설정 (한 번만)

### 1. Figma Personal Access Token 발급

1. Figma 웹 앱 → **Settings** → **Security** → **Personal access tokens** → "Generate new token"
2. Scope: **File content read-only** 만 선택 (Phase 0.5 는 이것만 필요. Variables 측정은 Phase B 이월)
3. 생성된 토큰 복사 (한 번만 표시됨)

### 2. `.env.local` 에 토큰 저장

```bash
cd dsmonitor
cp .env.local.example .env.local   # 최초 1회
# .env.local 을 편집해 FIGMA_API_TOKEN= 에 토큰 붙여넣기
```

`.env.local` 은 `.gitignore` 에 등록되어 있어 커밋되지 않습니다.

### 3. 측정 대상 파일 등록 (`dsmonitor.config.local.ts`)

```bash
cp dsmonitor.config.local.example.ts dsmonitor.config.local.ts
# dsmonitor.config.local.ts 를 편집해 실제 파일 URL 채우기
```

이 파일도 `.gitignore` 에 등록됨. 예시 템플릿 `.example.ts` 는 커밋 대상.

### 4. Figma 측정 활성화

`dsmonitor/dsmonitor.config.ts` 에서:

```typescript
metrics: {
  // ...
  figmaAnalysis: true,   // false → true 로 변경
},
```

## DS 파일 등록

DS 파일 = 컴포넌트 / Variables / Styles 정의 자체가 있는 파일. 페이지/프레임 선택 불필요.

```typescript
export const figmaDesignSystemFiles: FigmaDesignSystemFile[] = [
  { url: "<DS 파일 Copy link>", label: "ds-legacy" },
  { url: "<DS 파일 Copy link>", label: "ds-new" },
];
```

**label 규칙**: 여기 등록한 label 이 리포트의 "정상 Instance 출처 분포" 에서 **그대로 버킷 키로 사용**됩니다 (`figma.instanceSources[label]`). 위 예시처럼 `"ds-new"` / `"ds-legacy"` 로 등록하면 두 개의 버킷이 생기고, 세 번째 DS 를 예컨대 `"ds-external"` 로 추가하면 자동으로 세 번째 버킷이 추가됩니다. label 에 대한 특별 취급 / 하드코딩 분류 없음 — config 에 등록된 수만큼 동적으로 집계. 등록되지 않은 DS 에서 유래한 INSTANCE 는 `figma.instanceAnalysis.unmatchedInstances` (매칭 실패 = 등록 DS 범위 밖, 마이그레이션 대상) 로 집계됩니다.

### Primary 명시 / Primary specification (0.2.0)

`primary: true` 자료 명시 본질. dashboard 자료 자료 자료 `primaryLabel` 자료 자료:

- DS 1개 = 자동 primary (primary 필드 생략 가능)
- DS 2개 이상 = 정확히 1개에 `primary: true` 명시 본질
- primary 0개 또는 2개 이상 = 에러 throw

Dashboard 자료 자료 자료 사용자 라벨 그대로 표시. 라벨 자료 = 자유 결정 (예: `"v1"`, `"v2"`, `"legacy"`, `"main"` 등).

**EN —** Specify primary explicitly with `primary: true`. The dashboard reads `primaryLabel` from the transformer:

- 1 DS file = auto-primary (`primary` field can be omitted)
- 2+ files = exactly one must have `primary: true`
- 0 or 2+ primaries = throws error

The dashboard displays user-defined labels verbatim. Labels are free-form (e.g. `"v1"`, `"v2"`, `"legacy"`, `"main"`).

#### 자료 / Example

```typescript
export const figmaDesignSystemFiles = [
  { url: "...", label: "ds-legacy" },
  { url: "...", label: "ds-new", primary: true },   // ← primary 명시
];
```

> **Migration from 0.1.x**: 0.1.x 자료 자료 = `ds-new` 라벨 자동 primary 자료. 0.2.0 자료 자료 = 명시 자료 자료. 옛 자료에 `primary: true` 1줄 추가 자료. Labels themselves (`ds-new` / `ds-legacy`) can stay or be freely renamed.

## 도메인 파일 등록 — 3가지 패턴

도메인 파일 = 실제 UI 시안 / 프로토타입 파일. 측정 범위에 따라 아래 3가지 패턴 중 하나 사용.

### 패턴 A — 파일 전체 측정

```typescript
{
  label: "domain-a",
  url: "<파일 Copy link>",
  comment: "파일 전체 측정"
}
```

Copy link 방법: Figma 에서 파일을 연 뒤 주소창의 URL 을 그대로 복사 (또는 "Share" → "Copy link" 버튼). **node-id 가 없는 파일 루트 URL** 이어야 합니다.

언제 사용: 파일 안에 archive 같은 제외 대상이 없을 때.

### 패턴 B — 특정 페이지 전체 측정

```typescript
{
  label: "domain-b",
  pages: [
    { url: "<페이지 Copy link>", comment: "계정관리" },
    { url: "<페이지 Copy link>", comment: "권한설정" },
  ],
}
```

Copy link 방법: Figma 왼쪽 페이지 목록에서 **페이지 이름 우클릭** → "Copy link". 결과 URL 은 `...?node-id=X-Y` 형태.

언제 사용: 측정할 페이지 수가 적고 명확할 때. 또는 "파일 전체 - archive" 처럼 일부 제외하고 싶을 때 (포함할 페이지만 명시).

### 패턴 C — 페이지 안의 특정 프레임만 측정

```typescript
{
  label: "domain-c",
  pages: [
    {
      comment: "대시보드",                       // 페이지 이름 (URL 없음)
      frames: [
        { url: "<프레임 Copy link>", comment: "메인위젯" },
        { url: "<프레임 Copy link>", comment: "상단요약" },
      ],
    },
  ],
}
```

Copy link 방법: Figma 캔버스에서 **프레임을 선택한 뒤 우클릭** → "Copy link to selection". 결과 URL 은 `...?node-id=X-Y` 형태 (페이지 URL 과 형식 동일).

언제 사용: 페이지 안에 정리 대상이 아닌 스케치 / 탐색용 프레임이 섞여있을 때.

### 혼합 패턴

한 파일 안에서 어떤 페이지는 B, 어떤 페이지는 C. 같은 파일 소속이기만 하면 OK.

```typescript
{
  label: "domain-d",
  pages: [
    { url: "<페이지 Copy link>", comment: "계정관리" },   // 패턴 B
    {
      comment: "권한",                                      // 패턴 C
      frames: [
        { url: "<프레임 Copy link>", comment: "목록" },
      ],
    },
  ],
}
```

자세한 예시는 `dsmonitor.config.local.example.ts` 의 `domain-d` 참고.

## 측정 실행

```bash
# 프로젝트 루트에서 실행 (영역 통합 cycle):
npx dsmonitor audit --baseline     # codebase + Figma 측정 + markdown + dashboard 자동 chain

# 또는 영역별:
npx dsmonitor audit --only figma        # figma 만 (base JSON 필요,`dsmonitor:figma` 단독 측정 시 제약 — 아래 주의 참조)
npx dsmonitor report       # markdown 만 재생성
npx dsmonitor dashboard    # dashboard html 만 재빌드
```

### `dsmonitor:figma` 단독 측정의 제약

`--only figma` 흐름은 코드 인덱스 (`classIndex`) 가 없어 **componentMatch 영역 미생성** 합니다 (B 그룹 단계 3, v0.11 시점부터). componentMatch = Figma DS 컴포넌트 ↔ 코드 className 매칭. 해당 측정값이 필요하면 통합 측정 (`dsmonitor:baseline`) 사용 권장.

### 마이그레이션 자료 추출 (v0.14, Phase 0.7 단계 1+6)

frame 단위 instance 목록을 CSV 로 추출 — 마이그레이션 작업 진입 사전 자료.

```bash
npx dsmonitor export-migration --frame=<frame-comment> [--ds=<label>]
```

- `--frame=<comment>` (필수): frame.comment 정확 일치 또는 `all`
- `--ds=<label>` (옵션, 기본 `ds-legacy`): `ds-new` / `unmatched` / `all` 가능

출력 — `dsmonitor/reports/migration/{frame}-{ds}-{date}.csv` (CSV 컬럼: nodeId / componentName / instanceName / dsLabel / contextPath / figmaUrl). figmaUrl 은 Figma 시안 직접 진입 가능한 형태로 자동 조립.

사전 조건: `dsmonitor:baseline` 실행으로 `dsmonitor/reports/figma-instances-{date}.json` 생성 (instance level raw, walk 시점에 같이 출력).

## FAQ

**Q. 프레임 측정인데 파일 URL 도 넣어야 하나요?**
A. 아니오. 프레임 URL 하나면 충분합니다. 파일 키는 프레임 URL (`...?node-id=...`) 에도 들어있어서 도구가 자동으로 파일을 식별합니다. 2026-04-23 구조 개편으로 각 측정 단위마다 URL 1개만 입력하도록 단순화했습니다.

**Q. 페이지 URL 과 프레임 URL 이 똑같이 생겼는데 어떻게 구분하나요?**
A. 형식(`...?node-id=X-Y`)은 같지만 Copy link 방식이 다릅니다:
- 페이지 URL: Figma 왼쪽 패널의 **페이지 이름 우클릭** → Copy link
- 프레임 URL: 캔버스의 **프레임 선택 우클릭** → Copy link to selection

두 URL 을 시각적으로 구분할 방법은 없으므로, 도구가 Figma API 응답의 `type` 필드 (`CANVAS` = 페이지 / `FRAME` = 프레임) 로 자동 판정해 위치가 맞는지 검증합니다. 잘못된 자리에 들어가 있으면 리포트 경고 섹션에 기록됩니다.

**Q. 한 파일에 여러 패턴 섞어도 되나요?**
A. 네. 같은 파일 소속이기만 하면 됩니다. `pages` 배열 안에서 어떤 항목은 `url` 로 (패턴 B), 어떤 항목은 `frames` 로 (패턴 C) 지정할 수 있습니다.

**Q. 서로 다른 파일 URL 을 한 domainFile 에 섞어도 되나요?**
A. 안 됩니다. 한 `FigmaDomainFile` 안의 모든 URL 은 같은 파일 소속이어야 하고, `validateSameFile` 검증으로 차단됩니다. 파일이 다르면 `domainFiles` 배열에 별도 엔트리로 추가하세요.

**Q. archive 페이지를 제외하려면요?**
A. 측정할 페이지 / 프레임만 명시(패턴 B 또는 C)하세요. 기존 `excludePages` 필드는 2026-04-23 개편 시 제거됐습니다. 필요해지면 Phase B 에서 재도입 검토.

**Q. DS 파일과 도메인 파일에 같은 URL 넣어도 되나요?**
A. 권장하지 않습니다. DS 는 컴포넌트 정의 카운트용, 도메인은 출처 미상 Instance 측정용으로 역할이 다릅니다. 또한 같은 파일을 두 번 등록하면 DS 의 자기 자신 INSTANCE 까지 도메인 측정에 섞여 해석이 복잡해집니다.

**Q. Variables 카운트가 전부 "—" 로 나옵니다.**
A. Phase B 이월입니다. Variables 엔드포인트(`/v1/files/:key/variables/local`)는 별도 `file_variables:read` scope 를 요구하는데, 일반 Personal Access Token 으로는 접근 불가(2026-04-23 사전 조사 확인). Phase B 착수 시 토큰 재발급 또는 별도 경로 확보 후 활성화 예정.

**Q. 측정이 느립니다.**
A. 단일 파일 응답이 수십 MB 단위입니다(DS 파일 예: 42MB / 18초). 도메인 파일은 더 클 수 있어 **순차 처리** 로 실행됩니다. 병렬 처리는 메모리 피크 위험으로 비활성. 응답이 ~512MB (Node V8 문자열 한계) 초과 시 자동 frame 분할 호출 진행 (0.2.2 부터 — 자세한 내용은 아래 "페이지 응답이 너무 커서 측정 실패한 경험이 있습니다" Q 참고).

**Q. 페이지 응답이 너무 커서 측정 실패한 경험이 있습니다.**
A. 0.2.2 부터 자동 처리합니다. 페이지 단일 응답이 Node V8 문자열 한계 (~512MB) 초과 시 dsmonitor 가 페이지 직속 frame 단위로 자동 재귀 분할 호출 (MAX_DEPTH=4). 분할 결과는 dedup 후 합산. 호출 폭증 모니터링 위해 측정 끝 시점에 `[figma] API 호출 통계: total=N, split-entries=M, split-fetches=K` 로그 출력 — 호출 횟수 100 초과 시 warning. MAX_DEPTH 도달까지 분할 시도 후에도 실패하면 명확한 에러 throw (해당 페이지 누락).

진단 흐름:
- 분할 진입 검출 → `[figma] page X 응답 크기 한계 초과 — frame 분할 호출 진입` 로그
- 분할 진행 → `[figma]   - frame X (depth=N) → K개 child 분할 호출` 로그
- 분할 한계 도달 → `frame 분할 깊이 한계 (MAX=4) 도달 — figma 파일 구조 검토 필요` 에러 (이 단계 도달 = figma 파일 구조 자체 정정 권고)

**Q. "출처 미상 Instance" 가 예상보다 많습니다.**
A. 외주 옛 DS 에서 온 instance 가 여기로 분류됩니다. planning.md §7 2026-04-23 결정 — 외주 옛 DS 는 검토 대상 제외이고, 그 출처의 instance 는 "출처 미상" 으로 허용. Top N 섹션이 "외주 옛 DS 에서 자주 쓰이는 컴포넌트" 리스트 역할을 해서 마이그레이션 우선순위 파악에 도움이 됩니다.

**Q. Figma 의 Copy link 결과에 `&t=...` 트래킹 파라미터가 붙어있는데 그대로 넣어도 되나요?**
A. 네. urlParser 가 `parsed.searchParams.get("node-id")` 로 node-id 만 추출 — 다른 query param (`&t=Yqb0SCoDaqckT0kw-4` 같은 share session token) 은 자연 무시됩니다. URL 에서 직접 제거할 필요 없음.

**Q. ds-legacy / ds-new 양쪽 라이브러리 영역에 같은 컴포넌트가 published 됐을 때 어떻게 분류되나요?**
A. componentMap 빌드 시 **first-come-first-serve** — config 의 `designSystemFiles` 순서가 우선. ds-legacy 가 1st 로 등록돼 있으면 같은 stable library key 영역 ds-new 측 항목은 무시 (warnings 영역에 conflict 기록). 본 프로젝트의 v0.14 측정에서 114 conflict 발견 — 모두 ds-legacy 우선. 이는 dsmonitor 의 issue 가 아니라 Figma 작업 영역 본질 (ds-legacy 컴포넌트 영역을 ds-new 파일에 복사 / import 시 같은 stable key 유지). 자세한 검증은 measurementHistory v0.14 entry 참조.

## 부록: Figma REST API 응답 구조 메모 (사전 조사 결과)

2026-04-23 새 DS(`8aASUh5TjMnkoGo6qutYwN`)로 실측한 응답 구조 메모. 향후 analyzer 유지보수 참고용.

### Top-level 키

```
componentSets, components, document, editorType, lastModified, linkAccess,
name, role, schemaVersion, styles, thumbnailUrl, version
```

주의: `variables` 키 **없음**. Variables 는 별도 `/v1/files/:key/variables/local` 호출 필요(Phase B).

### 측정에 쓰는 핵심 구조

| 필드 | 위치 | 카운트 방법 |
|---|---|---|
| Styles | `d.styles` (top-level dict) | `Object.keys().length`. styleType 별 분해 가능 (TEXT/FILL/EFFECT/GRID) |
| Components | `d.components` (top-level dict) | `Object.keys().length`. **variant 포함** — Figma UI 의 "Main Components" 해석과 일치 |
| Variant 그룹 | `d.componentSets` (top-level dict) | `Object.keys().length`. 예: "btn" 1개 그룹 안에 22개 variant COMPONENT |
| 페이지 | `document.children` (CANVAS 타입) | `document.children` 자체가 페이지 목록 |

### INSTANCE 노드 (출처 판정 핵심)

```typescript
{
  id, name, type: "INSTANCE",
  componentId: "237:106",   // ← DS components dict 의 nodeId 와 매칭
  overrides: [...],
}
```

출처 판정: `INSTANCE.componentId` 를 각 DS 파일의 `components` dict nodeId key 와 대조.

### 노드 타입 판정 (CANVAS / FRAME / FILE / OTHER)

새 union 구조에서 URL 이 페이지 / 프레임 둘 다 `?node-id=X-Y` 로 구분 불가하므로, 응답 내 document tree 에서 해당 nodeId 찾아 `type` 확인:
- `CANVAS` = 페이지 (pages 분기의 `url` 자리)
- `FRAME` = 프레임 (frames 분기의 `url` 자리)
- 불일치 시 리포트 경고. 단 분석은 어쨌든 진행(FRAME 이어도 측정 가능).

### 응답 크기 & 노드 수 (참고)

- 새 DS: 42.6MB / 31,492 노드 / max depth 13 / 18초
- 도메인 파일은 시안 / 프로토타입으로 더 클 수 있어 `/v1/files/:key/nodes?ids=...` 형태로 범위 축소 호출 (2026-04-23 도메인 측 적용 끝).
- 페이지 단일 응답이 ~512MB (Node V8 문자열 한계) 초과 시 자동 frame 단위 재귀 분할 호출 (0.2.2 추가, MAX_DEPTH=4). 분할 진입 시 `[figma] page X 응답 크기 한계 초과 — frame 분할 호출 진입` 로그 출력.
