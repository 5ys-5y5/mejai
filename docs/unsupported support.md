# 지원 불가 처리 설계 (unsupported support)

이 문서는 **모든 의도(intent)**에 대해 “지원 불가를 정확히 안내”하는 계약/의도 설계를 정리한다.  
특정 케이스가 아니라 **모든 경우를 커버하는 공통 계약**으로 설계하며,  
**과도한 제약으로 답변 품질이 파괴되지 않도록** *정보 제공(info) 및 부분 지원(partial) 경로를 반드시 보장*한다.

---

## 1. 설계 목표
- 지원 불가 시 **어떤 기능이 지원되지 않는지 반드시 명시**한다.
- 필수 도구가 없으면 **의도 자체를 시작하지 않는다**.
- 지원 불가와 처리 실패를 **명확히 구분**한다.
- 모든 intent에 동일한 기준을 적용한다.
- **가능한 정보 제공은 차단하지 않는다** (과도한 제약 방지).

---

## 2. 실패 원인 요약 (현상 기준)
- `servicePageLog`/`chat2`에서 `order_change`가 **cafe24 도구 없이 진행**됨.
- 필수 도구 누락을 **계약 단계에서 차단하지 못해** 중간 단계로 진입.
- 결과적으로 **지원 불가 안내가 누락**되고 사용자에게 혼란이 발생함.

---

## 3. 공통 계약 구조 (Capability Contract)

### 3.1 데이터 구조 (의도 단위)
```yaml
intent_capability_contract:
  intent: order_change
  required_capabilities:        # MUST (없으면 실행 불가)
    - order_lookup
    - order_update
    - otp_gate
  optional_capabilities:        # SHOULD (없어도 info/partial 진행)
    - address_search
  required_tools:               # MUST tools
    - cafe24:list_orders
    - cafe24:lookup_order
    - cafe24:update_order_shipping_address
    - solapi:send_otp
    - solapi:verify_otp
  optional_tools:               # SHOULD tools
    - juso:search_address
  unsupported_feature_label: "주문번호 조회, 배송지 변경"
  supported_alternatives:
    - "관리자 연결"
    - "다른 채널 안내"
  answer_modes:                 # 허용 응답 모드
    - action      # 실행 가능
    - info        # 정보 제공만 가능
    - handoff     # 연결/전환
```

### 3.2 평가 로직 (모든 intent 공통)
1. intent 결정 직후, Capability Contract 로딩
2. `required_tools`가 allowlist/연동 상태에 **모두 존재**하는지 검증
3. 하나라도 누락되면 **즉시 지원 불가 응답**
4. 단, **info 모드가 가능한 경우는 허용** (과도한 차단 방지)
5. `optional_tools`만 누락된 경우는 **부분 지원**으로 진행

---

## 4. 모든 의도에 대한 Capability 매핑 (현재 기준)

아래 표는 **현재 코드/정책에 근거한 기본 매핑**이다.  
운영에서는 **조직/페이지 설정에 따라 tools를 조정**할 수 있다.

| intent | required_capabilities (MUST) | required_tools (MUST) | unsupported_feature_label |
| --- | --- | --- | --- |
| restock_inquiry | product_catalog_read **또는** restock_kb | resolve_product, read_product **또는** KB 접근 | 재입고 상품 조회 |
| restock_subscribe | restock_subscription_provider | subscribe_restock **또는** 내부 스케줄러 | 재입고 알림 신청 |
| order_change | order_lookup, order_update, otp_gate | cafe24:list_orders, cafe24:lookup_order, cafe24:update_order_shipping_address, solapi:send_otp, solapi:verify_otp | 주문번호 조회, 배송지 변경 |
| shipping_inquiry | order_lookup, shipment_tracking, otp_gate | cafe24:list_orders, cafe24:lookup_order, cafe24:track_shipment, solapi:send_otp, solapi:verify_otp | 배송 조회 |
| refund_request | order_lookup, refund_ticket, otp_gate | cafe24:list_orders, cafe24:lookup_order, create_ticket, solapi:send_otp, solapi:verify_otp | 환불/반품 접수 |
| faq | kb_access | KB/FAQ 데이터 접근 | FAQ/정책 답변 |
| general | kb_access **또는** handoff | KB/FAQ 접근 또는 상담 연결 | 일반 문의 답변 |

