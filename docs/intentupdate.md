# KB 기반 일반 문의(FAQ/정책) 응답 복구 설계서

- 문서 버전: v1.0
- 작성일: 2026-03-11
- 대상 로그: `docs/logs/servicePageLog.md`
- 대상 KB: `docs/logs/kb.txt`

## 1. 배경 및 문제 정의

### 1.1 관측 사실 (로그 기반)
- 사용자 메시지: "신청 시기"
- 런타임 의사결정 흐름에서 `intent`는 `general`로 분류됨.
- 툴(MCP) 호출은 없음(`NO_TOOL_CALLED`).
- 최종 답변은 KB 기반이 아닌 일반 질의 재질문 형태:
  - "어떤 제품이나 서비스에 대해 문의하시는지 알려주시면..."
- 실행 흐름에 `restockPendingRuntime` 및 `restockHandler`가 포함되어 있으나, 실제 응답은 일반 안내로 종료됨.
- 결과적으로 KB에 존재하는 정보(신청기간 등)가 있음에도 답변이 생성되지 않음.

### 1.2 KB 실제 내용 (발췌 기준)
- 신청기간: `2026.03.06(금) 00:00 ~ 2026.03.24(화) 16:00` 까지
- 신청방법: 온라인 접수
- 신청대상: 사업자등록증 미보유, 법인 대표권 없음 (기준일: 2026-01-22)
- 제출서류: 사업계획서 등
- 선정절차: 3단계
- 지원내용: 평균 0.4억원 등
- 문의처: 1357, 공고문 내 주관기관 연락처

### 1.3 문제 정의
- 목표는 "사용자 KB에 적힌 내용으로 답변"인데, 현재는 일반 문의를 "추가 정보 요청"으로만 처리함.
- 이는 `FAQ/정책 질문` 의도를 `general`로 흡수하거나, `KB 매칭` 자체가 런타임 경로에서 실행되지 않기 때문으로 보임.
- 동시에 `[재입고, 배송지 변경]` 흐름은 이미 정교하게 설계되어 있으므로, 일반 KB 응답 기능을 추가할 때 해당 흐름을 훼손하지 않아야 함.

## 2. 목표

1. 사용자 KB에 존재하는 질문(예: "신청 시기")은 **즉시 KB 기반 답변**을 반환한다.
2. `[재입고, 배송지 변경]` 흐름은 기존과 동일하게 동작한다.
3. 재발 방지를 위해 **계약/의도(Contract/Intent) 수준**에서 공통 모델을 확장한다.
4. 단발성 핫픽스가 아닌, **유사한 KB 질문 전반**에 동일하게 적용된다.

## 3. 비목표

- 재입고/배송지 변경의 로직, 정책, 핸들러 내부 동작 변경은 하지 않는다.
- UI 레이아웃/프론트 변경은 포함하지 않는다.
- 외부 MCP 도구 추가/변경은 하지 않는다.

## 4. 설계 원칙 (계약/의도 수준)

1. KB 기반 일반 문의는 `faq` 또는 `kb_info`로 계약 수준에서 명시한다.
2. 계약 변경은 `runtimeStepContracts` 및 기대 입력 로직에 반영되어야 한다.
3. `restock/address_change`와 **우선순위 규칙**을 명확히 두어, 두 흐름이 충돌하지 않게 한다.
4. KB 매칭 성공 시에는 **추가 슬롯 질문을 하지 않는다** (예: "어떤 제품/서비스인지" 같은 질문 금지).
5. 응답 생성은 반드시 **KB 원문 근거**를 기반으로 하며, 모르는 내용은 추정하지 않는다.

## 5. 계약(Contract) 업데이트 설계

### 5.1 Intent 그룹 확장
- 기존 intent 구조에 `faq`를 단순 키워드 기반으로만 결정하지 않고,
  **KB 매칭 결과를 기반으로 `faq`로 승격**하는 규칙을 추가한다.

