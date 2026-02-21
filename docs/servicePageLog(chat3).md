디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): solapi:send_otp, cafe24:lookup_order, cafe24:list_orders, solapi:verify_otp, search_address, cafe24:update_order_shipping_address
기대 목록(Event): QUICK_REPLY_RULE_DECISION, FINAL_ANSWER_READY, POLICY_DECISION, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_HIT, CONFIRMED_ENTITY_DELTA_APPLIED, END_USER_CONFIRMED_ENTITY_SAVED, AUTH_GATE_TRIGGERED, AUTH_GATE_PRECHECK, EXECUTION_GUARD_TRIGGERED, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, POLICY_STATIC_CONFLICT, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED, ORDER_CHOICES_PRESENTED, PRE_MCP_DECISION, RUNTIME_PATCH_PROPOSAL_CREATED, PRINCIPLE_VIOLATION_DETECTED, ADDRESS_SEARCH_COMPLETED, ADDRESS_SEARCH_STARTED, ENTITY_FIELD_UPDATED
기대 목록(Debug): NO_TOOL_CALLED, send_otp, lookup_order, update_order_shipping_address

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: mcp.solapi:send_otp, mcp.cafe24:lookup_order, mcp.cafe24:list_orders, mcp.solapi:verify_otp, mcp.search_address, mcp.cafe24:update_order_shipping_address, event.QUICK_REPLY_RULE_DECISION, event.FINAL_ANSWER_READY, event.POLICY_DECISION, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_HIT, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.END_USER_CONFIRMED_ENTITY_SAVED, event.AUTH_GATE_TRIGGERED, event.AUTH_GATE_PRECHECK, event.EXECUTION_GUARD_TRIGGERED, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.POLICY_STATIC_CONFLICT, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, event.ORDER_CHOICES_PRESENTED, event.PRE_MCP_DECISION, event.RUNTIME_PATCH_PROPOSAL_CREATED, event.PRINCIPLE_VIOLATION_DETECTED, event.ADDRESS_SEARCH_COMPLETED, event.ADDRESS_SEARCH_STARTED, event.ENTITY_FIELD_UPDATED, debug.NO_TOOL_CALLED, debug.send_otp, debug.lookup_order, debug.update_order_shipping_address, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: 46c223f7-be8b-4a64-b828-50dd5ba9066b

[TOKEN_USED]

USER:
배송지 변경

BOT:
확인한 것: 배송지 변경
확인할 것: 원하시는 문의 유형을 선택해주세요. (번호로 답변)
- 1번 | 배송지 변경 | 배송지/주문정보 변경
- 2번 | 배송 문의 | 배송 상태/송장 조회
예) 1,2
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=choice, choice_mode=multi, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 배송지 변경\n확인할 것: 원하시는 문의 유형을 선택해주세요. (번호로 답변)\n- 1번 | 배송지 변경 | 배송지/주문정보 변경\n- 2번 | 배송 문의 | 배송 상태/송장 조회\n예) 1,2\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "multi"
    },
    "quick_replies": [
      {
        "label": "1",
        "value": "1"
      },
      {
        "label": "2",
        "value": "2"
      }
    ],
    "cards": []
  }
RENDER_PLAN: view=choice, quick_replies=true, cards=false, mode=multi, min=1, max=2, submit=csv, prompt=intent_disambiguation
RENDER_PLAN_DETAIL:
  {
    "view": "choice",
    "enable_quick_replies": true,
    "enable_cards": false,
    "interaction_scope": "latest_only",
    "quick_reply_source": {
      "type": "explicit",
      "criteria": "payload:quick_replies"
    },
    "selection_mode": "multi",
    "min_select": 1,
    "max_select": 2,
    "submit_format": "csv",
    "grid_columns": {
      "quick_replies": 2,
      "cards": 1
    },
    "prompt_kind": "intent_disambiguation",
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 2,
      "cards_count": 0,
      "selection_mode_source": "config",
      "min_select_source": "config",
      "max_select_source": "config",
      "submit_format_source": "config"
    }
  }
QUICK_REPLY_RULE: mode=multi, min=1, max=2, submit=csv, source=explicit, criteria=payload:quick_replies, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- f1c063f2-b4e7-4f70-acf8-0917e5ce2e5d (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b) (2026-02-21T03:59:05.182+00:00)
  prefix_json:
    {
      "kb": {
        "admin": [
          {
            "id": "0da02c01-aad4-4286-a445-4db7a89f8ebe",
            "title": "mk2",
            "version": "1.0",
            "is_admin": true
          },
          {
            "id": "878b3ffe-2e18-4820-bda6-ffeccaa4212b",
            "title": "커머스 공통",
            "version": "1.0",
            "is_admin": true
          }
        ],
        "primary": {
          "id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
          "title": "테스트",
          "version": "1.2",
          "is_admin": false
        }
      },
      "mcp": {
        "last": {
          "error": null,
          "status": "none",
          "function": "NO_TOOL_CALLED",
          "result_count": null
        }
      },
      "auth": {
        "providers": [
          "cafe24",
          "shopify",
          "chat_policy"
        ],
        "settings_id": "d8fc56a3-db28-4af2-8499-285ed7ab62a5"
      },
      "mode": "mk2",
      "slot": {
        "phone_masked": "-"
      },
      "user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "plan": "pro",
        "role": "owner",
        "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
        "is_admin": true
      },
      "agent": {
        "id": "339f6e47-4239-49ee-9972-a7069038fe08",
        "llm": "chatgpt",
        "name": "에이전트1",
        "kb_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "version": "1.4",
        "parent_id": "54916862-764f-4ecc-8400-899fdb7a1fcc"
      },
      "build": {
        "ref": null,
        "tag": "debug-prefix-v3",
        "node": "v22.22.0",
        "commit": null,
        "build_at": null,
        "build_id": null,
        "deploy_env": "production",
        "runtime_started_at": "2026-02-21T03:02:54.879Z"
      },
      "decision": {
        "line": 152,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 152,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
            "function_name": "insertTurnWithDebug"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "recorded_at": "2026-02-21T03:59:04.914Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ]
      },
      "execution": {
        "call_chain": [
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
            "function_name": "POST"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts",
            "function_name": "bootstrapRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts",
            "function_name": "initializeRuntimeState"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "resolveIntentDisambiguation"
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": []
      },
      "templates": {
        "override_count": 1,
        "overrides_applied": {
          "order_choice_title": "주문번호를 모르셔도 됩니다. 아래 주문(주문일시/상품명/옵션/금액) 중 해당 주문의 번호를 선택해 주세요."
        }
      },
      "request_meta": {
        "domain": "mejai.help",
        "widget_org_id_present": false,
        "widget_secret_present": false,
        "widget_user_id_present": false,
        "widget_agent_id_present": false
      },
      "kb_resolution": {
        "user_group": {
          "paid": {
            "grade": "pro"
          },
          "service": {
            "tenant": "cafe24",
            "volume": {
              "scale": "bulk",
              "performance": "high"
            }
          }
        },
        "admin_kb_apply_groups": [
          {
            "id": "0da02c01-aad4-4286-a445-4db7a89f8ebe",
            "apply_groups": [
              {
                "path": "paid.grade",
                "values": [
                  "pro"
                ]
              },
              {
                "path": "service.tenant",
                "values": [
                  "cafe24"
                ]
              },
              {
                "path": "service.volume.performance",
                "values": [
                  "high"
                ]
              },
              {
                "path": "service.volume.scale",
                "values": [
                  "bulk"
                ]
              }
            ]
          },
          {
            "id": "878b3ffe-2e18-4820-bda6-ffeccaa4212b",
            "apply_groups": null
          }
        ],
        "admin_kb_filter_reasons": [
          "agent_selected",
          "agent_selected"
        ],
        "admin_kb_apply_groups_mode": [
          "any",
          "all"
        ]
      },
      "resolved_agent": {
        "is_active": true,
        "mcp_tool_ids": [
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "bc06a0c1-8f40-4ba8-9668-682170254b34"
        ],
        "resolved_from_parent": false
      },
      "schema_version": 3,
      "tool_allowlist": {
        "valid_tool_count": 15,
        "resolved_tool_ids": [
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "bc06a0c1-8f40-4ba8-9668-682170254b34",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43"
        ],
        "tools_by_id_count": 15,
        "allowed_tool_count": 15,
        "allowed_tool_names": [
          "cafe24:read_shipping",
          "cafe24:read_order_settings",
          "cafe24:create_ticket",
          "cafe24:lookup_order",
          "cafe24:track_shipment",
          "cafe24:read_product",
          "cafe24:read_supply",
          "cafe24:update_order_settings",
          "juso:search_address",
          "cafe24:api_get_customers_member_id_autoupdate_0d586802",
          "solapi:send_otp",
          "solapi:verify_otp",
          "cafe24:list_orders",
          "cafe24:update_order_shipping_address",
          "cafe24:resolve_product"
        ],
        "provider_selections": [],
        "resolved_tool_count": 15,
        "requested_tool_count": 15,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 6,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 54a20fc4-1153-4e44-83b4-afd9d49e1210 QUICK_REPLY_RULE_DECISION (2026-02-21T03:59:12.168+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_INTENT_DISAMBIGUATION",
        "max_select": 2,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
        "submit_format": "csv",
        "selection_mode": "multi",
        "source_function": "resolveIntentDisambiguationQuickReplyConfig"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 01d42b1d-d722-4bdf-9dd2-0da8a7a685d8 FINAL_ANSWER_READY (2026-02-21T03:59:11.904+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "model": "deterministic_intent_disambiguation",
      "answer": "확인한 것: 배송지 변경\n확인할 것: 원하시는 문의 유형을 선택해주세요. (번호로 답변)\n- 1번 | 배송지 변경 | 배송지/주문정보 변경\n- 2번 | 배송 문의 | 배송 상태/송장 조회\n예) 1,2\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
      "_decision": {
        "line": 155,
        "phase": "after",
        "column": 0,
        "call_chain": [
          {
            "line": 155,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "emit:FINAL_ANSWER_READY"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
        "recorded_at": "2026-02-21T03:59:11.904Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_INTENT_DISAMBIGUATION",
        "max_select": 2,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
        "submit_format": "csv",
        "selection_mode": "multi",
        "source_function": "resolveIntentDisambiguationQuickReplyConfig"
      }
    }
- 26787c1e-7599-4b1b-aa64-cf753264e30f POLICY_DECISION (2026-02-21T03:59:11.639+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "stage": "input",
      "action": "ASK_INTENT_DISAMBIGUATION",
      "options": [
        "order_change",
        "shipping_inquiry"
      ],
      "_decision": {
        "line": 147,
        "phase": "decision",
        "column": 0,
        "call_chain": [
          {
            "line": 147,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "emit:POLICY_DECISION"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
        "recorded_at": "2026-02-21T03:59:11.639Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- 4dce4c62-e7ac-4ed7-8fd8-56d89dbefb29 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:59:11.372+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "46c223f7-be8b-4a64-b828-50dd5ba9066b",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- db8565ea-ecf7-483d-99b9-6f8276bb2670 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:59:10.8+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "46c223f7-be8b-4a64-b828-50dd5ba9066b",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "config_source": "principles_default"
    }
- 795d5d3e-44ae-428b-9670-e92eb0e09850 END_USER_WRITE_LATENCY (2026-02-21T03:59:09.744+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "duration_ms": 4277
    }
- 7e30c7ff-f861-4f8a-b18e-4c407362ac54 END_USER_CONTEXT_RESOLVED (2026-02-21T03:59:06.54+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "match_hit": true,
      "end_user_id": "a7fbcce5-f82a-4165-b95e-9d9e2f5c6f06",
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": true,
      "runtime_end_user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "source": "auth_user",
        "email_masked": "su********@gmail.com",
        "external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
      },
      "resolution_source": "identity_match",
      "runtime_email_masked": "su********@gmail.com",
      "runtime_external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
    }
- 27104465-9aa4-4cb4-b92c-82a77d9f2e12 END_USER_MATCH_HIT (2026-02-21T03:59:06.272+00:00) (turn_id=46c223f7-be8b-4a64-b828-50dd5ba9066b)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }


TURN_ID: 03cff8c4-2d33-4345-9b56-0be38b67a2e9

[TOKEN_USED]

USER:
1

BOT:
확인한 것: 배송지 1
확인할 것: 개인정보 보호를 위해 본인 확인이 필요합니다. 휴대폰 번호를 알려주세요.
그 다음으로 확인할 것: 주문번호 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 배송지 1\n확인할 것: 개인정보 보호를 위해 본인 확인이 필요합니다. 휴대폰 번호를 알려주세요.\n그 다음으로 확인할 것: 주문번호 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }
RENDER_PLAN: view=text, quick_replies=false, cards=false, mode=single, min=1, max=1, submit=single, prompt=-
RENDER_PLAN_DETAIL:
  {
    "view": "text",
    "enable_quick_replies": false,
    "enable_cards": false,
    "interaction_scope": "latest_only",
    "quick_reply_source": {
      "type": "none"
    },
    "selection_mode": "single",
    "min_select": 1,
    "max_select": 1,
    "submit_format": "single",
    "grid_columns": {
      "quick_replies": 1,
      "cards": 1
    },
    "prompt_kind": null,
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 0,
      "cards_count": 0,
      "selection_mode_source": "default",
      "min_select_source": "default",
      "max_select_source": "default",
      "submit_format_source": "default"
    }
  }
QUICK_REPLY_RULE: mode=single, min=1, max=1, submit=single, source=none, criteria=-, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- 2ce3c46f-a203-45d8-a577-84e055612301 (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9) (2026-02-21T03:59:23.682+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "none",
          "function": "NO_TOOL_CALLED",
          "result_count": null
        }
      },
      "slot": {
        "address": "1",
        "phone_masked": "-",
        "expected_input": "address"
      },
      "decision": {
        "line": 152,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 152,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
            "function_name": "insertTurnWithDebug"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "recorded_at": "2026-02-21T03:59:23.413Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ]
      },
      "execution": {
        "call_chain": [
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
            "function_name": "POST"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts",
            "function_name": "bootstrapRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts",
            "function_name": "initializeRuntimeState"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "resolveIntentDisambiguation"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
            "function_name": "handlePreTurnGuards"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts",
            "function_name": "deriveSlotsForTurn"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
            "function_name": "handleAddressChangeRefundPending"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
            "function_name": "handleRestockPendingStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
            "function_name": "handlePostActionStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
            "function_name": "resolveIntentAndPolicyContext"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "runInputStageRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts",
            "function_name": "createRuntimeMcpOps"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/otpRuntime.ts",
            "function_name": "handleOtpLifecycleAndOrderGate"
          },
          {
            "module_path": "src/app/api/runtime/chat/services/dataAccess.ts",
            "function_name": "resolveProductDecision"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
            "function_name": "runToolStagePipeline"
          }
        ]
      },
      "slot_flow": {
        "derived_address": "1",
        "expected_inputs": [
          "address"
        ],
        "expected_input_stage": "legacy.expected_input",
        "expected_input_source": "derived_from_last_answer"
      },
      "tool_allowlist": {
        "valid_tool_count": 15,
        "resolved_tool_ids": [
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "bc06a0c1-8f40-4ba8-9668-682170254b34",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43"
        ],
        "tools_by_id_count": 15,
        "allowed_tool_count": 15,
        "allowed_tool_names": [
          "cafe24:read_shipping",
          "cafe24:read_order_settings",
          "cafe24:create_ticket",
          "cafe24:lookup_order",
          "cafe24:track_shipment",
          "cafe24:read_product",
          "cafe24:read_supply",
          "cafe24:update_order_settings",
          "juso:search_address",
          "cafe24:api_get_customers_member_id_autoupdate_0d586802",
          "solapi:send_otp",
          "solapi:verify_otp",
          "cafe24:list_orders",
          "cafe24:update_order_shipping_address",
          "cafe24:resolve_product"
        ],
        "provider_selections": [],
        "resolved_tool_count": 15,
        "requested_tool_count": 15,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
이벤트 로그:
- b606d409-6293-4dc2-9bfb-06f13ee17d5b CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:59:31.255+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "keys": [
        "address"
      ],
      "delta": {
        "address": "1"
      },
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:31.255Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- c2f505a7-e503-4740-8580-9fc1c99a4b7a RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:59:30.991+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "03cff8c4-2d33-4345-9b56-0be38b67a2e9",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 97b9ea20-e0ff-4bd2-8676-8f324fc76af4 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:59:30.437+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "03cff8c4-2d33-4345-9b56-0be38b67a2e9",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "config_source": "principles_default"
    }
- 7fc1eadd-a2d2-4c72-a0dc-bd7d6b1b0ff1 END_USER_WRITE_LATENCY (2026-02-21T03:59:29.359+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "duration_ms": 5397
    }
- c4600702-50d3-437d-953f-916059f701d9 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:59:29.095+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "keys": [
        "address"
      ],
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "key_count": 1,
      "keys_truncated": false
    }
- 6666a126-ce5a-41fe-a761-61ceb180e3e2 END_USER_CONTEXT_RESOLVED (2026-02-21T03:59:25.011+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "match_hit": true,
      "end_user_id": "a7fbcce5-f82a-4165-b95e-9d9e2f5c6f06",
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": true,
      "runtime_end_user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "source": "auth_user",
        "email_masked": "su********@gmail.com",
        "external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
      },
      "resolution_source": "session",
      "runtime_email_masked": "su********@gmail.com",
      "runtime_external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
    }
