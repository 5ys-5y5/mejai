# Runtime Guide (`src/app/api/runtime`)

목적: 이 문서는 `src/app/api/runtime` 하위의 **현재 구현 코드 전체**를 한 페이지에서 빠르게 점검하기 위한 가이드입니다.  
형식: `파일 경로` + **정의된 기능 이름** + 간략 설명.

---

## 1) 전체 흐름(요약)

1. `chat/route.ts`  
2. `chat/runtime/runtimeOrchestrator.ts` (실행 오케스트레이터)  
3. `chat/presentation/*` (응답 UI 표현 포맷팅)  
4. `chat/runtime/*`, `chat/handlers/*`, `chat/services/*`, `chat/policies/*`, `chat/shared/*` 조합 실행

보조:
- `chat/runtime/runtimeEngine.ts`: 하위 호환 shim (`runtimeOrchestrator` 재-export)
- `restock/dispatch/route.ts`: 재입고 알림 배치 엔드포인트

---

## 2) Chat 엔트리/오케스트레이션

- `chat/route.ts` — **Route Entry**: `POST`를 `runtime/runtimeOrchestrator`로 전달
- `chat/runtime/runtimeOrchestrator.ts` — **Runtime Chat Orchestrator**: 단계 모듈 호출/상태 동기화/최종 응답
- `chat/runtime/runtimeEngine.ts` — **Backward Compatibility Shim**: `runtimeOrchestrator` 재-export

---

## 3) Presentation(UI 표현 계층)

- `chat/presentation/ui-responseDecorators.ts` — **UI Response Decorators**
  - `deriveQuickRepliesWithTrace`: 메시지 fallback quick reply 파생 + source/criteria 추적
  - `deriveQuickReplies`: legacy 호환용 quick reply 파생 래퍼
  - `deriveRichMessageHtml`: 선택형 안내 텍스트를 rich HTML(표 형식 포함)로 변환
- `chat/presentation/ui-runtimeResponseRuntime.ts` — **Runtime Responder**
  - `createRuntimeResponder`: 응답 JSON 구성, `rich_message_html/quick_replies/response_schema` 주입, `QUICK_REPLY_RULE_DECISION` 이벤트 기록
  - 우선순위: `payload.quick_replies` > `payload.quick_reply_config` 기반 파생 > 메시지 텍스트 fallback 파생
- `chat/presentation/runtimeResponseSchema.ts` — **Response Schema Contract**
  - `RuntimeResponseSchema`/`RuntimeResponderPayload` 타입 및 `validateRuntimeResponseSchema`

---

## 4) Runtime 단계 모듈

- `chat/runtime/runtimeBootstrap.ts` — **Bootstrap Stage**
  - 인증/요청 파싱/에이전트·KB·정책·허용 tool·세션 초기 구성
- `chat/runtime/runtimeInitializationRuntime.ts` — **Initialization Stage**
  - 이전 턴 기반 seed(의도/슬롯) 계산, `RuntimePipelineState` 초기화
- `chat/runtime/intentDisambiguationRuntime.ts` — **Intent Disambiguation Stage**
  - 복수 의도 후보 선택/확정 플로우
- `chat/runtime/preTurnGuardRuntime.ts` — **Pre-turn Guard Stage**
  - 선행 확인(번호 재사용/종료/예외 입력 등) 분기
- `chat/runtime/slotDerivationRuntime.ts` — **Slot Derivation Stage**
  - 입력 기반 주문번호/전화/주소/우편번호 파생
- `chat/runtime/pendingStateRuntime.ts` — **Pending State Stage**
  - 주문변경/환불 pending 상태 분기
- `chat/runtime/restockPendingRuntime.ts` — **Restock Pending Stage**
  - 재입고 신청 stage 상태머신 분기
- `chat/runtime/postActionRuntime.ts` — **Post-action Stage**
  - 상담 종료 후 만족도/후속 선택 처리
- `chat/runtime/contextResolutionRuntime.ts` — **Context Resolution Stage**
  - 의도/오염방지/정책 평가 컨텍스트 구성
- `chat/runtime/runtimeInputStageRuntime.ts` — **Input Policy Stage**
  - input 단계 의도 보정/충돌 이벤트/slot 추출 이벤트/forced input 처리
- `chat/runtime/otpRuntime.ts` — **OTP Stage**
  - OTP 선행 가드/수명주기 처리
- `chat/runtime/toolStagePipelineRuntime.ts` — **Tool Pipeline Stage**
  - tool gate 평가 → forced/filter → 실행 → post-tool 결정론 분기
- `chat/runtime/postToolRuntime.ts` — **Post-tool Deterministic Stage**
  - 주문선택/조회가드/후속 deterministic 응답
- `chat/runtime/finalizeRuntime.ts` — **Finalize Stage**
  - 최종 LLM 메시지 구성/가드/최종 응답
- `chat/runtime/errorRuntime.ts` — **Error Stage**
  - 예외 fallback 응답/로그 처리

### Runtime 지원/계약
- `chat/runtime/runtimePipelineState.ts` — **Pipeline State Contract**
  - 런타임 공유 상태 타입/초기화
- `chat/runtime/runtimeStepContracts.ts` — **Step I/O Contracts**
  - 단계 입출력 타입 계약
