-- Add admin_kb_ids to B_bot_agents for canonical agent config.
-- null = use group matching at runtime, [] = explicitly none, [ids...] = pinned admin KBs.
alter table public."B_bot_agents"
  add column if not exists admin_kb_ids uuid[] null;
