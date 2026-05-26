import type { StylingPolicy } from "./policy";
// dsmonitor 패키지 진입점에서 StylingPolicy 도 함께 노출 (외부 config 작성자 편의).
export type { StylingPolicy } from "./policy";

export interface UIHealthConfig {
  projectRoot: string;

  /**
   * 프로젝트 이름 — dashboard header / footer 안 표시.
   *
   * 미지정 시 `package.json` 안 `name` 자동 read. 둘 다 없는 시점 = "Unknown Project".
   */
  projectName?: string;

  /** 프로젝트별 스타일링 정책 — 허용/금지/권장 스타일링 방식. */
  stylingPolicy: StylingPolicy;

  scan: {
    codeRoots: string[];
    styleRoots: string[];
    ignore: string[];
    codeExts: string[];
    styleExts: string[];
  };

  /**
   * 글로벌(= "허용된") 스타일 정의의 출처 glob 패턴.
   *
   * v0.4 orphan class 분류용. 이 glob 에 매치되는 파일에서 정의된 모든 CSS
   * 클래스 셀렉터를 수집해 "글로벌 인덱스" 를 만든다.
   *
   * 컴포넌트가 사용한 className 중 하나 이상이 이 인덱스에 존재하면
   * `allowedGlobal` (건강한 글로벌 재사용), 하나도 없으면 `orphanClass`
   * (어디에도 정의 안 된 부채) 로 분류.
   *
   * 각 프로젝트는 글로벌 스타일 파일이 있는 실제 경로를 지정 —
   * 예) 이 프로젝트는 `styles/css/scss/*.scss` 와 `styles/css/*.css`
   * (labeling.css 가 이 폴더에 있음). 이 패턴들 밖의 SCSS/CSS 파일은
   * 모두 컴포넌트 전용으로 간주되어 인덱스에 포함 안 함.
   */
  globalStyleSources: string[];
  designSystem: {
    officialPaths: string[];
    officialAliases: string[];
    componentExts: string[];
  };
  hardcodedValues: {
    colorPatterns: RegExp[];
    scssVariableUsagePatterns: RegExp[];
    scssVariableDefFiles: string[];
  };
  migrationTargets: Record<
    string,
    { aliases: string[]; nativeTags: NativeTagSpec[] }
  >;
  migrationMinClassLength: number;
  /**
   * 마이그레이션 후보 검출 옵션 (0.7.2+).
   *
   * 옛 schema 와의 관계:
   *   - `metrics.migrationCandidates: boolean` = 측정 자체를 켜고 끄는 toggle.
   *   - `migrationCandidates: MigrationCandidatesOptions` = 측정 동작의 세부 옵션.
   *   같은 prefix 를 가지지만 다른 차원입니다.
   */
  migrationCandidates?: MigrationCandidatesOptions;
  report: {
    outputDir: string;
    baselineFilenamePrefix: string;
  };
  /**
   * Soft lint baseline 설정 (Phase 1: 가시화 전용, CI 블로킹 없음).
   *
   * 이 파일은 `npm run lint:summary`가 참조해서 현재 위반 수를 baseline과
   * 비교·표시한다. CI 실패 처리는 하지 않는다. 파일이 없으면 summary는
   * "baseline 없음" 메시지만 출력하고 종료 (신규 프로젝트 대비).
   *
   * 참고: 이 파일과 `lint-baseline.json`(dsmonitor/eslint 의 파일별
   * 심각도 오버라이드 맵)은 **다른 파일**이다. 헷갈리지 말 것.
   */
  softBaseline?: {
    /** baseline JSON 파일 경로 (config 파일 기준 상대경로) */
    path: string;
  };

  /**
   * 어떤 프레임워크의 코드를 분석할지. 어댑터 선택 키.
   * 현재 지원: "react". Vue/Svelte는 어댑터 추가 후 사용.
   */
  framework: {
    id: string;
  };

  /**
   * 각 지표를 켜고 끌지. 프로젝트 상황에 맞지 않는 지표는 false로.
   * 예) 순수 TS 프로젝트면 tsMigration: false.
   */
  metrics: {
    tsMigration: boolean;
    dsCoverage: boolean;
    migrationCandidates: boolean;
    stylingDistribution: boolean;
    hardcodedColors: boolean;
    scssVariableCompliance: boolean;
    /**
     * Figma baseline 측정 on/off (Phase 0.5).
     * true 로 설정 시 `figma` 필드, `FIGMA_API_TOKEN` env 모두 필요.
     * 둘 중 하나라도 없으면 친절한 에러와 함께 중단.
     */
    figmaAnalysis: boolean;
  };

  /**
   * Figma baseline 측정 설정 (Phase 0.5 최소 버전 + Phase B 확장 예정).
   *
   * `metrics.figmaAnalysis` 가 true 일 때만 사용. 실제 파일 URL 은 민감 정보이므로
   * `dsmonitor.config.local.ts` (.gitignore 대상) 에서 import 해서 주입.
   */
  figma?: FigmaConfig;

  /**
   * Lighthouse 측정 설정 (옵션).
   *
   * Phase 0.5 (2026-04-27 분리 4단계) 에는 type 만 정의되어 있고 실제 활용은
   * Phase B 의 AuthAdapter 인터페이스 작업과 함께 정식화 예정.
   */
  lighthouse?: LighthouseConfig;

  /**
   * 리포트 해석용 임계값. 각 지표에 대해 "이 값이면 good/warn/bad" 를 결정.
   * direction: 'higher' — 값이 높을수록 좋음 (good: 값 ≥ good, warn: 값 ≥ warn)
   * direction: 'lower'  — 값이 낮을수록 좋음 (good: 값 ≤ good, warn: 값 ≤ warn)
   */
  thresholds: {
    dsCoverage: Threshold;
    tsMigration: Threshold;
    scssVariableCompliance: Threshold;
    /** 참고 지표. 현재 reporter는 informational로 표시하고 개선/강점 분류에서 제외한다. */
    preferredCompliance: Threshold;
    hardcodedColors: Threshold;
    forbiddenClassOccurrences: Threshold;
    /** 주 지표 — forbidden 방식을 쓰는 파일 비율. 낮을수록 좋음. */
    forbiddenFileRatio: Threshold;
    /**
     * 컴포넌트 매칭률 (B 그룹 단계 3, 2026-04-29).
     * Figma DS variantGroup 이름 ↔ 코드 className (글로벌 인덱스 + JSX/TSX 사용 합집합) 매칭.
     * 본 프로젝트는 Figma 이름 ↔ CSS class 동기화 정책이라 같은 kebab-case 로 정확 일치.
     */
    componentMatch?: Threshold;
  };

  /**
   * 측정 도구 자체의 개선 이력. 분석 로직이 바뀌어 과거 수치가 재해석될 필요가
   * 있을 때 기록. 리포트 하단에 표시되어 "왜 이 숫자가 이만큼 바뀌었는지"를
   * 독자가 추적할 수 있게 한다.
   */
  measurementHistory?: MeasurementHistoryEntry[];

  /**
   * 개선 작업의 단계 상태. baseline.md 상단에 배지로 렌더링된다.
   * 리포트는 자동 생성물이므로 단계 전환 시 config에서 바꿔야 유지된다.
   *
   * 일반적 운용:
   *   - completedPhases: Phase 종료 시 수동으로 추가
   *   - currentPhase: 지금 진행 중인 Phase (1개)
   *   - upcomingPhases: 로드맵 상 이후 Phase를 선언. 리포트에 "예정" 표기로
   *     노출 가능. 수동 전환 시 upcoming → current → completed 순으로 이동.
   */
  reportStatus?: {
    completedPhases?: Array<{ name: string; completedAt: string; note?: string }>;
    currentPhase?: { name: string; note?: string; startedAt?: string };
    upcomingPhases?: Array<{ name: string; note?: string }>;
  };
}

