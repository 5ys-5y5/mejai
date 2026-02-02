# MK2 범용 Intent 확장 정책팩 초안

## 목적
- 재입고 외에도 FAQ/배송/반품 등 기본 문의를 정책으로 분류
- 코드 하드코딩 대신 정책팩(input stage)으로 intent를 결정

## 현재 추가된 intent 규칙
- shipping_inquiry: 배송/송장/출고/운송장/배송조회
- refund_request: 환불/취소/반품/교환
- faq: FAQ/자주/이용안내/문의/안내
- order_change: 배송지 변경/주소 변경/주문 정보 변경/수령인 변경

## 정책 적용 위치
- input stage: text.matches(regex)로 intent_name set_flag
- tool stage: intent별 allow_tools/deny_tools 설정

## 다음 확장 포인트
- FAQ: 브랜드별 FAQ KB 연결 + 템플릿 가이드
- 배송: read_shipping 외에 주문 기반 배송조회(lookup_order/track_shipment) 연결
- 반품/환불: create_ticket 또는 주문 변경 tool과 연결
- 주문 변경: update_order_shipping_address 도구 + 주소/주문번호 수집 플로우 정교화

## 주의
- intent regex는 최소 범위부터 시작하고, 브랜드별로 확장
- tool 호출은 강제 호출(force_tool_call)로 일관되게 통제
