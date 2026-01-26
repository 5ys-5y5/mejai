create table if not exists agent (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null,
  name text not null,
  llm text not null check (llm in ('chatgpt', 'gemini')),
  kb_id uuid not null references knowledge_base(id) on delete restrict,
  mcp_tool_ids jsonb not null default '[]'::jsonb,
  agent_type text,
  industry text,
  use_case text,
  website text,
  goal text,
  version text,
  is_active boolean not null default true,
  org_id uuid,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists agent_parent_id_idx on agent(parent_id);
create index if not exists agent_org_id_idx on agent(org_id);
create index if not exists agent_kb_id_idx on agent(kb_id);

alter table knowledge_base
  add column if not exists llm text;

alter table knowledge_base
  add constraint knowledge_base_llm_check
  check (llm in ('chatgpt', 'gemini')) not valid;

alter table knowledge_base
  validate constraint knowledge_base_llm_check;

update knowledge_base set llm = 'chatgpt' where llm is null;
