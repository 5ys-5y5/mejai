-- Admin KB assignment via DB triggers (source of truth)

create or replace function public.matches_admin_group(
  apply_groups jsonb,
  user_group jsonb,
  mode text
) returns boolean
language plpgsql
as $$
declare
  rule jsonb;
  path_text text;
  group_value text;
  values text[];
  matched boolean;
  any_mode boolean := (mode = 'any');
begin
  if apply_groups is null
     or jsonb_typeof(apply_groups) <> 'array'
     or jsonb_array_length(apply_groups) = 0 then
    return true;
  end if;

  if user_group is null then
    return false;
  end if;

  for rule in select * from jsonb_array_elements(apply_groups)
  loop
    path_text := nullif(trim(coalesce(rule->>'path', '')), '');
    if path_text is null then
      matched := false;
    else
      group_value := user_group #>> string_to_array(path_text, '.');
      values := array(select jsonb_array_elements_text(coalesce(rule->'values', '[]'::jsonb)));
      matched := group_value is not null and group_value = any(values);
    end if;

    if any_mode then
      if matched then
        return true;
      end if;
    else
      if not matched then
        return false;
      end if;
    end if;
  end loop;

  return not any_mode;
end;
$$;

create or replace function public.pick_org_group(p_org_id uuid)
returns jsonb
language sql
stable
as $$
  select "group"
  from public."A_iam_user_access_maps"
  where org_id = p_org_id
  order by (org_role = 'owner') desc,
           (is_admin is true) desc,
           user_id asc
  limit 1;
$$;

create or replace function public.compute_admin_kb_ids(p_org_id uuid)
returns uuid[]
language plpgsql
as $$
declare
  g jsonb;
  ids uuid[];
begin
  select public.pick_org_group(p_org_id) into g;
  if g is null then
    return array[]::uuid[];
  end if;

  select array_agg(id) into ids
  from public."B_bot_knowledge_bases"
  where is_admin is true
    and is_active is true
    and (org_id = p_org_id or org_id is null)
    and public.matches_admin_group(
      apply_groups::jsonb,
      g,
      coalesce(apply_groups_mode, 'all')
    );

  return coalesce(ids, array[]::uuid[]);
end;
$$;

create or replace function public.update_admin_kb_ids_for_org(p_org_id uuid)
returns void
language plpgsql
as $$
begin
  if p_org_id is null then
    return;
  end if;
  update public."B_bot_agents"
  set admin_kb_ids = public.compute_admin_kb_ids(p_org_id)
  where org_id = p_org_id
    and is_active is true;
end;
$$;

create or replace function public.update_admin_kb_ids_for_all_orgs()
returns void
language plpgsql
as $$
declare
  org_row record;
begin
  for org_row in
    select distinct org_id
    from (
      select org_id from public."B_bot_agents" where org_id is not null
      union
      select org_id from public."A_iam_user_access_maps" where org_id is not null
    ) as orgs
  loop
    perform public.update_admin_kb_ids_for_org(org_row.org_id);
  end loop;
end;
$$;

create or replace function public.trg_set_agent_admin_kb_ids()
returns trigger
language plpgsql
as $$
begin
  if new.org_id is not null then
    new.admin_kb_ids := public.compute_admin_kb_ids(new.org_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_agent_admin_kb_ids on public."B_bot_agents";
create trigger trg_set_agent_admin_kb_ids
before insert or update of org_id
on public."B_bot_agents"
for each row
execute function public.trg_set_agent_admin_kb_ids();

create or replace function public.trg_sync_admin_kb_ids_from_kb()
returns trigger
language plpgsql
as $$
declare
  target_org uuid;
  should_sync boolean := false;
begin
  if tg_op = 'DELETE' then
    if old.is_admin is distinct from true then
      return null;
    end if;
    target_org := old.org_id;
    should_sync := true;
  elsif tg_op = 'INSERT' then
    if new.is_admin is distinct from true then
      return new;
    end if;
    target_org := new.org_id;
    should_sync := true;
  else
    if (old.is_admin is distinct from true) and (new.is_admin is distinct from true) then
      return new;
    end if;
    if old.is_admin is distinct from new.is_admin
       or old.is_active is distinct from new.is_active
       or old.apply_groups is distinct from new.apply_groups
       or old.apply_groups_mode is distinct from new.apply_groups_mode
       or old.org_id is distinct from new.org_id then
      target_org := coalesce(new.org_id, old.org_id);
      should_sync := true;
    end if;
  end if;

  if should_sync then
    if target_org is null then
      perform public.update_admin_kb_ids_for_all_orgs();
    else
      perform public.update_admin_kb_ids_for_org(target_org);
    end if;
  end if;

  if tg_op = 'DELETE' then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_admin_kb_ids_from_kb on public."B_bot_knowledge_bases";
create trigger trg_sync_admin_kb_ids_from_kb
after insert or update or delete
on public."B_bot_knowledge_bases"
for each row
execute function public.trg_sync_admin_kb_ids_from_kb();

create or replace function public.trg_sync_admin_kb_ids_from_access()
returns trigger
language plpgsql
as $$
declare
  target_org uuid;
begin
  if tg_op = 'DELETE' then
    target_org := old.org_id;
  else
    target_org := new.org_id;
  end if;

  if target_org is not null then
    perform public.update_admin_kb_ids_for_org(target_org);
  end if;

  if tg_op = 'UPDATE' and old.org_id is distinct from new.org_id and old.org_id is not null then
    perform public.update_admin_kb_ids_for_org(old.org_id);
  end if;

  if tg_op = 'DELETE' then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_admin_kb_ids_from_access on public."A_iam_user_access_maps";
create trigger trg_sync_admin_kb_ids_from_access
after insert or update of org_id, "group", is_admin, org_role or delete
on public."A_iam_user_access_maps"
for each row
execute function public.trg_sync_admin_kb_ids_from_access();

-- Initial backfill
select public.update_admin_kb_ids_for_all_orgs();
