-- MCP core tables (operational baseline)

create table if not exists mcp_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  schema_json jsonb not null,
  version text not null default 'v1',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists mcp_tool_versions (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references mcp_tools(id) on delete cascade,
  version text not null,
  schema_json jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid null
);

create table if not exists mcp_tool_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tool_id uuid not null references mcp_tools(id) on delete cascade,
  is_allowed boolean not null default false,
  allowed_scopes text[] not null default array['read'],
  rate_limit_per_min integer null,
  masking_rules jsonb null,
  conditions jsonb null,
  adapter_key text null,
  updated_at timestamptz not null default now(),
  unique(org_id, tool_id)
);

create table if not exists mcp_tool_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  adapter_key text not null,
  env text not null default 'prod',
  base_url text not null,
  auth_type text not null default 'api_key',
  auth_ref text null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(org_id, adapter_key, env)
);

create table if not exists mcp_tool_audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  session_id uuid null,
  tool_id uuid null,
  tool_name text not null,
  request_payload jsonb null,
  response_payload jsonb null,
  status text not null,
  latency_ms integer null,
  masked_fields jsonb null,
  policy_decision jsonb null,
  created_at timestamptz not null default now()
);
