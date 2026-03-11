

SESSION_ID: 7e49d7a0-95d8-4aed-a006-ab33961e677c
PAGE: /app/laboratory
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): QUICK_REPLY_RULE_DECISION, FINAL_ANSWER_READY, POLICY_DECISION, CONFIRMED_ENTITY_DELTA_APPLIED, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONFIRMED_ENTITY_SAVED, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_MISS, PRE_MCP_DECISION, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED, END_USER_MATCH_HIT
기대 목록(Debug): NO_TOOL_CALLED

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.QUICK_REPLY_RULE_DECISION, event.FINAL_ANSWER_READY, event.POLICY_DECISION, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONFIRMED_ENTITY_SAVED, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_MISS, event.PRE_MCP_DECISION, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, event.END_USER_MATCH_HIT, debug.NO_TOOL_CALLED, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: dea0e990-24e1-4b4d-a416-fc7931996739

[TOKEN_USED]

USER:
티셔츠 재입고

BOT:
확인한 것: 티셔츠 재입고
확인할 것: 요약: 프릴 티셔츠 입고 예정일 08/02입니다.
상세: 예정일 2026-08-02 (D-144)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 티셔츠 재입고\n확인할 것: 요약: 프릴 티셔츠 입고 예정일 08/02입니다.\n상세: 예정일 2026-08-02 (D-144)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
- fb9e95a3-8de8-46b2-b437-f8db6c5b1c79 (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739) (2026-03-11T01:17:42.164+00:00)
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
        "runtime_started_at": "2026-03-11T01:17:39.610Z"
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
        "recorded_at": "2026-03-11T01:17:41.993Z",
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
        "input_length": 7,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- d40af64a-eab8-48da-a47d-7c5f34fc79ce QUICK_REPLY_RULE_DECISION (2026-03-11T01:17:47.107+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
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
- 9d21e803-a2df-46d2-8c6c-32428fb84ddf FINAL_ANSWER_READY (2026-03-11T01:17:46.943+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 티셔츠 재입고\n확인할 것: 요약: 프릴 티셔츠 입고 예정일 08/02입니다.\n상세: 예정일 2026-08-02 (D-144)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-11T01:17:46.943Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- c3aa1ae9-e979-46ec-a77c-455388b9c220 POLICY_DECISION (2026-03-11T01:17:46.778+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
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
        "recorded_at": "2026-03-11T01:17:46.778Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "프릴 티셔츠"
    }
- 5a6ad873-b670-4aca-9e51-2e89249c3afd CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-11T01:17:46.617+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "프릴 티셔츠"
      },
      "flow_id": "9382fa9d-3286-4690-900e-8d071db8fd29",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:17:46.617Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 8f8f7703-a4e4-4ad5-b881-8f30ca84e821 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-11T01:17:46.457+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "dea0e990-24e1-4b4d-a416-fc7931996739",
      "session_id": "7e49d7a0-95d8-4aed-a006-ab33961e677c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- c047c4f5-da7c-4e1d-8240-533bff1bf777 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-11T01:17:46.092+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "dea0e990-24e1-4b4d-a416-fc7931996739",
      "session_id": "7e49d7a0-95d8-4aed-a006-ab33961e677c",
      "config_source": "principles_default"
    }
- c1d598f7-c24d-42d8-9b8e-94232e18cdfd END_USER_WRITE_LATENCY (2026-03-11T01:17:45.081+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "duration_ms": 2721
    }
- c0154ecc-7dbe-41df-8caa-6c15dc664818 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-11T01:17:44.924+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "9382fa9d-3286-4690-900e-8d071db8fd29",
      "key_count": 2,
      "keys_truncated": false
    }
- 57374865-2dc5-4c25-8760-c8ec160ed448 END_USER_CONTEXT_RESOLVED (2026-03-11T01:17:43.247+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "match_hit": false,
      "end_user_id": "d8b08dfe-4fc0-4d46-8a42-365ac6fe3837",
      "identity_count": 1,
      "identity_types": [
        "external"
      ],
      "match_attempted": true,
      "resolution_source": "created"
    }
