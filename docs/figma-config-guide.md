# Figma 측정 설정 가이드

Phase 0.5 Figma baseline 측정을 위한 설정 안내. 한 번 설정 후에는 `npm run ui-health` 에 자동 편승.

## 개요

VitaUI 의 Figma analyzer 는 Figma REST API 를 통해 다음을 측정합니다.

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
cd vitaui
cp .env.local.example .env.local   # 최초 1회
# .env.local 을 편집해 FIGMA_API_TOKEN= 에 토큰 붙여넣기
```

`.env.local` 은 `.gitignore` 에 등록되어 있어 커밋되지 않습니다.

### 3. 측정 대상 파일 등록 (`vitaui.config.local.ts`)

```bash
cp vitaui.config.local.example.ts vitaui.config.local.ts
# vitaui.config.local.ts 를 편집해 실제 파일 URL 채우기
```

이 파일도 `.gitignore` 에 등록됨. 예시 템플릿 `.example.ts` 는 커밋 대상.

### 4. Figma 측정 활성화

`vitaui/vitaui.config.ts` 에서:

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

자세한 예시는 `vitaui.config.local.example.ts` 의 `domain-d` 참고.

## 측정 실행

```bash
# 프로젝트 루트에서 실행 (영역 통합 cycle):
npm run ui-health:baseline     # codebase + Figma 측정 + markdown 자동 변환

# 또는 영역별:
npm run ui-health:figma        # figma 만 (base JSON 필요)
npm run ui-health:report       # markdown 만 재생성
```

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
A. 단일 파일 응답이 수십 MB 단위입니다(DS 파일 예: 42MB / 18초). 도메인 파일은 더 클 수 있어 **순차 처리** 로 실행됩니다. 병렬 처리는 메모리 피크 위험으로 비활성. 응답이 과도하게 크면 `/v1/files/:key/nodes?ids=...` 로 범위 축소 최적화 예정(Phase 0.5 내 실측 후 결정).

**Q. "출처 미상 Instance" 가 예상보다 많습니다.**
A. 외주 옛 DS 에서 온 instance 가 여기로 분류됩니다. planning.md §7 2026-04-23 결정 — 외주 옛 DS 는 검토 대상 제외이고, 그 출처의 instance 는 "출처 미상" 으로 허용. Top N 섹션이 "외주 옛 DS 에서 자주 쓰이는 컴포넌트" 리스트 역할을 해서 마이그레이션 우선순위 파악에 도움이 됩니다.

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
- 도메인 파일은 시안 / 프로토타입으로 더 클 수 있음 → `/nodes` 최적화는 실측 후 판단
