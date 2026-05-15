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

function collectStringLiterals(node: any, out: string[]): void {
  if (!node || typeof node !== "object") return;
  if (node.type === "Literal" && typeof node.value === "string") {
    out.push(node.value);
    return;
  }
  if (node.type === "TemplateLiteral") {
    for (const q of node.quasis || []) {
      if (q?.value?.cooked) out.push(q.value.cooked);
    }
    for (const e of node.expressions || []) collectStringLiterals(e, out);
    return;
  }
  walk(node, (n) => {
    if (n.type === "Literal" && typeof n.value === "string") out.push(n.value);
  });
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
      hasInlineStyle: false,
      classNames: [],
    };
    if (!parsed.ast) return signals;
    walk(parsed.ast, (node: any) => {
      if (node.type === "ImportDeclaration" && node.source?.type === "Literal") {
        signals.imports.push(String(node.source.value));
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
