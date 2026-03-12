# KB 기반 의도 분류 + LLM KB 응답 설계서

- 문서 버전: v1.4
- 작성일: 2026-03-11
- 최종 수정일: 2026-03-12
- 대상 로그: `docs/logs/servicePageLog.md`, `docs/logs/servicePageLog(bot-20260312-0847).md`, `docs/logs/servicePageLog(bot-20260312-0911).md`
- 대상 KB: `docs/logs/kb.txt`

## 1. 배경 및 문제 정의

### 1.1 핵심 관측 (로그 기반)
- KB가 전달되어도 답변이 나오지 않음.
- 의도 분류 결과가 `general`로 남아 있고, 일반 재질문으로 종료됨.
- KB 매칭 실패 또는 KB 답변 경로 부재로 인해 LLM이 KB를 읽고 답변하는 단계가 없음.
- 재입고/배송지 변경은 현재 정상 동작하며, 반드시 유지되어야 함.

### 1.2 KB 실제 내용 (요약)
- 신청기간: 2026.03.06(금) 00:00 ~ 2026.03.24(화) 16:00
- 신청방법: 온라인 접수
- 신청대상: 사업자등록증 미보유, 법인 대표권 없음 (기준일: 2026-01-22)
- 제출서류: 사업계획서 등
- 선정절차: 3단계
- 지원내용: 평균 0.4억원 등
- 문의처: 1357, 공고문 내 주관기관 연락처

### 1.3 문제 정의
- KB가 전달되더라도 답변이 나오지 않는 구조는 “의도 분류 → 지원 흐름 라우팅 → 미지원 의도는 KB 기반 LLM 답변” 단계가 부재하기 때문이다.
- 따라서 단순 KB 매칭 보강이 아니라, 런타임 계약과 라우팅 구조 자체를 변경해야 한다.

## 2. 목표

1. 사용자 입력의 의도를 분류하고, 지원되는 흐름이면 해당 플로우로 연결한다.
2. 지원되지 않는 의도는 **LLM이 KB를 읽고 답변**하도록 한다.
3. 재입고/배송지 변경 흐름은 기존과 동일하게 동작한다.
4. 계약/의도 수준에서 설계를 반영해 유사한 KB 질문 전반에 일반화한다.

## 3. 비목표

- 재입고/배송지 변경 핸들러 내부 로직 변경은 하지 않는다.
- UI 레이아웃/프론트 변경은 포함하지 않는다.
- 외부 MCP 도구 추가/변경은 하지 않는다.

## 4. 설계 원칙 (의도 라우팅 중심)

- 의도 분류 후, **미리 설계된 처리 흐름(재입고/배송지 변경 등)**과 일치하면 그 흐름을 파괴하지 않고 그대로 실행한다.
- 지원 흐름이 없으면 **LLM이 KB를 읽고 답변**한다.
- KB 답변은 “추정”이 아니라 **KB에 근거한 응답만 허용**한다.
- KB에 근거가 없으면 “KB에 해당 정보 없음”을 명시하고, KB 범위 내에서 재질문한다.
- 재입고/배송지 변경의 pending 상태가 있으면 **해당 흐름을 그대로 실행**한다.

## 5. 의도 라우팅 설계 (핵심 변경)

### 5.1 Intent Router 계약 필드
- `intent_candidates`: `{ intent: string; score: number }[]`
- `intent_selected`: `{ intent: string; reason: string }`
- `intent_route`: `"transactional" | "kb_answer" | "general"` (여기서 `"transactional"`은 **미리 설계된 처리 흐름을 그대로 실행**하는 경로를 의미한다)
- `"transactional"`: 재입고/배송지 변경 등 이미 설계된 처리 흐름 실행
- `kb_answer`: KB 기반 LLM 답변
- `general`: 일반 재질문/일반 응답
- `kb_answerability`: `{ can_answer: boolean; reason: string; evidence_keys: string[] }`

### 5.2 라우팅 규칙 (결정 순서)
1. pending 상태(재입고/배송지 변경 등)가 있으면 **해당 흐름을 파괴하지 않고 그대로 실행**한다. (`intent_route` 값은 `"transactional"`)
2. 재입고/배송지 변경 등 **처리 흐름 의도**가 명시적으로 감지되면 그 처리 흐름을 그대로 실행한다. (`intent_route` 값은 `"transactional"`)
3. 그 외는 `kb_answer`로 라우팅한다.
4. `kb_answer`에서 KB가 비어 있거나 근거가 없으면 `general`로 전환하고 KB 범주 내 재질문을 한다.

## 6. KB LLM 답변 설계

