begin;

-- 1) C_mcp_tools에 사용 빈도 누적 컬럼 추가
alter table public."C_mcp_tools"
  add column if not exists usage_count bigint not null default 0;

-- 2) 기존 감사 로그(F_audit_mcp_tools) 기준 초기값 보정(비파괴)
--    이미 값이 있는 행은 유지하고, 0/NULL 인 경우에만 채웁니다.
update public."C_mcp_tools" t
set usage_count = s.cnt
from (
  select tool_id, count(*)::bigint as cnt
  from public."F_audit_mcp_tools"
  where tool_id is not null
  group by tool_id
) s
where t.id = s.tool_id
  and coalesce(t.usage_count, 0) = 0;

update public."C_mcp_tools"
set usage_count = 0
where usage_count is null;

-- 3) 수시 감지(실시간 누적): 함수가 없을 때만 생성
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fn_sync_mcp_tool_usage_count'
  ) then
    execute $fn$
      create function public.fn_sync_mcp_tool_usage_count()
      returns trigger
      language plpgsql
      as $body$
      begin
        if new.tool_id is not null then
          update public."C_mcp_tools"
          set usage_count = coalesce(usage_count, 0) + 1
          where id = new.tool_id;
        end if;
        return new;
      end;
      $body$;
    $fn$;
  end if;
end
$$;

-- 4) 트리거가 없을 때만 생성 (drop 없음)
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'F_audit_mcp_tools'
      and t.tgname = 'trg_sync_mcp_tool_usage_count'
      and not t.tgisinternal
  ) then
    create trigger trg_sync_mcp_tool_usage_count
    after insert on public."F_audit_mcp_tools"
    for each row
    execute function public.fn_sync_mcp_tool_usage_count();
  end if;
end
$$;

commit;

-- verify:
-- select id, provider_key, name, usage_count
-- from public."C_mcp_tools"
-- order by usage_count desc, provider_key, name;
