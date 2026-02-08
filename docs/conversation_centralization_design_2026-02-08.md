# Conversation Centralization Design (Baseline: `/app/laboratory`)

## 0) Problem Statement

현재 대화 기능은 동작은 맞지만, 코드가 페이지/레이어별로 분산되어 있어 변경 전파 리스크가 큼.

- `src/app/app/laboratory/page.tsx`: `137,980` bytes / `2,864` lines
- `src/components/landing/hero.tsx`: `19,807` bytes / `459` lines
- `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`: `35,990` bytes / `1,001` lines
- `src/lib/debugTranscript.ts`: `30,471` bytes / `690` lines

핵심 문제:

1. 동일 대화 기능이 페이지마다 부분적으로 재구현됨
2. 응답 파싱/렌더/디버그 수집이 UI 컴포넌트에 섞여 있음
3. 디버그 변경이 특정 페이지에만 반영될 위험 존재

---

## 1) Centralization Goal

`/app/laboratory`를 표준(reference)으로 삼아, 아래를 단일 계약(contract)으로 운영한다.

1. 답변 방식: `src/app/api/runtime/**`
2. 렌더 방식: `src/app/api/runtime/chat/policies/renderPolicy.ts` 중심
3. 디버그 방식: `src/lib/debugTranscript.ts`, `src/lib/transcriptCopyPolicy.ts`, `src/lib/runtimeResponseTranscript.ts`
4. 향후 확장(추가 페이지/모드)도 동일 계약 위에서만 개발

최종 목표:

- 페이지는 대화 도메인 코드를 직접 구현하지 않고 **초박형 어댑터**만 유지
- 변경은 중앙 모듈(런타임/렌더 정책/디버그 정책)에서 1회 수행
- 어떤 페이지든 같은 입력이면 같은 대화/렌더/디버그 산출

---

## 2) Target Architecture

## 2.1 Server Runtime (Single Source of Truth)

- 유지: `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`
- 원칙:
  - 오케스트레이터는 단계 조합만 담당
  - 규칙/판단은 `policies/*`
  - 외부 연동/DB는 `services/*`
  - UI 힌트/표현 규칙은 `presentation/*`

`renderPolicy.ts`는 렌더 계약의 단일 진입점으로 취급:

- quick reply/card/view/multi-select 결정 로직은 여기로 집중
- 페이지는 `response_schema`/`render_plan`을 그대로 소비만 함

## 2.2 Client Conversation Core (New)

신규 중앙 레이어:

- `src/lib/conversation/client/` (제안)

구성:

1. `contracts.ts`
   - 공용 타입(메시지, 턴, 로그 번들, copy context)
2. `runtimeClient.ts`
   - `/api/laboratory/run`, `/api/laboratory/logs` 호출 래핑
3. `responseMapper.ts`
   - `runtimeResponseTranscript` 성격(응답 -> UI/디버그 공용 필드)
4. `conversationStore.ts` (reducer)
   - 메시지/세션/선택/로그 상태 전이
5. `copyPolicyAdapter.ts`
   - `transcriptCopyPolicy` + `debugTranscript` 결합 지점
6. `useConversationController.ts`
   - 페이지에서 사용하는 단일 훅

## 2.3 Debug/Copy Layer

- `debugTranscript.ts`: 포맷터 전용
- `transcriptCopyPolicy.ts`: 페이지별 정책 전용
- `runtimeResponseTranscript.ts`: 응답 파싱 전용

이 3개는 유지하되, 호출 지점은 `useConversationController`로 단일화.

---

## 3) Page API (3-Line Objective)

페이지 목표 인터페이스:

```ts
const convo = useConversationController({ page: "/app/laboratory" });
const ui = convo.bindUI(); // messages, sending, handlers
return <ConversationScreen {...ui} />;
```

핵심:

- 페이지는 `page key`와 화면 배치만 제공
- 전송/응답 매핑/로그 수집/복사/디버그는 중앙 컨트롤러가 수행

---

## 4) What To Centralize First (from Laboratory Baseline)

Priority A (즉시):

