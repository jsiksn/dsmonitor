# vitaui Plugin 개발 가이드

> 본 문서: vitaui 의 plugin 시스템 약속과 plugin 개발 방법
> 대상: vitaui 의 추가 plugin 을 만들려는 개발자

---

## 0. 본 가이드 영역

vitaui 는 codebase / Figma / Lighthouse 측정 외에 **plugin 시스템**을 통해 외부 측정 자료도 dashboard 에 표시할 수 있습니다.

본 가이드는 plugin 을 만들려는 개발자를 위한 자료실입니다.

### 본 가이드로 만들 수 있는 plugin 예시

- 단위 테스트 결과 (vitest / jest 등)
- 번들 크기 (webpack / vite / rollup)
- 접근성 검사 (axe-core / pa11y)
- 다른 도구 결과 (custom 측정 / 외부 API 결과 등)

핵심: **JSON 파일을 약속된 위치에 출력하기만 하면** vitaui dashboard 에 자동 표시됩니다.

---

## 1. vitaui Plugin 시스템 본질

### 1.1 사이드카 영역

```
[Plugin 측 - 외부 개발자 영역]            [vitaui 측]

1. plugin 이 자체 도구 실행
   (vitest / 다른 도구 / 자체 측정)
       ↓
2. 결과를 JSON 으로 가공
       ↓
3. 약속된 폴더에 JSON 파일 출력
   vitaui/reports/plugins/{id}/{date}.json
                                              ↓
                                    4. vitaui dashboard 실행
                                              ↓
                                    5. 약속된 폴더 자동 검색
                                              ↓
                                    6. 발견된 JSON → 자동으로 탭 추가
                                              ↓
                                    7. 자료 형식 약속대로 자동 표시
```

### 1.2 핵심 원칙

- **vitaui 는 plugin 의 실행에 관여하지 않습니다.** plugin 은 자체 시점에 자체 명령으로 실행됩니다.
- **vitaui 는 plugin 의 코드에 의존하지 않습니다.** JSON 파일만 읽습니다.
- **plugin 의 시각화는 vitaui 가 자동 처리합니다.** plugin 은 JSX / 시각 코드를 작성하지 않습니다.

### 1.3 본 방식의 의미

| 영역 | 본 방식 |
|---|---|
| plugin ↔ vitaui 연결 | JSON 파일 (코드 의존 없음) |
| plugin 실행 시점 | plugin 자체 명령 (vitaui 와 분리) |
| plugin 시각화 | vitaui 표준 자동 표시 |
| plugin 의 도구 자유도 | 큼 (어떤 도구든 JSON 출력만 하면 됨) |
| plugin 시각 자유도 | 낮음 (vitaui 표준 형식만) |

---

## 2. 자료 위치 약속

### 2.1 폴더 경로

```
{프로젝트 루트}/vitaui/reports/plugins/{plugin-id}/{date}.json
```

- `{프로젝트 루트}` = vitaui 가 설치된 프로젝트의 루트
- `vitaui/reports/plugins/` = plugin 자료 전용 폴더 (vitaui 가 자동 생성)
- `{plugin-id}` = plugin 고유 이름 (예: `tests`, `bundle-size`, `a11y-audit`)
- `{date}` = 측정 날짜 (`YYYY-MM-DD` 형식, 예: `2026-04-30`)

### 2.2 예시

```
my-project/
├── vitaui/
│   ├── vitaui.config.ts
│   └── reports/
│       ├── baseline-2026-04-30.json
│       ├── figma-instances-2026-04-30.json
│       └── plugins/
│           ├── tests/
│           │   ├── 2026-04-29.json
│           │   └── 2026-04-30.json     ← 최신 자료
│           ├── bundle-size/
│           │   └── 2026-04-30.json
│           └── a11y-audit/
│               └── 2026-04-30.json
└── ...
```

### 2.3 plugin-id 명명 규칙

