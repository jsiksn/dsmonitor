import { parse } from "@typescript-eslint/parser";
import type {
  FrameworkAdapter,
  FileSignals,
  NativeElementHit,
  ParsedCode,
} from "./types";

function walk(node: any, visitor: (n: any, parent: any) => void, parent: any = null): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, visitor, parent);
    return;
  }
  if (typeof node.type === "string") visitor(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (child && typeof child === "object") walk(child, visitor, node);
  }
}

/**
 * className 표현식에서 클래스 문자열로 볼 수 있는 리터럴만 수집 (0.9.0 정밀화).
 *
 * 옛 흐름 (~0.8.x): 표현식 안 **모든** 문자열 리터럴을 무차별 수집 —
 * `t("common.title")` 같은 i18n 키, `s === "active"` 비교 문자열까지 클래스
 * 토큰으로 오집계되어 고아 클래스 / 금지 카운트를 부풀렸음.
 *
 * 0.9.0 규칙 (노드 타입별 명시 처리, 그 외 기본 skip):
 *   - Literal(string) / TemplateLiteral 고정 부분 → 수집
 *   - 클래스 유틸 호출 (CLASS_UTILITY_CALLEES) 의 인자만 재귀 — 그 외 호출 skip
 *   - 삼항 (?:) → 결과 두 가지만 재귀 (비교 test 는 skip)
 *   - 논리 (&& / || / ??) → 양쪽 재귀
 *   - 이항 → `+` (연결) 만 양쪽 재귀, 비교 연산 skip
 *   - 객체 리터럴 → 문자열 key 만 수집 (clsx 조건 객체 — 값은 조건이라 skip)
 *   - 배열 → 요소 재귀
 *   - computed member (`styles["card"]`) → 문자열 property 수집 (CSS modules 키)
 */
const CLASS_UTILITY_CALLEES = new Set([
  "clsx",
  "classnames",
  "classNames",
  "cn",
  "cx",
  "twMerge",
  "twJoin",
  "cva",
]);

function collectStringLiterals(node: any, out: string[]): void {
  if (!node || typeof node !== "object") return;
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") out.push(node.value);
      return;
    case "TemplateLiteral":
      for (const q of node.quasis || []) {
        if (q?.value?.cooked) out.push(q.value.cooked);
      }
      for (const e of node.expressions || []) collectStringLiterals(e, out);
      return;
    case "CallExpression": {
      const callee = node.callee;
      const name =
        callee?.type === "Identifier"
          ? callee.name
          : callee?.type === "MemberExpression" &&
              callee.property?.type === "Identifier"
            ? callee.property.name
            : null;
      if (name && CLASS_UTILITY_CALLEES.has(name)) {
        for (const arg of node.arguments || []) collectStringLiterals(arg, out);
      }
      return;
    }
    case "ConditionalExpression":
      collectStringLiterals(node.consequent, out);
      collectStringLiterals(node.alternate, out);
      return;
    case "LogicalExpression":
      collectStringLiterals(node.left, out);
      collectStringLiterals(node.right, out);
      return;
    case "BinaryExpression":
      if (node.operator === "+") {
        collectStringLiterals(node.left, out);
        collectStringLiterals(node.right, out);
      }
      return;
    case "ObjectExpression":
      for (const p of node.properties || []) {
        if (
          p?.type === "Property" &&
          p.key?.type === "Literal" &&
          typeof p.key.value === "string"
        ) {
          out.push(p.key.value);
        }
      }
      return;
    case "ArrayExpression":
      for (const el of node.elements || []) collectStringLiterals(el, out);
      return;
    case "MemberExpression":
      if (
        node.computed &&
        node.property?.type === "Literal" &&
        typeof node.property.value === "string"
      ) {
        out.push(node.property.value);
      }
      return;
    case "TSAsExpression":
    case "TSNonNullExpression":
    case "ParenthesizedExpression":
      collectStringLiterals(node.expression, out);
      return;
    default:
      // 명시 처리 외 노드는 skip — 무차별 walk 로 인한 오집계 방지.
      return;
  }
}

function extractClassString(attr: any): string {
  if (!attr) return "";
  const v = attr.value;
  if (!v) return "";
  if (v.type === "Literal" && typeof v.value === "string") return v.value;
  if (v.type === "JSXExpressionContainer") {
    const out: string[] = [];
    collectStringLiterals(v.expression, out);
    return out.join(" ");
  }
  return "";
}

