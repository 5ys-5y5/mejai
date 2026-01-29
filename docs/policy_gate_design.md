```
alter table public.knowledge_base
add column kb_kind text null,
add column content_json jsonb null;


create index if not exists knowledge_base_policy_active_org
on public.knowledge_base (org_id, kb_kind)
where is_active = true;
```

위와 같이 db를 업데이트 하였습니다.
[“KB 업데이트만으로도 완벽에 가깝게” = Policy를 구조화하고, Gate에서 강제하면 가능]를 구현하기 위한 아래 액션을 정리합니다.

1. “제한/강제해야 하는 행동”을 10~20개만 먼저 목록화
1-1. 욕설 대응, 반복질문 차단, 주소변경 확정 시 티켓 생성, 환불 불가 카테고리 고지, 개인정보 마스킹 등
2. 각 항목을 (조건 → 강제 행동/금지 행동 → 템플릿) 으로 정리
3. 그걸 그대로 Policy JSON 스키마로 설계
4. route.ts 앞단에 Input/Tool/Output gate 붙이기

아래 지침은 knowledge_base 테이블에 Policy/gate/Template/Tool 규칙에 대해 DB 변경만으로 답변에 반영되게 하고자 하지만 새로운 행동이 추가됨에 따라 하드 코딩이 불가피할 수 있습니다.
하드 코딩을 최소화하고, 오직 knowledge_base 테이블에 내용을 업데이트 하는 것 만으로 에이전트의 답변이 통제 가능하도록 해주세요.
**하드 코딩이 불가피한 경우는 반드시 어떤 항목이 어떻게 추가될 때 하드 코딩이 야기되는지 답변에 가이드**를 남겨주세요.

작성 완료 후 C:\dev\1227\mejai\docs\bot_spec.md와 docs\LLM(playgrond_route,llm) 작동 원리.md에 업데이트 된 내용을 반영할 것

---

# 0) 전제: DB를 이렇게 쓰는 방식이 맞는가?

네. 다음처럼 운용하면 가장 깔끔합니다.

- 일반 KB (RAG):
    
    `is_admin=false AND is_active=true` (kb_kind는 선택)
    
- 정책/게이트 KB:
    
    `is_admin=true AND is_active=true AND kb_kind in ('policy_pack','policy_rule','template_pack','gate_config')`
    
    그리고 **반드시 `content_json`로만 로드**(content 텍스트는 UI/원문용)
    

`apply_groups/apply_groups_mode`는 **정책 로딩 후 “정책 적용 여부 필터링”**에 사용합니다(아래 설계 포함).

---

# 1) 구현 액션 재정리 (추천 순서)

## 1. “강제/제한해야 하는 행동” 10~20개 목록화 (MVP 12개 추천)

아래 12개로 시작하면 Gate 강제 효과가 가장 큽니다.

1. **욕설/혐오/공격적 언사 대응**: 톤 강제 + 경고/종결 템플릿
2. **반복 질문 차단/쿨다운**: 동일 의도 N회 초과 시 답변 제한 + 요약 링크/종결
3. **개인정보 마스킹(PII)**: 답변/툴 호출 전후 모두 마스킹(전화/이메일/주소/주민번호류)
4. **결제/환불 불가 카테고리 고지**: 특정 카테고리면 자동 고지 문구 포함
5. **주소 변경 확정 시 티켓 자동 생성**: 조건 충족 시 `create_ticket` 강제 호출
6. **배송 시작 이후 변경 불가**: 상태 기반으로 변경 요청 거절 + 대안 안내
7. **주문/배송 조회는 주문번호 없으면 질문 강제**: 주문번호 없으면 툴 금지 + 정보 요청 템플릿
8. **정책/가격/약관은 KB 근거 없으면 단정 금지**: “확인 필요/담당자 문의” 템플릿으로 제한
9. **금지된 툴 호출 차단**: 특정 테넌트/등급/상태에서 특정 툴 사용 불가
10. **툴 호출 입력 검증**: 주문번호 포맷/필수 필드 누락 시 툴 호출 금지
11. **출력 포맷 강제(요약→근거→상세→다음 액션)**: 응답 구조 강제
12. **에스컬레이션 강제**: 특정 키워드/리스크(분쟁/법적/개인정보 유출) 시 사람 이관 템플릿 강제

