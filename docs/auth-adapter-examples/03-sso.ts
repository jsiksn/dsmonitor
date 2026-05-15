/**
 * Example 03 — SSO (Single Sign-On, 외부 IdP redirect)
 *
 * 시나리오:
 *   사용자 도메인 (예: app.example.com) 에 진입하면 자동으로 IdP 도메인
 *   (예: idp.company.com) 으로 redirect 되고, IdP 에서 로그인하면 다시 원래
 *   도메인으로 돌아와 세션이 발급되는 흐름입니다. SAML / OIDC 와 같은 표준
 *   프로토콜이 흔히 이 형태입니다.
 *
 * 본 예제는 SP-initiated 흐름 (앱이 IdP 로 redirect 시키는 케이스) 을 다룹니다.
 * IdP-initiated 흐름은 IdP 에서 시작해서 우리 도메인으로 들어오는 형태이며,
 * 그 케이스는 적당한 IdP 진입 URL 을 직접 goto 하는 식으로 단순화할 수 있습니다.
 *
 * 흐름:
 *   1. 앱의 로그인 트리거 URL (또는 보호된 페이지) 로 이동.
 *   2. IdP 도메인으로 redirect 되면 IdP 의 로그인 폼을 채워 submit.
 *   3. IdP 가 원래 도메인으로 redirect 시킬 때까지 대기.
 *   4. 원래 도메인 안 보호된 페이지가 정상 응답하면 세션이 잡힌 것입니다.
 *
 * 필요한 환경변수:
 *   - LIGHTHOUSE_BASE_URL              (앱 base URL)
 *   - LIGHTHOUSE_SSO_LOGIN_TRIGGER     (예: /private — 진입 시 IdP 로 redirect 됨)
 *   - LIGHTHOUSE_IDP_HOST              (예: idp.company.com — IdP 도메인)
 *   - LIGHTHOUSE_IDP_ID_SELECTOR       (예: input[name="username"])
 *   - LIGHTHOUSE_IDP_PW_SELECTOR       (예: input[name="password"])
 *   - LIGHTHOUSE_IDP_SUBMIT_SELECTOR   (예: button[type="submit"])
 *   - LIGHTHOUSE_TEST_ID
 *   - LIGHTHOUSE_TEST_PW
 *
 * 주의: SAML POST binding (POST + form auto-submit) 케이스는 page.waitForNavigation 으로
 * redirect chain 추적이 잘 동작하지만, 자바스크립트 자동 submit 사이에 시간이 길면
 * 타임아웃을 늘려야 할 수 있습니다.
 */

import type { LighthouseAuthAdapter } from "dsmonitor";
import type { Browser, Page } from "puppeteer";

const TIMEOUT = 30_000;

async function getOrCreatePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();
  return pages.length > 0 ? pages[0] : await browser.newPage();
}

const adapter: LighthouseAuthAdapter<Browser> = async (browser) => {
  const baseUrl = process.env.LIGHTHOUSE_BASE_URL;
  const trigger = process.env.LIGHTHOUSE_SSO_LOGIN_TRIGGER || "/private";
  const idpHost = process.env.LIGHTHOUSE_IDP_HOST;
  const id = process.env.LIGHTHOUSE_TEST_ID;
  const pw = process.env.LIGHTHOUSE_TEST_PW;

  if (!baseUrl || !idpHost || !id || !pw) {
    throw new Error(
      "[sso] LIGHTHOUSE_BASE_URL / LIGHTHOUSE_IDP_HOST / LIGHTHOUSE_TEST_ID / LIGHTHOUSE_TEST_PW 가 필요합니다."
    );
  }

  const idSel = process.env.LIGHTHOUSE_IDP_ID_SELECTOR || 'input[name="username"]';
  const pwSel = process.env.LIGHTHOUSE_IDP_PW_SELECTOR || 'input[name="password"]';
  const submitSel = process.env.LIGHTHOUSE_IDP_SUBMIT_SELECTOR || 'button[type="submit"]';

  const page = await getOrCreatePage(browser);

  // 1. SP 측 진입 — IdP 로 자동 redirect.
  const triggerUrl = `${baseUrl.replace(/\/$/, "")}${trigger.startsWith("/") ? "" : "/"}${trigger}`;
  await page.goto(triggerUrl, { waitUntil: "networkidle2", timeout: TIMEOUT });

  // 2. 현재 URL 이 IdP 도메인인지 확인.
  if (!page.url().includes(idpHost)) {
    // 이미 인증된 세션이면 IdP 로 안 가고 바로 본문이 나옵니다.
    console.log("[sso] IdP redirect 없이 바로 응답 — 이미 인증된 세션으로 판단.");
    return;
  }

  // 3. IdP 의 로그인 폼을 채워 submit.
  await page.waitForSelector(idSel, { timeout: TIMEOUT });
  await page.type(idSel, id);
  await page.waitForSelector(pwSel, { timeout: TIMEOUT });
  await page.type(pwSel, pw);

  await Promise.all([
    page.click(submitSel),
    // IdP → SP 로 돌아오는 redirect chain (보통 2~3 단계 / SAML POST binding 케이스
    // 는 자바스크립트 auto-submit 한 번 더) 을 모두 통과할 때까지 대기.
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: TIMEOUT }),
  ]);

  // 4. 최종 URL 이 IdP 가 아니어야 정상입니다.
  if (page.url().includes(idpHost)) {
    throw new Error(
      "[sso] IdP 로그인 후에도 IdP 도메인에 머무름 — 자격 증명 / MFA / 콜백 URL 확인."
    );
  }
};

adapter.getMetadata = () => ({
  authType: "sso",
  idpHost: process.env.LIGHTHOUSE_IDP_HOST || null,
  testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
});

export default adapter;
