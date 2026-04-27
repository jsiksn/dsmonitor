"use strict";

/**
 * Policy-driven rule: forbid className tokens that match any of `forbidden[*].classPatterns`.
 *
 * Option shape (serialized form — passed from .eslintrc.js via fromPolicy):
 *   {
 *     forbidden: [
 *       {
 *         id: 'bootstrap-utilities',
 *         label: 'Bootstrap utility classes',
 *         classPatterns: [{ source: '^d-flex$', flags: '' }, ...],
 *         importModules: ['reactstrap'] // optional
 *       }
 *     ]
 *   }
 *
 * RegExp objects are also accepted (for programmatic .eslintrc.js usage).
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow className tokens matching any forbidden classPatterns from stylingPolicy",
    },
    schema: [
      {
        type: "object",
        properties: {
          forbidden: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                severity: { type: "string" },
                classPatterns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      source: { type: "string" },
                      flags: { type: "string" },
                    },
                    required: ["source"],
                    additionalProperties: true,
                  },
                },
                importModules: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["id", "classPatterns"],
              additionalProperties: true,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      forbiddenClass: "'{{name}}' is forbidden ({{label}}).",
      forbiddenImport: "Import of '{{name}}' is forbidden ({{label}}).",
    },
  },
  create(context) {
    const opts = context.options[0] || { forbidden: [] };
    const forbidden = (opts.forbidden || []).map((f) => ({
      id: f.id,
      label: f.label || f.id,
      patterns: (f.classPatterns || []).map(toRegExp),
      importModules: f.importModules || [],
    }));

    function toRegExp(r) {
      if (r instanceof RegExp) return r;
      return new RegExp(r.source, (r.flags || "").replace("g", ""));
    }

    function checkToken(token, node) {
      for (const f of forbidden) {
        for (const p of f.patterns) {
          if (p.test(token)) {
            context.report({
              node,
              messageId: "forbiddenClass",
              data: { name: token, label: f.label },
            });
            return;
          }
        }
      }
    }

    function checkString(str, node) {
      if (!str) return;
      for (const token of str.split(/\s+/)) {
        if (token) checkToken(token, node);
      }
    }

    function visitExpr(expr, originNode) {
      if (!expr || typeof expr !== "object") return;
      switch (expr.type) {
        case "Literal":
          if (typeof expr.value === "string") checkString(expr.value, originNode);
          return;
        case "TemplateLiteral":
          for (const q of expr.quasis) {
            if (q && q.value && q.value.cooked) checkString(q.value.cooked, originNode);
          }
          for (const e of expr.expressions) visitExpr(e, originNode);
          return;
        case "CallExpression":
          for (const arg of expr.arguments) visitExpr(arg, originNode);
          return;
        case "ArrayExpression":
          for (const el of expr.elements) visitExpr(el, originNode);
          return;
        case "ObjectExpression":
          for (const prop of expr.properties) {
            if (prop.type === "Property" && prop.key) {
              const k = prop.key;
              if (k.type === "Literal" && typeof k.value === "string") {
                checkString(k.value, originNode);
              } else if (k.type === "Identifier" && !prop.computed) {
                checkString(k.name, originNode);
              }
            }
          }
          return;
        case "LogicalExpression":
        case "BinaryExpression":
          visitExpr(expr.left, originNode);
          visitExpr(expr.right, originNode);
          return;
        case "ConditionalExpression":
          visitExpr(expr.consequent, originNode);
          visitExpr(expr.alternate, originNode);
          return;
        default:
          return;
      }
    }

    const visitors = {
      JSXAttribute(node) {
        const attrName = node.name && node.name.name;
        if (attrName !== "className" && attrName !== "class") return;
        const v = node.value;
        if (!v) return;
        if (v.type === "Literal" && typeof v.value === "string") {
          checkString(v.value, node);
        } else if (v.type === "JSXExpressionContainer") {
          visitExpr(v.expression, node);
        }
      },
    };

    // importModules — 지정된 모듈을 import하는 것 자체를 금지
    const hasImportRestrictions = forbidden.some(
      (f) => f.importModules && f.importModules.length > 0
    );
    if (hasImportRestrictions) {
      visitors.ImportDeclaration = function (node) {
        if (!node.source || typeof node.source.value !== "string") return;
        const src = node.source.value;
        for (const f of forbidden) {
          for (const mod of f.importModules) {
            if (src === mod || src.startsWith(mod + "/")) {
              context.report({
                node: node.source,
                messageId: "forbiddenImport",
                data: { name: src, label: f.label },
              });
              return;
            }
          }
        }
      };
    }

    return visitors;
  },
};