> 여기서 “완벽에 가깝게”가 나오려면 (3) PII 마스킹 + (10) 툴 입력검증 + (9) 툴 차단 + (5) 툴 강제가 핵심입니다.
> 
> 
> 톤/문구는 LLM이 잘하지만, 행동/제한은 Gate에서만 보장됩니다.
> 

---

## 2. 각 항목을 (조건 → 강제/금지 행동 → 템플릿)으로 정리

- 조건: “어떤 신호로 발동되는가”(입력/컨텍스트/툴 결과/상태)
- 강제 행동: “반드시 해야 하는 일”(템플릿 응답, 툴 호출, 추가 질문, 종료)
- 금지 행동: “절대 하면 안 되는 일”(툴 호출 금지, 단정 금지, 특정 정보 노출 금지)
- 템플릿: 고객 응답/툴 생성 payload 템플릿/추가 질문 템플릿

이걸 그대로 JSON Rule로 표현합니다(아래 스키마).

---

## 3. Policy JSON 스키마 설계 (KB content_json에 저장)

- **policy_pack(권장)**: 규칙+템플릿+툴 정책을 한 JSON에 묶어 “active 1개”로 운영하기 쉬움
또한 `apply_groups/apply_groups_mode`를 룰 단위 또는 pack 단위로 적용 가능하도록 합니다.

---

## 4. route.ts 앞단에 Gate 3단(입력/툴/출력) 붙이기

- **Input Gate**: 사용자 입력 정규화/분류/PII 마스킹/반복질문 검사/툴 금지 여부 확정
- **Tool Gate**: LLM이 제안한 tool call을 **검증/차단/강제/수정**
- **Output Gate**: 최종 응답을 **마스킹/포맷/금지문구 제거/에스컬레이션 강제**

> 중요한 운영 철학: LLM은 “제안”만 하고, 실행은 Gate가 결정합니다.
> 

---

# 2) apply_groups / apply_groups_mode 반영 방식(핵심)

행(row) 단위로 저장되는 `apply_groups`는 이런 구조죠:

```
[
  {"path":"paid.grade","values":["pro"]},
  {"path":"service.tenant","values":["cafe24"]},
  {"path":"service.volume.performance","values":["high"]},
  {"path":"service.volume.scale","values":["bulk"]}
]

```

- `apply_groups_mode = "any"`: 조건들 중 **하나라도** 맞으면 적용
- `apply_groups_mode = "all"`: 조건들 **전부** 맞아야 적용

이를 위해 런타임에 **PolicyEvalContext**(테넌트/플랜/조직/사용자/서비스 특성)를 준비하고,

`path`를 dot-path로 해석해 값을 뽑아 비교합니다.

예) `context.paid.grade == "pro"` 이면 match

---

# 3) Policy 스키마 초안 (content_json에 저장할 JSON 형태)

아래는 **“policy_pack”**(권장) 형태의 초안입니다. (실제 JSON Schema 문서가 아니라 “운영 JSON 구조” 초안)

## 3.1 policy_pack 예시 구조

