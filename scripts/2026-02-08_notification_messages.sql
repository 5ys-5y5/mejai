create table public."E_ops_notification_messages" (
  id uuid not null default gen_random_uuid(),
  org_id uuid null,
  mall_id text null,
  session_id uuid null,
  channel text not null,
  phone text null,
  category text not null default 'general'::text,
  topic_type text null,
  topic_key text null,
  topic_label text null,
  product_id text null,
  product_name text null,
  restock_at date null,
  lead_day integer not null default 0,
  scheduled_for timestamp with time zone null,
  template_key text null,
  template_vars jsonb not null default '{}'::jsonb,
  message_text text null,
  status text not null default 'pending'::text,
  attempts integer not null default 0,
  last_error text null,
  sent_at timestamp with time zone null,
  solapi_message_id text null,
  schedule_tz text not null default 'Asia/Seoul'::text,
  schedule_hour_local integer not null default 17,
  intent_name text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  source_turn_id uuid null,
  solapi_registered boolean not null default false,
  solapi_register_error text null,
  constraint e_ops_notification_messages_pkey primary key (id),
  constraint e_ops_notification_messages_status_chk check (
    status = any (array['pending'::text, 'scheduled'::text, 'sent'::text, 'failed'::text, 'canceled'::text])
  )
);

create index if not exists e_ops_notification_messages_due_idx
  on public."E_ops_notification_messages" using btree (status, scheduled_for);

create index if not exists e_ops_notification_messages_org_idx
  on public."E_ops_notification_messages" using btree (org_id, category);

create index if not exists e_ops_notification_messages_phone_idx
  on public."E_ops_notification_messages" using btree (phone);
