# Review Queue Burst 디버그 체크리스트

기준 로그 구간: 2026-02-04 05:38:28 ~ 05:39:39 (KST), 샘플 100건 기준

## 1) 화면별 트리거 맵 (현재 코드 기준)
- `/app/*` 공통: `AppSidebar`가 항상 mount되어 `/api/review-queue` 호출
  - mount 1회 (`src/components/AppSidebar.tsx`)
  - poll (`sidebar_poll_*`)
  - auth change (`onAuthStateChange`)
- `/app/*` 공통: `HelpPanel`이 항상 mount되어 2개 API를 함께 호출
  - `/api/review-queue`
  - `/api/user-profile`
  - 트리거: mount / poll / focus / auth change (`src/components/HelpPanel.tsx`)
- `/app` 대시보드: `DashboardPage`
  - `/api/review-queue`, `/api/sessions`, `/api/user-profile`
  - 트리거: mount / poll / auth change / 수동 새로고침 (`src/app/app/page.tsx`)
- `/app/review`: 페이지 진입 시 별도 `/api/review-queue?limit=200` 1회 (`src/app/app/review/page.tsx`)

## 2) Supabase 내부 증폭 포인트
- `/api/review-queue` 1회 -> 서버 내부에서 최소 2~3회 호출
  - `getServerContext()` -> `/auth/v1/user`
  - `getServerContext()` -> `A_iam_user_access_maps`
  - 실제 데이터 조회 -> `E_ops_review_queue_items`
  - 위치: `src/app/api/review-queue/route.ts`, `src/lib/serverAuth.ts`

## 3) 바로 확인할 재현 시나리오
1. 탭 1개, `/app/review` 진입 후 2분 대기
2. 같은 계정으로 탭 3개 동시 오픈 (`/app`, `/app/review`, `/app/calls`)
3. 각 탭에서 포커스 전환을 10초 간격으로 반복
4. 하드 리로드(`Ctrl+Shift+R`) 3회
5. 로그에서 `/auth/v1/user`와 `A_iam_user_access_maps`가 같은 초에 몰리는지 확인

## 4) 이번 반영(버스트 완화)
- `INITIAL_SESSION` auth 이벤트는 즉시 재호출에서 제외
- poll은 백그라운드 탭(`document.visibilityState !== "visible"`)에서 스킵
- 컴포넌트별 in-flight 가드로 중첩 요청 차단
- 성능 설정 bootstrap 시, 기존 local config와 동일하면 storage 이벤트 재발행하지 않음

변경 파일:
- `src/components/AppSidebar.tsx`
- `src/components/HelpPanel.tsx`
- `src/app/app/page.tsx`
- `src/components/AppShell.tsx`

## 5) 확인 지표
- 같은 초 `/auth/v1/user` 최대치(기준: 이전 피크 11/s)
- 같은 초 `A_iam_user_access_maps` 최대치(기준: 이전 피크 7/s)
- 탭 비가시 상태에서 호출 감소 여부
- 로그인 직후(초기 세션) 중복 호출 감소 여부
