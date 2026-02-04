-- Generalize G_com_restock_subscriptions for conversation-driven notifications.
-- Keep backward compatibility with restock flow.

alter table if exists public."G_com_restock_subscriptions"
  add column if not exists topic_type text not null default 'restock',
  add column if not exists topic_key text not null default '',
  add column if not exists topic_label text,
  add column if not exists intent_name text,
  add column if not exists message_template text,
  add column if not exists schedule_mode text not null default 'restock_lead_days',
  add column if not exists schedule_at timestamptz,
  add column if not exists schedule_plan jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists public."G_com_restock_subscriptions"
  drop constraint if exists g_com_restock_sub_schedule_mode_chk;

alter table if exists public."G_com_restock_subscriptions"
  add constraint g_com_restock_sub_schedule_mode_chk
  check (schedule_mode in ('restock_lead_days', 'scheduled_at', 'custom_plan'));

drop index if exists g_com_restock_sub_identity_unique;
create unique index if not exists g_com_restock_sub_identity_unique
  on public."G_com_restock_subscriptions" (org_id, mall_id, topic_type, topic_key, channel, phone, session_id);

alter table if exists public."G_com_restock_message_queue"
  add column if not exists topic_type text not null default 'restock',
  add column if not exists topic_key text not null default '',
  add column if not exists topic_label text,
  add column if not exists intent_name text,
  add column if not exists payload jsonb not null default '{}'::jsonb;

create or replace function public.sync_restock_message_queue()
returns trigger
language plpgsql
as $$
declare
  v_day int;
  v_due_date date;
  v_schedule timestamptz;
  v_next timestamptz;
  v_mode text;
  v_default_text text;
  v_elem jsonb;
  v_elem_time_raw text;
  v_elem_text text;
  v_elem_lead_day int;