- 영문 소문자 + 숫자 + 하이픈만 허용 (예: `tests`, `bundle-size`, `a11y-axe`)
- 다른 plugin 과 충돌하지 않는 고유 이름 사용
- 폴더 이름이 곧 plugin id 입니다. JSON 안의 `id` 필드와 일치해야 합니다.

### 2.4 날짜 파일 영역

- vitaui 는 폴더 안의 **가장 최신 날짜 파일**을 읽습니다.
- 과거 자료 파일은 그대로 보존됩니다 (이력 영역, 추후 시계열 분석 활용 가능).
- 같은 날짜에 여러 번 측정 시 같은 파일 (`{date}.json`) 덮어쓰기 권장.

---

## 3. 자료 형식 약속

### 3.1 TypeScript 인터페이스

```typescript
interface VitaUIPluginOutput {
  /** plugin 고유 id (폴더 이름과 일치) */
  id: string;

  /** 대시보드 탭 표시 이름 */
  label: string;

  /** 측정 시점 (ISO 8601 형식) */
  measuredAt: string;

  /** Summary 탭의 카드 표시 자료 */
  summary: {
    /** 가장 큰 영역 카드 (1개 필수) */
    primary: SummaryCard;
    /** 보조 카드 (0개 이상) */
    secondary?: SummaryCard[];
  };

  /** Plugin 탭의 표 영역 자료 (선택) */
  details?: DetailRow[];

  /** Plugin 탭에 추가 표시할 자료 (선택, 0.1.0 영역에서 dashboard 표시 빠짐) */
  meta?: Record<string, string | number | boolean>;
}

interface SummaryCard {
  label: string;
  value: string | number;
  hint?: string;
  status?: "good" | "warn" | "bad" | "neutral";
}

interface DetailRow {
  name: string;
  [key: string]: string | number | boolean;
}
```

### 3.2 필수 / 선택 필드

| 필드 | 필수? | 영역 |
|---|---|---|
| `id` | 필수 | plugin 고유 id (폴더 이름과 일치) |
| `label` | 필수 | 대시보드 탭 이름 |
| `measuredAt` | 필수 | ISO 8601 형식 측정 시점 |
| `summary.primary` | 필수 | 가장 큰 카드 (1개) |
| `summary.secondary` | 선택 | 보조 카드 |
| `details` | 선택 | 표 형식 자료 |
| `meta` | 선택 | 자유 형식 추가 자료 (0.1.0 영역에서 표시 빠짐) |

### 3.3 예시 JSON

#### 단순 예시 (Tests plugin)

```json
{
  "id": "tests",
  "label": "Tests",
  "measuredAt": "2026-04-30T14:23:00+09:00",
  "summary": {
    "primary": {
      "label": "통과율",
      "value": "97.7%",
      "hint": "42 / 43 통과",
      "status": "good"
    },
    "secondary": [
      { "label": "통과", "value": 42, "status": "good" },
      { "label": "실패", "value": 1, "status": "bad" },
      { "label": "총 실행 시간", "value": "12.3s" }
    ]
  },
  "details": [
    { "name": "addUser", "status": "pass", "duration": "5.2ms" },
    { "name": "removeUser", "status": "pass", "duration": "3.1ms" },
    { "name": "validateEmail", "status": "fail", "duration": "0.3ms" }
  ]
}
```

#### 다른 도메인 예시 (Bundle Size plugin)

```json
{
  "id": "bundle-size",
  "label": "번들 크기",
  "measuredAt": "2026-04-30T14:00:00+09:00",
  "summary": {
    "primary": {
      "label": "총 번들 크기",
      "value": "342 KB",
      "hint": "gzip 기준",
      "status": "warn"
    },
    "secondary": [
      { "label": "JS", "value": "287 KB", "status": "warn" },
      { "label": "CSS", "value": "55 KB", "status": "good" },
      { "label": "main 대비", "value": "+12 KB", "status": "warn" }
    ]
  },
  "details": [
    { "name": "main.js", "size": "187 KB", "gzip": "62 KB" },
    { "name": "vendor.js", "size": "245 KB", "gzip": "78 KB" },
    { "name": "main.css", "size": "120 KB", "gzip": "32 KB" }
  ]
}
```

