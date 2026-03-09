

SESSION_ID: 69251f66-3a19-43fa-8e62-581441ce8f1d
PAGE: /app/laboratory
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): INTENT_SCOPE_GATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONTEXT_RESOLVED, PRE_MCP_DECISION, POLICY_DECISION, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED, CONFIRMED_ENTITY_DELTA_APPLIED, END_USER_CONFIRMED_ENTITY_SAVED
기대 목록(Debug): NO_TOOL_CALLED

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONTEXT_RESOLVED, event.PRE_MCP_DECISION, event.POLICY_DECISION, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.END_USER_CONFIRMED_ENTITY_SAVED, debug.NO_TOOL_CALLED, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: 906847d0-ab23-4803-a841-3b88ffd3fe63

[TOKEN_USED]

USER:
재입고

BOT:
확인한 것: 재입고
확인할 것: 재입고를 확인할 상품명을 알려주세요. (예: 상품명 또는 모델명)
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 재입고\n확인할 것: 재입고를 확인할 상품명을 알려주세요. (예: 상품명 또는 모델명)\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
- f1f9db5a-91bd-40e2-a2c7-e34438760056 (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63) (2026-03-09T05:35:20.205+00:00)
  prefix_json:
    {
      "kb": {
        "primary": {
          "id": "__LAB_NO_KB__",
          "title": "KB 미선택",
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
          "shopify"
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
        "llm": "gemini",
        "name": "Labolatory"
      },
      "build": {
        "ref": null,
        "tag": "debug-prefix-v3",
        "node": "v24.11.0",
        "commit": null,
        "build_at": null,
        "build_id": null,
        "deploy_env": "development",
        "runtime_started_at": "2026-03-09T05:35:17.707Z"
      },
      "widget": {
        "id": "eec4262a-7c86-4e0f-8106-9c1a2b98e3a8",
        "name": "login",
        "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
        "public_key": "mw_pk_d037ee0788f591456d9ee4f23f7dd44b",
        "allowed_paths": [
          "/a",
          "/b"
        ],
        "allowed_domains": [
          "alpha.com",
          "beta.com"
        ]
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
        "recorded_at": "2026-03-09T05:35:20.018Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "kb_user_id": "__LAB_NO_KB__"
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_source": "reset_by_restock_intent"
      },
      "request_meta": {
        "widget_org_id_present": true,
        "widget_secret_present": true,
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
          "override_not_selected",
          "override_not_selected"
        ],
        "admin_kb_apply_groups_mode": [
          "any",
          "all"
        ]
      },
      "resolved_agent": {
        "is_active": null,
        "mcp_tool_ids": [],
        "resolved_from_parent": false
      },
      "schema_version": 3,
      "tool_allowlist": {
        "valid_tool_count": 0,
        "resolved_tool_ids": [],
        "tools_by_id_count": 0,
        "allowed_tool_count": 0,
        "allowed_tool_names": [],
        "provider_selections": [],
        "resolved_tool_count": 0,
        "requested_tool_count": 0,
        "tools_by_provider_count": 0,
        "provider_selection_count": 0,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 3,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- b869da8b-2e10-4691-ab86-9fe3a513de48 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T05:35:24.071+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": true,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T05:35:24.071Z",
        "function_name": "unknown"
      },
      "missing_slots": [
        "product_query"
      ],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": null
      }
    }
- 4738750b-7ef4-4a0e-b440-d06fa4139eaf RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T05:35:23.904+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "906847d0-ab23-4803-a841-3b88ffd3fe63",
      "session_id": "69251f66-3a19-43fa-8e62-581441ce8f1d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- e52b6fc5-0573-452d-a2b1-9d4974cb216e RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T05:35:23.495+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "906847d0-ab23-4803-a841-3b88ffd3fe63",
      "session_id": "69251f66-3a19-43fa-8e62-581441ce8f1d",
      "config_source": "principles_default"
    }
- 9ce35e96-db99-43d0-a48a-e50767a1ef2a END_USER_WRITE_LATENCY (2026-03-09T05:35:22.167+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "duration_ms": 1764
    }
- 4243bde1-b62c-4dde-8d20-685c5030a9d8 END_USER_CONTEXT_RESOLVED (2026-03-09T05:35:20.911+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "match_hit": false,
      "end_user_id": "27f91548-cc00-4025-adb9-aa5770ad2f04",
      "identity_count": 0,
      "identity_types": [],
      "match_attempted": false,
      "resolution_source": "created"
    }
- 8cfb3126-7768-47d0-9958-2eff306de582 PRE_MCP_DECISION (2026-03-09T05:35:19.828+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "-"
      },
      "intent": "restock_inquiry",
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
        "recorded_at": "2026-03-09T05:35:19.828Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "재입고",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": null
      },
      "blocked_by_missing_slots": true
    }
- 4c71b2a2-15c8-406a-be65-6cdbf10e6a96 POLICY_DECISION (2026-03-09T05:35:19.659+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "stage": "input",
      "action": "ASK_SCOPE_SLOT",
      "intent": "restock_inquiry",
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
        "recorded_at": "2026-03-09T05:35:19.659Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "ask_action": "ASK_PRODUCT_NAME_FOR_RESTOCK",
      "missing_slots": [
        "product_query"
      ],
      "expected_input": "product_query",
      "prompt_template_key": "restock_need_product"
    }
- 96006ca5-17b6-4c28-85d8-6d4666831419 POLICY_DECISION (2026-03-09T05:35:19.493+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "stage": "input",
      "action": "INTENT_SCOPE_GATE_BLOCKED",
      "intent": "restock_inquiry",
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
        "recorded_at": "2026-03-09T05:35:19.493Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "missing_slots": [
        "product_query"
      ],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": null
      }
    }