export const reactAdapter: FrameworkAdapter = {
  id: "react",
  supportedCodeExts: [".ts", ".tsx", ".js", ".jsx"],
  defaultComponentExts: [".tsx", ".jsx"],

  parse(content: string, filePath: string): ParsedCode {
    try {
      const ast = parse(content, {
        jsx: true,
        loc: true,
        range: true,
        tokens: true,
        comment: false,
        errorOnUnknownASTType: false,
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
        filePath,
      });
      return { ast };
    } catch (e: any) {
      return { ast: null, error: e };
    }
  },

  extractSignals(parsed: ParsedCode): FileSignals {
    const signals: FileSignals = {
      imports: [],
      importEntries: [],
      hasInlineStyle: false,
      classNames: [],
    };
    if (!parsed.ast) return signals;
    walk(parsed.ast, (node: any) => {
      if (node.type === "ImportDeclaration" && node.source?.type === "Literal") {
        const source = String(node.source.value);
        signals.imports.push(source);
        // 0.6.1 (X): named / default / namespace specifier 분리해 구조화 저장.
        // ImportSpecifier             — { Foo, Bar as Baz } 의 각 항목. imported.name 이 원본 명.
        // ImportDefaultSpecifier      — default 의 local 명.
        // ImportNamespaceSpecifier    — * as X 의 local 명.
        const entry = {
          source,
          named: [] as string[],
          hasDefault: false,
          hasNamespace: false,
        };
        for (const spec of (node.specifiers as any[]) || []) {
          if (spec?.type === "ImportSpecifier") {
            const imported = spec.imported;
            // imported 는 Identifier 또는 (TS) Literal 가능. 원본 명만 수집.
            if (imported?.type === "Identifier" && typeof imported.name === "string") {
              entry.named.push(imported.name);
            } else if (
              imported?.type === "Literal" &&
              typeof imported.value === "string"
            ) {
              entry.named.push(imported.value);
            }
          } else if (spec?.type === "ImportDefaultSpecifier") {
            entry.hasDefault = true;
          } else if (spec?.type === "ImportNamespaceSpecifier") {
            entry.hasNamespace = true;
          }
        }
        (signals.importEntries ??= []).push(entry);
      }
      if (node.type === "JSXAttribute" && node.name?.type === "JSXIdentifier") {
        const attr = node.name.name;
        if (attr === "style" && node.value?.type === "JSXExpressionContainer") {
          signals.hasInlineStyle = true;
        }
        if (attr === "className" || attr === "class") {
          const v = node.value;
          if (v?.type === "Literal" && typeof v.value === "string") {
            signals.classNames.push(v.value);
          } else if (v?.type === "JSXExpressionContainer") {
            collectStringLiterals(v.expression, signals.classNames);
          }
        }
      }
    });
    return signals;
  },

  findNativeElementsWithClass(
    parsed: ParsedCode,
    tagNames: string[]
  ): NativeElementHit[] {
    if (!parsed.ast || tagNames.length === 0) return [];
    const tagSet = new Set(tagNames);
    const hits: NativeElementHit[] = [];
    walk(parsed.ast, (n: any) => {
      if (n.type !== "JSXOpeningElement") return;
      if (n.name?.type !== "JSXIdentifier") return;
      const tag = n.name.name;
      if (!tag || tag[0] !== tag[0].toLowerCase()) return;
      if (!tagSet.has(tag)) return;
      const classAttr = (n.attributes || []).find(
        (a: any) =>
          a.type === "JSXAttribute" &&
          a.name?.type === "JSXIdentifier" &&
          (a.name.name === "className" || a.name.name === "class")
      );
      const classString = extractClassString(classAttr);
      if (!classString) return;
      // 0.6.0: type attribute 정적 추출 (Checkbox / Radio / Switch 분류용).
      // Literal string 만. expression / 변수 / 미지정은 undefined 로 둡니다.
      let typeAttrValue: string | undefined;
      for (const a of n.attributes || []) {
        if (
          a.type === "JSXAttribute" &&
          a.name?.type === "JSXIdentifier" &&
          a.name.name === "type"
        ) {
          const v = a.value;
          if (v?.type === "Literal" && typeof v.value === "string") {
            typeAttrValue = v.value;
          } else if (
            v?.type === "JSXExpressionContainer" &&
            v.expression?.type === "Literal" &&
            typeof v.expression.value === "string"
          ) {
            typeAttrValue = v.expression.value;
          }
          break;
        }
      }
      hits.push({
        tag,
        classString,
        line: n.loc?.start?.line ?? 0,
        type: typeAttrValue,
      });
    });
    return hits;
  },
};
