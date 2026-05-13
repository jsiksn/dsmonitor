# dsmonitor 환경 변수 — 본 파일은 `dsmonitor init` 안 자동 생성됨 (0.4.0).
# 사용 시: 본 파일을 dsmonitor/.env.local 로 cp 후 실제 값 입력.
# dsmonitor/.env.local 자체는 .gitignore 안 추가 권고 (민감 정보).

# ────── Figma (figmaAnalysis = true 시점에만) ──────
{{FIGMA_ENV_BLOCK}}

# ────── Lighthouse (lighthouse 측정 활용 시점에만) ──────
# 인증 방식별 환경변수 = dsmonitor.config.ts 안 lighthouse.auth.type 일관:
#   - none   = BASE_URL 만 (인증 없는 공개 사이트)
#   - basic  = BASE_URL + LOGIN_URL + TEST_ID + TEST_PW (dsmonitor 내장 어댑터)
#   - custom = 사용자 어댑터 자유 변수 (예: TEST_ID / TEST_PW / SESSION_COOKIE 등)
{{LIGHTHOUSE_ENV_BLOCK}}