- d16f6535-aac0-43be-8d30-41a70236803a INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T05:35:19.322+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T05:35:19.322Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 783ced34-d1dc-434c-88f5-bfd8b4ee72c2 SLOT_EXTRACTED (2026-03-09T05:35:19.15+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
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
        "phone": null,
        "intent": "restock_inquiry",
        "address": null,
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
        "recorded_at": "2026-03-09T05:35:19.150Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [
        "product_query"
      ],
      "expected_input": null,
      "resolved_slots": {
        "product_query": null
      }
    }
- ff8a00c1-4d66-4862-a61f-70c30180ff0a INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T05:35:18.949+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T05:35:18.949Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 9bd9676d-807f-49d7-888e-e7bf3b7faa31 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T05:35:18.782+00:00) (turn_id=906847d0-ab23-4803-a841-3b88ffd3fe63)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T05:35:18.782Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: d5c31e3c-7ee9-42ae-b552-a317c062392b

[TOKEN_USED]

USER:
프릴

BOT:
확인한 것: 프릴
확인할 것: 확인할 상품명을 먼저 알려주세요. (예: 아드헬린 린넨 플레어 원피스)
그 다음으로 확인할 것: product query 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 프릴\n확인할 것: 확인할 상품명을 먼저 알려주세요. (예: 아드헬린 린넨 플레어 원피스)\n그 다음으로 확인할 것: product query 확인",
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
- 673f2392-ee06-4f61-9818-ba107ef9d1a6 (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b) (2026-03-09T05:35:32.55+00:00)
  prefix_json:
    {
      "slot": {
        "phone_masked": "-",
        "expected_input": "product_query"
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
        "recorded_at": "2026-03-09T05:35:32.375Z",
        "function_name": "insertTurnWithDebug"
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
            "module_path": "src/app/api/runtime/chat/runtime/intentCapabilityRuntime.ts",
            "function_name": "evaluateIntentCapabilityGate"
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
          },
          {
            "module_path": "src/app/api/runtime/chat/handlers/restockHandler.ts",
            "function_name": "handleRestockIntent"
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [
          "product_query"
        ],
        "expected_input_prev": "product_query",
        "expected_input_stage": "legacy.expected_input",
        "expected_input_source": "bot_context"
      },
      "model_resolution": {
        "input_length": 2,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 50da7875-354a-450c-baac-b957e52343f9 POLICY_DECISION (2026-03-09T05:35:36.37+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "stage": "tool",
      "action": "ASK_PRODUCT_NAME_FOR_RESTOCK",
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
        "recorded_at": "2026-03-09T05:35:36.370Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- efee216f-5f0e-4c46-a109-4b3e11bbdcd8 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T05:35:36.2+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "keys": [
        "channel"
      ],
      "delta": {
        "channel": "sms"
      },
      "flow_id": "e1ec7bf5-7b19-4ed5-9b87-95bc196becfd",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T05:35:36.200Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 99dfea63-a4c9-49bb-8d8d-deef58c435d8 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T05:35:36.022+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d5c31e3c-7ee9-42ae-b552-a317c062392b",
      "session_id": "69251f66-3a19-43fa-8e62-581441ce8f1d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- f3ae1f49-c5e9-4e5d-b980-9c007b05fb53 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T05:35:35.657+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d5c31e3c-7ee9-42ae-b552-a317c062392b",
      "session_id": "69251f66-3a19-43fa-8e62-581441ce8f1d",
      "config_source": "principles_default"
    }
- d6c231db-7e5d-4a7e-b4d2-9afe63b61b1d END_USER_WRITE_LATENCY (2026-03-09T05:35:34.969+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "duration_ms": 2233
    }
- 67c75566-d86c-44b1-a813-eecba8ffe670 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T05:35:34.786+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "keys": [
        "channel"
      ],
      "flow_id": "e1ec7bf5-7b19-4ed5-9b87-95bc196becfd",
      "key_count": 1,
      "keys_truncated": false
    }
- d2290a4b-6532-41f8-b669-2c563242558f END_USER_CONTEXT_RESOLVED (2026-03-09T05:35:33.089+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "match_hit": false,
      "end_user_id": "27f91548-cc00-4025-adb9-aa5770ad2f04",
      "identity_count": 0,
      "identity_types": [],
      "match_attempted": false,
      "resolution_source": "session"
    }
- 80e05de9-6b55-4b37-8c2e-f8d8dc5afa3d PRE_MCP_DECISION (2026-03-09T05:35:32.198+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "-"
      },
      "intent": "restock_inquiry",
      "allowed": [],
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
        "recorded_at": "2026-03-09T05:35:32.198Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "프릴",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "프릴"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false
    }
- a5d777c5-a6ae-46c4-8262-d2e13ce7b075 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T05:35:31.859+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T05:35:31.858Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "프릴"
      }
    }
- 99af8bbb-83b2-4847-91b9-65b2f730e46d POLICY_DECISION (2026-03-09T05:35:31.693+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "stage": "input",
      "action": "SCOPE_READY",
      "intent": "restock_inquiry",
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
        "recorded_at": "2026-03-09T05:35:31.692Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "프릴"
      }
    }
- 812bf0c3-07c9-43ce-814e-37d7489bd562 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T05:35:31.518+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T05:35:31.517Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "product_query"
    }
- b99cfa8a-df23-43e1-8bb5-b3233b3f7162 SLOT_EXTRACTED (2026-03-09T05:35:31.349+00:00) (turn_id=d5c31e3c-7ee9-42ae-b552-a317c062392b)
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
        "phone": null,
        "intent": "restock_inquiry",
        "address": null,
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
        "recorded_at": "2026-03-09T05:35:31.348Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "product_query",
      "resolved_slots": {
        "product_query": "프릴"
      }
    }