#### 또 다른 도메인 예시 (A11y Audit plugin)

```json
{
  "id": "a11y-audit",
  "label": "접근성",
  "measuredAt": "2026-04-30T15:00:00+09:00",
  "summary": {
    "primary": {
      "label": "위반 영역",
      "value": 3,
      "hint": "axe-core 검사",
      "status": "bad"
    },
    "secondary": [
      { "label": "심각", "value": 1, "status": "bad" },
      { "label": "심각도 중간", "value": 2, "status": "warn" },
      { "label": "검사 페이지", "value": 12 }
    ]
  },
  "details": [
    { "name": "color-contrast", "severity": "serious", "count": 2, "page": "/dashboard" },
    { "name": "label", "severity": "critical", "count": 1, "page": "/login" }
  ]
}
```

### 3.4 status 색상 매핑

| status 값 | 색상 의도 | 활용 영역 |
|---|---|---|
| `good` | 초록 | 통과 / 정상 / 개선 |
| `warn` | 노랑 | 경계 / 약간 회귀 |
| `bad` | 빨강 | 실패 / 회귀 / 위반 |
| `neutral` (또는 미지정) | 회색 | 단순 정보 |

### 3.5 details 의 컬럼 결정 영역

- 컬럼은 **모든 행의 키 합집합**으로 결정됩니다
- 첫 행에서 빠진 키도 컬럼으로 추가됩니다
- 행마다 키가 다를 경우 빈 셀로 표시됩니다

권장: 같은 plugin 안의 모든 행은 같은 컬럼 사용

### 3.6 meta 영역 — 0.1.0 영역의 짚힘

vitaui 0.1.0 영역에서는 **dashboard 표시 빠짐** (자료 형식 약속은 유지).

- plugin JSON 안에 meta 필드 자유롭게 두되 dashboard 에서 안 보임
- 자료 형식 보존 영역만 (추후 활용 가능)
- 추후 vitaui 0.2.0 영역에서 dashboard 표시 추가 검토

→ meta 필드는 **선택 영역** — 안 써도 됨. 환경 정보 / 디버깅 정보 등 자유 자료 영역에 활용 가능.

---

## 4. vitaui 측 자동 표시 규칙

### 4.1 탭 추가

- vitaui dashboard 가 `vitaui/reports/plugins/*` 폴더 자동 검색
- 발견된 폴더마다 탭 1개 자동 추가
- 탭 이름 = JSON 의 `label` 필드
- 탭 위치 = vitaui 기본 탭 뒤 (id 알파벳 순)

> ⓘ plugin 추가 / 제거 시 다른 plugin 의 탭 위치 + Layer 번호 변동 가능 (id 알파벳 순 정렬).

### 4.2 Summary 탭 Layer 추가

vitaui Summary 탭은 측정 영역별 Layer 구조입니다 (Layer 01 / Code, Layer 02 / Lighthouse, Layer 03 / Figma).

- plugin 1개당 Layer 04+ 자동 추가
- layer-head 에 plugin label + measuredAt 표시 (vitaui 자체 영역과 동일 패턴)
- Layer 안의 카드 영역:
  - `summary.primary` → 가장 큰 카드
  - `summary.secondary` → 보조 카드 (배열 순서)

> ⓘ Layer 번호는 동적 영역 — vitaui 자체 영역 (Code / Lighthouse / Figma) 중 활성 Layer 수에 의존.
> - 모두 활성 환경: Layer 04 / 05 / ...
> - figma 영역 빠진 환경: Layer 03 / 04 / ...
> - codebase 외 모두 빠진 환경: Layer 02 / 03 / ...

### 4.3 Plugin 탭 표

- `details` 가 있으면 자동으로 표 형식 표시
- 첫 컬럼 = `name` 필드
- 나머지 컬럼 = 모든 행의 키 합집합 순서

### 4.4 측정 시점 표시

