

SESSION_ID: acc9337a-77f2-49b8-9b83-3eb41b68bc02
PAGE: /embed
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): FINAL_ANSWER_READY, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONTEXT_RESOLVED, RESTOCK_MATCH_FAILED, PRE_MCP_DECISION, INTENT_SCOPE_GATE_REVIEW_COMPLETED, POLICY_DECISION, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED
기대 목록(Debug): read_product

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.FINAL_ANSWER_READY, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONTEXT_RESOLVED, event.RESTOCK_MATCH_FAILED, event.PRE_MCP_DECISION, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.POLICY_DECISION, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, debug.read_product, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: 78751aa1-b787-4b10-b1ee-81051c8d1169

[TOKEN_USED]

USER:
원피스 재입고

BOT:
요약: 문의하신 원피스의 재입고 일정은 상품명에 따라 다를 수 있습니다. 원하시는 원피스의 정확한 상품명을 알려주시면 재입고 일정을 확인해드릴 수 있습니다. 예시) 아드헬린 린넨 플레어 원피스, 아드헬린 린넨 롱 원피스 등. 상품명을 알려주세요!
근거: KB 및 정책에 따라 처리했습니다.
상세: 문의하신 원피스의 재입고 일정은 상품명에 따라 다를 수 있습니다. 원하시는 원피스의 정확한 상품명을 알려주시면 재입고 일정을 확인해드릴 수 있습니다. 예시) 아드헬린 린넨 플레어 원피스, 아드헬린 린넨 롱 원피스 등. 상품명을 알려주세요!
다음 액션: 추가 요청이 있으면 알려주세요.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 원피스 재입고\n확인할 것: 문의하신 원피스의 재입고 일정은 상품명에 따라 다를 수 있습니다. 원하시는 원피스의 정확한 상품명을 알려주시면 재입고 일정을 확인해드릴 수 있습니다. 예시) 아드헬린 린넨 플레어 원피스, 아드헬린 린넨 롱 원피스 등. 상품명을 알려주세요!\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
- f56b104a-8562-4d24-a499-f3687f794ca0 (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169) (2026-03-06T01:01:52.59+00:00)
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
      "llm": {
        "model": "gpt-4.1"
      },
      "mcp": {
        "last": {
          "error": null,
          "status": "success",
          "function": "read_product",
          "result_count": 1
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
        "node": "v24.11.0",
        "commit": null,
        "build_at": null,
        "build_id": null,
        "deploy_env": "development",
        "runtime_started_at": "2026-03-06T01:01:18.952Z"
      },
      "policy": {
        "tool_rules": [
          "R220_restock_allow_read"
        ],
        "input_rules": [
          "R110_intent_restock_inquiry"
        ]
      },
      "widget": {
        "id": "4512b9a6-edaf-40de-9f9a-2f27e68bd76b",
        "name": "New Widget Template",
        "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
        "agent_id": "339f6e47-4239-49ee-9972-a7069038fe08",
        "public_key": "mw_pk_8a1fc24824c738f344187e58a9042276",
        "allowed_domains": [
          "https://sungjy2020.cafe24.com/",
          "https://mejai.cafe24.com/"
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
        "recorded_at": "2026-03-06T01:01:52.205Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R110_intent_restock_inquiry",
          "R220_restock_allow_read"
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
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
            "function_name": "handleGeneralNoPathGuard"
          },
          {
            "module_path": "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
            "function_name": "runFinalResponseFlow"
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_source": "reset_by_restock_intent"
      },
      "templates": {
        "override_count": 1,
        "overrides_applied": {
          "order_choice_title": "주문번호를 모르셔도 됩니다. 아래 주문(주문일시/상품명/옵션/금액) 중 해당 주문의 번호를 선택해 주세요."
        }
      },
      "request_meta": {
        "widget_org_id_present": true,
        "widget_secret_present": true,
        "widget_user_id_present": false,
        "widget_agent_id_present": true
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
        "input_length": 7,
        "length_rule_hit": false,
        "keyword_rule_hit": true,
        "selection_reason": "keyword_rule"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 3219981c-000b-4348-9787-ebef148644d5 FINAL_ANSWER_READY (2026-03-06T01:01:57.638+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "model": "gpt-4.1",
      "answer": "확인한 것: 원피스 재입고\n확인할 것: 문의하신 원피스의 재입고 일정은 상품명에 따라 다를 수 있습니다. 원하시는 원피스의 정확한 상품명을 알려주시면 재입고 일정을 확인해드릴 수 있습니다. 예시) 아드헬린 린넨 플레어 원피스, 아드헬린 린넨 롱 원피스 등. 상품명을 알려주세요!\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-03-06T01:01:57.637Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "debug_answer": "요약: 문의하신 원피스의 재입고 일정은 상품명에 따라 다를 수 있습니다. 원하시는 원피스의 정확한 상품명을 알려주시면 재입고 일정을 확인해드릴 수 있습니다. 예시) 아드헬린 린넨 플레어 원피스, 아드헬린 린넨 롱 원피스 등. 상품명을 알려주세요!\n근거: KB 및 정책에 따라 처리했습니다.\n상세: 문의하신 원피스의 재입고 일정은 상품명에 따라 다를 수 있습니다. 원하시는 원피스의 정확한 상품명을 알려주시면 재입고 일정을 확인해드릴 수 있습니다. 예시) 아드헬린 린넨 플레어 원피스, 아드헬린 린넨 롱 원피스 등. 상품명을 알려주세요!\n다음 액션: 추가 요청이 있으면 알려주세요.",
      "quick_reply_config": null
    }
- 3f1f1dac-eba3-4f65-872b-cffef0336ea4 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-06T01:01:57.442+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "78751aa1-b787-4b10-b1ee-81051c8d1169",
      "session_id": "acc9337a-77f2-49b8-9b83-3eb41b68bc02",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- a78587aa-7a65-4fa6-8c05-356df54714c9 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-06T01:01:56.866+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "78751aa1-b787-4b10-b1ee-81051c8d1169",
      "session_id": "acc9337a-77f2-49b8-9b83-3eb41b68bc02",
      "config_source": "principles_default"
    }
