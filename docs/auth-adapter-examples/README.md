# Lighthouse Auth Adapter Examples

dsmonitor 의 `lighthouse.auth = { type: "custom", adapter: "./..." }` 가 가리키는 어댑터 파일을 작성할 때 참고할 수 있는 예제 모음입니다. 모든 예제는 0.7.1 에 추가된 `LighthouseAuthAdapter` 타입으로 작성되었고, 그대로 복사한 뒤 환경에 맞게 셀렉터 / URL / 환경변수만 정정하면 동작합니다.

## 예제 시나리오

| 파일                                             | 시나리오                  | 핵심 흐름                                                                                              |
| ------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`01-basic-auth.ts`](./01-basic-auth.ts)         | HTTP Basic Authentication | Puppeteer `page.authenticate()` 활용. 모든 후속 요청에 `Authorization: Basic ...` 자동 첨부.            |
| [`02-form-login.ts`](./02-form-login.ts)         | ID / PW form login        | 로그인 페이지 진입 → ID / PW 입력 → 제출 → navigation 대기. 가장 흔한 패턴.                            |
| [`03-sso.ts`](./03-sso.ts)                       | SSO (외부 IdP redirect)   | IdP 페이지로 이동 → IdP 로그인 폼 입력 → 원본 도메인으로 redirect → 세션 유지 확인.                     |
| [`04-jwt-persistence.ts`](./04-jwt-persistence.ts) | JWT 토큰 보존              | 환경변수에서 JWT 를 읽어 localStorage / cookie 에 주입. 페이지 이동 없이 바로 인증된 상태로 측정.        |
| [`05-oauth.ts`](./05-oauth.ts)                   | OAuth 2.0 code flow       | OAuth 인증 URL 진입 → 사용자 자격 증명 입력 → consent → redirect_uri 까지 추적해 토큰 획득.            |

## 어댑터 작성 방법

```ts
import type { LighthouseAuthAdapter } from "dsmonitor";
import type { Browser } from "puppeteer";

const adapter: LighthouseAuthAdapter<Browser> = async (browser, context) => {
  // 1. browser.pages() 또는 browser.newPage() 로 page 객체 확보.
  // 2. 인증 흐름 (로그인 / 토큰 주입 등) 수행.
  // 3. return — LHCI 가 이 페이지에서 그대로 측정을 이어 갑니다.
};

// 선택 — summary.json 에 누적되는 메타데이터.
adapter.getMetadata = () => ({
  authType: "custom",
  testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
});

export default adapter;
```

`dsmonitor.config.ts` 에서는 어댑터 경로를 지정합니다.

```ts
lighthouse: {
  baseUrl: process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000",
  pages: [{ path: "/", name: "Home" }],
  auth: { type: "custom", adapter: "./lighthouse/auth/custom.ts" },
},
```

## 환경변수 패턴

자격 증명은 코드에 직접 적지 않고 환경변수로 받는 것이 안전합니다. 어댑터마다 쓰는 변수를 README 상단 주석에 명시해 두면 팀원이 알아보기 쉽습니다.

```
# dsmonitor/.env.local
LIGHTHOUSE_BASE_URL=https://dev.example.com
LIGHTHOUSE_TEST_ID=qa@example.com
LIGHTHOUSE_TEST_PW=********
LIGHTHOUSE_JWT_TOKEN=eyJhbGciOi...     # JWT 시나리오 전용
LIGHTHOUSE_OAUTH_CLIENT_ID=...         # OAuth 시나리오 전용
LIGHTHOUSE_OAUTH_CLIENT_SECRET=...
```

`.env.local` 은 반드시 `.gitignore` 에 등록하세요.

## 검증 방법

작성한 어댑터가 올바른 위치를 가리키는지, 필요한 환경변수가 모두 잡혔는지 한 번에 점검할 수 있습니다.

```bash
npx dsmonitor doctor
```

`lighthouse.auth.adapter` 가 가리키는 파일이 없으면 오류로, `LIGHTHOUSE_*` 환경변수가 누락되면 경고로 표시됩니다 (상세 출력 예시는 README §13 참고).

