create table if not exists public.F_audit_turn_specs (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null,
  turn_id uuid not null,
  seq integer null,
  prefix_json jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint F_audit_turn_specs_pkey primary key (id),
  constraint F_audit_turn_specs_session_id_fkey foreign key (session_id) references D_conv_sessions (id) on delete cascade,
  constraint F_audit_turn_specs_turn_id_fkey foreign key (turn_id) references D_conv_turns (id) on delete cascade
) tablespace pg_default;

create unique index if not exists F_audit_turn_specs_turn_id_key
  on public.F_audit_turn_specs using btree (turn_id) tablespace pg_default;
create index if not exists F_audit_turn_specs_session_id_idx
  on public.F_audit_turn_specs using btree (session_id) tablespace pg_default;
create index if not exists F_audit_turn_specs_session_seq_idx
  on public.F_audit_turn_specs using btree (session_id, seq) tablespace pg_default;

create index if not exists F_audit_turn_specs_prefix_json_gin
  on public.F_audit_turn_specs using gin (prefix_json) tablespace pg_default;

create or replace function public.F_audit_turn_specs_entries_to_tree(entries jsonb)
returns jsonb
language plpgsql
as $$
declare
  tree jsonb := '{}'::jsonb;
  item jsonb;
  key_path text[];
  value_text text;
begin
  if entries is null then
    return tree;
  end if;
  for item in select * from jsonb_array_elements(entries)
  loop
    key_path := string_to_array(coalesce(item->>'key',''), '.');
    value_text := item->>'value';
    if array_length(key_path, 1) is null or key_path[1] = '' then
      continue;
    end if;
    tree := jsonb_set(tree, key_path, to_jsonb(value_text), true);
  end loop;
  return tree;
end;
$$;

create or replace view public.F_audit_turn_specs_view as
select
  d.*,
  public.F_audit_turn_specs_entries_to_tree(d.prefix_json->'entries') as prefix_tree
from public.F_audit_turn_specs d;

alter table public.F_audit_turn_specs enable row level security;

drop policy if exists F_audit_turn_specs_select_by_org on public.F_audit_turn_specs;
drop policy if exists F_audit_turn_specs_insert_by_org on public.F_audit_turn_specs;
drop policy if exists F_audit_turn_specs_update_by_org on public.F_audit_turn_specs;
drop policy if exists F_audit_turn_specs_delete_by_org on public.F_audit_turn_specs;

create policy F_audit_turn_specs_select_by_org on public.F_audit_turn_specs
  for select
  using (
    exists (
      select 1
      from D_conv_sessions s
      join A_iam_organizations o on o.id = s.org_id
      where s.id = F_audit_turn_specs.session_id
        and o.owner_id = auth.uid()
    )
  );

create policy F_audit_turn_specs_insert_by_org on public.F_audit_turn_specs
  for insert
  with check (
    exists (
      select 1
      from D_conv_sessions s
      join A_iam_organizations o on o.id = s.org_id
      where s.id = F_audit_turn_specs.session_id
        and o.owner_id = auth.uid()
    )
  );

create policy F_audit_turn_specs_update_by_org on public.F_audit_turn_specs
  for update
  using (
    exists (
      select 1
      from D_conv_sessions s
      join A_iam_organizations o on o.id = s.org_id
      where s.id = F_audit_turn_specs.session_id
        and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from D_conv_sessions s
      join A_iam_organizations o on o.id = s.org_id
      where s.id = F_audit_turn_specs.session_id
        and o.owner_id = auth.uid()
    )
  );

create policy F_audit_turn_specs_delete_by_org on public.F_audit_turn_specs
  for delete
  using (
    exists (
      select 1
      from D_conv_sessions s
      join A_iam_organizations o on o.id = s.org_id
      where s.id = F_audit_turn_specs.session_id
        and o.owner_id = auth.uid()
    )
  );

alter table public.F_audit_turn_specs drop column if exists prefix_html;
