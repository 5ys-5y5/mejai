create table if not exists public.debug_log (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null,
  turn_id uuid not null,
  seq integer null,
  prefix_json jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint debug_log_pkey primary key (id),
  constraint debug_log_session_id_fkey foreign key (session_id) references sessions (id) on delete cascade,
  constraint debug_log_turn_id_fkey foreign key (turn_id) references turns (id) on delete cascade
) tablespace pg_default;

create unique index if not exists debug_log_turn_id_key
  on public.debug_log using btree (turn_id) tablespace pg_default;
create index if not exists debug_log_session_id_idx
  on public.debug_log using btree (session_id) tablespace pg_default;
create index if not exists debug_log_session_seq_idx
  on public.debug_log using btree (session_id, seq) tablespace pg_default;

create index if not exists debug_log_prefix_json_gin
  on public.debug_log using gin (prefix_json) tablespace pg_default;

create or replace function public.debug_log_entries_to_tree(entries jsonb)
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

create or replace view public.debug_log_view as
select
  d.*,
  public.debug_log_entries_to_tree(d.prefix_json->'entries') as prefix_tree
from public.debug_log d;

alter table public.debug_log enable row level security;

drop policy if exists debug_log_select_by_org on public.debug_log;
drop policy if exists debug_log_insert_by_org on public.debug_log;
drop policy if exists debug_log_update_by_org on public.debug_log;
drop policy if exists debug_log_delete_by_org on public.debug_log;

create policy debug_log_select_by_org on public.debug_log
  for select
  using (
    exists (
      select 1
      from sessions s
      join organizations o on o.id = s.org_id
      where s.id = debug_log.session_id
        and o.owner_id = auth.uid()
    )
  );

create policy debug_log_insert_by_org on public.debug_log
  for insert
  with check (
    exists (
      select 1
      from sessions s
      join organizations o on o.id = s.org_id
      where s.id = debug_log.session_id
        and o.owner_id = auth.uid()
    )
  );

create policy debug_log_update_by_org on public.debug_log
  for update
  using (
    exists (
      select 1
      from sessions s
      join organizations o on o.id = s.org_id
      where s.id = debug_log.session_id
        and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from sessions s
      join organizations o on o.id = s.org_id
      where s.id = debug_log.session_id
        and o.owner_id = auth.uid()
    )
  );

create policy debug_log_delete_by_org on public.debug_log
  for delete
  using (
    exists (
      select 1
      from sessions s
      join organizations o on o.id = s.org_id
      where s.id = debug_log.session_id
        and o.owner_id = auth.uid()
    )
  );

alter table public.debug_log drop column if exists prefix_html;