- b5549cea-f68b-43ea-ad95-0c9d538fd5a5 END_USER_MATCH_HIT (2026-02-21T03:59:24.747+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 4ef8004d-586b-419f-a4fd-96a9a9d3d954 AUTH_GATE_TRIGGERED (2026-02-21T03:59:23.14+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "action": "ASK_PHONE_FOR_OTP",
      "intent": "order_change",
      "reason": "SENSITIVE_INTENT_PRE_TOOL",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:23.139Z",
        "function_name": "unknown"
      },
      "force_otp_gate": true,
      "has_sensitive_planned_call": false
    }
- 5e6e2c46-5b7e-44ce-8876-4c844f0d5b09 AUTH_GATE_PRECHECK (2026-02-21T03:59:22.876+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:22.876Z",
        "function_name": "unknown"
      },
      "otp_pending": false,
      "otp_verified": false,
      "planned_calls": [],
      "force_otp_gate": true,
      "allowed_tool_names_count": 15,
      "has_sensitive_planned_call": false,
      "customer_verification_token_present": false
    }
- 92193ab3-9ead-457c-96e2-9c7c59398ee4 EXECUTION_GUARD_TRIGGERED (2026-02-21T03:59:22.613+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "tool": "update_order_shipping_address",
      "error": "MUTATION_INTENT_NOT_READY",
      "reason": "MISSING_REQUIRED_SLOTS",
      "missing": {
        "address": false,
        "zipcode": true,
        "order_id": true
      },
      "_decision": {
        "line": 125,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 125,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
            "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        "recorded_at": "2026-02-21T03:59:22.613Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- a7243210-fff5-439f-93d2-9534fba39249 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:59:22.079+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:22.079Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- bec3c557-5aa2-47a6-bf58-dc3abccf3d35 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:59:21.822+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:21.822Z",
        "function_name": "unknown"
      },
      "query_source": "intent_disambiguation_source_text",
      "expected_input": "address"
    }
- 60becd7a-2eb7-4c59-b196-3db78fc127ed SLOT_EXTRACTED (2026-02-21T03:59:21.554+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "derived": {
        "phone": null,
        "address": "1",
        "zipcode": null,
        "order_id": null,
        "phone_masked": "-"
      },
      "resolved": {
        "phone": null,
        "intent": "order_change",
        "address": "1",
        "zipcode": null,
        "order_id": null,
        "phone_masked": "-"
      },
      "_decision": {
        "line": 145,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 145,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "emit:SLOT_EXTRACTED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "recorded_at": "2026-02-21T03:59:21.554Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "intent_disambiguation_source_text",
      "missing_slots": [],
      "expected_input": "address",
      "resolved_slots": {}
    }
- dcffaac1-ac29-4b88-b841-8dca5a00c69c POLICY_STATIC_CONFLICT (2026-02-21T03:59:21.288+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-21T03:59:21.288Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }
- e05dface-7496-45e8-84af-a5f82a8bf196 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T03:59:21.02+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "source": "derived_from_last_answer",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:21.020Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": "address",
      "expected_inputs": [
        "address"
      ],
      "expected_input_stage": "legacy.expected_input"
    }
- 47c6e49c-77ae-4614-9286-6f7d35b4186b INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T03:59:20.763+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:20.762Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 1533d4d4-30e3-403a-834b-573cee521f29 POLICY_DECISION (2026-02-21T03:59:20.489+00:00) (turn_id=03cff8c4-2d33-4345-9b56-0be38b67a2e9)
  payload:
    {
      "stage": "input",
      "action": "INTENT_DISAMBIGUATION_SELECTED",
      "_decision": {
        "line": 175,
        "phase": "decision",
        "column": 0,
        "call_chain": [
          {
            "line": 175,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "emit:POLICY_DECISION"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
        "recorded_at": "2026-02-21T03:59:20.489Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "selected_indexes": [
        1
      ],
      "selected_intents": [
        "order_change"
      ],
      "source_text_used": true,
      "source_text_present": true
    }


TURN_ID: 7282789b-502d-409d-96b3-a1d68d0466db

[TOKEN_USED]

USER:
01093107159

BOT:
확인한 것: 연락처 *******7159, 배송지 1
확인할 것: 문자로 전송된 인증번호를 입력해주세요.
그 다음으로 확인할 것: 인증번호 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 연락처 *******7159, 배송지 1\n확인할 것: 문자로 전송된 인증번호를 입력해주세요.\n그 다음으로 확인할 것: 인증번호 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }
RENDER_PLAN: view=text, quick_replies=false, cards=false, mode=single, min=1, max=1, submit=single, prompt=-
RENDER_PLAN_DETAIL:
  {
    "view": "text",
    "enable_quick_replies": false,
    "enable_cards": false,
    "interaction_scope": "latest_only",
    "quick_reply_source": {
      "type": "none"
    },
    "selection_mode": "single",
    "min_select": 1,
    "max_select": 1,
    "submit_format": "single",
    "grid_columns": {
      "quick_replies": 1,
      "cards": 1
    },
    "prompt_kind": null,
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 0,
      "cards_count": 0,
      "selection_mode_source": "default",
      "min_select_source": "default",
      "max_select_source": "default",
      "submit_format_source": "default"
    }
  }
QUICK_REPLY_RULE: mode=single, min=1, max=1, submit=single, source=none, criteria=-, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- c679e2bb-e82a-4914-a4a9-35fc7d32d6c9 (turn_id=7282789b-502d-409d-96b3-a1d68d0466db) (2026-02-21T03:59:51.176+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "success",
          "function": "send_otp",
          "result_count": 6
        }
      },
      "slot": {
        "phone": "01093107159",
        "address": "1",
        "phone_masked": "*******7159",
        "expected_input": "phone"
      },
      "decision": {
        "line": 152,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 152,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
            "function_name": "insertTurnWithDebug"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "recorded_at": "2026-02-21T03:59:50.891Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ]
      },
      "execution": {
        "call_chain": [
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
            "function_name": "POST"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts",
            "function_name": "bootstrapRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts",
            "function_name": "initializeRuntimeState"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "resolveIntentDisambiguation"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
            "function_name": "handlePreTurnGuards"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts",
            "function_name": "deriveSlotsForTurn"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
            "function_name": "handleAddressChangeRefundPending"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
            "function_name": "handleRestockPendingStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
            "function_name": "handlePostActionStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
            "function_name": "resolveIntentAndPolicyContext"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "runInputStageRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts",
            "function_name": "createRuntimeMcpOps"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/otpRuntime.ts",
            "function_name": "handleOtpLifecycleAndOrderGate"
          }
        ]
      },
      "slot_flow": {
        "derived_phone": "01093107159",
        "expected_inputs": [
          "phone"
        ],
        "expected_input_prev": "phone",
        "expected_input_stage": "auth_gate.otp.awaiting_phone",
        "expected_input_source": "contract_stage"
      },
      "tool_allowlist": {
        "valid_tool_count": 15,
        "resolved_tool_ids": [
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "bc06a0c1-8f40-4ba8-9668-682170254b34",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43"
        ],
        "tools_by_id_count": 15,
        "allowed_tool_count": 15,
        "allowed_tool_names": [
          "cafe24:read_shipping",
          "cafe24:read_order_settings",
          "cafe24:create_ticket",
          "cafe24:lookup_order",
          "cafe24:track_shipment",
          "cafe24:read_product",
          "cafe24:read_supply",
          "cafe24:update_order_settings",
          "juso:search_address",
          "cafe24:api_get_customers_member_id_autoupdate_0d586802",
          "solapi:send_otp",
          "solapi:verify_otp",
          "cafe24:list_orders",
          "cafe24:update_order_shipping_address",
          "cafe24:resolve_product"
        ],
        "provider_selections": [],
        "resolved_tool_count": 15,
        "requested_tool_count": 15,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 11,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- 5db76cde-2554-4e48-8dd6-86cc2c92b379 solapi:send_otp@1.0: success (2026-02-21T03:59:50.618+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  request:
    {
      "path": "/messages/v4/send-many/detail",
      "method": "POST",
      "destination": "01093107159",
      "required_scope": "messaging.write"
    }
  response:
    {
      "otp_ref": "6fd832eb-aa7d-41b3-b444-a188e6b63d40",
      "delivery": "sms",
      "test_code": "101010",
      "test_mode": true,
      "expires_at": "2026-02-21T04:04:50.087Z",
      "destination": "01***59"
    }
이벤트 로그:
- 65504803-4864-4e9a-814f-df549020f9d4 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:59:59.414+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "keys": [
        "phone"
      ],
      "delta": {
        "phone": "01093107159"
      },
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:59.414Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 3636e91c-95ac-4055-afa1-a86bfbf3de94 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:59:59.153+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7282789b-502d-409d-96b3-a1d68d0466db",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 428ea972-807f-462b-b91d-31b104a4b084 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:59:58.361+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7282789b-502d-409d-96b3-a1d68d0466db",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "config_source": "principles_default"
    }
- 4634ab91-a11f-48ac-85c4-59580a96c87e END_USER_WRITE_LATENCY (2026-02-21T03:59:57.311+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "duration_ms": 5861
    }
- 98098fae-b8dd-4513-9bc5-f5891ea3623f END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:59:57.052+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "keys": [
        "phone"
      ],
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "key_count": 1,
      "keys_truncated": false
    }
