# mk2 `list_orders` TOOL_NOT_ALLOWED_FOR_AGENT 점검 가이드

## 목적
- 증상: 휴대폰 번호를 입력해도 `주문번호 또는 휴대폰 번호를 알려주세요`가 반복됨
- 핵심 원인: 정책은 `list_orders`를 강제했지만, 에이전트 허용 툴(`B_bot_agents.mcp_tool_ids`)이 비어 있거나 불일치하여 `allowed_tool_names=[]`가 됨

## 1) 현재 턴에서 실제 에이전트 찾기
```sql
-- turn_id로 세션/에이전트 식별
select
  t.id as turn_id,
  t.session_id,
  s.agent_id,
  a.name as agent_name,
  a.mcp_tool_ids
from "D_conv_turns" t
join "D_conv_sessions" s on s.id = t.session_id
left join "B_bot_agents" a on a.id = s.agent_id::uuid
where t.id = '<TURN_ID>';
```

> 스키마에서 `D_conv_sessions.agent_id`가 text, `B_bot_agents.id`가 uuid인 경우 `::uuid` 캐스팅이 필요합니다.

## 2) 해당 에이전트의 연결 툴 확인
```sql
select id, name, mcp_tool_ids
from "B_bot_agents"
where id = '<AGENT_ID>'::uuid;

-- mcp_tool_ids가 jsonb 배열인 경우
select t.id, t.name, t.is_active
from "C_mcp_tools" t
join lateral (
  select jsonb_array_elements_text(a.mcp_tool_ids) as tool_id_text
  from "B_bot_agents" a
  where a.id = '<AGENT_ID>'::uuid
) x on t.id = x.tool_id_text::uuid
order by t.name;
```

## 3) 필수 툴 ID 조회
```sql
select id, name, is_active
from "C_mcp_tools"
where name in ('list_orders', 'lookup_order', 'update_order_shipping_address')
order by name;
```

## 4) 에이전트 툴 스코프 수정 (권장)
```sql
-- 필요한 3개 툴을 agent.mcp_tool_ids에 병합(중복 제거)
update "B_bot_agents" a
set mcp_tool_ids = (
  select to_jsonb(array(
    select distinct x
    from (
      -- 기존 값(jsonb 배열)
      select jsonb_array_elements_text(coalesce(a.mcp_tool_ids, '[]'::jsonb)) as x
      union all
      -- 추가할 툴 id
      select id::text
      from "C_mcp_tools"
      where name in ('list_orders', 'lookup_order', 'update_order_shipping_address')
        and is_active = true
    ) q
  ))
)
where a.id = '<AGENT_ID>'::uuid;
```

## 5) 수정 후 검증
```sql
select
  a.id,
  a.name,
  a.mcp_tool_ids,
  (
    select array_agg(t.name order by t.name)
    from "C_mcp_tools" t
    join lateral (
      select jsonb_array_elements_text(coalesce(a.mcp_tool_ids, '[]'::jsonb)) as tool_id_text
    ) x on t.id = x.tool_id_text::uuid
  ) as tool_names
from "B_bot_agents" a
where a.id = '<AGENT_ID>'::uuid;
```

## 기대 결과
- `tool_names`에 최소 `list_orders` 포함
- 이후 대화 로그에서:
  - `PRE_MCP_DECISION.allowed_tool_names`가 빈 배열이 아님
  - `MCP_CALL_SKIPPED(reason=TOOL_NOT_ALLOWED_FOR_AGENT)`가 사라짐
  - `MCP.last_function=list_orders` + 성공/결과 건수 확인 가능
