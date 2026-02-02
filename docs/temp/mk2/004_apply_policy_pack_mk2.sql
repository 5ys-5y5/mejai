-- Apply mk2 policy pack (content_json)
-- Update the active admin policy_pack row for the org.

update knowledge_base
set content_json =
{
  "rules": [
    {
      "id": "R100_intent_restock_subscribe",
      "stage": "input",
      "priority": 950,
      "when": {
        "all": [
          { "predicate": "text.restock_subscribe" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "set_flag", "flag": "intent_name", "value": "restock_subscribe" }
        ]
      }
    },
    {
      "id": "R110_intent_restock_inquiry",
      "stage": "input",
      "priority": 940,
      "when": {
        "all": [
          { "predicate": "text.restock_inquiry" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "set_flag", "flag": "intent_name", "value": "restock_inquiry" }
        ]
      }
    },
    {
      "id": "R120_intent_shipping_inquiry",
      "stage": "input",
      "priority": 930,
      "when": {
        "all": [
          { "predicate": "text.matches", "args": { "regex": "배송|송장|출고|운송장|배송조회" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "set_flag", "flag": "intent_name", "value": "shipping_inquiry" }
        ]
      }
    },
    {
      "id": "R130_intent_refund_request",
      "stage": "input",
      "priority": 920,
      "when": {
        "all": [
          { "predicate": "text.matches", "args": { "regex": "환불|취소|반품|교환" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "set_flag", "flag": "intent_name", "value": "refund_request" }
        ]
      }
    },
    {
      "id": "R140_intent_faq",
      "stage": "input",
      "priority": 910,
      "when": {
        "all": [
          { "predicate": "text.matches", "args": { "regex": "FAQ|자주|이용안내|문의|안내" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "set_flag", "flag": "intent_name", "value": "faq" }
        ]
      }
    },
    {
      "id": "R150_intent_order_change",
      "stage": "input",
      "priority": 905,
      "when": {
        "all": [
          { "predicate": "text.matches", "args": { "regex": "배송지\\s*변경|주소\\s*변경|주문\\s*정보\\s*변경|수령인\\s*변경" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "set_flag", "flag": "intent_name", "value": "order_change" }
        ]
      }
    },
    {
      "id": "R200_restock_answerability_deny",
      "stage": "tool",
      "priority": 900,
      "when": {
        "all": [
          { "predicate": "product.answerable", "args": { "value": false } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "restock_not_allowed" },
          { "type": "deny_tools", "tools": ["*"] }
        ]
      }
    },
    {
      "id": "R210_restock_unknown",
      "stage": "tool",
      "priority": 880,
      "when": {
        "all": [
          { "predicate": "product.restock_known", "args": { "value": false } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "restock_unknown" },
          { "type": "deny_tools", "tools": ["*"] }
        ]
      }
    },
    {
      "id": "R220_restock_allow_read",
      "stage": "tool",
      "priority": 800,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "restock_inquiry" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["resolve_product", "read_product", "read_supply"] }
        ]
      }
    },
    {
      "id": "R230_restock_subscribe_confirm",
      "stage": "tool",
      "priority": 780,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "restock_subscribe" } },
          { "predicate": "user.confirmed", "args": { "value": true } }
        ]
      },
      "enforce": {
        "actions": [
          {
            "type": "force_tool_call",
            "tool": "subscribe_restock",
            "args_template": {
              "product_id": "{{product.id}}",
              "channel": "{{entity.channel}}",
              "phone": "{{entity.phone}}",
              "actions": ["notify_only"]
            }
          }
        ]
      }
    },
    {
      "id": "R240_shipping_allow_read",
      "stage": "tool",
      "priority": 700,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "shipping_inquiry" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["read_shipping"] }
        ]
      }
    },
    {
      "id": "R250_shipping_lookup_order",
      "stage": "tool",
      "priority": 690,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "shipping_inquiry" } },
          { "predicate": "entity.order_id.present" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["lookup_order", "track_shipment"] },
          {
            "type": "force_tool_call",
            "tool": "lookup_order",
            "args_template": { "order_id": "{{entity.order_id}}" }
          },
          {
            "type": "force_tool_call",
            "tool": "track_shipment",
            "args_template": { "order_id": "{{entity.order_id}}" }
          }
        ]
      }
    },
    {
      "id": "R255_shipping_list_orders_by_phone",
      "stage": "tool",
      "priority": 685,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "shipping_inquiry" } },
          { "predicate": "entity.order_id.missing" },
          { "predicate": "entity.phone.present" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["list_orders"] },
          {
            "type": "force_tool_call",
            "tool": "list_orders",
            "args_template": { "phone": "{{entity.phone}}" }
          }
        ]
      }
    },
    {
      "id": "R260_refund_create_ticket",
      "stage": "tool",
      "priority": 680,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "refund_request" } },
          { "predicate": "entity.order_id.present" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["create_ticket"] },
          {
            "type": "force_tool_call",
            "tool": "create_ticket",
            "args_template": { "summary": "환불/취소 요청 (주문 {{entity.order_id}})" }
          }
        ]
      }
    },
    {
      "id": "R265_refund_list_orders_by_phone",
      "stage": "tool",
      "priority": 675,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "refund_request" } },
          { "predicate": "entity.order_id.missing" },
          { "predicate": "entity.phone.present" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["list_orders"] },
          {
            "type": "force_tool_call",
            "tool": "list_orders",
            "args_template": { "phone": "{{entity.phone}}" }
          }
        ]
      }
    },
    {
      "id": "R270_order_change_allow_write",
      "stage": "tool",
      "priority": 670,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "order_change" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["update_order_shipping_address", "list_orders", "lookup_order"] }
        ]
      }
    },
    {
      "id": "R271_order_change_force_update",
      "stage": "tool",
      "priority": 665,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "order_change" } },
          { "predicate": "entity.order_id.present" },
          { "predicate": "entity.address.present" },
          { "predicate": "user.confirmed", "args": { "value": true } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["update_order_shipping_address"] },
          {
            "type": "force_tool_call",
            "tool": "update_order_shipping_address",
            "args_template": {
              "order_id": "{{entity.order_id}}",
              "address1": "{{entity.address}}",
              "zipcode": "{{entity.zipcode}}",
              "cellphone": "{{entity.phone}}"
            }
          }
        ]
      }
    },
    {
      "id": "R275_order_change_list_orders_by_phone",
      "stage": "tool",
      "priority": 660,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "order_change" } },
          { "predicate": "entity.order_id.missing" },
          { "predicate": "entity.phone.present" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "allow_tools", "tools": ["list_orders"] },
          {
            "type": "force_tool_call",
            "tool": "list_orders",
            "args_template": { "phone": "{{entity.phone}}" }
          }
        ]
      }
    },
    {
      "id": "R300_faq_template",
      "stage": "output",
      "priority": 600,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "faq" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "faq_default" }
        ]
      }
    },
    {
      "id": "R300_order_change_need_order_id",
      "stage": "output",
      "priority": 599,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "order_change" } },
          { "predicate": "entity.order_id.missing" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "order_change_need_order_id" }
        ]
      }
    },
    {
      "id": "R301_order_change_need_address",
      "stage": "output",
      "priority": 598,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "order_change" } },
          { "predicate": "entity.address.missing" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "order_change_need_address" }
        ]
      }
    },
    {
      "id": "R390_output_format_default",
      "stage": "output",
      "priority": 100,
      "when": {
        "any": [
          { "predicate": "intent.is", "args": { "value": "shipping_inquiry" } },
          { "predicate": "intent.is", "args": { "value": "refund_request" } },
          { "predicate": "intent.is", "args": { "value": "faq" } },
          { "predicate": "intent.is", "args": { "value": "order_change" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "format_output" }
        ]
      }
    },
    {
      "id": "R305_shipping_need_order_id",
      "stage": "output",
      "priority": 595,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "shipping_inquiry" } },
          { "predicate": "entity.order_id.missing" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "shipping_need_order_id" }
        ]
      }
    },
    {
      "id": "R306_shipping_need_phone",
      "stage": "output",
      "priority": 594,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "shipping_inquiry" } },
          { "predicate": "entity.order_id.missing" },
          { "predicate": "entity.phone.missing" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "shipping_need_phone" }
        ]
      }
    },
    {
      "id": "R310_refund_template",
      "stage": "output",
      "priority": 590,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "refund_request" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "refund_info" }
        ]
      }
    },
    {
      "id": "R315_refund_need_order_id",
      "stage": "output",
      "priority": 585,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "refund_request" } },
          { "predicate": "entity.order_id.missing" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "refund_need_order_id" }
        ]
      }
    },
    {
      "id": "R316_refund_need_phone",
      "stage": "output",
      "priority": 584,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "refund_request" } },
          { "predicate": "entity.order_id.missing" },
          { "predicate": "entity.phone.missing" }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "refund_need_phone" }
        ]
      }
    },
    {
      "id": "R320_shipping_template",
      "stage": "output",
      "priority": 580,
      "when": {
        "all": [
          { "predicate": "intent.is", "args": { "value": "shipping_inquiry" } }
        ]
      },
      "enforce": {
        "actions": [
          { "type": "force_response_template", "template_id": "shipping_info" }
        ]
      }
    }
  ],
  "templates": {
    "restock_not_allowed": "해당 상품은 안내 대상이 아닙니다. 담당자 확인 후 안내드리겠습니다.",
    "restock_unknown": "해당 상품의 재입고 정보가 아직 없습니다. 확인 후 안내드리겠습니다.",
    "faq_default": "문의하신 내용은 KB 기준으로 안내드립니다. 필요한 정보(상품명/주문번호/문의 유형)를 알려주세요.",
    "refund_info": "환불/취소/반품은 주문 확인이 필요합니다. 주문번호 또는 휴대폰 번호를 알려주세요.",
    "refund_need_order_id": "환불/취소/반품 처리를 위해 주문번호가 필요합니다. 주문번호 또는 휴대폰 번호를 알려주세요.",
    "shipping_info": "배송/출고 확인을 위해 주문번호 또는 휴대폰 번호를 알려주세요.",
    "shipping_need_order_id": "배송 조회를 위해 주문번호 또는 휴대폰 번호를 알려주세요.",
    "shipping_need_phone": "배송 조회를 위해 주문번호 또는 휴대폰 번호를 알려주세요.",
    "refund_need_phone": "환불/취소/반품 처리를 위해 주문번호 또는 휴대폰 번호를 알려주세요.",
    "order_choices_prompt": "조회된 주문이 여러 건입니다. 원하는 주문번호를 알려주세요.",
    "order_change_need_order_id": "주문 정보를 변경하려면 주문번호가 필요합니다. 주문번호 또는 휴대폰 번호를 알려주세요.",
    "order_change_need_address": "배송지 변경을 위해 새 주소를 알려주세요. 예) 주소: 서울시 ... (가능하면 우편번호 포함)"
  },
  "tool_policies": {
    "resolve_product": { "required_args": ["query"] },
    "read_product": { "required_args": ["product_no"] },
    "read_supply": { "required_args": [] },
    "read_shipping": { "required_args": [] },
    "lookup_order": { "required_args": ["order_id"] },
    "track_shipment": { "required_args": ["order_id"] },
    "create_ticket": { "required_args": ["summary"] },
    "list_orders": { "required_args": ["start_date", "end_date"] },
    "update_order_shipping_address": { "required_args": ["order_id", "address1"] },
    "subscribe_restock": { "required_args": ["product_id", "channel"] },
    "trigger_restock": { "required_args": ["product_id", "trigger_type"] }
  }
}


::jsonb,
    updated_at = now()
where is_admin = true
  and is_active = true
  and org_id = '8ad81b6b-3210-40dd-8e00-9a43a4395923';