- `chat/runtime/runtimeSupport.ts` — **Runtime Utilities**
  - debug prefix/timing/실패 payload/template id 등 공통 유틸 (`execution.call_chain` 포함)
- `chat/runtime/runtimeTurnIo.ts` — **Turn IO Utilities**
  - `makeReplyWithDebug`/`insertTurnWithDebug`
- `chat/runtime/runtimeConversationIoRuntime.ts` — **Conversation IO Factory**
  - `makeReply`/`insertTurn` 런타임 래퍼 생성
- `chat/runtime/runtimeMcpOpsRuntime.ts` — **MCP Ops Factory**
  - `noteMcp`/`noteMcpSkip`/`flushMcpSkipLogs` 생성
- `chat/runtime/sessionRuntime.ts` — **Session Runtime**
  - 세션 생성/재사용/최근 턴 복원
- `chat/runtime/intentRuntime.ts` — **Intent Runtime Helpers**
  - expected input/재입고 stage 판별
- `chat/runtime/toolRuntime.ts` — **Tool Runtime Helpers**
  - tool 정책 필터/실행 유틸/감사 이벤트 유틸
- `chat/runtime/quickReplyConfigRuntime.ts` — **Quick Reply Rule Resolver**
  - `resolveQuickReplyConfig`/`resolveSingleChoiceQuickReplyConfig`/`maybeBuildYesNoQuickReplyRule`
- `chat/runtime/promptTemplateRuntime.ts` — **Prompt Template Resolver**
  - `resolveRuntimeTemplate`/`buildYesNoConfirmationPrompt` (bot_context/entity override 지원)
  - `resolveRuntimeTemplateOverridesFromPolicy`/`mergeRuntimeTemplateOverrides` (compiled policy template 자동 매핑)
  - `buildRestockLeadDaysPrompt` (리드데이 안내 문구 템플릿화)

---

## 5) Handlers (의도별 대형 분기)

- `chat/handlers/restockHandler.ts` — **Restock Intent Handler**
  - 재입고 문의/신청/상품 선택/알림 신청 분기
- `chat/handlers/orderChangeHandler.ts` — **Order Change Handler**
  - 주소 변경 확정/후처리 분기
- `chat/handlers/refundHandler.ts` — **Refund Handler**
  - 환불/취소 접수 분기

---

## 6) Services (외부/DB 접근)

- `chat/services/dataAccess.ts` — **Data Access Service**
  - agent/kb/admin_kb/session/recent_turns/product decision 조회/생성
- `chat/services/mcpRuntime.ts` — **MCP Runtime Service**
  - MCP tool 호출/주소검색 호출 + 감사성 처리
- `chat/services/auditRuntime.ts` — **Audit Service**
  - 이벤트/턴/debug spec 저장

---

## 7) Policies (규칙/정책)

- `chat/policies/principles.ts` — **Chat Principles**
  - OTP 필수 규칙/유일·선택형 응답 원칙
- `chat/policies/intentSlotPolicy.ts` — **Intent & Slot Policy**
  - 의도 분류/yes-no/선택 입력/재입고 선택 정책
- `chat/policies/restockResponsePolicy.ts` — **Restock Response Policy**
  - 재입고 항목 파싱/랭킹/응답 문구/엔티티 추출

---

## 8) Shared (공용 타입/유틸)

- `chat/shared/slotUtils.ts` — **Slot Utility Library**
  - 주문번호/전화/OTP/주소/우편번호 추출·정규화
- `chat/shared/types.ts` — **Shared Type Definitions**
  - Agent/KB/ProductDecision 등 공용 타입

---

## 9) Restock 배치 엔드포인트

- `restock/dispatch/route.ts` — **Restock Dispatch Worker Endpoint**
  - 재입고 예약 대상 조회 후 발송 작업 수행

---

## 10) 빠른 점검 체크(누락/이상 구현 확인용)

- 엔트리 경로가 `route -> runtimeOrchestrator`인지
- `presentation/*`만 UI 표현(quick reply/rich html) 결정하는지
- `runtimeOrchestrator`가 단계 호출/상태 동기화 위주인지
- 의도별 대형 분기가 `handlers/*`에 위임되어 있는지
- DB/MCP/감사 저장이 `services/*`에만 모여 있는지
- 정책성 로직이 `policies/*`에 모여 있는지
- `npm run validate:runtime:quick-reply`가 통과하는지(quick reply 설정 누락/yes-no 확인 누락 방지)
- `npm run validate:runtime:prompt-templates`가 통과하는지(금지된 yes/no 하드코딩 문구 사용 방지)
- `npm run validate:runtime:template-keys`가 통과하는지(template 기본키/매핑키 불일치 방지)
- `npm run validate:runtime:response-schema`가 통과하는지(response schema 주입/검증 경로 누락 방지)
- Laboratory `대화 복사`에서 `[TOKEN_UNUSED]`에 `RESPONSE_SCHEMA`/`RESPONSE_SCHEMA_ISSUES`가 출력되는지 확인
- 대화 복사/문제 로그 복사 정책은 `src/lib/transcriptCopyPolicy.ts`에서 페이지별로 관리 (`/`, `/app/laboratory`)
  - 페이지/버튼별 허용(`enabled`)과 사유(`disabledReason`)를 설정
  - 페이지별 디버그 출력 항목(`debugOptions`: 대원칙/스키마/렌더플랜/로그 등) 제어
