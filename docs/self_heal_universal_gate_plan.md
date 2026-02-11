# Self-Heal 보편적 자동 검증 설계 + 구현 체크리스트 (정밀 버전)

이 문서는 **낮은 수준의 LLM에게 공유해도 그대로 구현 가능한 수준**으로 작성된 실행 문서다.
목표는 “의도/계약 기반 설계”를 기본으로 유지하면서도 **예외(케이스별 하드코딩)를 허용**하고,
예외가 **누적되지 않고 계약으로 승격**되도록 만드는 것이다.

---

## 0) 범위와 비범위

### 범위
- 모든 self-heal proposal에 대해 **보편적 자동 검증 게이트**를 적용한다.
- proposal을 **Contract-First** 또는 **Case-Specific 예외**로 자동 분류한다.
- 예외 proposal은 **승격 계획 및 만료 조건이 필수**가 되도록 한다.
- 예외 누적 시 **promotion_required** 플래그를 자동으로 생성한다.
- UI와 “제안 복사”에 gate 결과를 표시한다.

### 비범위
- 자동 패치 적용(approve+apply)은 이번 범위에 포함하지 않는다.
- 런타임 실행 로직 변경(예: 실제 주소 처리 흐름 변경)은 포함하지 않는다.

---

## 1) 용어 정의

- Contract-First: 의도/계약 기반 해결책이 1차 해결책인 proposal
- Case-Specific Exception: 단일 케이스에 대한 하드코딩 기반 해결책이 포함된 proposal
- Evidence Contract: 원칙별로 **반드시 수집해야 하는 증거 필드 목록**
- Self-Heal Gate: proposal을 자동 분류하고 누락/취약점을 기록하는 보편적 검증 단계
- Promotion: 예외 proposal이 반복될 경우 계약 기반 해결책으로 승격되는 정책

---

## 2) 목표 상태 (10점 기준)

- 모든 proposal에 대해 Self-Heal Gate 결과가 저장된다.
- proposal은 자동으로 Contract-First 또는 Exception 트랙으로 분류된다.
- Exception 트랙은 **예외 사유/범위/만료/승격 계획**이 없으면 **경고 상태**로 기록된다.
- 동일 예외가 반복되면 promotion_required가 자동으로 활성화된다.
- Evidence Contract 누락이 자동 기록되고 UI/복사 텍스트에 포함된다.

---

## 2.1) 고정 결정값 (문서만 보고도 그대로 구현할 수 있는 값)

이 섹션은 **구현 시 반드시 그대로 적용**해야 하는 고정값이다.

- 승격 기준(예외 누적 방지)
  - `repeat_count_7d >= 2` 이면 `promotion_required = true`
  - `repeat_count_30d >= 3` 이면 `promotion_required = true`
  - 예외 만료 기준(선택): `exception_expiry`가 명시되지 않은 경우 `created_at + 30일`로 자동 설정

- 예외 통계 조회 소스
  - 테이블: `F_audit_events`
  - 조건: `event_type = RUNTIME_PATCH_PROPOSAL_CREATED`
  - 필터: payload 내 `self_heal_gate.exception_fingerprint`가 현재 fingerprint와 동일한 항목
  - 조회 기간: 30일(최근 7일/30일 카운트 모두 필요)

- Evidence Contract 매핑 우선순위
  - `principle_key` 기반 매핑 우선
  - 없을 경우 `violation_key` 기반 매핑
  - 둘 다 없으면 빈 목록 반환

- Case-Specific 신호 판정 (아래 중 1개라도 true면 Exception 트랙)
  - `target_files`가 1개 이하이고 파일 경로가 `/handlers/` 또는 `/runtime/` 하위 단일 파일인 경우
  - `suggested_diff`에 상수 하드코딩 패턴 존재:
    - `if (.*==.*)` 또는 `switch` 특정 값 분기
    - 문자열/ID/숫자 리터럴을 직접 비교하는 분기
  - `change_plan`에 아래 키워드가 포함될 경우:
    - `특정 케이스`, `예외 처리`, `하드코딩`, `only this case`
  - violation evidence에 `reject_case_specific_primary_fix=true`가 포함된 경우

- DB 스키마 변경 금지
  - 신규 테이블/컬럼 추가 없이 **proposal payload에만 확장 필드**를 추가한다.

- UI 표시 위치 (정확한 위치/표현 고정)
  - Proposal 카드 상단 배지 옆에 `Contract` / `Exception` 배지 표시
  - `promotion_required=true`이면 배지 옆에 `승격 필요` 텍스트 표시
  - 상세 보기(accordion)에 `self_heal_gate` JSON 블록 표시

