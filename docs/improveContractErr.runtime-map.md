# improveContractErr 런타임 명시본

이 문서는 `docs/improveContractErr.md`의 각 항목에 대해 "현재 사용 중인 런타임 이름"을 명시한 버전입니다.
아래의 런타임은 신규 생성이 아니라, 이미 존재하는 런타임을 기준으로 매핑했습니다.

## 1) 대화 엔티티/컨텍스트 기록 규칙(계약)

해당 계약이 실제로 적용되는 런타임:
- `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`
- `src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts`
- `src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts`
- `src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts`
- `src/app/api/runtime/chat/runtime/memoryReuseRuntime.ts`
- `src/app/api/runtime/chat/runtime/selectionResolutionRuntime.ts`
- `src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts`
- `src/app/api/runtime/chat/runtime/sessionRuntime.ts`
- `src/app/api/runtime/chat/runtime/runtimeTurnIo.ts`
- `src/app/api/runtime/chat/services/endUserRuntime.ts`
- `src/app/api/runtime/chat/shared/confirmedEntity.ts`
- `src/app/api/runtime/chat/policies/principles.ts`

역할 요약:
- `runtimeOrchestrator.ts`
  - turn 단위로 `bot_context`, `confirmed_entity`, `confirmed_entity_meta`, `confirmed_entity_delta`를 합성/기록
  - 파이프라인에서 `contextResolutionRuntime`, `slotDerivationRuntime`, `runtimeInputStageRuntime`, `memoryReuseRuntime` 호출 순서를 관리
- `contextResolutionRuntime.ts`
  - `prevEntity`/`recentEntity`/`confirmed_entity`/선택값/파생값을 병합해 `policyContext.entity` 구성
  - entity 업데이트 기록(`entity_updates`, `entity_update_notice`) 생성
- `slotDerivationRuntime.ts`
  - 유저 발화로부터 `derived` 슬롯(예: `order_id`, `phone`, `address`, `zipcode`) 추출
- `runtimeInputStageRuntime.ts`
  - pending/expected_input 상태 관리, 기존 `bot_context` 보존 범위 결정
- `memoryReuseRuntime.ts`
  - `getEntityReuseOrder()`(정책)에 따라 대화 내/최근/메모리 엔티티 재사용 순서 결정
  - 재사용 승인(`reuse_pending`) 처리
- `selectionResolutionRuntime.ts`
  - 후보 선택 응답을 엔티티 patch로 변환
- `runtimeInitializationRuntime.ts` + `sessionRuntime.ts`
  - 직전 turn의 `bot_context`/`entity`를 로딩
- `runtimeTurnIo.ts`
  - 최종 `bot_context` 저장/로드
- `endUserRuntime.ts`
  - A_end_users 메모리 엔티티 조회
- `confirmedEntity.ts`
  - `confirmed_entity` 정규화/병합/추출
- `principles.ts`
  - `getEntityReuseOrder()`, `shouldReuseProvidedInfoWithYesNo()` 등 재사용 정책의 소스


## 2) 마지막 질문-답변 바인딩 계약

해당 계약이 실제로 적용되는 런타임:
- `src/app/api/runtime/chat/policies/principles.ts`
- `src/app/api/runtime/chat/runtime/inputContractRuntime.ts`
- `src/app/api/runtime/chat/runtime/pendingStateRuntime.ts`
- `src/app/api/runtime/chat/runtime/otpRuntime.ts`
- `src/app/api/runtime/chat/runtime/restockPendingRuntime.ts`
- `src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts`
- `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`

역할 요약:
- `principles.ts`
  - `shouldEnforceLastQuestionAnswerBinding()` 기준 값 제공
- `inputContractRuntime.ts`
  - `bot_context`의 pending 상태를 보고 `expected_input` 규칙 적용
- `pendingStateRuntime.ts`
  - 주소/환불/변경 등 pending 상태 질문에 대해 "직전 질문-응답 바인딩" 검증
- `otpRuntime.ts`
  - OTP 질문 시 `expected_input`과 `otp_pending` 상태를 설정/검증
- `restockPendingRuntime.ts`
  - 재입고 흐름의 confirm/phone 단계 질문 및 pending 상태 처리
- `promptTemplateRuntime.ts`
  - pending 상태에 맞는 실제 질문(prompt)을 생성
- `runtimeOrchestrator.ts`
  - 위 런타임들의 실행 순서를 보장


## 3) 예시별 의도 정의명(인텐트 명시)

### 예시 A: OTP 질문 중 재입고 알림 의도 등장
- 사용 문장 예시
  - 봇 질문: "문자로 전송된 인증번호를 입력해 주세요."
  - 사용자 답변: "원피스 재입고 알림을 받을래요."
- 의도 정의명
  - `restock_subscribe`
- 관련 런타임
  - `otpRuntime.ts`, `inputContractRuntime.ts`, `pendingStateRuntime.ts`, `runtimeOrchestrator.ts`

### 예시 B: OTP 질문 중 수신 채널 변경 요청
- 사용 문장 예시
  - 봇 질문: "문자로 전송된 인증번호를 입력해 주세요."
  - 사용자 답변: "카카오톡으로 받을래요."
- 의도 정의명
  - `restock_subscribe`
- 관련 런타임
  - `otpRuntime.ts`, `restockPendingRuntime.ts`, `inputContractRuntime.ts`

### 예시 C: OTP 질문 중 연락처 변경 요청
- 사용 문장 예시
  - 봇 질문: "문자로 전송된 인증번호를 입력해 주세요."
  - 사용자 답변: "휴대폰 번호를 바꿀래요."
- 의도 정의명
  - `restock_subscribe`
- 관련 런타임
  - `otpRuntime.ts`, `restockPendingRuntime.ts`, `inputContractRuntime.ts`

### 예시 D: 전혀 다른 의도(주문 취소)로 전환
- 사용 문장 예시
  - 봇 질문: "문자로 전송된 인증번호를 입력해 주세요."
  - 사용자 답변: "주문을 취소하고 싶어요."
- 의도 정의명
  - `refund_request`
- 관련 런타임
  - `intentDisambiguationRuntime.ts`, `runtimeOrchestrator.ts`, `inputContractRuntime.ts`

### 예시 E: 확인 질문에 숫자만 응답(의도 불확정)
- 사용 문장 예시
  - 봇 질문: "상품(코듀로이 볼캡)을(를) sms로 재입고 알림 신청할까요?"
  - 사용자 답변: "101010"
- 의도 정의명
  - `restock_subscribe`
- 처리 원칙
  - 숫자만으로 의도 확정 불가이므로 직전 질문 재요청
- 관련 런타임
  - `pendingStateRuntime.ts`, `inputContractRuntime.ts`, `promptTemplateRuntime.ts`


## 4) 추가 예시(요청 반영)

### 예시 F: OTP 질문 중 재입고 문의로 전환
- 사용 문장 예시
  - 봇 질문: "문자로 전송된 인증번호를 입력해 주세요."
  - 사용자 답변: "원피스 재입고 언제 돼요?"
- 의도 정의명
  - `restock_inquiry`
- 관련 런타임
  - `intentDisambiguationRuntime.ts`, `runtimeOrchestrator.ts`, `inputContractRuntime.ts`