## TypeScript 예제를 JavaScript 로 변환할 때

본 예제는 모두 TypeScript 입니다. 환경에 따라 `.js` 어댑터가 필요하면 다음 순서로 변환하면 됩니다.

1. `import type { ... } from "..."` 줄 전체 제거.
2. 함수 매개변수의 type annotation (`browser: Browser` → `browser`) 제거.
3. `as ...` / `satisfies ...` / 제네릭 (`<Browser>`) 표기 제거.
4. `export default adapter;` → `module.exports = adapter;` (그리고 `adapter.getMetadata = ...` 는 그대로).

dsmonitor 의 어댑터 로더는 `.ts` / `.js` 모두 지원하므로, 작성 환경에 맞춰 선택하면 됩니다.

---

# Lighthouse Auth Adapter Examples (English)

This directory holds reference adapters you can copy when writing the `lighthouse.auth = { type: "custom", adapter: "./..." }` script. All examples target the `LighthouseAuthAdapter` type that ships with dsmonitor 0.7.1 — drop them into your repo and adjust selectors, URLs, and env vars to fit your stack.

## Example matrix

| File                                             | Scenario                  | Flow                                                                                                  |
| ------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`01-basic-auth.ts`](./01-basic-auth.ts)         | HTTP Basic Authentication | Calls Puppeteer's `page.authenticate()`; every subsequent request carries `Authorization: Basic ...`. |
| [`02-form-login.ts`](./02-form-login.ts)         | ID / PW form login        | Navigates to the login page, fills the inputs, submits, and waits for navigation. The most common case. |
| [`03-sso.ts`](./03-sso.ts)                       | SSO (external IdP)        | Redirects to the IdP, fills its login form, follows the redirect back to your origin, validates the session. |
| [`04-jwt-persistence.ts`](./04-jwt-persistence.ts) | JWT injection             | Reads a JWT from env, drops it into `localStorage` (or cookies) before navigation — no login click required. |
| [`05-oauth.ts`](./05-oauth.ts)                   | OAuth 2.0 code flow       | Walks the OAuth code flow: auth URL → credentials → consent → redirect_uri → token exchange.          |

## Writing an adapter

```ts
import type { LighthouseAuthAdapter } from "dsmonitor";
import type { Browser } from "puppeteer";

const adapter: LighthouseAuthAdapter<Browser> = async (browser, context) => {
  // 1. get a Page via browser.pages() or browser.newPage()
  // 2. perform login / token injection / etc.
  // 3. return — LHCI resumes measuring on the same page
};

adapter.getMetadata = () => ({
  authType: "custom",
  testAccount: process.env.LIGHTHOUSE_TEST_ID || null,
});

export default adapter;
```

Wire it up in `dsmonitor.config.ts`:

```ts
lighthouse: {
  baseUrl: process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000",
  pages: [{ path: "/", name: "Home" }],
  auth: { type: "custom", adapter: "./lighthouse/auth/custom.ts" },
},
```

## Env var conventions

Keep credentials out of source. Pull them from `dsmonitor/.env.local`:

```
LIGHTHOUSE_BASE_URL=https://dev.example.com
LIGHTHOUSE_TEST_ID=qa@example.com
LIGHTHOUSE_TEST_PW=********
LIGHTHOUSE_JWT_TOKEN=eyJhbGciOi...
LIGHTHOUSE_OAUTH_CLIENT_ID=...
LIGHTHOUSE_OAUTH_CLIENT_SECRET=...
```

Always add `.env.local` to `.gitignore`.

## Validate the setup

```bash
npx dsmonitor doctor
```

`doctor` reports a missing `lighthouse.auth.adapter` path as an error and missing `LIGHTHOUSE_*` env vars as warnings.

## Converting TypeScript samples to JavaScript

The examples are TypeScript. To use them as `.js`:

1. Remove all `import type { ... }` lines.
2. Drop function-parameter type annotations.
3. Strip `as` / `satisfies` / generic parameters.
4. Replace `export default adapter;` with `module.exports = adapter;` (keep `adapter.getMetadata = ...` as is).
