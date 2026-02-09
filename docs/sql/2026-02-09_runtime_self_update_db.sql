-- Runtime Self Update DB-level tracking (explicit booleans)
-- Date: 2026-02-09
-- Purpose:
-- 1) Keep event-sourcing in F_audit_events as-is
-- 2) Add deterministic summary table with explicit true/false flags
-- 3) Sync summary rows automatically whenever governance events are inserted

begin;

create table if not exists public.F_runtime_patch_proposals (
  proposal_id text primary key,
  org_id uuid not null,
  session_id uuid null,
  turn_id uuid null,
  violation_id text null,
  principle_key text null,
  runtime_scope text null,

  -- Lifecycle booleans (explicit)
  approved boolean not null default false,
  apply_requested boolean not null default false,
  apply_executed boolean not null default false,
  apply_succeeded boolean null,

  status text not null default 'pending' check (status in ('pending', 'approved', 'completed', 'failed', 'rejected', 'on_hold')),
  reviewer_note text null,
  apply_result jsonb null,

  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  executed_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  last_event_type text not null default 'RUNTIME_PATCH_PROPOSAL_CREATED'
);

create index if not exists idx_f_runtime_patch_proposals_org_created
  on public.F_runtime_patch_proposals (org_id, created_at desc);

create index if not exists idx_f_runtime_patch_proposals_session_turn
  on public.F_runtime_patch_proposals (session_id, turn_id);

create or replace function public.fn_sync_runtime_patch_proposals_from_event()
returns trigger
language plpgsql
security definer
as $$
declare
  p jsonb := coalesce(new.payload::jsonb, '{}'::jsonb);
  v_event text := coalesce(new.event_type, '');
  v_proposal_id text := nullif(p->>'proposal_id', '');
  v_org_id uuid := null;
  v_apply_requested boolean := false;
  v_applied boolean := null;
  v_status text := null;
begin
  if v_event not in (
    'RUNTIME_PATCH_PROPOSAL_CREATED',
    'RUNTIME_PATCH_PROPOSAL_APPROVED',
    'RUNTIME_PATCH_PROPOSAL_REJECTED',
    'RUNTIME_PATCH_APPLY_RESULT',
    'RUNTIME_PATCH_PROPOSAL_ON_HOLD',
    'RUNTIME_PATCH_PROPOSAL_COMPLETED',
    'RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED'
  ) then
    return new;
  end if;

  if v_proposal_id is null then
    return new;
  end if;

  begin
    if coalesce(p->>'org_id', '') <> '' then
      v_org_id := (p->>'org_id')::uuid;
    end if;
  exception when others then
    v_org_id := null;
  end;

  if v_event = 'RUNTIME_PATCH_PROPOSAL_CREATED' then
    insert into public.F_runtime_patch_proposals (
      proposal_id, org_id, session_id, turn_id, violation_id, principle_key, runtime_scope,
      status, created_at, updated_at, last_event_type
    ) values (
      v_proposal_id,
      coalesce(v_org_id, '00000000-0000-0000-0000-000000000000'::uuid),
      new.session_id,
      new.turn_id,
      nullif(p->>'violation_id', ''),
      nullif(p->>'principle_key', ''),
      nullif(p->>'runtime_scope', ''),
      'pending',
      coalesce(new.created_at, now()),
      now(),
      v_event
    )
    on conflict (proposal_id) do update set
      org_id = coalesce(excluded.org_id, public.F_runtime_patch_proposals.org_id),
      session_id = coalesce(excluded.session_id, public.F_runtime_patch_proposals.session_id),
      turn_id = coalesce(excluded.turn_id, public.F_runtime_patch_proposals.turn_id),
      violation_id = coalesce(excluded.violation_id, public.F_runtime_patch_proposals.violation_id),
      principle_key = coalesce(excluded.principle_key, public.F_runtime_patch_proposals.principle_key),
      runtime_scope = coalesce(excluded.runtime_scope, public.F_runtime_patch_proposals.runtime_scope),
      updated_at = now(),
      last_event_type = v_event;

    return new;
  end if;

  -- Ensure row exists even if events arrive out of order
  insert into public.F_runtime_patch_proposals (
    proposal_id, org_id, session_id, turn_id, status, created_at, updated_at, last_event_type
  ) values (
    v_proposal_id,
    coalesce(v_org_id, '00000000-0000-0000-0000-000000000000'::uuid),
    new.session_id,
    new.turn_id,
    'pending',
    coalesce(new.created_at, now()),
    now(),
    v_event
  )
  on conflict (proposal_id) do nothing;

  if v_event = 'RUNTIME_PATCH_PROPOSAL_APPROVED' then
    v_apply_requested := coalesce((p->>'apply_requested')::boolean, false);

    update public.F_runtime_patch_proposals
       set approved = true,
           apply_requested = v_apply_requested,
           status = case when v_apply_requested then 'approved' else 'approved' end,
           reviewer_note = nullif(p->>'reviewer_note', ''),
           approved_at = coalesce(new.created_at, now()),
           updated_at = now(),
           last_event_type = v_event
     where proposal_id = v_proposal_id;

    return new;
  end if;

  if v_event = 'RUNTIME_PATCH_APPLY_RESULT' then
    begin
      v_applied := coalesce((p->>'applied')::boolean, false);
    exception when others then
      v_applied := false;
    end;

    update public.F_runtime_patch_proposals
       set apply_executed = true,
           apply_succeeded = v_applied,
           apply_result = p,
           status = case when v_applied then 'completed' else 'failed' end,
           executed_at = coalesce(new.created_at, now()),
           completed_at = case when v_applied then coalesce(new.created_at, now()) else completed_at end,
           updated_at = now(),
           last_event_type = v_event
     where proposal_id = v_proposal_id;

    return new;
  end if;

  if v_event = 'RUNTIME_PATCH_PROPOSAL_COMPLETED' then
    update public.F_runtime_patch_proposals
       set apply_executed = true,
           apply_succeeded = true,
           status = 'completed',
           completed_at = coalesce(new.created_at, now()),
           updated_at = now(),
           last_event_type = v_event
     where proposal_id = v_proposal_id;

    return new;
  end if;

  if v_event = 'RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED' then
    update public.F_runtime_patch_proposals
       set apply_executed = true,
           apply_succeeded = false,
           status = 'failed',
           apply_result = coalesce(p->'apply_result', p),
           updated_at = now(),
           last_event_type = v_event
     where proposal_id = v_proposal_id;

    return new;
  end if;

  if v_event = 'RUNTIME_PATCH_PROPOSAL_REJECTED' then
    update public.F_runtime_patch_proposals
       set approved = false,
           apply_requested = false,
           status = 'rejected',
           reviewer_note = nullif(p->>'reviewer_note', ''),
           updated_at = now(),
           last_event_type = v_event
     where proposal_id = v_proposal_id;

    return new;
  end if;

  if v_event = 'RUNTIME_PATCH_PROPOSAL_ON_HOLD' then
    update public.F_runtime_patch_proposals
       set status = 'on_hold',
           reviewer_note = coalesce(nullif(p->>'reason', ''), reviewer_note),
           updated_at = now(),
           last_event_type = v_event
     where proposal_id = v_proposal_id;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_runtime_patch_proposals_from_event on public.F_audit_events;