---

## 3) 데이터 스키마

### 3.1 self_heal_gate (proposal payload에 포함)

```json
{
  "track": "contract" | "exception",
  "gate_version": "v1",
  "contract_fields_ok": true,
  "exception_fields_ok": false,
  "evidence_contract_ok": true,
  "case_specific_signals": ["single_target_file", "hardcoded_constant"],
  "missing_contract_fields": ["contract_scope"],
  "missing_exception_fields": ["exception_expiry"],
  "missing_evidence_fields": ["tool_name", "request_fields"],
  "promotion_required": false,
  "promotion_reason": "repeat_count_30d>=3",
  "exception_fingerprint": "ex:contract_first:api.alignConversationAndToolContracts:request_base_detail_unseparated",
  "exception_stats": {
    "repeat_count_7d": 1,
    "repeat_count_30d": 2
  }
}
```

### 3.2 예외 트랙 필수 필드 (proposal payload 최상단)

```json
{
  "exception_reason": "why contract-first is not possible now",
  "exception_scope": "where this hotfix applies",
  "exception_expiry": "2026-04-01" | "issue_count>=20" | "metric:repeat_count_30d>=5",
  "promotion_plan": "how to generalize into contract-first",
  "promotion_trigger": "repeat_count_30d>=3",
  "blast_radius": "impact scope (users/tools/intents)"
}
```

### 3.3 Contract-First 필수 필드 (proposal payload 최상단)

```json
{
  "contract_scope": "slot_request_response_semantic_contract",
  "generalization_scope": "all_tools_with_same_semantic_mismatch_class",
  "slot_request_mapping_strategy": "semantic_units_contract_mapping",
  "response_projection_strategy": "contract_preserving_projection",
  "pre_post_invariant_strategy": "deterministic_contract_invariants_before_after_tool_call",
  "contract_expectation": "address1=base, address2=detail"
}
```

---

## 4) Evidence Contract 정의

`src/app/api/runtime/governance/selfHeal/principles.ts`의 `evidenceContract`를 실제로 반환한다.
모든 원칙별로 **필수 evidence 필드 목록**을 유지한다.

예시 (실제 파일에서 확장)

```ts
requiredContractMismatchEvidence: [
  "tool_name",
  "mismatch_type",
  "resolved_fields",
  "request_fields",
  "response_fields",
  "contract_expectation"
]
```

---

## 5) Self-Heal Gate 알고리즘 (보편적 자동 검증)

### 5.1 Gate 입력
- proposal (buildPatchProposal 결과)
- violation (detector 결과)
- evidenceContract
- exceptionStats (예외 반복 횟수; optional)

### 5.2 Gate 처리 순서 (의사코드)

```ts
function buildSelfHealGate({ proposal, violation, evidenceContract, exceptionStats }) {
  const caseSpecificSignals = detectCaseSpecificSignals(proposal);
  const contractMissing = requiredContractFields.filter(missingInProposal);
  const exceptionMissing = requiredExceptionFields.filter(missingInProposal);
  const evidenceMissing = requiredEvidenceFieldsForPrinciple.filter(missingInEvidence);

  const track = caseSpecificSignals.length > 0 ? "exception" : "contract";

  const promotionRequired = computePromotionRequired(exceptionStats);
  const promotionReason = promotionRequired ? "repeat_count_30d>=3" : "-";

  return {
    track,
    gate_version: "v1",
    contract_fields_ok: contractMissing.length === 0,
    exception_fields_ok: exceptionMissing.length === 0,
    evidence_contract_ok: evidenceMissing.length === 0,
    case_specific_signals: caseSpecificSignals,
    missing_contract_fields: contractMissing,
    missing_exception_fields: exceptionMissing,
    missing_evidence_fields: evidenceMissing,
    promotion_required: promotionRequired,
    promotion_reason: promotionReason,
    exception_fingerprint: computeExceptionFingerprint(proposal, violation),
    exception_stats: exceptionStats || { repeat_count_7d: 0, repeat_count_30d: 0 }
  };
}
```

### 5.3 Case-Specific 신호 (휴리스틱)
아래 신호 중 1개라도 있으면 Exception 트랙으로 분류한다.
- target_files가 1개 이하이고, 해당 파일이 단일 도메인 핸들러로 제한됨
- suggested_diff에 특정 상수/ID/문자열을 하드코딩하는 패턴이 존재함
- change_plan에 “특정 케이스만 처리”, “if (id==...)” 등 제한적 문구가 존재함
- violation evidence에 `reject_case_specific_primary_fix=true`가 포함됨

