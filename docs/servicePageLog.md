

TURN_ID: 6c61f374-c360-4bc2-becf-467b7717ac6f

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


TURN_ID: 6c61f374-c360-4bc2-becf-467b7717ac6f

[TOKEN_USED]

USER:
원피스 재입고 언제되나요?

BOT:
확인한 것: 원피스 재입고 언제되나요?
확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.
상세: 예정일 2026-06-06 (D-89)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- a2496bf3-9d43-407b-a94b-23f4f2c5aeb6 (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f) (2026-03-09T13:32:55.369+00:00)
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
        "runtime_started_at": "2026-03-09T13:32:49.112Z"
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
        "recorded_at": "2026-03-09T13:32:55.200Z",
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
        "input_length": 14,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 34746a7d-3196-400d-9e06-546a284544d2 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:00.521+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- e505b9e4-7734-4720-9204-f8a3d2f833e8 FINAL_ANSWER_READY (2026-03-09T13:33:00.351+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-09T13:33:00.351Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- c6ad998e-54cf-4eb0-8e66-7212efbfd382 POLICY_DECISION (2026-03-09T13:33:00.181+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:33:00.181Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "뿅뿅 원피스"
    }
- f19af056-5285-4fb5-a4e8-505ef728ecb0 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:00+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:00.000Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 68d86ca1-5a64-4579-9ad0-1cb5c6906cc1 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:32:59.817+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 1f891eb6-c877-4e19-ad56-7b80b4ef2eec RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:32:59.441+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- c16cc16a-1ef7-40bb-a9fb-4adf69ad31c8 END_USER_WRITE_LATENCY (2026-03-09T13:32:58.768+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "duration_ms": 3224
    }
- f7e03e92-4a65-4867-bde6-a0a1daffc177 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:32:58.591+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 2,
      "keys_truncated": false
    }
