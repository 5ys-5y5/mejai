# CUSTOMER_VERIFICATION_REQUIRED 대응 정리 (Cafe24 문서 기준)

요청하신 오류는 **Cafe24 문서에 “CUSTOMER_VERIFICATION_REQUIRED”라는 에러 코드 설명이 직접적으로 노출되어 있진 않습니다.**  
다만 **주문/수령인 조회·변경 API의 필수 조건과 설정 항목**을 보면, 이 에러가 “고객 본인확인(인증) 요구 상태”에서 발생하는 것으로 해석됩니다. 아래는 **문서에 근거한 대응 방향**입니다.

---

## 1) 주문 조회/수정은 해당 스코프가 필요
- 주문 목록/단일 주문 조회는 `mall.read_order` 스코프 필요  
  (https://developers.cafe24.com/docs/en/api/admin/)
- 수령인(배송지) 변경은 `mall.write_order` 스코프 필요  
  (https://developers.cafe24.com/docs/en/api/admin/?version=2024-06-01)

즉, **토큰 스코프가 부족하거나 제한된 앱 토큰**이면 주문 상세 조회/수정이 실패할 수 있습니다.  
(현재 `list_orders`가 성공하므로 read scope는 있는 것으로 보이지만, “단일 주문 조회”는 별도로 막히는 케이스가 있습니다.)

---

## 2) 배송지 변경은 “수령인(Receivers) API” 규격을 따라야 함
Cafe24 문서 기준으로 배송지 변경은 다음 흐름이 안전합니다.

1. **수령인 조회**  
   `GET /api/v2/admin/orders/{order_id}/receivers`  
   → 여기서 `shipping_code` 확보

2. **수령인 변경**  
   `PUT /api/v2/admin/orders/{order_id}/receivers/{shipping_code}` (또는 receivers)  
   필수 파라미터에 `shipping_code`가 필요합니다.

현재 로그를 보면 `shipping_code` 없이 `PUT`하고 있어, **Cafe24 규격상 실패 가능성이 높습니다**.  
(또한 현재 에러 “Query String is not available for POST, PUT Method”는 **PUT에 query string을 붙이는 방식이 허용되지 않는다는 의미**이므로, `shop_no`는 query가 아니라 요청 바디로 보내는 것이 안전합니다.)

---

## 3) “배송지 변경 가능 상태” 설정 확인
Cafe24 주문 설정에는 **배송지 변경이 가능한 주문 상태를 제한**하는 항목이 있습니다.
- `receiver_address_modify_button_exposure` (배송지 변경 가능 상태: N00, N10, N20, N22 등)

**주문 상태가 허용되지 않으면 변경 요청이 거절될 수 있습니다.**

---

## 4) CUSTOMER_VERIFICATION_REQUIRED를 없애는 핵심
문서에 “CUSTOMER_VERIFICATION_REQUIRED” 자체가 명시되진 않지만,  
실제 운영상 이 에러는 **고객 인증(본인확인) 완료 전 주문 상세 조회/변경을 차단**하는 경우에 발생합니다.

따라서 **에러를 없애려면 아래 흐름이 필요합니다.**

- `lookup_order` 호출 전에 **OTP 인증 완료**  
  (현재 MCP에 `send_otp`, `verify_otp`가 있으니 이것을 **lookup_order 이전 단계로 강제**)
- 인증 성공 시 `customer_verified=true` 상태로 저장 후 주문 조회/변경 진행

> 즉, *“OTP 인증 완료 후 조회/변경”* 흐름이 있어야 `CUSTOMER_VERIFICATION_REQUIRED`가 사라집니다.

---

## 정리: 실제 적용 체크리스트
1. **토큰 스코프 확인**: `mall.read_order`, `mall.write_order` 포함
2. **수령인 변경 시 `shipping_code` 확보** 후 PUT
3. **PUT 요청에 query string 제거** (shop_no는 body로)
4. **주문 상태 허용 여부 확인** (`receiver_address_modify_button_exposure`)
5. **OTP 인증 후 `lookup_order` 실행** (MCP `send_otp` → `verify_otp` → `lookup_order`)

---

원하시면 다음 수정까지 진행 가능합니다.
- shipping_code 획득 → update_order_shipping_address 적용
- OTP 인증 강제 플로우
- shop_no 요청 바디로 이동

위 액션을 실행해주세요.