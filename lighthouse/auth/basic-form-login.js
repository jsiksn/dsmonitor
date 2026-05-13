/**
 * Basic Form Login — dsmonitor 패키지 내장 Lighthouse 인증 어댑터 (0.4.0).
 *
 * 흐름:
 *   1. baseUrl 이동 → 현재 URL 안 loginUrl path 포함 여부로 인증 상태 사전 판별
 *      (isAuthed). 이미 인증 = 풀 로그인 skip.
 *   2. loginUrl 이동 → ID/PW 입력 → submit → navigation 대기.
 *   3. navigation 후 여전히 loginUrl 안 머무름 = ID/PW 실패 안내.
 *
 * 환경변수 (필수):
 *   - LIGHTHOUSE_BASE_URL      (예: https://dev.example.com)
 *   - LIGHTHOUSE_LOGIN_URL     (예: /login — baseUrl 기준 path 또는 절대 URL)
 *   - LIGHTHOUSE_TEST_ID
 *   - LIGHTHOUSE_TEST_PW
 *
 * 환경변수 (선택, selector override):
 *   - LIGHTHOUSE_BASIC_SELECTOR_ID_INPUT
 *   - LIGHTHOUSE_BASIC_SELECTOR_PW_INPUT
 *   - LIGHTHOUSE_BASIC_SELECTOR_SUBMIT
 *
 * 어댑터 인터페이스 (LHCI puppeteerScript + dsmonitor 확장):
 *   - module.exports = async (browser, context) => void   (LHCI 호환)
 *   - module.exports.getMetadata = () => Record<string, any>  (run.js 안 summary 누적)
 */

"use strict";

const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env.local"),
});

const DEFAULT_SELECTORS = {
  idInput:
    'input[type="email"], input[type="text"][name*="id" i], input[type="text"][name*="email" i], input[type="text"][name*="user" i]',
  pwInput: 'input[type="password"]',
  submit: 'button[type="submit"]',
};

const TIMEOUTS = {
  navigation: 15000,
  selector: 10000,
};

function getSelectors() {
  return {
    idInput:
      process.env.LIGHTHOUSE_BASIC_SELECTOR_ID_INPUT || DEFAULT_SELECTORS.idInput,
    pwInput:
      process.env.LIGHTHOUSE_BASIC_SELECTOR_PW_INPUT || DEFAULT_SELECTORS.pwInput,
    submit:
      process.env.LIGHTHOUSE_BASIC_SELECTOR_SUBMIT || DEFAULT_SELECTORS.submit,
  };
}

function readCredentials() {
  const {
    LIGHTHOUSE_BASE_URL,
    LIGHTHOUSE_LOGIN_URL,
    LIGHTHOUSE_TEST_ID,
    LIGHTHOUSE_TEST_PW,
  } = process.env;

  const missing = [];
  if (!LIGHTHOUSE_BASE_URL) missing.push("LIGHTHOUSE_BASE_URL");
  if (!LIGHTHOUSE_LOGIN_URL) missing.push("LIGHTHOUSE_LOGIN_URL");
  if (!LIGHTHOUSE_TEST_ID) missing.push("LIGHTHOUSE_TEST_ID");
  if (!LIGHTHOUSE_TEST_PW) missing.push("LIGHTHOUSE_TEST_PW");

  if (missing.length > 0) {
    throw new Error(
      `[basic-form-login] 환경변수 누락: ${missing.join(", ")}. ` +
        `dsmonitor/.env.local 설정 확인 (.env.local.example 참조).`
    );
  }

  const baseUrl = LIGHTHOUSE_BASE_URL.replace(/\/$/, "");
  const loginUrl = /^https?:\/\//.test(LIGHTHOUSE_LOGIN_URL)
    ? LIGHTHOUSE_LOGIN_URL
    : `${baseUrl}${LIGHTHOUSE_LOGIN_URL.startsWith("/") ? "" : "/"}${LIGHTHOUSE_LOGIN_URL}`;

  return {
    baseUrl,
    loginUrl,
    id: LIGHTHOUSE_TEST_ID,
    pw: LIGHTHOUSE_TEST_PW,
  };
}

function loginPath(loginUrl) {
  try {
    return new URL(loginUrl).pathname;
  } catch (_err) {
    return loginUrl.startsWith("/") ? loginUrl : `/${loginUrl}`;
  }
}

async function isAuthed(page, baseUrl, loginUrl) {
  try {
    await page.goto(baseUrl, {
      waitUntil: "networkidle2",
      timeout: TIMEOUTS.navigation,
    });
    const currentUrl = page.url();
    return !currentUrl.includes(loginPath(loginUrl));
  } catch (_err) {
    return false;
  }
}

async function login(page, credentials) {
  const { loginUrl, id, pw } = credentials;
  const sel = getSelectors();

  console.log(`[basic-form-login] login URL 진입: ${loginUrl}`);
  await page.goto(loginUrl, {
    waitUntil: "networkidle2",
    timeout: TIMEOUTS.navigation,
  });

  await page.waitForSelector(sel.idInput, { timeout: TIMEOUTS.selector });
  await page.type(sel.idInput, id);

  await page.waitForSelector(sel.pwInput, { timeout: TIMEOUTS.selector });
  await page.type(sel.pwInput, pw);

  await Promise.all([
    page.click(sel.submit),
    page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: TIMEOUTS.navigation,
    }),
  ]);

  if (page.url().includes(loginPath(loginUrl))) {
    throw new Error(
      "[basic-form-login] 로그인 실패: ID/PW 확인. " +
        ".env.local 안 LIGHTHOUSE_TEST_ID / LIGHTHOUSE_TEST_PW 검토."
    );
  }
}

module.exports = async (browser /* , context */) => {
  const credentials = readCredentials();
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  if (await isAuthed(page, credentials.baseUrl, credentials.loginUrl)) {
    console.log("[basic-form-login] 이미 인증된 세션 — 풀 로그인 skip");
    return;
  }

  await login(page, credentials);
  console.log("[basic-form-login] 로그인 끝");
};

module.exports.getMetadata = function getMetadata() {
  return {
    authType: "basic",
    testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
    loginUrl: process.env.LIGHTHOUSE_LOGIN_URL || null,
  };
};

// 옛 portal-gateway 어댑터 측 흐름 일관 — 내부 함수 노출 (테스트 / 사용자 정정 진입점).
module.exports.login = login;
module.exports.readCredentials = readCredentials;
module.exports.isAuthed = isAuthed;
