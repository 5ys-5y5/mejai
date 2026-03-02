-- 1) Agents
alter table public."B_bot_agents"
  add column if not exists is_public boolean not null default false;

-- 2) Knowledge Bases
alter table public."B_bot_knowledge_bases"
  add column if not exists is_public boolean not null default false;

-- 3) Chat Widgets
alter table public."B_chat_widgets"
  add column if not exists is_public boolean not null default false;

-- 4) MCP Tools
alter table public."C_mcp_tools"
  add column if not exists is_public boolean not null default false;