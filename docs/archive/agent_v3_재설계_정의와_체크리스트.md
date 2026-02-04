# Agent V3 재설계: 정의와 체크리스트

## 1) 왜 기존 방식이 한계에 부딪혔는가

기존 구현의 핵심 문제는 아래 4가지가 겹치면서 발생한다.

1. **대화 생성(LLM)** 과 **업무 실행(MCP)** 이 동일 파이프라인에서 강하게 결합됨  
   - 템플릿 강제/정책 충돌 시, 이미 충분한 정보가 있어도 실행이 막히거나 흐름이 역행한다.
2. **의도 판정** 이 단발성으로 동작하고, 상태 전이(본인확인/주문특정/변경확정)가 분리되지 않음  
   - 자연어는 유연한데 실행은 결정적이어야 한다는 원칙이 흐려진다.
3. **실행 전 필수 확인 정보** 가 단계적으로 보장되지 않음  
   - `누구 주문인지`, `어떤 주문인지`, `무엇을 어떻게 바꿀지` 확인 없이 진행될 수 있다.
4. **로그는 많지만, 단계 정의가 불명확**  
   - 실패 직전/직후를 추적할 수 있으나, 상태 모델이 약해 원인 축소(5->2->1)가 느리다.

---

## 2) V3의 정의 (핵심 원칙)

V3는 "파이프라인 우선"이 아니라 **상태 기반 오케스트레이션** 우선으로 동작한다.

- LLM: 자연어 이해/응답 생성 담당 (제안자)
- 상태기계(FSM): 필수 정보 충족 여부 판단 및 다음 액션 결정 (결정자)
- MCP 실행기: 실제 도구 호출/재시도/오류 표준화 (실행자)

즉, "**자연스러운 대화**"와 "**안전한 실행**"을 분리한다.

---

## 3) 주문 변경(order_change) 최소 필수 상태

### 상태
- `await_identity` : 본인확인 필요(휴대폰 + OTP)
- `await_order_selection` : 주문 특정 필요(자동선택 가능하나 교차검증 필수)
- `await_target_address` : 변경할 주소 입력 필요
- `await_update_confirm` : 변경 전/후 최종 확인(네/아니오)
- `execute_update` : `update_order_shipping_address` 실행
- `done` : 최종 완료

### 실행 전 필수 조건
1. 인증 완료(`customer_verification_token`)
2. 주문 특정(`order_id`)
3. 변경할 값 명확화(`address1/address2/zipcode` 또는 검증된 변환값)
4. 최종 사용자 확인(`yes`)

---

## 4) "자연스럽고 올바른" 대화 템플릿(요지)

1. 사용자가 "배송지 바꿔줘"라고 말하면:  
   - 바로 실행하지 않고, 본인확인/주문특정/변경안 확인 순서로 최소 질문
2. OTP 완료 후:
   - 주문 1건이라도 자동 선택 전에 교차검증(인증번호의 휴대폰 vs 주문 수신자 휴대폰)
3. 변경 직전:
   - 반드시 아래 3가지를 1회에 제시하고 확인
   - 주문번호 / 현재 배송지 / 변경 배송지
4. 주소 검증 실패 시:
   - "존재하지 않는 주소"를 명시하고 재입력 요청
   - 기존 주소로 임의 보정하여 성공 처리하지 않음

---

## 5) 디버그 대원칙 적용 체크리스트

## MCP 체크
- [ ] `send_otp` 호출/결과 기록
- [ ] `verify_otp` 호출/결과 기록
- [ ] `list_orders` 호출/결과 기록
- [ ] `lookup_order` 호출/결과 기록
- [ ] `update_order_shipping_address` 호출/결과 기록
- [ ] (주소 검증 경유 시) `search_address` 호출/결과 기록

## Event 체크
- [ ] `SLOT_EXTRACTED` (derived/resolved/expected_input 포함)
- [ ] `PRE_MCP_DECISION` (intent, forced_calls, final_calls, entity 스냅샷)
- [ ] `POLICY_STATIC_CONFLICT` (충돌 규칙/해결 방식)
- [ ] `ORDER_CHOICES_PRESENTED` (선택지 + auto_selected 여부)
- [ ] `POLICY_DECISION` (stage/action/reason)
- [ ] `FINAL_ANSWER_READY` (최종 응답/모델)
- [ ] `MCP_CALL_SKIPPED` (스킵 이유/직전 맥락)

## Debug(prefix_json) 체크
- [ ] `MCP.last_function`, `MCP.last_status`, `MCP.last_error`
- [ ] `SLOT.expected_input`, `SLOT.order_id`, `SLOT.phone_masked`, `SLOT.address`
- [ ] `POLICY.input_rules`, `POLICY.tool_rules`
- [ ] `MCP.candidate_calls`, `MCP.skipped`