- a395c2c1-6314-44e4-9eb8-15199f0d263b END_USER_CONTEXT_RESOLVED (2026-02-21T03:59:52.516+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "match_hit": true,
      "end_user_id": "a7fbcce5-f82a-4165-b95e-9d9e2f5c6f06",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": true,
      "runtime_end_user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "source": "auth_user",
        "email_masked": "su********@gmail.com",
        "external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
      },
      "resolution_source": "session",
      "runtime_email_masked": "su********@gmail.com",
      "runtime_external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
    }
- 5e384c83-2fde-4367-a120-1fdf4eee9c4c END_USER_MATCH_HIT (2026-02-21T03:59:52.255+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "matched": true,
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ]
    }
- 3f8cc83a-c1ea-475e-87f4-e8a5d3efca58 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:59:48.539+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:48.539Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 0fef1740-fe1d-4bea-84c2-455236a83277 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:59:48.274+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:59:48.274Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "phone"
    }
- a9e65b3e-51a8-4f80-bbf6-b718ad2149c2 SLOT_EXTRACTED (2026-02-21T03:59:48.001+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "derived": {
        "phone": "01093107159",
        "address": null,
        "zipcode": null,
        "order_id": null,
        "phone_masked": "*******7159"
      },
      "resolved": {
        "phone": "01093107159",
        "intent": "order_change",
        "address": "1",
        "zipcode": null,
        "order_id": null,
        "phone_masked": "*******7159"
      },
      "_decision": {
        "line": 145,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 145,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "emit:SLOT_EXTRACTED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "recorded_at": "2026-02-21T03:59:48.001Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "phone",
      "resolved_slots": {}
    }
- 1ba68f1c-0758-4baa-aa09-04fcc5eefa37 POLICY_STATIC_CONFLICT (2026-02-21T03:59:47.732+00:00) (turn_id=7282789b-502d-409d-96b3-a1d68d0466db)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-21T03:59:47.732Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }


TURN_ID: 49085207-5853-48e0-90cb-c457adcaa2d7

[TOKEN_USED]

USER:
101010

BOT:
확인한 것: 인증이 확인되었습니다.
확인할 것: 아래 주문이 맞는지 확인해 주세요.
- 주문번호: 20260127-0000014
- 상품: 아드헬린 린넨 플레어 원피스 그레이
- 옵션: 옵션 없음
- 가격: 1000.00
- 수량: 1
네/아니오로 답해주세요.
그 다음으로 확인할 것: 답변을 주시면 어느 주소로 변경할지 확인하겠습니다.
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 인증이 확인되었습니다.\n확인할 것: 아래 주문이 맞는지 확인해 주세요.\n- 주문번호: 20260127-0000014\n- 상품: 아드헬린 린넨 플레어 원피스 그레이\n- 옵션: 옵션 없음\n- 가격: 1000.00\n- 수량: 1\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 답변을 주시면 어느 주소로 변경할지 확인하겠습니다.",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "single"
    },
    "quick_replies": [
      {
        "label": "네",
        "value": "네"
      },
      {
        "label": "아니오",
        "value": "아니오"
      }
    ],
    "cards": []
  }
RENDER_PLAN: view=choice, quick_replies=true, cards=false, mode=single, min=1, max=1, submit=single, prompt=-
RENDER_PLAN_DETAIL:
  {
    "view": "choice",
    "enable_quick_replies": true,
    "enable_cards": false,
    "interaction_scope": "latest_only",
    "quick_reply_source": {
      "type": "explicit",
      "criteria": "payload:quick_replies"
    },
    "selection_mode": "single",
    "min_select": 1,
    "max_select": 1,
    "submit_format": "single",
    "grid_columns": {
      "quick_replies": 2,
      "cards": 1
    },
    "prompt_kind": null,
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 2,
      "cards_count": 0,
      "selection_mode_source": "config",
      "min_select_source": "config",
      "max_select_source": "config",
      "submit_format_source": "config"
    }
  }