1. 응답 파싱 중복 제거
   - 현 상태: `laboratory/page.tsx`, `landing/hero.tsx` 각각 파싱 코드 존재
   - 목표: `runtimeResponseTranscript.ts` + `responseMapper.ts` 단일화

2. 복사/로그 수집 흐름 통합
   - 현 상태: 페이지별 `copy`/`load logs` 코드 잔존
   - 목표: `useConversationController` 내부로 이동

3. UI 상태 전이 통합
   - 현 상태: 페이지에서 loading/bot message 교체 로직 직접 구현
   - 목표: reducer 액션(`SEND_START`, `SEND_SUCCESS`, `SEND_FAIL`, `LOGS_LOADED`)

Priority B:

4. `/app/laboratory` 대형 컴포넌트 분해
   - `LaboratoryShell` (레이아웃)
   - `ConversationPanel` (순수 렌더)
   - `useConversationController` (행동)

5. `/` 페이지를 동일 컨트롤러 기반으로 치환

Priority C:

6. 통합 테스트(계약 테스트) 도입
   - 동일 입력에 대해 `/`와 `/app/laboratory` copy transcript가 동일 구조인지 검증

---

## 5) Concrete Migration Plan

## Phase 1: Contracts + Controller Skeleton

- 추가:
  - `src/lib/conversation/client/contracts.ts`
  - `src/lib/conversation/client/conversationStore.ts`
  - `src/lib/conversation/client/useConversationController.ts`
- 기존 `useTranscriptCopy`/`runtimeResponseTranscript`를 컨트롤러 내부 의존성으로 이동

완료 기준:

- `/` 페이지에서 `handleSubmit`, `handleCopy*`, `loadTurnLogs` 제거
- 페이지에는 `convo.send`, `convo.copyConversation`, `convo.copyIssue` 호출만 남음

## Phase 2: Laboratory Adapterization

- `src/app/app/laboratory/page.tsx`:
  - 메시지 상태/응답 파싱/복사 핸들러 제거
  - 컨트롤러 state/actions 바인딩으로 교체

완료 기준:

- 대화 관련 비즈니스 로직 라인 수 60% 이상 감소
- 실험실은 레이아웃 + 컴포넌트 조합 중심 파일로 축소

## Phase 3: Shared ConversationView

- `src/components/conversation/ConversationView.tsx` (신규)
- `/`와 `/app/laboratory`는 동일 View를 props로만 차별화

완료 기준:

- "대화 버블/선택/복사 버튼" 렌더 중복 제거

## Phase 4: Runtime/Render Contract Lock

- `renderPolicy.ts` 산출물(JSON shape) 스냅샷 테스트 추가
- `runtimeResponseTranscript` 매핑 테스트 추가
- `debugTranscript` + `transcriptCopyPolicy` 조합 테스트 추가

완료 기준:

- 특정 페이지 누락 반영 회귀를 CI에서 차단

---

## 6) Guardrails (필수 운영 규칙)

1. 페이지에서 금지:
   - runtime 응답 세부 파싱
   - 로그 API 직접 호출
   - transcript 문자열 직접 생성

2. 허용:
   - `useConversationController({ page })` 호출
   - 레이아웃/스타일/페이지별 배치

3. 신규 페이지 추가시:
   - `transcriptCopyPolicy.ts`에 page key 추가
   - 컨트롤러 호출만으로 대화 기능 사용

---

## 7) Acceptance Criteria

1. 동일 대화 입력에 대해 `/`와 `/app/laboratory`의 transcript 구조가 정책 차이 외 동일
2. 대화 정책/디버그 정책 변경 시 페이지 코드 수정 없이 반영
3. 페이지 파일에서 대화 비즈니스 로직이 최소화(핸들러 위임)
4. 계약 테스트로 회귀 자동 검출

---

## 8) Proposed Next Implementation Chunk

다음 작업 단위(권장):

1. `useConversationController` 신설
2. `hero.tsx`를 컨트롤러 기반으로 전환 (가장 작은 범위)
3. 이후 `laboratory/page.tsx` 동일 전환

이 순서가 리스크가 가장 낮고, 페이지 3줄화 목표에 가장 빠르게 접근함.

