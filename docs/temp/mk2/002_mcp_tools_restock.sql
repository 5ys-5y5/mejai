-- mk2 restock MCP tools (schema_json uses JSON Schema-like shape for mcpPolicy validation)

insert into mcp_tools (name, description, schema_json, version, is_active, created_at)
values
  (
    'resolve_product',
    'Resolve product_id from an alias/query string.',
    $$
    {
      "type": "object",
      "properties": {
        "query": { "type": "string" }
      },
      "required": ["query"]
    }
    $$,
    'mk2',
    true,
    now()
  ),
  (
    'read_product',
    'Read product details from Cafe24.',
    $$
    {
      "type": "object",
      "properties": {
        "product_id": { "type": "string" },
        "product_no": { "type": "string" },
        "embed": { "type": "string" },
        "fields": { "type": "string" }
      },
      "required": ["product_no"]
    }
    $$,
    'mk2',
    true,
    now()
  ),
  (
    'read_supply',
    'Read supplier metadata (Cafe24 suppliers).',
    $$
    {
      "type": "object",
      "properties": {
        "supplier_code": { "type": "string" },
        "supplier_name": { "type": "string" },
        "limit": { "type": "number" },
        "offset": { "type": "number" }
      },
      "required": []
    }
    $$,
    'mk2',
    true,
    now()
  ),
  (
    'read_shipping',
    'Read shipping configurations (Cafe24 shipping).',
    $$
    {
      "type": "object",
      "properties": {},
      "required": []
    }
    $$,
    'mk2',
    true,
    now()
  ),
  (
    'subscribe_restock',
    'Create a restock subscription for a product_id.',
    $$
    {
      "type": "object",
      "properties": {
        "product_id": { "type": "string" },
        "channel": { "type": "string" },
        "phone": { "type": "string" },
        "customer_id": { "type": "string" },
        "trigger_type": { "type": "string" },
        "trigger_value": { "type": "string" },
        "actions": { "type": "array" }
      },
      "required": ["product_id", "channel"]
    }
    $$,
    'mk2',
    true,
    now()
  ),
  (
    'trigger_restock',
    'Internal hook for restock triggers (worker use).',
    $$
    {
      "type": "object",
      "properties": {
        "product_id": { "type": "string" },
        "trigger_type": { "type": "string" },
        "trigger_value": { "type": "string" }
      },
      "required": ["product_id", "trigger_type"]
    }
    $$,
    'mk2',
    true,
    now()
  );
