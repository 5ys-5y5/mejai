-- Enable RLS and apply ownership policies for Agents/KB/Widgets/MCP

-- B_bot_agents
alter table public."B_bot_agents" enable row level security;

drop policy if exists "agents_select" on public."B_bot_agents";
create policy "agents_select" on public."B_bot_agents"
  for select
  using (
    is_public = true
    or created_by = auth.uid()
    or auth.uid() = any(owner_user_ids)
    or auth.uid() = any(allowed_user_ids)
  );

drop policy if exists "agents_insert" on public."B_bot_agents";
create policy "agents_insert" on public."B_bot_agents"
  for insert
  with check (created_by = auth.uid());

drop policy if exists "agents_update" on public."B_bot_agents";
create policy "agents_update" on public."B_bot_agents"
  for update
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids))
  with check (created_by = auth.uid() or auth.uid() = any(owner_user_ids));

drop policy if exists "agents_delete" on public."B_bot_agents";
create policy "agents_delete" on public."B_bot_agents"
  for delete
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids));

-- B_bot_knowledge_bases
alter table public."B_bot_knowledge_bases" enable row level security;

drop policy if exists "kb_select" on public."B_bot_knowledge_bases";
create policy "kb_select" on public."B_bot_knowledge_bases"
  for select
  using (
    is_public = true
    or created_by = auth.uid()
    or auth.uid() = any(owner_user_ids)
    or auth.uid() = any(allowed_user_ids)
  );

drop policy if exists "kb_insert" on public."B_bot_knowledge_bases";
create policy "kb_insert" on public."B_bot_knowledge_bases"
  for insert
  with check (created_by = auth.uid());

drop policy if exists "kb_update" on public."B_bot_knowledge_bases";
create policy "kb_update" on public."B_bot_knowledge_bases"
  for update
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids))
  with check (created_by = auth.uid() or auth.uid() = any(owner_user_ids));

drop policy if exists "kb_delete" on public."B_bot_knowledge_bases";
create policy "kb_delete" on public."B_bot_knowledge_bases"
  for delete
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids));

-- B_chat_widgets
alter table public."B_chat_widgets" enable row level security;

drop policy if exists "widgets_select" on public."B_chat_widgets";
create policy "widgets_select" on public."B_chat_widgets"
  for select
  using (
    is_public = true
    or created_by = auth.uid()
    or auth.uid() = any(owner_user_ids)
    or auth.uid() = any(allowed_user_ids)
  );

drop policy if exists "widgets_insert" on public."B_chat_widgets";
create policy "widgets_insert" on public."B_chat_widgets"
  for insert
  with check (created_by = auth.uid());

drop policy if exists "widgets_update" on public."B_chat_widgets";
create policy "widgets_update" on public."B_chat_widgets"
  for update
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids))
  with check (created_by = auth.uid() or auth.uid() = any(owner_user_ids));

drop policy if exists "widgets_delete" on public."B_chat_widgets";
create policy "widgets_delete" on public."B_chat_widgets"
  for delete
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids));

-- C_mcp_tools
alter table public."C_mcp_tools" enable row level security;

drop policy if exists "mcp_select" on public."C_mcp_tools";
create policy "mcp_select" on public."C_mcp_tools"
  for select
  using (
    is_public = true
    or created_by = auth.uid()
    or auth.uid() = any(owner_user_ids)
    or auth.uid() = any(allowed_user_ids)
  );

drop policy if exists "mcp_insert" on public."C_mcp_tools";
create policy "mcp_insert" on public."C_mcp_tools"
  for insert
  with check (created_by = auth.uid());

drop policy if exists "mcp_update" on public."C_mcp_tools";
create policy "mcp_update" on public."C_mcp_tools"
  for update
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids))
  with check (created_by = auth.uid() or auth.uid() = any(owner_user_ids));

drop policy if exists "mcp_delete" on public."C_mcp_tools";
create policy "mcp_delete" on public."C_mcp_tools"
  for delete
  using (created_by = auth.uid() or auth.uid() = any(owner_user_ids));