#### 새로운 계약 필드 (예시)
- `intent_group`: `transactional | kb_info | general`
- `kb_match`: `{ matched: boolean, score: number, key: string, source_kb_id: string }`
- `kb_answerability`: `{ can_answer: boolean, reason: string }`

### 5.2 의도 우선순위 규칙
1. **활성 pending 상태가 있는 경우** (재입고/배송지 변경 등)
   - 해당 pending 흐름이 **최우선**
   - 사용자가 명시적으로 전환 요청("다른 문의", "새 질문") 시에만 전환
2. **명시적인 transactional intent 감지** (재입고/배송지 변경 키워드/슬롯)
   - transactional 흐름 우선
3. **KB 매칭이 확정적일 때**
   - `intent_group = kb_info`, `intent = faq`
4. 그 외
   - 기존 일반 처리 유지

### 5.3 기대 입력(Expectation) 로직 변경
- `kb_match.can_answer === true` 인 경우:
  - `missing_slots = []`
  - `expected_input = null`
  - `ask_action` 호출 금지
- `kb_match` 실패 시:
  - 질문 범위를 KB 범주 내에서 좁히는 질의만 허용
  - 예: "신청기간/신청방법/제출서류 중 무엇이 궁금하신가요?"

## 6. KB 매칭/응답 설계

### 6.1 KB 파싱 규칙 (텍스트 기반)
- KB 문서의 제목(큰 섹션 제목)을 기준으로 블록 분리
- 키-값 구조가 명확한 행(예: "신청기간 ...")은 `key/value`로 추출
- 목록형 항목은 `key` 아래 세부 항목으로 매핑

### 6.2 매칭 규칙
- 입력 문장을 정규화 후, 다음 우선순위로 매칭:
  1. 키워드 직접 포함 매칭 (예: "신청 시기" -> "신청기간")
  2. 동의어 사전 매칭
  3. 섹션 제목 매칭

#### 동의어 예시
- "신청 시기", "신청기간", "접수 기간", "접수 시기" → `신청기간`
- "제출 서류", "필요 서류" → `제출서류`
- "선정 절차", "평가 방법" → `선정절차 및 평가방법`

### 6.3 KB 답변 템플릿 (응답 예시)
- 질문: "신청 시기"
- 답변:
  - 요약: "신청기간은 2026.03.06(금) 00:00부터 2026.03.24(화) 16:00까지입니다."
  - 상세: "온라인 접수로 진행되며, 자세한 내용은 공고문 참조가 필요합니다."
  - 다음 액션: "다른 항목(신청방법/제출서류/선정절차 등)도 안내해 드릴까요?"

## 7. 기존 흐름 보호 설계 (재입고/배송지 변경)

1. **pending 상태 존재 시** KB 응답이 끼어들지 않는다.
2. `restockHandler`, `addressChange` 흐름 내부 로직은 수정하지 않는다.
3. KB 매칭은 **transactional intent가 확정된 경우 실행하지 않는다.**
4. intent 스위칭은 사용자가 명시적으로 요청했을 때만 허용한다.

## 8. 로깅/디버그 설계 (필수 기록)

### 8.1 필수 로그 이벤트
- `KB_MATCH_STARTED`
  - payload: `{ query_text, kb_id, admin_kb_ids }`
- `KB_MATCH_COMPLETED`
  - payload: `{ matched, score, key, reason }`
- `KB_ANSWER_SELECTED`
  - payload: `{ key, source_kb_id, answer_length }`
- `KB_ANSWER_FALLBACK`
  - payload: `{ reason, suggested_keys }`

### 8.2 디버깅 원칙 준수
- 실패 직전/직후 로그 기록
- 5→2→1 단계로 범위 축소 가능하도록
- `F_audit_mcp_tools`, `F_audit_events`, `F_audit_turn_specs`에 기록

## 9. 구현 대상 파일 (화이트리스트 제안)

아래 파일만 수정 가능하며, 이후 작업 전에 사용자 확정 필요.

