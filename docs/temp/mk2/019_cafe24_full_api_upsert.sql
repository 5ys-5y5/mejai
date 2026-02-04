begin;

-- ============================================================================
-- 019_cafe24_full_api_upsert.sql
-- Goal: reflect ALL Cafe24 API Index rows into C_mcp_tools (action rows)
-- Source: public."Z_tmp_cafe24_api_index" (loaded from docs/cafe24_API_Index.csv)
-- ============================================================================

-- 0) Normalize source rows from staging table into temp table (reusable)
drop table if exists tmp_src_dedup;
create temporary table tmp_src_dedup as
with src_raw as (
  select
    trim(scope_key) as scope_key,
    upper(trim(http_method)) as http_method,
    trim(endpoint_path) as endpoint_path,
    nullif(trim(operation_title), '') as operation_title,
    nullif(trim(doc_url), '') as doc_url
  from public."Z_tmp_cafe24_api_index"
  where coalesce(is_active, true) = true
), src_norm as (
  select
    scope_key,
    http_method,
    case
      when endpoint_path like '/api/v2/admin%' then regexp_replace(endpoint_path, '^/api/v2/admin', '')
      else endpoint_path
    end as endpoint_path,
    operation_title,
    coalesce(doc_url, 'https://developers.cafe24.com/docs/ko/api/admin/#api-index') as doc_url
  from src_raw
  where scope_key is not null and scope_key <> ''
    and http_method in ('GET','POST','PUT','PATCH','DELETE')
    and endpoint_path is not null and endpoint_path <> ''
)
select scope_key, http_method, endpoint_path, operation_title, doc_url
from (
  select
    scope_key,
    http_method,
    endpoint_path,
    operation_title,
    doc_url,
    row_number() over (
      partition by http_method, endpoint_path
      order by
        case when operation_title is not null then 0 else 1 end,
        scope_key
    ) as rn
  from src_norm
) x
where rn = 1;

-- 1) Update existing cafe24 endpoint rows with authoritative scope/doc metadata
update public."C_mcp_tools" t
set
  scope_key = s.scope_key,
  http_method = s.http_method,
  endpoint_path = s.endpoint_path,
  doc_url = s.doc_url,
  source = 'cafe24_api_index',
  is_destructive = case when s.http_method in ('POST','PUT','PATCH','DELETE') then true else false end,
  tool_kind = 'action'
from tmp_src_dedup s
where t.provider_key = 'cafe24'
  and t.tool_kind = 'action'
  and t.http_method = s.http_method
  and t.endpoint_path = s.endpoint_path;

-- 2) Insert missing cafe24 endpoints as new action tools
insert into public."C_mcp_tools" (
  name,
  description,
  schema_json,
  version,
  is_active,
  provider_key,
  visibility,
  access,
  is_destructive,
  usage_count,
  tool_kind,
  scope_key,
  endpoint_path,
  http_method,
  operation_key,
  doc_url,
  source
)
select
  (
    'api_' || lower(s.http_method) || '_' ||
    left(
      trim(both '_' from regexp_replace(regexp_replace(lower(s.endpoint_path), '[^a-z0-9]+', '_', 'g'), '_+', '_', 'g')),
      80
    ) || '_' || substr(md5(lower(s.http_method) || ':' || lower(s.endpoint_path)), 1, 8)
  ) as name,
  coalesce(s.operation_title, '[' || s.scope_key || '] ' || s.http_method || ' ' || s.endpoint_path) as description,
  jsonb_build_object(
    'type', 'object',
    'required', jsonb_build_array(),
    'properties', jsonb_build_object(
      'query', jsonb_build_object('type', 'object'),
      'body', jsonb_build_object('type', 'object'),
      'shop_no', jsonb_build_object('type', 'string')
    )
  ) as schema_json,
  'v1'::text as version,
  true as is_active,
  'cafe24'::text as provider_key,
  'public'::text as visibility,
  'open_world'::text as access,
  case when s.http_method in ('POST','PUT','PATCH','DELETE') then true else false end as is_destructive,
  0::bigint as usage_count,
  'action'::text as tool_kind,
  s.scope_key,
  s.endpoint_path,
  s.http_method,
  null::text as operation_key,
  s.doc_url,
  'cafe24_api_index'::text as source
from tmp_src_dedup s
where not exists (
  select 1
  from public."C_mcp_tools" e
  where e.provider_key = 'cafe24'
    and e.tool_kind = 'action'
    and e.http_method = s.http_method
    and e.endpoint_path = s.endpoint_path
)
on conflict (provider_key, name) do nothing;

-- 3) Ensure version rows exist for all active tools
insert into public."C_mcp_tool_versions" (tool_id, version, schema_json, created_at, created_by)
select t.id, t.version, t.schema_json, now(), null
from public."C_mcp_tools" t
where t.is_active = true
on conflict (tool_id, version) do update
set schema_json = excluded.schema_json,
    created_at = now();