## 실패 지점 직전/직후 로그 체크
- [ ] 직전: `PRE_MCP_DECISION`/`POLICY_DECISION`
- [ ] 직후: `MCP_TOOL_FAILED` 또는 `MCP_CALL_SKIPPED`/`FINAL_ANSWER_READY`

---

## 6) Labolatory 운영 체크

- [ ] Legacy / MK2 / V3 라우트를 같은 질문으로 병렬 비교
- [ ] 동일 세션/질문에서 turn_id 기준 로그 번들 비교
- [ ] auto-selected 주문 처리 시 교차검증 로그 확인
- [ ] 주소 오타/유효하지 않은 주소 입력 시 재확인 유도 여부 확인

---

## 7) 이번 변경 범위(요약)

- V3 라우트를 별도 엔드포인트로 노출 (`/api/runtime/chat_v3`)
- Labolatory에서 Route 선택에 V3 추가
- V3는 현재 `natural` 모드 기반으로 실행하며, 구버전/신버전 비교 실험이 가능

---

## 8) 사용자 질문 1 답변: "요청마다 코드를 하나씩 써야 하나?"

### 결론
- **아니오.** 기능별 하드코딩을 늘리는 방식은 유지보수/확장성 모두 한계가 있다.
- 목표 구조는 "자연어 -> 상태 전이 -> 도구 계획 -> 실행/복구"를 공통 엔진으로 만들고, 도메인별 지식은 **정책/플러그인**으로 분리하는 것이다.

### 권장 구조 (코드 추가 최소화)
1. **공통 오케스트레이터(V3)**  
   - intent/slot/state를 공통으로 관리
   - 필수 확인 항목(본인확인, 주문특정, 변경 확정)을 상태로 강제
2. **Capability Pack(도메인 플러그인)**  
   - `order_change`, `refund_cancel`, `shipping_inquiry`, `restock` 등
   - 각 Pack은 `필수 슬롯`, `허용 MCP`, `실패 복구 규칙`, `확인 질문 템플릿`만 선언
3. **MCP 실행기 표준화**  
   - 호출/재시도/에러 분류/감사로그를 공통 처리
   - `NO_API_FOUND`, `INVALID_ARG`, `AUTH_REQUIRED` 등 오류 코드를 공통 분기
4. **정책(KB) = 선언형 룰**  
   - "어떤 경우에 무엇을 묻고/막고/허용"을 규칙으로 관리
   - 코드 수정 없이 룰 업데이트로 동작 변경

### refund 취소 실패의 본질
- 현재 로그상 실패 원인은 자연어 해석이 아니라 `create_ticket` 대상 API의 **404(No API found)** 이다.
- 즉 "대화가 부자연스러워서 실패"가 아니라 "실행 경로(도구/엔드포인트) 준비 미완료" 문제다.

### 체크리스트 (Q1)
- [ ] `refund_cancel` Capability Pack 정의 (`required_slots`, `tools`, `fallbacks`)
- [ ] MCP 오류 코드 분류표 확정 (`404`, `401`, `validation`, `timeout`)
- [ ] `create_ticket` 실패 시 대체 경로 정의(다른 MCP/내부 큐/상담 이관)
- [ ] `FINAL_ANSWER_READY`에 "실행 실패 원인 + 다음 액션" 필수 포함
- [ ] 동일 패턴을 주문변경/환불/재고에 공통 적용

---

## 9) 사용자 질문 2 답변: "V3 오케스트레이터 + MK2 도메인 에이전트 확장 가능?"

### 결론
- **가능하며 권장되는 방식**이다.
- V3를 상위 오케스트레이터로 두고, MK2/도메인 에이전트를 하위 실행 단위로 붙이면 확장성이 좋아진다.

### 권장 토폴로지
- **V3 Orchestrator**
  - 역할: 의도 라우팅, 상태 전이, 공통 검증, 실행 계획, 최종 응답 조립
- **Domain Agents (MK2 기반)**
  - 역할: 도메인별 슬롯 보정/도구 호출 시나리오(배송/환불/재고)
- **Tool Runtime**
  - 역할: MCP 호출, 감사 로그 기록, 재시도/에러 표준화

### 라우팅 예시
1. 사용자 입력 -> V3가 intent 후보 생성
2. V3가 `order_change`/`refund_cancel` 등 도메인 에이전트 선택
3. 도메인 에이전트가 tool plan 생성
4. Tool Runtime 실행 + 감사 로그 기록
5. V3가 결과를 사용자 응답으로 정리

