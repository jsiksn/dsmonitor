"use strict";

const fs = require("fs");
const path = require("path");

const rules = {
  "no-forbidden-classes": require("./rules/no-forbidden-classes"),
};

/**
 * Build an ESLint shareable config fragment from a StylingPolicy.
 *
 * Usage (in .eslintrc.js):
 *   const { fromPolicy } = require('eslint-plugin-ui-health');
 *   const policy = require('./dsmonitor/stylingPolicy');
 *   module.exports = {
 *     extends: ['next/core-web-vitals'],
 *     ...fromPolicy(policy, {
 *       baselinePath: './dsmonitor/lint-baseline.json',
 *     }),
 *   };
 *
 * Ratchet behavior:
 * - files listed in baseline.files → "warn"
 * - all other files (incl. new ones) → "error"
 * - no baseline file → "error" for every file (start-from-clean mode)
 */
function fromPolicy(policy, opts) {
  const options = opts || {};
  const ruleName = "ui-health/no-forbidden-classes";
  const serialized = serializePolicy(policy);
  const errorRule = ["error", { forbidden: serialized }];
  const warnRule = ["warn", { forbidden: serialized }];

  const baseline = options.baselinePath ? loadBaseline(options.baselinePath) : null;
  const baselineFiles =
    baseline && baseline.files ? Object.keys(baseline.files) : [];

  return {
    plugins: ["ui-health"],
    rules: {
      [ruleName]: errorRule,
    },
    overrides:
      baselineFiles.length > 0
        ? [
            {
              files: baselineFiles,
              rules: { [ruleName]: warnRule },
            },
          ]
        : [],
  };
}

function serializePolicy(policy) {
  const forbidden = (policy && policy.forbidden) || [];
  return forbidden.map((f) => ({
    id: f.id,
    label: f.label,
    severity: f.severity,
    classPatterns: (f.classPatterns || []).map((r) =>
      r instanceof RegExp
        ? { source: r.source, flags: r.flags || "" }
        : { source: r.source, flags: r.flags || "" }
    ),
    importModules: f.importModules,
  }));
}

function loadBaseline(p) {
  try {
    const abs = path.isAbsolute(p) ? p : path.resolve(p);
    if (!fs.existsSync(abs)) return null;
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

module.exports = { rules, fromPolicy };
