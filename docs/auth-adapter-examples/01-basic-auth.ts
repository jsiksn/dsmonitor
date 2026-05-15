/**
 * Example 01 — HTTP Basic Authentication
 *
 * 시나리오:
 *   서버가 `WWW-Authenticate: Basic` 으로 protected 한 사이트를 Lighthouse 로
 *   측정합니다. 사내 dev / staging 환경, Storybook 빌드 등이 이 케이스에 흔합니다.
 *
 * 흐름:
 *   1. 첫 페이지 진입 전에 `page.authenticate({ username, password })` 호출.
 *   2. 이후 모든 요청에 `Authorization: Basic ...` 헤더가 자동으로 첨부됩니다.
 *
 * 필요한 환경변수:
 *   - LIGHTHOUSE_BASIC_USER
 *   - LIGHTHOUSE_BASIC_PASS
 *
 * dsmonitor.config.ts 안 등록 예:
 *   lighthouse: {
 *     auth: { type: "custom", adapter: "./lighthouse/auth/basic-auth.ts" },
 *   }
 */

import type { LighthouseAuthAdapter } from "dsmonitor";
import type { Browser } from "puppeteer";

const adapter: LighthouseAuthAdapter<Browser> = async (browser) => {
  const username = process.env.LIGHTHOUSE_BASIC_USER;
  const password = process.env.LIGHTHOUSE_BASIC_PASS;

  if (!username || !password) {
    throw new Error(
      "[basic-auth] LIGHTHOUSE_BASIC_USER / LIGHTHOUSE_BASIC_PASS 가 필요합니다. " +
        "dsmonitor/.env.local 에 추가하세요."
    );
  }

  // LHCI 가 미리 띄워 둔 page 가 있으면 그걸 쓰고, 없으면 새로 만듭니다.
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  await page.authenticate({ username, password });
  // 여기서 별도 goto 를 호출하지 않습니다 — LHCI 가 측정 URL 마다 직접
  // page.goto() 를 호출하면서 위 인증 헤더를 자동으로 첨부합니다.
};

adapter.getMetadata = () => ({
  authType: "basic-auth",
  user: process.env.LIGHTHOUSE_BASIC_USER || null,
});

export default adapter;