1. `src/app/api/runtime/chat/runtime/runtimeStepContracts.ts`
2. `src/app/api/runtime/chat/runtime/intentContractRuntime.ts`
3. `src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts`
4. `src/app/api/runtime/chat/runtime/intentScopeGateRuntime.ts`
5. `src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts`
6. `src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts`
7. `src/app/api/runtime/chat/runtime/intentCapabilityRuntime.ts`
8. `src/app/api/runtime/chat/runtime/finalizeRuntime.ts`
9. `src/app/api/runtime/chat/runtime/runtimeSupport.ts`
10. `src/app/api/runtime/chat/runtime/runtimeConversationIoRuntime.ts`
11. `src/app/api/runtime/chat/runtime/runtimeTurnIo.ts`
12. `src/app/api/runtime/chat/policies/intentSlotPolicy.ts`
13. `src/app/api/runtime/chat/policies/lexicon.ts`
14. `src/app/api/runtime/chat/services/dataAccess.ts`
15. `src/app/api/runtime/chat/services/kbMatchRuntime.ts` (신규 생성)

## 10. 실행 정책 (필수 준수, 상세 절차)

### 10.1 수정 전 이해확정 절차
1. 변경 전 현재 요청에 대한 이해 내용을 목록으로 작성한다.
2. 작성된 이해 내용에 대해 사용자에게 확인을 요청한다.
3. 사용자가 "확정"으로 명시적으로 승인한 이후에만 수정에 착수한다.
4. 확정 없이 임의 수정은 절대 금지한다.

### 10.2 변경 기록 및 롤백 보장
1. 변경할 각 파일의 **수정 직전 상태**를 `docs/diff`에 기록한다.
2. 기록 파일에는 원본 경로와 시점을 명시한다.
3. 기록 없이 수정 진행 금지.
4. 필요 시 즉시 롤백 가능한 형태로 저장한다.

### 10.3 확정 범위 외 수정 금지
1. 화이트리스트 파일 이외 수정 금지.
2. 추가 수정이 필요하면 즉시 중단하고 사용자 승인 후 진행.

### 10.4 MCP 테스트 의무
1. 매 실행마다 `supabase` MCP와 `chrome-devtools` MCP로 동작 확인.
2. DB 수정이 필요한 경우에는 SQL을 제시하고 사용자가 직접 실행한다.
3. 테스트 수행/결과는 문서 하단 체크리스트와 테스트 기록에 남긴다.

## 11. 테스트 계획 (필수)

### 11.1 Chrome-devtools 테스트
- 위젯에서 다음 질문을 입력해 동작 확인:
  - "신청 시기"
  - "신청기간 알려줘"
  - "제출 서류 뭐야?"
  - "선정 절차 어떻게 돼?"
- 기대 결과:
  - 각 질문에 대해 KB에 있는 내용 그대로 응답
  - 재입고/배송지 변경 플로우는 동일하게 동작

### 11.2 Supabase 조회 검증 (읽기 전용)
- 목적: KB 매칭 이벤트 및 응답 기록 확인
- 예시 쿼리 (읽기 전용, 필요 시 조정):

```sql
select id, event_name, payload, created_at
from F_audit_events
where event_name in ('KB_MATCH_STARTED','KB_MATCH_COMPLETED','KB_ANSWER_SELECTED','KB_ANSWER_FALLBACK')
order by created_at desc
limit 50;
```

```sql
select turn_id, debug, created_at
from F_audit_turn_specs
order by created_at desc
limit 20;
```

## 12. 테스트 기록 (작성 시 기입)

- Chrome-devtools 테스트: 미수행
- Supabase 테스트: 미수행
- 사유: 설계 문서 작성 단계

## 13. 변경 후 기대 효과

- "신청 시기" 같은 일반 KB 질문이 즉시 응답된다.
- 재입고/배송지 변경 흐름은 기존과 동일한 경로로 실행된다.
- KB 기반 일반 문의가 지속적으로 확장 가능하다.

## 14. 오픈 질문

- KB 매칭 임계값을 어디에 두는 것이 적절한가?
- 관리자 KB와 사용자 KB의 우선순위를 어떻게 둘 것인가?

---

문서 끝.
