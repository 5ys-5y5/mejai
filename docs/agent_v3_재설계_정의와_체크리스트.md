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

- V3 라우트를 별도 엔드포인트로 노출 (`/api/playground/chat_v3`)
- Labolatory에서 Route 선택에 V3 추가
- V3는 현재 `natural` 모드 기반으로 실행하며, 구버전/신버전 비교 실험이 가능

