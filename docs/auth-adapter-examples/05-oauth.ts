/**
 * Example 05 — OAuth 2.0 Authorization Code Flow
 *
 * 시나리오:
 *   첫 화면이 OAuth provider 의 로그인 페이지로 redirect 되고, 사용자가
 *   자격 증명을 입력한 뒤 consent 화면을 거쳐 redirect_uri 로 돌아오는
 *   흐름입니다. 측정 시점에 매번 새로 흐름을 거치는 형태이며, refresh
 *   token 으로 백엔드에서 사전 발급하는 흐름은 04-jwt-persistence.ts 가
 *   더 적합합니다.
 *
 * 흐름:
 *   1. OAuth 인증 URL 을 직접 구성해서 진입 (또는 앱의 보호된 페이지로
 *      진입해서 redirect 를 따라가도 됩니다).
 *   2. provider 의 로그인 폼을 채워 submit.
 *   3. consent 화면이 나오면 동의 버튼을 누름.
 *   4. redirect_uri 로 돌아왔는지 URL 로 확인.
 *
 * 본 예제는 흔한 형태 (provider 로그인 → consent → redirect) 만 다룹니다.
 * provider 별로 페이지 구조와 셀렉터가 달라 실제 환경에 맞춰 정정이 필요합니다.
 *
 * 필요한 환경변수:
 *   - LIGHTHOUSE_BASE_URL                  (앱 base URL — redirect_uri 가 포함된 도메인)
 *   - LIGHTHOUSE_OAUTH_AUTHORIZE_URL       (예: https://accounts.example.com/o/authorize)
 *   - LIGHTHOUSE_OAUTH_CLIENT_ID
 *   - LIGHTHOUSE_OAUTH_REDIRECT_URI        (예: https://app.example.com/callback)
 *   - LIGHTHOUSE_OAUTH_SCOPE               (선택, 기본 "openid profile email")
 *   - LIGHTHOUSE_TEST_ID
 *   - LIGHTHOUSE_TEST_PW
 *   - LIGHTHOUSE_OAUTH_ID_SELECTOR         (선택, provider 의 ID 입력 셀렉터)
 *   - LIGHTHOUSE_OAUTH_PW_SELECTOR         (선택)
 *   - LIGHTHOUSE_OAUTH_SUBMIT_SELECTOR     (선택)
 *   - LIGHTHOUSE_OAUTH_CONSENT_SELECTOR    (선택, consent 화면의 "허용" 버튼)
 *
 * 주의:
 *   - client_secret 은 본 어댑터에서 다루지 않습니다. authorization code 를
 *     access token 으로 교환하는 단계는 보통 backend 가 처리하기 때문입니다.
 *     SPA 환경 (PKCE 흐름) 이라면 redirect_uri 콜백이 자체적으로 토큰 교환을
 *     수행하므로 본 어댑터로 흐름이 자연스럽게 끝납니다.
 */

import type { LighthouseAuthAdapter } from "dsmonitor";
import type { Browser, Page } from "puppeteer";

const TIMEOUT = 30_000;

async function getOrCreatePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();
  return pages.length > 0 ? pages[0] : await browser.newPage();
}

function buildAuthorizeUrl(): string {
  const url = process.env.LIGHTHOUSE_OAUTH_AUTHORIZE_URL;
  const clientId = process.env.LIGHTHOUSE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.LIGHTHOUSE_OAUTH_REDIRECT_URI;
  const scope = process.env.LIGHTHOUSE_OAUTH_SCOPE || "openid profile email";

  if (!url || !clientId || !redirectUri) {
    throw new Error(
      "[oauth] LIGHTHOUSE_OAUTH_AUTHORIZE_URL / CLIENT_ID / REDIRECT_URI 가 필요합니다."
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
  });
  return `${url}?${params.toString()}`;
}

const adapter: LighthouseAuthAdapter<Browser> = async (browser) => {
  const id = process.env.LIGHTHOUSE_TEST_ID;
  const pw = process.env.LIGHTHOUSE_TEST_PW;
  const redirectUri = process.env.LIGHTHOUSE_OAUTH_REDIRECT_URI;

  if (!id || !pw || !redirectUri) {
    throw new Error(
      "[oauth] LIGHTHOUSE_TEST_ID / LIGHTHOUSE_TEST_PW / LIGHTHOUSE_OAUTH_REDIRECT_URI 가 필요합니다."
    );
  }

  const idSel = process.env.LIGHTHOUSE_OAUTH_ID_SELECTOR || 'input[name="username"], input[type="email"]';
  const pwSel = process.env.LIGHTHOUSE_OAUTH_PW_SELECTOR || 'input[name="password"], input[type="password"]';
  const submitSel = process.env.LIGHTHOUSE_OAUTH_SUBMIT_SELECTOR || 'button[type="submit"]';
  const consentSel = process.env.LIGHTHOUSE_OAUTH_CONSENT_SELECTOR;

  const page = await getOrCreatePage(browser);
  const authorizeUrl = buildAuthorizeUrl();

  // 1. authorize URL 로 진입.
  await page.goto(authorizeUrl, { waitUntil: "networkidle2", timeout: TIMEOUT });

  // 2. provider 의 로그인 폼 채워서 submit.
  await page.waitForSelector(idSel, { timeout: TIMEOUT });
  await page.type(idSel, id);
  await page.waitForSelector(pwSel, { timeout: TIMEOUT });
  await page.type(pwSel, pw);

  await Promise.all([
    page.click(submitSel),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: TIMEOUT }),
  ]);

  // 3. consent 화면이 있으면 동의 버튼 클릭. 사이트마다 노출 여부가 달라
  //    셀렉터 부재 시 그대로 통과합니다.
  if (consentSel) {
    try {
      await page.waitForSelector(consentSel, { timeout: 5_000 });
      await Promise.all([
        page.click(consentSel),
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: TIMEOUT }),
      ]);
    } catch {
      // consent 화면이 노출되지 않은 케이스 — 이미 동의된 사용자.
    }
  }

  // 4. 최종 URL 이 redirect_uri 의 호스트와 같으면 성공.
  const finalHost = new URL(page.url()).host;
  const expectedHost = new URL(redirectUri).host;
  if (finalHost !== expectedHost) {
    throw new Error(
      `[oauth] OAuth 콜백 redirect 실패 — 최종 URL: ${page.url()}, 기대: ${expectedHost}`
    );
  }
};

adapter.getMetadata = () => ({
  authType: "oauth",
  clientId: process.env.LIGHTHOUSE_OAUTH_CLIENT_ID || null,
  scope: process.env.LIGHTHOUSE_OAUTH_SCOPE || "openid profile email",
});

export default adapter;
