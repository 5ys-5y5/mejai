# 정책/롤백/OTP 계약 정리 (요청 반영)

## 전체 맥락 요약 (핵심 흐름)

1. 비로그인 대화가 실패했고,
2. OTP 인증 흐름이 기존 계약과 다르게 동작하며,
3. 입력창이 안 보인다고 착각해 수정한 코드가 있었고,
4. 그 수정이 admin UI 설정 반영을 망가뜨리는 방향이었음.

따라서 요구사항은 다음과 같음:

- 잘못 이해해서 넣은 하드코딩 변경 롤백
- chat_policy 실패 문구는 안내 문구만 변경
- OTP 계약을 “번호 확정 = unauthorized -> OTP -> confirmed”로 전면 강화
- 모든 휴대폰/OTP 관련 경로가 이 계약을 따르도록 설계

---

## 1) 롤백 대상 정정 (오해 방지)

### 오해의 출발점
- “비로그인 상태에서 입력창이 안 보인다”는 문제가 아니었음.
- 실제 문제는 “비로그인 대화 실패”였음.

### 잘못한 수정
- 입력창이 안 보인다고 착각해 `src/lib/conversation/pageFeaturePolicy.ts`에서
  `/`, `/embed`, `/demo`, `/call` 페이지의 `visibility`를 public으로 강제 변경.

### 왜 문제인가
- 해당 변경은 `http://localhost:3000/app/admin?tab=chat` 설정을 무시하고
  하드코딩된 값이 정책을 덮어쓰는 구조를 만들었음.
- admin UI 설정이 페이지에 반영되지 않는 원인이 됨.

### 롤백 대상
- `src/lib/conversation/pageFeaturePolicy.ts`
  - `/`, `/embed`, `/demo`, `/call`의 visibility 강제 public 변경 부분
  - 목표: admin UI 설정이 각 페이지에 정상 반영되도록 복구

### 롤백 대상 아님
- `chat_policy 로드 실패 시 즉시 오류 반환 (fallback 금지)` 정책은 유지

---

## 2) chat_policy 실패 안내 문구 변경 (롤백 아님)

### 현재 상태
- 정책 로드 실패 시 즉시 오류 반환 유지됨.
- 다만 사용자에게 “응답 실패”처럼 모호한 문구가 노출됨.

### 요구사항
- 실패 원인을 정책 문제라고 명확히 안내해야 함.
- 예시 문구:
  - “답변 출력 정책을 불러오지 못해 답변을 제공할 수 없습니다.”

### 핵심
- 런타임 fail-fast 유지
- 안내 문구만 교체

---

## 3) OTP 계약 수준 정리 (핵심 원인 + 방향)

### 기존 런타임이 깨진 이유
- “번호 재확인(예/아니오)” 단계에서 OTP가 발동하지 않음.
- 이 단계는 expected_input = confirm 이므로 OTP 트리거 조건에서 빠짐.
- 결과적으로 OTP 없이 번호가 확정됨.

### 요구된 계약 (정확 반영)

1) 모든 대화에서 휴대폰 번호가 처음 확정되는 순간은 unauthorized
2) OTP 완료 시에만 confirmed(authorized)
3) unauthorized 상태의 번호는 절대 사용 금지
   - unauthorized 상태라면 반드시 OTP 인증 유도
   - 실패 시: 새 번호 입력 -> unauthorized -> OTP -> confirmed
4) 같은 대화 내에서 이미 confirmed된 번호는 재인증 불필요
5) 재사용 흐름 유지
   - getEntityReuseOrder, shouldReuseProvidedInfoWithYesNo 등은 예시일 뿐
   - 재사용된 번호가 unauthorized라면 OTP는 필수
   - 재사용 승인 자체가 인증을 대체하지 않음

---

## 4) 의도/계약 수준 개선 방향 (코드 변경 전)

### 목적
- 단발성 패치가 아니라 휴대폰 번호를 사용하는 모든 런타임이
  동일한 계약을 따르게 하는 구조로 개선해야 함.

### 반드시 점검해야 할 범위
`C:\dev\mejai\src\app\api\runtime\chat` 내 휴대폰/OTP 관련 전 경로
(예시만 적용 금지)

예시 경로:
- runtime/otpRuntime.ts
- runtime/runtimeOrchestrator.ts
- runtime/preTurnGuardRuntime.ts
- runtime/runtimeInputStageRuntime.ts
- runtime/contextResolutionRuntime.ts
- runtime/memoryReuseRuntime.ts
- runtime/slotDerivationRuntime.ts
- services/endUserRuntime.ts
- runtime/promptTemplateRuntime.ts
- runtime/toolRuntime.ts
- 기타 phone/otp 관련 경로 전부

### 계약 적용 방식 (의도 기반)
- 전화번호 상태를 명시적으로 관리
  - phone_auth_status: unauthorized | authorized
- OTP 트리거 조건 통일
  - 번호가 최초 확정되는 모든 경우에 OTP 필수
- 번호 사용 차단
  - unauthorized 상태 번호는 어떤 실행 경로에서도 사용 금지
- 재사용 흐름과 결합
  - 재사용 승인 후에도 unauthorized면 OTP로 전환
- 일관성 유지
  - intent/flow/페이지 종류 상관없이 동일 계약 적용

---

## 현재까지의 결론

- 롤백 대상: visibility 하드코딩 변경
- 롤백 대상 아님: chat_policy strict 실패 처리
- chat_policy 실패 문구: 정책 실패 안내로 교체 필요
- OTP 계약: “번호 확정 = unauthorized -> OTP -> confirmed”를
  모든 휴대폰 관련 런타임에 계약으로 반영해야 함