- b3724c4b-193d-4d8c-a83c-7fe8e1f0a546 END_USER_MATCH_MISS (2026-03-11T01:17:43.092+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "matched": false,
      "identity_count": 1,
      "identity_types": [
        "external"
      ]
    }
- a544defa-c8bc-4a6f-8f72-bf5f81e92d21 PRE_MCP_DECISION (2026-03-11T01:17:41.816+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
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
        "recorded_at": "2026-03-11T01:17:41.816Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "티셔츠 재입고",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "티셔츠 재입고"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false
    }
- 11e6bb62-e43f-4478-a403-b0475fd1628e INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-11T01:17:41.483+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:17:41.483Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "티셔츠 재입고"
      }
    }
- 1fc5749b-0e20-4bc9-8313-610526d5c3a3 POLICY_DECISION (2026-03-11T01:17:41.323+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
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
        "recorded_at": "2026-03-11T01:17:41.323Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "티셔츠 재입고"
      }
    }
- 5ae93781-9645-4628-bb65-dd0856f99317 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-11T01:17:41.166+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:17:41.166Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- e038748f-a196-495a-877a-15ee5356c20c SLOT_EXTRACTED (2026-03-11T01:17:41.011+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
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
        "recorded_at": "2026-03-11T01:17:41.011Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "티셔츠 재입고"
      }
    }
- f4c17856-570d-4e5d-b116-19efa2ba6c4b INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-11T01:17:40.845+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:17:40.845Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- b76a1327-5dba-4816-82a8-10b93a4cad81 INPUT_CONTRACT_REVIEW_STARTED (2026-03-11T01:17:40.679+00:00) (turn_id=dea0e990-24e1-4b4d-a416-fc7931996739)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:17:40.679Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: a3f412d9-3128-45e9-9bc9-f0afb0599118

[TOKEN_USED]

USER:
재입고 알림 신청

BOT:
확인한 것: 상품 프릴 티셔츠, 연락 채널 sms
확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)
선택 가능: D-1, D-2, D-3, D-7, D-14
예) 1,2,3
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=choice, choice_mode=multi, quick_replies=5, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 프릴 티셔츠, 연락 채널 sms\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "multi"
    },
    "quick_replies": [
      {
        "label": "D-1",
        "value": "1"
      },
      {
        "label": "D-2",
        "value": "2"
      },
      {
        "label": "D-3",
        "value": "3"
      },
      {
        "label": "D-7",
        "value": "7"
      },
      {
        "label": "D-14",
        "value": "14"
      }
    ],
    "cards": []
  }
RENDER_PLAN: view=choice, quick_replies=true, cards=false, mode=multi, min=1, max=5, submit=csv, prompt=lead_day
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
    "max_select": 5,
    "submit_format": "csv",
    "grid_columns": {
      "quick_replies": 3,
      "cards": 1
    },
    "prompt_kind": "lead_day",
    "debug": {
      "policy_version": "v1",
      "quick_replies_count": 5,
      "cards_count": 0,
      "selection_mode_source": "config",
      "min_select_source": "config",
      "max_select_source": "config",
      "submit_format_source": "config"
    }
  }