| 위치 | 표시 영역 | 예시 |
|---|---|---|
| Summary 탭 Layer 의 layer-head stamp | 날짜 부분 | `2026-04-30` |
| Plugin 탭 헤더 | 날짜 + 시간 (분 단위) | `2026-04-30 14:23` |

### 4.5 stale 알림 (회색 배지)

- `measuredAt` 가 **7일 이상** 지난 plugin 자료에 회색 배지 표시
- 사용자가 자료가 오래됐음을 인지하도록 함
- 탭 이름 옆 / Summary Layer 옆에 회색 점 시각

### 4.6 검증 실패 시 처리

vitaui 가 plugin JSON 검증:

- 필수 필드 (`id` / `label` / `measuredAt` / `summary.primary`) 누락
- 폴더 이름 ≠ JSON 의 `id` 필드
- 잘못된 JSON 형식

위 영역 발견 시 dashboard 의 plugin 탭에 빨간 알림 배지 + 탭 본문에 오류 메시지. 사용자 디버깅 도움 영역.

---

## 5. plugin 측 작업 영역

### 5.1 plugin 측이 해야 할 작업

1. **자체 도구 실행** — 측정 도구 (vitest / webpack / axe-core / 다른 영역) 자체 명령
2. **결과 가공** — 도구 결과를 vitaui plugin 형식 (Section 3) 으로 변환
3. **JSON 출력** — 약속된 폴더 (Section 2) 에 파일 쓰기
4. **자료 갱신 시점 관리** — plugin 자체가 자료 갱신 시점 결정

### 5.2 plugin 측이 안 하는 작업

- vitaui 코드에 직접 import / 연결
- vitaui dashboard 의 시각 영역 작성
- vitaui CLI 에 명령 등록
- vitaui audit 시점에 자동 실행

### 5.3 plugin 자체 명령 영역

plugin 측 자체 npm scripts 또는 명령 형식 자유:

```json
{
  "scripts": {
    "measure:plugin": "node scripts/export-vitaui-plugin.mjs"
  }
}
```

### 5.4 plugin 자료 갱신 시점

```bash
# plugin 자료 갱신 시점 (plugin 측 자체 명령)
$ npm run measure:plugin

# vitaui dashboard 갱신 시점 (vitaui 측 명령)
$ npx vitaui dashboard

# 본 둘 시점이 다를 수 있음 — 사용자가 인지해야 함
# 그래서 measuredAt 필드가 필수
```

### 5.5 CI 영역에서 plugin 자료 갱신

CI 파이프라인 (GitHub Actions / GitLab CI / Bitbucket Pipelines 등) 에서 plugin 자료 갱신 권장:

```yaml
# 예시 (GitHub Actions)
- name: Run plugin
  run: npm run measure:plugin

- name: Commit plugin output
  run: |
    git config user.email "ci@example.com"
    git config user.name "CI"
    git add vitaui/reports/plugins/
    git diff --cached --quiet || git commit -m "chore(vitaui): plugin 자료 갱신"
    git push
```

---

## 6. 검증 영역

### 6.1 plugin 측 자체 검증 권장

```typescript
function validatePluginOutput(output: unknown): VitaUIPluginOutput {
  if (!output || typeof output !== "object") {
    throw new Error("plugin output must be an object");
  }
  const o = output as Record<string, unknown>;
  if (typeof o.id !== "string") throw new Error("id must be string");
  if (typeof o.label !== "string") throw new Error("label must be string");
  if (typeof o.measuredAt !== "string") throw new Error("measuredAt must be string");
  if (!o.summary || typeof o.summary !== "object") {
    throw new Error("summary must be an object");
  }
  const summary = o.summary as Record<string, unknown>;
  if (!summary.primary || typeof summary.primary !== "object") {
    throw new Error("summary.primary must be an object");
  }
  // 필요시 SummaryCard / DetailRow 세부 검증 추가
  return o as VitaUIPluginOutput;
}
```

### 6.2 디버깅 영역

