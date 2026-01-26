alter table agent enable row level security;

create policy "agent_read"
  on agent for select
  using (
    exists (
      select 1
      from user_access ua
      where ua.user_id = auth.uid()
        and ua.org_id = agent.org_id
    )
  );

create policy "agent_write"
  on agent for insert
  with check (
    exists (
      select 1
      from user_access ua
      where ua.user_id = auth.uid()
        and ua.org_id = agent.org_id
    )
  );

create policy "agent_update"
  on agent for update
  using (
    exists (
      select 1
      from user_access ua
      where ua.user_id = auth.uid()
        and ua.org_id = agent.org_id
    )
  );

create policy "agent_delete"
  on agent for delete
  using (
    exists (
      select 1
      from user_access ua
      where ua.user_id = auth.uid()
        and ua.org_id = agent.org_id
    )
  );