```
{
  "rules": [
    {
      "id": "R001_abuse",
      "stage": "input",
      "priority": 1000,
      "when": {
        "any": [
          { "predicate": "text.contains_abuse", "args": { "threshold": 0.8 } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "set_flag", "flag": "conversation.abusive", "value": true },
          { "type": "force_response_template", "template_id": "abuse_warn" },
          { "type": "deny_tools", "tools": ["*"] }
        ]
      }
    },
    {
      "id": "R010_need_order_id_for_lookup",
      "stage": "tool",
      "priority": 900,
      "when": {
        "all": [
          { "predicate": "intent.is_one_of", "args": { "values": ["order_lookup","shipment_tracking"] } },
          { "predicate": "entity.order_id.missing" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "deny_tools", "tools": ["lookup_order","track_shipment"] },
          { "type": "force_response_template", "template_id": "need_order_id" }
        ]
      }
    },
    {
      "id": "R020_mask_pii_output",
      "stage": "output",
      "priority": 950,
      "when": {
        "any": [{ "predicate": "text.contains_pii" }]
      },
      "enforce": {
        "actions": [
          { "type": "mask_pii", "scope": "output", "ruleset": "default" }
        ]
      }
    },
    {
      "id": "R030_address_change_create_ticket",
      "stage": "tool",
      "priority": 920,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "address_change" } },
          { "predicate": "entity.order_id.present" },
          { "predicate": "entity.address.present" },
          { "predicate": "user.confirmed", "args": { "path": "address_change_confirmed", "value": true } }
        ]
      },
      "enforce": {
        "actions": [
          {
            "type": "force_tool_call",
            "tool": "create_ticket",
            "args_template": {
              "type": "address_change",
              "order_id": "{{entity.order_id}}",
              "new_address": "{{entity.address}}",
              "customer_message": "{{input.text}}"
            }
          }
        ]
      }
    }
  ],
  "tool_policies": {
    "lookup_order": {
      "required_args": ["order_id"],
      "arg_validators": {
        "order_id": { "regex": "^[0-9]{8}-[0-9]{7}$" }
      }
    },
    "track_shipment": {
      "required_args": ["order_id"]
    },
    "create_ticket": {
      "required_args": ["type","order_id"]
    }
  }
}

```

### 포인트

- `rules[].stage`: `input | tool | output`
- `when`: `any/all` + `predicate` 기반 (코드에서 predicate 레지스트리로 평가)
- `enforce.actions`: Gate가 실행하는 강제 동작들
- `tool_policies`: 툴별 필수 인자/검증 규칙(툴 게이트에서 강제)

---

## 3.2 apply_groups 연결(행 메타 + pack/rule 필터)

DB row에 있는:

- `apply_groups` / `apply_groups_mode`

을 **policy_pack 전체 적용 조건**으로 쓸 수도 있고,

**rule 레벨에서도 추가 조건**을 둘 수도 있습니다.

가장 단순/안전한 권장:

- **DB row의 apply_groups는 “이 policy_pack 자체를 로드할지”를 결정**
- 로드된 pack 내부에서 추가 분기는 `when`으로 처리

---

# 4) Gate 설계 (핸들러 흐름)

## 4.1 route.ts 전체 흐름(개념)

1. **Load KB**
    - 일반 KB: RAG retrieval 후보
    - 정책 KB(is_admin=true, kb_kind=policy_pack …): `content_json` 로드
    - apply_groups 평가 후 적용 대상 policy만 선택
2. **Compile Policy**
    - 우선순위 정렬(priority desc)
    - stage별로 분리(input/tool/output)
    - predicate registry 준비
3. **Input Gate 실행**
    - 입력 정규화(공백/문자)
    - abuse/PII/반복질문/의도 분류(최소 rule-based + LLM 보조)
    - tool 허용/금지 플래그 설정
    - 즉시 종료(템플릿 응답) 여부 결정
4. **LLM 호출**
    - system prompt에 (정책 요약 + 허용 tool 목록 + 응답 포맷)를 주되,
    - *LLM 결과는 “제안”**으로 취급
5. **Tool Gate 실행**
    - LLM이 요청한 tool call 검증
    - 정책에 의해 차단/수정/강제 툴 호출 수행
6. **Output Gate 실행**
    - 응답 포맷 강제
    - PII 마스킹
    - 금지문구 제거/에스컬레이션 템플릿 강제