- vitaui dashboard 에서 plugin 탭이 안 보이면:
  - `vitaui/reports/plugins/{id}/` 폴더 존재 확인
  - 폴더 안 `{date}.json` 파일 존재 확인
  - JSON 형식 유효 확인 (`cat file.json | jq .`)
  - 필수 필드 누락 확인

- vitaui dashboard 에서 plugin 탭이 빨갛게 표시되면:
  - dashboard 콘솔 (브라우저 개발자 도구) 에서 오류 메시지 확인
  - `validatePluginOutput()` 호출 추가해서 plugin 측 자체 검증

---

## 7. 제한 영역과 추후 영역

### 7.1 현재 (vitaui 0.1.0) 제한 영역

| 제한 | 영역 |
|---|---|
| 시각 자유도 | vitaui 표준 (카드 / 표) 만 — 자유 차트 / 그래프 영역 없음 |
| 시계열 영역 | 최신 자료 1개만 표시 — 과거 자료와 비교 영역 없음 |
| Plugin 간 상호 작용 | 없음 — 각 plugin 은 독립 |
| Plugin CLI 통합 | 없음 — vitaui CLI 와 분리 |
| Plugin audit 시점 통합 | 없음 — plugin 자체 명령으로 갱신 |
| meta 영역 dashboard 표시 | 없음 — 자료 형식만 유지 |

### 7.2 추후 영역 안 (vitaui 0.2.0 이후)

- **시계열 차트 영역** — 과거 자료 누적 → 추이 차트 자동 표시
- **자유 시각 영역** — plugin 측이 chart 형식 선택
- **자동 알림 영역** — 임계치 초과 시 경고 표시
- **meta 영역 dashboard 표시** — 자료 형식 그대로 활용
- **plugin 출력 위치 변경 영역** — vitaui.config.ts 에서 위치 설정 가능

### 7.3 본 plugin 약속의 안정성

- 본 가이드의 자료 형식은 **0.1.x 영역에서 안정** 입니다.
- 0.2.0 이후 추가 필드 영역 가능 (기존 필드는 호환 유지).
- 기존 plugin 은 0.2.0 이후에도 그대로 작동합니다.

---

## 8. 부록 — plugin 예시 코드

### 8.1 가장 단순한 plugin (Node.js + ESM)

```javascript
// scripts/export-vitaui-plugin.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// === 측정 영역 ===
function measure() {
  // TODO: 자기 측정 도구 결과 가져오기
  return {
    passed: 42,
    failed: 1,
    total: 43,
    items: [
      { name: "함수1", status: "pass", duration: 5.2 },
      { name: "함수2", status: "pass", duration: 12.3 },
      { name: "함수3", status: "fail", duration: 0.3 }
    ]
  };
}

// === vitaui plugin 형식 변환 영역 ===
function toVitaUIPluginOutput(measurement) {
  const { passed, failed, total, items } = measurement;
  return {
    id: "tests",
    label: "Tests",
    measuredAt: new Date().toISOString(),
    summary: {
      primary: {
        label: "통과율",
        value: `${(passed / total * 100).toFixed(1)}%`,
        hint: `${passed} / ${total} 통과`,
        status: failed === 0 ? "good" : "bad"
      },
      secondary: [
        { label: "통과", value: passed, status: "good" },
        { label: "실패", value: failed, status: failed > 0 ? "bad" : "neutral" }
      ]
    },
    details: items.map(i => ({
      name: i.name,
      status: i.status,
      duration: `${i.duration.toFixed(1)}ms`
    }))
  };
}

// === 자체 검증 영역 ===
function validatePluginOutput(output) {
  if (typeof output.id !== "string") throw new Error("id must be string");
  if (typeof output.label !== "string") throw new Error("label must be string");
  if (typeof output.measuredAt !== "string") throw new Error("measuredAt must be string");
  if (!output.summary?.primary) throw new Error("summary.primary required");
  return output;
}

// === 출력 영역 ===
function outputPlugin(output) {
  validatePluginOutput(output);
  const PLUGIN_DIR = `vitaui/reports/plugins/${output.id}`;
  const date = new Date().toISOString().slice(0, 10);
  mkdirSync(PLUGIN_DIR, { recursive: true });
  const filepath = join(PLUGIN_DIR, `${date}.json`);
  writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`✓ vitaui plugin output: ${filepath}`);
}

// === 실행 영역 ===
const measurement = measure();
const output = toVitaUIPluginOutput(measurement);
outputPlugin(output);
```

