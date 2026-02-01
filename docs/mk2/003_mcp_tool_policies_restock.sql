-- mk2 restock tool policies (set :org_id to your org UUID)
-- Example: \set org_id '00000000-0000-0000-0000-000000000000'

with tool_ids as (
  select id, name
  from mcp_tools
  where name in (
    'resolve_product',
    'read_product',
    'read_supply',
    'read_shipping',
    'subscribe_restock',
    'trigger_restock'
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
  :org_id,
  t.id,
  true,
  case
    when t.name in ('resolve_product', 'read_product', 'read_supply') then array['read']::text[]
    else array['write']::text[]
  end,
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
