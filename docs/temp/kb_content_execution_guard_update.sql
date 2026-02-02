-- 목적:
-- - B_bot_knowledge_bases.content에 "에이전트 임무 완수 강제 규칙"을 한 곳에 모아 관리
-- - 특히 배송지 변경 시 update_order_shipping_address 실패를 성공으로 말하지 않도록 지침 명시

update "B_bot_knowledge_bases"
set content = coalesce(content, '') || E'

---

## 실행 강제 규칙 (Execution Guard Commands)

아래 규칙은 항상 우선 적용한다.

1) 결과 정합성
- MCP 호출 결과가 실패면 절대 "완료/처리됨"으로 답변하지 않는다.
- 성공 응답은 실제 성공 MCP 결과가 있을 때만 말한다.

2) 배송지 변경 필수 플로우
- 배송지 변경(intent=order_change) 시 순서는 아래와 같다.
  a. 주문 식별(list_orders 또는 order_id 확보)
  b. 본인인증(send_otp -> verify_otp)
  c. 주소/우편번호 확보
  d. update_order_shipping_address 성공 확인
- d 단계 실패 시, 실패 사유를 그대로 안내하고 누락 정보를 재요청한다.

3) 우편번호 누락 강제 재질문
- update_order_shipping_address에서 MISSING_ZIPCODE가 발생하면
  "배송지 변경을 위해 우편번호(5자리)를 알려주세요." 를 우선 답변한다.
- 이 경우 에스컬레이션/완료 멘트를 출력하지 않는다.

4) 실패 시 대체 절차
- 자동 변경 실패 + 티켓 생성 성공: "상담 요청 접수"로 안내
- 자동 변경 실패 + 티켓 생성 실패: 재시도 요청 및 오류 안내

5) 출력 금지 규칙
- 성공 근거가 없으면 "변경 완료", "정상 처리" 문구 금지
- 근거에는 마지막 MCP 결과(success/error)를 명시
'
where id = 'f29567ba-275a-4cd9-add8-fa7b3d6e54c2'::uuid;
