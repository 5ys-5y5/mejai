begin;

-- 0) Stage cafe24 API index (normalized to adapter-friendly path)
drop table if exists tmp_cafe24_api_index;
create temporary table tmp_cafe24_api_index (
  scope_key text,
  http_method text,
  endpoint_path text,
  doc_url text
) on commit drop;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'Z_tmp_cafe24_api_index'
  ) then
    insert into tmp_cafe24_api_index (scope_key, http_method, endpoint_path, doc_url)
    select
      nullif(trim(scope_key), '') as scope_key,
      upper(trim(http_method)) as http_method,
      case
        when endpoint_path like '/api/v2/admin%' then regexp_replace(endpoint_path, '^/api/v2/admin', '')
        else endpoint_path
      end as endpoint_path,
      nullif(trim(doc_url), '') as doc_url
    from public."Z_tmp_cafe24_api_index"
    where coalesce(is_active, true) = true
      and nullif(trim(http_method), '') is not null
      and nullif(trim(endpoint_path), '') is not null;
  end if;
end $$;

-- 1) Normalize cafe24 scope key format: mall.read.order -> mall.read_order
update public."C_mcp_tools" t
set scope_key = regexp_replace(t.scope_key, '^mall\.(read|write)\.(.+)$', 'mall.\1_\2')
where t.provider_key = 'cafe24'
  and t.scope_key ~ '^mall\.(read|write)\..+$';

-- 1.1) Normalize cafe24 endpoint path format to adapter-relative path
update public."C_mcp_tools" t
set endpoint_path = regexp_replace(t.endpoint_path, '^/api/v2/admin', '')
where t.provider_key = 'cafe24'
  and t.endpoint_path like '/api/v2/admin%';

-- 2) Backfill scope_key from name when omitted or malformed
update public."C_mcp_tools" t
set scope_key = regexp_replace(t.name, '^scope_mall_(read|write)_(.+)$', 'mall.\1_\2')
where t.provider_key = 'cafe24'
  and t.name ~ '^scope_mall_(read|write)_.+$'
  and (
    t.scope_key is null
    or t.scope_key !~ '^mall\.(read|write)_[a-z0-9_]+$'
  );

-- 3) Treat every existing scope row as action row
update public."C_mcp_tools"
set tool_kind = 'action'
where tool_kind = 'scope';

-- 4) Precise metadata mapping for currently used legacy actions
with legacy_map as (
  select *
  from (values
    ('cafe24','list_activitylogs','mall.read_store','GET','/activitylogs'),
    ('cafe24','read_order_settings','mall.read_store','GET','/orders/setting'),
    ('cafe24','update_order_settings','mall.write_store','PUT','/orders/setting'),
    ('cafe24','list_orders','mall.read_order','GET','/orders'),
    ('cafe24','lookup_order','mall.read_order','GET','/orders/{order_id}'),
    ('cafe24','track_shipment','mall.read_order','GET','/orders/{order_id}/shipments'),
    ('cafe24','update_order_shipping_address','mall.write_order','PUT','/orders/{order_id}/receivers'),
    ('cafe24','find_customer_by_phone','mall.read_customer','GET','/customers'),
    ('cafe24','read_product','mall.read_product','GET','/products/{product_no}'),
    ('cafe24','read_supply','mall.read_supply','GET','/suppliers'),
    ('cafe24','read_shipping','mall.read_shipping','GET','/shipping'),
    ('cafe24','list_boards','mall.read_community','GET','/boards'),
    ('cafe24','list_board_articles','mall.read_community','GET','/boards/{board_no}/articles'),
    ('cafe24','create_ticket','mall.write_community','POST','/boards/{board_no}/articles'),
    ('cafe24','admin_request','mall.read_store','POST','/'),
    ('cafe24','resolve_product','mall.read_product','POST','internal://resolve_product'),
    ('cafe24','subscribe_restock','mall.write_product','POST','internal://subscribe_restock'),
    ('cafe24','trigger_restock','mall.write_product','POST','internal://trigger_restock'),
    ('solapi','send_otp','messaging.write','POST','/messages/v4/send-many/detail'),
    ('solapi','verify_otp','messaging.write','POST','/otp/verify'),
    ('juso','search_address','address.read','GET','/addrlink/addrLinkApi.do')
  ) as x(provider_key, name, scope_key, http_method, endpoint_path)
)
update public."C_mcp_tools" t
set
  scope_key = coalesce(t.scope_key, m.scope_key),
  http_method = coalesce(t.http_method, m.http_method),
  endpoint_path = coalesce(t.endpoint_path, m.endpoint_path)
from legacy_map m
where t.provider_key = m.provider_key
  and t.name = m.name
  and (
    t.scope_key is null
    or t.http_method is null
    or t.endpoint_path is null
  );

-- 5) For scope_mall_* actions, pick a representative endpoint from CSV by scope
with scoped_pick as (
  select
    s.scope_key,
    s.http_method,
    s.endpoint_path,
    s.doc_url,
    row_number() over (
      partition by s.scope_key
      order by
        case when s.http_method = 'GET' then 0 else 1 end,
        length(s.endpoint_path),
        s.endpoint_path
    ) as rn
  from tmp_cafe24_api_index s
), picked as (
  select scope_key, http_method, endpoint_path, doc_url
  from scoped_pick
  where rn = 1
)
update public."C_mcp_tools" t
set
  http_method = coalesce(t.http_method, p.http_method),
  endpoint_path = coalesce(t.endpoint_path, p.endpoint_path),
  doc_url = coalesce(t.doc_url, p.doc_url),
  source = case when coalesce(t.source, 'manual') = 'manual' then 'cafe24_api_index' else t.source end
