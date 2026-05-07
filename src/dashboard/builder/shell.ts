/**
 * HTML shell 빌더 — 시안 (Claude Design 핸드오프) 의 `Phase 0.5 Review Dashboard.html`
 * 구조 1:1 호환.
 *
 * 흐름:
 *   1. head + style (시안 인라인 CSS — components/styles.css)
 *   2. <body> + <div id="root">
 *   3. CDN scripts (React + ReactDOM + Babel)
 *   4. 데이터 inject (window.__PROJECT_NAME / __SUMMARY_DATA / __CODE_DATA / __FIGMA_DATA / __LH_DATA)
 *   5. code-tab.jsx + figma-tab.jsx + lighthouse-tab.jsx 인라인 (text/babel) —
 *      각 jsx 가 자체 mini 컴포넌트 보유 (시안 그대로). 끝에 window.{Tab}_Detail
 *      export + dispatchEvent 로 root wrapper 와 동기화.
 *   6. root.jsx 인라인 (App + ReactDOM.createRoot)
 *
 * 외부 의존: Google Fonts (Inter / JetBrains Mono) + unpkg CDN (React 18.3.1 /
 *           ReactDOM 18.3.1 / @babel/standalone 7.29.0). 시안과 동일 URL + integrity.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { DashboardData } from "../transformers/types";

// v0.1.0: ESM 호환 — __dirname 누락. fileURLToPath(import.meta.url) 활용.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 두 케이스 호환 path —
//  - dev (tsx + src): __dirname = src/dashboard/builder/ → ../components
//  - bundled (dist/cli.js): __dirname = dist/ → dashboard/components
const TRY_COMPONENTS_DIRS = [
  path.resolve(__dirname, "..", "components"),
  path.resolve(__dirname, "dashboard", "components"),
];
const COMPONENTS_DIR =
  TRY_COMPONENTS_DIRS.find((p) => fs.existsSync(path.join(p, "styles.css"))) ??
  TRY_COMPONENTS_DIRS[0];

function readComponent(name: string): string {
  return fs.readFileSync(path.join(COMPONENTS_DIR, name), "utf8");
}

export function buildHtmlShell(data: DashboardData): string {
  const styles = readComponent("styles.css");
  const codeJsx = readComponent("code-tab.jsx");
  const figmaJsx = readComponent("figma-tab.jsx");
  const lighthouseJsx = readComponent("lighthouse-tab.jsx");
  const pluginJsx = readComponent("plugin-tab.jsx");
  const rootJsx = readComponent("root.jsx");

  // 데이터 inject — JSON.stringify, </script> 이스케이프 방어.
  const projectNameJson = safeJson(data.projectName);
  const summaryJson = safeJson(data.summary);
  const codeJson = safeJson(data.code);
  const figmaJson = data.figma ? safeJson(data.figma) : "null";
  const lhJson = data.lighthouse ? safeJson(data.lighthouse) : "null";
  const pluginsJson = safeJson(data.plugins ?? []);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DSMonitor 리뷰</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${styles}
</style>
</head>
<body>
  <div id="root"></div>

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>

  <script id="project-name-data" type="application/json">${projectNameJson}</script>
  <script id="summary-tab-data" type="application/json">${summaryJson}</script>
  <script id="code-tab-data" type="application/json">${codeJson}</script>
  <script id="figma-tab-data" type="application/json">${figmaJson}</script>
  <script id="lighthouse-tab-data" type="application/json">${lhJson}</script>
  <script id="plugins-data" type="application/json">${pluginsJson}</script>

  <script>
    window.__PROJECT_NAME = JSON.parse(document.getElementById("project-name-data").textContent);
    window.__SUMMARY_DATA = JSON.parse(document.getElementById("summary-tab-data").textContent);
    window.__CODE_DATA = JSON.parse(document.getElementById("code-tab-data").textContent);
    window.__FIGMA_DATA = JSON.parse(document.getElementById("figma-tab-data").textContent);
    window.__LH_DATA = JSON.parse(document.getElementById("lighthouse-tab-data").textContent);
    window.__PLUGINS_DATA = JSON.parse(document.getElementById("plugins-data").textContent);
  </script>

  <script type="text/babel" data-presets="env,react">
${codeJsx}
  </script>

  <script type="text/babel" data-presets="env,react">
${figmaJsx}
  </script>

  <script type="text/babel" data-presets="env,react">
${lighthouseJsx}
  </script>

  <script type="text/babel" data-presets="env,react">
${pluginJsx}
  </script>

  <script type="text/babel" data-presets="env,react">
${rootJsx}
  </script>
</body>
</html>
`;
}

/** JSON 안 `</script>` 시퀀스 이스케이프. inline data 안전. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
}