실행:

```bash
$ node scripts/export-vitaui-plugin.mjs
✓ vitaui plugin output: vitaui/reports/plugins/tests/2026-04-30.json

$ npx vitaui dashboard
# → dashboard 에 "Tests" 탭 자동 추가됨
```

### 8.2 webpack 번들 크기 plugin 예시

> ⓘ **Node 18.17+ 필요** — 본 예시의 `readdirSync({ recursive: true })` 영역은 Node 18.17+ 부터 지원. 그 이전 영역은 `fast-glob` 등 별도 라이브러리 사용 권장.

```javascript
// scripts/export-bundle-size-plugin.mjs
import { writeFileSync, mkdirSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// === 번들 영역 측정 ===
function measureBundle() {
  const distDir = "dist";
  const files = readdirSync(distDir, { recursive: true })
    .filter(f => /\.(js|css)$/.test(f));

  return files.map(file => {
    const fullpath = join(distDir, file);
    const content = readFileSync(fullpath);
    const size = statSync(fullpath).size;
    const gzipSize = gzipSync(content).length;
    return {
      name: file,
      size,
      gzipSize,
      type: file.endsWith(".js") ? "js" : "css"
    };
  });
}

// === vitaui plugin 형식 변환 영역 ===
function toVitaUIPluginOutput(files) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalGzip = files.reduce((sum, f) => sum + f.gzipSize, 0);
  const jsTotal = files.filter(f => f.type === "js").reduce((sum, f) => sum + f.gzipSize, 0);
  const cssTotal = files.filter(f => f.type === "css").reduce((sum, f) => sum + f.gzipSize, 0);

  const formatKB = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
  const SIZE_THRESHOLD_KB = 300;
  const status = totalGzip / 1024 > SIZE_THRESHOLD_KB ? "warn" : "good";

  return {
    id: "bundle-size",
    label: "번들 크기",
    measuredAt: new Date().toISOString(),
    summary: {
      primary: {
        label: "총 번들 크기",
        value: formatKB(totalGzip),
        hint: "gzip 기준",
        status
      },
      secondary: [
        { label: "JS", value: formatKB(jsTotal) },
        { label: "CSS", value: formatKB(cssTotal) }
      ]
    },
    details: files.map(f => ({
      name: f.name,
      type: f.type,
      size: formatKB(f.size),
      gzip: formatKB(f.gzipSize)
    }))
  };
}

// === 자체 검증 영역 ===
function validatePluginOutput(output) {
  if (typeof output.id !== "string") throw new Error("id must be string");
  if (typeof output.label !== "string") throw new Error("label must be string");
  if (typeof output.measuredAt !== "string") throw new Error("measuredAt must be string");
  if (!output.summary?.primary) throw new Error("summary.primary required");
  return output;
}

// === 출력 영역 ===
function outputPlugin(output) {
  validatePluginOutput(output);
  const PLUGIN_DIR = `vitaui/reports/plugins/${output.id}`;
  const date = new Date().toISOString().slice(0, 10);
  mkdirSync(PLUGIN_DIR, { recursive: true });
  const filepath = join(PLUGIN_DIR, `${date}.json`);
  writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`✓ vitaui plugin output: ${filepath}`);
}

// === 실행 영역 ===
const files = measureBundle();
const output = toVitaUIPluginOutput(files);
outputPlugin(output);
```

### 8.3 axe-core 접근성 plugin 예시

