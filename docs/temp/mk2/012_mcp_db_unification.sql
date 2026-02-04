begin;

create extension if not exists pgcrypto;

alter table public."C_mcp_tools"
  add column if not exists provider_key text,
  add column if not exists display_name text,
  add column if not exists visibility text,
  add column if not exists access text,
  add column if not exists is_destructive boolean;

update public."C_mcp_tools"
set
  provider_key = coalesce(
    provider_key,
    case
      when name in ('send_otp', 'verify_otp') then 'solapi'
      when name = 'search_address' then 'juso'
      else 'cafe24'
    end
  ),
  display_name = coalesce(display_name, concat(coalesce(provider_key, 'unknown'), '_', name)),
  visibility = coalesce(visibility, 'public'),
  access = coalesce(access, 'open_world'),
  is_destructive = coalesce(
    is_destructive,
    (
      name like 'update_%'
      or name like 'create_%'
      or name like 'trigger_%'
      or name like 'send_%'
      or name like 'cafe24_scope_mall_write_%'
      or name = 'cafe24_admin_request'
    )
  );

alter table public."C_mcp_tools"
  alter column provider_key set default 'unknown',
  alter column provider_key set not null,
  alter column visibility set default 'public',
  alter column visibility set not null,
  alter column access set default 'open_world',
  alter column access set not null,
  alter column is_destructive set default false,
  alter column is_destructive set not null;

create index if not exists idx_mcp_tools_provider_active on public."C_mcp_tools" (provider_key, is_active);

alter table public."C_mcp_tools" drop constraint if exists mcp_tools_name_key;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mcp_tools_provider_name_key'
      and conrelid = 'public."C_mcp_tools"'::regclass
  ) then
    alter table public."C_mcp_tools"
      add constraint mcp_tools_provider_name_key unique (provider_key, name);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mcp_tool_versions_tool_id_version_key'
      and conrelid = 'public."C_mcp_tool_versions"'::regclass
  ) then
    alter table public."C_mcp_tool_versions"
      add constraint mcp_tool_versions_tool_id_version_key unique (tool_id, version);
  end if;
end $$;

with
params as (
  select '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid as org_id,
         'sandbox'::text as env_name
),
base_actions as (
  select *
  from (
    values
      (
        'send_otp',
        'OTP 발송',
        '{"type":"object","required":["destination"],"properties":{"destination":{"type":"string"}}}'::jsonb,
        'v1',
        'solapi',
        true,
        'send_otp',
        array['read']::text[],
        30,
        '{"strategy":"mask","field_paths":["destination"]}'::jsonb,
        null::jsonb
      ),
      (
        'verify_otp',
        'OTP 검증',
        '{"type":"object","required":["code"],"properties":{"code":{"type":"string"},"otp_ref":{"type":"string"}}}'::jsonb,
        'v1',
        'solapi',
        false,
        'verify_otp',
        array['read']::text[],
        30,
        null::jsonb,
        null::jsonb
      ),
      (
        'list_orders',
        '주문 목록 조회',
        '{"type":"object","required":["start_date","end_date"],"properties":{"limit":{"type":"number"},"offset":{"type":"number"},"end_date":{"type":"string"},"start_date":{"type":"string"}}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'list_orders',
        array['read']::text[],
        30,
        null::jsonb,
        null::jsonb
      ),
      (
        'find_customer_by_phone',
        '휴대폰 번호로 고객 조회',
        '{"type":"object","required":[],"properties":{"cellphone":{"type":"string"},"member_id":{"type":"string"}}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'find_customer_by_phone',
        array['read']::text[],
        30,
        null::jsonb,
        null::jsonb
      ),
      (
        'list_boards',
        '게시판 목록 조회',
        '{"type":"object","required":[],"properties":{}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'list_boards',
        array['read']::text[],
        30,
        null::jsonb,
        null::jsonb
      ),
      (
        'list_board_articles',
        '게시판 글 목록 조회',
        '{"type":"object","required":["board_no"],"properties":{"limit":{"type":"number"},"offset":{"type":"number"},"keyword":{"type":"string"},"board_no":{"type":"string"},"end_date":{"type":"string"},"start_date":{"type":"string"}}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'list_board_articles',
        array['read']::text[],
        30,
        null::jsonb,
        null::jsonb
      ),
      (
        'lookup_order',
        '주문 조회',
        '{"type":"object","required":["order_id"],"properties":{"order_id":{"type":"string"},"customer_verification_token":{"type":"string"}}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'lookup_order',
        array['read']::text[],
        30,
        '{"strategy":"mask","field_paths":["shipment_tracking"]}'::jsonb,
        '{"requires_verification":true}'::jsonb
      ),
      (
        'create_ticket',
        '상담 티켓 생성',
        '{"type":"object","required":["summary"],"properties":{"summary":{"type":"string"},"category":{"type":"string"},"priority":{"type":"string"}}}'::jsonb,
        'v1',
        'cafe24',
        true,
        'create_ticket',
        array['read']::text[],
        30,
        null::jsonb,
        null::jsonb
      ),
      (
        'track_shipment',
        '배송 추적',
        '{"type":"object","required":["order_id"],"properties":{"order_id":{"type":"string"}}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'track_shipment',
        array['read']::text[],
        30,
        null::jsonb,
        null::jsonb
      ),
      (
        'read_product',
        'Read product details from Cafe24.',
        '{"type":"object","required":["product_no"],"properties":{"embed":{"type":"string"},"fields":{"type":"string"},"product_id":{"type":"string"},"product_no":{"type":"string"}}}'::jsonb,
        'mk2',
        'cafe24',
        false,
        'read_product',
        array['read']::text[],
        null,
        null::jsonb,
        null::jsonb
      ),
      (
        'read_supply',
        'Read supplier metadata (Cafe24 suppliers).',
        '{"type":"object","required":[],"properties":{"limit":{"type":"number"},"offset":{"type":"number"},"supplier_code":{"type":"string"},"supplier_name":{"type":"string"}}}'::jsonb,
        'mk2',
        'cafe24',
        false,
        'read_supply',
        array['read']::text[],
        null,
        null::jsonb,
        null::jsonb
      ),
      (
        'read_shipping',
        'Read shipping configurations (Cafe24 shipping).',
        '{"type":"object","required":[],"properties":{}}'::jsonb,
        'mk2',
        'cafe24',
        false,
        'read_shipping',
        array['write']::text[],
        null,
        null::jsonb,
        null::jsonb
      ),
      (
        'update_order_shipping_address',
        'Update shipping address for an order (Cafe24 receivers).',
        '{"type":"object","required":["order_id","address1"],"properties":{"zipcode":{"type":"string"},"address1":{"type":"string"},"address2":{"type":"string"},"order_id":{"type":"string"},"address_full":{"type":"string"},"receiver_name":{"type":"string"},"shipping_code":{"type":"string"},"receiver_phone":{"type":"string"},"shipping_message":{"type":"string"},"receiver_cellphone":{"type":"string"},"change_default_shipping_address":{"type":"string"}}}'::jsonb,
        'mk2',
        'cafe24',
        true,
        'update_order_shipping_address',
        array['write']::text[],
        null,
        null::jsonb,
        null::jsonb
      ),
      (
        'resolve_product',
        'Resolve product_id from an alias/query string.',
        '{"type":"object","required":["query"],"properties":{"query":{"type":"string"}}}'::jsonb,
        'mk2',
        'cafe24',
        false,
        'resolve_product',
        array['read']::text[],
        null,
        null::jsonb,
        null::jsonb
      ),
      (
        'subscribe_restock',
        'Create a restock subscription for a product_id.',
        '{"type":"object","required":["product_id","channel"],"properties":{"phone":{"type":"string"},"actions":{"type":"array"},"channel":{"type":"string"},"product_id":{"type":"string"},"customer_id":{"type":"string"},"trigger_type":{"type":"string"},"trigger_value":{"type":"string"}}}'::jsonb,
        'mk2',
        'cafe24',
        true,
        'subscribe_restock',
        array['write']::text[],
        null,
        null::jsonb,
        null::jsonb
      ),
      (
        'trigger_restock',
        'Internal hook for restock triggers (worker use).',
        '{"type":"object","required":["product_id","trigger_type"],"properties":{"product_id":{"type":"string"},"trigger_type":{"type":"string"},"trigger_value":{"type":"string"}}}'::jsonb,
        'mk2',
        'cafe24',
        true,
        'trigger_restock',
        array['write']::text[],
        null,
        null::jsonb,
        null::jsonb
      ),
      (
        'read_order_settings',
        'Retrieve Cafe24 order settings (/orders/setting)',
        '{"type":"object","properties":{"shop_no":{"type":"string","example":"1"}}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'read_order_settings',
        array['read']::text[],
        60,
        null::jsonb,
        null::jsonb
      ),
      (
        'update_order_settings',
        'Update Cafe24 order settings (/orders/setting)',
        '{"type":"object","properties":{"shop_no":{"type":"string","example":"1"},"request":{"type":"object","example":{"cancel_auto_stock_back":"T","return_auto_stock_back":"T"}}}}'::jsonb,
        'v1',
        'cafe24',
        true,
        'update_order_settings',
        array['write']::text[],
        60,
        null::jsonb,
        null::jsonb
      ),
      (
        'list_activitylogs',
        'Retrieve Cafe24 activity logs (/activitylogs)',
        '{"type":"object","properties":{"shop_no":{"type":"string","example":"1"},"limit":{"type":"number","example":50},"offset":{"type":"number","example":0}}}'::jsonb,
        'v1',
        'cafe24',
        false,
        'list_activitylogs',
        array['read']::text[],
        60,
        null::jsonb,
        null::jsonb
      ),
      (
        'admin_request',
        'Generic Cafe24 Admin API caller (path/method/query/body)',
        '{"type":"object","properties":{"path":{"type":"string","example":"/orders/setting"},"method":{"type":"string","example":"GET"},"query":{"type":"object","example":{"shop_no":"1"}},"body":{"type":"object","example":{"request":{"cancel_auto_stock_back":"T"}}},"required_scope":{"type":"string","example":"mall.read_store"}},"required":["path"]}'::jsonb,
        'v1',
        'cafe24',
        true,
        'cafe24_admin_request',
        array['read','write']::text[],
        60,
        null::jsonb,
        null::jsonb
      ),
      (
        'search_address',
        'Search Korean address by keyword to get zipcode (Juso)',
        '{"type":"object","properties":{"keyword":{"type":"string","example":"서울시 관악구 신림동 1515-7"}},"required":["keyword"]}'::jsonb,
        'v1',
        'juso',
        false,
        'search_address',
        array['read']::text[],
        60,
        null::jsonb,
        null::jsonb
      )
  ) as t(
    name,
    description,
    schema_json,
    version,
    provider_key,
    is_destructive,
    adapter_key,
    allowed_scopes,
    rate_limit_per_min,
    masking_rules,
    conditions
  )
),
scope_defs as (
  select scope
  from (
    values
      ('mall.read_analytics'),
      ('mall.read_application'),
      ('mall.read_category'),
      ('mall.read_collection'),
      ('mall.read_community'),
      ('mall.read_customer'),
      ('mall.read_design'),
      ('mall.read_notification'),
      ('mall.read_order'),
      ('mall.read_personal'),
      ('mall.read_product'),
      ('mall.read_promotion'),
      ('mall.read_salesreport'),
      ('mall.read_shipping'),
      ('mall.read_store'),
      ('mall.read_supply'),
      ('mall.read_translation'),
      ('mall.write_application'),
      ('mall.write_category'),
      ('mall.write_collection'),
      ('mall.write_community'),
      ('mall.write_customer'),
      ('mall.write_design'),
      ('mall.write_notification'),
      ('mall.write_order'),
      ('mall.write_personal'),
      ('mall.write_product'),
      ('mall.write_promotion'),
      ('mall.write_shipping'),
      ('mall.write_store'),
      ('mall.write_supply'),
      ('mall.write_translation')
  ) as s(scope)
),
scope_actions as (
  select
    concat('scope_', replace(scope, '.', '_')) as name,
    concat('[', scope, '] Cafe24 Admin API generic action') as description,
    '{"type":"object","properties":{"path":{"type":"string"},"method":{"type":"string"},"query":{"type":"object"},"body":{"type":"object"}},"required":["path"]}'::jsonb as schema_json,
    'v1'::text as version,
    'cafe24'::text as provider_key,
    (scope like 'mall.write_%') as is_destructive,
    concat('cafe24_scope_', replace(scope, '.', '_')) as adapter_key,
    array[scope]::text[] as allowed_scopes,
    60::int as rate_limit_per_min,
    null::jsonb as masking_rules,
    null::jsonb as conditions
  from scope_defs
),
all_actions as (
  select * from base_actions
  union all
  select * from scope_actions
),
upsert_tools as (
  insert into public."C_mcp_tools" (
    name,
    description,
    schema_json,
    version,
    is_active,
    provider_key,
    display_name,
    visibility,
    access,
    is_destructive,
    created_at
  )
  select
    name,
    description,
    schema_json,
    version,
    true,
    provider_key,
    name,
    'public',
    'open_world',
    is_destructive,
    now()
  from all_actions
  on conflict (provider_key, name) do update
  set
    description = excluded.description,
    schema_json = excluded.schema_json,
    version = excluded.version,
    is_active = true,
    provider_key = excluded.provider_key,
    display_name = excluded.display_name,
    visibility = excluded.visibility,
    access = excluded.access,
    is_destructive = excluded.is_destructive
  returning id, name
),
upsert_versions as (
  insert into public."C_mcp_tool_versions" (
    tool_id,
    version,
    schema_json,
    created_at,
    created_by
  )
  select
    t.id,
    a.version,
    a.schema_json,
    now(),
    null
  from all_actions a
  join public."C_mcp_tools" t on t.name = a.name
  on conflict (tool_id, version) do update
  set
    schema_json = excluded.schema_json,
    created_at = now()
  returning tool_id
),
upsert_policies as (
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
    p.org_id,
    t.id,
    true,
    a.allowed_scopes,
    a.rate_limit_per_min,
    a.masking_rules,
    a.conditions,
    a.adapter_key,
    now()
  from params p
  join all_actions a on true
  join public."C_mcp_tools" t on t.name = a.name
  on conflict (org_id, tool_id) do update
  set
    is_allowed = excluded.is_allowed,
    allowed_scopes = excluded.allowed_scopes,
    rate_limit_per_min = excluded.rate_limit_per_min,
    masking_rules = excluded.masking_rules,
    conditions = excluded.conditions,
    adapter_key = excluded.adapter_key,
    updated_at = now()
  returning tool_id
),
endpoint_seed as (
  select
    p.org_id,
    a.adapter_key,
    p.env_name as env,
    case
      when a.provider_key = 'solapi' then 'https://api.solapi.com'
      when a.provider_key = 'juso' then 'https://business.juso.go.kr'
      when a.provider_key = 'cafe24' and a.adapter_key in ('subscribe_restock', 'trigger_restock') then concat('internal://', a.adapter_key)
      when a.provider_key = 'cafe24' then 'https://{mall_id}.cafe24api.com/api/v2/admin'
      else concat('internal://', a.adapter_key)
    end as base_url,
    case
      when a.provider_key in ('solapi', 'cafe24') then 'api_key'
      when a.provider_key = 'juso' then 'query_key'
      else 'none'
    end as auth_type,
    case
      when a.adapter_key in ('send_otp', 'verify_otp') then 'secret:solapi'
      when a.adapter_key = 'search_address' then 'secret:juso'
      when a.provider_key = 'cafe24' then 'secret:cafe24'
      else null
    end as auth_ref
  from params p
  join all_actions a on true
),
upsert_endpoints as (
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
    org_id,
    adapter_key,
    env,
    base_url,
    auth_type,
    auth_ref,
    true,
    now()
  from endpoint_seed
  on conflict (org_id, adapter_key, env) do update
  set
    base_url = excluded.base_url,
    auth_type = excluded.auth_type,
    auth_ref = excluded.auth_ref,
    is_active = true,
    updated_at = now()
  returning adapter_key
)
select
  (select count(*) from all_actions) as expected_action_count,
  (select count(*) from upsert_tools) as tools_upsert_touched,
  (select count(*) from upsert_versions) as versions_upsert_touched,
  (select count(*) from upsert_policies) as policies_upsert_touched,
  (select count(*) from upsert_endpoints) as endpoints_upsert_touched,
  (select count(*) from public."C_mcp_tools" where name in (select name from all_actions) and is_active = true) as tools_upserted,
  (select count(*) from public."C_mcp_tool_versions" v join public."C_mcp_tools" t on t.id = v.tool_id where t.name in (select name from all_actions)) as versions_total,
  (select count(*) from public."C_mcp_tool_policies" p join public."C_mcp_tools" t on t.id = p.tool_id where p.org_id = (select org_id from params) and t.name in (select name from all_actions)) as policies_total,
  (select count(*) from public."C_mcp_tool_endpoints" e where e.org_id = (select org_id from params) and e.adapter_key in (select adapter_key from all_actions) and e.env = (select env_name from params)) as endpoints_total;

commit;
