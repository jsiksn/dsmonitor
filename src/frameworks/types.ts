/**
 * 프레임워크 어댑터 인터페이스.
 *
 * analyzer는 이 인터페이스만 알면 된다. 프레임워크별 AST/파서 차이는
 * 어댑터 내부에 캡슐화되어야 한다.
 *
 * 현재 구현: react (@typescript-eslint/parser). 이후 vue/svelte 어댑터는
 * 동일 인터페이스를 구현하고 registry에 등록하면 된다.
 */

export interface ParsedCode {
  /** 파서 고유 AST. 어댑터 내부에서만 사용. */
  ast: unknown;
  /** 파싱 실패 시 에러. */
  error?: Error;
}

export interface FileSignals {
  /** 모든 import source 문자열 (예: "@atoms/Button", "./foo.scss"). */
  imports: string[];
  /**
   * 파일의 import 문을 구조화한 목록 (0.6.1+, X 항목).
   *
   * `imports` 가 source 문자열만 가지고 있는 반면, 이쪽은 named / default /
   * namespace specifier 를 구분해서 컴포넌트 단위 매칭에 활용할 수 있게 합니다.
   * 옛 흐름과의 호환을 위해 `imports` 도 그대로 유지합니다.
   *
   * 어댑터는 가능한 한 본 필드를 채워주는 것이 권장됩니다. 미채움 / 미지원 어댑터인
   * 경우 매칭 로직이 옛 alias-only 흐름으로 폴백합니다.
   */
  importEntries?: ImportEntry[];
  /** inline 스타일 사용 여부 (React: style={{}}, Vue: :style="..."). */
  hasInlineStyle: boolean;
  /** className/class attribute의 문자열 토큰 수집본. 여러 attribute가 있으면 모두 포함. */
  classNames: string[];
}

/**
 * import 문 1개의 구조화된 표현 (0.6.1+).
 *
 * `source` 는 import 가 가리키는 모듈 경로 (예: `"@/laon-web-ui"`).
 *
 * `named` 는 named import 의 **원본 명** 목록입니다. aliased import
 * (`import { Button as MyButton } ...`) 의 경우 원본 명인 `"Button"` 이 들어갑니다.
 * 사용 위치 추적은 별개로 처리하지만, 매칭 키는 원본 명을 기준으로 합니다.
 *
 * `hasDefault` / `hasNamespace` 는 정확한 컴포넌트 분류가 불가능한 케이스이므로,
 * 매칭 로직이 보수적으로 옛 동작 (alias 매칭만으로 후보 제외) 을 유지하기 위해 둡니다.
 */
export interface ImportEntry {
  source: string;
  named: string[];
  hasDefault: boolean;
  hasNamespace: boolean;
}

export interface NativeElementHit {
  /** native 태그 이름 (예: "button", "input"). */
  tag: string;
  /** 이 element의 className attribute에서 추출한 문자열. */
  classString: string;
  /** 소스 라인 번호 (1-based). */
  line: number;
  /**
   * 0.6.0+: element 의 type attribute 값. 현재는 `<input type="checkbox">` 처럼
   * type attribute 로 의미가 갈라지는 element 의 분류용. 정적 string literal 만
   * 추출하며, expression / 변수 / undefined 인 경우 본 필드도 undefined.
   */
  type?: string;
}

export interface FrameworkAdapter {
  /** 프레임워크 식별자. config.framework.id와 매칭. */
  readonly id: string;

  /** 이 어댑터가 분석 가능한 확장자. config.scan.codeExts의 기본값으로도 쓰임. */
  readonly supportedCodeExts: string[];

  /** 컴포넌트 파일로 간주할 확장자. config.designSystem.componentExts의 기본값. */
  readonly defaultComponentExts: string[];

  /** 파일 내용을 AST로 파싱. */
  parse(content: string, filePath: string): ParsedCode;

  /** AST에서 분석에 필요한 기본 시그널을 뽑음. */
  extractSignals(parsed: ParsedCode): FileSignals;

  /**
   * 파일 내에서 특정 native 태그를 className과 함께 사용한 모든 element를 찾음.
   * @param tagNames 대상 native 태그 이름 (소문자). 빈 배열이면 빈 결과.
   */
  findNativeElementsWithClass(
    parsed: ParsedCode,
    tagNames: string[]
  ): NativeElementHit[];
}
