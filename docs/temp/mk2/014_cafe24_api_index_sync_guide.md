# Cafe24 API Index -> MCP Full Sync Guide

기준 문서:
- https://developers.cafe24.com/docs/ko/api/admin/#api-index

## 목표
- `C_mcp_tools`를 `provider -> scope -> action(endpoint)` 구조로 유지
- API Index의 **모든 endpoint**를 `tool_kind='action'`으로 upsert

## 1) API Index 목록 추출
브라우저에서 API Index 페이지를 열고 콘솔에서 아래 스크립트를 실행합니다.

```js
(() => {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const sections = Array.from(document.querySelectorAll("section.endpoint.method"));

  function parseMethodPath(section) {
    const endpointDesc = section.querySelector(".endpoint-desc");
    const line = text(endpointDesc);
    const m = line.match(/\b(GET|POST|PUT|PATCH|DELETE)\b\s+(\/api\/v2\/admin\/[^\s]+)/i);
    if (m) return { method: m[1].toUpperCase(), path: m[2] };
    return { method: "", path: "" };
  }

  function parseScope(section) {
    const rows = Array.from(section.querySelectorAll("tr"));
    for (const tr of rows) {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 2) continue;
      if (text(tds[0]).toUpperCase() !== "SCOPE") continue;
      const value = text(tds[1]);
      const m = value.match(/\((mall\.[a-z_]+)\)/i) || value.match(/\bmall\.[a-z_]+\b/i);
      return m ? m[1] || m[0] : "";
    }
    return "";
  }

  const data = sections.map((section) => {
    const { method, path } = parseMethodPath(section);
    const title = text(section.querySelector("h3"));
    return {
      scope_key: parseScope(section),
      http_method: method,
      endpoint_path: path,
      operation_title: title,
      doc_url: location.href,
    };
  }).filter((r) => r.http_method && r.endpoint_path);

  const header = ["scope_key", "http_method", "endpoint_path", "operation_title", "doc_url"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [header.join(",")]
    .concat(data.map((r) => header.map((k) => esc(r[k])).join(",")))
    .join("\n");

  console.log(`rows=${data.length}, missing_scope=${data.filter((r) => !r.scope_key).length}`);
  console.log(csv);
})();
```

> 운영에서는 이 추출 결과를 사람이 한번 검수(누락 scope/타이틀) 후 사용하세요.

## 2) Staging 적재
`docs/temp/mk2/014_cafe24_hierarchy_and_full_api.sql` 실행 후, `Z_tmp_cafe24_api_index`에 CSV를 넣습니다.

```sql
-- 예시 (psql): \copy public."Z_tmp_cafe24_api_index"(scope_key,http_method,endpoint_path,operation_title,doc_url) from '/path/cafe24_api_index.csv' csv header;
```

## 3) Full Upsert 실행
동일 SQL 파일(`014_cafe24_hierarchy_and_full_api.sql`)을 다시 실행하면,
- scope/action 분리
- cafe24 모든 endpoint action upsert
- versions/policies/endpoints 동기화
를 수행합니다.

## 4) 검증
```sql
select count(*) as staged_count from public."Z_tmp_cafe24_api_index" where is_active=true;

select count(*) as mcp_action_count
from public."C_mcp_tools"
where provider_key='cafe24' and tool_kind='action' and is_active=true and source='cafe24_api_index';

select provider_key, tool_kind, count(*)
from public."C_mcp_tools"
group by provider_key, tool_kind
order by provider_key, tool_kind;
```

staged_count와 mcp_action_count가 동일하면 API Index 기준 full sync가 완료된 것입니다.
