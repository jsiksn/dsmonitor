/**
 * Example 02 — ID / PW Form Login
 *
 * 시나리오:
 *   가장 흔한 패턴 — 로그인 페이지에 ID / PW 를 입력하고 제출하면 세션 쿠키
 *   (또는 JWT) 가 발급되는 사이트입니다. dsmonitor 내장 `basic` 어댑터와 동작은
 *   같지만, 셀렉터 / 추가 헤더 / multi-step 로그인 등을 자유롭게 customize 하고
 *   싶을 때 본 예제를 베이스로 시작합니다.
 *
 * 흐름:
 *   1. 로그인 페이지로 이동.
 *   2. ID / PW 셀렉터에 type.
 *   3. 제출 버튼 클릭 → navigation 대기.
 *   4. 후속 측정에서는 LHCI 가 자동으로 이 세션을 이어 사용합니다
 *      (disableStorageReset 은 dsmonitor 가 auth.type !== "none" 일 때 자동으로 true).
 *
 * 필요한 환경변수:
 *   - LIGHTHOUSE_BASE_URL
 *   - LIGHTHOUSE_LOGIN_URL   (예: /login — baseUrl 기준 path)
 *   - LIGHTHOUSE_TEST_ID
 *   - LIGHTHOUSE_TEST_PW
 */

import type { LighthouseAuthAdapter } from "dsmonitor";
import type { Browser, Page } from "puppeteer";

const SELECTORS = {
  // 사이트 DOM 에 맞춰 정정하세요.
  idInput: 'input[name="email"], input[type="email"]',
  pwInput: 'input[name="password"], input[type="password"]',
  submit: 'button[type="submit"]',
};

const TIMEOUT = 15_000;

async function getOrCreatePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();
  return pages.length > 0 ? pages[0] : await browser.newPage();
}

const adapter: LighthouseAuthAdapter<Browser> = async (browser) => {
  const baseUrl = process.env.LIGHTHOUSE_BASE_URL;
  const loginPath = process.env.LIGHTHOUSE_LOGIN_URL || "/login";
  const id = process.env.LIGHTHOUSE_TEST_ID;
  const pw = process.env.LIGHTHOUSE_TEST_PW;

  if (!baseUrl || !id || !pw) {
    throw new Error(
      "[form-login] LIGHTHOUSE_BASE_URL / LIGHTHOUSE_TEST_ID / LIGHTHOUSE_TEST_PW 가 필요합니다."
    );
  }

  const loginUrl = /^https?:\/\//.test(loginPath)
    ? loginPath
    : `${baseUrl.replace(/\/$/, "")}${loginPath.startsWith("/") ? "" : "/"}${loginPath}`;

  const page = await getOrCreatePage(browser);

  await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: TIMEOUT });

  await page.waitForSelector(SELECTORS.idInput, { timeout: TIMEOUT });
  await page.type(SELECTORS.idInput, id);

  await page.waitForSelector(SELECTORS.pwInput, { timeout: TIMEOUT });
  await page.type(SELECTORS.pwInput, pw);

  await Promise.all([
    page.click(SELECTORS.submit),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: TIMEOUT }),
  ]);

  // 제출 후에도 여전히 로그인 페이지면 자격 증명 불일치로 본 어댑터를 실패시킵니다.
  if (page.url().includes(loginPath)) {
    throw new Error(
      "[form-login] 로그인 실패 — ID / PW 를 확인하세요. " +
        ".env.local 안 LIGHTHOUSE_TEST_ID / LIGHTHOUSE_TEST_PW 검토."
    );
  }
};

adapter.getMetadata = () => ({
  authType: "form-login",
  testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
  loginUrl: process.env.LIGHTHOUSE_LOGIN_URL || null,
});

export default adapter;