begin
  delete from public."G_com_restock_message_queue"
  where subscription_id = new.id
    and status = 'pending';

  if new.status <> 'active' then
    update public."G_com_restock_subscriptions"
      set next_scheduled_at = null,
          last_schedule_refresh_at = now()
    where id = new.id;
    return new;
  end if;

  if coalesce(new.channel, '') <> 'sms' or coalesce(new.phone, '') = '' then
    update public."G_com_restock_subscriptions"
      set next_scheduled_at = null,
          last_schedule_refresh_at = now()
    where id = new.id;
    return new;
  end if;

  v_mode := coalesce(nullif(new.schedule_mode, ''), 'restock_lead_days');
  v_default_text := coalesce(
    nullif(new.message_template, ''),
    format('[알림] %s', coalesce(nullif(new.topic_label, ''), nullif(new.topic_key, ''), nullif(new.product_id, ''), '알림'))
  );

  if v_mode = 'restock_lead_days' then
    if new.restock_at is null or coalesce(array_length(new.lead_days, 1), 0) = 0 then
      update public."G_com_restock_subscriptions"
        set next_scheduled_at = null,
            last_schedule_refresh_at = now()
      where id = new.id;
      return new;
    end if;

    foreach v_day in array new.lead_days
    loop
      if v_day is null or v_day < 1 then
        continue;
      end if;

      v_due_date := new.restock_at - v_day;
      v_schedule := (
        (v_due_date::timestamp + make_interval(hours => new.schedule_hour_local))
        at time zone coalesce(nullif(new.schedule_tz, ''), 'Asia/Seoul')
      );
      if v_schedule <= now() then
        continue;
      end if;

      insert into public."G_com_restock_message_queue" (
        subscription_id, org_id, mall_id, session_id, phone, channel, product_id,
        restock_at, lead_day, scheduled_for, message_text, status, created_at, updated_at,
        topic_type, topic_key, topic_label, intent_name, payload
      ) values (
        new.id, new.org_id, new.mall_id, new.session_id, new.phone, new.channel, coalesce(new.product_id, new.topic_key, ''),
        new.restock_at, v_day, v_schedule,
        coalesce(nullif(new.message_template, ''), format('[재입고 알림] %s D-%s, 예정일 %s', coalesce(new.topic_label, new.product_id, new.topic_key), v_day, to_char(new.restock_at, 'YYYY-MM-DD'))),
        'pending', now(), now(),
        new.topic_type, new.topic_key, new.topic_label, new.intent_name,
        jsonb_build_object('mode', 'restock_lead_days', 'lead_day', v_day)
      )
      on conflict (subscription_id, lead_day, scheduled_for)
      do update set
        message_text = excluded.message_text,
        topic_type = excluded.topic_type,
        topic_key = excluded.topic_key,
        topic_label = excluded.topic_label,
        intent_name = excluded.intent_name,
        payload = excluded.payload,
        updated_at = now();
    end loop;
  elsif v_mode = 'scheduled_at' then
    if new.schedule_at is not null and new.schedule_at > now() then
      insert into public."G_com_restock_message_queue" (
        subscription_id, org_id, mall_id, session_id, phone, channel, product_id,
        restock_at, lead_day, scheduled_for, message_text, status, created_at, updated_at,
        topic_type, topic_key, topic_label, intent_name, payload
      ) values (
        new.id, new.org_id, new.mall_id, new.session_id, new.phone, new.channel, coalesce(new.product_id, new.topic_key, ''),
        new.restock_at, 0, new.schedule_at, v_default_text, 'pending', now(), now(),
        new.topic_type, new.topic_key, new.topic_label, new.intent_name,
        jsonb_build_object('mode', 'scheduled_at')
      )
      on conflict (subscription_id, lead_day, scheduled_for)
      do update set
        message_text = excluded.message_text,
        topic_type = excluded.topic_type,
        topic_key = excluded.topic_key,
        topic_label = excluded.topic_label,
        intent_name = excluded.intent_name,
        payload = excluded.payload,
        updated_at = now();
    end if;
  elsif v_mode = 'custom_plan' then
    for v_elem in
      select value
      from jsonb_array_elements(
        case when jsonb_typeof(new.schedule_plan) = 'array' then new.schedule_plan else '[]'::jsonb end
      )
    loop
      v_elem_time_raw := coalesce(v_elem->>'scheduled_for', '');
      if v_elem_time_raw = '' then
        continue;
      end if;
      begin
        v_schedule := (v_elem_time_raw)::timestamptz;
      exception when others then
        continue;
      end;
      if v_schedule <= now() then
        continue;
      end if;
      v_elem_text := coalesce(nullif(v_elem->>'message_text', ''), v_default_text);
      begin
        v_elem_lead_day := coalesce((v_elem->>'lead_day')::int, 0);
      exception when others then
        v_elem_lead_day := 0;
      end;
      insert into public."G_com_restock_message_queue" (
        subscription_id, org_id, mall_id, session_id, phone, channel, product_id,
        restock_at, lead_day, scheduled_for, message_text, status, created_at, updated_at,
        topic_type, topic_key, topic_label, intent_name, payload
      ) values (
        new.id, new.org_id, new.mall_id, new.session_id, new.phone, new.channel, coalesce(new.product_id, new.topic_key, ''),
        new.restock_at, v_elem_lead_day, v_schedule, v_elem_text, 'pending', now(), now(),
        new.topic_type, new.topic_key, new.topic_label, new.intent_name,
        jsonb_build_object('mode', 'custom_plan')
      )
      on conflict (subscription_id, lead_day, scheduled_for)
      do update set
        message_text = excluded.message_text,
        topic_type = excluded.topic_type,
        topic_key = excluded.topic_key,
        topic_label = excluded.topic_label,
        intent_name = excluded.intent_name,
        payload = excluded.payload,
        updated_at = now();
    end loop;
  end if;

  select min(scheduled_for)
    into v_next
  from public."G_com_restock_message_queue"
  where subscription_id = new.id
    and status = 'pending';

  update public."G_com_restock_subscriptions"
    set next_scheduled_at = v_next,
        last_schedule_refresh_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_sync_restock_message_queue_update on public."G_com_restock_subscriptions";
create trigger trg_sync_restock_message_queue_update
after update of
  phone,
  channel,
  product_id,
  status,
  restock_at,
  lead_days,
  schedule_tz,
  schedule_hour_local,
  mall_id,
  session_id,
  topic_type,
  topic_key,
  topic_label,
  intent_name,
  message_template,
  schedule_mode,
  schedule_at,
  schedule_plan,
  metadata
on public."G_com_restock_subscriptions"
for each row
execute function public.sync_restock_message_queue();