-- 4) Policy seed for org (new rows get admin_request adapter)
insert into public."C_mcp_tool_policies" (
  org_id,
  tool_id,
  is_allowed,
  allowed_scopes,
  rate_limit_per_min,
  masking_rules,
  conditions,
  adapter_key,
  updated_at
)
select
  '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid as org_id,
  t.id as tool_id,
  true as is_allowed,
  case when t.scope_key is not null then array[t.scope_key]::text[] else array['read']::text[] end as allowed_scopes,
  60 as rate_limit_per_min,
  null::jsonb as masking_rules,
  null::jsonb as conditions,
  case
    when t.provider_key <> 'cafe24' then t.name
    when t.name in ('resolve_product','subscribe_restock','trigger_restock') then t.name
    when t.name in (
      'list_boards','list_board_articles','list_orders','find_customer_by_phone','lookup_order','track_shipment',
      'update_order_shipping_address','create_ticket','read_product','read_supply','read_shipping',
      'read_order_settings','update_order_settings','list_activitylogs','admin_request'
    ) then t.name
    when t.name like 'scope_mall_%' then 'cafe24_' || t.name
    else 'cafe24_admin_request'
  end as adapter_key,
  now() as updated_at
from public."C_mcp_tools" t
where t.is_active = true
  and t.tool_kind = 'action'
on conflict (org_id, tool_id) do update
set
  is_allowed = excluded.is_allowed,
  allowed_scopes = excluded.allowed_scopes,
  rate_limit_per_min = coalesce(public."C_mcp_tool_policies".rate_limit_per_min, excluded.rate_limit_per_min),
  adapter_key = coalesce(nullif(public."C_mcp_tool_policies".adapter_key, ''), excluded.adapter_key),
  updated_at = now();

-- 5) Endpoint seed by effective adapter keys
with effective as (
  select distinct
    p.org_id,
    coalesce(nullif(p.adapter_key, ''), t.name) as adapter_key,
    t.provider_key
  from public."C_mcp_tool_policies" p
  join public."C_mcp_tools" t on t.id = p.tool_id
  where p.org_id = '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid
    and t.is_active = true
)
insert into public."C_mcp_tool_endpoints" (
  org_id, adapter_key, env, base_url, auth_type, auth_ref, is_active, updated_at
)
select
  e.org_id,
  e.adapter_key,
  'sandbox'::text as env,
  case
    when e.adapter_key in ('resolve_product','subscribe_restock','trigger_restock') then 'internal://' || e.adapter_key
    when e.adapter_key = 'cafe24_admin_request' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
    when e.adapter_key like 'cafe24_scope_%' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
    when e.provider_key = 'cafe24' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
    when e.provider_key = 'solapi' then 'https://api.solapi.com'
    when e.provider_key = 'juso' then 'https://business.juso.go.kr'
    else 'internal://' || e.adapter_key
  end as base_url,
  case
    when e.provider_key in ('cafe24','solapi') then 'api_key'
    when e.provider_key = 'juso' then 'query_key'
    else 'none'
  end as auth_type,
  case
    when e.provider_key = 'cafe24' then 'secret:cafe24'
    when e.provider_key = 'solapi' then 'secret:solapi'
    when e.provider_key = 'juso' then 'secret:juso'
    else null
  end as auth_ref,
  true as is_active,
  now() as updated_at
from effective e
on conflict (org_id, adapter_key, env) do update
set
  base_url = excluded.base_url,
  auth_type = excluded.auth_type,
  auth_ref = coalesce(public."C_mcp_tool_endpoints".auth_ref, excluded.auth_ref),
  is_active = true,
  updated_at = now();

commit;

-- ============================================================================
-- Verification (run separately)
-- ============================================================================
-- A) CSV endpoint total vs DB endpoint total (Cafe24 action)
-- with src as (
--   select distinct
--     upper(trim(http_method)) as http_method,
--     case when trim(endpoint_path) like '/api/v2/admin%' then regexp_replace(trim(endpoint_path), '^/api/v2/admin', '') else trim(endpoint_path) end as endpoint_path
--   from public."Z_tmp_cafe24_api_index"
--   where coalesce(is_active, true) = true
-- )
-- select
--   (select count(*) from src) as csv_total,
--   (select count(*) from public."C_mcp_tools" t where t.provider_key='cafe24' and t.tool_kind='action' and t.http_method is not null and t.endpoint_path is not null) as db_total,
--   (select count(*)
--    from src s
--    left join public."C_mcp_tools" t
--      on t.provider_key='cafe24' and t.tool_kind='action' and t.http_method=s.http_method and t.endpoint_path=s.endpoint_path
--    where t.id is null) as missing_count;

-- B) Missing endpoint list (should be 0 rows)
-- with src as (
--   select distinct
--     upper(trim(http_method)) as http_method,
--     case when trim(endpoint_path) like '/api/v2/admin%' then regexp_replace(trim(endpoint_path), '^/api/v2/admin', '') else trim(endpoint_path) end as endpoint_path,
--     trim(scope_key) as scope_key
--   from public."Z_tmp_cafe24_api_index"
--   where coalesce(is_active, true) = true
-- )
-- select s.scope_key, s.http_method, s.endpoint_path
-- from src s
-- left join public."C_mcp_tools" t
--   on t.provider_key='cafe24' and t.tool_kind='action' and t.http_method=s.http_method and t.endpoint_path=s.endpoint_path
-- where t.id is null
-- order by s.scope_key, s.http_method, s.endpoint_path;