```javascript
// scripts/export-a11y-plugin.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const PAGES = ["/", "/dashboard", "/login"];
const BASE_URL = "http://localhost:3000";

// === 측정 영역 ===
async function measureA11y() {
  const browser = await chromium.launch();
  const violations = [];

  try {
    for (const page of PAGES) {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      await pg.goto(`${BASE_URL}${page}`);
      const result = await new AxeBuilder({ page: pg }).analyze();
      for (const v of result.violations) {
        violations.push({ ...v, page });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  return violations;
}

// === vitaui plugin 형식 변환 영역 ===
function toVitaUIPluginOutput(violations) {
  const critical = violations.filter(v => v.impact === "critical").length;
  const serious = violations.filter(v => v.impact === "serious").length;
  const total = violations.length;

  return {
    id: "a11y-audit",
    label: "접근성",
    measuredAt: new Date().toISOString(),
    summary: {
      primary: {
        label: "위반 영역",
        value: total,
        hint: "axe-core 검사",
        status: total === 0 ? "good" : critical > 0 ? "bad" : "warn"
      },
      secondary: [
        { label: "심각", value: critical, status: critical > 0 ? "bad" : "neutral" },
        { label: "심각도 중간", value: serious, status: serious > 0 ? "warn" : "neutral" },
        { label: "검사 페이지", value: PAGES.length }
      ]
    },
    details: violations.map(v => ({
      name: v.id,
      severity: v.impact ?? "unknown",
      count: v.nodes.length,
      page: v.page
    }))
  };
}

// === 자체 검증 영역 ===
function validatePluginOutput(output) {
  if (typeof output.id !== "string") throw new Error("id must be string");
  if (typeof output.label !== "string") throw new Error("label must be string");
  if (typeof output.measuredAt !== "string") throw new Error("measuredAt must be string");
  if (!output.summary?.primary) throw new Error("summary.primary required");
  return output;
}

// === 출력 영역 ===
function outputPlugin(output) {
  validatePluginOutput(output);
  const PLUGIN_DIR = `vitaui/reports/plugins/${output.id}`;
  const date = new Date().toISOString().slice(0, 10);
  mkdirSync(PLUGIN_DIR, { recursive: true });
  const filepath = join(PLUGIN_DIR, `${date}.json`);
  writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`✓ vitaui plugin output: ${filepath}`);
}

// === 실행 영역 ===
const violations = await measureA11y();
const output = toVitaUIPluginOutput(violations);
outputPlugin(output);
```

---

## 9. 체크리스트 — Plugin 발행 직전

- [ ] `vitaui/reports/plugins/{id}/` 폴더 생성됨
- [ ] `{date}.json` 파일 출력됨
- [ ] JSON 형식 유효 (`jq .` 통과)
- [ ] `id` 필드 = 폴더 이름과 일치
- [ ] 필수 필드 (`id` / `label` / `measuredAt` / `summary.primary`) 모두 존재
- [ ] `measuredAt` 가 ISO 8601 형식
- [ ] `summary.primary.value` 가 사용자에게 의미 있는 값
- [ ] `summary.secondary` 카드 (있으면) 적절한 `status` 설정
- [ ] `details` (있으면) 모든 행이 같은 컬럼 구조
- [ ] `validatePluginOutput()` 자체 검증 호출
- [ ] plugin 자체 명령 실행 시 자료 갱신 정상 작동
- [ ] vitaui dashboard 에서 plugin 탭 정상 표시
- [ ] CI 영역에서 자동 갱신 영역 (선택) 작동

---

## 10. FAQ

### Q1. plugin 폴더에 JSON 파일이 여러 날짜로 있으면 어떻게 표시되나요?

가장 최신 날짜 파일만 표시됩니다. 과거 파일은 영향 없이 보존되며, 추후 시계열 영역 (0.2.0+) 에서 활용 가능합니다.

### Q2. 같은 날짜에 여러 번 측정하면 어떻게 처리하나요?

같은 파일 (`{date}.json`) 을 덮어쓰기 권장합니다. plugin 측이 출력 시 최신 자료로 덮어씌우면 됩니다.

### Q3. plugin id 가 다른 plugin 과 충돌하면?

