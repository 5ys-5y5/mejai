-- 1) OAuth 토큰 테이블 (최소 테이블, FK로 유저 연결)
create table if not exists public.auth_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, -- 예: 'cafe24', 'shopify'
  mall_id text null,
  client_id text not null,
  client_secret text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (org_id, user_id, provider)
);

-- 2) 인덱스 (조회 성능)
create index if not exists idx_auth_oauth_tokens_org_id on public.auth_oauth_tokens(org_id);
create index if not exists idx_auth_oauth_tokens_user_id on public.auth_oauth_tokens(user_id);
create index if not exists idx_auth_oauth_tokens_provider on public.auth_oauth_tokens(provider);

-- 3) RLS 활성화
alter table public.auth_oauth_tokens enable row level security;

-- 4) RLS 정책: org/user 기준 접근
create policy "auth_oauth_tokens_read"
on public.auth_oauth_tokens
for select
using (exists (
  select 1
  from public.user_access ua
  where ua.org_id = auth_oauth_tokens.org_id
    and ua.user_id = auth.uid()
));

create policy "auth_oauth_tokens_write"
on public.auth_oauth_tokens
for insert
with check (auth.uid() = user_id and exists (
  select 1
  from public.user_access ua
  where ua.org_id = auth_oauth_tokens.org_id
    and ua.user_id = auth.uid()
));

create policy "auth_oauth_tokens_update"
on public.auth_oauth_tokens
for update
using (auth.uid() = user_id and exists (
  select 1
  from public.user_access ua
  where ua.org_id = auth_oauth_tokens.org_id
    and ua.user_id = auth.uid()
));
