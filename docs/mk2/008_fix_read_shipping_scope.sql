-- Fix read_shipping scope to read for mk2 org
update mcp_tool_policies
set allowed_scopes = array['read']::text[],
    updated_at = now()
where org_id = '8ad81b6b-3210-40dd-8e00-9a43a4395923'
  and tool_id = (select id from mcp_tools where name = 'read_shipping');