from picked p
where t.provider_key = 'cafe24'
  and t.name like 'scope_mall_%'
  and t.scope_key = p.scope_key
  and (
    t.http_method is null
    or t.endpoint_path is null
    or t.doc_url is null
  );

-- 6) Final fallback for cafe24 action rows still missing endpoint metadata
update public."C_mcp_tools" t
set
  scope_key = coalesce(
    t.scope_key,
    case
      when t.name like 'scope_mall_read_%' then regexp_replace(t.name, '^scope_mall_(read|write)_(.+)$', 'mall.\1_\2')
      when t.name like 'scope_mall_write_%' then regexp_replace(t.name, '^scope_mall_(read|write)_(.+)$', 'mall.\1_\2')
      when t.name like 'read_%' or t.name like 'list_%' or t.name like 'lookup_%' or t.name like 'track_%' then 'mall.read_store'
      else 'mall.write_store'
    end
  ),
  http_method = coalesce(
    t.http_method,
    case
      when coalesce(t.scope_key, '') like 'mall.read_%' then 'GET'
      else 'POST'
    end
  ),
  endpoint_path = coalesce(t.endpoint_path, '/__legacy__/' || t.name),
  doc_url = coalesce(t.doc_url, 'https://developers.cafe24.com/docs/ko/api/admin/#api-index')
where t.provider_key = 'cafe24'
  and t.tool_kind = 'action'
  and (
    t.scope_key is null
    or t.http_method is null
    or t.endpoint_path is null
  );

-- 7) Keep version table synced
insert into public."C_mcp_tool_versions" (tool_id, version, schema_json, created_at, created_by)
select t.id, t.version, t.schema_json, now(), null
from public."C_mcp_tools" t
where t.is_active = true
on conflict (tool_id, version) do update
set schema_json = excluded.schema_json,
    created_at = now();

-- 8) Repair policy adapter_key to keep existing behavior intact
update public."C_mcp_tool_policies" p
set
  adapter_key = case
    when t.provider_key = 'cafe24' and t.name like 'scope_mall_%' then 'cafe24_' || t.name
    when t.provider_key = 'cafe24' and t.name in (
      'list_activitylogs','read_order_settings','update_order_settings',
      'list_orders','lookup_order','track_shipment','update_order_shipping_address',
      'find_customer_by_phone','read_product','read_supply','read_shipping',
      'list_boards','list_board_articles','create_ticket',
      'resolve_product','subscribe_restock','trigger_restock'
    ) then t.name
    when t.provider_key = 'cafe24' and t.name = 'admin_request' then 'cafe24_admin_request'
    when t.provider_key = 'cafe24' then coalesce(nullif(p.adapter_key, ''), 'cafe24_admin_request')
    else coalesce(nullif(p.adapter_key, ''), t.name)
  end,
  allowed_scopes = case
    when t.provider_key = 'cafe24' and t.scope_key is not null then array[t.scope_key]::text[]
    else p.allowed_scopes
  end,
  updated_at = now()
from public."C_mcp_tools" t
where p.tool_id = t.id;

-- 9) Keep endpoint table aligned with effective adapter keys
with params as (
  select '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid as org_id,
         'sandbox'::text as env_name
), effective as (
  select distinct p.org_id, coalesce(nullif(p.adapter_key, ''), t.name) as adapter_key, t.provider_key
  from public."C_mcp_tool_policies" p
  join public."C_mcp_tools" t on t.id = p.tool_id
  join params x on x.org_id = p.org_id
  where t.is_active = true
), seed as (
  select
    e.org_id,
    e.adapter_key,
    (select env_name from params) as env,
    case
      when e.adapter_key in ('resolve_product','subscribe_restock','trigger_restock') then 'internal://' || e.adapter_key
      when e.adapter_key like 'cafe24_scope_%' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
      when e.adapter_key = 'cafe24_admin_request' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
      when e.provider_key = 'cafe24' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
      when e.provider_key = 'solapi' then 'https://api.solapi.com'
      when e.provider_key = 'juso' then 'https://business.juso.go.kr'
      else 'internal://' || e.adapter_key
    end as base_url,
    case
      when e.provider_key in ('cafe24', 'solapi') then 'api_key'
      when e.provider_key = 'juso' then 'query_key'
      else 'none'
    end as auth_type,
    case
      when e.provider_key = 'cafe24' then 'secret:cafe24'
      when e.provider_key = 'solapi' then 'secret:solapi'
      when e.provider_key = 'juso' then 'secret:juso'
      else null
    end as auth_ref
  from effective e
)
insert into public."C_mcp_tool_endpoints" (
  org_id, adapter_key, env, base_url, auth_type, auth_ref, is_active, updated_at
)
select org_id, adapter_key, env, base_url, auth_type, auth_ref, true, now()
from seed
on conflict (org_id, adapter_key, env) do update
set
  base_url = excluded.base_url,
  auth_type = excluded.auth_type,
  auth_ref = coalesce(public."C_mcp_tool_endpoints".auth_ref, excluded.auth_ref),
  is_active = true,
  updated_at = now();

commit;

-- verification (run after commit)
-- 1) rows that still violate endpoint metadata
-- select provider_key, count(*)
-- from public."C_mcp_tools"
-- where tool_kind = 'action'
--   and (scope_key is null or http_method is null or endpoint_path is null)
-- group by provider_key;

-- 2) formerly scope rows now action
-- select count(*) as not_action_anymore
-- from public."C_mcp_tools"
-- where name like 'scope_mall_%' and tool_kind <> 'action';

-- 3) adapter key coverage check
-- select count(*) as missing_adapter_key
-- from public."C_mcp_tool_policies"
-- where coalesce(trim(adapter_key), '') = '';