QUICK_REPLY_RULE: mode=single, min=1, max=1, submit=single, source=explicit, criteria=payload:quick_replies, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- 4b61b94e-a248-45b6-b4b1-f215f0cd38f1 (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7) (2026-02-21T04:00:15.563+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "success",
          "function": "lookup_order",
          "result_count": 1
        }
      },
      "slot": {
        "phone": "01093107159",
        "address": "1",
        "phone_masked": "*******7159",
        "expected_input": "otp_code"
      },
      "decision": {
        "line": 152,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 152,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
            "function_name": "insertTurnWithDebug"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "recorded_at": "2026-02-21T04:00:15.295Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write",
          "R275_order_change_list_orders_by_phone"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ],
        "tool_policies": [
          "list_orders"
        ]
      },
      "execution": {
        "call_chain": [
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
            "function_name": "POST"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts",
            "function_name": "bootstrapRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts",
            "function_name": "initializeRuntimeState"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "resolveIntentDisambiguation"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
            "function_name": "handlePreTurnGuards"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts",
            "function_name": "deriveSlotsForTurn"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
            "function_name": "handleAddressChangeRefundPending"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
            "function_name": "handleRestockPendingStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
            "function_name": "handlePostActionStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
            "function_name": "resolveIntentAndPolicyContext"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "runInputStageRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts",
            "function_name": "createRuntimeMcpOps"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/otpRuntime.ts",
            "function_name": "handleOtpLifecycleAndOrderGate"
          },
          {
            "module_path": "src/app/api/runtime/chat/services/dataAccess.ts",
            "function_name": "resolveProductDecision"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
            "function_name": "runToolStagePipeline"
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [
          "otp_code"
        ],
        "expected_input_prev": "otp_code",
        "expected_input_stage": "auth_gate.otp.awaiting_code",
        "expected_input_source": "contract_stage"
      },
      "tool_allowlist": {
        "valid_tool_count": 15,
        "resolved_tool_ids": [
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "bc06a0c1-8f40-4ba8-9668-682170254b34",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43"
        ],
        "tools_by_id_count": 15,
        "allowed_tool_count": 15,
        "allowed_tool_names": [
          "cafe24:read_shipping",
          "cafe24:read_order_settings",
          "cafe24:create_ticket",
          "cafe24:lookup_order",
          "cafe24:track_shipment",
          "cafe24:read_product",
          "cafe24:read_supply",
          "cafe24:update_order_settings",
          "juso:search_address",
          "cafe24:api_get_customers_member_id_autoupdate_0d586802",
          "solapi:send_otp",
          "solapi:verify_otp",
          "cafe24:list_orders",
          "cafe24:update_order_shipping_address",
          "cafe24:resolve_product"
        ],
        "provider_selections": [],
        "resolved_tool_count": 15,
        "requested_tool_count": 15,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 6,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- ce11441f-ca69-4f21-b6a1-2bdae858c42e cafe24:lookup_order@1.0: success (2026-02-21T04:00:14.963+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  request:
    {
      "path": "/orders/{order_id}",
      "method": "GET",
      "order_id": "20260127-0000014",
      "required_scope": "mall.read_order",
      "customer_verification_token": "4360a831-315b-4f37-baf3-8012af749215"
    }
  response:
    {
      "order": {
        "paid": "T",
        "buyer": {
          "name": "mejai",
          "email": "ydsjy05@naver.com",
          "phone": "",
          "shop_no": 1,
          "user_id": null,
          "cellphone": "010-9310-7159",
          "member_id": "mejai",
          "user_name": null,
          "company_name": null,
          "updated_date": null,
          "buyer_zipcode": "08813",
          "buyer_address1": "서울 관악구 신림동 1515-7 ",
          "buyer_address2": "203",
          "names_furigana": "",
          "member_group_no": 1,
          "customer_notification": null,
          "company_registration_no": null
        },
        "items": [
          {
            "gift": "F",
            "labels": null,
            "hs_code": "",
            "item_no": 2,
            "options": [],
            "shop_no": 1,
            "quantity": 1,
            "tax_rate": 10,
            "option_id": "000A",
            "claim_code": null,
            "product_no": 20,
            "cancel_date": null,
            "option_type": null,
            "refund_date": null,
            "status_code": "N1",
            "status_text": "배송준비중",
            "supplier_id": "S0000000",
            "tracking_no": null,
            "volume_size": null,
            "claim_reason": null,
            "cloth_fabric": null,
            "made_in_code": "KR",
            "option_price": "0.00",
            "option_value": "",
            "order_status": "N20",
            "ordered_date": "2026-02-02T16:03:12+09:00",
            "origin_place": "국내 ",
            "product_code": "P000000U",
            "product_name": "아드헬린 린넨 플레어 원피스 그레이",
            "shipped_date": null,
            "store_pickup": "F",
            "subscription": "F",
            "supply_price": "1000.00",
            "variant_code": "P000000U000A",
            "exchange_date": null,
            "multi_invoice": null,
            "product_price": "1000.00",
            "shipping_code": "D-20260127-0000014-00",
            "supplier_name": "자체공급",
            "claim_quantity": 0,
            "delivered_date": null,
            "market_item_no": null,
            "payment_amount": null,
            "product_bundle": "F",
            "product_weight": "1.00",
            "request_undone": null,
            "order_item_code": "20260127-0000014-01",
            "origin_place_no": 1798,
            "payment_info_id": "0",
            "eng_product_name": "",
            "one_plus_n_event": null,
            "original_item_no": [],
            "product_material": "",
            "product_tax_type": "A",
            "refund_bank_name": "",
            "claim_reason_type": null,
            "post_express_flag": null,
            "product_bundle_no": "0",
            "shipping_fee_type": "X",
            "clearance_category": null,
            "item_granting_gift": null,
            "market_fail_reason": null,
            "naver_pay_order_id": null,
            "open_market_status": "",
            "origin_place_value": "",
            "volume_size_weight": null,
            "was_product_bundle": null,
            "cancel_request_date": null,
            "custom_product_code": "",
            "custom_variant_code": null,
            "product_bundle_list": null,
            "product_bundle_name": null,
            "product_bundle_type": null,
            "return_request_date": null,
            "shipping_company_id": "2",
            "option_value_default": "",
            "product_material_eng": null,
            "product_name_default": "아드헬린 린넨 플레어 원피스 그레이",
            "bundled_shipping_type": "N",
            "coupon_discount_price": "0.00",
            "exchange_request_date": null,
            "internal_product_name": "",
            "market_cancel_request": null,
            "return_collected_date": null,
            "return_confirmed_date": null,
            "shipping_company_code": "0001",
            "shipping_company_name": "자체배송",
            "supplier_product_name": "",
            "market_discount_amount": "0.00",
            "naver_pay_claim_status": null,
            "order_status_before_cs": null,
            "refund_bank_account_no": "",
            "shipping_expected_date": null,
            "shipping_fee_type_text": "기본배송",
            "additional_option_value": "",
            "clearance_category_code": null,
            "clearance_category_info": null,
            "individual_shipping_fee": "0.00",
            "market_fail_reason_type": null,
            "original_bundle_item_no": null,
            "shipping_payment_option": "P",
            "additional_option_values": [
              {
                "key": null,
                "name": null,
                "type": null,
                "value": null
              }
            ],
            "app_item_discount_amount": null,
            "market_fail_reason_guide": null,
            "additional_discount_price": "0.00",
            "purchaseconfirmation_date": null,
            "supplier_transaction_type": " ",
            "market_custom_variant_code": null,
            "refund_bank_account_holder": "",
            "product_bundle_name_default": null,
            "order_status_additional_info": "",
            "market_cancel_request_quantity": null
          }
        ],
        "return": [],
        "postpay": "F",
        "shop_no": 1,
        "canceled": "F",
        "currency": "KRW",
        "order_id": "20260127-0000014",
        "bank_code": "bank_13",
        "market_id": "self",
        "member_id": "mejai",
        "receivers": [
          {
            "name": "mejai",
            "phone": "",
            "city_en": null,
            "name_en": "",
            "shop_no": 1,
            "zipcode": "59625",
            "address1": "전라남도 여수시 상암로 8 (둔덕동)",
            "address2": "112동 201호",
            "state_en": null,
            "cellphone": "01093107159",
            "street_en": null,
            "address_city": "",
            "address_full": "전라남도 여수시 상암로 8 (둔덕동) 112동 201호",
            "country_code": null,
            "country_name": null,
            "address_state": "",
            "name_furigana": "",
            "shipping_code": "D-20260127-0000014-00",
            "address_street": "",
            "country_name_en": null,
            "shipping_message": "",
            "virtual_phone_no": null,
            "wished_delivery_date": "",
            "wished_delivery_time": null,
            "clearance_information": null,
            "clearance_information_type": null
          }
        ],
        "commission": "0.00",
        "order_date": "2026-01-27T01:49:00+09:00",
        "tax_detail": null,
        "use_escrow": "F",
        "cancel_date": null,
        "first_order": "T",
        "include_tax": "T",
        "loan_status": null,
        "naver_point": null,
        "social_name": null,
        "billing_name": "성지용",
        "easypay_name": "",
        "payment_date": "2026-02-02T16:03:12+09:00",
        "service_data": null,
        "service_type": null,
        "store_pickup": "F",
        "subscription": "F",
        "exchange_rate": "1.0000",
        "shipping_type": "A",
        "bank_code_name": "농협",
        "order_place_id": "self",
        "payment_amount": "3500.00",
        "payment_method": [
          "cash"
        ],
        "bank_account_no": "3020654717291",
        "market_order_no": null,
        "shipping_status": "F",
        "transaction_ids": null,
        "market_seller_id": null,
        "order_place_name": "PC쇼핑몰",
        "order_from_mobile": "F",
        "wished_carrier_id": null,
        "multiple_addresses": "F",
        "shipping_type_text": "국내배송",
        "social_member_code": null,
        "total_supply_price": "1000",
        "actual_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_method_name": [
          "무통장입금"
        ],
        "shipping_fee_detail": [
          {
            "items": [
              "20260127-0000014-01"
            ],
            "shipping_fee": "2500.00",
            "supplier_code": "S0000000",
            "cancel_shipping_fee": "0.00",
            "return_shipping_fee": "0.00",
            "shipping_group_code": 5,
            "refunded_shipping_fee": "0.00",
            "additional_shipping_fee": "0.00"
          }
        ],
        "wished_carrier_name": null,
        "initial_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_confirmation": null,
        "wished_delivery_date": "",
        "wished_delivery_time": null,
        "first_payment_methods": [
          "cash"
        ],
        "member_authentication": "T",
        "payment_gateway_names": null,
        "return_confirmed_date": null,
        "show_shipping_address": "T",
        "additional_handling_fee": "0.00",
        "additional_shipping_fee": "0.00",
        "admin_additional_amount": null,
        "bank_account_owner_name": "성지용",
        "sub_payment_method_code": null,
        "sub_payment_method_name": null,
        "regional_surcharge_detail": [],
        "additional_order_info_list": [],
        "naverpay_payment_information": null,
        "customer_group_no_when_ordering": "1",
        "international_shipping_insurance": "0.00"
      }
    }
- 01c293ac-86a3-4a0d-a454-f96d1e32fe0b cafe24:list_orders@1.0: success (2026-02-21T04:00:13.602+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  request:
    {
      "path": "/orders",
      "phone": "01093107159",
      "method": "GET",
      "end_date": "2026-02-21",
      "cellphone": "01093107159",
      "start_date": "2026-01-22",
      "required_scope": "mall.read_order"
    }
  response:
    {
      "links": [],
      "orders": [
        {
          "paid": "T",
          "postpay": "F",
          "shop_no": 1,
          "canceled": "F",
          "currency": "KRW",
          "order_id": "20260127-0000014",
          "bank_code": "bank_13",
          "market_id": "self",
          "member_id": "mejai",
          "commission": "0.00",
          "order_date": "2026-01-27T01:49:00+09:00",
          "tax_detail": null,
          "use_escrow": "F",
          "cancel_date": null,
          "first_order": "T",
          "include_tax": "T",
          "loan_status": null,
          "naver_point": null,
          "social_name": null,
          "billing_name": "성지용",
          "easypay_name": "",
          "member_email": "ydsjy05@naver.com",
          "payment_date": "2026-02-02T16:03:12+09:00",
          "service_data": null,
          "service_type": null,
          "store_pickup": "F",
          "subscription": "F",
          "exchange_rate": "1.0000",
          "shipping_type": "A",
          "bank_code_name": "농협",
          "order_place_id": "self",
          "payment_amount": "3500.00",
          "payment_method": [
            "cash"
          ],
          "bank_account_no": "3020654717291",
          "market_order_no": null,
          "shipping_status": "F",
          "transaction_ids": null,
          "market_seller_id": null,
          "order_place_name": "PC쇼핑몰",
          "order_from_mobile": "F",
          "wished_carrier_id": null,
          "multiple_addresses": "F",
          "shipping_type_text": "국내배송",
          "social_member_code": null,
          "total_supply_price": "1000",
          "actual_order_amount": {
            "tax": null,
            "shipping_fee": "2500.00",
            "payment_amount": "3500.00",
            "total_amount_due": "0.00",
            "order_price_amount": "1000.00",
            "app_discount_amount": "0.00",
            "points_spent_amount": "0.00",
            "credits_spent_amount": "0.00",
            "coupon_discount_price": "0.00",
            "point_incentive_amount": "0.00",
            "coupon_shipping_fee_amount": "0.00",
            "membership_discount_amount": "0.00",
            "set_product_discount_amount": "0.00",
            "market_other_discount_amount": "0.00",
            "shipping_fee_discount_amount": "0.00"
          },
          "payment_method_name": [
            "무통장입금"
          ],
          "shipping_fee_detail": [
            {
              "items": [
                "20260127-0000014-01"
              ],
              "shipping_fee": "2500.00",
              "supplier_code": "S0000000",
              "cancel_shipping_fee": "0.00",
              "return_shipping_fee": "0.00",
              "shipping_group_code": 5,
              "refunded_shipping_fee": "0.00",
              "additional_shipping_fee": "0.00"
            }
          ],
          "wished_carrier_name": null,
          "initial_order_amount": {
            "tax": null,
            "shipping_fee": "2500.00",
            "payment_amount": "3500.00",
            "total_amount_due": "0.00",
            "order_price_amount": "1000.00",
            "app_discount_amount": "0.00",
            "points_spent_amount": "0.00",
            "credits_spent_amount": "0.00",
            "coupon_discount_price": "0.00",
            "point_incentive_amount": "0.00",
            "coupon_shipping_fee_amount": "0.00",
            "membership_discount_amount": "0.00",
            "set_product_discount_amount": "0.00",
            "market_other_discount_amount": "0.00",
            "shipping_fee_discount_amount": "0.00"
          },
          "payment_confirmation": null,
          "wished_delivery_date": "",
          "wished_delivery_time": null,
          "first_payment_methods": [
            "cash"
          ],
          "member_authentication": "T",
          "payment_gateway_names": null,
          "return_confirmed_date": null,
          "show_shipping_address": "T",
          "group_no_when_ordering": "1",
          "additional_handling_fee": "0.00",
          "additional_shipping_fee": "0.00",
          "admin_additional_amount": null,
          "bank_account_owner_name": "성지용",
          "sub_payment_method_code": null,
          "sub_payment_method_name": null,
          "regional_surcharge_detail": [],
          "additional_order_info_list": [],
          "naverpay_payment_information": null,
          "international_shipping_insurance": "0.00"
        }
      ]
    }
- 3acc0b1e-bf51-4d2f-876d-2b6632a1c488 solapi:verify_otp@1.0: success (2026-02-21T04:00:09.66+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  request:
    {
      "code": "101010",
      "path": "/otp/verify",
      "method": "POST",
      "otp_ref": "6fd832eb-aa7d-41b3-b444-a188e6b63d40",
      "required_scope": "messaging.write"
    }
  response:
    {
      "verified": true,
      "customer_verification_token": "4360a831-315b-4f37-baf3-8012af749215"
    }
이벤트 로그:
- c7725c3a-3b00-4f53-a824-e6ff27ca86df QUICK_REPLY_RULE_DECISION (2026-02-21T04:00:24.935+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": "yes_no",
        "criteria": "policy:ORDER_CONFIRMATION_REQUIRED",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "runToolRuntime"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 06c44b9a-abd8-4081-8d59-d3a2b616816d ORDER_CHOICES_PRESENTED (2026-02-21T04:00:24.657+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "choices": [
        {
          "index": 1,
          "label": "1번 주문\n  주문일: 01/26 16:49\n  주문번호: 20260127-0000014\n  상품: 아드헬린 린넨 플레어 원피스 그레이\n  옵션: 옵션 없음\n  수량: 1\n  결제금액: 1,000원",
          "price": "1000.00",
          "order_id": "20260127-0000014",
          "quantity": "1",
          "image_url": null,
          "order_date": "2026-01-27T01:49:00+09:00",
          "option_name": "옵션 없음",
          "product_name": "아드헬린 린넨 플레어 원피스 그레이",
          "order_date_short": "01/26 16:49"
        }
      ],
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:00:24.657Z",
        "function_name": "unknown"
      },
      "auto_selected": false,
      "confirm_required": true,
      "pending_order_id": "20260127-0000014"
    }
- 4256978a-9574-43ca-8aa1-f4d045393961 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T04:00:24.396+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "keys": [
        "order_id",
        "target_summary"
      ],
      "delta": {
        "order_id": "20260127-0000014",
        "target_summary": [
          "주문번호: 20260127-0000014",
          "상품: 아드헬린 린넨 플레어 원피스 그레이",
          "옵션: 옵션 없음",
          "가격: 1000.00",
          "수량: 1"
        ]
      },
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:00:24.396Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 8c2ace3e-5b61-441f-bbeb-8bd1f21aba65 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T04:00:24.127+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "49085207-5853-48e0-90cb-c457adcaa2d7",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 7b6eb3a5-887d-49e4-952e-827d12aee131 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T04:00:23.365+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "49085207-5853-48e0-90cb-c457adcaa2d7",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "config_source": "principles_default"
    }
- 2ec1eee3-d1db-40a0-9b83-000596b3fc89 END_USER_WRITE_LATENCY (2026-02-21T04:00:22.298+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "duration_ms": 6450
    }
- f1a1f581-cb0e-46fb-a35b-e8c13dafd7ce END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T04:00:22.032+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "keys": [
        "order_id",
        "target_summary"
      ],
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "key_count": 2,
      "keys_truncated": false
    }
- 706fc3cb-3126-4b5f-b8b0-5f4e99c5ccff END_USER_CONTEXT_RESOLVED (2026-02-21T04:00:16.917+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "match_hit": true,
      "end_user_id": "a7fbcce5-f82a-4165-b95e-9d9e2f5c6f06",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": true,
      "runtime_end_user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "source": "auth_user",
        "email_masked": "su********@gmail.com",
        "external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
      },
      "resolution_source": "session",
      "runtime_email_masked": "su********@gmail.com",
      "runtime_external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
    }
- cc974c16-5f8d-43cf-b4f7-72936512665d END_USER_MATCH_HIT (2026-02-21T04:00:16.653+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "matched": true,
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ]
    }
- e06a1e93-0143-4140-8597-c4f5057da15d PRE_MCP_DECISION (2026-02-21T04:00:10.82+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": true,
        "phone_masked": "*******7159"
      },
      "intent": "order_change",
      "allowed": [
        "update_order_shipping_address",
        "list_orders",
        "lookup_order",
        "search_address",
        "send_otp",
        "verify_otp"
      ],
      "_decision": {
        "line": 657,
        "phase": "before",
        "column": 0,
        "call_chain": [
          {
            "line": 657,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
            "function_name": "emit:PRE_MCP_DECISION"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
        "recorded_at": "2026-02-21T04:00:10.820Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "101010",
      "final_calls": [
        {
          "args": {
            "phone": "01093107159",
            "end_date": "2026-02-21",
            "cellphone": "01093107159",
            "start_date": "2026-01-22"
          },
          "name": "list_orders"
        }
      ],
      "forced_calls": [
        {
          "args": {
            "phone": "01093107159"
          },
          "name": "list_orders"
        }
      ],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "allowed_tool_names": [
        "cafe24:list_orders"
      ],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 15
    }
- aaa765be-5b00-437f-9134-c675791e79a4 EXECUTION_GUARD_TRIGGERED (2026-02-21T04:00:10.56+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "tool": "update_order_shipping_address",
      "error": "MUTATION_INTENT_NOT_READY",
      "reason": "MISSING_REQUIRED_SLOTS",
      "missing": {
        "address": false,
        "zipcode": true,
        "order_id": true
      },
      "_decision": {
        "line": 125,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 125,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
            "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        "recorded_at": "2026-02-21T04:00:10.560Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 303cf2d7-8d95-4389-a206-ece9e3bc3eb7 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T04:00:08.599+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:00:08.599Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 867595a1-1842-4277-a338-bbfd6d62c01e INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T04:00:08.339+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:00:08.339Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "otp_code"
    }
- 54e12a77-96f9-4297-84a6-23b289f62373 SLOT_EXTRACTED (2026-02-21T04:00:07.608+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "derived": {
        "phone": null,
        "address": null,
        "zipcode": null,
        "order_id": null,
        "phone_masked": "-"
      },
      "resolved": {
        "phone": "01093107159",
        "intent": "order_change",
        "address": "1",
        "zipcode": null,
        "order_id": null,
        "phone_masked": "*******7159"
      },
      "_decision": {
        "line": 145,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 145,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "emit:SLOT_EXTRACTED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "recorded_at": "2026-02-21T04:00:07.608Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "otp_code",
      "resolved_slots": {}
    }
- 37fa2b57-4074-4c7a-a596-0d6186be512b POLICY_STATIC_CONFLICT (2026-02-21T04:00:07.343+00:00) (turn_id=49085207-5853-48e0-90cb-c457adcaa2d7)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-21T04:00:07.343Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }


TURN_ID: 93d6c5f1-6b93-4db0-9ad1-2ee68950df26

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 주문 확인 완료 (주문번호 20260127-0000014)
확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요.
그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 주문 확인 완료 (주문번호 20260127-0000014)\n확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요.\n그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }
RENDER_PLAN: view=text, quick_replies=false, cards=false, mode=single, min=1, max=1, submit=single, prompt=-
RENDER_PLAN_DETAIL:
  {
    "view": "text",
    "enable_quick_replies": false,
    "enable_cards": false,
    "interaction_scope": "latest_only",
    "quick_reply_source": {
      "type": "none"
    },
    "selection_mode": "single",
    "min_select": 1,
    "max_select": 1,
    "submit_format": "single",
    "grid_columns": {
      "quick_replies": 1,
      "cards": 1
    },
    "prompt_kind": null,
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 0,
      "cards_count": 0,
      "selection_mode_source": "default",
      "min_select_source": "default",
      "max_select_source": "default",
      "submit_format_source": "default"
    }
  }
QUICK_REPLY_RULE: mode=single, min=1, max=1, submit=single, source=none, criteria=-, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- 11ab8d7b-9eb1-4e12-9d15-e073e0ab73fa (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26) (2026-02-21T04:00:38.053+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "none",
          "function": "NO_TOOL_CALLED",
          "result_count": null
        }
      },
      "slot": {
        "phone": "01093107159",
        "address": "1",
        "phone_masked": "*******7159",
        "expected_input": "confirm"
      },
      "decision": {
        "line": 152,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 152,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
            "function_name": "insertTurnWithDebug"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "recorded_at": "2026-02-21T04:00:37.760Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ]
      },
      "execution": {
        "call_chain": [
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
            "function_name": "POST"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts",
            "function_name": "bootstrapRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts",
            "function_name": "initializeRuntimeState"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "resolveIntentDisambiguation"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
            "function_name": "handlePreTurnGuards"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts",
            "function_name": "deriveSlotsForTurn"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
            "function_name": "handleAddressChangeRefundPending"
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "target.awaiting_confirm",
        "expected_input_source": "contract_stage"
      },
      "tool_allowlist": {
        "valid_tool_count": 15,
        "resolved_tool_ids": [
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "bc06a0c1-8f40-4ba8-9668-682170254b34",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43"
        ],
        "tools_by_id_count": 15,
        "allowed_tool_count": 15,
        "allowed_tool_names": [
          "cafe24:read_shipping",
          "cafe24:read_order_settings",
          "cafe24:create_ticket",
          "cafe24:lookup_order",
          "cafe24:track_shipment",
          "cafe24:read_product",
          "cafe24:read_supply",
          "cafe24:update_order_settings",
          "juso:search_address",
          "cafe24:api_get_customers_member_id_autoupdate_0d586802",
          "solapi:send_otp",
          "solapi:verify_otp",
          "cafe24:list_orders",
          "cafe24:update_order_shipping_address",
          "cafe24:resolve_product"
        ],
        "provider_selections": [],
        "resolved_tool_count": 15,
        "requested_tool_count": 15,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- c32ed9d6-139c-4e38-b5b6-ce632422dd32 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T04:00:51.098+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "keys": [
        "order_id"
      ],
      "delta": {
        "order_id": "20260127-0000014"
      },
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:00:51.098Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 678763bb-e448-4266-af10-2cf0527512c5 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T04:00:50.832+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "93d6c5f1-6b93-4db0-9ad1-2ee68950df26",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "proposal_count": 1,
      "violation_count": 1,
      "deduped_violation_count": 0
    }
- 75cd8866-8247-4b70-8db5-92acad8347cf RUNTIME_PATCH_PROPOSAL_CREATED (2026-02-21T04:00:50.556+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "title": "Principle violation patch proposal",
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "status": "pending",
      "trigger": "runtime_turn_write",
      "turn_id": "93d6c5f1-6b93-4db0-9ad1-2ee68950df26",
      "rationale": "Prefer runtime decision-path fix over principle text changes (force_template_misapplied=false, expected_input=-, policy_reason=-)",
      "confidence": 0.7,
      "created_at": "2026-02-21T04:00:50.295Z",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "why_failed": "Address slot was already resolved, but final response selection re-asked address.",
      "change_plan": [
        "At final response stage, if expected_input=address and resolved address exists, forbid address prompt template.",
        "If policy decision is DEFER_FORCE_RESPONSE_TEMPLATE with ORDER_AND_ADDRESS_ALREADY_AVAILABLE, preserve decision through finalization.",
        "Emit explicit debug evidence (resolved_address / policy_decision_reason / final_template) around failure boundary."
      ],
      "proposal_id": "rp_1771646447416_yfdc8p",
      "target_files": [
        "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
        "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts"
      ],
      "violation_id": "pv_7f78de77-0a41-459e-b887-6ccbe3ddec0c_93d6c5f1-6b93-4db0-9ad1-2ee68950df26_memoryno_repeat_address_question",
      "principle_key": "memory.enforceNoRepeatQuestions",
      "runtime_scope": "chat",
      "how_to_improve": "Use finalized slot/policy decision evidence to block address re-ask in final response path; add guard in runtime finalize/handler path.",
      "self_heal_gate": {
        "track": "contract",
        "gate_version": "v1",
        "exception_stats": {
          "repeat_count_7d": 24,
          "repeat_count_30d": 24
        },
        "promotion_reason": "-",
        "contract_fields_ok": false,
        "promotion_required": false,
        "exception_fields_ok": false,
        "evidence_contract_ok": false,
        "case_specific_signals": [],
        "exception_fingerprint": "ex:memory.enforcenorepeatquestions:memoryno_repeat_address_question:-:-",
        "missing_contract_fields": [
          "contract_scope",
          "generalization_scope",
          "slot_request_mapping_strategy",
          "response_projection_strategy",
          "pre_post_invariant_strategy",
          "contract_expectation"
        ],
        "missing_evidence_fields": [
          "slot_resolved_address",
          "policy_decision_reason",
          "final_response_forced_template_applied"
        ],
        "missing_exception_fields": [
          "exception_reason",
          "exception_scope",
          "exception_expiry",
          "promotion_plan",
          "promotion_trigger",
          "blast_radius"
        ]
      },
      "suggested_diff": null,
      "issue_fingerprint": "memory.enforcenorepeatquestions|chat|확인한 것: 주문 확인 완료 (주문번호 20260127-0000014) 확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요. 그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.|address was already known but the bot asked for address again.||||"
    }
- e0057f19-d983-45d3-b0c3-339ef0204bbe PRINCIPLE_VIOLATION_DETECTED (2026-02-21T04:00:50.296+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "summary": "Address was already known but the bot asked for address again.",
      "trigger": "runtime_turn_write",
      "evidence": {
        "answer": "확인한 것: 주문 확인 완료 (주문번호 20260127-0000014)\n확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요.\n그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.",
        "expected_input": null,
        "known_address_count": 1,
        "expected_reuse_order": [
          "derived",
          "prevEntity",
          "prevTranscript",
          "recentEntity"
        ],
        "slot_resolved_address": null,
        "policy_decision_action": null,
        "policy_decision_reason": null,
        "force_template_misapplied": false,
        "user_provided_address_count": 1,
        "user_provided_addresses_tail": [
          "1"
        ],
        "final_response_resolved_address": null,
        "final_response_forced_template_applied": null,
        "final_response_forced_template_skipped_reason": null
      },
      "severity": "medium",
      "violation_id": "pv_7f78de77-0a41-459e-b887-6ccbe3ddec0c_93d6c5f1-6b93-4db0-9ad1-2ee68950df26_memoryno_repeat_address_question",
      "principle_key": "memory.enforceNoRepeatQuestions",
      "runtime_scope": "chat",
      "baseline_source": "src/app/api/runtime/chat/policies/principles.ts",
      "issue_fingerprint": "memory.enforcenorepeatquestions|chat|확인한 것: 주문 확인 완료 (주문번호 20260127-0000014) 확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요. 그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.|address was already known but the bot asked for address again.||||"
    }
- 2e738cfe-aca0-4280-85d8-0cea806aeeb8 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T04:00:45.854+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "93d6c5f1-6b93-4db0-9ad1-2ee68950df26",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "config_source": "principles_default"
    }
- e4e90d94-5c7c-45a8-aab8-9ba206136bbb END_USER_WRITE_LATENCY (2026-02-21T04:00:44.79+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "duration_ms": 6441
    }
- ff02415a-9fb2-488b-9c4f-e0bb7dd7f06f END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T04:00:44.503+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "keys": [
        "order_id"
      ],
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "key_count": 1,
      "keys_truncated": false
    }
