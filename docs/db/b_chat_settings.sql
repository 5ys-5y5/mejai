-- B_chat_settings: org-wide chat policy store
-- Run this once in Supabase SQL editor (or your migration tool).

create table if not exists "B_chat_settings" (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  chat_policy jsonb not null default '{}'::jsonb,
  runtime_env jsonb not null default '{}'::jsonb,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists b_chat_settings_org_id_key
  on "B_chat_settings"(org_id);

-- If the table already exists, ensure runtime_env column is present.
alter table "B_chat_settings"
  add column if not exists runtime_env jsonb not null default '{}'::jsonb;

-- Optional: backfill from A_iam_auth_settings.providers.chat_policy (latest per org)
-- insert into "B_chat_settings"(org_id, chat_policy, updated_at)
-- select distinct on (org_id)
--   org_id,
--   providers->'chat_policy' as chat_policy,
--   updated_at
-- from "A_iam_auth_settings"
-- where providers ? 'chat_policy'
-- order by org_id, updated_at desc;

-- Optional: backfill from A_iam_auth_settings.providers.runtime_env (latest per org)
-- insert into "B_chat_settings"(org_id, runtime_env, updated_at)
-- select distinct on (org_id)
--   org_id,
--   providers->'runtime_env' as runtime_env,
--   updated_at
-- from "A_iam_auth_settings"
-- where providers ? 'runtime_env'
-- order by org_id, updated_at desc
-- on conflict (org_id) do update
-- set runtime_env = excluded.runtime_env,
--     updated_at = excluded.updated_at;
