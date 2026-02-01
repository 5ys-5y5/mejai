-- mk2 order update MCP tool (shipping address change)

insert into mcp_tools (name, description, schema_json, version, is_active, created_at)
values
  (
    'update_order_shipping_address',
    'Update shipping address for an order (Cafe24 receivers).',
    $$
    {
      "type": "object",
      "properties": {
        "order_id": { "type": "string" },
        "shipping_code": { "type": "string" },
        "address1": { "type": "string" },
        "address2": { "type": "string" },
        "address_full": { "type": "string" },
        "zipcode": { "type": "string" },
        "receiver_name": { "type": "string" },
        "receiver_phone": { "type": "string" },
        "receiver_cellphone": { "type": "string" },
        "shipping_message": { "type": "string" },
        "change_default_shipping_address": { "type": "string" }
      },
      "required": ["order_id", "address1"]
    }
    $$,
    'mk2',
    true,
    now()
  );
