-- mk2 order update tool policy (set 8ad81b6b-3210-40dd-8e00-9a43a4395923 to your org UUID)
-- Example: \set org_id '00000000-0000-0000-0000-000000000000'

with tool_ids as (
  select id, name
  from mcp_tools
  where name in (
    'update_order_shipping_address'
  )
)
insert into mcp_tool_policies (
  org_id,
  tool_id,
  is_allowed,
  allowed_scopes,
  masking_rules,
  conditions,
  adapter_key,
  updated_at
)
select
  8ad81b6b-3210-40dd-8e00-9a43a4395923,
  t.id,
  true,
  array['write']::text[],
  null,
  null,
  null,
  now()
from tool_ids t
on conflict (org_id, tool_id)
  do update set
    is_allowed = excluded.is_allowed,
    allowed_scopes = excluded.allowed_scopes,
    adapter_key = excluded.adapter_key,
    updated_at = now();
