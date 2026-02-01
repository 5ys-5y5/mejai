-- Minimal schema for restock rules, product alias mapping, and subscriptions.
-- Requires pgcrypto for gen_random_uuid() if not already enabled.
-- create extension if not exists pgcrypto;

create table if not exists public.product_rule (
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
  constraint product_rule_answerability_chk
    check (answerability in ('ALLOW','DENY','UNKNOWN')),
  constraint product_rule_restock_policy_chk
    check (restock_policy in ('NO_RESTOCK','RESTOCK_AT','UNKNOWN'))
);

create unique index if not exists product_rule_org_product
  on public.product_rule (org_id, product_id);

create table if not exists public.product_alias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null,
  alias text not null,
  product_id text not null,
  match_type text not null default 'exact',
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_alias_match_type_chk
    check (match_type in ('exact','contains','regex'))
);

create index if not exists product_alias_lookup
  on public.product_alias (org_id, is_active, priority);

create unique index if not exists product_alias_unique
  on public.product_alias (org_id, alias, match_type);

create table if not exists public.restock_subscription (
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
  constraint restock_sub_trigger_chk
    check (trigger_type in ('inventory_gt','status_change')),
  constraint restock_sub_status_chk
    check (status in ('active','paused','canceled','completed'))
);

create index if not exists restock_sub_lookup
  on public.restock_subscription (org_id, product_id, status);

create index if not exists restock_sub_channel
  on public.restock_subscription (org_id, channel);