주의 (과도한 제약 방지)
- `restock_inquiry`는 **KB만으로도 답변 가능**한 경우 info 모드로 허용한다.
- `general`은 KB가 없으면 **지원 불가 또는 상담 연결(handoff)**로 처리한다.

---

## 5. 지원 불가 응답 규칙 (반드시 이유 명시)

지원 불가 응답에는 아래 요소가 반드시 포함되어야 한다.
- 지원 불가 기능 명시
- 불가 이유 (연동/도구 누락)
- 가능한 다음 단계 (관리자 문의, 다른 채널)

### 5.1 공통 템플릿
```
현재 이 채널에서는 {unsupported_feature_label} 기능을 지원하지 않습니다.
이유: {missing_tools_reason} (필수 연동/도구 미설정)
원하시면 {fallback_action_text}를 도와드릴까요?
```

### 5.2 예시 (order_change)
```
현재 이 채널에서는 주문번호 조회와 배송지 변경 기능을 지원하지 않습니다.
이유: cafe24 주문 조회/변경 연동이 설정되어 있지 않습니다.
원하시면 담당자 연결을 도와드릴까요?
```

---

## 6. 이벤트 명세 (지원 불가 플로우)

### POLICY_DECISION
- action: `INTENT_UNSUPPORTED_MISSING_TOOLS`
- payload
  - intent
  - missing_tools
  - unsupported_feature_label
  - unsupported_reason
  - answer_mode: `handoff` 또는 `info`

### FINAL_ANSWER_READY
- model: `deterministic_intent_unsupported`
- answer: 지원 불가 + 기능 명시 + 이유 + 다음 단계

### conversation flags
- conversation.flags.intent_unsupported = true
- conversation.flags.intent_unsupported_reason = `<reason>`
- conversation.flags.intent_unsupported_feature = `<feature_label>`

---

## 7. 적용 지점 (정확한 위치)

- intent 결정 직후
- OTP 단계 진입 이전

즉, `resolveIntentAndPolicyContext` 이후,  
`handleOtpLifecycleAndOrderGate` 진입 전에 Capability Gate를 수행한다.

---

## 8. 추가 안전 규칙
- tool 성공 로그가 없으면 성공 응답을 생성하지 않는다.
- 지원 불가 상태에서는 OTP/주소 입력 등 후속 단계로 진행하지 않는다.
- 단, **info 모드 응답은 허용**한다 (과도한 제약 방지).

---

## 9. 템플릿 변수 규격 (표준)

지원 불가 메시지 구성에 사용할 표준 변수를 정의한다.

| 변수 | 설명 |
| --- | --- |
| intent_name | 현재 intent |
| unsupported_feature_label | 지원 불가 기능 요약 |
| missing_tools | 누락된 도구 목록 |
| missing_tools_reason | 도구 누락 사유 요약 |
| missing_capabilities | 누락된 capability 목록 |
| missing_providers | 누락된 provider 목록 |
| supported_alternatives | 가능한 대안 목록 |
| fallback_action_text | 안내할 다음 단계 텍스트 |
| answer_mode | action / info / handoff |

필수 변수
- `unsupported_feature_label`
- `missing_tools_reason`
- `fallback_action_text`

---

## 10. 자동 생성 규칙 (required_tools 산출)

### 10.1 기본 규칙
1. intent → required_capabilities 매핑
2. capability → tool 목록 매핑
3. 조직/페이지 allowlist와 교차 적용
4. 누락 도구 산출 후 지원 불가 판단

