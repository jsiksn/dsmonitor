# 측정 흐름 / Measurement Flow

## 한국어

dsmonitor 자료 3가지 측정 영역 진행:

1. **Code** — 소스 코드 정적 분석 (TypeScript / JavaScript / SCSS / CSS)
2. **Figma** — 디자인 시스템 vs 시안 비교 (instance source / componentMatch / tokenMatrix)
3. **Lighthouse** — 런타임 품질 측정 (Performance / Accessibility / Best Practices / SEO)

각 측정 영역 자료 독립 진행 가능. 단 **dashboard 안 반영 자료 자료 자료 통합 측정 명령 (`audit --baseline`) 자료 자료 권고**.

### 자료 흐름 / Data Flow

```
[측정 진행]
  ├── code              → baseline-{date}.json 안 codeResults
  ├── figma             → baseline-{date}.json 안 figmaResults
  │                     + figma-instances-{date}.json (raw, instance level)
  └── lighthouse        → lighthouse/reports/{date}/ 안 LHR + summary.json
                          (baseline-{date}.json 자료 별도)

[dashboard 재생성]
  ├── input 1 = 가장 최근 baseline-{date}.json (prefix 자료)
  └── input 2 = 가장 최근 lighthouse/reports/{date}/summary.json

→ dashboard HTML 안 3 영역 통합 표시
```

### 명령별 차이 / Command Comparison

| 명령 | baseline-{date}.json 생성 | dashboard 반영 | 사용 시점 |
|---|---|---|---|
| `npx dsmonitor audit` (단독) | ✗ (`{date}.json` 자료 자료) | ✗ (prefix 자료 빠짐) | 빠른 측정 (단순 결과 자료 자료) |
| `npx dsmonitor audit --baseline` | ✓ (`baseline-{date}.json`) | — | baseline 갱신 자료 |
| `npx dsmonitor audit --only code` | ✗ | ✗ | code 측정만 빠르게 |
| `npx dsmonitor audit --only figma` | ✗ | ✗ | figma raw 자료 (instance level) |
| `npx dsmonitor report` | — | — | markdown 재생성 (baseline 자료 read) |
| `npx dsmonitor dashboard` | — | ✓ (input read) | dashboard 재빌드 (baseline 자료 read) |
| `node node_modules/dsmonitor/lighthouse/run.js` | — | ✓ (별도 input) | lighthouse 측정 (~25분) |

### 권고 사용 흐름 / Recommended Usage

#### 일상 측정 (권고)

`package.json` 안 script 자료:

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
   - dashboard 재실행 자료 자료 자료
3. **dashboard만 재생성** = `npm run dsmonitor:dashboard` (~10초)
   - 옛 baseline 자료 자료 자료 dashboard html 재빌드

### 짚어드릴 점 / Caveats

- **`audit --only figma` 단독 = dashboard 반영 빠짐**: 본 명령 자료 `figma-instances-{date}.json` (raw) 자료 자료 자료. baseline JSON 자료 빠짐 본질이라 dashboard 자료 자료 자료 자료. dashboard 안 figma 반영 자료 자료 `audit --baseline` 자료 자료.

- **`audit` (`--baseline` 자료) 자료 = `{date}.json` 자료 자료 자료** (prefix `baseline-` 빠짐). dashboard 자료 = `findLatestReportJson` 자료 자료 자료 baseline prefix 자료 자료 자료 자료라 본 자료 자료 자료 빠짐.

- **lighthouse 측정 자료 = baseline 자료 별도 폴더** (`lighthouse/reports/{date}/`). dashboard 자료 자료 자료 자료 자료 자료 자료 read 자료.

- **처음 사용자 = `audit --baseline` 자료** (모든 측정 통합).

### DS 라벨 규칙 / DS Label Rules

- `ds-new` = primary (마이그레이션 목표)
- `ds-legacy` = 옛 DS

Dashboard 안 "primary 비중 높을수록" = `ds-new` 비중 자료. 자세 안내 = [README](../README.md) 안 "DS File Labels" 영역.

> **Note**: 0.2.0 자료 = primary 자료 라벨이 아닌 별도 필드 (`primary: true`) 자료 자료 자료 자료 (breaking change).

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

### DS Label Rules

- `ds-new` = primary (migration target)
- `ds-legacy` = legacy DS

In the dashboard, "higher primary ratio is better" refers to `ds-new`. See the "DS File Labels" section in [README](../README.md) for details.

> **Note**: In 0.2.0, `primary` will be specified as a separate field (`primary: true`) instead of the label name (breaking change).
