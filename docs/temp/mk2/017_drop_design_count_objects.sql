begin;

-- 015/016에서 만든 트리거 제거
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'B_bot_agents'
  ) then
    execute 'drop trigger if exists trg_recalc_mcp_tool_design_count on public."B_bot_agents"';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'C_mcp_tool_dependencies'
  ) then
    execute 'drop trigger if exists trg_recalc_mcp_tool_design_count_on_dependency on public."C_mcp_tool_dependencies"';
  end if;
end
$$;

-- 015/016에서 만든 함수 제거
drop function if exists public.fn_trg_recalc_mcp_tool_design_count();
drop function if exists public.fn_recalc_mcp_tool_design_count();

-- 016에서 만든 의존 테이블 제거
drop table if exists public."C_mcp_tool_dependencies";

-- 015에서 만든 컬럼 제거
alter table if exists public."C_mcp_tools"
  drop column if exists design_count;

commit;

-- verify:
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='C_mcp_tools' and column_name='design_count';
