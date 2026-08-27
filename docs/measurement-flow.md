# 측정 흐름 / Measurement Flow

> 측정 전 설정(config) 작성은 README §3 참고 — AI 에이전트(Claude Code/Codex) 사용 시
> `npx dsmonitor agent-setup` 으로 자동화 가능 (0.12.0+, 정본: `docs/agent-setup-playbook.md`).
> Setup happens before measurement — see README §3; with a coding agent, `npx dsmonitor
> agent-setup` automates it (0.12.0+, canonical playbook: `docs/agent-setup-playbook.md`).

## 한국어

dsmonitor 는 3가지 측정 부분 진행:

1. **Code** — 소스 코드 정적 분석 (TypeScript / JavaScript / SCSS / CSS)
2. **Figma** — 디자인 시스템 vs 시안 비교 (instance source / componentMatch / tokenMatrix)
3. **Lighthouse** — 런타임 품질 측정 (Performance / Accessibility / Best Practices / SEO)

각 측정 부분은 독립 진행 가능. 단 **dashboard 안 반영 위해서는 통합 측정 명령 (`audit --baseline`) 사용 권고**.

### 정보 흐름 / Data Flow

```
[측정 진행]
  ├── code              → baseline-{date}.json 안 codeResults
  ├── figma             → baseline-{date}.json 안 figmaResults
  │                     + figma-instances-{date}.json (raw, instance level)
  └── lighthouse        → lighthouse/reports/{date}/ 안 LHR + summary.json
                          (baseline-{date}.json 과 별도)

[dashboard 재생성]
  ├── input 1 = 가장 최근 baseline-{date}.json (prefix 매칭)
  └── input 2 = 가장 최근 lighthouse/reports/{date}/summary.json

→ dashboard HTML 안 3 부분 통합 표시
```

### 명령별 차이 / Command Comparison

| 명령 | baseline-{date}.json 생성 | dashboard 반영 | 사용 시점 |
|---|---|---|---|
| `npx dsmonitor audit` (단독) | ✗ (`{date}.json` 으로 출력) | ✗ (prefix 누락) | 빠른 측정 (단순 결과 출력) |
| `npx dsmonitor audit --baseline` | ✓ (`baseline-{date}.json`) | — | baseline 갱신 |
| `npx dsmonitor audit --only code` | ✗ | ✗ | code 측정만 빠르게 |
| `npx dsmonitor audit --only figma` | ✗ | ✗ | figma raw (instance level) |
| `npx dsmonitor report` | — | — | markdown 재생성 (baseline read) |
| `npx dsmonitor dashboard` | — | ✓ (input read) | dashboard 재빌드 (baseline read) |
| `node node_modules/dsmonitor/lighthouse/run.js` | — | ✓ (별도 input) | lighthouse 측정 (~25분) |

### 권고 사용 흐름 / Recommended Usage

#### 일상 측정 (권고)

`package.json` 안 script 권고:

```json
{
  "scripts": {
    "dsmonitor:baseline": "npx dsmonitor audit --baseline && npx dsmonitor report && npx dsmonitor dashboard",
    "dsmonitor:dashboard": "npx dsmonitor dashboard",
    "dsmonitor:lighthouse": "node node_modules/dsmonitor/lighthouse/run.js"
  }
}
```

흐름:

1. **일상 측정** = `npm run dsmonitor:baseline` (~3-5분)
   - code + figma 통합 측정
   - 새 `baseline-{date}.json` 생성
   - markdown + dashboard 자동 재생성
2. **lighthouse 측정** = `npm run dsmonitor:lighthouse` (~25분, 별도)
   - 30 LHR + summary.json 생성
   - dashboard 재실행 불필요
3. **dashboard만 재생성** = `npm run dsmonitor:dashboard` (~10초)
   - 옛 baseline read 후 dashboard html 재빌드

### 짚어드릴 점 / Caveats

- **`audit --only figma` 단독 = dashboard 반영 누락**: 본 명령은 `figma-instances-{date}.json` (raw) 만 출력. baseline JSON 누락이라 dashboard 안 안 잡힘. dashboard 안 figma 반영 위해서는 `audit --baseline` 사용.

- **`audit` (`--baseline` 없이) 단독 = `{date}.json` 출력** (prefix `baseline-` 누락). dashboard 흐름 = `findLatestReportJson` 가 baseline prefix 만 매칭이라 본 출력은 안 잡힘.

- **lighthouse 측정 결과 = baseline 과 별도 폴더** (`lighthouse/reports/{date}/`). dashboard 가 빌드 시점에 그 폴더에서 별도 read.

- **처음 사용자 = `audit --baseline` 권고** (모든 측정 통합).

