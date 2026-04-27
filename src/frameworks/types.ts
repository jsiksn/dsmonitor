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
  /** inline 스타일 사용 여부 (React: style={{}}, Vue: :style="..."). */
  hasInlineStyle: boolean;
  /** className/class attribute의 문자열 토큰 수집본. 여러 attribute가 있으면 모두 포함. */
  classNames: string[];
}

export interface NativeElementHit {
  /** native 태그 이름 (예: "button", "input"). */
  tag: string;
  /** 이 element의 className attribute에서 추출한 문자열. */
  classString: string;
  /** 소스 라인 번호 (1-based). */
  line: number;
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