- aab9df00-7cf2-4ef1-b51d-a9c3ae786e70 END_USER_WRITE_LATENCY (2026-03-06T01:01:55.854+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "duration_ms": 3033
    }
- 96f07fcf-2657-4fc4-a7aa-bcbe45c09e98 END_USER_CONTEXT_RESOLVED (2026-03-06T01:01:53.703+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "match_hit": false,
      "end_user_id": "a64146cb-1c01-4ff9-9850-0429ebe66d9e",
      "identity_count": 0,
      "identity_types": [],
      "match_attempted": false,
      "resolution_source": "created"
    }
- 356e7ba5-27e1-43c6-bde7-298cc7f60392 RESTOCK_MATCH_FAILED (2026-03-06T01:01:46.732+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "intent": "restock_inquiry",
      "reason": "RESTOCK_INQUIRY_FALLTHROUGH",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-06T01:01:46.732Z",
        "function_name": "unknown"
      },
      "product_id": "20",
      "query_text": "원피스 재입고",
      "ranked_count": 2,
      "kb_entry_count": 2,
      "restock_channel": "sms",
      "schedule_raw_date": "03/21",
      "pending_product_id": null,
      "kb_match_from_query": true,
      "pending_product_name": null,
      "schedule_entry_found": true,
      "broad_candidate_count": 1,
      "lock_intent_to_subscribe": false,
      "ranked_schedulable_count": 1,
      "restock_subscribe_accepted": false
    }
- a7251635-aea5-4d28-9e59-8e12d4cb65ee PRE_MCP_DECISION (2026-03-06T01:01:44.203+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "-"
      },
      "intent": "restock_inquiry",
      "allowed": [
        "resolve_product",
        "read_product",
        "read_supply"
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
        "recorded_at": "2026-03-06T01:01:44.203Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "원피스 재입고",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "원피스 재입고"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 15
    }
- b7a73b8a-71c4-49af-af87-7bf9b314afa7 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-06T01:01:43.552+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-06T01:01:43.551Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고"
      }
    }
- 84d993be-eddf-4031-9dc4-3105624dde2f POLICY_DECISION (2026-03-06T01:01:43.241+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
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
        "recorded_at": "2026-03-06T01:01:43.241Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고"
      }
    }
- 7c3ec0a2-c6c5-425a-8d3b-96730b5b247f INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-06T01:01:42.922+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-06T01:01:42.922Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 3b2a2557-0258-4b8f-909b-ee062356006a SLOT_EXTRACTED (2026-03-06T01:01:42.644+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
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
        "recorded_at": "2026-03-06T01:01:42.643Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "원피스 재입고"
      }
    }
- 71a9fbcd-dd3b-4329-b882-2de19b558587 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-06T01:01:42.433+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-06T01:01:42.433Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 0a44858d-5a1d-47a9-a925-ecd3b4b938e2 INPUT_CONTRACT_REVIEW_STARTED (2026-03-06T01:01:42.238+00:00) (turn_id=78751aa1-b787-4b10-b1ee-81051c8d1169)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-06T01:01:42.238Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
