

SESSION_ID: 031b209a-c4b7-42f9-b4bb-42e0fd8c7acf
PAGE: /
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): QUICK_REPLY_RULE_DECISION, FINAL_ANSWER_READY, POLICY_DECISION, CONFIRMED_ENTITY_DELTA_APPLIED, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONFIRMED_ENTITY_SAVED, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_HIT, PRE_MCP_DECISION, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED
기대 목록(Debug): NO_TOOL_CALLED

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.QUICK_REPLY_RULE_DECISION, event.FINAL_ANSWER_READY, event.POLICY_DECISION, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONFIRMED_ENTITY_SAVED, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_HIT, event.PRE_MCP_DECISION, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, debug.NO_TOOL_CALLED, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: b25f63c6-7bf0-420c-bece-0df6778764ae

[TOKEN_USED]

USER:
코팽 재입고

BOT:
확인한 것: 코팽 재입고
확인할 것: 요약: 코듀로이 코팽 입고 예정일 05/05입니다.
상세: 예정일 2026-05-05 (D-57)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 코팽 재입고\n확인할 것: 요약: 코듀로이 코팽 입고 예정일 05/05입니다.\n상세: 예정일 2026-05-05 (D-57)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "single"
    },
    "quick_replies": [
      {
        "label": "재입고 알림 신청",
        "value": "action:restock_subscribe"
      },
      {
        "label": "대화 종료",
        "value": "action:end_conversation"
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
- 1ad26ba6-ed43-4354-aa40-8ca9925d18d6 (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae) (2026-03-09T06:32:17.117+00:00)
  prefix_json:
    {
      "kb": {
        "primary": {
          "id": "__INLINE_KB__",
          "title": "사용자 KB",
          "version": "inline",
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
        "llm": "chatgpt",
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
        "recorded_at": "2026-03-09T06:32:16.946Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "kb_user_id": "__INLINE_KB__"
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
        "mcp_tool_ids": [
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c",
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "restock_lite",
          "solapi",
          "juso",
          "runtime"
        ],
        "resolved_from_parent": false
      },
      "schema_version": 3,
      "tool_allowlist": {
        "valid_tool_count": 3,
        "resolved_tool_ids": [
          "c962d4b0-d96a-45f6-a985-59b8b93534c0",
          "c78fe2ef-9925-45bf-8f14-2f5954dfb00c",
          "03b67d63-e22d-4820-b101-bf545df8e78c"
        ],
        "tools_by_id_count": 3,
        "allowed_tool_count": 3,
        "allowed_tool_names": [
          "juso:search_address",
          "solapi:send_otp",
          "solapi:verify_otp"
        ],
        "provider_selections": [
          "restock_lite",
          "solapi",
          "juso",
          "runtime"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 7,
        "tools_by_provider_count": 3,
        "provider_selection_count": 4,
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
- f9ef8a97-921f-4e1a-b560-5f4d0bb39892 QUICK_REPLY_RULE_DECISION (2026-03-09T06:32:22.27+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "restock:kb_schedule_followup_choice",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockIntent"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 7551dccc-b4b0-4a19-b5b9-188e43e5ce3d FINAL_ANSWER_READY (2026-03-09T06:32:22.107+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 코팽 재입고\n확인할 것: 요약: 코듀로이 코팽 입고 예정일 05/05입니다.\n상세: 예정일 2026-05-05 (D-57)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-09T06:32:22.107Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- e58c292a-99f6-4ea5-ac1f-86c37af22e9f POLICY_DECISION (2026-03-09T06:32:21.94+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "stage": "tool",
      "action": "RESTOCK_SCHEDULE_ANSWERED_BY_KB",
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
        "recorded_at": "2026-03-09T06:32:21.940Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "코듀로이 코팽"
    }
- 8ced1e1d-f232-4b63-ba83-bc14f39ea361 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T06:32:21.767+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "코듀로이 코팽"
      },
      "flow_id": "0def5ab1-fae6-4f75-bd55-fa83002ff003",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:32:21.767Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- a2270b4a-2d93-4278-be2d-f0dbb6cd11bc RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T06:32:21.597+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "b25f63c6-7bf0-420c-bece-0df6778764ae",
      "session_id": "031b209a-c4b7-42f9-b4bb-42e0fd8c7acf",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 791dab0f-2c14-4f5d-ac83-c715b6fb9810 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T06:32:21.231+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "b25f63c6-7bf0-420c-bece-0df6778764ae",
      "session_id": "031b209a-c4b7-42f9-b4bb-42e0fd8c7acf",
      "config_source": "principles_default"
    }
- 08e38d8c-00cf-4026-8270-3a77daece5ae END_USER_WRITE_LATENCY (2026-03-09T06:32:20.549+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "duration_ms": 3246
    }
- 92bc540e-6cd5-4856-bf07-640d11e3e439 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T06:32:20.384+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "0def5ab1-fae6-4f75-bd55-fa83002ff003",
      "key_count": 2,
      "keys_truncated": false
    }
- f417d340-54a6-4676-bf62-3fbfe475e6f0 END_USER_CONTEXT_RESOLVED (2026-03-09T06:32:17.987+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
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
- e549987d-e6ef-4505-94c8-b7a22211a000 END_USER_MATCH_HIT (2026-03-09T06:32:17.812+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- bc6030eb-7ce4-4cca-94da-4d0b630223ee PRE_MCP_DECISION (2026-03-09T06:32:16.774+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
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
        "recorded_at": "2026-03-09T06:32:16.774Z",
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
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- ee5d2721-416e-4f9d-add7-8425765038ea INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T06:32:16.432+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:32:16.432Z",
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
- 446fa952-817b-42f7-a9be-3ef41d4fe941 POLICY_DECISION (2026-03-09T06:32:16.262+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
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
        "recorded_at": "2026-03-09T06:32:16.262Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "코팽 재입고"
      }
    }
- df16ba5e-34f7-430c-9dd6-f81f4c0021af INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T06:32:16.086+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:32:16.086Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 626aabe6-379e-484c-a94f-93b4253d11b9 SLOT_EXTRACTED (2026-03-09T06:32:15.914+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
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
        "recorded_at": "2026-03-09T06:32:15.914Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "코팽 재입고"
      }
    }
- 1b34ea5c-185d-47d0-9837-e84266aefee6 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T06:32:15.744+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:32:15.744Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 64d5c277-11ad-422e-a868-ac86952cdf03 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T06:32:15.562+00:00) (turn_id=b25f63c6-7bf0-420c-bece-0df6778764ae)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T06:32:15.562Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
