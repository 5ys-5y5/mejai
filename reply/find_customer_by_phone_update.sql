update mcp_tools
set schema_json = '{"type":"object","properties":{"cellphone":{"type":"string"},"member_id":{"type":"string"}},"required":[]}'::jsonb
where name = 'find_customer_by_phone';
