-- Restock subscription hardening + scheduled SMS queue
-- Apply in Supabase SQL editor.

alter table if exists public."G_com_restock_subscriptions"
  add column if not exists mall_id text,
  add column if not exists session_id uuid,
  add column if not exists source_turn_id uuid,
  add column if not exists restock_at date,
  add column if not exists lead_days int[] not null default '{}'::int[],
  add column if not exists schedule_tz text not null default 'Asia/Seoul',
  add column if not exists schedule_hour_local int not null default 17,
  add column if not exists next_scheduled_at timestamptz,
  add column if not exists last_schedule_refresh_at timestamptz;

alter table if exists public."G_com_restock_subscriptions"
  drop constraint if exists g_com_restock_sub_schedule_hour_chk;

alter table if exists public."G_com_restock_subscriptions"
  add constraint g_com_restock_sub_schedule_hour_chk
  check (schedule_hour_local >= 0 and schedule_hour_local <= 23);

create unique index if not exists g_com_restock_sub_identity_unique
  on public."G_com_restock_subscriptions" (org_id, mall_id, product_id, channel, phone, session_id);

create table if not exists public."G_com_restock_message_queue" (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public."G_com_restock_subscriptions" (id) on delete cascade,
  org_id uuid,
  mall_id text,
  session_id uuid,
  phone text not null,
  channel text not null,
  product_id text not null,
  restock_at date,
  lead_day int not null,
  scheduled_for timestamptz not null,
  message_text text,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  solapi_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint g_com_restock_msg_status_chk
    check (status in ('pending','sent','failed','canceled'))
);

create unique index if not exists g_com_restock_msg_unique
  on public."G_com_restock_message_queue" (subscription_id, lead_day, scheduled_for);

create index if not exists g_com_restock_msg_due_idx
  on public."G_com_restock_message_queue" (status, scheduled_for);

create or replace function public.set_restock_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_restock_subscription_updated_at on public."G_com_restock_subscriptions";

create trigger trg_set_restock_subscription_updated_at
before insert or update on public."G_com_restock_subscriptions"
for each row
execute function public.set_restock_subscription_updated_at();

create or replace function public.sync_restock_message_queue()
returns trigger
language plpgsql
as $$
declare
  v_day int;
  v_due_date date;
  v_schedule timestamptz;
  v_next timestamptz;
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
      subscription_id,
      org_id,
      mall_id,
      session_id,
      phone,
      channel,
      product_id,
      restock_at,
      lead_day,
      scheduled_for,
      message_text,
      status,
      created_at,
      updated_at
    ) values (
      new.id,
      new.org_id,
      new.mall_id,
      new.session_id,
      new.phone,
      new.channel,
      new.product_id,
      new.restock_at,
      v_day,
      v_schedule,
      format('[재입고 알림] 상품 %s 입고 %s일 전 알림입니다. 예정일 %s', new.product_id, v_day, to_char(new.restock_at, 'YYYY-MM-DD')),
      'pending',
      now(),
      now()
    )
    on conflict (subscription_id, lead_day, scheduled_for)
    do update
      set message_text = excluded.message_text,
          updated_at = now();
  end loop;

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

drop trigger if exists trg_sync_restock_message_queue_insert on public."G_com_restock_subscriptions";
drop trigger if exists trg_sync_restock_message_queue_update on public."G_com_restock_subscriptions";

create trigger trg_sync_restock_message_queue_insert
after insert on public."G_com_restock_subscriptions"
for each row
execute function public.sync_restock_message_queue();

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
  session_id
on public."G_com_restock_subscriptions"
for each row
execute function public.sync_restock_message_queue();