7. **로그 저장(정책 결정 기록)**

---

## 4.2 의사코드(Typescript 스타일)

> 외부 LLM에 의해 실제 프로젝트 코드 구조를 몰라서 최소한의 형태로 작성되었습니다. 핵심은 “PolicyEngine + 3 Gates”입니다.
> 반드시 현재 코드의 상황에 맞게 사용되어야 합니다.

```
// types
type ApplyGroup = { path: string; values: string[] };
type ApplyMode = "any" | "all";

type KBRow = {
  id: string;
  org_id: string | null;
  is_admin: boolean;
  is_active: boolean;
  kb_kind: string | null;
  content_json: any | null;
  apply_groups: ApplyGroup[] | null;
  apply_groups_mode: ApplyMode;
  version: string;
  parent_id: string;
};

type PolicyEvalContext = {
  org: { id: string };
  paid: { grade: string };                 // e.g. pro
  service: {
    tenant: string;                        // e.g. cafe24
    volume: { performance: string; scale: string };
  };
  user?: { id?: string; roles?: string[] };
  conversation: { recent_intents: string[]; repeat_count: number; flags: Record<string, any> };
  input: { text: string };
  entity: { order_id?: string; address?: string; phone?: string; email?: string };
  intent?: { name?: string; confidence?: number };
};

function matchesApplyGroups(
  ctx: PolicyEvalContext,
  groups: ApplyGroup[] | null,
  mode: ApplyMode
): boolean {
  if (!groups || groups.length === 0) return true;

  const check = (g: ApplyGroup) => {
    const v = getByDotPath(ctx, g.path); // e.g. ctx.paid.grade
    return typeof v === "string" && g.values.includes(v);
  };

  const results = groups.map(check);
  return mode === "all" ? results.every(Boolean) : results.some(Boolean);
}

function loadActivePolicies(rows: KBRow[], ctx: PolicyEvalContext) {
  return rows
    .filter(r => r.is_admin && r.is_active && r.kb_kind === "policy_pack" && r.content_json)
    .filter(r => matchesApplyGroups(ctx, r.apply_groups, r.apply_groups_mode))
    .map(r => ({ row: r, policy: r.content_json }));
}

async function handler(req) {
  const ctx: PolicyEvalContext = buildContext(req); // tenant/paid/service/user/conversation/input

  // 1) load policies
  const policyRows = await db.query<KBRow>(`... is_admin=true and is_active=true and kb_kind='policy_pack' ...`);
  const activePolicies = loadActivePolicies(policyRows, ctx);

  // 2) compile policy
  const engine = PolicyEngine.compile(activePolicies.map(p => p.policy));

  // 3) input gate
  const inputResult = engine.runStage("input", ctx);
  logPolicyDecision("input", inputResult);

  if (inputResult.forcedResponse) {
    return respond(inputResult.forcedResponse); // deny tools, template response etc.
  }

  // 4) LLM propose (tools + draft answer)
  const llmProposal = await callLLM({
    messages: buildPrompt(ctx, engine.exportPromptHints()),
    tools: engine.allowedTools(ctx) // may be filtered by input gate flags
  });

  // 5) tool gate
  const toolResult = engine.runToolGate(ctx, llmProposal.toolCalls);
  logPolicyDecision("tool", toolResult);

  const toolOutputs = [];
  for (const call of toolResult.approvedOrForcedCalls) {
    toolOutputs.push(await runTool(call));
  }

  // 6) LLM finalize (if you do tool-augmented final)
  const draft = await callLLM({
    messages: buildFinalPrompt(ctx, llmProposal, toolOutputs, engine.exportPromptHints())
  });

  // 7) output gate
  const outputResult = engine.runStage("output", { ...ctx, output: { text: draft.text } });
  logPolicyDecision("output", outputResult);

  return respond(outputResult.finalText);
}

```