### DS 라벨 규칙 / DS Label Rules (0.2.0)

라벨 형태 = 사용자 자유 결정. `primary: true` 명시하면 dashboard 안 사용자 라벨 그대로 표시.

- DS 1개 = 자동 primary (primary 필드 생략 가능)
- DS 2개 이상 = 정확히 1개에 `primary: true` 명시 필수
- primary 0개 또는 2개 이상 = 에러 throw

자세한 안내 = [README](../README.md) 안 "DS File Labels" 부분 + [docs/figma-config-guide.md](./figma-config-guide.md).

---

## English

dsmonitor performs three measurement areas:

1. **Code** — static analysis of source code (TypeScript / JavaScript / SCSS / CSS)
2. **Figma** — design system vs design comparison (instance source / componentMatch / tokenMatrix)
3. **Lighthouse** — runtime quality measurement (Performance / Accessibility / Best Practices / SEO)

Each area can run independently, but **to be reflected in the dashboard, use the integrated measurement command (`audit --baseline`)**.

### Data Flow

```
[Measurement]
  ├── code              → codeResults inside baseline-{date}.json
  ├── figma             → figmaResults inside baseline-{date}.json
  │                     + figma-instances-{date}.json (raw, instance-level)
  └── lighthouse        → LHR + summary.json under lighthouse/reports/{date}/
                          (separate from baseline-{date}.json)

[Dashboard rebuild]
  ├── input 1 = latest baseline-{date}.json (prefix-matched)
  └── input 2 = latest lighthouse/reports/{date}/summary.json

→ Dashboard HTML displays all three areas integrated
```

### Command Comparison

| Command | Creates baseline-{date}.json | Reflected in dashboard | When |
|---|---|---|---|
| `npx dsmonitor audit` (alone) | ✗ (writes `{date}.json`) | ✗ (no prefix) | Quick measure (raw output) |
| `npx dsmonitor audit --baseline` | ✓ (`baseline-{date}.json`) | — | Update baseline |
| `npx dsmonitor audit --only code` | ✗ | ✗ | Code-only fast measure |
| `npx dsmonitor audit --only figma` | ✗ | ✗ | Figma raw (instance-level) only |
| `npx dsmonitor report` | — | — | Regenerate markdown (reads baseline) |
| `npx dsmonitor dashboard` | — | ✓ (reads input) | Rebuild dashboard (reads baseline) |
| `node node_modules/dsmonitor/lighthouse/run.js` | — | ✓ (separate input) | Lighthouse measurement (~25 min) |

### Recommended Usage

#### Day-to-day measurement (recommended)

`package.json` scripts:

```json
{
  "scripts": {
    "dsmonitor:baseline": "npx dsmonitor audit --baseline && npx dsmonitor report && npx dsmonitor dashboard",
    "dsmonitor:dashboard": "npx dsmonitor dashboard",
    "dsmonitor:lighthouse": "node node_modules/dsmonitor/lighthouse/run.js"
  }
}
```

Flow:

1. **Routine measurement** = `npm run dsmonitor:baseline` (~3–5 min)
   - Integrated code + figma measurement
   - New `baseline-{date}.json` generated
   - Markdown + dashboard auto-regenerated
2. **Lighthouse measurement** = `npm run dsmonitor:lighthouse` (~25 min, separate)
   - 30 LHR files + summary.json generated
   - No need to re-run dashboard
3. **Dashboard rebuild only** = `npm run dsmonitor:dashboard` (~10 sec)
   - Rebuilds dashboard HTML from existing baseline

### Caveats

- **`audit --only figma` alone = NOT reflected in dashboard**: this command only writes `figma-instances-{date}.json` (raw) and does not produce a baseline JSON; the dashboard cannot pick it up. To reflect figma in the dashboard, use `audit --baseline`.

- **`audit` (without `--baseline`) writes `{date}.json`** (no `baseline-` prefix). The dashboard's `findLatestReportJson` only matches the baseline prefix, so this output is ignored.

- **Lighthouse measurement uses a separate folder** (`lighthouse/reports/{date}/`), independent of the baseline JSON. The dashboard reads it during rebuild.

- **First-time users → use `audit --baseline`** (covers all measurement areas).

### DS Label Rules (0.2.0)

Labels are free-form (user-defined). Specify primary via `primary: true`; the dashboard renders user labels verbatim.

- 1 DS file = auto-primary (`primary` field can be omitted)
- 2+ files = exactly one must have `primary: true`
- 0 or 2+ primaries = throws error

See the "DS File Labels" section in [README](../README.md) and [docs/figma-config-guide.md](./figma-config-guide.md) for details.