### 6.1 KB 컨텍스트 구성
- KB는 항상 LLM 입력에 포함한다.
- KB 크기가 큰 경우에는 `kb_match`로 상위 섹션을 추출해 전달한다.
- `kb_match`는 라우팅의 게이트가 아니라 **컨텍스트 축소용**이다.
- `kb_match`는 섹션 키뿐 아니라 **본문 기반 매칭**으로도 근거를 찾는다.

### 6.1.1 본문 기반 매칭 절차 (일반화된 방식)
1. KB를 제목/섹션/문단 단위로 분할한다.
2. 사용자 질문에서 핵심 키워드를 추출하고(명사/시간/조건), KB 본문과의 유사도를 계산한다.
3. 키워드 중복률 + BM25 또는 임베딩 유사도 중 1개 이상을 사용해 점수를 계산한다.
4. 상위 N개(또는 임계치 이상) 문단을 병합해 LLM 컨텍스트로 전달한다.

### 6.2 LLM 프롬프트 계약
- 시스템 프롬프트에 “KB에 없는 정보는 답하지 않는다”를 명시한다.
- 사용자 질문에 대해 KB 근거가 있으면 답변한다.
- 근거가 없으면 “KB에 해당 정보 없음”을 출력하고, KB 내 항목(신청기간/제출서류 등) 중 선택형 재질문을 한다.

### 6.3 답변 품질 보장
- 답변에는 사용한 KB 섹션 키를 디버그 로그에 기록한다.
- 최종 응답은 간결하게 하되, 날짜/수치/조건은 정확히 반영한다.

## 7. 기존 흐름 보호 설계 (재입고/배송지 변경)

- pending 상태 존재 시 KB 답변 경로로 이동하지 않는다.
- 재입고/배송지 변경 등 **처리 흐름 의도**가 확정되면 해당 흐름을 그대로 실행하고 KB 답변 경로를 차단한다.
- 일반 재질문 경로는 KB 답변이 불가능할 때만 사용하며, 처리 흐름이 확정된 경우에는 적용하지 않는다.

## 8. 로깅/디버그 설계 (필수 기록)

- `INTENT_ROUTED`
- `KB_MATCH_STARTED`
- `KB_MATCH_COMPLETED`
- `KB_LLM_PROMPT_BUILT`
- `KB_LLM_ANSWER_READY`
- `KB_LLM_ANSWER_EMPTY`
- `KB_INPUT_MISMATCH`

각 이벤트 payload에 다음을 포함한다.
- `intent_route`, `intent_selected`, `kb_context_size`, `kb_evidence_keys`, `answerability_reason`

## 9. 구현 대상 파일 (화이트리스트 제안)

아래 파일만 수정 가능하며, 이후 작업 전에 사용자 확정 필요.

1. `src/app/api/runtime/chat/runtime/runtimeStepContracts.ts`
2. `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`
3. `src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts`
4. `src/app/api/runtime/chat/runtime/finalizeRuntime.ts`
5. `src/app/api/runtime/chat/services/kbMatchRuntime.ts`
6. `src/app/api/runtime/chat/services/kbAnswerRuntime.ts` (신규)

## 10. 실행 정책 (필수 준수, 상세 절차)

### 10.1 수정 전 이해확정 절차
1. 변경 전 현재 요청에 대한 이해 내용을 목록으로 작성한다.
2. 작성된 이해 내용에 대해 사용자에게 확인을 요청한다.
3. 사용자가 "확정"으로 명시적으로 승인한 이후에만 수정에 착수한다.
4. 확정 없이 임의 수정은 절대 금지한다.

### 10.2 변경 기록 및 롤백 보장
1. 변경할 각 파일의 수정 직전 상태를 `docs/diff`에 기록한다.
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
- 위젯에서 다음 질문을 입력해 동작 확인한다.
- "신청 시기"
- "제출 서류 뭐야?"
- "선정 절차 어떻게 돼?"
- 기대 결과: KB 내용이 LLM 응답에 반영되어 즉시 답변된다.

### 11.2 Supabase 조회 검증 (읽기 전용)

```sql
select id, event_type, payload, created_at
from "F_audit_events"
where event_type in (
  'INTENT_ROUTED',
  'KB_MATCH_STARTED',
  'KB_MATCH_COMPLETED',
  'KB_LLM_PROMPT_BUILT',
  'KB_LLM_ANSWER_READY',
  'KB_LLM_ANSWER_EMPTY',
  'KB_INPUT_MISMATCH'
)
order by created_at desc
limit 50;
```

## 12. 테스트 체크리스트