QUICK_REPLY_RULE: mode=multi, min=1, max=5, submit=csv, source=explicit, criteria=payload:quick_replies, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- 3efb1de7-01ac-40e7-a971-80d98d4391b8 (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118) (2026-03-11T01:22:04.862+00:00)
  prefix_json:
    {
      "slot": {
        "phone_masked": "-"
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
        "recorded_at": "2026-03-11T01:22:04.701Z",
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
        "expected_inputs": [],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "reset_by_restock_intent"
      },
      "model_resolution": {
        "input_length": 9,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- f4d6ed53-d1fc-4cb0-951b-3c09d7070b86 QUICK_REPLY_RULE_DECISION (2026-03-11T01:22:09.451+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "quick_reply_count": 5,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS",
        "max_select": 5,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "csv",
        "selection_mode": "multi",
        "source_function": "handleRestockIntent"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 38e22616-fd9d-4030-95fe-6a0fa09dad80 FINAL_ANSWER_READY (2026-03-11T01:22:09.293+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "model": "deterministic_restock_subscribe_lead_days",
      "answer": "확인한 것: 상품 프릴 티셔츠, 연락 채널 sms\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-03-11T01:22:09.293Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS",
        "max_select": 5,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "csv",
        "selection_mode": "multi",
        "source_function": "handleRestockIntent"
      }
    }
- c5adb59c-bc6e-45d2-951f-5beec1c3bedc POLICY_DECISION (2026-03-11T01:22:09.133+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "stage": "tool",
      "action": "ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS",
      "options": [
        1,
        2,
        3,
        7,
        14
      ],
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
        "recorded_at": "2026-03-11T01:22:09.133Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_id": null,
      "min_required": 1
    }
- 3345cbb5-f231-48af-98c9-25f59e99ed05 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-11T01:22:08.977+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "프릴 티셔츠"
      },
      "flow_id": "9382fa9d-3286-4690-900e-8d071db8fd29",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:22:08.977Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 81e0eb54-812d-4681-9d50-6e593c403e88 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-11T01:22:08.813+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "a3f412d9-3128-45e9-9bc9-f0afb0599118",
      "session_id": "7e49d7a0-95d8-4aed-a006-ab33961e677c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 31624f71-aae9-45dd-8f84-ff24282308a7 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-11T01:22:08.448+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "a3f412d9-3128-45e9-9bc9-f0afb0599118",
      "session_id": "7e49d7a0-95d8-4aed-a006-ab33961e677c",
      "config_source": "principles_default"
    }
- de5b6847-4d7f-436f-a50d-a6aabd204364 END_USER_WRITE_LATENCY (2026-03-11T01:22:07.784+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "duration_ms": 2755
    }
- 6b4a4655-5f0f-4054-9ace-dc4e88c05188 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-11T01:22:07.622+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "9382fa9d-3286-4690-900e-8d071db8fd29",
      "key_count": 2,
      "keys_truncated": false
    }
- 913aa577-4274-404d-a152-a1f9538f8234 END_USER_CONTEXT_RESOLVED (2026-03-11T01:22:05.673+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "match_hit": true,
      "end_user_id": "d8b08dfe-4fc0-4d46-8a42-365ac6fe3837",
      "identity_count": 1,
      "identity_types": [
        "external"
      ],
      "match_attempted": true,
      "resolution_source": "session"
    }
- 121a2551-f01a-48af-a67d-93d94aafdbff END_USER_MATCH_HIT (2026-03-11T01:22:05.516+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "matched": true,
      "identity_count": 1,
      "identity_types": [
        "external"
      ]
    }
- 8863c97c-cea3-4f29-b807-a847dfb3d8fb PRE_MCP_DECISION (2026-03-11T01:22:04.527+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "-"
      },
      "intent": "restock_subscribe",
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
        "recorded_at": "2026-03-11T01:22:04.527Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "재입고 알림 신청",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false
    }
