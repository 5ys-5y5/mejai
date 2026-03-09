

SESSION_ID: 5d786ea9-565f-4b6c-b4ba-579759d54ae1
PAGE: /app/laboratory
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): POLICY_DECISION, CONFIRMED_ENTITY_DELTA_APPLIED, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONFIRMED_ENTITY_SAVED, END_USER_CONTEXT_RESOLVED, PRE_MCP_DECISION, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED
기대 목록(Debug): NO_TOOL_CALLED

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.POLICY_DECISION, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONFIRMED_ENTITY_SAVED, event.END_USER_CONTEXT_RESOLVED, event.PRE_MCP_DECISION, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, debug.NO_TOOL_CALLED, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: 95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1

[TOKEN_USED]

USER:
코팽 재입고

BOT:
확인한 것: 코팽 재입고
확인할 것: 확인할 상품명을 먼저 알려주세요. (예: 아드헬린 린넨 플레어 원피스)
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 코팽 재입고\n확인할 것: 확인할 상품명을 먼저 알려주세요. (예: 아드헬린 린넨 플레어 원피스)\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
- 38e2f8f1-a6ab-4170-99bd-1b952256fcc7 (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1) (2026-03-09T06:31:37.362+00:00)
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
        "runtime_started_at": "2026-03-09T06:31:34.615Z"
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
        "recorded_at": "2026-03-09T06:31:37.197Z",
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
- 897f0580-8e5e-4993-8d19-d813fb73886f POLICY_DECISION (2026-03-09T06:31:40.987+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
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
        "recorded_at": "2026-03-09T06:31:40.987Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- ff756fb4-f647-4737-a420-207c409dc433 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T06:31:40.82+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "keys": [
        "channel"
      ],
      "delta": {
        "channel": "sms"
      },
      "flow_id": "0075081e-f2db-46d4-bfb0-7fda2065c89e",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:31:40.820Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 0dd83d30-731f-4ee5-818b-613daf1ebe97 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T06:31:40.66+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1",
      "session_id": "5d786ea9-565f-4b6c-b4ba-579759d54ae1",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- fffc0e60-6ccd-47b1-8867-84c25b7d19d9 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T06:31:40.281+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1",
      "session_id": "5d786ea9-565f-4b6c-b4ba-579759d54ae1",
      "config_source": "principles_default"
    }
- 7854d6b0-8a7d-4ba9-b412-5693c51a78a7 END_USER_WRITE_LATENCY (2026-03-09T06:31:39.63+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "duration_ms": 2095
    }
- a199126c-479f-4d2e-b003-1cbd722730fb END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T06:31:39.47+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "keys": [
        "channel"
      ],
      "flow_id": "0075081e-f2db-46d4-bfb0-7fda2065c89e",
      "key_count": 1,
      "keys_truncated": false
    }
- 9e5d03e3-b148-42d7-9dc8-23347f3dc8cb END_USER_CONTEXT_RESOLVED (2026-03-09T06:31:38.019+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "match_hit": false,
      "end_user_id": "2a79815e-6d9a-43bc-a1a1-0083561809e0",
      "identity_count": 0,
      "identity_types": [],
      "match_attempted": false,
      "resolution_source": "created"
    }
- 4e4ae5a9-02ac-463a-af16-17fbabd8ff2d PRE_MCP_DECISION (2026-03-09T06:31:36.997+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
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
        "recorded_at": "2026-03-09T06:31:36.997Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "코팽 재입고",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "코팽 재입고"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false
    }
- 1ac65926-1f5d-4242-aacf-46f2d8d6735e INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T06:31:36.66+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:31:36.660Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "코팽 재입고"
      }
    }
- 86f3b0a9-6565-4ecd-8778-aca7fefa29e5 POLICY_DECISION (2026-03-09T06:31:36.497+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
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
        "recorded_at": "2026-03-09T06:31:36.497Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "코팽 재입고"
      }
    }
- d65a5b0e-044d-4f0a-a0fd-735d78179563 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T06:31:36.339+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:31:36.339Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 1efb389e-18b2-410f-9f5f-485247c3b0f5 SLOT_EXTRACTED (2026-03-09T06:31:36.158+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
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
        "recorded_at": "2026-03-09T06:31:36.158Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "코팽 재입고"
      }
    }
- 6f4cdb18-132f-4ca0-a360-3b99ec182406 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T06:31:35.978+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:31:35.978Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- b91137fc-c989-4995-b155-5c1de70eeae8 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T06:31:35.818+00:00) (turn_id=95d07c1d-ddd6-4a20-a42b-e745f8f0f4a1)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:31:35.818Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
