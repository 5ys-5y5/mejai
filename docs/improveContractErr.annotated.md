- 현재 문제의 일반화(의도/계약 수준)
  - 런타임은 “하나의 대화에서 여러 의도/단계가 동시에 걸리는 상황”을 안정적으로 처리해야 한다. [runtime: src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts]
  - 실제로는 다음 형태의 충돌이 반복된다. [기대 의도에 대한 답변] → [다른 의도에 대한 답변이 먼저 실행] → [기대 의도 답변을 다시 요청] [contract: 마지막 질문-답변 바인딩][runtime: src/app/api/runtime/chat/runtime/inputContractRuntime.ts]
  - 이때, 엔티티/컨텍스트가 유실되거나 덮어쓰기되면서 “루프”나 “기억 상실”이 발생한다. [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts][runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
  - 일반화해야 하는 목적은 특정 흐름(OTP vs restock)만 고치는 것이 아니라 모든 의도/모든 단계에서 같은 유형의 충돌이 발생해도 깨지지 않는 계약 구조를 만드는 것이다. [policy: src/app/api/runtime/chat/policies/principles.ts][contract: 대화 엔티티/컨텍스트 기록 규칙, 마지막 질문-답변 바인딩]

이에 대해 [대화 엔티티/컨텍스트 기록 규칙(계약)]과 [“마지막 질문-답변 바인딩” 계약]을 통해 해결할 수 있어야 한다. [runtime: src/app/api/runtime/chat/runtime/inputContractRuntime.ts][runtime: src/app/api/runtime/chat/runtime/pendingStateRuntime.ts]

———

1) 대화 엔티티/컨텍스트 기록 규칙(계약)
  - 대화 중에 봇이 질문한 의도/단계와 그에 대한 사용자의 답변은 항상 엔티티에 분리해서 기록되어야 한다. [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts][runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
  - 한 대화 안에서 동시에 여러 의도(예: otp, restock_inquiry, restock_pending)가 진행 중이어도 각각의 “기대 답변 슬롯”을 엔티티에서 분리해 유지해야 한다. [runtime: src/app/api/runtime/chat/runtime/inputContractRuntime.ts][key: expected_input, otp_pending, restock_pending]
  - null로 비어 있던 항목이 사용자 답변으로 채워지면, 다음 턴에서는 그 값이 최우선으로 사용되어야 한다. [runtime: src/app/api/runtime/chat/runtime/memoryReuseRuntime.ts][policy: src/app/api/runtime/chat/policies/principles.ts]
  - 즉, 봇이 이미 답변을 “받았다”고 이해할 수 있게 엔티티가 명시적으로 채워져야 한다. [runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
  - 이 규칙은 OTP가 끼어들었는지 여부와 무관하게 동일하게 적용되어야 한다. [runtime: src/app/api/runtime/chat/runtime/otpRuntime.ts][policy: src/app/api/runtime/chat/policies/principles.ts]

2) “마지막 질문-답변 바인딩” 계약
  - 용어 정의
    - 의도(Intent): 사용자가 하려는 목적(예: 재입고 알림 신청, OTP 인증, 주문 변경 등). [policy: src/app/api/runtime/chat/policies/intentSlotPolicy.ts]
    - 질문 단계(Stage): 특정 의도를 완료하기 위해 필요한 질문 순서(예: 상품명 질문 → 채널 질문 → 번호  
      질문 → 확인 질문). [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts][runtime: src/app/api/runtime/chat/runtime/pendingStateRuntime.ts]
    - 기대 질문(Expected Question): 봇이 직전에 던진 질문. [runtime: src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts]
    - 기대 답변(Expected Answer): 그 질문에 대한 사용자의 답변. [runtime: src/app/api/runtime/chat/runtime/inputContractRuntime.ts]
    - 확정된 엔티티(Confirmed Entity): 사용자가 명시적으로 답변하여 확정된 정보. [runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
    - 의도 전환(Intent Switch): 사용자의 답변이 직전 질문과 무관하고 다른 의도를 명확히 나타내는 경우. [runtime: src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts][policy: src/app/api/runtime/chat/policies/intentSlotPolicy.ts]
  - 계약의 목적
    - 봇이 던진 마지막 질문에 대한 답변을 정확히 그 질문에 연결해야 한다. [contract: 마지막 질문-답변 바인딩][runtime: src/app/api/runtime/chat/runtime/inputContractRuntime.ts]
    - 다른 의도가 끼어들더라도 질문-답변의 연결을 깨지지 않게 유지해야 한다. [runtime: src/app/api/runtime/chat/runtime/pendingStateRuntime.ts]
    - 이미 확정된 엔티티가 임의로 덮어써지거나 유실되지 않도록 보장해야 한다. [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts][runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
  - 규칙
    - 규칙 1: 기본 바인딩
      - 사용자의 답변에 다른 의도 힌트가 없다면,
        무조건 봇의 직전 질문에 대한 답변으로 처리한다. [runtime: src/app/api/runtime/chat/runtime/inputContractRuntime.ts]
      - “다른 의도 힌트가 없다”의 예:
          - 봇: “인증번호를 입력해 주세요.”
            사용자: “101010”
            → OTP 코드로 확정 [runtime: src/app/api/runtime/chat/runtime/otpRuntime.ts][key: expected_input=otp_code]
          - 봇: “상품(코듀로이 볼캡)을 sms로 신청할까요?”
            사용자: “네”
            → 재입고 신청 확인으로 확정 [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts][key: expected_input=confirm]
    - 규칙 2: 의도 전환
      - 사용자의 답변에 다른 의도 힌트가 명확히 있다면,
        직전 질문에 대한 답변으로 처리하면 안 된다. [runtime: src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts]
      - 이 경우:
          1. 기존 질문 흐름을 중단 [runtime: src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts]
          2. 새로운 의도를 등록 [runtime: src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts]
          3. 새로운 의도에 맞는 첫 질문부터 다시 시작 [runtime: src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts]
    - 규칙 3: 확정된 엔티티 유지 범위
      - “확정된 엔티티는 유지”의 의미는 다음과 같다:
          - 의도 전환이 발생한 지점 이전까지 확정된 정보만 유지 [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts]
          - 전환 지점 이후 단계에서 확정된 정보는 폐기 [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts]
      - 이 규칙은 단계의 내용과 무관하게 단계 순서 기준으로 적용한다. [runtime: src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts]
    - 규칙 4: 완전히 새로운 의도일 때
      - 사용자의 답변이 기존 흐름과 전혀 관련 없는 새로운 의도라면:
          1. 이전 대화 흐름 전체를 종료 [runtime: src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts]
          2. 확정된 엔티티를 전부 폐기 [runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
          3. 새로운 의도에 대해 “맞는지 확인 질문”을 먼저 한 뒤 [runtime: src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts]
          4. 새로운 대화로 시작 [runtime: src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts]
    - 규칙 5: 답변이 의도 확정을 유도할 만큼 명확하지 않으면, 의도 전환을 하지 않고 직전 질문에 대한 답변 재요청을 해야 한다. [runtime: src/app/api/runtime/chat/runtime/pendingStateRuntime.ts][runtime: src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts]
  - 예시:
    - 예시 A: OTP 질문에 재입고 의도 답변
      - 이전 맥락: 상품명 확인(코듀로이 볼캡) → 채널 확인(sms) → 휴대폰 번호 확인 
      - 상황: 봇이 OTP를 요구 중 [runtime: src/app/api/runtime/chat/runtime/otpRuntime.ts][key: otp_pending]
      - 봇 질문: “문자로 전송된 인증번호를 입력해 주세요.”
      - 사용자 답변: “코듀로이 볼캡 재입고 알림을 받을래요.”
    
      처리
    
      1. 이 답변은 OTP 코드가 아니라 재입고 의도 힌트가 명확함. [policy: src/app/api/runtime/chat/policies/intentSlotPolicy.ts]
      2. 따라서 OTP 답변으로 처리하면 안 됨. [contract: 마지막 질문-답변 바인딩]
      3. 의도 전환 발생 → 재입고 의도로 전환. [runtime: src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts]
      4. 재입고 의도의 첫 질문부터 다시 시작:
          - 예: “재입고를 확인할 상품명을 알려주세요. (예: 코듀로이 볼캡)” [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts]
      5. OTP 흐름은 중단/보류되고, OTP 관련 엔티티는 확정하지 않음. [runtime: src/app/api/runtime/chat/runtime/otpRuntime.ts][runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
      6. 이전 확정 엔티티는 전환 지점 이전까지만 유지. [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts]
    
    - 예시 B: a→b→c→d 흐름에서 b로 되돌림 (해당 예시는 예시이며, 인증 채널은 sms 단일로 유지)
    
      - 흐름 정의:
          - a: 상품명 확인(코듀로이 볼캡)
          - b: 채널 확인(sms/kakao)
          - c: 휴대폰 번호 확인
          - d: OTP 인증번호 입력
      - 상황: d 단계 질문 중 [runtime: src/app/api/runtime/chat/runtime/otpRuntime.ts][key: otp_stage]
      - 봇 질문: “문자로 전송된 인증번호를 입력해 주세요.”
      - 사용자 답변: “채널을 카카오로 바꿀래요.”
    
      처리
    
      1. 답변은 OTP가 아니라 b 단계(채널 변경) 의도 힌트. [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts]
      2. 의도 전환 발생 → b 단계로 되돌림 [runtime: src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts]
      3. 확정 유지 범위 = a까지만 유지
          - a 단계(상품명)는 유지 [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts]
          - b~d 단계의 확정값은 폐기 [runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
      4. b 질문부터 다시 시작:
          - “알림을 sms로 받을까요, 카카오로 받을까요?” [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts]
    
    - 예시 C: a→b→c→d 흐름에서 c로 되돌림
    
      - 흐름 정의:
          - a: 상품명 확인(코듀로이 볼캡)
          - b: 채널 확인(sms)
          - c: 휴대폰 번호 확인
          - d: OTP 입력
      - 상황: d 단계 질문 중 [runtime: src/app/api/runtime/chat/runtime/otpRuntime.ts][key: otp_stage]
      - 봇 질문: “문자로 전송된 인증번호를 입력해 주세요.”
      - 사용자 답변: “휴대폰 번호를 바꿀래요.”
    
      처리
    
      1. 답변은 OTP가 아니라 c 단계(번호 변경) 의도 힌트. [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts]
      2. 의도 전환 → c 단계로 되돌림 [runtime: src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts]
      3. 확정 유지 범위 = a,b까지만 유지
          - a(상품명), b(채널) 유지 [runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts]
          - c,d 단계 확정값 폐기 [runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
      4. c 질문부터 다시 시작:
          - “휴대폰 번호를 알려주세`요.”

    - 예시 D: 완전히 새로운 의도 등장

      - 흐름: a→b→c→d 진행 중
      - 봇 질문: “문자로 전송된 인증번호를 입력해 주세요.”
      - 사용자 답변: “주문을 취소하고 싶어요.”
    
      처리
    
      1. 기존 흐름과 전혀 다른 의도(주문 취소) 등장 [policy: src/app/api/runtime/chat/policies/intentSlotPolicy.ts]
      2. 이전 흐름 전체 종료 [runtime: src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts]
      3. 확정된 엔티티 전부 폐기 [runtime: src/app/api/runtime/chat/shared/confirmedEntity.ts]
      4. 새 의도 확인 질문 후 새 대화 시작:
          - “주문 취소가 맞나요?” [runtime: src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts]
    
    - 예시 E: 확인 질문에 OTP 코드 답변

      - 상황: restock confirm 단계 [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts]
      - 봇 질문: “상품(코듀로이 볼캡)을 sms로 재입고 알림 신청할까요?”
      - 사용자 답변: “101010”

      처리

      1. “101010”은 의도를 확정할 수 없는 모호한 답변이다.
          - OTP 코드인지, 생년월일인지, 다른 숫자 정보인지 판단 불가 [runtime: src/app/api/runtime/chat/runtime/inputContractRuntime.ts]
      2. 따라서 의도 전환을 하면 안 된다. [contract: 마지막 질문-답변 바인딩]
      3. 직전 질문에 대한 답변을 다시 요청해야 한다.
          - 예: “신청 여부를 확인해야 합니다. 네/아니오로 답해 주세요.” [runtime: src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts]


———

- 대표적 충돌인 OTP와 confirm 충돌 시의 정확한 처리 원칙
  - OTP가 confirm 단계에 끼어드는 상황에서도:
      - OTP 질문에 대한 답변은 OTP 슬롯으로 기록 [runtime: src/app/api/runtime/chat/runtime/otpRuntime.ts][key: expected_input=otp_code]
      - confirm 질문에 대한 답변은 confirm 슬롯으로 기록 [runtime: src/app/api/runtime/chat/runtime/restockPendingRuntime.ts][key: expected_input=confirm]
  - “OTP 질문이 있었으니 confirm 답변도 OTP로 간주”하거나
    “confirm 질문이 있었으니 OTP 답변도 confirm으로 간주”하는 것은 금지. [contract: 마지막 질문-답변 바인딩]
  - 즉, 질문-답변의 연결(바인딩)이 최우선 기준이다. [policy: src/app/api/runtime/chat/policies/principles.ts]

———

- 기술적 개선 방향
  - 현재 derived에 기록하는 런타임(예: 슬롯 도출, 컨텍스트 정리)이 의도-질문-답변의 바인딩을 구조적으로 보존하도록 개선되어야 한다. [runtime: src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts][runtime: src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts]
  - 단발성 패치가 아니라, 서비스 전역 런타임에서 재사용되는 구조로 일반화해야 한다. [policy: src/app/api/runtime/chat/policies/principles.ts]
  - OTP 외에도 다른 의도 충돌(배송/반품/주문변경 등)에서도 동일하게 동작해야 한다. [policy: src/app/api/runtime/chat/policies/principles.ts][runtime: src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts]
