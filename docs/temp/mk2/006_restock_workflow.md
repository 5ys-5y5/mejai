# MK2 재입고 이벤트 워커/알림·주문 파이프라인 초안

## 목표
- 재입고(재고>0 또는 판매상태 변경) 이벤트를 감지해 알림/주문 요청을 안정적으로 처리
- LLM은 의사결정과 실행의 트리거를 만들고, 실제 실행은 워커/파이프라인이 담당

## 트리거 정의
- 재고 기반: inventory > 0
- 상태 기반: 상품 판매상태 = ON_SALE
- 이벤트 소스: Cafe24 웹훅(가능 시) + 주기 폴링(백업)

## 구독 데이터 모델(요약)
- restock_subscription
  - org_id, product_id
  - channel(sms|kakao|email)
  - customer_id / phone / email
  - trigger_type(inventory_gt|status_change)
  - trigger_value(수량/상태)
  - actions(notify_only|notify_and_prepare_order)
  - status(active|paused|completed)
  - created_at

## 워커 플로우(초안)
1) 스케줄러/웹훅에서 product_id + 상태 변경 감지
2) restock_subscription 조회 (active + 조건 매칭)
3) 알림 발송
4) actions가 주문 포함이면 주문 준비 플로우로 전환

## 주문 실행 2단계 확인(안전장치)
- 1차: 요청 정보 수집(옵션/수량/배송지/결제수단)
- 2차: 요약 확인(상품/수량/총액/배송지) -> 확인 시 실행

## MCP 연동 지점
- read_product: 상품 상태/재고 확인(variants/inventories embed)
- read_supply: 공급사 정보 확인
- read_shipping: 배송 설정 조회
- (추후) write_order: 주문 생성
- (추후) write_notification: 알림 발송

## 다음 단계
- 워커 실행 방식 확정(웹훅 vs 크론 폴링)
- 알림 채널 연동(문자/카카오/이메일) 어댑터 정의
- 주문 생성 MCP 도구 설계 및 정책 게이트 확장