- [x] Chrome-devtools: `http://localhost:3000/` 위젯에서 질문 "제출서류 뭐야?" 실행 (KB 응답 실패 확인)
- [x] Chrome-devtools: `http://localhost:3000/` 위젯에서 질문 "신청방법 알려줘" 실행 (요청 실패 확인)
- [x] Supabase: `"F_audit_events"`에서 `session_id` 기반 로그 확인
- [x] Chrome-devtools: `/embed` 정책 탭에 `kb.txt` 입력 후 질문 "신청 시기는 언제야?" 실행 (KB 응답 성공 확인)
- [x] Chrome-devtools: `http://localhost:3000/` 위젯 프리필 KB로 질문 "볼캡 재입고" 실행 (재입고 흐름 정상 확인)
- [x] Supabase: `session_id=aa6c2056-7bd4-46d1-a0ae-9133d2734ec5` 이벤트 확인 (`KB_MATCH_COMPLETED matched=true`)

## 13. 테스트 기록

- 2026-03-11 Chrome-devtools (`http://localhost:3000/`, 위젯 `/embed`) 질문 "제출서류 뭐야?" -> "제출서류에 관한 내용은 KB에 없습니다..." 응답, KB 입력란은 `kb.txt` 내용이지만 "적용" 버튼 비활성, `session_id`=`06ddb19e-566f-4141-80bd-d81ebab24af3`, "대화 복사" 클릭
- 2026-03-11 Chrome-devtools (`http://localhost:3000/`, 위젯 `/embed`) 질문 "신청방법 알려줘" -> "요청에 실패했습니다. 잠시 후 다시 시도해 주세요." 응답, `session_id` 동일(`06ddb19e-566f-4141-80bd-d81ebab24af3`)
- 2026-03-11 Supabase (`"F_audit_events"` 조회) `session_id`=`06ddb19e-566f-4141-80bd-d81ebab24af3` -> 신규 요청 로그는 확인되지 않음 (요청 실패로 인해 이벤트 미생성 가능)
- 2026-03-11 Supabase (`"F_audit_events"` 조회) `session_id`=`06ddb19e-566f-4141-80bd-d81ebab24af3` -> `INTENT_ROUTED`에서 `intent_route="kb_answer"`, `KB_MATCH_COMPLETED` `matched=false`, `KB_LLM_PROMPT_BUILT`에 `kb_topics=["재입고"]`, `kb_context_size=43` 기록

- 2026-03-11 Chrome-devtools (/embed) 질문 "제출 서류 뭐야?" -> `POST /api/widget/chat` 401 (`INVALID_WIDGET_TOKEN`), UI "요청에 실패했습니다" 노출
- 2026-03-11 Chrome-devtools (/embed) 질문 "선정 절차 어떻게 돼?" -> "선정 절차에 대한 정보는 KB에 없습니다..." 응답, `inline_kb`는 재입고 샘플(`재입고 - 코듀로이 볼캡 7/5 ...`), `session_id`=`bf1a62c5-41f8-4661-9b78-6b1a5aa96a13`, `has_setup_fields=false`, KB 주제는 `재입고`만 포함
- 2026-03-11 Supabase (`"F_audit_events"` 조회) `session_id`=`bf1a62c5-41f8-4661-9b78-6b1a5aa96a13` -> 이벤트 `INTENT_ROUTED`, `KB_LLM_PROMPT_BUILT`, `KB_LLM_ANSWER_READY`, `FINAL_ANSWER_READY`, `KB_LLM_PROMPT_BUILT`에 `kb_topics=["재입고"]`, `kb_context_size=43`, `KB_NO_MATCH` 기록 (초기 `F_audit_events` + `event_name` 쿼리 실패 후 `"F_audit_events"` + `event_type`로 조회 성공)
- 2026-03-12 Chrome-devtools (`/embed` 정책 탭) `kb.txt` 입력 후 질문 "신청 시기는 언제야?" -> 응답 "신청기간은 2026.03.06(금) 00:00부터 2026.03.24(화) 16:00까지", 요청 payload `inline_kb`에 KB 전체 포함, `session_id`=`aa6c2056-7bd4-46d1-a0ae-9133d2734ec5`
- 2026-03-12 Chrome-devtools (`http://localhost:3000/` 위젯 iframe) 질문 "볼캡 재입고" -> 재입고 흐름 정상(예정일/퀵리플라이), 요청 payload `inline_kb`에 재입고 샘플 포함, `session_id`=`249fbeef-d9cb-4e7d-ab12-faf840064015`
- 2026-03-12 Supabase (`"F_audit_events"` 조회) `session_id`=`aa6c2056-7bd4-46d1-a0ae-9133d2734ec5` -> `KB_MATCH_STARTED(kb_id="__INLINE_KB__")`, `KB_MATCH_COMPLETED(matched=true, source_kb_id="__INLINE_KB__")`, `KB_LLM_PROMPT_BUILT(kb_context_size=1077, evidence_keys=["신청기간","신청방법 및 대상"])`, `KB_LLM_ANSWER_READY`, `FINAL_ANSWER_READY` 확인

## 14. 변경 후 기대 효과

