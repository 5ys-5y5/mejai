-- MCP RLS policies (Supabase)
-- Ensure user_access table exists and has user_id, org_id

alter table mcp_tools enable row level security;
alter table mcp_tool_versions enable row level security;
alter table mcp_tool_policies enable row level security;
alter table mcp_tool_endpoints enable row level security;
alter table mcp_tool_audit_logs enable row level security;

-- mcp_tools: readable by all authenticated users
create policy "mcp_tools_read"
  on mcp_tools for select
  to authenticated
  using (true);

-- mcp_tool_versions: readable by org members (via parent tool)
create policy "mcp_tool_versions_read"
  on mcp_tool_versions for select
  to authenticated
  using (
    exists (
      select 1
      from mcp_tools t
      where t.id = mcp_tool_versions.tool_id
    )
  );

-- mcp_tool_policies: org-scoped read/write
create policy "mcp_tool_policies_read"
  on mcp_tool_policies for select
  to authenticated
  using (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );

create policy "mcp_tool_policies_write"
  on mcp_tool_policies for insert
  to authenticated
  with check (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );

create policy "mcp_tool_policies_update"
  on mcp_tool_policies for update
  to authenticated
  using (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );

-- mcp_tool_endpoints: org-scoped read/write
create policy "mcp_tool_endpoints_read"
  on mcp_tool_endpoints for select
  to authenticated
  using (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );

create policy "mcp_tool_endpoints_write"
  on mcp_tool_endpoints for insert
  to authenticated
  with check (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );

create policy "mcp_tool_endpoints_update"
  on mcp_tool_endpoints for update
  to authenticated
  using (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );

-- mcp_tool_audit_logs: org-scoped read/write
create policy "mcp_tool_audit_logs_read"
  on mcp_tool_audit_logs for select
  to authenticated
  using (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );

create policy "mcp_tool_audit_logs_write"
  on mcp_tool_audit_logs for insert
  to authenticated
  with check (
    org_id in (select org_id from user_access where user_id = auth.uid())
  );
