-- Minimal schema for restock rules, product alias mapping, and subscriptions.
-- Requires pgcrypto for gen_random_uuid() if not already enabled.
-- create extension if not exists pgcrypto;

create table if not exists public.G_com_product_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null,
  product_id text not null,
  answerability text not null default 'UNKNOWN',
  restock_policy text not null default 'UNKNOWN',
  restock_at date null,
  source text null,
  updated_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint G_com_product_rules_answerability_chk
    check (answerability in ('ALLOW','DENY','UNKNOWN')),
  constraint G_com_product_rules_restock_policy_chk
    check (restock_policy in ('NO_RESTOCK','RESTOCK_AT','UNKNOWN'))
);

create unique index if not exists G_com_product_rules_org_product
  on public.G_com_product_rules (org_id, product_id);

create table if not exists public.G_com_product_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null,
  alias text not null,
  product_id text not null,
  match_type text not null default 'exact',
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint G_com_product_aliases_match_type_chk
    check (match_type in ('exact','contains','regex'))
);

create index if not exists G_com_product_aliases_lookup
  on public.G_com_product_aliases (org_id, is_active, priority);

create unique index if not exists G_com_product_aliases_unique
  on public.G_com_product_aliases (org_id, alias, match_type);

create table if not exists public.G_com_restock_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null,
  customer_id text null,
  phone text null,
  channel text not null,
  product_id text not null,
  trigger_type text not null,
  trigger_value text null,
  actions jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_triggered_at timestamptz null,
  last_notified_at timestamptz null,
  constraint G_com_restock_sub_trigger_chk
    check (trigger_type in ('inventory_gt','status_change')),
  constraint G_com_restock_sub_status_chk
    check (status in ('active','paused','canceled','completed'))
);

create index if not exists G_com_restock_sub_lookup
  on public.G_com_restock_subscriptions (org_id, product_id, status);

create index if not exists G_com_restock_sub_channel
  on public.G_com_restock_subscriptions (org_id, channel);
