# MK2 Policy Hierarchy / Privacy Gate

## What changed

1. **PII-first gate (authentication before personal-data tools)**
   - `order_change`, `shipping_inquiry`, `refund_request`에서 아래 툴이 실행되기 전 OTP 인증을 먼저 요구합니다.
   - 대상 툴: `find_customer_by_phone`, `list_orders`, `lookup_order`, `track_shipment`, `update_order_shipping_address`
   - FAQ/재입고 등 개인정보 비관련 흐름은 기존처럼 인증 없이 동작합니다.

2. **Auto-confirm 제거**
   - `policyContext.user.confirmed`를 기본 `true`로 두던 동작을 제거했습니다.
   - 현재 턴에서 명시적으로 동의(예: `네`)했거나 OTP 검증이 성공한 경우에만 `confirmed=true`로 처리합니다.
   - `list_orders` 결과가 1건이어도 자동 확정하지 않고, 번호 선택(1~N) 흐름으로 유도합니다.

3. **정책 충돌 점검**
   - tool stage에서 `force_response_template`와 `force_tool_call`이 동시에 매칭되면
     `POLICY_CONFLICT_DETECTED` 이벤트를 기록합니다.
   - 충돌 시 해석 우선순위는 `force_response_template` 우선입니다.

## General hierarchy recommendation

운영 규칙은 아래 위계로 유지하는 것을 권장합니다.

1. **Security / Compliance (highest)**
   - 본인인증, 개인정보 접근 제한, 금칙 처리
2. **Business hard-constraints**
   - 필수 슬롯(주문번호/주소/우편번호), 상태별 허용/불가
3. **Tool orchestration**
   - 허용 툴/강제 호출/후속 조회
4. **Response shaping**
   - 템플릿, 출력 포맷

추가 권장사항:
- 같은 stage에서 `force_response_template`와 `force_tool_call`을 함께 쓰지 않도록 설계
- 불가피하게 함께 존재하면 우선순위 규칙을 고정하고 충돌 이벤트를 남겨 추적