/**
 * `UIHealthConfig.migrationCandidates` 의 세부 옵션 (0.7.2+).
 *
 * 본 옵션은 마이그레이션 후보 검출 흐름만 정정합니다. `totals.dsComponentFiles`
 * 같은 다른 지표는 영향을 받지 않습니다.
 */
export interface MigrationCandidatesOptions {
  /**
   * `designSystem.officialPaths` 에 매치되는 파일을 마이그레이션 후보 검출에서
   * 자동으로 제외할지 여부.
   *
   * @default true
   *
   * true 시점 (default):
   *   - officialPaths glob (`src/laon-web-ui/**`, `src/components/ds/**` 등) 안 파일은
   *     후보 점검에서 제외됩니다.
   *   - DS 본체 안에서 native HTML 을 자연스럽게 사용하는 케이스 (예: Button.tsx 가
   *     내부에서 `<button>` 을 쓰는 경우) 가 false positive 로 잡히지 않습니다.
   *   - `scan.ignore` 에 DS 폴더를 따로 추가하지 않아도 됩니다.
   *
   * false 시점:
   *   - 옛 (~ 0.7.1) 동작 — officialPaths 안 파일도 후보 검출 대상.
   *   - DS 본체 자체의 native HTML 패턴을 그대로 보고 싶을 때 활용합니다.
   *
   * 영향 범위 — `scan.ignore` 와 비교:
   *   - `scan.ignore` 는 모든 측정에서 제외합니다 (파일을 walk 자체에서 건너뜀).
   *   - `excludeOfficialPaths` 는 마이그레이션 후보 검출에서만 제외합니다.
   *     officialPaths 안 파일은 그대로 `totals.dsComponentFiles` 등 DS 본체 지표에
   *     포함됩니다.
   */
  excludeOfficialPaths?: boolean;
}

/**
 * `migrationTargets.<name>.nativeTags` 의 한 항목.
 *
 * 0.6.0 부터 string 외에 `{ tag, type? }` 객체도 허용합니다 (W 항목).
 *
 *   - `"button"` — tag 이름만 비교. 옛 0.5.x 까지 형식.
 *   - `{ tag: "input" }` — 모든 `<input>` 매칭. type attribute 무관.
 *   - `{ tag: "input", type: "checkbox" }` — `<input type="checkbox">` 만 매칭.
 *
 * HTML `<input>` 처럼 type attribute 로 의미가 갈라지는 태그를 Checkbox / Radio /
 * Switch 등 별도 DS 컴포넌트로 분리하고 싶을 때 활용합니다.
 *
 * 호환성: 옛 `nativeTags: ["input"]` 형식의 설정은 그대로 작동합니다.
 */
export type NativeTagSpec =
  | string
  | { tag: string; type?: string };

export interface MeasurementHistoryEntry {
  version: string;
  date: string; // "YYYY-MM-DD"
  summary: string;
  notes: string[];
}

export interface Threshold {
  good: number;
  warn: number;
  direction: "higher" | "lower";
}

export interface CodebaseReport {
  generatedAt: string;
  projectRoot: string;
  totals: {
    codeFiles: number;
    styleFiles: number;
    tsFiles: number;
    jsFiles: number;
    dsComponentFiles: number;
    nonDsComponentFiles: number;
  };
  hardcodedColors: {
    total: number;
    byFile: Array<{ file: string; count: number; samples: string[] }>;
  };
  scssVariableCompliance: {
    variableUsages: number;
    hardcodedLiterals: number;
    compliance: number;
  };
  stylingMethodDistribution: {
    /** policy.allowed[*].id 별 파일 수 (non-exclusive) */
    allowed: Record<string, number>;
    /** policy.forbidden[*].id 별 파일 수 (non-exclusive) */
    forbidden: Record<string, number>;
    /**
     * v0.4 — 기존 `none` 을 3분할:
     *   allowedGlobal: className 토큰이 글로벌 스타일 인덱스에 정의돼 있음 (건강)
     *   orphanClass:   className 은 있으나 어디에도 정의되지 않음 (부채)
     *   noClass:       className 자체 없음 (wrapper 컴포넌트 등)
     */
    allowedGlobal: number;
    orphanClass: number;
    noClass: number;
    /** orphan class 사용 상위 20개 — 부채 규모/위치 파악용 */
    orphanSamples: Array<{
      className: string;
      occurrences: number;
      /** 해당 클래스가 등장하는 파일 경로 (최대 5개) */
      sampleFiles: string[];
    }>;
    totalFiles: number;
    preferredId: string;
    /**
     * v0.7 (2026-04-28) — 정의 변경 + 메타정보 객체화.
     *
     * 분자: preferred + allowedGlobal (정상 스타일링 방식)
     * 분모: 분자 + forbidden 합계
     * 제외: orphanClass / noClass (정상 분포 측정 대상 아님)
     *
     * v0.6 이전 정의 (preferred / (preferred + forbidden)) 와 시계열 단절.
     * 상세한 내용: measurementHistory v0.7 entry.
     */
    preferredCompliance: PreferredComplianceMeta;
    /** forbidden 방식을 쓰는 파일 수 (bootstrap/tailwind 등 union, 파일 단위) */
    forbiddenFileCount: number;
    /** forbiddenFileCount / totalFiles. 프로젝트 구조와 무관하게 비교 가능한 주 지표 */
    forbiddenFileRatio: number;
  };
  forbiddenClassCount: {
    /** policy.forbidden[*].id 별 총 occurrence 수 */
    byId: Record<string, number>;
    total: number;
    topFiles: Array<{
      file: string;
      byId: Record<string, number>;
      total: number;
    }>;
  };
  tsMigration: {
    tsFiles: number;
    jsFiles: number;
    ratio: number;
    /**
     * v0.7 (2026-04-28) — 디렉토리별 ts/js 분포.
     *
     * 1-depth 기준, 단 `apps/` 는 2-depth (예: "apps/material") 까지.
     * 정렬: jsFiles 내림차순 — JS 비중 높은 디렉토리 우선.
     * 필터링 없음 — raw 보존 (작은 디렉토리 표시 여부는 시각화 부분).
     */
    byDir: Array<{
      dir: string;
      tsFiles: number;
      jsFiles: number;
      totalFiles: number;
      /** tsFiles / totalFiles. 0~1. */
      ratio: number;
    }>;
  };
  dsCoverage: {
    filesUsingDs: number;
    totalConsumerFiles: number;
    coverage: number;
    topDsImports: Array<{ source: string; count: number }>;
  };
  migrationCandidates: {
    byTarget: Record<string, number>;
    totalOccurrences: number;
    totalFilesAffected: number;
    topFiles: Array<{ file: string; occurrences: number; targets: string[] }>;
    samples: Array<{
      file: string;
      line: number;
      nativeTag: string;
      suggestedDs: string;
      classSample: string;
    }>;
  };

  /**
   * Figma baseline 측정 결과 (Phase 0.5).
   * `cfg.metrics.figmaAnalysis` 가 false 이거나 측정 실패 시 undefined.
   */
  figma?: FigmaReport;
}

