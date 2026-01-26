insert into mcp_tools (name, description, schema_json, version)
values
  (
    'list_boards',
    '게시판 목록 조회',
    '{"type":"object","properties":{},"required":[]}'::jsonb,
    'v1'
  ),
  (
    'list_board_articles',
    '게시판 글 목록 조회',
    '{"type":"object","properties":{"board_no":{"type":"string"},"start_date":{"type":"string"},"end_date":{"type":"string"},"keyword":{"type":"string"},"offset":{"type":"number"},"limit":{"type":"number"}},"required":["board_no"]}'::jsonb,
    'v1'
  ),
  (
    'list_orders',
    '주문 목록 조회',
    '{"type":"object","properties":{"start_date":{"type":"string"},"end_date":{"type":"string"},"offset":{"type":"number"},"limit":{"type":"number"}},"required":["start_date","end_date"]}'::jsonb,
    'v1'
  ),
  (
    'find_customer_by_phone',
    '휴대폰 번호로 고객 조회',
    '{"type":"object","properties":{"cellphone":{"type":"string"}},"required":["cellphone"]}'::jsonb,
    'v1'
  )
on conflict (name) do nothing;

insert into mcp_tool_policies (org_id, tool_id, is_allowed, allowed_scopes, rate_limit_per_min, masking_rules, conditions, adapter_key)
select
  '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid as org_id,
  t.id as tool_id,
  true as is_allowed,
  array['read'] as allowed_scopes,
  30 as rate_limit_per_min,
  null as masking_rules,
  null as conditions,
  t.name as adapter_key
from mcp_tools t
where t.name in ('list_boards','list_board_articles','list_orders','find_customer_by_phone')
on conflict (org_id, tool_id) do nothing;
