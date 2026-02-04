begin;

-- [A] Hierarchy columns for provider -> scope -> action
alter table public."C_mcp_tools"
  add column if not exists tool_kind text,
  add column if not exists scope_key text,
  add column if not exists endpoint_path text,
  add column if not exists http_method text,
  add column if not exists operation_key text,
  add column if not exists doc_url text,
  add column if not exists source text default 'manual';

update public."C_mcp_tools"
set tool_kind = case
  when name like 'scope_%' then 'scope'
  else 'action'
end
where tool_kind is null;

alter table public."C_mcp_tools"
  alter column tool_kind set not null,
  alter column tool_kind set default 'action';

alter table public."C_mcp_tools"
  drop constraint if exists mcp_tools_tool_kind_check;
alter table public."C_mcp_tools"
  add constraint mcp_tools_tool_kind_check check (tool_kind in ('scope','action'));

-- derive scope key from scope_* rows
update public."C_mcp_tools"
set scope_key = replace(substr(name, length('scope_') + 1), '_', '.')
where tool_kind = 'scope'
  and (scope_key is null or scope_key = '');

-- ensure action rows keep provider+name uniqueness
alter table public."C_mcp_tools" drop constraint if exists mcp_tools_provider_name_key;
alter table public."C_mcp_tools"
  add constraint mcp_tools_provider_name_key unique (provider_key, name);

-- endpoint-level uniqueness for action rows
create unique index if not exists uq_mcp_tools_endpoint_action
on public."C_mcp_tools"(provider_key, http_method, endpoint_path)
where tool_kind = 'action' and http_method is not null and endpoint_path is not null;

-- [B] Staging table: load Cafe24 API Index (ALL endpoints) before running section C
create table if not exists public."Z_tmp_cafe24_api_index" (
  id bigserial primary key,
  scope_key text not null,
  http_method text not null,
  endpoint_path text not null,
  operation_title text null,
  operation_key text null,
  doc_url text null,
  is_active boolean not null default true,
  unique (scope_key, http_method, endpoint_path)
);

-- [C] Upsert scope rows from staged api index
with scopes as (
  select distinct scope_key
  from public."Z_tmp_cafe24_api_index"
  where is_active = true
)
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
  tool_kind,
  scope_key,
  source,
  created_at
)
select
  'scope_' || replace(scope_key, '.', '_') as name,
  '[' || scope_key || '] Cafe24 scope capability',
  '{"type":"object","required":["path"],"properties":{"path":{"type":"string"},"method":{"type":"string"},"query":{"type":"object"},"body":{"type":"object"}}}'::jsonb,
  'v1',
  true,
  'cafe24',
  'public',
  'open_world',
  (scope_key like 'mall.write_%'),
  'scope',
  scope_key,
  'cafe24_api_index',
  now()
from scopes
on conflict (provider_key, name) do update
set
  description = excluded.description,
  schema_json = excluded.schema_json,
  is_active = true,
  tool_kind = 'scope',
  scope_key = excluded.scope_key,
  source = excluded.source;

-- [D] Upsert endpoint action rows from staged api index
with staged as (
  select
    scope_key,
    upper(trim(http_method)) as http_method,
    trim(endpoint_path) as endpoint_path,
    nullif(trim(operation_title), '') as operation_title,
    coalesce(nullif(trim(operation_key), ''),
      lower(
        regexp_replace(
          replace(trim(endpoint_path), '/', '_') || '_' || lower(trim(http_method)),
          '[^a-zA-Z0-9_]+',
          '_',
          'g'
        )
      )
    ) as op_key,
    nullif(trim(doc_url), '') as doc_url
  from public."Z_tmp_cafe24_api_index"
  where is_active = true
),
actions as (
  select
    op_key as name,
    coalesce(operation_title, op_key) as description,
    jsonb_build_object(
      'type','object',
      'required', jsonb_build_array(),
      'properties', jsonb_build_object(
        'path_params', jsonb_build_object('type','object'),
        'query', jsonb_build_object('type','object'),
        'body', jsonb_build_object('type','object')
      )
    ) as schema_json,
    'v1'::text as version,
    true as is_active,
    'cafe24'::text as provider_key,
    'public'::text as visibility,
    'open_world'::text as access,
    (scope_key like 'mall.write_%') as is_destructive,
    'action'::text as tool_kind,
    scope_key,
    endpoint_path,
    http_method,
    op_key as operation_key,
    doc_url,
    'cafe24_api_index'::text as source
  from staged
)
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
  tool_kind,
  scope_key,
  endpoint_path,
  http_method,
  operation_key,
  doc_url,
  source,
  created_at
)
select
  name,
  description,
  schema_json,
  version,
  is_active,
  provider_key,
  visibility,
  access,
  is_destructive,
  tool_kind,
  scope_key,
  endpoint_path,
  http_method,
  operation_key,
  doc_url,
  source,
  now()
from actions
on conflict (provider_key, name) do update
set
  description = excluded.description,
  schema_json = excluded.schema_json,
  is_active = true,
  scope_key = excluded.scope_key,
  endpoint_path = excluded.endpoint_path,
  http_method = excluded.http_method,
  operation_key = excluded.operation_key,
  doc_url = excluded.doc_url,
  source = excluded.source;

-- [E] versions/policies/endpoints sync for new action rows
insert into public."C_mcp_tool_versions" (tool_id, version, schema_json, created_at, created_by)
select t.id, t.version, t.schema_json, now(), null
from public."C_mcp_tools" t
where t.provider_key = 'cafe24'
  and t.tool_kind = 'action'
  and t.is_active = true
on conflict (tool_id, version) do update
set schema_json = excluded.schema_json,
    created_at = now();

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
  '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid,
  t.id,
  true,
  case when t.scope_key is not null then array[t.scope_key]::text[] else array['read']::text[] end,
  60,
  null,
  null,
  'cafe24_admin_request',
  now()
from public."C_mcp_tools" t
where t.provider_key = 'cafe24'
  and t.tool_kind = 'action'
  and t.is_active = true
on conflict (org_id, tool_id) do update
set
  is_allowed = excluded.is_allowed,
  allowed_scopes = excluded.allowed_scopes,
  adapter_key = excluded.adapter_key,
  updated_at = now();

insert into public."C_mcp_tool_endpoints" (
  org_id,
  adapter_key,
  env,
  base_url,
  auth_type,
  auth_ref,
  is_active,
  updated_at
)
select
  '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid,
  'cafe24_admin_request',
  'sandbox',
  'https://{mall_id}.cafe24api.com/api/v2/admin',
  'api_key',
  'secret:cafe24',
  true,
  now()
on conflict (org_id, adapter_key, env) do update
set
  base_url = excluded.base_url,
  auth_type = excluded.auth_type,
  auth_ref = excluded.auth_ref,
  is_active = true,
  updated_at = now();

commit;

-- verification
-- 1) staged row count vs cafe24 action row count
-- select (select count(*) from public."Z_tmp_cafe24_api_index" where is_active=true) as staged_count,
--        (select count(*) from public."C_mcp_tools" where provider_key='cafe24' and tool_kind='action' and is_active=true and source='cafe24_api_index') as action_count;

-- 2) unscoped action check
-- select id,name from public."C_mcp_tools" where provider_key='cafe24' and tool_kind='action' and scope_key is null;
