begin;

with params as (
  select '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid as org_id,
         'sandbox'::text as env_name
)

-- 1) Normalize scope_key for scope tools: scope_mall_read_order -> mall.read_order
update public."C_mcp_tools" t
set scope_key = regexp_replace(t.name, '^scope_(mall)_(read|write)_(.+)$', E'\\1.\\2_\\3')
where t.provider_key = 'cafe24'
  and t.tool_kind = 'scope'
  and t.name ~ '^scope_mall_(read|write)_.+$';

-- 2) Backfill action endpoint metadata from staging (if exists)
update public."C_mcp_tools" t
set
  scope_key = coalesce(t.scope_key, s.scope_key),
  endpoint_path = coalesce(t.endpoint_path, s.endpoint_path),
  http_method = coalesce(t.http_method, upper(s.http_method)),
  doc_url = coalesce(t.doc_url, s.doc_url),
  source = case when t.source is null then 'cafe24_api_index' else t.source end
from public."Z_tmp_cafe24_api_index" s
where t.provider_key = 'cafe24'
  and t.tool_kind = 'action'
  and t.endpoint_path is null
  and t.http_method is null
  and s.is_active = true
  and lower(coalesce(t.operation_key, t.name)) = lower(coalesce(s.operation_key, ''))
  and coalesce(s.operation_key, '') <> '';

-- 3) Version sync (source of truth: C_mcp_tools)
insert into public."C_mcp_tool_versions" (tool_id, version, schema_json, created_at, created_by)
select t.id, t.version, t.schema_json, now(), null
from public."C_mcp_tools" t
where t.is_active = true
on conflict (tool_id, version) do update
set schema_json = excluded.schema_json,
    created_at = now();

-- 4) Policy sync (single source: C_mcp_tools; preserve existing sensitive fields)
insert into public."C_mcp_tool_policies" (
  org_id, tool_id, is_allowed, allowed_scopes, rate_limit_per_min,
  masking_rules, conditions, adapter_key, updated_at
)
select
  p.org_id,
  t.id,
  true,
  case
    when t.provider_key = 'cafe24' and t.scope_key is not null then array[t.scope_key]::text[]
    when t.provider_key = 'cafe24' and t.name like 'scope_%' then array[regexp_replace(t.name, '^scope_(mall)_(read|write)_(.+)$', E'\\1.\\2_\\3')]::text[]
    else array['read']::text[]
  end,
  60,
  null,
  null,
  case
    when t.provider_key = 'cafe24' and t.source = 'cafe24_api_index' then 'cafe24_admin_request'
    else t.name
  end,
  now()
from params p
join public."C_mcp_tools" t on t.is_active = true and t.tool_kind = 'action'
on conflict (org_id, tool_id) do update
set
  is_allowed = excluded.is_allowed,
  allowed_scopes = case
    when public."C_mcp_tool_policies".masking_rules is not null or public."C_mcp_tool_policies".conditions is not null
      then public."C_mcp_tool_policies".allowed_scopes
    else excluded.allowed_scopes
  end,
  rate_limit_per_min = coalesce(public."C_mcp_tool_policies".rate_limit_per_min, excluded.rate_limit_per_min),
  adapter_key = coalesce(public."C_mcp_tool_policies".adapter_key, excluded.adapter_key),
  updated_at = now();

-- 5) Endpoint sync from effective adapter keys (no data loss; only upsert missing)
with params as (
  select '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid as org_id,
         'sandbox'::text as env_name
),
effective as (
  select distinct
    p.org_id,
    coalesce(p.adapter_key, t.name) as adapter_key,
    t.provider_key
  from public."C_mcp_tool_policies" p
  join public."C_mcp_tools" t on t.id = p.tool_id
  join params x on x.org_id = p.org_id
  where t.is_active = true
    and t.tool_kind = 'action'
),
seed as (
  select
    e.org_id,
    e.adapter_key,
    (select env_name from params) as env,
    case
      when e.adapter_key = 'cafe24_admin_request' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
      when e.provider_key = 'cafe24' and e.adapter_key in ('subscribe_restock','trigger_restock') then 'internal://' || e.adapter_key
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

-- verification
-- 1) duplicated endpoint mapping (should be 0)
-- select provider_key, http_method, endpoint_path, count(*)
-- from public."C_mcp_tools"
-- where provider_key='cafe24' and tool_kind='action' and http_method is not null and endpoint_path is not null
-- group by provider_key, http_method, endpoint_path
-- having count(*) > 1;

-- 2) scope quality (should be 0 malformed)
-- select count(*)
-- from public."C_mcp_tools"
-- where tool_kind='scope' and provider_key='cafe24' and scope_key !~ '^mall\\.(read|write)_[a-z0-9_]+$';

-- 3) policy / version coverage
-- select count(*) as active_action_count from public."C_mcp_tools" where is_active=true and tool_kind='action';
-- select count(*) as policy_count from public."C_mcp_tool_policies" where org_id='8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid;
-- select count(distinct tool_id) as version_tool_count from public."C_mcp_tool_versions";
