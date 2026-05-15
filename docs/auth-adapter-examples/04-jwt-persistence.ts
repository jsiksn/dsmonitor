/**
 * Example 04 — JWT 토큰 주입 (login 페이지 생략)
 *
 * 시나리오:
 *   API 호출로 미리 받아 둔 JWT 가 있고, 그것을 localStorage / cookie 에
 *   심어 두면 앱이 인증된 상태로 시작하는 SPA 입니다. 로그인 페이지를
 *   거치지 않으므로 form-login 보다 빠르고, MFA / captcha 처럼 자동화하기
 *   어려운 단계를 회피할 수 있습니다.
 *
 * 흐름:
 *   1. baseUrl 에 한 번 진입 — origin 이 잡혀야 localStorage 에 쓸 수 있습니다.
 *   2. evaluate 안에서 localStorage / cookie 에 토큰 주입.
 *   3. 후속 측정에서 LHCI 가 그대로 이어 사용합니다.
 *
 * 필요한 환경변수:
 *   - LIGHTHOUSE_BASE_URL
 *   - LIGHTHOUSE_JWT_TOKEN          (필수)
 *   - LIGHTHOUSE_JWT_STORAGE_KEY    (선택, 기본 "accessToken")
 *   - LIGHTHOUSE_JWT_COOKIE_NAME    (선택 — 지정 시 cookie 에도 함께 주입)
 *
 * 토큰 만료 처리:
 *   - 본 어댑터는 토큰의 유효 기간을 검사하지 않습니다. CI 안에서는 매 실행마다
 *     사전 단계 (예: 사전 spawn 한 스크립트) 에서 새 토큰을 발급해 환경변수로
 *     넘기는 패턴을 권장합니다.
 */

import type { LighthouseAuthAdapter } from "dsmonitor";
import type { Browser, Page } from "puppeteer";

const TIMEOUT = 15_000;

async function getOrCreatePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();
  return pages.length > 0 ? pages[0] : await browser.newPage();
}

const adapter: LighthouseAuthAdapter<Browser> = async (browser) => {
  const baseUrl = process.env.LIGHTHOUSE_BASE_URL;
  const token = process.env.LIGHTHOUSE_JWT_TOKEN;
  const storageKey = process.env.LIGHTHOUSE_JWT_STORAGE_KEY || "accessToken";
  const cookieName = process.env.LIGHTHOUSE_JWT_COOKIE_NAME;

  if (!baseUrl || !token) {
    throw new Error(
      "[jwt-persistence] LIGHTHOUSE_BASE_URL / LIGHTHOUSE_JWT_TOKEN 이 필요합니다."
    );
  }

  const page = await getOrCreatePage(browser);

  // 1. origin 이 잡히도록 한 번 진입.
  await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: TIMEOUT });

  // 2. localStorage 주입.
  await page.evaluate(
    (key: string, value: string) => {
      window.localStorage.setItem(key, value);
    },
    storageKey,
    token
  );

  // 3. cookie 도 함께 쓰는 앱이면 같이 주입.
  if (cookieName) {
    const url = new URL(baseUrl);
    await page.setCookie({
      name: cookieName,
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: url.protocol === "https:",
    });
  }

  // localStorage 가 즉시 적용되도록 한 번 reload — 앱이 mount 시점에 토큰을
  // 읽도록 설계된 경우 본 단계가 필요합니다.
  await page.reload({ waitUntil: "networkidle2", timeout: TIMEOUT });
};

adapter.getMetadata = () => ({
  authType: "jwt-persistence",
  storageKey: process.env.LIGHTHOUSE_JWT_STORAGE_KEY || "accessToken",
  cookieName: process.env.LIGHTHOUSE_JWT_COOKIE_NAME || null,
});

export default adapter;
