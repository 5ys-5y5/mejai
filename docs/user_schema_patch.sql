-- User access (plan/admin/org_role) merged into single table
-- Run in Supabase SQL Editor

create table if not exists public.user_access (
  user_id uuid not null,
  org_id uuid null,
  plan text not null default 'starter',
  is_admin boolean not null default false,
  org_role text not null default 'operator',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_access_pkey primary key (user_id),
  constraint user_access_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_access_org_id_fkey foreign key (org_id) references public.organizations (id) on delete cascade
);

create index if not exists user_access_plan_idx on public.user_access (plan);
create index if not exists user_access_is_admin_idx on public.user_access (is_admin);
create index if not exists user_access_org_role_idx on public.user_access (org_role);
create index if not exists user_access_org_id_idx on public.user_access (org_id);

-- Optional cleanup if you already created the old tables
-- drop table if exists public.user_profiles;
-- drop table if exists public.org_members;