- KB가 전달되면 LLM이 KB를 읽고 답변한다.
- 재입고/배송지 변경 흐름은 동일하게 유지된다.
- KB 질문은 일반화된 의도 라우팅과 답변 계약으로 재발 방지된다.

## 15. 오픈 질문

- KB 크기 증가 시 컨텍스트 축소 전략(섹션 선택) 기준은 무엇이 적절한가?
- KB 근거 부족 시 재질문 형식(선택형 vs 자유형)을 어떻게 고정할 것인가?

## 16. KB 런타임 주입 보장 설계 (DB 미등록 KB 포함)

### 16.1 목표
1. 사용자 입력의 의도를 분류하고, 재입고/배송지 변경 등 **이미 설계된 처리 흐름과 일치하면 그 흐름을 파괴하지 않고 그대로 실행**한다.
2. 처리 흐름이 없는 의도는 **LLM이 KB를 읽고 답변**한다.
3. KB 답변은 **KB 근거가 있을 때만** 허용하며, 근거가 없으면 “KB에 해당 정보 없음”을 명시하고 KB 범주 내 재질문을 한다.
4. pending 상태 또는 처리 흐름 의도가 확정된 경우 KB 답변 경로는 차단하고 기존 흐름을 그대로 유지한다.
5. 계약/의도 수준의 라우팅으로 유사한 KB 질문 전반에 일반화한다.
6. DB에 등록되지 않은 “사용자 KB 입력란”의 내용도 런타임에서 **1차 KB로 즉시 주입**되어 사용된다.
7. 주입된 KB의 출처/크기/근거 키가 로그로 확인 가능해야 한다.

### 16.2 현재 식별된 문제 (로그 근거)
- `KB_LLM_PROMPT_BUILT.kb_topics=["재입고"]`, `kb_context_size=43` 반복 → 사용자 KB가 아니라 샘플 KB가 사용됨.
- `KB_MATCH_COMPLETED matched=false`, `evidence_keys=[]`, `KB_LLM_ANSWER_EMPTY reason=KB_NO_MATCH` 반복.
- `/embed` 요청 실패/토큰 오류로 이벤트 미생성 또는 KB 적용 검증 불가.
- 결과적으로 사용자 KB 입력이 있어도 런타임에서 매칭/근거 생성이 불가능한 상태.

### 16.2.1 KB 주입 확인 최소 체크 지점 (로그 중심)
1. 요청 payload에 `inline_kb`가 존재하고 길이가 0보다 큰지 확인한다.
2. `KB_MATCH_STARTED.kb_id`가 `__INLINE_KB__`인지 확인한다.
3. `KB_LLM_PROMPT_BUILT.kb_context_size`가 비정상적으로 작지 않은지 확인한다.
4. `KB_LLM_PROMPT_BUILT.kb_topics`에 질문과 관련된 핵심 키가 포함되는지 확인한다.
5. `KB_MATCH_COMPLETED.source_kb_id`가 `__INLINE_KB__`인지 확인한다.
6. `KB_LLM_ANSWER_READY.evidence_keys`가 비어 있지 않은지 확인한다.
7. 위 조건 중 하나라도 실패하면 `KB_INPUT_MISMATCH` 로그를 기록한다.

### 16.3 목표 달성을 위해 실행할 사항 (계약/흐름)
- 런타임 입력 계약: 요청 payload에 `inline_kb`가 있으면 DB KB를 대체하여 1차 KB로 사용한다. 저장 여부와 무관하게 즉시 적용한다.
- 주입 검증 로그: `KB_MATCH_STARTED`, `KB_LLM_PROMPT_BUILT`에 `kb_source=inline_input|admin`, `kb_context_size`, `kb_topics`를 반드시 기록한다.
- 주입 실패 감지: `inline_kb`가 있는데 `kb_topics`가 샘플과 동일하거나 `kb_context_size`가 비정상적으로 작으면 `KB_INPUT_MISMATCH` 로그를 기록하고 사용자에게 KB 재입력을 유도한다.
- 근거 기반 답변: `KB_MATCH_COMPLETED matched=true`일 때만 KB 답변을 허용하고 `evidence_keys`를 기록한다.
- 미리 설계된 처리 흐름 보존: 해당 의도가 감지되면 KB 경로로 이동하지 않도록 기존 흐름을 보존한다.
- 입력 전달 보장: ConversationSetupPanel의 “사용자 KB 입력란” 값은 저장 여부와 무관하게 **현재 대화 요청의 `inline_kb`로 즉시 전달**된다.
- 탭/컨텍스트 동기화: 정책 입력 탭과 대화 탭이 분리된 경우, 동일 세션 단위로 `inline_kb`를 공유하여 전달 누락을 방지한다.

---

문서 끝.