- 9320e363-65e5-4900-9948-ff54ccb052a3 END_USER_CONTEXT_RESOLVED (2026-02-21T04:00:39.429+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "match_hit": true,
      "end_user_id": "a7fbcce5-f82a-4165-b95e-9d9e2f5c6f06",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": true,
      "runtime_end_user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "source": "auth_user",
        "email_masked": "su********@gmail.com",
        "external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
      },
      "resolution_source": "session",
      "runtime_email_masked": "su********@gmail.com",
      "runtime_external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
    }
- 29cc5374-eef1-44e1-a2b9-d1aff5d415e2 END_USER_MATCH_HIT (2026-02-21T04:00:39.165+00:00) (turn_id=93d6c5f1-6b93-4db0-9ad1-2ee68950df26)
  payload:
    {
      "matched": true,
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ]
    }


TURN_ID: 5c142bda-efc8-4380-a792-391921d0b596

[TOKEN_USED]

USER:
서울시 관악구 봉천동 1656-21 440호

BOT:
확인한 것: 정보 업데이트: 배송지 1 -> 서울시 관악구 봉천동 1656-21 440호. 이후 안내는 변경된 정보 기준으로 진행합니다. 주문 확인 완료 (주문번호 20260127-0000014)
확인할 것: 입력하신 주소를 확인했습니다.
- 지번주소: 서울특별시 관악구 봉천동 1656-21
- 도로명주소: 서울특별시 관악구 인헌2길 8-3 (봉천동)
- 우편번호: 08793
위 정보가 맞는지 확인해주세요.
네/아니오로 답해주세요.
그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 정보 업데이트: 배송지 1 -> 서울시 관악구 봉천동 1656-21 440호. 이후 안내는 변경된 정보 기준으로 진행합니다. 주문 확인 완료 (주문번호 20260127-0000014)\n확인할 것: 입력하신 주소를 확인했습니다.\n- 지번주소: 서울특별시 관악구 봉천동 1656-21\n- 도로명주소: 서울특별시 관악구 인헌2길 8-3 (봉천동)\n- 우편번호: 08793\n위 정보가 맞는지 확인해주세요.\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "single"
    },
    "quick_replies": [
      {
        "label": "네",
        "value": "네"
      },
      {
        "label": "아니오",
        "value": "아니오"
      }
    ],
    "cards": []
  }
