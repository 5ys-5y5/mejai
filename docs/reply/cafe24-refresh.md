# /api/cafe24/refresh 구현 정리

## 개요
- 엔드포인트: `GET /api/cafe24/refresh`
- 위치: `src/app/api/cafe24/refresh/route.ts`
- 목적: DB에 저장된 Cafe24 OAuth 토큰을 **전체(모든 auth_settings row)** 기준으로 갱신

## 인증/보호 방식
- 환경 변수 `CRON_SECRET`이 반드시 설정되어 있어야 함.
- 요청 헤더에서 다음 중 하나를 읽어 `CRON_SECRET`과 **정확히 일치**해야 통과:
  - `x-cron-secret`
  - `Authorization: Bearer <token>`
- 불일치 시 `401 UNAUTHORIZED`, 미설정 시 `500 CRON_SECRET_NOT_CONFIGURED`

## 데이터 소스
- Supabase Admin 클라이언트로 `auth_settings` 테이블 조회
  - 조회 컬럼: `id, org_id, user_id, providers`
- 각 row의 `providers.cafe24`에 저장된 OAuth 정보를 사용

## 동작 흐름
1. `CRON_SECRET` 검증
2. Supabase Admin 클라이언트 생성
3. `auth_settings` 전체 조회
4. 각 row에 대해 `providers.cafe24` 존재 여부 확인
5. 아래 필수 키 확인
   - `mall_id`
   - `refresh_token`
6. 위 조건 충족 시 `refreshCafe24Token(...)` 호출
7. 갱신 결과를 요약 집계 후 JSON 반환

## 실제 토큰 갱신 로직
- 함수 위치: `src/lib/cafe24Tokens.ts` → `refreshCafe24Token`
- Cafe24 OAuth 토큰 갱신 요청:
  - URL: `https://{mall_id}.cafe24api.com/api/v2/oauth/token`
  - Method: `POST`
  - Headers:
    - `Authorization: Basic base64(CAFE24_CLIENT_ID:CAFE24_CLIENT_SECRET_KEY)`
  - `Content-Type: application/x-www-form-urlencoded`
  - Body:
    - `grant_type=refresh_token&refresh_token=<refresh_token>`
- 응답에서 `access_token`, `refresh_token`, `expires_at` 읽어 갱신
- DB 업데이트:
  - `auth_settings.providers.cafe24.access_token`
  - `auth_settings.providers.cafe24.refresh_token`
  - `auth_settings.providers.cafe24.expires_at`
  - `auth_settings.updated_at` 갱신

## 사용되는 주요 키(중요)
### providers.cafe24 (DB 저장값)
- `mall_id` (필수)
- `refresh_token` (필수)
- `access_token` (갱신 결과로 업데이트)
- `expires_at` (갱신 결과로 업데이트)
- `scope`, `shop_no`, `board_no` (설정값)

### 환경 변수
- `CRON_SECRET` (필수, 엔드포인트 보호용)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase Admin client 초기화에 필요)
- `CAFE24_CLIENT_ID` (OAuth 클라이언트 ID)
- `CAFE24_CLIENT_SECRET_KEY` (OAuth 클라이언트 Secret)
- `CAFE24_REDIRECT_URI` (OAuth 콜백 URL)
- `CAFE24_OAUTH_STATE_SECRET` (OAuth state 서명용 시크릿)

## 응답 형식
- 성공 시 요약 JSON 반환:
  - `scanned`, `eligible`, `refreshed`, `skipped`, `failed`, `failures[]`
- `failures` 배열에는 최대 50건까지 `id`, `reason` 기록

## 클라이언트 측 호출 위치
- `src/app/app/settings/page.tsx`
  - `refreshCafe24ForMall()`에서 `/api/cafe24/refresh` 호출
  - 헤더: `Authorization: Bearer <supabase session access token>`
  - **주의:** 서버는 `CRON_SECRET`과 일치하는 값을 요구하므로, 이 호출은 실제 배포환경에서는
    `CRON_SECRET`을 Bearer 또는 `x-cron-secret`으로 보내야 성공함.
  - `OAuth 연결` 버튼에서 `/api/cafe24/authorize?mode=json&mall_id=...&scope=...` 호출
    - Authorization 헤더로 세션 토큰 전달
    - 응답으로 받은 `url`로 브라우저 이동
    - 콜백(`/api/cafe24/callback`)에서 access/refresh 토큰을 저장하고 shop_no 조회 준비

## 관련 파일
- `src/app/api/cafe24/refresh/route.ts`
- `src/app/api/cafe24/authorize/route.ts`
- `src/app/api/cafe24/callback/route.ts`
- `src/lib/cafe24Tokens.ts`
- `src/app/app/settings/page.tsx`

