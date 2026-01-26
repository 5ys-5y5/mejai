-- MCP seed data (replace 8ad81b6b-3210-40dd-8e00-9a43a4395923 with your tenant org_id)
-- Requires: mcp_schema.sql applied

-- 1) Tools
insert into mcp_tools (name, description, schema_json, version)
values
  (
    'lookup_order',
    '주문 조회',
    '{
      "type": "object",
      "properties": {
        "order_id": { "type": "string" },
        "customer_verification_token": { "type": "string" }
      },
      "required": ["order_id"]
    }'::jsonb,
    'v1'
  ),
  (
    'track_shipment',
    '배송 추적',
    '{
      "type": "object",
      "properties": {
        "carrier": { "type": "string" },
        "tracking_number": { "type": "string" }
      },
      "required": ["tracking_number"]
    }'::jsonb,
    'v1'
  ),
  (
    'create_ticket',
    '상담 티켓 생성',
    '{
      "type": "object",
      "properties": {
        "category": { "type": "string" },
        "summary": { "type": "string" },
        "priority": { "type": "string" }
      },
      "required": ["summary"]
    }'::jsonb,
    'v1'
  ),
  (
    'send_otp',
    'OTP 발송',
    '{
      "type": "object",
      "properties": {
        "destination": { "type": "string" }
      },
      "required": ["destination"]
    }'::jsonb,
    'v1'
  ),
  (
    'verify_otp',
    'OTP 검증',
    '{
      "type": "object",
      "properties": {
        "code": { "type": "string" },
        "otp_ref": { "type": "string" }
      },
      "required": ["code"]
    }'::jsonb,
    'v1'
  )
on conflict (name) do nothing;

-- 2) Tool policies (per tenant)
insert into mcp_tool_policies (org_id, tool_id, is_allowed, allowed_scopes, rate_limit_per_min, masking_rules, conditions, adapter_key)
select
  '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid as org_id,
  t.id as tool_id,
  true as is_allowed,
  array['read'] as allowed_scopes,
  30 as rate_limit_per_min,
  case
    when t.name = 'lookup_order' then '{"field_paths":["shipment_tracking"],"strategy":"mask"}'::jsonb
    when t.name = 'send_otp' then '{"field_paths":["destination"],"strategy":"mask"}'::jsonb
    else null
  end as masking_rules,
  case
    when t.name = 'lookup_order' then '{"requires_verification": true}'::jsonb
    else null
  end as conditions,
  t.name as adapter_key
from mcp_tools t
where t.name in ('lookup_order','track_shipment','create_ticket','send_otp','verify_otp')
on conflict (org_id, tool_id) do nothing;

-- 3) Tool endpoints (per tenant)
insert into mcp_tool_endpoints (org_id, adapter_key, env, base_url, auth_type, auth_ref, is_active)
values
  ('8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid, 'lookup_order', 'sandbox', 'https://sandbox.example.com/orders', 'api_key', 'secret:shopify', true),
  ('8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid, 'track_shipment', 'sandbox', 'https://sandbox.example.com/shipments', 'api_key', 'secret:carrier', true),
  ('8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid, 'create_ticket', 'sandbox', 'https://sandbox.example.com/tickets', 'api_key', 'secret:crm', true),
  ('8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid, 'send_otp', 'sandbox', 'https://sandbox.example.com/otp', 'api_key', 'secret:sms', true),
  ('8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid, 'verify_otp', 'sandbox', 'https://sandbox.example.com/otp', 'api_key', 'secret:sms', true)
on conflict (org_id, adapter_key, env) do nothing;