RENDER_PLAN: view=choice, quick_replies=true, cards=false, mode=single, min=1, max=1, submit=single, prompt=-
RENDER_PLAN_DETAIL:
  {
    "view": "choice",
    "enable_quick_replies": true,
    "enable_cards": false,
    "interaction_scope": "latest_only",
    "quick_reply_source": {
      "type": "explicit",
      "criteria": "payload:quick_replies"
    },
    "selection_mode": "single",
    "min_select": 1,
    "max_select": 1,
    "submit_format": "single",
    "grid_columns": {
      "quick_replies": 2,
      "cards": 1
    },
    "prompt_kind": null,
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 2,
      "cards_count": 0,
      "selection_mode_source": "config",
      "min_select_source": "config",
      "max_select_source": "config",
      "submit_format_source": "config"
    }
  }
QUICK_REPLY_RULE: mode=single, min=1, max=1, submit=single, source=explicit, criteria=payload:quick_replies, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- ea32dc7b-243f-49de-a7ed-3ca484b952a3 (turn_id=5c142bda-efc8-4380-a792-391921d0b596) (2026-02-21T04:01:14.586+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "none",
          "function": "NO_TOOL_CALLED",
          "result_count": null
        }
      },
      "slot": {
        "phone": "01093107159",
        "address": "서울시 관악구 봉천동 1656-21 440호",
        "order_id": "20260127-0000014",
        "phone_masked": "*******7159",
        "expected_input": "address"
      },
      "decision": {
        "line": 152,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 152,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
            "function_name": "insertTurnWithDebug"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "recorded_at": "2026-02-21T04:01:14.321Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write",
          "R268_order_change_need_zipcode_tool"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ],
        "template_ids": [
          "order_change_need_zipcode"
        ]
      },
      "execution": {
        "call_chain": [
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
            "function_name": "POST"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts",
            "function_name": "bootstrapRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts",
            "function_name": "initializeRuntimeState"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "resolveIntentDisambiguation"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
            "function_name": "handlePreTurnGuards"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts",
            "function_name": "deriveSlotsForTurn"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
            "function_name": "handleAddressChangeRefundPending"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
            "function_name": "handleRestockPendingStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
            "function_name": "handlePostActionStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
            "function_name": "resolveIntentAndPolicyContext"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "runInputStageRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts",
            "function_name": "createRuntimeMcpOps"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/otpRuntime.ts",
            "function_name": "handleOtpLifecycleAndOrderGate"
          },
          {
            "module_path": "src/app/api/runtime/chat/services/dataAccess.ts",
            "function_name": "resolveProductDecision"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
            "function_name": "runToolStagePipeline"
          }
        ]
      },
      "slot_flow": {
        "derived_address": "서울시 관악구 봉천동 1656-21 440호",
        "expected_inputs": [
          "address"
        ],
        "expected_input_prev": "address",
        "expected_input_stage": "order_change.address.awaiting_address",
        "expected_input_source": "contract_stage"
      },
      "tool_allowlist": {
        "valid_tool_count": 15,
        "resolved_tool_ids": [
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "bc06a0c1-8f40-4ba8-9668-682170254b34",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43"
        ],
        "tools_by_id_count": 15,
        "allowed_tool_count": 15,
        "allowed_tool_names": [
          "cafe24:read_shipping",
          "cafe24:read_order_settings",
          "cafe24:create_ticket",
          "cafe24:lookup_order",
          "cafe24:track_shipment",
          "cafe24:read_product",
          "cafe24:read_supply",
          "cafe24:update_order_settings",
          "juso:search_address",
          "cafe24:api_get_customers_member_id_autoupdate_0d586802",
          "solapi:send_otp",
          "solapi:verify_otp",
          "cafe24:list_orders",
          "cafe24:update_order_shipping_address",
          "cafe24:resolve_product"
        ],
        "provider_selections": [],
        "resolved_tool_count": 15,
        "requested_tool_count": 15,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- 506bb9d3-5f28-402b-8fe0-cb6374170b3c search_address@-: success (2026-02-21T04:01:13.792+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  request:
    {
      "keyword": "서울시 관악구 봉천동 1656-21 440호",
      "search_keywords": [
        "서울시 관악구 봉천동 1656-21 440호",
        "서울시 관악구 봉천동 1656-21 440",
        "서울시 관악구 봉천동 1656-21",
        "서울시 관악구 봉천동 1656",
        "서울시 관악구 봉천동",
        "서울시 관악구 봉천",
        "서울시 관악구"
      ]
    }
  response:
    {
      "debug": {
        "url": "https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=U01TX0FVVEgyMDI2MDIwMjE3MjcxNTExNzUyODk%3D&currentPage=1&countPerPage=10&keyword=%EC%84%9C%EC%9A%B8%EC%8B%9C+%EA%B4%80%EC%95%85%EA%B5%AC+%EB%B4%89%EC%B2%9C%EB%8F%99+1656-21+440%ED%98%B8&resultType=json",
        "source": "JUSO_API",
        "status": 200,
        "keyFound": true,
        "keyLength": 40,
        "rawResponseLength": 615
      },
      "source": "JUSO_API",
      "results": [
        {
          "rn": "인헌2길",
          "bdNm": "",
          "liNm": "",
          "mtYn": "0",
          "siNm": "서울특별시",
          "admCd": "1162010100",
          "emdNm": "봉천동",
          "emdNo": "01",
          "sggNm": "관악구",
          "zipNo": "08793",
          "bdKdcd": "0",
          "udrtYn": "0",
          "bdMgtSn": "1162010100116560021024113",
          "engAddr": "8-3 Inheon 2-gil, Gwanak-gu, Seoul",
          "rnMgtSn": "116204160661",
          "buldMnnm": "8",
          "buldSlno": "3",
          "lnbrMnnm": "1656",
          "lnbrSlno": "21",
          "roadAddr": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
          "jibunAddr": "서울특별시 관악구 봉천동 1656-21",
          "detBdNmList": "",
          "roadAddrPart1": "서울특별시 관악구 인헌2길 8-3",
          "roadAddrPart2": " (봉천동)"
        }
      ],
      "totalCount": "1",
      "_search_attempts": [
        {
          "status": "success",
          "keyword": "서울시 관악구 봉천동 1656-21 440호",
          "total_count": "1"
        }
      ],
      "_search_keywords": [
        "서울시 관악구 봉천동 1656-21 440호",
        "서울시 관악구 봉천동 1656-21 440",
        "서울시 관악구 봉천동 1656-21",
        "서울시 관악구 봉천동 1656",
        "서울시 관악구 봉천동",
        "서울시 관악구 봉천",
        "서울시 관악구"
      ]
    }
이벤트 로그:
- 18de1cdb-8fd3-4cfa-922b-1ad349f0162d QUICK_REPLY_RULE_DECISION (2026-02-21T04:01:25.709+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "guard:RUNTIME_PRINCIPLE_MISSING_ZIPCODE_CONFIRM",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleOrderChangePostTools"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 0732a12b-7e2f-4a3f-be60-ab3a469df8a4 EXECUTION_GUARD_TRIGGERED (2026-02-21T04:01:25.442+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "tool": "search_address",
      "error": "ADDRESS_PRESENT_ZIPCODE_MISSING",
      "reason": "MISSING_ZIPCODE",
      "_decision": {
        "line": 125,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 125,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
            "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        "recorded_at": "2026-02-21T04:01:25.442Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 0f6c3100-febd-4a28-a68d-b24dd0a37637 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T04:01:25.185+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "keys": [
        "order_id",
        "address",
        "zipcode",
        "road_addr",
        "jibun_addr",
        "candidate_count"
      ],
      "delta": {
        "address": "서울시 관악구 봉천동 1656-21 440호",
        "zipcode": "08793",
        "order_id": "20260127-0000014",
        "road_addr": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
        "jibun_addr": "서울특별시 관악구 봉천동 1656-21",
        "candidate_count": 1
      },
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:25.185Z",
        "function_name": "unknown"
      },
      "key_count": 6
    }
- a15887d3-2a57-456c-bfa8-8f5129c1fd83 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T04:01:24.919+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "5c142bda-efc8-4380-a792-391921d0b596",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- ce3a9ddc-3cd6-4e16-a972-d9525a1badb0 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T04:01:23.879+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "5c142bda-efc8-4380-a792-391921d0b596",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "config_source": "principles_default"
    }
- c0311da1-c9b3-44e0-985c-f73200b749a8 END_USER_WRITE_LATENCY (2026-02-21T04:01:22.821+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "duration_ms": 7942
    }
- 1eec836c-2ce9-4863-93dc-22fcb50f62bf END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T04:01:22.564+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "keys": [
        "address",
        "zipcode",
        "order_id",
        "road_addr",
        "jibun_addr",
        "candidate_count"
      ],
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "key_count": 6,
      "keys_truncated": false
    }
- f78c9140-c591-42da-97c7-591984111cb6 END_USER_CONTEXT_RESOLVED (2026-02-21T04:01:15.938+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "match_hit": true,
      "end_user_id": "a7fbcce5-f82a-4165-b95e-9d9e2f5c6f06",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": true,
      "runtime_end_user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "source": "auth_user",
        "email_masked": "su********@gmail.com",
        "external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
      },
      "resolution_source": "session",
      "runtime_email_masked": "su********@gmail.com",
      "runtime_external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
    }
- a379f514-d4f3-4411-8790-4a0bb59a0150 END_USER_MATCH_HIT (2026-02-21T04:01:15.675+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "matched": true,
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ]
    }
- e186b0a6-684f-453c-9248-1ddcb909200a ADDRESS_SEARCH_COMPLETED (2026-02-21T04:01:14.061+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:14.061Z",
        "function_name": "unknown"
      },
      "query_text": "서울시 관악구 봉천동 1656-21 440호",
      "result_count": 1,
      "candidate_count": 1
    }
- 81459160-5155-4810-8b3a-e11fd15389c4 ADDRESS_SEARCH_STARTED (2026-02-21T04:01:12.78+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:12.780Z",
        "function_name": "unknown"
      },
      "query_text": "서울시 관악구 봉천동 1656-21 440호"
    }