/**
 * preferredCompliance 메타정보 (v0.7, 2026-04-28).
 *
 * 정의: (preferred + allowedGlobal) / (preferred + forbidden 합계 + allowedGlobal).
 * 분자/분모/제외 항목 모두 raw 카운트 노출 — 대시보드에서 분해 시각화 가능.
 *
 * v0.6 이전엔 number 직접 노출. v0.7 부터 객체로 래핑 + 정의 자체 변경 (allowedGlobal
 * 분자 포함). 시계열 단절 — measurementHistory v0.7 entry 참조.
 */
export interface PreferredComplianceMeta {
  /** 최종 비율. 0~1. round(value, 4). */
  value: number;
  /** 분자 — 정상 스타일링 방식 합. */
  numerator: ComplianceComponent;
  /** 분모 — 분자 + forbidden. */
  denominator: ComplianceComponent;
  /**
   * 분모/분자 어느 쪽에도 포함 안 한 항목 (orphanClass / noClass).
   * 정상 스타일링 방식 분포 측정 대상이 아님 — 사유는 reason 참조.
   */
  excluded: {
    items: string[];
    counts: Record<string, number>;
    reason: string;
  };
}

/** PreferredComplianceMeta 의 분자 / 분모 공통 shape. */
export interface ComplianceComponent {
  /** 합산 항목 키 목록 (counts 의 keys 와 일치). */
  items: string[];
  /** 항목별 카운트. */
  counts: Record<string, number>;
  /** items 의 counts 합. */
  total: number;
}

export interface SourceFile {
  absPath: string;
  relPath: string;
  ext: string;
  content: string;
}

/**
 * 코드 className 인덱스 (B 그룹 단계 3, 2026-04-29).
 *
 * `analyzeCodebase` 가 산출하는 부산물 — globalCss 정의 + JSX/TSX 사용. baseline JSON
 * 직렬화 대상은 아니며, in-process 로 figma analyzer 의 컴포넌트 매칭에 전달.
 *
 * 두 부분 모두 token 단위 (className 속성 1개 안 여러 토큰을 split 한 결과) Set.
 * Set 으로 출력해 has() 매칭 비용 O(1).
 */
export interface ClassIndex {
  /**
   * globalStyleSources glob 에 매치되는 SCSS/CSS 파일에서 정의된 className 들
   * (`.foo` 셀렉터의 `foo`). buildGlobalClassIndex 결과.
   */
  globalClassNames: Set<string>;
  /**
   * jsx/tsx 컴포넌트의 `className=` 속성에서 token 단위로 추출된 className 들.
   * 동적 표현 ({...}) 은 framework adapter 가 추출 가능한 범위까지.
   */
  jsxUsedClassNames: Set<string>;
}

// ═══════════════════════════════════════════════════════════════════
// Figma baseline 측정 관련 타입 (Phase 0.5)
// ═══════════════════════════════════════════════════════════════════

/**
 * 프레임 참조. Figma "Copy link to selection" 으로 복사한 프레임 URL.
 * `comment` 는 선택 — 사람이 config 읽을 때 / 리포트 출력 시 가독성용 (프레임 이름 등).
 */
export type FigmaFrameRef = {
  url: string;
  comment?: string;
};

/**
 * 도메인 파일의 페이지 선택. Union 타입으로 2가지 형태 표현:
 *   a) 페이지 전체 측정 — `url` 있음 (페이지 Copy link), `frames` 없음
 *   b) 프레임 단위 측정 — `url` 없음, `comment` 로 페이지 이름 표현, `frames` 있음
 *
 * union 분기로 잘못된 조합 (예: url + frames 동시) 은 컴파일 에러로 차단.
 */
export type FigmaPageSelection =
  | {
      /** 페이지 URL (Figma 페이지 탭 우클릭 → Copy link). */
      url: string;
      /** 가독성용 메모 (페이지 이름 등). */
      comment?: string;
      /** 이 분기에서는 frames 없음 (타입 가드용). */
      frames?: undefined;
    }
  | {
      /** 이 분기에서는 url 없음 (타입 가드용). */
      url?: undefined;
      /** URL 없는 대신 페이지 이름을 comment 로 표현 (권장). */
      comment?: string;
      /** 측정할 프레임들. 각 프레임의 Copy link to selection. */
      frames: FigmaFrameRef[];
    };

/**
 * DS 파일 설정. 파일 단위로 Styles / Main Components 를 카운트.
 * 페이지/프레임 선택은 제공하지 않음 (DS 파일 전체 대상).
 */
export type FigmaDesignSystemFile = {
  /** Figma "Copy link" (파일 루트). */
  url: string;
  /** 리포트/매칭용 고유 라벨 (사용자 자유 결정 — 예: "ds-new", "v1", "legacy"). */
  label: string;
  /**
   * primary DS 명시 (0.2.0).
   *
   * - DS 1개뿐이면 자동 primary (생략 가능).
   * - DS 2개 이상이면 정확히 1개에 `primary: true` 명시 필수. 아니면 throw.
   *
   * 0.1.x 흐름 = `"ds-new"` 라벨 자동 primary 처리 (변경 시점 = 0.2.0 부터).
   */
  primary?: boolean;
  /**
   * 가독성용 메모 (예: "새 DS", "옛 수작업 DS"). 리포트 헤더/컬럼 병기에 사용.
   * 도메인 파일의 comment 와 대칭. 없으면 리포트에서 괄호 부분 생략.
   */
  comment?: string;
};

/**
 * 도메인 파일 설정. Union 타입으로 2가지 형태 표현:
 *   a) 파일 전체 측정 — `url` 있음 (파일 Copy link, node-id 없어야 함), `pages` 없음
 *   b) 페이지/프레임 선택 — `url` 없음, `pages` 있음
 *
 * 구조 단순화 (2026-04-23) — planning.md §7 "FigmaDomainFile 계층 단순화" 참조.
 * 각 측정 단위마다 URL 한 개만 입력 — 파일 키는 프레임/페이지 URL 에도 들어있으므로
 * 프레임 단위 측정 시 파일 URL 중복 입력 불필요.
 *
 * 한 `FigmaDomainFile` 내 모든 URL 은 **같은 파일 소속** 이어야 함
 * (fileKeyValidator 로 검증).
 */
export type FigmaDomainFile =
  | {
      /** 파일 식별자 (리포트 그룹핑 키. 중복 불가). */
      label: string;
      /** 파일 루트 URL (Copy link, node-id 없어야 함). */
      url: string;
      /** 가독성용 메모. */
      comment?: string;
      /** 이 분기에서는 pages 없음 (타입 가드용). */
      pages?: undefined;
    }
  | {
      label: string;
      /** 이 분기에서는 url 없음 (타입 가드용). */
      url?: undefined;
      /** 측정할 페이지 / 프레임 목록. */
      pages: FigmaPageSelection[];
    };

/**
 * Lighthouse 측정 설정 — `UIHealthConfig.lighthouse`.
 *
 * 0.4.0 (2026-05-12) — 인증 흐름 재설계. 옛 `authAdapter?: string` 제거,
 * 새 `auth?: LighthouseAuthConfig` 도입 (3종 discriminated union).
 *
 * 0.5.0 (2026-05-14) — 단일 source 흐름 BREAKING. 옛
 * `dsmonitor/lighthouse/config.js` 안 PAGES hard-code 자체 폐기.
 * `lighthouse.{baseUrl, pages, runs, auth, advanced?}` 자체 안에서만 명시.
 * dsmonitor 자체 안 LHCI config 자체 동적 생성 → `node_modules/.cache/dsmonitor/lighthouserc.js`
 * 자체 임시 파일 inject.
 */
