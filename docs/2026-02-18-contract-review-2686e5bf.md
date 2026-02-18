# 계약/의도 수준 점검 보고서 (TURN_ID: 2686e5bf-4e63-4083-a90c-1a8d769eccbb)

## 요약
- 점수: 66/100
- 결론: 계약 기반 방향성은 확보했지만, 선택지 UI 보장과 unknown 슬롯 대체(특히 우편번호)는 아직 부분 패치 수준으로 남아 있음.

## 범위
- 런타임/정책/프롬프트 계약 전반 점검
- 주요 확인 파일: `src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts`, `src/app/api/runtime/chat/policies/intentSlotPolicy.ts`, `src/app/api/runtime/chat/runtime/toolRuntime.ts`, `src/app/api/runtime/chat/shared/addressCandidateUtils.ts`, `src/app/api/runtime/chat/runtime/quickReplyConfigRuntime.ts`, `src/app/api/runtime/chat/presentation/ui-responseDecorators.ts`, `src/app/api/runtime/chat/policies/principles.ts`, `src/app/api/runtime/chat/runtime/intentContractRuntime.ts`, `src/app/api/runtime/chat/policies/restockResponsePolicy.ts`

## 평가

**1. 문의 유형 선택 리스트(의도/계약 레벨)**
현재 선택지 렌더링에서 intent label + 지원 범위를 함께 노출하도록 설계되어 있어 범용성은 확보되었습니다. 다만 텍스트 합성에 의존해 구조화된 선택지 계약(메타데이터 전달)이 부족합니다. 템플릿이나 스타일 변형 시 정보 누락 가능성이 있습니다.
증거: `src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts:43-86`, `src/app/api/runtime/chat/policies/intentSlotPolicy.ts:59-72`

**2. 주문/주소 선택 리스트(도메인별 정보 노출)**
주문 선택 라벨에 주문번호/상품명/옵션/수량/가격 등 핵심 필드가 포함되어 있고, 주소 후보도 지번/도로명/우편번호를 모두 노출합니다. 이 부분은 계약 수준 요구에 근접합니다.
증거: `src/app/api/runtime/chat/runtime/toolRuntime.ts:330-428`, `src/app/api/runtime/chat/shared/addressCandidateUtils.ts:65-81`

**3. 선택지 버튼 노출(Yes/No 포함)**
Yes/No 감지 후 quick_reply_config는 생성되지만, 실제 버튼 생성은 criteria에 yes_no가 포함될 때만 이루어집니다. ORDER_CONFIRMATION_REQUIRED 경로는 criteria가 yes_no를 포함하지 않아 버튼 누락이 재발할 수 있습니다. 이는 계약 수준 보장이 아니라 규칙 문자열에 의존한 부분 패치입니다.
증거: `src/app/api/runtime/chat/runtime/quickReplyConfigRuntime.ts:91-110`, `src/app/api/runtime/chat/presentation/ui-responseDecorators.ts:83-88`, `src/app/api/runtime/chat/runtime/toolRuntime.ts:1080-1085`

**4. 우편번호/주문번호 대체 흐름(whatUserDontKnow 계약)**
원칙에는 zipcode/order_id를 직접 묻지 말고 대체 입력으로 해결하도록 명시되어 있으나, mutation contract는 여전히 zipcode를 requiredSlots로 강제합니다. normalizeOrderChangeAddressPrompt는 텍스트 치환 수준으로, 계약 레벨의 요구사항을 구조적으로 보장하지 못합니다.
증거: `src/app/api/runtime/chat/policies/principles.ts:79-101`, `src/app/api/runtime/chat/runtime/intentContractRuntime.ts:69-74`, `src/app/api/runtime/chat/policies/restockResponsePolicy.ts:227-230`

**5. OTP 인증 완료 안내**
otpVerifiedThisTurn 시 인증 완료 문구를 붙이는 로직이 있으나, 실제 로그에서 누락되었습니다. 인증 완료 안내가 공통 계약으로 중앙화되지 않아 흐름마다 편차가 발생합니다.
증거: `src/app/api/runtime/chat/runtime/toolRuntime.ts:1047-1051`

**6. 카드형 선택지(이미지 포함)**
렌더 정책은 카드 뷰를 지원하지만 주문 선택 흐름에서는 product_cards 생성이 없습니다. 이미지가 존재하더라도 카드형 선택지가 활성화되지 않습니다. 이는 계약(이미지 보유 시 카드 제공)과 실행이 분리된 상태입니다.
증거: `src/app/api/runtime/chat/presentation/ui-responseDecorators.ts:83-88`, `src/app/api/runtime/chat/policies/renderPolicy.ts:171-178`

## 보완 제안(계약/의도 수준)

1. 선택지 계약을 구조화하세요.
텍스트 합성 대신 `choice_items`(label + fields + image_url + value)를 응답 스키마에 포함하고, UI는 이 구조만으로 버튼/카드를 생성하도록 통합하세요. 텍스트 파싱 기반 fallback은 보조로만 유지합니다.

2. quick_reply_config에 preset/type을 추가하세요.
`preset: "yes_no"` 또는 `choice_kind: "binary"` 같은 명시 필드를 추가하고, `deriveQuickRepliesFromConfig`가 이 필드를 기준으로 버튼을 생성하도록 바꿔야 합니다. criteria 문자열에 의존하는 방식은 계약 레벨 보장이 아닙니다.

3. mutation contract에 resolvable slot 개념을 도입하세요.
`requiredSlots`와 별도로 `resolvableSlots` 또는 `resolutionPlan`을 두고, `resolveMutationReadyState` 단계에서 substitution plan을 적용해 zipcode/order_id를 자동 충족하도록 처리하세요. 이때 ADDRESS_SEARCH_STARTED/COMPLETED 로그를 강제해 디버그 원칙을 만족해야 합니다.

4. OTP 완료 안내를 공통 단계로 승격하세요.
OTP 검증 직후의 첫 응답에는 반드시 인증 완료 프리픽스가 포함되도록 중앙화(예: response decorator나 makeReply 래퍼)하세요. 특정 핸들러에만 의존하면 흐름마다 누락됩니다.

5. 주문 선택 카드화 계약을 완성하세요.
order list 생성 시 이미지가 존재하면 `product_cards`에 카드 데이터를 포함하고, `renderPolicy`에서 카드 뷰를 활성화하도록 계약을 연결하세요.

## 점수 산정 근거
- 계약/의도 일반화: 26/40
- 선택지 UI 일관성: 17/25
- unknown 슬롯 대체 흐름: 11/20
- 인증 완료 안내: 12/15
- 합계: 66/100