- 5fe6fd9b-c046-4b2d-9495-24d62433e1ae POLICY_DECISION (2026-02-21T04:01:12.521+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "stage": "tool",
      "action": "ENFORCE_RUNTIME_PRINCIPLE_ADDRESS_ZIPCODE_RESOLUTION",
      "reason": "ADDRESS_PRESENT_ZIPCODE_MISSING",
      "resolver": "search_address",
      "_decision": {
        "line": 819,
        "phase": "decision",
        "column": 0,
        "call_chain": [
          {
            "line": 819,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/handlers/restockHandler.ts",
            "function_name": "emit:POLICY_DECISION"
          }
        ],
        "module_path": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "recorded_at": "2026-02-21T04:01:12.521Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- cfb6c581-5a7c-43e1-be4b-1f4418b46056 POLICY_DECISION (2026-02-21T04:01:12.247+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "stage": "tool",
      "action": "DEFER_FORCE_RESPONSE_TEMPLATE",
      "reason": "ORDER_AND_ADDRESS_ALREADY_AVAILABLE",
      "template": "order_change_need_zipcode",
      "_decision": {
        "line": 819,
        "phase": "decision",
        "column": 0,
        "call_chain": [
          {
            "line": 819,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/handlers/restockHandler.ts",
            "function_name": "emit:POLICY_DECISION"
          }
        ],
        "module_path": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "recorded_at": "2026-02-21T04:01:12.247Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- 48974b42-832d-4828-bacc-6bf165810917 PRE_MCP_DECISION (2026-02-21T04:01:11.988+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": "20260127-0000014",
        "has_address": true,
        "phone_masked": "*******7159"
      },
      "intent": "order_change",
      "allowed": [
        "update_order_shipping_address",
        "list_orders",
        "lookup_order",
        "search_address",
        "send_otp",
        "verify_otp"
      ],
      "_decision": {
        "line": 657,
        "phase": "before",
        "column": 0,
        "call_chain": [
          {
            "line": 657,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
            "function_name": "emit:PRE_MCP_DECISION"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
        "recorded_at": "2026-02-21T04:01:11.988Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "서울시 관악구 봉천동 1656-21 440호",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 15
    }
- d9da1429-e84b-4ca8-94cd-7e5bb3be5b7b EXECUTION_GUARD_TRIGGERED (2026-02-21T04:01:11.732+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "tool": "update_order_shipping_address",
      "error": "MUTATION_INTENT_NOT_READY",
      "reason": "MISSING_REQUIRED_SLOTS",
      "missing": {
        "address": false,
        "zipcode": true,
        "order_id": false
      },
      "_decision": {
        "line": 125,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 125,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
            "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        "recorded_at": "2026-02-21T04:01:11.732Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 54a06495-2717-4c18-b05f-d533b9330073 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T04:01:11.194+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:11.194Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- bd2aa09d-1d85-48e2-8775-293c443b56f5 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T04:01:10.937+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:10.937Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "address"
    }
- a9db4dc2-800a-4689-81d4-03186465f7b3 SLOT_EXTRACTED (2026-02-21T04:01:10.672+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "derived": {
        "phone": null,
        "address": "서울시 관악구 봉천동 1656-21 440호",
        "zipcode": null,
        "order_id": null,
        "phone_masked": "-"
      },
      "resolved": {
        "phone": "01093107159",
        "intent": "order_change",
        "address": "서울시 관악구 봉천동 1656-21 440호",
        "zipcode": null,
        "order_id": "20260127-0000014",
        "phone_masked": "*******7159"
      },
      "_decision": {
        "line": 145,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 145,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "emit:SLOT_EXTRACTED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "recorded_at": "2026-02-21T04:01:10.672Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "address",
      "resolved_slots": {}
    }
- af21eb81-406c-4397-9a2a-fa8db5349dff POLICY_STATIC_CONFLICT (2026-02-21T04:01:10.413+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-21T04:01:10.413Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }
- af44c5d7-d523-49c3-9f77-acc4cca78920 ENTITY_FIELD_UPDATED (2026-02-21T04:01:10.147+00:00) (turn_id=5c142bda-efc8-4380-a792-391921d0b596)
  payload:
    {
      "intent": "order_change",
      "updates": [
        {
          "next": "서울시 관악구 봉천동 1656-21 440호",
          "prev": "1",
          "field": "address"
        }
      ],
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:10.147Z",
        "function_name": "unknown"
      },
      "update_notice": "정보 업데이트: 배송지 1 -> 서울시 관악구 봉천동 1656-21 440호. 이후 안내는 변경된 정보 기준으로 진행합니다."
    }


TURN_ID: 0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5

[TOKEN_USED]

USER:
네

BOT:
요약: 배송지 변경이 완료되었습니다.
근거: 주문 정보 변경 정책에 따라 처리했습니다.
상세: 주문번호 20260127-0000014의 배송지를 변경했습니다.
- 변경 전: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호
- 요청: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호
- 적용: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호
다음 액션: 추가 변경 사항이 있으면 알려주세요.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 주소 서울특별시 관악구 인헌2길 8-3 (봉천동) (08793)\n확인할 것: 배송지 변경이 완료되었습니다.\n주문번호 20260127-0000014의 배송지가 업데이트되었습니다.\n변경 전: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호\n변경 후: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호\n추가로 변경할 내용이 있으면 알려주세요.\n그 다음으로 확인할 것: 배송지 변경 적용",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }
RENDER_PLAN: view=text, quick_replies=false, cards=false, mode=single, min=1, max=1, submit=single, prompt=-
RENDER_PLAN_DETAIL:
  {
    "view": "text",
    "enable_quick_replies": false,
    "enable_cards": false,
    "interaction_scope": "latest_only",
    "quick_reply_source": {
      "type": "none"
    },
    "selection_mode": "single",
    "min_select": 1,
    "max_select": 1,
    "submit_format": "single",
    "grid_columns": {
      "quick_replies": 1,
      "cards": 1
    },
    "prompt_kind": null,
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 0,
      "cards_count": 0,
      "selection_mode_source": "default",
      "min_select_source": "default",
      "max_select_source": "default",
      "submit_format_source": "default"
    }
  }
QUICK_REPLY_RULE: mode=single, min=1, max=1, submit=single, source=none, criteria=-, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- 6dcd3953-809d-48ec-9687-8f0e83bf7ef7 (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5) (2026-02-21T04:01:40.101+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "success",
          "function": "update_order_shipping_address",
          "result_count": 1
        }
      },
      "slot": {
        "phone": "01093107159",
        "address": "서울시 관악구 봉천동 1656-21 440호",
        "zipcode": "08793",
        "order_id": "20260127-0000014",
        "phone_masked": "*******7159",
        "expected_input": "confirm"
      },
      "decision": {
        "line": 152,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 152,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
            "function_name": "insertTurnWithDebug"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "recorded_at": "2026-02-21T04:01:39.825Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write",
          "R271_order_change_force_update"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ],
        "tool_policies": [
          "update_order_shipping_address"
        ]
      },
      "execution": {
        "call_chain": [
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
            "function_name": "POST"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeBootstrap.ts",
            "function_name": "bootstrapRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts",
            "function_name": "initializeRuntimeState"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts",
            "function_name": "resolveIntentDisambiguation"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
            "function_name": "handlePreTurnGuards"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts",
            "function_name": "deriveSlotsForTurn"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
            "function_name": "handleAddressChangeRefundPending"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
            "function_name": "handleRestockPendingStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/postActionRuntime.ts",
            "function_name": "handlePostActionStage"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
            "function_name": "resolveIntentAndPolicyContext"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "runInputStageRuntime"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts",
            "function_name": "createRuntimeMcpOps"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/otpRuntime.ts",
            "function_name": "handleOtpLifecycleAndOrderGate"
          },
          {
            "module_path": "src/app/api/runtime/chat/services/dataAccess.ts",
            "function_name": "resolveProductDecision"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts",
            "function_name": "runToolStagePipeline"
          }
        ]
      },
      "slot_flow": {
        "derived_address": "서울시 관악구 봉천동 1656-21 440호",
        "derived_zipcode": "08793",
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "order_change.address.awaiting_zipcode_confirm",
        "expected_input_source": "contract_stage"
      },
      "tool_allowlist": {
        "valid_tool_count": 15,
        "resolved_tool_ids": [
          "11025bb2-770a-4c55-af11-83ba2caabcb8",
          "a9cd0a00-59f1-43fd-97d4-5f5c1bca3c07",
          "bc06a0c1-8f40-4ba8-9668-682170254b34",
          "aec3bd90-314a-4929-9fe5-6ed33888857c",
          "ffb90354-4eb0-4dd8-9ba1-d6608a1ea79b",
          "4b4cec22-7d1b-4c06-8579-08cdfbacc16b",
          "56cef951-28f5-4b11-85f5-7624adc15862",
          "0908279c-a369-4684-92ac-8a9f5af1407f",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "bc9adf5e-e09f-4eed-9391-16aab9e3957a",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "6780420a-3574-4a0f-97d4-5ce43e7ac21e",
          "1d09fb43-4ca8-4c4c-940f-8ac1bbb43a13",
          "f45fa968-4bfe-4025-a74c-8f14f241bb43"
        ],
        "tools_by_id_count": 15,
        "allowed_tool_count": 15,
        "allowed_tool_names": [
          "cafe24:read_shipping",
          "cafe24:read_order_settings",
          "cafe24:create_ticket",
          "cafe24:lookup_order",
          "cafe24:track_shipment",
          "cafe24:read_product",
          "cafe24:read_supply",
          "cafe24:update_order_settings",
          "juso:search_address",
          "cafe24:api_get_customers_member_id_autoupdate_0d586802",
          "solapi:send_otp",
          "solapi:verify_otp",
          "cafe24:list_orders",
          "cafe24:update_order_shipping_address",
          "cafe24:resolve_product"
        ],
        "provider_selections": [],
        "resolved_tool_count": 15,
        "requested_tool_count": 15,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- dac3ef5a-c226-4ae7-a108-37cd7e596335 cafe24:update_order_shipping_address@1.0: success (2026-02-21T04:01:39.553+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  request:
    {
      "path": "/orders/{order_id}/receivers",
      "method": "PUT",
      "zipcode": "08793",
      "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
      "address2": "440호",
      "order_id": "20260127-0000014",
      "cellphone": "01093107159",
      "required_scope": "mall.write_order",
      "customer_verification_token": "4360a831-315b-4f37-baf3-8012af749215"
    }
  response:
    {
      "receivers": [
        {
          "name": "mejai",
          "phone": "",
          "city_en": "",
          "name_en": "",
          "shop_no": 1,
          "zipcode": "08793",
          "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
          "address2": "440호",
          "state_en": "",
          "cellphone": "01093107159",
          "street_en": "",
          "address_city": "",
          "address_full": "서울특별시 관악구 인헌2길 8-3 (봉천동) 440호",
          "country_code": "",
          "country_name": "",
          "address_state": "",
          "name_furigana": "",
          "shipping_code": "D-20260127-0000014-00",
          "address_street": "",
          "country_name_en": "",
          "shipping_message": "",
          "virtual_phone_no": null,
          "wished_delivery_date": null,
          "wished_delivery_time": {
            "end_hour": null,
            "start_hour": null
          },
          "clearance_information": null,
          "use_fast_delivery_date": null,
          "use_fast_delivery_time": null,
          "clearance_information_type": null,
          "change_default_shipping_address": "F"
        }
      ]
    }
- a99e3118-e634-4eaf-9886-265840c5e5f7 cafe24:lookup_order@1.0: success (2026-02-21T04:01:37.789+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  request:
    {
      "path": "/orders/{order_id}",
      "method": "GET",
      "order_id": "20260127-0000014",
      "required_scope": "mall.read_order",
      "customer_verification_token": "4360a831-315b-4f37-baf3-8012af749215"
    }
  response:
    {
      "order": {
        "paid": "T",
        "buyer": {
          "name": "mejai",
          "email": "ydsjy05@naver.com",
          "phone": "",
          "shop_no": 1,
          "user_id": null,
          "cellphone": "010-9310-7159",
          "member_id": "mejai",
          "user_name": null,
          "company_name": null,
          "updated_date": null,
          "buyer_zipcode": "08813",
          "buyer_address1": "서울 관악구 신림동 1515-7 ",
          "buyer_address2": "203",
          "names_furigana": "",
          "member_group_no": 1,
          "customer_notification": null,
          "company_registration_no": null
        },
        "items": [
          {
            "gift": "F",
            "labels": null,
            "hs_code": "",
            "item_no": 2,
            "options": [],
            "shop_no": 1,
            "quantity": 1,
            "tax_rate": 10,
            "option_id": "000A",
            "claim_code": null,
            "product_no": 20,
            "cancel_date": null,
            "option_type": null,
            "refund_date": null,
            "status_code": "N1",
            "status_text": "배송준비중",
            "supplier_id": "S0000000",
            "tracking_no": null,
            "volume_size": null,
            "claim_reason": null,
            "cloth_fabric": null,
            "made_in_code": "KR",
            "option_price": "0.00",
            "option_value": "",
            "order_status": "N20",
            "ordered_date": "2026-02-02T16:03:12+09:00",
            "origin_place": "국내 ",
            "product_code": "P000000U",
            "product_name": "아드헬린 린넨 플레어 원피스 그레이",
            "shipped_date": null,
            "store_pickup": "F",
            "subscription": "F",
            "supply_price": "1000.00",
            "variant_code": "P000000U000A",
            "exchange_date": null,
            "multi_invoice": null,
            "product_price": "1000.00",
            "shipping_code": "D-20260127-0000014-00",
            "supplier_name": "자체공급",
            "claim_quantity": 0,
            "delivered_date": null,
            "market_item_no": null,
            "payment_amount": null,
            "product_bundle": "F",
            "product_weight": "1.00",
            "request_undone": null,
            "order_item_code": "20260127-0000014-01",
            "origin_place_no": 1798,
            "payment_info_id": "0",
            "eng_product_name": "",
            "one_plus_n_event": null,
            "original_item_no": [],
            "product_material": "",
            "product_tax_type": "A",
            "refund_bank_name": "",
            "claim_reason_type": null,
            "post_express_flag": null,
            "product_bundle_no": "0",
            "shipping_fee_type": "X",
            "clearance_category": null,
            "item_granting_gift": null,
            "market_fail_reason": null,
            "naver_pay_order_id": null,
            "open_market_status": "",
            "origin_place_value": "",
            "volume_size_weight": null,
            "was_product_bundle": null,
            "cancel_request_date": null,
            "custom_product_code": "",
            "custom_variant_code": null,
            "product_bundle_list": null,
            "product_bundle_name": null,
            "product_bundle_type": null,
            "return_request_date": null,
            "shipping_company_id": "2",
            "option_value_default": "",
            "product_material_eng": null,
            "product_name_default": "아드헬린 린넨 플레어 원피스 그레이",
            "bundled_shipping_type": "N",
            "coupon_discount_price": "0.00",
            "exchange_request_date": null,
            "internal_product_name": "",
            "market_cancel_request": null,
            "return_collected_date": null,
            "return_confirmed_date": null,
            "shipping_company_code": "0001",
            "shipping_company_name": "자체배송",
            "supplier_product_name": "",
            "market_discount_amount": "0.00",
            "naver_pay_claim_status": null,
            "order_status_before_cs": null,
            "refund_bank_account_no": "",
            "shipping_expected_date": null,
            "shipping_fee_type_text": "기본배송",
            "additional_option_value": "",
            "clearance_category_code": null,
            "clearance_category_info": null,
            "individual_shipping_fee": "0.00",
            "market_fail_reason_type": null,
            "original_bundle_item_no": null,
            "shipping_payment_option": "P",
            "additional_option_values": [
              {
                "key": null,
                "name": null,
                "type": null,
                "value": null
              }
            ],
            "app_item_discount_amount": null,
            "market_fail_reason_guide": null,
            "additional_discount_price": "0.00",
            "purchaseconfirmation_date": null,
            "supplier_transaction_type": " ",
            "market_custom_variant_code": null,
            "refund_bank_account_holder": "",
            "product_bundle_name_default": null,
            "order_status_additional_info": "",
            "market_cancel_request_quantity": null
          }
        ],
        "return": [],
        "postpay": "F",
        "shop_no": 1,
        "canceled": "F",
        "currency": "KRW",
        "order_id": "20260127-0000014",
        "bank_code": "bank_13",
        "market_id": "self",
        "member_id": "mejai",
        "receivers": [
          {
            "name": "mejai",
            "phone": "",
            "city_en": null,
            "name_en": "",
            "shop_no": 1,
            "zipcode": "59625",
            "address1": "전라남도 여수시 상암로 8 (둔덕동)",
            "address2": "112동 201호",
            "state_en": null,
            "cellphone": "01093107159",
            "street_en": null,
            "address_city": "",
            "address_full": "전라남도 여수시 상암로 8 (둔덕동) 112동 201호",
            "country_code": null,
            "country_name": null,
            "address_state": "",
            "name_furigana": "",
            "shipping_code": "D-20260127-0000014-00",
            "address_street": "",
            "country_name_en": null,
            "shipping_message": "",
            "virtual_phone_no": null,
            "wished_delivery_date": "",
            "wished_delivery_time": null,
            "clearance_information": null,
            "clearance_information_type": null
          }
        ],
        "commission": "0.00",
        "order_date": "2026-01-27T01:49:00+09:00",
        "tax_detail": null,
        "use_escrow": "F",
        "cancel_date": null,
        "first_order": "T",
        "include_tax": "T",
        "loan_status": null,
        "naver_point": null,
        "social_name": null,
        "billing_name": "성지용",
        "easypay_name": "",
        "payment_date": "2026-02-02T16:03:12+09:00",
        "service_data": null,
        "service_type": null,
        "store_pickup": "F",
        "subscription": "F",
        "exchange_rate": "1.0000",
        "shipping_type": "A",
        "bank_code_name": "농협",
        "order_place_id": "self",
        "payment_amount": "3500.00",
        "payment_method": [
          "cash"
        ],
        "bank_account_no": "3020654717291",
        "market_order_no": null,
        "shipping_status": "F",
        "transaction_ids": null,
        "market_seller_id": null,
        "order_place_name": "PC쇼핑몰",
        "order_from_mobile": "F",
        "wished_carrier_id": null,
        "multiple_addresses": "F",
        "shipping_type_text": "국내배송",
        "social_member_code": null,
        "total_supply_price": "1000",
        "actual_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_method_name": [
          "무통장입금"
        ],
        "shipping_fee_detail": [
          {
            "items": [
              "20260127-0000014-01"
            ],
            "shipping_fee": "2500.00",
            "supplier_code": "S0000000",
            "cancel_shipping_fee": "0.00",
            "return_shipping_fee": "0.00",
            "shipping_group_code": 5,
            "refunded_shipping_fee": "0.00",
            "additional_shipping_fee": "0.00"
          }
        ],
        "wished_carrier_name": null,
        "initial_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_confirmation": null,
        "wished_delivery_date": "",
        "wished_delivery_time": null,
        "first_payment_methods": [
          "cash"
        ],
        "member_authentication": "T",
        "payment_gateway_names": null,
        "return_confirmed_date": null,
        "show_shipping_address": "T",
        "additional_handling_fee": "0.00",
        "additional_shipping_fee": "0.00",
        "admin_additional_amount": null,
        "bank_account_owner_name": "성지용",
        "sub_payment_method_code": null,
        "sub_payment_method_name": null,
        "regional_surcharge_detail": [],
        "additional_order_info_list": [],
        "naverpay_payment_information": null,
        "customer_group_no_when_ordering": "1",
        "international_shipping_insurance": "0.00"
      }
    }
이벤트 로그:
- 58c4413a-3819-439f-9aba-bc266b7856ff FINAL_ANSWER_READY (2026-02-21T04:01:52.893+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "model": "deterministic_order_change_success",
      "answer": "확인한 것: 주소 서울특별시 관악구 인헌2길 8-3 (봉천동) (08793)\n확인할 것: 배송지 변경이 완료되었습니다.\n주문번호 20260127-0000014의 배송지가 업데이트되었습니다.\n변경 전: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호\n변경 후: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호\n추가로 변경할 내용이 있으면 알려주세요.\n그 다음으로 확인할 것: 배송지 변경 적용",
      "_decision": {
        "line": 248,
        "phase": "after",
        "column": 0,
        "call_chain": [
          {
            "line": 248,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
            "function_name": "emit:FINAL_ANSWER_READY"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
        "recorded_at": "2026-02-21T04:01:52.893Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "change_audit": {
        "diff": {
          "applied_changed_from_before": true,
          "request_changed_from_before": true,
          "applied_differs_from_request": false
        },
        "tool": "cafe24:update_order_shipping_address",
        "after": {
          "zipcode": "08793",
          "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
          "address2": "440호",
          "rendered": "(08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호",
          "address_full": "서울특별시 관악구 인헌2길 8-3 (봉천동) 440호"
        },
        "before": {
          "zipcode": "59625",
          "address1": "전라남도 여수시 상암로 8 (둔덕동)",
          "address2": "112동 201호",
          "rendered": "(59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호",
          "address_full": "전라남도 여수시 상암로 8 (둔덕동) 112동 201호"
        },
        "request": {
          "zipcode": "08793",
          "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
          "address2": "440호",
          "rendered": "(08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호"
        }
      },
      "debug_answer": "요약: 배송지 변경이 완료되었습니다.\n근거: 주문 정보 변경 정책에 따라 처리했습니다.\n상세: 주문번호 20260127-0000014의 배송지를 변경했습니다.\n- 변경 전: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호\n- 요청: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호\n- 적용: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 440호\n다음 액션: 추가 변경 사항이 있으면 알려주세요."
    }
- 6d3467b0-8eb5-4b61-a091-6fb1629d7abc CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T04:01:52.639+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "keys": [
        "order_id",
        "resolved_road_address",
        "resolved_jibun_address",
        "shipping_before_zipcode",
        "shipping_before_address1",
        "shipping_before_address2",
        "shipping_before_address_full",
        "shipping_request_zipcode",
        "shipping_request_address1",
        "shipping_request_address2",
        "original_entity_before_last_tool"
      ],
      "delta": {
        "order_id": "20260127-0000014",
        "resolved_road_address": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
        "resolved_jibun_address": "서울특별시 관악구 봉천동 1656-21",
        "shipping_before_zipcode": "59625",
        "shipping_before_address1": "전라남도 여수시 상암로 8 (둔덕동)",
        "shipping_before_address2": "112동 201호",
        "shipping_request_zipcode": "08793",
        "shipping_request_address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
        "shipping_request_address2": "440호",
        "shipping_before_address_full": "전라남도 여수시 상암로 8 (둔덕동) 112동 201호",
        "original_entity_before_last_tool": "update_order_shipping_address"
      },
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:52.639Z",
        "function_name": "unknown"
      },
      "key_count": 11
    }
- f05c01d7-73db-4373-8c9c-80f667910149 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T04:01:52.374+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- cc80501b-e9d9-4107-a374-f5ece08956b5 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T04:01:51.114+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5",
      "session_id": "7f78de77-0a41-459e-b887-6ccbe3ddec0c",
      "config_source": "principles_default"
    }
- 62643a68-4f29-4b0a-a308-44550fece9f9 END_USER_WRITE_LATENCY (2026-02-21T04:01:50.057+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "duration_ms": 9683
    }
- 34350461-3831-4512-8328-0afdc6d1b83a END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T04:01:49.791+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "keys": [
        "order_id",
        "resolved_road_address",
        "resolved_jibun_address",
        "shipping_before_zipcode",
        "shipping_before_address1",
        "shipping_before_address2",
        "shipping_request_zipcode",
        "shipping_request_address1",
        "shipping_request_address2",
        "shipping_before_address_full",
        "original_entity_before_last_tool"
      ],
      "flow_id": "943c4470-a2c5-457d-ad56-81a1a62e4a75",
      "key_count": 11,
      "keys_truncated": false
    }
- 365a353a-1e8f-4df1-abd8-c7aa2af8f070 END_USER_CONTEXT_RESOLVED (2026-02-21T04:01:41.418+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "match_hit": true,
      "end_user_id": "a7fbcce5-f82a-4165-b95e-9d9e2f5c6f06",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": true,
      "runtime_end_user": {
        "id": "fa7baaa2-806f-4457-88f0-7d29f802d126",
        "source": "auth_user",
        "email_masked": "su********@gmail.com",
        "external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
      },
      "resolution_source": "session",
      "runtime_email_masked": "su********@gmail.com",
      "runtime_external_user_id": "fa7baaa2-806f-4457-88f0-7d29f802d126"
    }
- 361229ea-764d-4a60-9085-2bd49269097a END_USER_MATCH_HIT (2026-02-21T04:01:41.155+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "matched": true,
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ]
    }
- f0c7f6e3-1e98-483a-8e98-506517e25a63 PRE_MCP_DECISION (2026-02-21T04:01:36.041+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": "20260127-0000014",
        "has_address": true,
        "phone_masked": "*******7159"
      },
      "intent": "order_change",
      "allowed": [
        "update_order_shipping_address",
        "list_orders",
        "lookup_order",
        "search_address",
        "send_otp",
        "verify_otp"
      ],
      "_decision": {
        "line": 657,
        "phase": "before",
        "column": 0,
        "call_chain": [
          {
            "line": 657,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
            "function_name": "emit:PRE_MCP_DECISION"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
        "recorded_at": "2026-02-21T04:01:36.041Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "네",
      "final_calls": [
        {
          "args": {
            "zipcode": "08793",
            "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
            "address2": "440호",
            "order_id": "20260127-0000014",
            "cellphone": "01093107159",
            "customer_verification_token": "4360a831-315b-4f37-baf3-8012af749215"
          },
          "name": "update_order_shipping_address"
        }
      ],
      "forced_calls": [
        {
          "args": {
            "zipcode": "08793",
            "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
            "address2": "440호",
            "order_id": "20260127-0000014",
            "cellphone": "01093107159",
            "customer_verification_token": "4360a831-315b-4f37-baf3-8012af749215"
          },
          "name": "update_order_shipping_address"
        }
      ],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "allowed_tool_names": [
        "cafe24:update_order_shipping_address"
      ],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 15
    }
- 4dbe27ef-22b4-4539-8e83-336651f3aa7f INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T04:01:35.499+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:35.499Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 0b3d734a-54b1-4a2c-b97b-20c8f7d18390 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T04:01:35.237+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T04:01:35.237Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "confirm"
    }
- b30ba802-c47a-4c8e-9f14-419da4467795 SLOT_EXTRACTED (2026-02-21T04:01:34.976+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "derived": {
        "phone": null,
        "address": "서울시 관악구 봉천동 1656-21 440호",
        "zipcode": "08793",
        "order_id": null,
        "phone_masked": "-"
      },
      "resolved": {
        "phone": "01093107159",
        "intent": "order_change",
        "address": "서울시 관악구 봉천동 1656-21 440호",
        "zipcode": "08793",
        "order_id": "20260127-0000014",
        "phone_masked": "*******7159"
      },
      "_decision": {
        "line": 145,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 145,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
            "function_name": "emit:SLOT_EXTRACTED"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "recorded_at": "2026-02-21T04:01:34.976Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "confirm",
      "resolved_slots": {}
    }
- 004ec9a3-eee9-4967-b7df-4a26b1e294a7 POLICY_STATIC_CONFLICT (2026-02-21T04:01:34.721+00:00) (turn_id=0efe6e7f-e9cc-4f2c-a43c-8d8ab106ddd5)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-21T04:01:34.721Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }