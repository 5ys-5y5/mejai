-- 1) 단일 행 기반 인증 설정 테이블 (user/org 1행)
create table if not exists public.auth_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  providers jsonb not null default '{}'::jsonb, -- provider별 설정 저장
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- 2) 인덱스
create index if not exists idx_auth_settings_org_id on public.auth_settings(org_id);
create index if not exists idx_auth_settings_user_id on public.auth_settings(user_id);

-- 3) RLS
alter table public.auth_settings enable row level security;

create policy "auth_settings_read"
on public.auth_settings
for select
using (exists (
  select 1
  from public.user_access ua
  where ua.org_id = auth_settings.org_id
    and ua.user_id = auth.uid()
));

create policy "auth_settings_write"
on public.auth_settings
for insert
with check (auth.uid() = user_id and exists (
  select 1
  from public.user_access ua
  where ua.org_id = auth_settings.org_id
    and ua.user_id = auth.uid()
));

create policy "auth_settings_update"
on public.auth_settings
for update
using (auth.uid() = user_id and exists (
  select 1
  from public.user_access ua
  where ua.org_id = auth_settings.org_id
    and ua.user_id = auth.uid()
));