---

# 5) Gate가 수행하는 “강제 액션” 정의(최소 공통)

Policy JSON의 `enforce.actions[]`에서 실행 가능한 액션 타입을 **고정**해야 합니다(여기가 “행동 보장”의 본체).

권장 액션 타입(초기 10개)

1. `force_response_template(template_id)`
2. `deny_tools(tools: string[] | ["*"])`
3. `allow_tools(tools: string[])` (화이트리스트)
4. `force_tool_call(tool, args_template)`
5. `mutate_tool_call(tool, patch)` (order_id 주입, 누락 수정 등)
6. `require_user_fields(fields, prompt_template)`
7. `mask_pii(scope: input|output|tool_args, ruleset)`
8. `set_flag(flag, value)` (conversation flags)
9. `format_output(format_id)` (요약→근거→상세→다음)
10. `escalate(reason, template_id)`

---

# 6) 로그 포맷(정책 강제는 “감사 가능성”이 필수)

추천: **JSON Lines**(한 요청에 여러 이벤트)

## 6.1 공통 로그 필드

```
{
  "ts": "2026-01-29T12:34:56.789Z",
  "trace_id": "uuid",
  "org_id": "uuid",
  "user_id": "optional",
  "tenant": "cafe24",
  "paid_grade": "pro",
  "stage": "input|tool|output",
  "policy_pack_ids": ["policy_pack_main@1.0", "admin_common@2.3"],
  "matched_rules": [
    { "rule_id": "R001_abuse", "priority": 1000, "result": "matched" },
    { "rule_id": "R020_mask_pii_output", "priority": 950, "result": "not_matched" }
  ],
  "enforcements": [
    { "action": "deny_tools", "tools": ["*"] },
    { "action": "force_response_template", "template_id": "abuse_warn" }
  ],
  "decision": {
    "forced_response": true,
    "allowed_tools": [],
    "forced_tool_calls": []
  }
}

```

## 6.2 apply_groups 평가 로그(중요)

정책 pack 로딩 시점에 다음을 남기면 운영이 쉬워집니다.

```
{
  "stage": "policy_load",
  "policy_row_id": "2a124398-...",
  "kb_kind": "policy_pack",
  "apply_groups_mode": "any",
  "apply_groups_eval": [
    {"path":"paid.grade","expected":["pro"],"actual":"pro","matched":true},
    {"path":"service.tenant","expected":["cafe24"],"actual":"cafe24","matched":true},
    {"path":"service.volume.performance","expected":["high"],"actual":"high","matched":true}
  ],
  "applied": true
}

```

---

# 7) 마지막으로: 지금 인덱스/컬럼 변경을 적용했을 때 “정책 로딩 쿼리” 권장

당신의 인덱스:

```
create index if not exists knowledge_base_policy_active_org
on public.knowledge_base (org_id, kb_kind)
where is_active = true;

```

이에 맞춘 로딩 쿼리 예:

```
select *
from knowledge_base
where is_active = true
  and is_admin = true
  and kb_kind = 'policy_pack'
  and (org_id = :org_id or org_id is null);

```

- `org_id is null`(공통 정책)까지 포함하려면 인덱스만으로 100% 커버되진 않을 수 있지만,
- 정책 row 수가 크지 않으면 충분히 잘 동작합니다.
- 정책 row가 커지면 차후에
    - `where is_active=true and is_admin=true`까지 포함한 partial index로 개선하는 걸 추천합니다(이전 메시지의 옵션).

---

## 제공물 요약

- 액션 플랜(1~4) 재정리 완료
- apply_groups/apply_groups_mode 반영한 policy 로딩/적용 방식 제시
- policy_pack 기반 **Policy JSON 초안** 제시
- route.ts에 붙일 **Input/Tool/Output Gate 설계 + 의사코드** 제시
- **로그 포맷**(정책 강제 감사 가능) 제시