### 10.2 예시 로직 (의사코드)
```pseudo
contract = getCapabilityContract(intent)
required_tools = union(capabilityTools[cap] for cap in contract.required_capabilities)
missing_tools = required_tools - allowlist_tools

if missing_tools not empty:
  answer_mode = "handoff" or "info"
  return unsupported(message, missing_tools, unsupported_feature_label)
else:
  proceed intent flow
```

### 10.3 과도한 제약 방지 원칙
- **info 모드 허용**: 실행은 불가하지만 KB/정책 답변이 가능한 경우 차단하지 않는다.
- **부분 지원 허용**: optional_tools 누락 시에도 가능한 범위에서 답변한다.
- **대체 경로 안내**: 지원 불가 시 무조건 종료하지 말고 대안을 제공한다.

---

## 11. intent별 capability → tool 매핑 상세 버전

### 11.1 capability → tool 표

| capability | must_tools | optional_tools | 대체 경로 |
| --- | --- | --- | --- |
| order_lookup | list_orders, lookup_order | - | - |
| order_update | update_order_shipping_address | - | - |
| otp_gate | send_otp, verify_otp | - | - |
| shipment_tracking | track_shipment | - | - |
| refund_ticket | create_ticket | - | 수동 접수 안내 |
| product_catalog_read | resolve_product, read_product | - | KB 기반 답변 |
| restock_subscription_provider | subscribe_restock | - | 내부 스케줄러 |
| address_search | search_address | - | 수동 주소 입력 |
| kb_access | - | - | 기본 FAQ/정책 답변 |
| handoff | - | - | 관리자 연결 |

### 11.2 intent → capability → tool 확장 예

**order_change**
- required_capabilities: order_lookup, order_update, otp_gate
- derived_required_tools: list_orders, lookup_order, update_order_shipping_address, send_otp, verify_otp

**shipping_inquiry**
- required_capabilities: order_lookup, shipment_tracking, otp_gate
- derived_required_tools: list_orders, lookup_order, track_shipment, send_otp, verify_otp

**refund_request**
- required_capabilities: order_lookup, refund_ticket, otp_gate
- derived_required_tools: list_orders, lookup_order, create_ticket, send_otp, verify_otp

**restock_inquiry**
- required_capabilities: (없음)
- optional_capabilities: product_catalog_read, kb_access
- derived_required_tools: 없음 (info 모드로 답변 가능)

---

## 12. 운영 환경(조직/페이지)별 allowlist 기반 자동 산출 예시

### 12.1 환경 A (cafe24 + solapi + juso 모두 허용)
allowlist = { list_orders, lookup_order, update_order_shipping_address, send_otp, verify_otp, search_address }

결과
- order_change: supported (action)
- shipping_inquiry: supported (action)
- refund_request: supported (action)

### 12.2 환경 B (solapi + juso만 허용)
allowlist = { send_otp, verify_otp, search_address }

결과
- order_change: **unsupported**
  - missing_tools = { list_orders, lookup_order, update_order_shipping_address }
  - unsupported_feature_label = “주문번호 조회, 배송지 변경”
- shipping_inquiry: **unsupported**
  - missing_tools = { list_orders, lookup_order, track_shipment }
  - unsupported_feature_label = “배송 조회”

### 12.3 환경 C (KB만 허용)
allowlist = { }

결과
- restock_inquiry: **info 모드 허용** (KB 답변)
- faq/general: **info 모드 허용** (KB 답변)
- order_change / refund_request / shipping_inquiry: **unsupported**

---

## 정리
- 모든 intent에 대해 동일한 Capability Contract를 적용한다.
- 필수 도구가 없으면 즉시 “지원 불가”를 반환한다.
- 지원 불가 응답에는 반드시 **지원되지 않는 기능을 명시**한다.
- 동시에 info/부분 지원을 허용하여 **과도한 제약으로 답변 품질이 붕괴되지 않도록** 한다.