- 4be894c8-ab4f-4fff-8a24-147f184d855a END_USER_CONTEXT_RESOLVED (2026-03-09T13:32:56.209+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- 7025c097-7d41-4564-a138-8c5ad4fde88e END_USER_MATCH_HIT (2026-03-09T13:32:56.045+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 9efe49c2-097d-4899-84ca-58aec3a4d5be PRE_MCP_DECISION (2026-03-09T13:32:55.001+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:55.001Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "원피스 재입고 언제되나요?",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 23387c4c-d081-4901-9ed5-a67be30f91fb INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:32:54.652+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.652Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- e1ed3a64-d45e-4cec-8cd4-22f4eeea1cf1 POLICY_DECISION (2026-03-09T13:32:54.487+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.486Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 4ee267a0-428e-4788-a7ea-88bb7e7f75fb INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:32:54.318+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.318Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- b82679ff-d026-4aa4-9230-fc032c02e7d7 SLOT_EXTRACTED (2026-03-09T13:32:54.149+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.149Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 81e5b9b8-e634-491e-a81a-b2e95e0ca778 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:32:52.325+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:52.325Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 0a05c41e-2f99-4972-8458-2fcfc8126f75 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:32:51.686+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:51.684Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: ab69a1dd-a3f4-420c-83bd-840b15b66dec

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


TURN_ID: 6c61f374-c360-4bc2-becf-467b7717ac6f

[TOKEN_USED]

USER:
원피스 재입고 언제되나요?

BOT:
확인한 것: 원피스 재입고 언제되나요?
확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.
상세: 예정일 2026-06-06 (D-89)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- a2496bf3-9d43-407b-a94b-23f4f2c5aeb6 (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f) (2026-03-09T13:32:55.369+00:00)
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
        "runtime_started_at": "2026-03-09T13:32:49.112Z"
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
        "recorded_at": "2026-03-09T13:32:55.200Z",
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
        "input_length": 14,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 34746a7d-3196-400d-9e06-546a284544d2 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:00.521+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- e505b9e4-7734-4720-9204-f8a3d2f833e8 FINAL_ANSWER_READY (2026-03-09T13:33:00.351+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-09T13:33:00.351Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- c6ad998e-54cf-4eb0-8e66-7212efbfd382 POLICY_DECISION (2026-03-09T13:33:00.181+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:33:00.181Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "뿅뿅 원피스"
    }
- f19af056-5285-4fb5-a4e8-505ef728ecb0 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:00+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:00.000Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 68d86ca1-5a64-4579-9ad0-1cb5c6906cc1 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:32:59.817+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 1f891eb6-c877-4e19-ad56-7b80b4ef2eec RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:32:59.441+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- c16cc16a-1ef7-40bb-a9fb-4adf69ad31c8 END_USER_WRITE_LATENCY (2026-03-09T13:32:58.768+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "duration_ms": 3224
    }
- f7e03e92-4a65-4867-bde6-a0a1daffc177 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:32:58.591+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 2,
      "keys_truncated": false
    }
- 4be894c8-ab4f-4fff-8a24-147f184d855a END_USER_CONTEXT_RESOLVED (2026-03-09T13:32:56.209+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- 7025c097-7d41-4564-a138-8c5ad4fde88e END_USER_MATCH_HIT (2026-03-09T13:32:56.045+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 9efe49c2-097d-4899-84ca-58aec3a4d5be PRE_MCP_DECISION (2026-03-09T13:32:55.001+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:55.001Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "원피스 재입고 언제되나요?",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 23387c4c-d081-4901-9ed5-a67be30f91fb INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:32:54.652+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.652Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- e1ed3a64-d45e-4cec-8cd4-22f4eeea1cf1 POLICY_DECISION (2026-03-09T13:32:54.487+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.486Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 4ee267a0-428e-4788-a7ea-88bb7e7f75fb INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:32:54.318+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.318Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- b82679ff-d026-4aa4-9230-fc032c02e7d7 SLOT_EXTRACTED (2026-03-09T13:32:54.149+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.149Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 81e5b9b8-e634-491e-a81a-b2e95e0ca778 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:32:52.325+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:52.325Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 0a05c41e-2f99-4972-8458-2fcfc8126f75 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:32:51.686+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:51.684Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: ab69a1dd-a3f4-420c-83bd-840b15b66dec

[TOKEN_USED]

USER:
재입고 알림 신청

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms
확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms\n확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- ba7a8dca-f013-4d0f-8ef4-df15a8f665ed (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec) (2026-03-09T13:33:20.674+00:00)
  prefix_json:
    {
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
        "recorded_at": "2026-03-09T13:33:20.491Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "reset_by_restock_intent"
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 0360bb74-96a5-4ae6-ba37-7de1c2246005 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:25.685+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:known_info_reuse_prompt",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "runInputStageRuntime"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 8fc740cf-67c7-452c-853a-f7b5b91de458 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:25.512+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "product_name",
        "reuse_slot",
        "reuse_value"
      ],
      "delta": {
        "channel": "sms",
        "reuse_slot": "phone",
        "reuse_value": "01093107159",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:25.512Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- 09fed5c4-82f0-4b42-9370-9969f51ec08e RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:33:25.349+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 50d20022-f296-44d4-9cfd-8f9c76f4862b RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:33:24.981+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- 11e8605c-cc10-4691-b726-76554f4ea248 END_USER_WRITE_LATENCY (2026-03-09T13:33:24.311+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "duration_ms": 3469
    }
- df49840a-2340-4414-aa49-0cd8dc5a748b END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:33:24.148+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "reuse_slot",
        "reuse_value",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 4,
      "keys_truncated": false
    }
- c539b8bb-3ec8-4d20-a470-c4ab9c7be791 END_USER_CONTEXT_RESOLVED (2026-03-09T13:33:21.504+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
- f4497a39-7fb6-479f-870e-3210d8cd9035 END_USER_MATCH_HIT (2026-03-09T13:33:21.325+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- f80af1cd-d819-4b52-aabb-d877bbb64335 SLOT_EXTRACTED (2026-03-09T13:33:20.324+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
        "recorded_at": "2026-03-09T13:33:20.324Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 8d623522-45ee-4efc-b426-3392ed27d3b6 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:33:18.137+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:18.137Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- 99f58dd0-5d33-42d7-bd35-e3db2d64079e INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:33:17.964+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:17.964Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: f7d40759-f6a3-4c14-9dc6-decaa3b8193c

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


TURN_ID: 6c61f374-c360-4bc2-becf-467b7717ac6f

[TOKEN_USED]

USER:
원피스 재입고 언제되나요?

BOT:
확인한 것: 원피스 재입고 언제되나요?
확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.
상세: 예정일 2026-06-06 (D-89)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- a2496bf3-9d43-407b-a94b-23f4f2c5aeb6 (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f) (2026-03-09T13:32:55.369+00:00)
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
        "runtime_started_at": "2026-03-09T13:32:49.112Z"
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
        "recorded_at": "2026-03-09T13:32:55.200Z",
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
        "input_length": 14,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 34746a7d-3196-400d-9e06-546a284544d2 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:00.521+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- e505b9e4-7734-4720-9204-f8a3d2f833e8 FINAL_ANSWER_READY (2026-03-09T13:33:00.351+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-09T13:33:00.351Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- c6ad998e-54cf-4eb0-8e66-7212efbfd382 POLICY_DECISION (2026-03-09T13:33:00.181+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:33:00.181Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "뿅뿅 원피스"
    }
- f19af056-5285-4fb5-a4e8-505ef728ecb0 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:00+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:00.000Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 68d86ca1-5a64-4579-9ad0-1cb5c6906cc1 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:32:59.817+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 1f891eb6-c877-4e19-ad56-7b80b4ef2eec RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:32:59.441+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- c16cc16a-1ef7-40bb-a9fb-4adf69ad31c8 END_USER_WRITE_LATENCY (2026-03-09T13:32:58.768+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "duration_ms": 3224
    }
- f7e03e92-4a65-4867-bde6-a0a1daffc177 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:32:58.591+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 2,
      "keys_truncated": false
    }
- 4be894c8-ab4f-4fff-8a24-147f184d855a END_USER_CONTEXT_RESOLVED (2026-03-09T13:32:56.209+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- 7025c097-7d41-4564-a138-8c5ad4fde88e END_USER_MATCH_HIT (2026-03-09T13:32:56.045+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 9efe49c2-097d-4899-84ca-58aec3a4d5be PRE_MCP_DECISION (2026-03-09T13:32:55.001+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:55.001Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "원피스 재입고 언제되나요?",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 23387c4c-d081-4901-9ed5-a67be30f91fb INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:32:54.652+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.652Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- e1ed3a64-d45e-4cec-8cd4-22f4eeea1cf1 POLICY_DECISION (2026-03-09T13:32:54.487+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.486Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 4ee267a0-428e-4788-a7ea-88bb7e7f75fb INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:32:54.318+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.318Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- b82679ff-d026-4aa4-9230-fc032c02e7d7 SLOT_EXTRACTED (2026-03-09T13:32:54.149+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.149Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 81e5b9b8-e634-491e-a81a-b2e95e0ca778 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:32:52.325+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:52.325Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 0a05c41e-2f99-4972-8458-2fcfc8126f75 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:32:51.686+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:51.684Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: ab69a1dd-a3f4-420c-83bd-840b15b66dec

[TOKEN_USED]

USER:
재입고 알림 신청

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms
확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms\n확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- ba7a8dca-f013-4d0f-8ef4-df15a8f665ed (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec) (2026-03-09T13:33:20.674+00:00)
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
        "recorded_at": "2026-03-09T13:33:20.491Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "reset_by_restock_intent"
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 0360bb74-96a5-4ae6-ba37-7de1c2246005 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:25.685+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:known_info_reuse_prompt",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "runInputStageRuntime"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 8fc740cf-67c7-452c-853a-f7b5b91de458 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:25.512+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "product_name",
        "reuse_slot",
        "reuse_value"
      ],
      "delta": {
        "channel": "sms",
        "reuse_slot": "phone",
        "reuse_value": "01093107159",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:25.512Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- 09fed5c4-82f0-4b42-9370-9969f51ec08e RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:33:25.349+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 50d20022-f296-44d4-9cfd-8f9c76f4862b RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:33:24.981+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- 11e8605c-cc10-4691-b726-76554f4ea248 END_USER_WRITE_LATENCY (2026-03-09T13:33:24.311+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "duration_ms": 3469
    }
- df49840a-2340-4414-aa49-0cd8dc5a748b END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:33:24.148+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "reuse_slot",
        "reuse_value",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 4,
      "keys_truncated": false
    }
- c539b8bb-3ec8-4d20-a470-c4ab9c7be791 END_USER_CONTEXT_RESOLVED (2026-03-09T13:33:21.504+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
- f4497a39-7fb6-479f-870e-3210d8cd9035 END_USER_MATCH_HIT (2026-03-09T13:33:21.325+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- f80af1cd-d819-4b52-aabb-d877bbb64335 SLOT_EXTRACTED (2026-03-09T13:33:20.324+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
        "recorded_at": "2026-03-09T13:33:20.324Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 8d623522-45ee-4efc-b426-3392ed27d3b6 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:33:18.137+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:18.137Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- 99f58dd0-5d33-42d7-bd35-e3db2d64079e INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:33:17.964+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:17.964Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: f7d40759-f6a3-4c14-9dc6-decaa3b8193c

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159
확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)
선택 가능: D-1, D-2, D-3, D-7, D-14
예) 1,2,3
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 4415e3b8-95d2-4db0-a379-05b00f0c7d73 (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c) (2026-03-09T13:34:13.736+00:00)
  prefix_json:
    {
      "slot": {
        "phone": "01093107159",
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.548Z",
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
        "derived_phone": "01093107159",
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "pre_turn_guard"
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 9cafa9b3-3b01-4ee4-8193-c59344bc5cb5 QUICK_REPLY_RULE_DECISION (2026-03-09T13:34:19.656+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- ed191c2c-086b-426b-8761-beb0d195206c FINAL_ANSWER_READY (2026-03-09T13:34:19.473+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "model": "deterministic_restock_subscribe_lead_days",
      "answer": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-03-09T13:34:19.473Z",
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
- 168609c0-50eb-4c54-a4b8-88eb231c7377 POLICY_DECISION (2026-03-09T13:34:19.298+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "recorded_at": "2026-03-09T13:34:19.298Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_id": null,
      "min_required": 1
    }
- a6fd8690-e2dc-4938-8189-5dc1f112e67c CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:34:19.116+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "product_name",
        "channel",
        "phone"
      ],
      "delta": {
        "phone": "01093107159",
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:19.116Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- 6354a289-285f-4826-bf1e-71af4ba8f207 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:34:18.941+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 23c8ff87-662f-4f04-a052-6c13db024b64 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:34:18.455+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- ff9c3450-aa9a-4b4b-98d5-4a9b8ca1529c END_USER_WRITE_LATENCY (2026-03-09T13:34:17.761+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "duration_ms": 3850
    }
- 8e255bcc-0e3f-4bba-a34d-c2f74718082d END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:34:17.592+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "phone",
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 3,
      "keys_truncated": false
    }
- bb97e2c4-2b78-4f01-8023-551ec483d129 END_USER_CONTEXT_RESOLVED (2026-03-09T13:34:14.643+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- aaf43135-0e3d-4016-8901-b2ea22ba86b1 END_USER_MATCH_HIT (2026-03-09T13:34:14.463+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- dec0c6a2-6144-4490-ac7b-c6e96731e924 PRE_MCP_DECISION (2026-03-09T13:34:13.376+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.376Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "네",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 35d28311-e047-47cd-8bb6-82e07dbe9542 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:34:13.035+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:13.035Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- cd2078d9-634b-4ef2-a9b3-50011ae24cc3 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:34:12.864+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.864Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 5db2c8b4-7be5-4c24-857f-11ed92188a2f SLOT_EXTRACTED (2026-03-09T13:34:12.695+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "intent": "restock_subscribe",
        "address": null,
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
        "recorded_at": "2026-03-09T13:34:12.695Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 28480fe2-209f-4b90-bc2f-6786e18e665a INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:34:12.518+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "pre_turn_guard",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.518Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": null,
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- c80bb2f8-978f-482f-8975-b7027f81fbd5 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:34:12.351+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.351Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: f7d40759-f6a3-4c14-9dc6-decaa3b8193c

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


TURN_ID: 6c61f374-c360-4bc2-becf-467b7717ac6f

[TOKEN_USED]

USER:
원피스 재입고 언제되나요?

BOT:
확인한 것: 원피스 재입고 언제되나요?
확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.
상세: 예정일 2026-06-06 (D-89)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- a2496bf3-9d43-407b-a94b-23f4f2c5aeb6 (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f) (2026-03-09T13:32:55.369+00:00)
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
        "runtime_started_at": "2026-03-09T13:32:49.112Z"
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
        "recorded_at": "2026-03-09T13:32:55.200Z",
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
        "input_length": 14,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 34746a7d-3196-400d-9e06-546a284544d2 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:00.521+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- e505b9e4-7734-4720-9204-f8a3d2f833e8 FINAL_ANSWER_READY (2026-03-09T13:33:00.351+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-09T13:33:00.351Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- c6ad998e-54cf-4eb0-8e66-7212efbfd382 POLICY_DECISION (2026-03-09T13:33:00.181+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:33:00.181Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "뿅뿅 원피스"
    }
- f19af056-5285-4fb5-a4e8-505ef728ecb0 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:00+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:00.000Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 68d86ca1-5a64-4579-9ad0-1cb5c6906cc1 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:32:59.817+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 1f891eb6-c877-4e19-ad56-7b80b4ef2eec RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:32:59.441+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- c16cc16a-1ef7-40bb-a9fb-4adf69ad31c8 END_USER_WRITE_LATENCY (2026-03-09T13:32:58.768+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "duration_ms": 3224
    }
- f7e03e92-4a65-4867-bde6-a0a1daffc177 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:32:58.591+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 2,
      "keys_truncated": false
    }
- 4be894c8-ab4f-4fff-8a24-147f184d855a END_USER_CONTEXT_RESOLVED (2026-03-09T13:32:56.209+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- 7025c097-7d41-4564-a138-8c5ad4fde88e END_USER_MATCH_HIT (2026-03-09T13:32:56.045+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 9efe49c2-097d-4899-84ca-58aec3a4d5be PRE_MCP_DECISION (2026-03-09T13:32:55.001+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:55.001Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "원피스 재입고 언제되나요?",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 23387c4c-d081-4901-9ed5-a67be30f91fb INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:32:54.652+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.652Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- e1ed3a64-d45e-4cec-8cd4-22f4eeea1cf1 POLICY_DECISION (2026-03-09T13:32:54.487+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.486Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 4ee267a0-428e-4788-a7ea-88bb7e7f75fb INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:32:54.318+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.318Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- b82679ff-d026-4aa4-9230-fc032c02e7d7 SLOT_EXTRACTED (2026-03-09T13:32:54.149+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.149Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 81e5b9b8-e634-491e-a81a-b2e95e0ca778 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:32:52.325+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:52.325Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 0a05c41e-2f99-4972-8458-2fcfc8126f75 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:32:51.686+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:51.684Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: ab69a1dd-a3f4-420c-83bd-840b15b66dec

[TOKEN_USED]

USER:
재입고 알림 신청

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms
확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms\n확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- ba7a8dca-f013-4d0f-8ef4-df15a8f665ed (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec) (2026-03-09T13:33:20.674+00:00)
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
        "recorded_at": "2026-03-09T13:33:20.491Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "reset_by_restock_intent"
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 0360bb74-96a5-4ae6-ba37-7de1c2246005 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:25.685+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:known_info_reuse_prompt",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "runInputStageRuntime"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 8fc740cf-67c7-452c-853a-f7b5b91de458 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:25.512+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "product_name",
        "reuse_slot",
        "reuse_value"
      ],
      "delta": {
        "channel": "sms",
        "reuse_slot": "phone",
        "reuse_value": "01093107159",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:25.512Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- 09fed5c4-82f0-4b42-9370-9969f51ec08e RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:33:25.349+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 50d20022-f296-44d4-9cfd-8f9c76f4862b RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:33:24.981+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- 11e8605c-cc10-4691-b726-76554f4ea248 END_USER_WRITE_LATENCY (2026-03-09T13:33:24.311+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "duration_ms": 3469
    }
- df49840a-2340-4414-aa49-0cd8dc5a748b END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:33:24.148+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "reuse_slot",
        "reuse_value",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 4,
      "keys_truncated": false
    }
- c539b8bb-3ec8-4d20-a470-c4ab9c7be791 END_USER_CONTEXT_RESOLVED (2026-03-09T13:33:21.504+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
- f4497a39-7fb6-479f-870e-3210d8cd9035 END_USER_MATCH_HIT (2026-03-09T13:33:21.325+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- f80af1cd-d819-4b52-aabb-d877bbb64335 SLOT_EXTRACTED (2026-03-09T13:33:20.324+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
        "recorded_at": "2026-03-09T13:33:20.324Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 8d623522-45ee-4efc-b426-3392ed27d3b6 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:33:18.137+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:18.137Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- 99f58dd0-5d33-42d7-bd35-e3db2d64079e INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:33:17.964+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:17.964Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: f7d40759-f6a3-4c14-9dc6-decaa3b8193c

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159
확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)
선택 가능: D-1, D-2, D-3, D-7, D-14
예) 1,2,3
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 4415e3b8-95d2-4db0-a379-05b00f0c7d73 (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c) (2026-03-09T13:34:13.736+00:00)
  prefix_json:
    {
      "slot": {
        "phone": "01093107159",
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.548Z",
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
        "derived_phone": "01093107159",
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "pre_turn_guard"
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 9cafa9b3-3b01-4ee4-8193-c59344bc5cb5 QUICK_REPLY_RULE_DECISION (2026-03-09T13:34:19.656+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- ed191c2c-086b-426b-8761-beb0d195206c FINAL_ANSWER_READY (2026-03-09T13:34:19.473+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "model": "deterministic_restock_subscribe_lead_days",
      "answer": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-03-09T13:34:19.473Z",
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
- 168609c0-50eb-4c54-a4b8-88eb231c7377 POLICY_DECISION (2026-03-09T13:34:19.298+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "recorded_at": "2026-03-09T13:34:19.298Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_id": null,
      "min_required": 1
    }
- a6fd8690-e2dc-4938-8189-5dc1f112e67c CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:34:19.116+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "product_name",
        "channel",
        "phone"
      ],
      "delta": {
        "phone": "01093107159",
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:19.116Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- 6354a289-285f-4826-bf1e-71af4ba8f207 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:34:18.941+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 23c8ff87-662f-4f04-a052-6c13db024b64 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:34:18.455+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- ff9c3450-aa9a-4b4b-98d5-4a9b8ca1529c END_USER_WRITE_LATENCY (2026-03-09T13:34:17.761+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "duration_ms": 3850
    }
- 8e255bcc-0e3f-4bba-a34d-c2f74718082d END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:34:17.592+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "phone",
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 3,
      "keys_truncated": false
    }
- bb97e2c4-2b78-4f01-8023-551ec483d129 END_USER_CONTEXT_RESOLVED (2026-03-09T13:34:14.643+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- aaf43135-0e3d-4016-8901-b2ea22ba86b1 END_USER_MATCH_HIT (2026-03-09T13:34:14.463+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- dec0c6a2-6144-4490-ac7b-c6e96731e924 PRE_MCP_DECISION (2026-03-09T13:34:13.376+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.376Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "네",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 35d28311-e047-47cd-8bb6-82e07dbe9542 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:34:13.035+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:13.035Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- cd2078d9-634b-4ef2-a9b3-50011ae24cc3 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:34:12.864+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.864Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 5db2c8b4-7be5-4c24-857f-11ed92188a2f SLOT_EXTRACTED (2026-03-09T13:34:12.695+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "intent": "restock_subscribe",
        "address": null,
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
        "recorded_at": "2026-03-09T13:34:12.695Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 28480fe2-209f-4b90-bc2f-6786e18e665a INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:34:12.518+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "pre_turn_guard",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.518Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": null,
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- c80bb2f8-978f-482f-8975-b7027f81fbd5 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:34:12.351+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.351Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: 6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d

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


TURN_ID: 6c61f374-c360-4bc2-becf-467b7717ac6f

[TOKEN_USED]

USER:
원피스 재입고 언제되나요?

BOT:
확인한 것: 원피스 재입고 언제되나요?
확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.
상세: 예정일 2026-06-06 (D-89)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- a2496bf3-9d43-407b-a94b-23f4f2c5aeb6 (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f) (2026-03-09T13:32:55.369+00:00)
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
        "runtime_started_at": "2026-03-09T13:32:49.112Z"
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
        "recorded_at": "2026-03-09T13:32:55.200Z",
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
        "input_length": 14,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 34746a7d-3196-400d-9e06-546a284544d2 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:00.521+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- e505b9e4-7734-4720-9204-f8a3d2f833e8 FINAL_ANSWER_READY (2026-03-09T13:33:00.351+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-09T13:33:00.351Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- c6ad998e-54cf-4eb0-8e66-7212efbfd382 POLICY_DECISION (2026-03-09T13:33:00.181+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:33:00.181Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "뿅뿅 원피스"
    }
- f19af056-5285-4fb5-a4e8-505ef728ecb0 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:00+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:00.000Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 68d86ca1-5a64-4579-9ad0-1cb5c6906cc1 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:32:59.817+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 1f891eb6-c877-4e19-ad56-7b80b4ef2eec RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:32:59.441+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- c16cc16a-1ef7-40bb-a9fb-4adf69ad31c8 END_USER_WRITE_LATENCY (2026-03-09T13:32:58.768+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "duration_ms": 3224
    }
- f7e03e92-4a65-4867-bde6-a0a1daffc177 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:32:58.591+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 2,
      "keys_truncated": false
    }
- 4be894c8-ab4f-4fff-8a24-147f184d855a END_USER_CONTEXT_RESOLVED (2026-03-09T13:32:56.209+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- 7025c097-7d41-4564-a138-8c5ad4fde88e END_USER_MATCH_HIT (2026-03-09T13:32:56.045+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 9efe49c2-097d-4899-84ca-58aec3a4d5be PRE_MCP_DECISION (2026-03-09T13:32:55.001+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:55.001Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "원피스 재입고 언제되나요?",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 23387c4c-d081-4901-9ed5-a67be30f91fb INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:32:54.652+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.652Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- e1ed3a64-d45e-4cec-8cd4-22f4eeea1cf1 POLICY_DECISION (2026-03-09T13:32:54.487+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.486Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 4ee267a0-428e-4788-a7ea-88bb7e7f75fb INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:32:54.318+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.318Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- b82679ff-d026-4aa4-9230-fc032c02e7d7 SLOT_EXTRACTED (2026-03-09T13:32:54.149+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.149Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 81e5b9b8-e634-491e-a81a-b2e95e0ca778 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:32:52.325+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:52.325Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 0a05c41e-2f99-4972-8458-2fcfc8126f75 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:32:51.686+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:51.684Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: ab69a1dd-a3f4-420c-83bd-840b15b66dec

[TOKEN_USED]

USER:
재입고 알림 신청

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms
확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms\n확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- ba7a8dca-f013-4d0f-8ef4-df15a8f665ed (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec) (2026-03-09T13:33:20.674+00:00)
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
        "recorded_at": "2026-03-09T13:33:20.491Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "reset_by_restock_intent"
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 0360bb74-96a5-4ae6-ba37-7de1c2246005 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:25.685+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:known_info_reuse_prompt",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "runInputStageRuntime"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 8fc740cf-67c7-452c-853a-f7b5b91de458 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:25.512+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "product_name",
        "reuse_slot",
        "reuse_value"
      ],
      "delta": {
        "channel": "sms",
        "reuse_slot": "phone",
        "reuse_value": "01093107159",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:25.512Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- 09fed5c4-82f0-4b42-9370-9969f51ec08e RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:33:25.349+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 50d20022-f296-44d4-9cfd-8f9c76f4862b RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:33:24.981+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- 11e8605c-cc10-4691-b726-76554f4ea248 END_USER_WRITE_LATENCY (2026-03-09T13:33:24.311+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "duration_ms": 3469
    }
- df49840a-2340-4414-aa49-0cd8dc5a748b END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:33:24.148+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "reuse_slot",
        "reuse_value",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 4,
      "keys_truncated": false
    }
- c539b8bb-3ec8-4d20-a470-c4ab9c7be791 END_USER_CONTEXT_RESOLVED (2026-03-09T13:33:21.504+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
- f4497a39-7fb6-479f-870e-3210d8cd9035 END_USER_MATCH_HIT (2026-03-09T13:33:21.325+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- f80af1cd-d819-4b52-aabb-d877bbb64335 SLOT_EXTRACTED (2026-03-09T13:33:20.324+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
        "recorded_at": "2026-03-09T13:33:20.324Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 8d623522-45ee-4efc-b426-3392ed27d3b6 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:33:18.137+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:18.137Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- 99f58dd0-5d33-42d7-bd35-e3db2d64079e INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:33:17.964+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:17.964Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: f7d40759-f6a3-4c14-9dc6-decaa3b8193c

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159
확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)
선택 가능: D-1, D-2, D-3, D-7, D-14
예) 1,2,3
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 4415e3b8-95d2-4db0-a379-05b00f0c7d73 (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c) (2026-03-09T13:34:13.736+00:00)
  prefix_json:
    {
      "slot": {
        "phone": "01093107159",
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.548Z",
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
        "derived_phone": "01093107159",
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "pre_turn_guard"
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 9cafa9b3-3b01-4ee4-8193-c59344bc5cb5 QUICK_REPLY_RULE_DECISION (2026-03-09T13:34:19.656+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- ed191c2c-086b-426b-8761-beb0d195206c FINAL_ANSWER_READY (2026-03-09T13:34:19.473+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "model": "deterministic_restock_subscribe_lead_days",
      "answer": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-03-09T13:34:19.473Z",
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
- 168609c0-50eb-4c54-a4b8-88eb231c7377 POLICY_DECISION (2026-03-09T13:34:19.298+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "recorded_at": "2026-03-09T13:34:19.298Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_id": null,
      "min_required": 1
    }
- a6fd8690-e2dc-4938-8189-5dc1f112e67c CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:34:19.116+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "product_name",
        "channel",
        "phone"
      ],
      "delta": {
        "phone": "01093107159",
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:19.116Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- 6354a289-285f-4826-bf1e-71af4ba8f207 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:34:18.941+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 23c8ff87-662f-4f04-a052-6c13db024b64 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:34:18.455+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- ff9c3450-aa9a-4b4b-98d5-4a9b8ca1529c END_USER_WRITE_LATENCY (2026-03-09T13:34:17.761+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "duration_ms": 3850
    }
- 8e255bcc-0e3f-4bba-a34d-c2f74718082d END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:34:17.592+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "phone",
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 3,
      "keys_truncated": false
    }
- bb97e2c4-2b78-4f01-8023-551ec483d129 END_USER_CONTEXT_RESOLVED (2026-03-09T13:34:14.643+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- aaf43135-0e3d-4016-8901-b2ea22ba86b1 END_USER_MATCH_HIT (2026-03-09T13:34:14.463+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- dec0c6a2-6144-4490-ac7b-c6e96731e924 PRE_MCP_DECISION (2026-03-09T13:34:13.376+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.376Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "네",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 35d28311-e047-47cd-8bb6-82e07dbe9542 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:34:13.035+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:13.035Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- cd2078d9-634b-4ef2-a9b3-50011ae24cc3 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:34:12.864+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.864Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 5db2c8b4-7be5-4c24-857f-11ed92188a2f SLOT_EXTRACTED (2026-03-09T13:34:12.695+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "intent": "restock_subscribe",
        "address": null,
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
        "recorded_at": "2026-03-09T13:34:12.695Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 28480fe2-209f-4b90-bc2f-6786e18e665a INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:34:12.518+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "pre_turn_guard",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.518Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": null,
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- c80bb2f8-978f-482f-8975-b7027f81fbd5 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:34:12.351+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.351Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: 6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d

[TOKEN_USED]

USER:
14

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159
확인할 것: 선택하신 D-14부터 sms로 알림을 받을까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 수신 번호 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 선택하신 D-14부터 sms로 알림을 받을까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 수신 번호 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- c8df82e9-1766-4646-bcfd-4c9ab5510396 (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d) (2026-03-09T13:34:27.493+00:00)
  prefix_json:
    {
      "slot": {
        "phone": "01093107159",
        "phone_masked": "*******7159",
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
        "recorded_at": "2026-03-09T13:34:27.324Z",
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
        "input_length": 2,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 36f6208d-b40c-4fe6-aff0-8c7cfe796601 QUICK_REPLY_RULE_DECISION (2026-03-09T13:34:33.015+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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
- 89e5a2a2-7ce8-4f27-8bc1-1a5574056fa5 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:34:32.848+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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
          14
        ],
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:32.848Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- d7394196-0a12-4ecc-920b-27a77ac83d11 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:34:32.688+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 705ef494-20a2-438a-b34e-5f613ae44a5d RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:34:32.09+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- 1a5b4754-c6da-4f26-b51a-bba151e0e689 END_USER_WRITE_LATENCY (2026-03-09T13:34:31.397+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "duration_ms": 3732
    }
- c44e9076-5a75-47d5-a15b-f98d5d3f8c2d END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:34:31.223+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "keys": [
        "channel",
        "lead_days",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 3,
      "keys_truncated": false
    }
- 4c6c7854-b6c7-48a1-8322-82ce5ff459ce END_USER_CONTEXT_RESOLVED (2026-03-09T13:34:28.35+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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
- ccdcfd89-ede4-4079-b7f0-64fd22a94c1d END_USER_MATCH_HIT (2026-03-09T13:34:28.183+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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


TURN_ID: 7f198f39-ac28-4e53-b4a2-ad199f9e58d3

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): QUICK_REPLY_RULE_DECISION, FINAL_ANSWER_READY, POLICY_DECISION, CONFIRMED_ENTITY_DELTA_APPLIED, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONFIRMED_ENTITY_SAVED, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_HIT, PRE_MCP_DECISION, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED, RUNTIME_PATCH_PROPOSAL_CREATED, PRINCIPLE_VIOLATION_DETECTED, RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED, RESTOCK_SMS_SCHEDULED, RESTOCK_SUBSCRIBE_DISPATCH_STARTED
기대 목록(Debug): NO_TOOL_CALLED

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.QUICK_REPLY_RULE_DECISION, event.FINAL_ANSWER_READY, event.POLICY_DECISION, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONFIRMED_ENTITY_SAVED, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_HIT, event.PRE_MCP_DECISION, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, event.RUNTIME_PATCH_PROPOSAL_CREATED, event.PRINCIPLE_VIOLATION_DETECTED, event.RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED, event.RESTOCK_SMS_SCHEDULED, event.RESTOCK_SUBSCRIBE_DISPATCH_STARTED, debug.NO_TOOL_CALLED, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: 6c61f374-c360-4bc2-becf-467b7717ac6f

[TOKEN_USED]

USER:
원피스 재입고 언제되나요?

BOT:
확인한 것: 원피스 재입고 언제되나요?
확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.
상세: 예정일 2026-06-06 (D-89)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- a2496bf3-9d43-407b-a94b-23f4f2c5aeb6 (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f) (2026-03-09T13:32:55.369+00:00)
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
        "runtime_started_at": "2026-03-09T13:32:49.112Z"
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
        "recorded_at": "2026-03-09T13:32:55.200Z",
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
        "input_length": 14,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 34746a7d-3196-400d-9e06-546a284544d2 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:00.521+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- e505b9e4-7734-4720-9204-f8a3d2f833e8 FINAL_ANSWER_READY (2026-03-09T13:33:00.351+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 원피스 재입고 언제되나요?\n확인할 것: 요약: 뿅뿅 원피스 입고 예정일 06/06입니다.\n상세: 예정일 2026-06-06 (D-89)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-09T13:33:00.351Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- c6ad998e-54cf-4eb0-8e66-7212efbfd382 POLICY_DECISION (2026-03-09T13:33:00.181+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:33:00.181Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "뿅뿅 원피스"
    }
- f19af056-5285-4fb5-a4e8-505ef728ecb0 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:00+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:00.000Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 68d86ca1-5a64-4579-9ad0-1cb5c6906cc1 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:32:59.817+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 1f891eb6-c877-4e19-ad56-7b80b4ef2eec RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:32:59.441+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6c61f374-c360-4bc2-becf-467b7717ac6f",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- c16cc16a-1ef7-40bb-a9fb-4adf69ad31c8 END_USER_WRITE_LATENCY (2026-03-09T13:32:58.768+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "duration_ms": 3224
    }
- f7e03e92-4a65-4867-bde6-a0a1daffc177 END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:32:58.591+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 2,
      "keys_truncated": false
    }
- 4be894c8-ab4f-4fff-8a24-147f184d855a END_USER_CONTEXT_RESOLVED (2026-03-09T13:32:56.209+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
- 7025c097-7d41-4564-a138-8c5ad4fde88e END_USER_MATCH_HIT (2026-03-09T13:32:56.045+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 9efe49c2-097d-4899-84ca-58aec3a4d5be PRE_MCP_DECISION (2026-03-09T13:32:55.001+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:55.001Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "원피스 재입고 언제되나요?",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 23387c4c-d081-4901-9ed5-a67be30f91fb INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:32:54.652+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.652Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- e1ed3a64-d45e-4cec-8cd4-22f4eeea1cf1 POLICY_DECISION (2026-03-09T13:32:54.487+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.486Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 4ee267a0-428e-4788-a7ea-88bb7e7f75fb INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:32:54.318+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:54.318Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- b82679ff-d026-4aa4-9230-fc032c02e7d7 SLOT_EXTRACTED (2026-03-09T13:32:54.149+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
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
        "recorded_at": "2026-03-09T13:32:54.149Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "원피스 재입고 언제되나요?"
      }
    }
- 81e5b9b8-e634-491e-a81a-b2e95e0ca778 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:32:52.325+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:52.325Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 0a05c41e-2f99-4972-8458-2fcfc8126f75 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:32:51.686+00:00) (turn_id=6c61f374-c360-4bc2-becf-467b7717ac6f)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:32:51.684Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: ab69a1dd-a3f4-420c-83bd-840b15b66dec

[TOKEN_USED]

USER:
재입고 알림 신청

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms
확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms\n확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- ba7a8dca-f013-4d0f-8ef4-df15a8f665ed (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec) (2026-03-09T13:33:20.674+00:00)
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
        "recorded_at": "2026-03-09T13:33:20.491Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "reset_by_restock_intent"
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 0360bb74-96a5-4ae6-ba37-7de1c2246005 QUICK_REPLY_RULE_DECISION (2026-03-09T13:33:25.685+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:known_info_reuse_prompt",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "runInputStageRuntime"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 8fc740cf-67c7-452c-853a-f7b5b91de458 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:33:25.512+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "product_name",
        "reuse_slot",
        "reuse_value"
      ],
      "delta": {
        "channel": "sms",
        "reuse_slot": "phone",
        "reuse_value": "01093107159",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:25.512Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- 09fed5c4-82f0-4b42-9370-9969f51ec08e RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:33:25.349+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 50d20022-f296-44d4-9cfd-8f9c76f4862b RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:33:24.981+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "ab69a1dd-a3f4-420c-83bd-840b15b66dec",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- 11e8605c-cc10-4691-b726-76554f4ea248 END_USER_WRITE_LATENCY (2026-03-09T13:33:24.311+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "duration_ms": 3469
    }
- df49840a-2340-4414-aa49-0cd8dc5a748b END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:33:24.148+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "keys": [
        "channel",
        "reuse_slot",
        "reuse_value",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 4,
      "keys_truncated": false
    }
- c539b8bb-3ec8-4d20-a470-c4ab9c7be791 END_USER_CONTEXT_RESOLVED (2026-03-09T13:33:21.504+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
- f4497a39-7fb6-479f-870e-3210d8cd9035 END_USER_MATCH_HIT (2026-03-09T13:33:21.325+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- f80af1cd-d819-4b52-aabb-d877bbb64335 SLOT_EXTRACTED (2026-03-09T13:33:20.324+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
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
        "recorded_at": "2026-03-09T13:33:20.324Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 8d623522-45ee-4efc-b426-3392ed27d3b6 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:33:18.137+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:18.137Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- 99f58dd0-5d33-42d7-bd35-e3db2d64079e INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:33:17.964+00:00) (turn_id=ab69a1dd-a3f4-420c-83bd-840b15b66dec)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:33:17.964Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: f7d40759-f6a3-4c14-9dc6-decaa3b8193c

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159
확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)
선택 가능: D-1, D-2, D-3, D-7, D-14
예) 1,2,3
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 4415e3b8-95d2-4db0-a379-05b00f0c7d73 (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c) (2026-03-09T13:34:13.736+00:00)
  prefix_json:
    {
      "slot": {
        "phone": "01093107159",
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.548Z",
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
        "derived_phone": "01093107159",
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "pre_turn_guard"
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 9cafa9b3-3b01-4ee4-8193-c59344bc5cb5 QUICK_REPLY_RULE_DECISION (2026-03-09T13:34:19.656+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- ed191c2c-086b-426b-8761-beb0d195206c FINAL_ANSWER_READY (2026-03-09T13:34:19.473+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "model": "deterministic_restock_subscribe_lead_days",
      "answer": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-03-09T13:34:19.473Z",
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
- 168609c0-50eb-4c54-a4b8-88eb231c7377 POLICY_DECISION (2026-03-09T13:34:19.298+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "recorded_at": "2026-03-09T13:34:19.298Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_id": null,
      "min_required": 1
    }
- a6fd8690-e2dc-4938-8189-5dc1f112e67c CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:34:19.116+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "product_name",
        "channel",
        "phone"
      ],
      "delta": {
        "phone": "01093107159",
        "channel": "sms",
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:19.116Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- 6354a289-285f-4826-bf1e-71af4ba8f207 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:34:18.941+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 23c8ff87-662f-4f04-a052-6c13db024b64 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:34:18.455+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f7d40759-f6a3-4c14-9dc6-decaa3b8193c",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- ff9c3450-aa9a-4b4b-98d5-4a9b8ca1529c END_USER_WRITE_LATENCY (2026-03-09T13:34:17.761+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "duration_ms": 3850
    }
- 8e255bcc-0e3f-4bba-a34d-c2f74718082d END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:34:17.592+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "keys": [
        "phone",
        "channel",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 3,
      "keys_truncated": false
    }
- bb97e2c4-2b78-4f01-8023-551ec483d129 END_USER_CONTEXT_RESOLVED (2026-03-09T13:34:14.643+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- aaf43135-0e3d-4016-8901-b2ea22ba86b1 END_USER_MATCH_HIT (2026-03-09T13:34:14.463+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
- dec0c6a2-6144-4490-ac7b-c6e96731e924 PRE_MCP_DECISION (2026-03-09T13:34:13.376+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:13.376Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "네",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 35d28311-e047-47cd-8bb6-82e07dbe9542 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:34:13.035+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:13.035Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- cd2078d9-634b-4ef2-a9b3-50011ae24cc3 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:34:12.864+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.864Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 5db2c8b4-7be5-4c24-857f-11ed92188a2f SLOT_EXTRACTED (2026-03-09T13:34:12.695+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
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
        "intent": "restock_subscribe",
        "address": null,
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
        "recorded_at": "2026-03-09T13:34:12.695Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 28480fe2-209f-4b90-bc2f-6786e18e665a INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-09T13:34:12.518+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "pre_turn_guard",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.518Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": null,
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- c80bb2f8-978f-482f-8975-b7027f81fbd5 INPUT_CONTRACT_REVIEW_STARTED (2026-03-09T13:34:12.351+00:00) (turn_id=f7d40759-f6a3-4c14-9dc6-decaa3b8193c)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:12.351Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: 6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d

[TOKEN_USED]

USER:
14

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159
확인할 것: 선택하신 D-14부터 sms로 알림을 받을까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 수신 번호 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 선택하신 D-14부터 sms로 알림을 받을까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 수신 번호 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- c8df82e9-1766-4646-bcfd-4c9ab5510396 (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d) (2026-03-09T13:34:27.493+00:00)
  prefix_json:
    {
      "slot": {
        "phone": "01093107159",
        "phone_masked": "*******7159",
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
        "recorded_at": "2026-03-09T13:34:27.324Z",
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
        "input_length": 2,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 36f6208d-b40c-4fe6-aff0-8c7cfe796601 QUICK_REPLY_RULE_DECISION (2026-03-09T13:34:33.015+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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
- 89e5a2a2-7ce8-4f27-8bc1-1a5574056fa5 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-09T13:34:32.848+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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
          14
        ],
        "product_name": "뿅뿅 원피스"
      },
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:32.848Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- d7394196-0a12-4ecc-920b-27a77ac83d11 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:34:32.688+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 705ef494-20a2-438a-b34e-5f613ae44a5d RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:34:32.09+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- 1a5b4754-c6da-4f26-b51a-bba151e0e689 END_USER_WRITE_LATENCY (2026-03-09T13:34:31.397+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "duration_ms": 3732
    }
- c44e9076-5a75-47d5-a15b-f98d5d3f8c2d END_USER_CONFIRMED_ENTITY_SAVED (2026-03-09T13:34:31.223+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
  payload:
    {
      "keys": [
        "channel",
        "lead_days",
        "product_name"
      ],
      "flow_id": "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
      "key_count": 3,
      "keys_truncated": false
    }
- 4c6c7854-b6c7-48a1-8322-82ce5ff459ce END_USER_CONTEXT_RESOLVED (2026-03-09T13:34:28.35+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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
- ccdcfd89-ede4-4079-b7f0-64fd22a94c1d END_USER_MATCH_HIT (2026-03-09T13:34:28.183+00:00) (turn_id=6eaaeba8-2e7a-4b6b-84ff-f26245c0c03d)
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


TURN_ID: 7f198f39-ac28-4e53-b4a2-ad199f9e58d3

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159
확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.
상세: 상품 뿅뿅 원피스 / 채널 sms
입고 예정: 06/06 (D-89)
현재 상태: 재고 수량 확인 필요
KB 정책: 별도 재입고 정책 없음
다음 선택: 대화 종료 / 다른 문의
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 뿅뿅 원피스 / 채널 sms\n입고 예정: 06/06 (D-89)\n현재 상태: 재고 수량 확인 필요\nKB 정책: 별도 재입고 정책 없음\n다음 선택: 대화 종료 / 다른 문의\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 16b98351-7fb9-42fd-99cf-2626fcdc28e5 (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3) (2026-03-09T13:34:41.601+00:00)
  prefix_json:
    {
      "slot": {
        "phone": "01093107159",
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
        "recorded_at": "2026-03-09T13:34:41.427Z",
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
          "confirm"
        ],
        "expected_input_prev": "confirm",
        "expected_input_stage": "restock.awaiting_confirm",
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
- 3fb6adff-8329-41c8-8d24-4986c3e059e0 QUICK_REPLY_RULE_DECISION (2026-03-09T13:34:54.459+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "restock:post_subscribe_next_step",
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
- 4ad2bb33-de79-428d-9834-4480f0c2e873 POLICY_DECISION (2026-03-09T13:34:54.292+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "stage": "tool",
      "action": "RESTOCK_SUBSCRIBE_LITE",
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
        "recorded_at": "2026-03-09T13:34:54.292Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "scheduled_count": 1,
      "notification_ids": [
        "8f412b32-6a67-4e19-bf39-750b06643b9f"
      ]
    }
- ddef68e6-7709-4131-bea2-9fa1c6034678 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-09T13:34:54.132+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7f198f39-ac28-4e53-b4a2-ad199f9e58d3",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "proposal_count": 2,
      "violation_count": 2,
      "deduped_violation_count": 0
    }
- c79d98a2-bda2-4677-acd3-a8385f850055 RUNTIME_PATCH_PROPOSAL_CREATED (2026-03-09T13:34:53.955+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "title": "External action lifecycle outcome audit proposal",
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "status": "pending",
      "trigger": "runtime_turn_write",
      "turn_id": "7f198f39-ac28-4e53-b4a2-ad199f9e58d3",
      "rationale": "Lifecycle evidence gap (missing_completed=-, outcomes=RESTOCK_SMS_SCHEDULED)",
      "confidence": 0.7,
      "created_at": "2026-03-09T13:34:53.788Z",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "why_failed": "Completion-like user answer was emitted while external action lifecycle evidence was incomplete (STARTED/COMPLETED/outcome mismatch).",
      "change_plan": [
        "Define a shared action lifecycle registry with event stem, start/completion events, and terminal outcomes.",
        "At completion-like final response branch, verify lifecycle evidence deterministically before rendering completion text.",
        "Emit normalized ACTION_* lifecycle events for non-MCP external integrations, not only SMS."
      ],
      "proposal_id": "rp_1773063291744_tr8huw",
      "target_files": [
        "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
        "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
        "src/app/api/runtime/governance/selfHeal/principles.ts"
      ],
      "violation_id": "pv_437cc6a8-2e61-4d11-b9ee-66ee6927910a_7f198f39-ac28-4e53-b4a2-ad199f9e58d3_actionlifecycle_outcome_missing",
      "principle_key": "action.enforceLifecycleOutcomeAudit",
      "runtime_scope": "chat",
      "how_to_improve": "Enforce generic action lifecycle contract: STARTED -> COMPLETED and terminal outcome event before completion-like response.",
      "self_heal_gate": {
        "track": "contract",
        "gate_version": "v1",
        "exception_stats": {
          "repeat_count_7d": 0,
          "repeat_count_30d": 21
        },
        "promotion_reason": "-",
        "contract_fields_ok": false,
        "promotion_required": false,
        "exception_fields_ok": false,
        "evidence_contract_ok": false,
        "case_specific_signals": [],
        "exception_fingerprint": "ex:action.enforcelifecycleoutcomeaudit:actionlifecycle_outcome_missing:external_response_not_received:restock_sms_dispatch",
        "missing_contract_fields": [
          "contract_scope",
          "generalization_scope",
          "slot_request_mapping_strategy",
          "response_projection_strategy",
          "pre_post_invariant_strategy",
          "contract_expectation"
        ],
        "missing_evidence_fields": [
          "missing_completed_for_started"
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
      "issue_fingerprint": "action.enforcelifecycleoutcomeaudit|chat|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.||||"
    }
- 7e65e656-8397-404f-8659-ed06d7370872 PRINCIPLE_VIOLATION_DETECTED (2026-03-09T13:34:53.788+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "summary": "External action completion-like answer was produced without deterministic action STARTED/COMPLETED/outcome evidence.",
      "trigger": "runtime_turn_write",
      "evidence": {
        "tool_name": "restock_sms_dispatch",
        "intent_name": "restock_subscribe",
        "final_answer": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 뿅뿅 원피스 / 채널 sms\n입고 예정: 06/06 (D-89)\n현재 상태: 재고 수량 확인 필요\nKB 정책: 별도 재입고 정책 없음\n다음 선택: 대화 종료 / 다른 문의\n그 다음으로 확인할 것: 알림 시작일 선택",
        "mismatch_type": "external_response_not_received",
        "completion_claimed": true,
        "context_action_ids": [
          "1741bd0f-6a7c-48d5-b06e-7d737151a0a5",
          "8f412b32-6a67-4e19-bf39-750b06643b9f"
        ],
        "outcome_event_types": [
          "RESTOCK_SMS_SCHEDULED"
        ],
        "started_event_types": [
          "RESTOCK_SUBSCRIBE_DISPATCH_STARTED"
        ],
        "external_ack_missing_ids": [],
        "external_ack_missing_count": 1,
        "mcp_terminal_outcome_present": false,
        "missing_completed_for_started": []
      },
      "severity": "high",
      "violation_id": "pv_437cc6a8-2e61-4d11-b9ee-66ee6927910a_7f198f39-ac28-4e53-b4a2-ad199f9e58d3_actionlifecycle_outcome_missing",
      "principle_key": "action.enforceLifecycleOutcomeAudit",
      "runtime_scope": "chat",
      "baseline_source": "src/app/api/runtime/chat/policies/principles.ts",
      "issue_fingerprint": "action.enforcelifecycleoutcomeaudit|chat|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.||||"
    }
- 03923830-51c9-4fbd-b628-0977f0e7f22e RUNTIME_PATCH_PROPOSAL_CREATED (2026-03-09T13:34:51.118+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "title": "Notification delivery outcome audit proposal",
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "status": "pending",
      "trigger": "runtime_turn_write",
      "turn_id": "7f198f39-ac28-4e53-b4a2-ad199f9e58d3",
      "rationale": "Delivery audit gap (notification_ids=1, outcomes=RESTOCK_SMS_SCHEDULED)",
      "confidence": 0.7,
      "created_at": "2026-03-09T13:34:50.927Z",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "why_failed": "Subscribe completion was returned without deterministic delivery STARTED/COMPLETED boundary evidence and/or outcome events.",
      "change_plan": [
        "Emit RESTOCK_SUBSCRIBE_DISPATCH_STARTED before Solapi send/register and RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED after persistence.",
        "Persist message_id -> delivery outcome (RESTOCK_SMS_SENT/SCHEDULED/FAILED) linkage for each notification id.",
        "Surface deterministic failure reason in audit payload when completion message is generated."
      ],
      "proposal_id": "rp_1773063286375_4oy6uw",
      "target_files": [
        "src/app/api/runtime/chat/services/restockSubscriptionRuntime.ts",
        "src/app/api/runtime/restock/dispatch/route.ts",
        "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "src/app/api/runtime/governance/_lib/detector.ts"
      ],
      "violation_id": "pv_437cc6a8-2e61-4d11-b9ee-66ee6927910a_7f198f39-ac28-4e53-b4a2-ad199f9e58d3_notificationdelivery_outcome_audit_missing",
      "principle_key": "notification.enforceDeliveryOutcomeAudit",
      "runtime_scope": "chat",
      "how_to_improve": "Write delivery lifecycle audit pair and outcome evidence in runtime path and dispatch path before/after final completion guidance.",
      "self_heal_gate": {
        "track": "contract",
        "gate_version": "v1",
        "exception_stats": {
          "repeat_count_7d": 0,
          "repeat_count_30d": 21
        },
        "promotion_reason": "-",
        "contract_fields_ok": false,
        "promotion_required": false,
        "exception_fields_ok": false,
        "evidence_contract_ok": true,
        "case_specific_signals": [],
        "exception_fingerprint": "ex:notification.enforcedeliveryoutcomeaudit:notificationdelivery_outcome_audit_missing:external_response_not_received:restock_sms_dispatch",
        "missing_contract_fields": [
          "contract_scope",
          "generalization_scope",
          "slot_request_mapping_strategy",
          "response_projection_strategy",
          "pre_post_invariant_strategy",
          "contract_expectation"
        ],
        "missing_evidence_fields": [],
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
      "issue_fingerprint": "notification.enforcedeliveryoutcomeaudit|chat|notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.|notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.||||"
    }
- 4d5bf9f2-863a-4ef7-8c1b-0a66a67cb194 PRINCIPLE_VIOLATION_DETECTED (2026-03-09T13:34:50.929+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "summary": "Notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.",
      "trigger": "runtime_turn_write",
      "evidence": {
        "tool_name": "restock_sms_dispatch",
        "intent_name": "restock_subscribe",
        "final_answer": "확인한 것: 상품 뿅뿅 원피스, 연락 채널 sms, 연락처 *******7159\n확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 뿅뿅 원피스 / 채널 sms\n입고 예정: 06/06 (D-89)\n현재 상태: 재고 수량 확인 필요\nKB 정책: 별도 재입고 정책 없음\n다음 선택: 대화 종료 / 다른 문의\n그 다음으로 확인할 것: 알림 시작일 선택",
        "mismatch_type": "external_response_not_received",
        "notification_ids": [
          "8f412b32-6a67-4e19-bf39-750b06643b9f"
        ],
        "external_ack_missing_ids": [],
        "external_ack_missing_count": 1,
        "external_ack_received_count": 0,
        "delivery_outcome_event_types": [
          "RESTOCK_SMS_SCHEDULED"
        ],
        "delivery_started_event_present": true,
        "delivery_completed_event_present": true
      },
      "severity": "high",
      "violation_id": "pv_437cc6a8-2e61-4d11-b9ee-66ee6927910a_7f198f39-ac28-4e53-b4a2-ad199f9e58d3_notificationdelivery_outcome_audit_missing",
      "principle_key": "notification.enforceDeliveryOutcomeAudit",
      "runtime_scope": "chat",
      "baseline_source": "src/app/api/runtime/chat/policies/principles.ts",
      "issue_fingerprint": "notification.enforcedeliveryoutcomeaudit|chat|notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.|notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.||||"
    }
- 7ea981cb-0afd-497b-adfd-fe0fa7c51649 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-09T13:34:45.342+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7f198f39-ac28-4e53-b4a2-ad199f9e58d3",
      "session_id": "437cc6a8-2e61-4d11-b9ee-66ee6927910a",
      "config_source": "principles_default"
    }
- b47c83eb-9735-4ae5-bc42-68836fb539a7 END_USER_WRITE_LATENCY (2026-03-09T13:34:44.695+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "duration_ms": 2923
    }
- 59a5b261-08a8-42a2-b925-ac35d37da95a END_USER_CONTEXT_RESOLVED (2026-03-09T13:34:42.417+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
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
- 6647ff77-4f35-461f-a8e4-7222cfb0d751 END_USER_MATCH_HIT (2026-03-09T13:34:42.259+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
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
- 52eccc5f-4f17-4373-8de7-175eff7ea1ed RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED (2026-03-09T13:34:41.262+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "outcomes": [
        {
          "id": "8f412b32-6a67-4e19-bf39-750b06643b9f",
          "reason": null,
          "status": "scheduled"
        }
      ],
      "sent_count": 0,
      "failed_count": 0,
      "scheduled_count": 1,
      "notification_ids": [
        "8f412b32-6a67-4e19-bf39-750b06643b9f"
      ],
      "external_provider": "solapi",
      "external_action_name": "restock_sms_dispatch",
      "external_ack_required": true
    }
- 70794c3d-1b93-425a-9df3-8107bb7931ac RESTOCK_SMS_SCHEDULED (2026-03-09T13:34:41.094+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "bypass": false,
      "channel": "sms",
      "message_id": "8f412b32-6a67-4e19-bf39-750b06643b9f",
      "phone_masked": "010****7159",
      "bypass_reason": null,
      "scheduled_for": "2026-05-23T08:00:00.000Z",
      "external_ack_id": null,
      "notification_id": "8f412b32-6a67-4e19-bf39-750b06643b9f",
      "external_provider": "solapi",
      "solapi_message_id": null,
      "external_action_name": "restock_sms_dispatch",
      "external_ack_received": false,
      "external_ack_required": true,
      "provider_response_received": false
    }
- b02d1579-0839-4d40-95eb-ed7ab98de632 RESTOCK_SUBSCRIBE_DISPATCH_STARTED (2026-03-09T13:34:40.543+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "channel": "sms",
      "bypass_enabled": "false",
      "scheduled_count": 1,
      "notification_ids": [
        "8f412b32-6a67-4e19-bf39-750b06643b9f"
      ],
      "external_provider": "solapi",
      "external_action_name": "restock_sms_dispatch",
      "external_ack_required": true
    }
- a255d5e2-e200-45cc-9693-c1eb07bd2f9c PRE_MCP_DECISION (2026-03-09T13:34:40.21+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "*******7159"
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
        "recorded_at": "2026-03-09T13:34:40.210Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "네",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- e9218cc1-1cc3-4b7f-ae03-dbbc04e9ac74 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-09T13:34:39.858+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:39.858Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- b52ae516-5457-4273-bbab-1fe4a5b7d765 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-09T13:34:39.679+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-09T13:34:39.679Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "confirm"
    }
- 5f07444d-3cf8-4e3f-a9ce-c8a5a8d66995 SLOT_EXTRACTED (2026-03-09T13:34:39.516+00:00) (turn_id=7f198f39-ac28-4e53-b4a2-ad199f9e58d3)
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
        "intent": "restock_subscribe",
        "address": null,
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
        "recorded_at": "2026-03-09T13:34:39.516Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "confirm",
      "resolved_slots": {}
    }