export type LighthouseConfig = {
  /**
   * 측정 대상 base URL (dev / it / prod 환경 전환 시 본 값만 정정).
   *
   * 미지정 시점 = `process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000"` fallback.
   * 외부 사용자 환경 안 명시 권고: `process.env.LIGHTHOUSE_BASE_URL ?? "..."`.
   */
  baseUrl?: string;

  /**
   * 측정 대상 페이지 목록 (0.5.0+). `baseUrl + path` 자체 LHCI url 자체 활용.
   *
   * 미지정 / 빈 배열 시점 = `["/"]` fallback (baseUrl 자체 1 URL 측정).
   *
   * 0.4.x 이하 안 본 필드 자체 = dead. 옛 외부 사용자 환경 안
   * `dsmonitor/lighthouse/config.js` 안 `const PAGES = [...]` 자체 hard-code
   * 흐름 활용 → 0.5.0 안 본 필드 자체 활용 흐름 상세.
   */
  pages?: LighthousePageRef[];

  /**
   * URL 1개당 측정 반복 수. default = 3.
   *
   * LHCI 안 `ci.collect.numberOfRuns` 자체 inject. 상세 = 3 자체 (대표 median
   * 값 자체 추출 자체 상세). 1 자체 = 빠른 상세 (대표값 의미 상세 약함).
   */
  runs?: number;

  /**
   * 인증 방식 — 3종 중 선택. 미지정 시 = `{ type: 'none' }` 자연 처리.
   *
   * - `none`   = 인증 없는 공개 사이트. `puppeteerScript` 자체 미사용.
   *              `disableStorageReset` 자체 = LHCI default `false`.
   * - `basic`  = ID/PW form login. dsmonitor 패키지 내장 어댑터
   *              (`lighthouse/auth/basic-form-login.js`) 활용.
   *              `LIGHTHOUSE_LOGIN_URL` / `LIGHTHOUSE_TEST_ID` /
   *              `LIGHTHOUSE_TEST_PW` 환경변수 read.
   * - `custom` = 외부 사용자 어댑터. `adapter` 필드에 경로 명시
   *              (config 디렉토리 기준 상대경로 또는 절대경로).
   *              어댑터 = LHCI `puppeteerScript` 호환 (단일 default
   *              export `async (browser, context) => void`).
   *              어댑터 안 `getMetadata()` 함수 export 시 → `summary.json`
   *              안 메타데이터 등록.
   *
   * `type !== "none"` 자체 = `disableStorageReset: true` 자동 inject
   * (어댑터 안 심은 세션 / JWT 보존).
   */
  auth?: LighthouseAuthConfig;

  /**
   * LHCI `ci.collect.settings` 안 deep-merge 상세 (0.5.0+, untyped passthrough).
   *
   * dsmonitor default options 자체 위에 외부 사용자 옵션 자체 우선. 흔한 상세 활용:
   * - `skipAudits: ["uses-http2"]` (사내망 자체 등)
   * - `chromeFlags: ["--no-sandbox"]` (Docker / CI 자체)
   * - `throttlingMethod: "provided"` 자체 상세 측정 상세 정정
   * - `screenEmulation: { ... }` (mobile / 상세 viewport)
   * - `formFactor: "mobile"` (default desktop 자체 정정)
   *
   * 상세 안내: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
   *
   * 흔치 않은 활용 흐름 (assertions / upload 상세 등) = 상세 상세 release 진입 예정.
   */
  advanced?: Record<string, unknown>;
};

/**
 * Lighthouse 측정 대상 페이지 1개 상세 (0.5.0+).
 *
 * `path` = `baseUrl` 자체 기준 path 자체 (예: `/dashboard`). `name` = 리포트
 * 안 표시용 상세 (예: "Dashboard").
 */
export type LighthousePageRef = {
  path: string;
  name?: string;
};

/** Lighthouse 인증 방식 — 3종 discriminated union. */
export type LighthouseAuthConfig =
  | { type: "none" }
  | {
      type: "basic";
      /** 로그인 페이지 URL — baseUrl 기준 path 또는 절대 URL. */
      loginUrl: string;
      /** selector 명시 시 우선 적용. 미지정 항목 = 기본 추론 (`input[type="email"]` 등). */
      selectors?: {
        idInput?: string;
        pwInput?: string;
        submit?: string;
      };
    }
  | {
      type: "custom";
      /** 어댑터 파일 경로 — config 디렉토리 기준 상대경로 또는 절대경로. */
      adapter: string;
    };

/**
 * Lighthouse custom 인증 어댑터 인터페이스 (0.7.1+, E 항목).
 *
 * `dsmonitor.config.ts` 의 `lighthouse.auth = { type: "custom", adapter: "./path.js" }`
 * 가 가리키는 파일의 default export 가 본 인터페이스를 만족해야 합니다. LHCI 의
 * `puppeteerScript` 와 호환되는 함수 시그니처 + dsmonitor 의 metadata 확장으로
 * 구성됩니다.
 *
 * 동작:
 *   - LHCI 가 각 측정 URL 진입 전에 default export 함수를 호출합니다.
 *   - `browser` 인자는 Puppeteer Browser 인스턴스입니다. dsmonitor 는 puppeteer 를
 *     직접 의존하지 않으므로 type 인자 `TBrowser` 로 풀어 두었습니다. 어댑터를
 *     TypeScript 로 작성한다면 `import type { Browser } from "puppeteer"` 후
 *     `LighthouseAuthAdapter<Browser>` 로 명시하면 됩니다.
 *   - `context` 는 LHCI 가 전달하는 정보 묶음입니다. 흔히 측정 URL / Lighthouse
 *     결과 등이 들어가며, 어댑터가 사용하지 않으면 무시해도 됩니다.
 *   - `getMetadata()` 는 선택입니다. 어댑터가 export 하면 `dsmonitor/lighthouse/run.js`
 *     가 호출해 결과를 `summary.json` 에 metadata 로 누적합니다.
 *
 * 호환성:
 *   - 옛 0.4.x ~ 0.7.x 어댑터 (`module.exports = async (browser, context) => {}` 형식의
 *     CommonJS / JS) 그대로 작동합니다. 본 type 은 작성 시점 IDE 도움을 위한 opt-in
 *     이며 런타임 검증을 추가하지 않습니다.
 */
export interface LighthouseAuthAdapter<TBrowser = unknown> {
  /** LHCI 호환 진입점. 각 측정 URL 마다 호출됩니다. */
  (browser: TBrowser, context?: LighthouseAuthContext): Promise<void> | void;
  /** `summary.json` 에 누적될 메타데이터 (선택). */
  getMetadata?: () => Record<string, unknown>;
}

/**
 * 어댑터의 두 번째 인자 — LHCI 가 전달하는 컨텍스트 (0.7.1+).
 *
 * LHCI 버전에 따라 필드 구성이 달라질 수 있어 모두 선택입니다. 가장 흔한
 * 필드만 명시하고, 알려지지 않은 추가 필드는 그대로 들어 옵니다.
 */
export interface LighthouseAuthContext {
  /** 측정 대상 URL (LHCI 가 호출 시점에 채워 줍니다). */
  url?: string;
  /** 측정 결과 객체 (after-run 어댑터 케이스). */
  lhr?: unknown;
  /** Lighthouse 결과 HTML 경로. */
  lhrPath?: string;
  /** LHCI 옵션 묶음 (passthrough). */
  options?: Record<string, unknown>;
  /** 미지정 필드 — LHCI 가 추가하는 임의 키. */
  [key: string]: unknown;
}

