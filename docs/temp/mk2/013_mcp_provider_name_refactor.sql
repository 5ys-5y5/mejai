begin;

-- 0) provider_key 기본값 보정
update public."C_mcp_tools"
set provider_key = case
  when provider_key is not null and provider_key <> '' then provider_key
  when name in ('send_otp', 'verify_otp') then 'solapi'
  when name = 'search_address' then 'juso'
  else 'cafe24'
end;

-- 1) 기존 unique(name) 제거 -> provider_key + name 유니크로 전환
alter table public."C_mcp_tools" drop constraint if exists mcp_tools_name_key;

-- 2) name 정규화: "{provider_key}_{name}" 패턴이면 provider prefix 제거
--    예) cafe24_scope_mall_read_order -> scope_mall_read_order
--       cafe24_admin_request -> admin_request
update public."C_mcp_tools" t
set name = substr(t.name, length(t.provider_key) + 2)
where t.name like t.provider_key || '\_%' escape '\';

-- 3) display_name은 더 이상 사용하지 않으므로 name과 동일하게 유지(호환 목적)
update public."C_mcp_tools" t
set display_name = t.name
where t.display_name is distinct from t.name;

-- 4) provider_key + name 유니크 제약 생성
alter table public."C_mcp_tools"
  add constraint mcp_tools_provider_name_key unique (provider_key, name);

-- 5) 엔드포인트는 adapter_key 기준이므로 name 변경 영향 없음.
--    단, 이중 prefix(cafe24_cafe24_...) 같은 오염값이 있으면 정리.
update public."C_mcp_tool_endpoints" e
set
  adapter_key = regexp_replace(e.adapter_key, '^([a-z0-9]+_)\\1', '\\1'),
  updated_at = now()
where e.adapter_key ~ '^([a-z0-9]+_)\\1';

-- 6) 정책의 adapter_key가 비어 있으면 provider+name 규칙으로 보완
update public."C_mcp_tool_policies" p
set adapter_key = case
  when t.provider_key = 'cafe24' and t.name like 'scope_%'
    then 'cafe24_' || t.name
  when t.provider_key = 'cafe24' and t.name = 'admin_request'
    then 'cafe24_admin_request'
  else t.name
end,
updated_at = now()
from public."C_mcp_tools" t
where p.tool_id = t.id
  and (p.adapter_key is null or p.adapter_key = '');

commit;

-- 검증 1) 이름 유니크(provider_key,name)
-- select provider_key, name, count(*)
-- from public."C_mcp_tools"
-- group by provider_key, name
-- having count(*) > 1;

-- 검증 2) 여전히 provider prefix가 name에 남아있는지
-- select id, provider_key, name
-- from public."C_mcp_tools"
-- where name like provider_key || '\_%' escape '\';

-- 검증 3) 규칙/실험실에서 호출 키로 사용할 값
-- select id, provider_key || ':' || name as tool_key, name, provider_key
-- from public."C_mcp_tools"
-- where is_active = true
-- order by provider_key, name;
