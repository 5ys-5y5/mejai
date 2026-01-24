-- Organizations: business registration number + registrant/owner split
-- Run in Supabase SQL Editor

alter table public.organizations
  add column if not exists business_registration_number text;

alter table public.organizations
  add column if not exists registrant_id uuid;

alter table public.organizations
  add constraint organizations_registrant_id_fkey
  foreign key (registrant_id) references auth.users (id) on delete set null;

create unique index if not exists organizations_identity_unique
  on public.organizations (name, owner_id, registrant_id, business_registration_number);