/**
 * Figma 측정 설정 — `UIHealthConfig.figma`.
 */
export type FigmaConfig = {
  /**
   * "lite" — Phase 0.5 최소 버전 (카운트 + 출처 미상 Instance).
   * "full" — Phase B 에서 추가 (Style Entropy / Auto-layout 등).
   */
  validationLevel: "lite";
  designSystemFiles: FigmaDesignSystemFile[];
  domainFiles: FigmaDomainFile[];
  /** "출처 미상 Instance" 상위 N 과 unknown 허용 여부. */
  unknownInstances: {
    topN: number;
    /** true = 외주 옛 DS 등 미등록 출처도 결과에 포함 (planning.md §7 2026-04-23 합의). */
    allowUnknownSource: boolean;
  };
  /**
   * 코드 측 토큰 파서 설정 (단계 3, 2026-04-24 리팩토링).
   *
   * 배열의 각 엔트리는 `CodeTokenParserConfig` discriminated union — `type` 으로
   * 파서 선택. 현재 지원: "scss". 빈 배열이어도 에러는 아니며 `codeCount=0` 으로
   * tokenMatrix 가 정상 생성된다.
   *
   * 주의: 기존 `hardcodedValues.scssVariableDefFiles` 는 SCSS compliance 계산용
   * 으로 남겨두는 별개 설정. 중복으로 보이지만 용도가 다르다.
   */
  codeTokens: {
    parsers: CodeTokenParserConfig[];
  };
};

/**
 * DS 파일 1개의 측정 결과.
 *
 * `variables` 는 Phase 0.5 에선 **항상 null** (file_variables:read scope 미보유).
 * Phase B 에서 토큰 scope 확보 후 채움.
 */
export type FigmaDesignSystemCount = {
  label: string;
  /** Phase B 이월. 현재는 항상 null. */
  variables: number | null;
  /** `d.styles` dict 크기. styleType (TEXT/FILL/EFFECT/GRID) 별 분해값. */
  styles: number;
  stylesByType: Record<string, number>;
  /**
   * `d.components` dict 크기 (variant 포함한 Main Components 총 수).
   * Figma UI 의 "Main Components" 해석과 일치.
   */
  components: number;
  /** `d.componentSets` dict 크기 (variant 그룹 수). */
  variantGroups: number;
  /**
   * variantGroup 이름 리스트 (componentSet.name 알파벳순). 컴포넌트 매칭 분모.
   * (B 그룹 단계 3, 2026-04-29). 다른 프로젝트 호환을 위해 optional.
   */
  componentSetNames?: string[];
  /**
   * variantGroup 에 속하지 않는 단독 component 이름 리스트 (alphabetical, dedup).
   * variant component (componentSetId 보유) 는 분모 제외.
   * (B 그룹 단계 3, 2026-04-29). 다른 프로젝트 호환을 위해 optional.
   */
  standaloneComponentNames?: string[];
};

/**
 * "출처 미상 Instance" 분석 결과 (구 이름: Detach).
 *
 * 용어 변경 근거: REST API 만으로는 "원래 instance 였다가 detach 됐다" 는
 * 과거 상태를 확인할 수 없다. 실제 측정 가능한 건 "현재 INSTANCE 지만
 * componentId 가 등록된 DS 어디에도 매칭되지 않는 것" 뿐이다.
 * planning.md §7 2026-04-23 (사전 조사 결과) 블록 참조.
 *
 * 2026-04-24 (단계 5 세션) 필드명 변경: `unknownSource*` → `unmatched*`.
 * 이유: `FigmaInstanceSources` 의 동적 label 집계와 "unknown" 이라는 같은
 * 단어를 쓰던 기존 이름이 반복적으로 혼동을 일으켜 구분되는 이름으로 교체.
 * 의미는 동일 — "2-hop 매칭(componentId → stable key → DS label) 에 실패한
 * INSTANCE".
 */
export type FigmaInstanceAnalysis = {
  totalInstances: number;
  /** 2-hop 매칭 실패한 INSTANCE 수 (= 등록 DS 범위 밖, 마이그레이션 대상). */
  unmatchedInstances: number;
  /** unmatchedInstances / totalInstances. 0~1. */
  unmatchedRatio: number;
  /** 매칭 실패 instance 를 `name` 기준 그룹화 후 count 내림차순 상위 N. */
  topN: Array<{
    /** 요소 이름 (INSTANCE.name). */
    name: string;
    /** 같은 이름으로 등장한 횟수. */
    count: number;
    /**
     * 추정 출처. 외주 옛 DS 는 검토 대상 제외이므로 여기서는 항상 null.
     * 향후 외주 DS 출처 맵을 추가하면 "ds-legacy-external" 같은 값이 올 수 있음.
     */
    sourceLabel: string | null;
    /** 첫 발견 위치. 예: "domain-c / 대시보드 / 메인위젯". */
    samplePath?: string;
  }>;
};

/**
 * 정상 instance (componentId 매칭 성공) 의 출처 분포.
 *
 * 키는 `config.figma.designSystemFiles[].label` 원문을 그대로 사용 (카멜케이스
 * 변환 없음). config 에 등록된 DS 라벨만 키로 등장 — 등록 외 label 은
 * 애초에 componentMap 에 없으니 매칭 실패로 분류되어 여기 들어올 수 없다.
 *
 * 2026-04-24 (단계 5 세션) 동적 구조로 전환: 이전 고정 3키 (`dsNew`/`dsLegacy`/
 * `unknown`) 는 config 에 DS 3개 이상 등록 시 대응 불가 + `unknown` 은 구조적
 * 으로 항상 0 이라 노이즈였음. YAGNI 관점에서 제거.
 *
 * 합계 = totalInstances - unmatchedInstances.
 */
export type FigmaInstanceSources = {
  [dsLabel: string]: number;
};

/**
 * 도메인 단위 측정 결과 — config 의 `figmaDomainFiles` 트리 구조 그대로 (B-2 단계 2, 2026-04-28).
 *
 * 패턴 A (file URL — 비권장): `measurementUnit: "file"` + `pages` 없음.
 *   현재 scanDomain 이 패턴 A 를 warning 후 빈 측정값 반환 — 이 결과에 측정값 0 으로 출력.
 * 패턴 B (페이지 URL): `pages[i].url` 보유, `pages[i].measurementUnit` 출력.
 * 패턴 C (프레임 URL): `pages[i].frames[j]` 보유.
 *
 * 합산은 frame → page → domain 순서로 누적. 분석에서 한 번 계산 후 모든 깊이에 attach —
 * 시각화에서 drill-down 시 매번 re-aggregate 불필요.
 */
export interface FigmaDomainResult {
  label: string;
  /** 도메인 합산 (= pages 합산 = scanResult.totalInstances). */
  totalInstances: number;
  /** 도메인 합산. */
  unmatchedInstances: number;
  /** 도메인 합산. config.designSystemFiles 등록 label 별 카운트. */
  instanceSources: Record<string, number>;
  /** 패턴 A 일 때만. 패턴 B/C 면 undefined (pages 사용). */
  measurementUnit?: "file";
  /** 패턴 B/C 일 때만 (config 의 pages 그대로 매핑). */
  pages?: FigmaDomainPageResult[];
  /** scan 자체 실패 시 true (validation 실패 / API 에러 등). errors 배열에 상세 사유. */
  scanFailed?: boolean;
}

