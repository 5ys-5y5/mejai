# 015 Cafe24 API CSV Import Runbook

대상 파일:
- `docs/cafe24_API_Index.csv` (509 rows)

## 핵심
509건은 PostgreSQL에서 매우 작은 규모입니다. 수동 INSERT가 아니라 `\copy` + `upsert`로 한 번에 처리하면 됩니다.

## 1) 스키마/스테이징 준비
`docs/temp/mk2/014_cafe24_hierarchy_and_full_api.sql` 실행

## 2) CSV 적재 (psql)
```sql
truncate table public."Z_tmp_cafe24_api_index";
```

```bash
psql "$DATABASE_URL" -c "\copy public.\"Z_tmp_cafe24_api_index\"(scope_key,http_method,endpoint_path,operation_title,doc_url) from 'C:/dev/1227/mejai/docs/cafe24_API_Index.csv' csv header"
```

## 3) 사전 검증
```sql
select count(*) as staged_count
from public."Z_tmp_cafe24_api_index"
where is_active = true;

select count(*) as missing_scope
from public."Z_tmp_cafe24_api_index"
where is_active = true
  and (scope_key is null or trim(scope_key) = '');

select http_method, endpoint_path, count(*)
from public."Z_tmp_cafe24_api_index"
where is_active = true
group by http_method, endpoint_path
having count(*) > 1;
```

## 4) 업서트 실행
`docs/temp/mk2/014_cafe24_hierarchy_and_full_api.sql` 재실행

## 5) 사후 검증
```sql
-- stage 대비 action 반영 수
select
  (select count(*) from public."Z_tmp_cafe24_api_index" where is_active=true) as staged_count,
  (select count(*) from public."C_mcp_tools" where provider_key='cafe24' and tool_kind='action' and is_active=true and source='cafe24_api_index') as action_count;

-- scope/action 분리 확인
select provider_key, tool_kind, count(*)
from public."C_mcp_tools"
group by provider_key, tool_kind
order by provider_key, tool_kind;

-- 정책 반영 확인(조직별)
select count(*) as policy_count
from public."C_mcp_tool_policies" p
join public."C_mcp_tools" t on t.id = p.tool_id
where p.org_id = '8ad81b6b-3210-40dd-8e00-9a43a4395923'::uuid
  and t.provider_key = 'cafe24'
  and t.tool_kind = 'action'
  and t.is_active = true;
```

## 실패시 롤백 전략
- 이미 `on conflict` 기반이라 재실행 안전(idempotent)
- 문제 발생 시 stage를 수정 후 4) 업서트 재실행
