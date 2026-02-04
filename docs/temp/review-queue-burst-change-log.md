# Review Queue Burst 변경 기록 (상세)

작성일: 2026-02-04
대상 이슈: `/auth/v1/user`, `A_iam_user_access_maps`, `E_ops_review_queue_items`의 단시간 burst
관련 로그 샘플 시간대: 2026-02-04 05:38:28 ~ 05:39:39 (KST)

## 1) 문제 정의
프론트 1회 호출이 서버 내부에서 2~3회 Supabase 호출로 증폭되며, 아래 트리거가 겹칠 때 1초 단위 burst 발생.

- 다중 탭/창
- mount 직후 즉시 호출
- 폴링 타이머 동시 발화
- auth 상태 이벤트 동시 발화
- focus 복귀 시 즉시 호출

## 2) 변경 범위
- `src/components/AppSidebar.tsx`
- `src/components/HelpPanel.tsx`
- `src/app/app/page.tsx`
- `src/components/AppShell.tsx`
- 체크리스트 문서: `docs/temp/review-queue-burst-debug-checklist.md`

## 3) 파일별 상세 변경

### A. `src/components/AppSidebar.tsx`

#### A-1. 요청 중복 방지(in-flight)
- 위치: `src/components/AppSidebar.tsx:99-113`
- 변경: `let inFlight = false` 도입 후 요청 수행 중 재진입 차단
- 효과: auth/poll/mount 트리거가 겹쳐도 동일 시점 중복 호출 1회로 제한

#### A-2. 백그라운드 탭 폴링 차단
- 위치: `src/components/AppSidebar.tsx:100-103`
- 변경: `reason === "poll" && document.visibilityState !== "visible"`이면 skip
- 효과: 비가시 탭의 불필요한 폴링 제거

#### A-3. 초기 세션 이벤트 제외
- 위치: `src/components/AppSidebar.tsx:121-125`
- 변경: `event === "INITIAL_SESSION"`이면 즉시 재호출하지 않음
- 효과: mount 직후 + initial auth 이벤트의 중복 호출 제거

#### A-4. 호출 사유(reason) 명시
- 위치: `src/components/AppSidebar.tsx:100, 115-118, 124`
- 변경: `loadCount("mount" | "poll" | "auth")`
- 효과: 추후 디버깅/계측 시 트리거 구분 용이

### B. `src/components/HelpPanel.tsx`

#### B-1. refresh 경로 단일화 + 병렬 처리
- 위치: `src/components/HelpPanel.tsx:103-113`
- 변경: `refresh(reason)` 내부에서 `Promise.all([loadProfile(), loadReviewQueue()])`
- 효과: 동일 타이밍 중복 refresh를 1회로 수렴

#### B-2. 요청 중복 방지(in-flight)
- 위치: `src/components/HelpPanel.tsx:76, 107-113`
- 변경: refresh 재진입 차단
- 효과: focus/auth/poll 동시 발화 시 중복 호출 완화

#### B-3. 백그라운드 탭 폴링 차단
- 위치: `src/components/HelpPanel.tsx:104-106`
- 변경: 비가시 탭의 poll refresh skip

#### B-4. 초기 세션 이벤트 제외
- 위치: `src/components/HelpPanel.tsx:133-136`
- 변경: `INITIAL_SESSION` ignore

#### B-5. 설정값 반영 범위 명확화
- 위치: `src/components/HelpPanel.tsx:37-39, 91, 121-123, 147-153`
- 변경: poll 주기/limit/focus toggle/auth toggle을 config 기반으로 일관 반영

### C. `src/app/app/page.tsx` (Dashboard)

#### C-1. loadData 재진입 차단
- 위치: `src/app/app/page.tsx:74, 80-81`
- 변경: `loadInFlightRef` 추가
- 효과: poll/auth/manual 겹침 시 중복 fetch 방지

#### C-2. 백그라운드 탭 폴링 차단
- 위치: `src/app/app/page.tsx:76-79`
- 변경: poll reason + 비가시 탭 skip

#### C-3. 초기 세션 이벤트 제외
- 위치: `src/app/app/page.tsx:180-184`
- 변경: auth 이벤트에서 `INITIAL_SESSION`은 무시

#### C-4. 호출 경로 분리
- 위치:
  - mount: `src/app/app/page.tsx:173-175`
  - auth: `src/app/app/page.tsx:182-183`
  - poll: `src/app/app/page.tsx:192-194`
  - manual: `src/app/app/page.tsx:209, 288`
- 변경: `loadData(reason)`로 통일
- 효과: 추적성과 유지보수성 향상

### D. `src/components/AppShell.tsx`

#### D-1. 설정 bootstrap 중복 이벤트 억제
- 위치: `src/components/AppShell.tsx:63-67`
- 변경: 기존 local config와 서버 config가 동일하면 `writePerformanceConfigToStorage` 생략
- 효과: 불필요한 storage update 이벤트 발행 감소

## 4) 기대 효과

### 4-1. 같은 초 burst 완화
- 기존: mount/auth/focus/poll가 겹치면 동일 컴포넌트에서 다중 동시 호출 가능
- 변경 후: 컴포넌트별로 동시 호출 1개로 제한

### 4-2. 백그라운드 탭 트래픽 절감
- 기존: 탭이 숨김 상태여도 poll 지속
- 변경 후: 숨김 탭 poll skip

### 4-3. 초기 로그인 직후 중복 호출 완화
- 기존: mount 호출 + `INITIAL_SESSION` 호출 중첩 가능
- 변경 후: `INITIAL_SESSION` 경로 차단

## 5) 검증 결과

### 5-1. 부분 lint 확인
- 명령: `npx eslint src/components/AppSidebar.tsx src/components/HelpPanel.tsx src/app/app/page.tsx`
- 결과: error 없음 (warning 3건은 기존 코드의 미사용 변수)

### 5-2. 전체 lint/tsc 상태
- `npm run lint`, `npx tsc --noEmit`는 리포 전체의 기존 선행 이슈로 실패
- 이번 변경 파일 직접 원인으로 인한 신규 컴파일 에러는 확인되지 않음

## 6) 남은 리스크/추가 제안

### 6-1. 다중 탭 자체 증폭은 구조적으로 남아있음
- 현재 완화는 "탭 내 중복" 중심
- 탭 3개면 여전히 최소 3배 호출 가능
- 제안: BroadcastChannel 기반 리더-탭 1개만 poll 수행

### 6-2. 서버측 컨텍스트 조회 중복
- `/api/review-queue` 호출마다 `getServerContext()` 실행
- 제안: 짧은 TTL(예: 5~15초) org context 캐시 도입 검토

### 6-3. focus 이벤트 정책
- 현재 toggle 가능하지만 기본 on이면 사용자 전환이 잦은 환경에서 spike 가능
- 제안: focus refresh에 디바운스(예: 1~3초) 적용

## 7) 추적 지표(전/후 비교 권장)
- 초당 `/auth/v1/user` 최대값
- 초당 `A_iam_user_access_maps` 최대값
- 비가시 탭 상태에서 poll 요청 건수
- 로그인 직후 10초 내 `/api/review-queue` 호출 횟수

## 8) 참고 문서
- 디버그 체크리스트: `docs/temp/review-queue-burst-debug-checklist.md`