/**
 * 페이지 단위 측정 결과.
 *
 * 패턴 B: `url` + `measurementUnit` 보유, `frames` 없음. 측정값은 페이지 자체 subtree.
 * 패턴 C: `url` 없음, `frames` 보유. 측정값은 frames 합산.
 *
 * `comment` 는 config 원문 그대로 (가독성).
 */
export interface FigmaDomainPageResult {
  comment?: string;
  /** 패턴 B 일 때만. */
  url?: string;
  /** 패턴 B 일 때만 (CANVAS=page / 그 외=other). */
  measurementUnit?: "page" | "other";
  /** 페이지 합산 (패턴 B = 페이지 자체, 패턴 C = frames 합산). */
  totalInstances: number;
  unmatchedInstances: number;
  instanceSources: Record<string, number>;
  /** 패턴 C 일 때만. */
  frames?: FigmaDomainFrameResult[];
}

/**
 * 프레임 단위 측정 결과 (패턴 C 의 leaf).
 *
 * `measurementUnit` 자동 판정: FRAME=frame / 그 외=other (COMPONENT/GROUP 등).
 * 비컨테이너 (TEXT/VECTOR 등) 는 scanDomain 진입부에서 warning 후 빈 측정.
 */
export interface FigmaDomainFrameResult {
  url: string;
  comment?: string;
  measurementUnit: "frame" | "other";
  totalInstances: number;
  unmatchedInstances: number;
  instanceSources: Record<string, number>;
}

export type FigmaReport = {
  generatedAt: string;
  validationLevel: "lite";
  designSystemCounts: FigmaDesignSystemCount[];
  instanceAnalysis: FigmaInstanceAnalysis;
  instanceSources: FigmaInstanceSources;
  /**
   * 도메인 단위 raw 측정 결과 트리 (B-2 단계 2, 2026-04-28).
   * config 의 figmaDomainFiles 구조 그대로 + 각 노드에 측정값 attach.
   * 합산 데이터 (instanceSources / instanceAnalysis) 는 그대로 보존 — 이 필드는 raw 추가만.
   */
  domainResults: FigmaDomainResult[];
  /**
   * DS ↔ 코드 토큰 이름 매칭 결과 (단계 3, 2026-04-24).
   * 각 DS 와 코드 SCSS 변수 간 이름 완전 일치 기준의 교차표.
   */
  tokenMatrix: TokenMatrix;
  /**
   * Figma DS 컴포넌트 (variantGroup + standalone) ↔ 코드 className 매칭 결과
   * (B 그룹 단계 3, 2026-04-29).
   *
   * 사용자 옛 직관 — "Figma 의 btn 컴포넌트가 코드 className 으로 쓰이는가" — 의 측정.
   * 본 프로젝트는 Figma 이름 = CSS class 동기화 정책이라 같은 kebab-case 정확 일치.
   *
   * 측정 호출자가 코드 분석 결과 (globalClassNames + jsxUsedClassNames) 미제공 시
   * undefined 또는 비어있는 buckets 로 출력. 다른 프로젝트 호환을 위해 optional.
   */
  componentMatch?: FigmaComponentMatch;
  /** 비치명적 에러 (URL 파싱 실패 / 일부 파일 접근 실패 등). 전체 중단은 아님. */
  errors: string[];
  /**
   * 비치명적 경고 — DS 2-pass 중 개별 페이지 스캔 실패, Variables API 403 등.
   * 다른 페이지는 성공했으므로 파일 단위 count 는 나옴 (일부 누락 가능성 있음).
   * errors 와 대칭되는 string 배열로 설계.
   *
   * (도메인 scanDomain 의 warnings 는 기존대로 errors 에 병합되어 여기에 안 들어감 —
   *  의도된 비대칭. 구조 통일은 별도 작업으로.)
   */
  warnings: string[];
};

// ═══════════════════════════════════════════════════════════════════
// Figma instance level raw (Phase 0.7, 2026-04-29)
// ═══════════════════════════════════════════════════════════════════

/**
 * 도메인 파일 안 INSTANCE 노드 1개의 raw 정보.
 *
 * 핵심: 마이그레이션 작업 진입 정보 (CSV export). frame 안 ds-legacy instance 의
 * 정확한 위치 (nodeId + Figma URL) + 컴포넌트 정보 (componentName master) 보존.
 *
 * baseline JSON 회귀 회피 위해 별도 파일 (`dsmonitor/reports/figma-instances-{date}.json`)
 * 로 출력 — domainScan walk 안 raw 정보 수집 → figma.ts 가 별도 파일 출력.
 */
export interface FigmaInstanceEntry {
  /** Figma node-id (콜론 표기, 예: "5569:62500"). */
  nodeId: string;
  /** Figma instance node 의 name (예: "btn-default"). */
  name: string;
  /**
   * 매칭된 Figma component entry 의 name 필드 (Figma API
   * `/v1/files/:key/nodes` 응답의 `components` dict entry 의 name).
   * - variant component (componentSet 안): variant name (예: "Property 1=default")
   * - 단독 component (componentSet 외): component 자체 이름 (예: "icon-guide")
   * 매칭 실패 (unmatched / componentId 부재) 시 null.
   */
  componentName: string | null;
  /**
   * 매칭된 컴포넌트의 master name (componentSet.name).
   * - variant component (componentSet 안): componentSet 의 name (예: "btn")
   * - 단독 component (componentSet 외): null (CSV reporter 안에서 componentName 강제 주입)
   * 매칭 실패 (unmatched) 시 null.
   * (Phase 0.7 후속, 2026-04-30)
   */
  masterName: string | null;
  /**
   * 매칭 라벨 — config.designSystemFiles[].label ("ds-new" / "ds-legacy" 등) 또는 "unmatched".
   * componentMap 매칭 성공 시 라이브러리 label, 실패 시 "unmatched".
   */
  dsLabel: string;
  /** walk 안 path (예: "Machine Learning / Test / Test-Perform / ContentBox / btn-..."). */
  contextPath: string;
}

/**
 * Phase 0.7 별도 파일 (`dsmonitor/reports/figma-instances-{date}.json`) schema.
 *
 * domainResults 트리 보존 + frame 별 instances[] 추가. 사용자 인지 부분 (도메인/페이지/
 * 프레임) 일관 + CSV reporter 가 frame 필터링 자연.
 */
export interface FigmaInstancesFile {
  generatedAt: string;
  domains: FigmaInstancesDomain[];
}

export interface FigmaInstancesDomain {
  label: string;
  fileKey: string;
  /** Figma URL 안 fileName (예: "Machine-Learning"). figmaUrl 조립 시 가독성. */
  fileName: string;
  pages: FigmaInstancesPage[];
}

export interface FigmaInstancesPage {
  comment?: string;
  /** 패턴 B 일 때만 (페이지 자체 url 부분). */
  url?: string;
  nodeId?: string;
  frames?: FigmaInstancesFrame[];
  /** 패턴 B 면 페이지 자체 instances 부분 (frames 없음). */
  instances?: FigmaInstanceEntry[];
}

export interface FigmaInstancesFrame {
  comment?: string;
  url: string;
  nodeId: string;
  instances: FigmaInstanceEntry[];
}

// ═══════════════════════════════════════════════════════════════════
// 토큰 매칭 (단계 3, 2026-04-24)
// ═══════════════════════════════════════════════════════════════════

