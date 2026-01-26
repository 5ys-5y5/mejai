update mcp_tools
set schema_json = '{"type":"object","properties":{"start_date":{"type":"string"},"end_date":{"type":"string"},"offset":{"type":"number"},"limit":{"type":"number"}},"required":["start_date","end_date"]}'::jsonb
where name = 'list_orders';