### 5.4 Exception 승격 정책
- repeat_count_30d >= 3 → promotion_required=true
- repeat_count_7d >= 2 → promotion_required=true
- exception_expiry를 넘기면 promotion_required=true

---

## 5.5 Case-Specific 신호 판정 규칙 (정확한 정규식)

아래 규칙은 그대로 구현한다. 하나라도 true면 `case_specific_signals`에 추가한다.

1. 단일 타깃 파일 신호
- `target_files.length <= 1` 이고
- `target_files[0]`가 `/handlers/` 또는 `/runtime/` 경로를 포함하면 신호 발생

2. 하드코딩 분기 신호 (suggested_diff에서 검사)
- 아래 정규식을 사용한다:
- `HARD_CODED_BRANCH_REGEX = /\b(if|else if)\s*\([^\)]*([=!]==?|===)\s*(["'`][^"'`]+["'`]|\d+)\s*\)/`
- `SWITCH_LITERAL_REGEX = /\bswitch\s*\([^\)]*\)\s*\{[^}]*\bcase\s+(["'`][^"'`]+["'`]|\d+)\s*:/s`

3. change_plan 키워드 신호
- `change_plan` 전체를 소문자로 병합해 다음 키워드 포함 여부 확인
- 키워드: `특정 케이스`, `예외 처리`, `하드코딩`, `only this case`

4. evidence 기반 신호
- `violation.evidence.reject_case_specific_primary_fix === true`이면 신호 발생

---

## 5.6 exception_expiry 파싱 규칙 (정확한 규칙)

허용 형식은 아래 4가지로 제한한다.
1. ISO 날짜: `YYYY-MM-DD`
2. 이슈 수 기준: `issue_count>=N`
3. 7일 반복 기준: `metric:repeat_count_7d>=N`
4. 30일 반복 기준: `metric:repeat_count_30d>=N`

처리 규칙
- 값이 없으면 기본값 `created_at + 30일`
- ISO 날짜이면 현재 시간과 비교하여 만료 여부 판단
- issue_count는 `repeat_count_30d`와 동일하게 판단
- metric:repeat_count_7d/30d는 해당 카운트와 비교
- 형식 불일치 시 `exception_fields_ok=false` AND `promotion_required=true` 로 강제 설정

---

## 5.7 missingInProposal / missingInEvidence 정의

다음 기준을 그대로 사용한다.
- 값이 `null` 또는 `undefined` 이면 missing
- 문자열은 `trim()` 결과가 빈 문자열이면 missing
- 배열은 길이가 0이면 missing
- 객체는 키가 0개이면 missing
- 숫자는 `Number.isFinite(value)`가 false이면 missing


## 6) 예외 누적 방지/승격 설계

### 6.1 예외 fingerprint
- proposal과 violation을 기반으로 **안정적인 문자열** 생성

예시

```
ex:<principle_key>:<violation_key>:<mismatch_type>:<tool_name>
```

### 6.1.1 fingerprint 생성 규칙 (고정)
- `principle_key = String(violation.principle_key || "-")`
- `violation_key`는 아래 규칙으로 결정한다.
  - `violation.violation_key`가 있으면 그 값을 사용
  - 없으면 `violation.violation_id`에서 `pv_<session>_<turn>_` prefix를 제거한 나머지 문자열을 사용
  - 위 조건이 모두 실패하면 `"-"` 사용
- `mismatch_type = String(violation.evidence?.mismatch_type || "-")`
- `tool_name = String(violation.evidence?.tool_name || "-")`
- 모든 필드에 대해 `trim().toLowerCase()` 적용
- 공백은 `_`로 치환
- 최종 포맷: `ex:${principle_key}:${violation_key}:${mismatch_type}:${tool_name}`

### 6.2 예외 통계 로딩
- proposal 생성 시점에 동일 fingerprint를 가진 과거 proposal 수를 조회한다.
- 조회는 `F_audit_events`에서 `event_type=RUNTIME_PATCH_PROPOSAL_CREATED`를 대상으로 수행한다.
- payload 내 `self_heal_gate.exception_fingerprint`가 같으면 카운트한다.
- 기간 구분:
  - 최근 7일 카운트(`repeat_count_7d`)
  - 최근 30일 카운트(`repeat_count_30d`)
- 조회 결과를 `exception_stats`로 저장한다.

---

## 6.3 예외 통계 조회 예시 (Supabase JS, Node)

```ts
const now = new Date();
const since7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
const since30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

const { data: rows7d } = await supabase
  .from("F_audit_events")
  .select("id, payload, created_at")
  .eq("event_type", "RUNTIME_PATCH_PROPOSAL_CREATED")
  .gte("created_at", since7d);

const { data: rows30d } = await supabase
  .from("F_audit_events")
  .select("id, payload, created_at")
  .eq("event_type", "RUNTIME_PATCH_PROPOSAL_CREATED")
  .gte("created_at", since30d);

const repeat_count_7d = (rows7d || []).filter((row) => {
  const gate = (row.payload || {}).self_heal_gate || {};
  return gate.exception_fingerprint === fingerprint;
}).length;

const repeat_count_30d = (rows30d || []).filter((row) => {
  const gate = (row.payload || {}).self_heal_gate || {};
  return gate.exception_fingerprint === fingerprint;
}).length;
```

---

## 7) 구현 단계 (파일별 상세 지침)

### 7.1 `src/app/api/runtime/governance/selfHeal/principles.ts`
- evidenceContract를 실제로 반환하도록 확장한다.
- Contract-First 필수 필드 목록과 Exception 필수 필드 목록을 명시한다.

### 7.2 `src/app/api/runtime/governance/_lib/selfHealGate.ts` (신규)
- 다음 함수를 구현한다.
  - `detectCaseSpecificSignals(proposal)`
  - `computeExceptionFingerprint(proposal, violation)`
  - `computePromotionRequired(exceptionStats, exceptionExpiry)`
  - `buildSelfHealGate(...)`

### 7.3 `src/app/api/runtime/governance/_lib/proposer.ts`
- `buildPatchProposal` 반환 직후 `buildSelfHealGate`를 호출한다.
- proposal payload에 `self_heal_gate`를 삽입한다.

### 7.4 `src/app/api/runtime/governance/review/route.ts`
- proposal 생성 전에 `exceptionStats`를 조회하여 `buildPatchProposal`에 전달한다.
- 동일하게 runtimeTurnIo/reassess 경로에도 적용한다.

### 7.5 `src/app/api/runtime/governance/proposals/route.ts`
- response에 `evidenceContract`를 실제로 포함한다.

### 7.6 `src/components/settings/ProposalSettingsPanel.tsx`
- gate 결과를 카드에 표시한다.
- “제안 복사” 텍스트에 gate 결과, suggested_diff, confidence, evidenceContract를 포함한다.

---

## 7.7 Contract/Exception 필드 누락 시 처리 규칙 (고정)
- Contract 트랙인데 필수 계약 필드가 누락되어도 **차단하지 않음**
  - `self_heal_gate.contract_fields_ok=false`로 기록
- Exception 트랙인데 예외 필드가 누락되어도 **차단하지 않음**
  - `self_heal_gate.exception_fields_ok=false`로 기록
- Evidence Contract 누락 시 **차단하지 않음**
  - `self_heal_gate.evidence_contract_ok=false`로 기록
- 단, `promotion_required=true`가 되면 UI에서 명시적으로 강조 표시

---

## 8) 테스트 체크리스트

### 8.1 유닛 테스트
- Contract-First proposal → `track=contract`로 분류되는지 확인
- Case-Specific proposal → `track=exception`으로 분류되는지 확인
- 예외 필드 누락 시 warning이 기록되는지 확인

### 8.2 통합 테스트
- 동일 fingerprint가 반복될 때 promotion_required가 true로 변하는지 확인
- evidenceContract 누락 시 gate에서 missing_evidence_fields가 기록되는지 확인

---

## 9) 완료 기준

- 모든 proposal에 `self_heal_gate`가 포함된다.
- Contract/Exception 트랙이 자동 분류된다.
- 예외는 승격 정책에 따라 promotion_required가 설정된다.
- evidenceContract 누락이 기록되고 UI/복사 텍스트에 포함된다.

---

## 10) 체크리스트 (최종 실행용)

- [ ] evidenceContract 정의 및 반환
- [ ] selfHealGate 신규 구현
- [ ] proposer.ts에 gate 적용
- [ ] review/reassess/runtimeTurnIo 경로에 exceptionStats 연결
- [ ] proposals API에 evidenceContract 노출
- [ ] UI와 복사 텍스트에 gate 결과 표시
- [ ] 테스트 통과 및 기본 시나리오 검증

---

## 11) 실행 후 운영 정책

- promotion_required 상태의 proposal은 “계약 승격” 우선순위로 분류한다.
- 예외 proposal이 30일 이상 남아 있으면 계약 설계 리뷰를 강제한다.
- 반복 예외는 rule catalog에 정식 규칙으로 승격한다.