/**
 * 코드 측 토큰 (플러그인 파서 공통 출력).
 *
 * 2026-04-24 리팩토링: `ScssTokenEntry` 에서 리네임. SCSS 외 CSS / Tailwind /
 * styled-components 등 여러 스타일링 환경의 파서가 같은 shape 로 토큰을 내보낸다.
 * 소스는 `name` 이름 그대로 사용 — 환경별 prefix 통일 / 정규화는 하지 않는다.
 */
export type CodeTokenEntry = {
  /** 예: "--point-color-0", "colors.primary" 등 (파서가 내놓는 원 이름). */
  name: string;
  /** 파서가 해석한 값. 변수 참조 원문 ("var(--color-white)") 또는 리터럴 ("#6c91f5"). */
  value: string;
  /** projectRoot 기준 상대 경로. */
  file: string;
  /** 1-based. */
  line: number;
};

// ═══════════════════════════════════════════════════════════════════
// 코드 토큰 파서 플러그인 인터페이스 (2026-04-24)
// ═══════════════════════════════════════════════════════════════════

/**
 * SCSS 파서 설정. `type: "scss"` 로 식별.
 *
 * files: projectRoot 기준 상대 경로 배열. 각 파일은 `:root {...}`, SCSS map,
 * `@each ... in $map` 동적 변수 emit 을 대상으로 파싱.
 *
 * 비대상: SCSS `$variable: value` 자체, Bootstrap / 외부 라이브러리 변수 정의.
 */
export type ScssParserConfig = {
  type: "scss";
  files: string[];
};

/**
 * CSS variables 파서 설정 (0.6.0+). `type: "cssVariables"` 로 식별.
 *
 * files: projectRoot 기준 상대 경로 배열. 각 파일에서 `--name: value;` 형식의
 * CSS custom property 정의를 추출합니다. selector (`:root`, `.dark`,
 * `[data-theme=*]` 등) 안에 있든 밖에 있든 동일하게 잡습니다.
 *
 * Tailwind v4 의 `@theme { --color-primary-500: ...; }` 도 본 파서로 커버됩니다.
 * 동일한 이름이 여러 selector 에서 정의된 경우 처음 등장만 등록합니다 (예:
 * light / dark 테마가 같은 `--point-color-*` 을 emit).
 */
export type CssVariablesParserConfig = {
  type: "cssVariables";
  files: string[];
};

/**
 * Tailwind 파서 설정 (0.6.0+). `type: "tailwind"` 로 식별.
 *
 * config: `tailwind.config.{js,cjs,mjs,ts}` 파일의 projectRoot 기준 상대 경로.
 * 동적 import 로 읽어 `theme` 과 `theme.extend` 의 nested object 를 dot-path 로
 * flatten 합니다 (예: `colors.primary.500`, `spacing.4`, `fontSize.lg`).
 *
 * categories: flatten 대상 카테고리 (기본 `["colors", "spacing", "fontSize",
 * "borderRadius"]`). 빈 배열이면 `theme` 전체를 시도합니다.
 *
 * Tailwind v4 의 CSS-only `@theme {...}` 정의는 `cssVariables` 파서로 처리합니다.
 */
export type TailwindParserConfig = {
  type: "tailwind";
  config: string;
  categories?: string[];
};

/**
 * 파서별 설정의 discriminated union. 새 파서(styled-components 등) 가 추가되면
 * 여기에 `| XxxParserConfig` 로 확장합니다.
 *
 * 지원 파서 (0.6.0):
 *   - scss          — SCSS / CSS 변수 + SCSS map + `@each` 동적 emit
 *   - cssVariables  — 순수 CSS 의 `--*` 정의 (Tailwind v4 `@theme` 포함)
 *   - tailwind      — Tailwind v3 의 `tailwind.config.{js,ts}` theme 토큰
 */
export type CodeTokenParserConfig =
  | ScssParserConfig
  | CssVariablesParserConfig
  | TailwindParserConfig;

/**
 * 코드 토큰 파서 인터페이스. 레지스트리에 `type` 키로 등록 후
 * `loadCodeTokens` 가 config.type 매칭으로 호출.
 *
 * 구현체는 `config.type` 으로 자신의 설정 shape 인지 확인 후 narrow 해야 함.
 * 잘못된 config 면 throw 권장 (레지스트리 키와 config.type 불일치는 로더 단계에서
 * 이미 걸러지지만, 방어 차원).
 *
 * 0.7.0 부터 path 부재 등 진단 가능한 결함을 발견하면 4번째 인자 `warnings`
 * 배열에 entry 를 push 합니다. parse() 자체는 그대로 빈 배열을 반환하는 것이
 * 자연스럽고, warning 은 dashboard / baseline JSON 으로 bubble up 됩니다.
 */
export interface CodeTokenParser {
  /** 식별자 (config.type 과 매칭). 예: "scss", "css", "tailwind". */
  readonly type: string;
  /**
   * @param config 해당 파서 설정 (`config.type === this.type`).
   * @param absRoot projectRoot 절대 경로 (파일 경로 해석용).
   * @param warnings (0.7.0+) 비치명적 진단을 push 할 배열. 옛 파서는 무시해도 됩니다.
   */
  parse(
    config: CodeTokenParserConfig,
    absRoot: string,
    warnings?: CodeTokenParserWarning[]
  ): CodeTokenEntry[] | Promise<CodeTokenEntry[]>;
}

/**
 * 코드 토큰 파서가 path 부재 / 로드 실패 등을 보고하는 구조화 경고 (0.7.0+).
 *
 * 표시 위치:
 *   - audit 실행 시 stderr 에 "⚠" 한 줄로 emit.
 *   - baseline JSON 안 `figma.tokenMatrix.warnings` 배열에 누적.
 *   - dashboard 의 Figma 탭 토큰 매트릭스 sub-section 헤더에 badge 로 노출.
 */
export interface CodeTokenParserWarning {
  /** 파서 type — "scss" / "cssVariables" / "tailwind" 등. */
  parser: string;
  /** 해당 파서 설정 안 path (단일 파일 또는 single config path). 진단 메시지에 그대로 표시. */
  path: string;
  /**
   * 결함 종류:
   *   - "file_not_found"  — 지정된 path 가 파일시스템에 없음.
   *   - "load_error"      — 파일은 있지만 동적 import / 파싱 실패.
   *   - "empty_result"    — 파서가 정상 실행됐지만 추출된 토큰 0건 (옵션).
   */
  issue: "file_not_found" | "load_error" | "empty_result";
  /** 추가 안내 (선택). 예: 에러 메시지 / 정정 힌트. */
  message?: string;
}

/**
 * Figma Variables API 응답 normalize 결과. Styles 와 동일 shape 맞춤.
 * Phase 0.5 에서는 Enterprise plan 미보유라 403 예상 — 0 건이 정상.
 */
export type FigmaVariableEntry = {
  /** Figma variable id. */
  id: string;
  /** 예: "color/primary/500" (Figma variable name 그대로). */
  name: string;
  /** "COLOR" | "FLOAT" | "STRING" | "BOOLEAN" */
  resolvedType: string;
};

/** 토큰 매트릭스 각 셀 (한 토큰 이름이 특정 쪽에 몇 개 있는지). */
export type TokenMatrixCell = {
  exists: boolean;
  /** 동명 중복 개수. 코드는 항상 0 또는 1, Figma DS 는 0 이상. */
  count: number;
};

/** 토큰 매트릭스 한 행 — 한 개의 토큰 이름에 대한 DS/코드 교차 결과. */
export type TokenMatrixRow = {
  name: string;
  inCode: TokenMatrixCell;
  /** key = DS label. config 의 designSystemFiles 순서와 동일. */
  inDs: Record<string, TokenMatrixCell>;
};