- be850314-b134-4804-baff-952754326685 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-11T01:22:04.202+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:22:04.202Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 04316558-d9bb-40ad-9d12-cfe413a1e3f5 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-11T01:22:04.044+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:22:04.043Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 222a6044-e0a4-4754-9ae8-d1bd764aeda4 SLOT_EXTRACTED (2026-03-11T01:22:03.879+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
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
        "intent": "restock_subscribe",
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
        "recorded_at": "2026-03-11T01:22:03.879Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 03c00925-daf8-4bdd-9d20-87af3ffce2d7 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-11T01:22:02.098+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:22:02.098Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- a8c412a2-833f-4bd1-b21d-5156985f43b8 INPUT_CONTRACT_REVIEW_STARTED (2026-03-11T01:22:01.938+00:00) (turn_id=a3f412d9-3128-45e9-9bc9-f0afb0599118)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:22:01.938Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: 303ce4b9-16a9-48c1-b7cc-88a3543a1fc1

[TOKEN_USED]

USER:
3

BOT:
확인한 것: 상품 프릴 티셔츠, 연락 채널 sms
확인할 것: 선택하신 D-3부터 sms로 알림을 받을까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 수신 번호 확인
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 프릴 티셔츠, 연락 채널 sms\n확인할 것: 선택하신 D-3부터 sms로 알림을 받을까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 수신 번호 확인",
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
RENDER_PLAN: view=choice, quick_replies=true, cards=false, mode=single, min=1, max=1, submit=single, prompt=restock_subscribe_confirm
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
    "prompt_kind": "restock_subscribe_confirm",
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
- 24cf82cf-c1fd-43de-9e9f-a1bd6785b8ca (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1) (2026-03-11T01:22:13.726+00:00)
  prefix_json:
    {
      "slot": {
        "phone_masked": "-",
        "expected_input": "restock_lead_days"
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
        "recorded_at": "2026-03-11T01:22:13.546Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [
          "restock_lead_days"
        ],
        "expected_input_prev": "restock_lead_days",
        "expected_input_stage": "restock.awaiting_subscribe_lead_days",
        "expected_input_source": "contract_stage"
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 0442f696-fbef-40bc-ba23-407482fe0c1d QUICK_REPLY_RULE_DECISION (2026-03-11T01:22:18.168+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_subscribe_confirm",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockPendingStage"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- fef7ee35-5669-4fad-b240-59935eb3209b CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-11T01:22:18.009+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "keys": [
        "product_name",
        "channel",
        "lead_days"
      ],
      "delta": {
        "channel": "sms",
        "lead_days": [
          3
        ],
        "product_name": "프릴 티셔츠"
      },
      "flow_id": "9382fa9d-3286-4690-900e-8d071db8fd29",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T01:22:18.009Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- 5b1dde44-256e-4e8d-a4e7-31e956b4e883 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-11T01:22:17.855+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "303ce4b9-16a9-48c1-b7cc-88a3543a1fc1",
      "session_id": "7e49d7a0-95d8-4aed-a006-ab33961e677c",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- b0e308ca-f80b-4357-9fc3-458df33c6f0d RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-11T01:22:17.495+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "303ce4b9-16a9-48c1-b7cc-88a3543a1fc1",
      "session_id": "7e49d7a0-95d8-4aed-a006-ab33961e677c",
      "config_source": "principles_default"
    }
- 0cbc6a18-85a8-4655-8ff4-2bca049e6b00 END_USER_WRITE_LATENCY (2026-03-11T01:22:16.84+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "duration_ms": 2945
    }
- a484e7e7-06cf-482e-b33c-096c27279596 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-11T01:22:16.679+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "keys": [
        "channel",
        "lead_days",
        "product_name"
      ],
      "flow_id": "9382fa9d-3286-4690-900e-8d071db8fd29",
      "key_count": 3,
      "keys_truncated": false
    }
- 39ecb1e0-1f9f-47c8-a830-2a04320ba5b9 END_USER_CONTEXT_RESOLVED (2026-03-11T01:22:14.546+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "match_hit": true,
      "end_user_id": "d8b08dfe-4fc0-4d46-8a42-365ac6fe3837",
      "identity_count": 1,
      "identity_types": [
        "external"
      ],
      "match_attempted": true,
      "resolution_source": "session"
    }
- 080f62c4-110d-4b2f-be32-a8b1a1678aea END_USER_MATCH_HIT (2026-03-11T01:22:14.385+00:00) (turn_id=303ce4b9-16a9-48c1-b7cc-88a3543a1fc1)
  payload:
    {
      "matched": true,
      "identity_count": 1,
      "identity_types": [
        "external"
      ]
    }
