-- Bot conversation/agent version linkage (jsonb-based)

alter table public.sessions
  add column if not exists bot_context jsonb not null default '{}'::jsonb;

alter table public.turns
  add column if not exists bot_context jsonb not null default '{}'::jsonb;

alter table public.event_logs
  add column if not exists bot_context jsonb not null default '{}'::jsonb;

alter table public.review_queue
  add column if not exists bot_context jsonb not null default '{}'::jsonb;

alter table public.audio_segments
  add column if not exists bot_context jsonb not null default '{}'::jsonb;

alter table public.mcp_tool_audit_logs
  add column if not exists bot_context jsonb not null default '{}'::jsonb;

-- Optional helper indexes if you expect frequent filtering by context keys.
-- create index if not exists sessions_bot_context_gin on public.sessions using gin (bot_context);
-- create index if not exists turns_bot_context_gin on public.turns using gin (bot_context);
-- create index if not exists event_logs_bot_context_gin on public.event_logs using gin (bot_context);