create trigger trg_sync_runtime_patch_proposals_from_event
after insert on public.F_audit_events
for each row
execute function public.fn_sync_runtime_patch_proposals_from_event();

-- Backfill from existing events
with src as (
  select
    id,
    event_type,
    session_id,
    turn_id,
    created_at,
    coalesce(payload::jsonb, '{}'::jsonb) as p
  from public.F_audit_events
  where event_type in (
    'RUNTIME_PATCH_PROPOSAL_CREATED',
    'RUNTIME_PATCH_PROPOSAL_APPROVED',
    'RUNTIME_PATCH_PROPOSAL_REJECTED',
    'RUNTIME_PATCH_APPLY_RESULT',
    'RUNTIME_PATCH_PROPOSAL_ON_HOLD',
    'RUNTIME_PATCH_PROPOSAL_COMPLETED',
    'RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED'
  )
  order by created_at asc, id asc
), seed as (
  insert into public.F_runtime_patch_proposals (
    proposal_id, org_id, session_id, turn_id, violation_id, principle_key, runtime_scope,
    status, created_at, updated_at, last_event_type
  )
  select
    nullif(src.p->>'proposal_id', '') as proposal_id,
    coalesce(
      nullif(src.p->>'org_id', '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    ) as org_id,
    src.session_id,
    src.turn_id,
    nullif(src.p->>'violation_id', ''),
    nullif(src.p->>'principle_key', ''),
    nullif(src.p->>'runtime_scope', ''),
    'pending',
    coalesce(src.created_at, now()),
    now(),
    'RUNTIME_PATCH_PROPOSAL_CREATED'
  from src
  where src.event_type = 'RUNTIME_PATCH_PROPOSAL_CREATED'
    and nullif(src.p->>'proposal_id', '') is not null
  on conflict (proposal_id) do nothing
  returning proposal_id
)
select count(*) from seed;

-- Replay state updates
update public.F_runtime_patch_proposals t
set
  approved = true,
  apply_requested = coalesce((e.p->>'apply_requested')::boolean, false),
  reviewer_note = nullif(e.p->>'reviewer_note', ''),
  status = 'approved',
  approved_at = coalesce(e.created_at, t.approved_at),
  updated_at = now(),
  last_event_type = 'RUNTIME_PATCH_PROPOSAL_APPROVED'
from (
  select distinct on (nullif(p->>'proposal_id', ''))
    nullif(p->>'proposal_id', '') as proposal_id,
    p,
    created_at
  from (
    select coalesce(payload::jsonb, '{}'::jsonb) as p, created_at
    from public.F_audit_events
    where event_type = 'RUNTIME_PATCH_PROPOSAL_APPROVED'
  ) q
  where nullif(p->>'proposal_id', '') is not null
  order by nullif(p->>'proposal_id', ''), created_at desc
) e
where t.proposal_id = e.proposal_id;

update public.F_runtime_patch_proposals t
set
  apply_executed = true,
  apply_succeeded = coalesce((e.p->>'applied')::boolean, false),
  apply_result = e.p,
  status = case when coalesce((e.p->>'applied')::boolean, false) then 'completed' else 'failed' end,
  executed_at = coalesce(e.created_at, t.executed_at),
  completed_at = case when coalesce((e.p->>'applied')::boolean, false) then coalesce(e.created_at, t.completed_at) else t.completed_at end,
  updated_at = now(),
  last_event_type = 'RUNTIME_PATCH_APPLY_RESULT'
from (
  select distinct on (nullif(p->>'proposal_id', ''))
    nullif(p->>'proposal_id', '') as proposal_id,
    p,
    created_at
  from (
    select coalesce(payload::jsonb, '{}'::jsonb) as p, created_at
    from public.F_audit_events
    where event_type = 'RUNTIME_PATCH_APPLY_RESULT'
  ) q
  where nullif(p->>'proposal_id', '') is not null
  order by nullif(p->>'proposal_id', ''), created_at desc
) e
where t.proposal_id = e.proposal_id;

update public.F_runtime_patch_proposals t
set status = 'completed', apply_executed = true, apply_succeeded = true, completed_at = coalesce(e.created_at, t.completed_at), updated_at = now(), last_event_type = 'RUNTIME_PATCH_PROPOSAL_COMPLETED'
from (
  select distinct on (nullif(coalesce(payload::jsonb, '{}'::jsonb)->>'proposal_id', ''))
    nullif(coalesce(payload::jsonb, '{}'::jsonb)->>'proposal_id', '') as proposal_id,
    created_at
  from public.F_audit_events
  where event_type = 'RUNTIME_PATCH_PROPOSAL_COMPLETED'
  order by nullif(coalesce(payload::jsonb, '{}'::jsonb)->>'proposal_id', ''), created_at desc
) e
where t.proposal_id = e.proposal_id;

update public.F_runtime_patch_proposals t
set status = 'failed', apply_executed = true, apply_succeeded = false, updated_at = now(), last_event_type = 'RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED'
from (
  select distinct on (nullif(coalesce(payload::jsonb, '{}'::jsonb)->>'proposal_id', ''))
    nullif(coalesce(payload::jsonb, '{}'::jsonb)->>'proposal_id', '') as proposal_id
  from public.F_audit_events
  where event_type = 'RUNTIME_PATCH_PROPOSAL_EXECUTION_FAILED'
  order by nullif(coalesce(payload::jsonb, '{}'::jsonb)->>'proposal_id', ''), created_at desc
) e
where t.proposal_id = e.proposal_id;

update public.F_runtime_patch_proposals t
set status = 'rejected', approved = false, apply_requested = false, reviewer_note = coalesce(nullif(e.p->>'reviewer_note', ''), t.reviewer_note), updated_at = now(), last_event_type = 'RUNTIME_PATCH_PROPOSAL_REJECTED'
from (
  select distinct on (nullif(p->>'proposal_id', ''))
    nullif(p->>'proposal_id', '') as proposal_id,
    p
  from (
    select coalesce(payload::jsonb, '{}'::jsonb) as p, created_at
    from public.F_audit_events
    where event_type = 'RUNTIME_PATCH_PROPOSAL_REJECTED'
  ) q
  where nullif(p->>'proposal_id', '') is not null
  order by nullif(p->>'proposal_id', ''), created_at desc
) e
where t.proposal_id = e.proposal_id;

update public.F_runtime_patch_proposals t
set status = 'on_hold', reviewer_note = coalesce(nullif(e.p->>'reason', ''), t.reviewer_note), updated_at = now(), last_event_type = 'RUNTIME_PATCH_PROPOSAL_ON_HOLD'
from (
  select distinct on (nullif(p->>'proposal_id', ''))
    nullif(p->>'proposal_id', '') as proposal_id,
    p
  from (
    select coalesce(payload::jsonb, '{}'::jsonb) as p, created_at
    from public.F_audit_events
    where event_type = 'RUNTIME_PATCH_PROPOSAL_ON_HOLD'
  ) q
  where nullif(p->>'proposal_id', '') is not null
  order by nullif(p->>'proposal_id', ''), created_at desc
) e
where t.proposal_id = e.proposal_id;

create or replace view public.V_runtime_patch_proposals as
select
  proposal_id,
  org_id,
  session_id,
  turn_id,
  violation_id,
  principle_key,
  runtime_scope,
  status,
  approved,
  apply_requested,
  apply_executed,
  apply_succeeded,
  (approved and apply_requested and coalesce(apply_succeeded, false)) as admin_apply_done,
  reviewer_note,
  apply_result,
  created_at,
  approved_at,
  executed_at,
  completed_at,
  updated_at,
  last_event_type
from public.F_runtime_patch_proposals;

comment on table public.F_runtime_patch_proposals is
'Runtime self-update proposals summary table. Explicit booleans for admin apply lifecycle.';

comment on view public.V_runtime_patch_proposals is
'Read model for runtime self-update lifecycle with admin_apply_done true/false.';

commit;
