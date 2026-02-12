create table if not exists public."B_chat_widgets" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  agent_id uuid null,
  public_key text not null,
  allowed_domains text[] not null default array[]::text[],
  allowed_paths text[] null,
  theme jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint B_chat_widgets_pkey primary key (id),
  constraint B_chat_widgets_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint B_chat_widgets_agent_fk foreign key (agent_id) references public."B_bot_agents"(id) on delete set null,
  constraint B_chat_widgets_public_key_unique unique (public_key),
  constraint B_chat_widgets_org_unique unique (org_id)
);

create table if not exists public."F_widget_events" (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  widget_id uuid not null,
  session_id uuid null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint F_widget_events_pkey primary key (id),
  constraint F_widget_events_org_fk foreign key (org_id) references public."A_iam_organizations"(id) on delete cascade,
  constraint F_widget_events_widget_fk foreign key (widget_id) references public."B_chat_widgets"(id) on delete cascade,
  constraint F_widget_events_session_fk foreign key (session_id) references public."D_conv_sessions"(id) on delete set null
);

create index if not exists F_widget_events_org_idx on public."F_widget_events" (org_id, created_at desc);
create index if not exists F_widget_events_widget_idx on public."F_widget_events" (widget_id, created_at desc);