### `chat_mk2/route.ts` 의존성 분리 가이드
- 현재 mk2 실행 경로는 `src/app/api/runtime/chat/core.ts`로 통합되었다.
- 제거해도 V3가 동작하려면:
  1) V3가 `chat_mk2` 경로가 아닌 `core.ts` 기반 런타임 엔드포인트를 직접 사용하거나,
  2) V3 전용 실행 엔진(`chat_v3` 내부 오케스트레이션)으로 독립해야 한다.
- 권장: **V3 내부에 오케스트레이션/실행을 자체 보유**하고, MK2는 도메인 모듈로 import해서 호출.

### 체크리스트 (Q2)
- [ ] V3 라우터에 `intent_router`/`state_store`/`tool_runtime` 모듈 분리
- [ ] MK2 로직을 "라우트 파일"이 아닌 "도메인 서비스"로 분리
- [ ] `chat_v3`가 `chat_mk2` URL에 의존하지 않도록 내부 호출 구조 변경
- [ ] 도메인 추가 시 라우트 수정 없이 Capability Pack 등록만으로 확장 가능하게 구성
- [ ] Labolatory에서 `legacy/mk2/v3` 비교 + turn_id 기준 이벤트 정합성 검증

---

## 10) 디버그 대원칙 준수 확인용 확장 체크리스트

### MCP
- [ ] `send_otp`, `verify_otp`, `lookup_order`, `list_orders`, `search_address`, `update_order_shipping_address`, `create_ticket` 전부 `F_audit_mcp_tools` 기록

### Event
- [ ] `FINAL_ANSWER_READY`, `PRE_MCP_DECISION`, `SLOT_EXTRACTED`, `POLICY_STATIC_CONFLICT`, `ORDER_CHOICES_PRESENTED`, `POLICY_DECISION`, `MCP_CALL_SKIPPED`, `MCP_TOOL_FAILED`, `CONTEXT_CONTAMINATION_DETECTED` 전부 `F_audit_events` 기록

### Debug
- [ ] `MCP.last_*` / `MCP.logs.*` / `SLOT.*` / `POLICY.*` / `MCP.candidate_calls` / `MCP.skipped`를 `F_audit_turn_specs`에 누락 없이 기록

### 실패 직전/직후
- [ ] 실패 직전: `PRE_MCP_DECISION` + `POLICY_DECISION`
- [ ] 실패 직후: `MCP_TOOL_FAILED` 또는 `MCP_CALL_SKIPPED` + `FINAL_ANSWER_READY`

---

## 11) 네이밍 정리 (목적 기반)

혼선을 줄이기 위해 라우트 표기를 아래처럼 목적 중심으로 통일한다.

- `legacy` : 기존 단일 파이프라인
- `mk2` (= `domain_agent`) : 배송/주문 실행 도메인 에이전트
- `v3` (= `orchestrator`) : 자연어 상태 전이 + 도구 계획/실행 오케스트레이터

체크리스트:
- [ ] 실험실(Route 설명/라벨)에서 목적 기반 이름으로 표시
- [ ] `labolatory/run` 라우트에서 `domain_agent`, `orchestrator` alias 허용
- [ ] 기존 `mk2`, `v3` 값도 하위호환 유지

---

## 12) 환불/취소를 "자연어 -> 상태 전이 -> 계획 -> 실행/복구"로 처리

### 상태 정의(환불/취소)
- `await_identity` : 본인 확인(OTP)
- `await_order_selection` : 주문 특정
- `await_refund_confirm` : 최종 접수 확인(네/아니오)
- `execute_refund_ticket` : `create_ticket` 실행
- `done` : 완료/실패 안내

### 핵심 규칙
1. 환불/취소 의도에서는 `create_ticket`를 즉시 실행하지 않는다.
2. 주문번호가 확보되면 먼저 "접수 진행 여부"를 확인한다.
3. 사용자가 `네`라고 답한 턴에서만 `create_ticket`를 호출한다.
4. 실패 시 "주문번호 다시 입력"으로 되돌리지 않고, 실제 오류코드와 다음 액션을 안내한다.

체크리스트:
- [ ] `await_refund_confirm` 상태 저장/복구
- [ ] 미확인 시 `create_ticket` 스킵 + `MCP_CALL_SKIPPED`(`DEFERRED_TO_REFUND_CONFIRM`)
- [ ] 확인 후 `create_ticket` 실행
- [ ] 성공 시 접수번호 포함 완료 응답
- [ ] 실패 시 `MCP_TOOL_FAILED` + 원인/복구 가이드 응답