폴더 이름이 곧 plugin id 이므로 자연스럽게 분리됩니다. 다만 의미상 같은 plugin 이 중복 등록되면 사용자가 인지하기 어려우므로 고유 이름 사용 필수.

### Q4. plugin 측이 자료를 안 갱신하면 어떻게 되나요?

vitaui 는 가장 최신 파일을 표시합니다. 자료가 7일 이상 안 갱신되면 회색 배지 (stale 알림) 표시. plugin 측이 자료 갱신 시점에 책임이 있습니다.

### Q5. JSON 안에 한국어 사용 가능한가요?

네, UTF-8 형식이면 한국어 / 다른 언어 자유롭게 사용 가능합니다. `label` / `summary.primary.label` 등 모든 표시 영역 텍스트에 사용 가능합니다.

### Q6. plugin 자료를 git 에 commit 해야 하나요?

선택 영역입니다.

- **commit 권장** — 팀 전체가 같은 자료 공유, CI 자동 갱신 흐름 자연스러움
- **gitignore** — 자료가 자주 갱신되어 commit 부담이 크면 gitignore 후 CI artifact 로 관리

### Q7. vitaui 측이 plugin 자료를 못 읽으면 어떻게 알 수 있나요?

vitaui dashboard 에서 plugin 탭이:
- 빨간 알림 배지 표시 → JSON 형식 또는 필수 필드 오류
- 회색 알림 배지 표시 → 자료 7일 이상 오래됨 (stale)
- 정상 표시 → 자료 정상 읽음

### Q8. plugin 출력 위치를 다른 영역으로 변경 가능한가요?

vitaui 0.1.0 영역에서는 `vitaui/reports/plugins/{id}/{date}.json` 영역만 지원합니다. 추후 영역에서 vitaui.config.ts 의 plugin 위치 설정 영역 추가 검토 가능합니다.

### Q9. plugin 마다 다른 컬럼을 표시하고 싶어요.

`details` 의 객체는 자유 형식이라 plugin 마다 다른 컬럼 가능합니다. 다만 같은 plugin 안의 모든 행은 같은 컬럼 사용 권장 (다르면 빈 셀로 표시).

### Q10. 본 가이드 외의 영역 (예: 차트 / 그래프 자유 시각) 이 필요해요.

vitaui 0.1.0 영역에서는 표준 표 / 카드만 지원합니다. 자유 시각 영역은 vitaui 0.2.0 / 0.3.0 영역에서 추가 검토 가능합니다.

### Q11. plugin 자료가 너무 커서 dashboard 가 느려지는데?

vitaui 0.1.0 은 자료 크기 제한 없음. plugin 측에서 `details` 행 100~200 미만 권장. 추후 0.2.0 에서 페이징 검토.

### Q12. 같은 측정 도구를 다른 위치에 출력 가능?

가능. plugin id 는 폴더 단위 — 같은 vitest 결과를 `tests-unit` / `tests-integration` 두 plugin 으로 분리 가능.

### Q13. vitaui 가 plugin 자료를 표시할 때 캐싱하나?

vitaui 는 dashboard 빌드 시점에 1회 읽음. plugin 자료 갱신 후 `npx vitaui dashboard` 재실행 필요.

### Q14. meta 영역이 dashboard 에 안 보임?

vitaui 0.1.0 영역에서 dashboard 표시 빠짐. 자료 형식 약속만 유지 — JSON 파일 안 meta 자료는 보존됨. 추후 0.2.0 영역에서 dashboard 표시 추가.

---

## 11. 추가 영역 의뢰

본 가이드에 빠진 영역 / 명확하지 않은 영역 / 추가 영역 필요 시점에 vitaui 작성자에게 의뢰 부탁합니다.

추가 영역 검토 가능:

- 자유 차트 / 그래프 시각 영역
- 시계열 영역 (과거 자료 비교)
- meta 영역 dashboard 표시
- plugin 간 상호 작용 영역
- 자동 알림 영역
- plugin 측 schema 자체 명세 영역

---

**문서 끝**

본 가이드 대응 vitaui 버전: 0.1.0