/** DS 내 동명 중복 기록. count ≥ 2. */
export type TokenMatrixDuplicate = {
  name: string;
  designSystem: string;
  count: number;
};

/** DS 별 요약 통계. */
export type TokenMatrixDsStats = {
  /** 고유 토큰 이름 개수 (중복 제외). */
  total: number;
  /** 코드에 같은 이름의 SCSS 변수가 있는 토큰 개수. */
  matchedWithCode: number;
  /** 동명 중복이 있는 토큰 개수 (duplicates 중 해당 DS 에 속한 것 수). */
  duplicateCount: number;
};

// ═══════════════════════════════════════════════════════════════════
// 컴포넌트 매칭 (B 그룹 단계 3, 2026-04-29)
// ═══════════════════════════════════════════════════════════════════

/**
 * 어디에서 매칭됐는지 — 단순 union.
 *   "globalCss" — globalStyleSources 인덱스에 같은 이름 className 존재
 *   "jsx"       — jsx/tsx 의 className= 속성에서 토큰으로 사용됨
 */
export type FigmaComponentMatchSource = "globalCss" | "jsx";

/** Figma DS 컴포넌트 1개에 대한 매칭 결과 항목. */
export interface FigmaComponentMatchEntry {
  /** Figma 컴포넌트 이름 (kebab-case 가정 — 본 프로젝트 정책). */
  name: string;
  /** Figma 어떤 DS 출처인지 (config 의 designSystemFiles[].label). */
  figmaSource: string;
  /**
   * 컴포넌트 종류:
   *   "componentSet" — variantGroup (variant 묶음, name=componentSet.name)
   *   "standalone"   — variantGroup 외 단독 component (variant 분리 안 된 케이스)
   */
  kind: "componentSet" | "standalone";
  /** 어디에서 매칭됐는지 — 둘 다 매칭 가능. 빈 배열이면 figmaOnly. */
  matchedIn: FigmaComponentMatchSource[];
}

/**
 * 코드에만 있는 className (Figma DS 정의 없음) — 단순 항목.
 *
 * γ (B 그룹 단계 3 보정 3, 2026-04-29): globalCss 정의 + JSX/TSX 사용 둘 다 만족하는
 * "DS 외부 정상 사용" className 만. appearsIn 필드 제거 (모두 동일 값이라 자명).
 * dead 가능성 (globalCss 만 정의되고 JSX/TSX 미사용) 부분은 별도 트랙 검토 (v0.12 이후).
 */
export interface FigmaComponentCodeOnlyEntry {
  /** 코드 className 이름. */
  name: string;
}

/** DS 별 요약. */
export interface FigmaComponentMatchSummary {
  /** Figma DS 분모 — componentSet + standaloneComponent 합 (본 프로젝트 ds-new=46). */
  figmaTotal: number;
  /** 분자 — matchedIn.length > 0 인 항목 수. */
  matched: number;
  /** matchedIn 가 비어있는 (코드 어디에도 없는) 항목 수. */
  figmaOnly: number;
  /** matched / figmaTotal. 0~1. */
  matchRatio: number;
  /** 분류별 매칭 분포. */
  matchedBreakdown: {
    /** matchedIn 에 globalCss + jsx 둘 다 포함. */
    both: number;
    /** matchedIn 에 jsx 만. */
    jsxOnly: number;
    /** matchedIn 에 globalCss 만 (코드 JSX/TSX 사용 없음 — dead style 가능성). */
    globalCssOnly: number;
  };
}

/**
 * Figma DS 컴포넌트 ↔ 코드 className 매칭 분석 결과.
 *
 * 측정 핵심: 본 프로젝트는 Figma 이름 = CSS class 동기화 정책이라 같은 kebab-case
 * 직접 비교 가능 — case sensitive 정확 일치 (B1 알고리즘).
 *
 * 분모 (Figma DS 컴포넌트):
 *   - variantGroup 이름 (componentSet.name) — 본 프로젝트 ds-new 46 / ds-legacy 42
 *   - variantGroup 에 속하지 않는 standalone component 이름
 *   - variant 단위 (componentSetId 보유 component) 는 분모 제외 — 같은 그룹 분배
 *
 * 분자 (코드 className):
 *   - globalCss: globalStyleSources 정의된 className 인덱스
 *   - jsx: jsx/tsx 의 className= 속성에서 토큰 단위로 추출
 *
 * 시계열 — Phase 0.6 호환성 검증 시 다른 프로젝트가 className 정책 다르면 별도 mode 필요.
 */
export interface FigmaComponentMatch {
  /** DS label 별 요약 (config.designSystemFiles 순서). */
  summary: Record<string, FigmaComponentMatchSummary>;
  /** matched 컴포넌트 (matchedIn.length > 0). figmaSource → kind → name 정렬. */
  matched: FigmaComponentMatchEntry[];
  /** Figma 만 있고 코드 어디에도 없는 컴포넌트 (작업 우선순위). */
  figmaOnly: FigmaComponentMatchEntry[];
  /**
   * 코드에만 있는 className — Figma DS 정의 없음 (DS 외부 정상 사용).
   *
   * γ (B 그룹 단계 3 보정 3, 2026-04-29): globalCss 정의 + JSX/TSX 사용 둘 다 만족 +
   * Figma 미매칭. 옛 β 의 "globalCss 만 정의 + JSX/TSX 미사용" (dead 가능성) 부분은
   * 별도 트랙 검토 — codeOnly 의미 명확화 ("DS 외부 부분").
   */
  codeOnly: FigmaComponentCodeOnlyEntry[];
  /** 합계 카운트 (대시보드 카드 메인용). */
  totals: {
    figmaTotal: number;
    matched: number;
    figmaOnly: number;
    codeOnly: number;
    /** matched / figmaTotal — DS 합산 비율. */
    matchRatio: number;
  };
}

/**
 * DS ↔ 코드 토큰 매칭 결과.
 *
 * 매칭 규칙 (Phase 0.5, 2026-04-24 결정):
 *   - 이름 완전 일치만 (정규화 / 값 기반 / 수동 매핑 없음)
 *   - 중복은 매트릭스 셀 count 에 기록, 매칭은 "이름이 존재하는가" 로 수행
 *   - 정렬: name 알파벳순
 */
export type TokenMatrix = {
  /** config 순서대로 DS label 배열. */
  designSystems: string[];
  /** name 알파벳순 정렬된 매트릭스 행. */
  rows: TokenMatrixRow[];
  /** DS 별 동명 중복 목록. UI 에서 "중복 토큰 정리" 대상으로 활용. */
  duplicates: TokenMatrixDuplicate[];
  summary: {
    /** 코드 + 모든 DS 의 이름 union 개수. */
    totalUniqueTokens: number;
    /** 코드 측 고유 토큰 수 (CodeTokenEntry.length; 로더가 name dedup). */
    codeCount: number;
    /** key = DS label. */
    dsStats: Record<string, TokenMatrixDsStats>;
  };
  /**
   * 0.7.0 (Z): 코드 토큰 파서가 보고한 진단. path 부재 / 로드 실패 등.
   *
   * dashboard 의 토큰 매트릭스 sub-section 헤더에 "⚠ N warning" badge 로 노출되고,
   * audit 실행 시점에는 stderr 에 한 줄씩 출력됩니다. 옛 baseline JSON 호환을 위해
   * optional 로 두며, 미존재 / 빈 배열이면 옛 흐름과 동일합니다.
   */
  warnings?: CodeTokenParserWarning[];
};
