alter table public."B_chat_widget_instances"
  add column if not exists creation_path text;

alter table public."B_chat_widget_instances"
  alter column creation_path set default 'legacy_unknown';

update public."B_chat_widget_instances"
set creation_path = 'legacy_unknown'
where creation_path is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'b_chat_widget_instances_creation_path_check'
  ) then
    alter table public."B_chat_widget_instances"
      add constraint b_chat_widget_instances_creation_path_check
      check (creation_path in ('app_create_chat', 'api_widget_instances', 'legacy_unknown'));
  end if;
end
$$;
