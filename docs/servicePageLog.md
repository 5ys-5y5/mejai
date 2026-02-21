디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): solapi:send_otp, solapi:verify_otp
기대 목록(Event): QUICK_REPLY_RULE_DECISION, FINAL_ANSWER_READY, POLICY_DECISION, CONFIRMED_ENTITY_DELTA_APPLIED, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONFIRMED_ENTITY_SAVED, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_HIT, PRE_MCP_DECISION, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED, RUNTIME_PATCH_PROPOSAL_CREATED, PRINCIPLE_VIOLATION_DETECTED, RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED, RESTOCK_SMS_SCHEDULED, RESTOCK_SUBSCRIBE_DISPATCH_STARTED, AUTH_GATE_TRIGGERED, AUTH_GATE_PRECHECK, EXECUTION_GUARD_TRIGGERED
기대 목록(Debug): NO_TOOL_CALLED, send_otp, verify_otp

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: mcp.solapi:send_otp, mcp.solapi:verify_otp, event.QUICK_REPLY_RULE_DECISION, event.FINAL_ANSWER_READY, event.POLICY_DECISION, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONFIRMED_ENTITY_SAVED, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_HIT, event.PRE_MCP_DECISION, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, event.RUNTIME_PATCH_PROPOSAL_CREATED, event.PRINCIPLE_VIOLATION_DETECTED, event.RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED, event.RESTOCK_SMS_SCHEDULED, event.RESTOCK_SUBSCRIBE_DISPATCH_STARTED, event.AUTH_GATE_TRIGGERED, event.AUTH_GATE_PRECHECK, event.EXECUTION_GUARD_TRIGGERED, debug.NO_TOOL_CALLED, debug.send_otp, debug.verify_otp, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec

[TOKEN_USED]

USER:
유린기 재입고 일정을 알고 싶어요

BOT:
확인한 것: 유린기 재입고 일정을 알고 싶어요
확인할 것: 요약: 유린기 입고 예정일 05/02입니다.
상세: 예정일 2026-05-02 (D-70)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 유린기 재입고 일정을 알고 싶어요\n확인할 것: 요약: 유린기 입고 예정일 05/02입니다.\n상세: 예정일 2026-05-02 (D-70)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
- e7528871-0c35-432a-b180-fc98f36cd8c2 (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec) (2026-02-21T03:32:31.355+00:00)
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
        "llm": "chatgpt",
        "name": "Labolatory"
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
        "recorded_at": "2026-02-21T03:32:31.082Z",
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
          "solapi",
          "juso"
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 18,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- d22354c3-5aa9-41ad-befd-48d0d63e1558 QUICK_REPLY_RULE_DECISION (2026-02-21T03:32:39.401+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
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
- ad78f68b-79a4-4b5b-a3ae-77531011c46a FINAL_ANSWER_READY (2026-02-21T03:32:39.134+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 유린기 재입고 일정을 알고 싶어요\n확인할 것: 요약: 유린기 입고 예정일 05/02입니다.\n상세: 예정일 2026-05-02 (D-70)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-02-21T03:32:39.134Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- 38fd3140-f341-4919-87b1-142bfe48d13a POLICY_DECISION (2026-02-21T03:32:38.865+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
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
        "recorded_at": "2026-02-21T03:32:38.865Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "유린기"
    }
- bfc8b840-f602-418f-a003-7f0cf078414a CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:32:38.599+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "유린기"
      },
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:32:38.599Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 62ac2d00-efdf-4d4c-b85a-56e03089129c RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:32:38.335+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 3b9166ec-aa80-4680-abb8-4aaf138a0bcd RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:32:37.775+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- 508b7e5e-93e7-482b-b6cc-f3eb643363e3 END_USER_WRITE_LATENCY (2026-02-21T03:32:36.7+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "duration_ms": 5067
    }
- 9f359b6e-14d5-488d-a5d4-433c16e174fb END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:32:36.436+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "key_count": 2,
      "keys_truncated": false
    }
- 19c83f6e-1f6f-4f12-9cd2-1ea3315598f4 END_USER_CONTEXT_RESOLVED (2026-02-21T03:32:32.695+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
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
- 8a2b15e3-dd3e-41aa-948a-3081d43bfd98 END_USER_MATCH_HIT (2026-02-21T03:32:32.431+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 3f8c55b4-4c6d-4f00-819e-7b2640f12990 PRE_MCP_DECISION (2026-02-21T03:32:30.813+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
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
        "recorded_at": "2026-02-21T03:32:30.813Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "유린기 재입고 일정을 알고 싶어요",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "유린기 재입고 일정을 알고 싶어요"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- 023a6a46-932a-4831-8376-2e004b1eb4e4 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:32:30.273+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:32:30.273Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "유린기 재입고 일정을 알고 싶어요"
      }
    }
- 509d4368-e008-494d-a5d1-a245c9834b43 POLICY_DECISION (2026-02-21T03:32:30.007+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
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
        "recorded_at": "2026-02-21T03:32:30.007Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "유린기 재입고 일정을 알고 싶어요"
      }
    }
- acde84b5-d57c-4b35-a64f-49368a5900c2 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:32:29.738+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:32:29.738Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 6572cf3f-cf02-4381-b651-3117198e04a2 SLOT_EXTRACTED (2026-02-21T03:32:29.464+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
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
        "recorded_at": "2026-02-21T03:32:29.464Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "유린기 재입고 일정을 알고 싶어요"
      }
    }
- bf9e4f0e-7ddf-42bf-9390-676b605f725f INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T03:32:27.528+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:32:27.528Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 4a9d44e7-8d1a-4507-8c3a-dd5233d89a8e INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T03:32:27.259+00:00) (turn_id=cc8d5764-cb64-42cb-95d1-dbd8cdb4e7ec)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:32:27.259Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: dbc68735-7d72-49a3-bfeb-63c6d31d0caa

[TOKEN_USED]

USER:
재입고 알림 신청

BOT:
확인한 것: 상품 유린기, 연락 채널 sms
확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 유린기, 연락 채널 sms\n확인할 것: 이전에 알려주신 연락처(01093107159)로 진행할까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 시작일 선택",
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
- 46565b44-d745-4e9b-ab7f-01acf6d3c1ca (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa) (2026-02-21T03:47:27.298+00:00)
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
        "recorded_at": "2026-02-21T03:47:27.033Z",
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 96e5a1e3-177c-40ce-90ba-e8bff57ab27a QUICK_REPLY_RULE_DECISION (2026-02-21T03:47:36.117+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
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
- d4b6b5b7-6eed-4e23-b40e-a72131a968a5 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:47:35.844+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
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
        "product_name": "유린기"
      },
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:47:35.844Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- eae8e775-0735-4fa6-a293-662bc5fd2fe6 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:47:35.588+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "dbc68735-7d72-49a3-bfeb-63c6d31d0caa",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 23f51a30-7489-45e5-8ea3-4bc801a080ca RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:47:35.031+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "dbc68735-7d72-49a3-bfeb-63c6d31d0caa",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- 80be273b-b12e-44b6-943f-33b0a72f4430 END_USER_WRITE_LATENCY (2026-02-21T03:47:33.924+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
  payload:
    {
      "duration_ms": 6342
    }
- 7ba24fad-d3f2-435e-925e-38734532a466 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:47:33.649+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
  payload:
    {
      "keys": [
        "channel",
        "reuse_slot",
        "reuse_value",
        "product_name"
      ],
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "key_count": 4,
      "keys_truncated": false
    }
- 4b057bea-63d7-4931-8648-1cf134d3d4ec END_USER_CONTEXT_RESOLVED (2026-02-21T03:47:28.846+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
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
- 0c737796-b044-4fc0-91dd-f24b5c20390a END_USER_MATCH_HIT (2026-02-21T03:47:28.588+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 24058814-4c5f-492d-9f3d-67cc446e9c0c SLOT_EXTRACTED (2026-02-21T03:47:26.761+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
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
        "recorded_at": "2026-02-21T03:47:26.760Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- d509f096-8c44-440e-a89d-2aa7df32f900 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T03:47:25.026+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:47:25.026Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- b312d11f-2d5f-43ab-bfdc-f42370488bbe INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T03:47:24.76+00:00) (turn_id=dbc68735-7d72-49a3-bfeb-63c6d31d0caa)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:47:24.760Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_inquiry",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: 3fad8024-0b41-427c-9e85-486ac10d5756

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159
확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)
선택 가능: D-1, D-2, D-3, D-7, D-14
예) 1,2,3
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=choice, choice_mode=multi, quick_replies=5, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
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
- 92aa5fd7-afb1-48ed-9c25-3b61a790a19b (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756) (2026-02-21T03:47:52.631+00:00)
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
        "recorded_at": "2026-02-21T03:47:52.361Z",
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 51a72d8f-d230-4563-9748-85c762eea415 QUICK_REPLY_RULE_DECISION (2026-02-21T03:48:01.473+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
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
- 3da72ec3-c9db-4415-850a-aa99112f3700 FINAL_ANSWER_READY (2026-02-21T03:48:01.206+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "model": "deterministic_restock_subscribe_lead_days",
      "answer": "확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159\n확인할 것: 재입고 알림을 언제부터 받을까요? (최소 1일 전)\n선택 가능: D-1, D-2, D-3, D-7, D-14\n예) 1,2,3\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-02-21T03:48:01.206Z",
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
- 227abb40-4526-4faa-b94b-247c50db9dbe POLICY_DECISION (2026-02-21T03:48:00.952+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
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
        "recorded_at": "2026-02-21T03:48:00.952Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_id": null,
      "min_required": 1
    }
- f1459521-a05f-424a-99d6-fa952a6202a7 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:48:00.688+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
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
        "product_name": "유린기"
      },
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:48:00.688Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- b684c7ca-823a-4883-b254-c63bb6352f8a RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:48:00.427+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "3fad8024-0b41-427c-9e85-486ac10d5756",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 9e96f83b-257e-4d4c-b508-7ab5a29df4cf RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:47:59.805+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "3fad8024-0b41-427c-9e85-486ac10d5756",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- 7e1feabb-0da8-4419-a739-952f672e8a64 END_USER_WRITE_LATENCY (2026-02-21T03:47:58.749+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "duration_ms": 5836
    }
- 9469632b-b8f2-4430-9774-21ac543b93fc END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:47:58.489+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "keys": [
        "phone",
        "channel",
        "product_name"
      ],
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "key_count": 3,
      "keys_truncated": false
    }
- 2cc8ae45-2d61-401d-9eb6-99920cc3f620 END_USER_CONTEXT_RESOLVED (2026-02-21T03:47:53.967+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
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
- 032d017d-eaea-40a0-8907-c8734a50fdd1 END_USER_MATCH_HIT (2026-02-21T03:47:53.703+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
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
- 18af76e9-26a7-4ef3-a885-0d3f7c22708b PRE_MCP_DECISION (2026-02-21T03:47:52.096+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
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
        "recorded_at": "2026-02-21T03:47:52.096Z",
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
- 5ac9407a-03b0-438d-b794-d546e6ced0c9 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:47:51.54+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:47:51.540Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 91208077-5815-4216-bdb8-3fa99b57ffa1 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:47:51.273+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:47:51.273Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- cbd6921d-ba31-44e0-99d3-db8bf30884a8 SLOT_EXTRACTED (2026-02-21T03:47:51.009+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
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
        "recorded_at": "2026-02-21T03:47:51.008Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {}
    }
- 2264ab3f-88db-4f74-9a0a-26d662de0bb7 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T03:47:50.745+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "source": "pre_turn_guard",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:47:50.745Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": null,
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }
- 5fa9b58e-82a2-4230-b664-ac59aad5f46f INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T03:47:50.489+00:00) (turn_id=3fad8024-0b41-427c-9e85-486ac10d5756)
  payload:
    {
      "source": "contract_stage",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:47:50.489Z",
        "function_name": "unknown"
      },
      "intent_name": "restock_subscribe",
      "expected_input": "confirm",
      "expected_inputs": [
        "confirm"
      ],
      "expected_input_stage": "restock.awaiting_confirm"
    }


TURN_ID: 11b7fa0e-267c-4dfe-85bc-76f90fc46e3c

[TOKEN_USED]

USER:
2

BOT:
확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159
확인할 것: 선택하신 D-2부터 sms로 알림을 받을까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 알림 수신 번호 확인
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159\n확인할 것: 선택하신 D-2부터 sms로 알림을 받을까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 알림 수신 번호 확인",
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
- 20ab2e16-d379-4c84-b0ba-34a8c40c13a4 (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c) (2026-02-21T03:48:07.815+00:00)
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
        "recorded_at": "2026-02-21T03:48:07.548Z",
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- f3de622e-ccbd-4475-87ad-fada2fa2886b QUICK_REPLY_RULE_DECISION (2026-02-21T03:48:16.232+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
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
- a1d4f542-05ad-4695-b594-019efc2b5b46 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:48:15.953+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
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
          2
        ],
        "product_name": "유린기"
      },
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:48:15.953Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- 4149c63c-a547-4a7a-9ef8-d22fab8d22cc RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:48:15.681+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "11b7fa0e-267c-4dfe-85bc-76f90fc46e3c",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- e61d7888-6d75-4309-b063-ce4c12400f93 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:48:15.052+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "11b7fa0e-267c-4dfe-85bc-76f90fc46e3c",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- b8e15e15-4cc6-49a4-9ba7-311099f521c0 END_USER_WRITE_LATENCY (2026-02-21T03:48:13.985+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
  payload:
    {
      "duration_ms": 5897
    }
- 8aac1f1c-a463-4fc6-a85b-540c0d45aa51 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:48:13.711+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
  payload:
    {
      "keys": [
        "channel",
        "lead_days",
        "product_name"
      ],
      "flow_id": "1efc6fba-81c8-4e30-a92a-e92a0391830b",
      "key_count": 3,
      "keys_truncated": false
    }
- 3009a40e-4be1-4d5c-b8cd-5c8009bd1d2a END_USER_CONTEXT_RESOLVED (2026-02-21T03:48:09.165+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
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
- 51f079ac-fc9a-43ce-b6e6-7d2e1cbc20f7 END_USER_MATCH_HIT (2026-02-21T03:48:08.89+00:00) (turn_id=11b7fa0e-267c-4dfe-85bc-76f90fc46e3c)
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


TURN_ID: e7f7564a-b2d3-4ecd-aa75-67bfee6a2005

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159
확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.
상세: 상품 유린기 / 채널 sms
입고 예정: 05/02 (D-70)
현재 상태: 재고 수량 확인 필요
KB 정책: 별도 재입고 정책 없음
다음 선택: 대화 종료 / 다른 문의
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159\n확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 유린기 / 채널 sms\n입고 예정: 05/02 (D-70)\n현재 상태: 재고 수량 확인 필요\nKB 정책: 별도 재입고 정책 없음\n다음 선택: 대화 종료 / 다른 문의\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "single"
    },
    "quick_replies": [
      {
        "label": "대화 종료",
        "value": "action:end_conversation"
      },
      {
        "label": "다른 문의",
        "value": "action:other_inquiry"
      }
    ],
    "cards": []
  }
RENDER_PLAN: view=choice, quick_replies=true, cards=false, mode=single, min=1, max=1, submit=single, prompt=restock_post_subscribe
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
    "prompt_kind": "restock_post_subscribe",
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
- 79b43f87-f215-463b-982b-8584638c6600 (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005) (2026-02-21T03:51:19.139+00:00)
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
        "recorded_at": "2026-02-21T03:51:18.875Z",
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 650e3574-5fdc-434b-842d-1fc645c4fb98 QUICK_REPLY_RULE_DECISION (2026-02-21T03:51:44.513+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
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
- 0c0f07ed-0098-4906-b1a6-b498b336589c POLICY_DECISION (2026-02-21T03:51:44.243+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
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
        "recorded_at": "2026-02-21T03:51:44.243Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "scheduled_count": 1,
      "notification_ids": [
        "3fe95b53-1f02-4713-a607-cd6110d0e94e"
      ]
    }
- aefa592f-03f3-4f08-8251-a7953610662e RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:51:43.977+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "e7f7564a-b2d3-4ecd-aa75-67bfee6a2005",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "proposal_count": 2,
      "violation_count": 2,
      "deduped_violation_count": 0
    }
- c3c26e76-43d3-4931-aa14-e5638525366e RUNTIME_PATCH_PROPOSAL_CREATED (2026-02-21T03:51:43.701+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "title": "External action lifecycle outcome audit proposal",
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "status": "pending",
      "trigger": "runtime_turn_write",
      "turn_id": "e7f7564a-b2d3-4ecd-aa75-67bfee6a2005",
      "rationale": "Lifecycle evidence gap (missing_completed=-, outcomes=RESTOCK_SMS_SCHEDULED)",
      "confidence": 0.7,
      "created_at": "2026-02-21T03:51:43.425Z",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "why_failed": "Completion-like user answer was emitted while external action lifecycle evidence was incomplete (STARTED/COMPLETED/outcome mismatch).",
      "change_plan": [
        "Define a shared action lifecycle registry with event stem, start/completion events, and terminal outcomes.",
        "At completion-like final response branch, verify lifecycle evidence deterministically before rendering completion text.",
        "Emit normalized ACTION_* lifecycle events for non-MCP external integrations, not only SMS."
      ],
      "proposal_id": "rp_1771645896208_utxjsk",
      "target_files": [
        "src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts",
        "src/app/api/runtime/chat/runtime/runtimeTurnIo.ts",
        "src/app/api/runtime/governance/_lib/detector.ts",
        "src/app/api/runtime/governance/selfHeal/principles.ts"
      ],
      "violation_id": "pv_aa33c5d6-07b2-48c5-a33d-b162fce6a329_e7f7564a-b2d3-4ecd-aa75-67bfee6a2005_actionlifecycle_outcome_missing",
      "principle_key": "action.enforceLifecycleOutcomeAudit",
      "runtime_scope": "chat",
      "how_to_improve": "Enforce generic action lifecycle contract: STARTED -> COMPLETED and terminal outcome event before completion-like response.",
      "self_heal_gate": {
        "track": "contract",
        "gate_version": "v1",
        "exception_stats": {
          "repeat_count_7d": 12,
          "repeat_count_30d": 12
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
      "suggested_diff": "diff --git a/src/app/api/runtime/chat/policies/principles.ts b/src/app/api/runtime/chat/policies/principles.ts\nindex abcdef1..1234567 100644\n--- a/src/app/api/runtime/chat/policies/principles.ts\n+++ b/src/app/api/runtime/chat/policies/principles.ts\n@@ -1,5 +1,6 @@\n   \"audit\": {\n-    \"requireMcpLastFunctionAlwaysRecorded\": true\n+    \"requireMcpLastFunctionAlwaysRecorded\": true,\n+    \"enforceLifecycleOutcomeAudit\": true\n   }\n",
      "issue_fingerprint": "action.enforcelifecycleoutcomeaudit|chat|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.||||"
    }
- c0f69dfd-1127-4847-9267-15f61e4c6062 PRINCIPLE_VIOLATION_DETECTED (2026-02-21T03:51:43.426+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "summary": "External action completion-like answer was produced without deterministic action STARTED/COMPLETED/outcome evidence.",
      "trigger": "runtime_turn_write",
      "evidence": {
        "tool_name": "restock_sms_dispatch",
        "intent_name": "restock_subscribe",
        "final_answer": "확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159\n확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 유린기 / 채널 sms\n입고 예정: 05/02 (D-70)\n현재 상태: 재고 수량 확인 필요\nKB 정책: 별도 재입고 정책 없음\n다음 선택: 대화 종료 / 다른 문의\n그 다음으로 확인할 것: 알림 시작일 선택",
        "mismatch_type": "external_response_not_received",
        "completion_claimed": true,
        "context_action_ids": [
          "1efc6fba-81c8-4e30-a92a-e92a0391830b",
          "3fe95b53-1f02-4713-a607-cd6110d0e94e"
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
      "violation_id": "pv_aa33c5d6-07b2-48c5-a33d-b162fce6a329_e7f7564a-b2d3-4ecd-aa75-67bfee6a2005_actionlifecycle_outcome_missing",
      "principle_key": "action.enforceLifecycleOutcomeAudit",
      "runtime_scope": "chat",
      "baseline_source": "src/app/api/runtime/chat/policies/principles.ts",
      "issue_fingerprint": "action.enforcelifecycleoutcomeaudit|chat|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.|external action completion-like answer was produced without deterministic action started/completed/outcome evidence.||||"
    }
- 7e30f480-27df-4dba-94e2-9ef54577b52f RUNTIME_PATCH_PROPOSAL_CREATED (2026-02-21T03:51:35.406+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "title": "Notification delivery outcome audit proposal",
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "status": "pending",
      "trigger": "runtime_turn_write",
      "turn_id": "e7f7564a-b2d3-4ecd-aa75-67bfee6a2005",
      "rationale": "Delivery audit gap (notification_ids=1, outcomes=RESTOCK_SMS_SCHEDULED)",
      "confidence": 0.7,
      "created_at": "2026-02-21T03:51:35.049Z",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "why_failed": "Subscribe completion was returned without deterministic delivery STARTED/COMPLETED boundary evidence and/or outcome events.",
      "change_plan": [
        "Emit RESTOCK_SUBSCRIBE_DISPATCH_STARTED before Solapi send/register and RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED after persistence.",
        "Persist message_id -> delivery outcome (RESTOCK_SMS_SENT/SCHEDULED/FAILED) linkage for each notification id.",
        "Surface deterministic failure reason in audit payload when completion message is generated."
      ],
      "proposal_id": "rp_1771645886626_33wd88",
      "target_files": [
        "src/app/api/runtime/chat/services/restockSubscriptionRuntime.ts",
        "src/app/api/runtime/restock/dispatch/route.ts",
        "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "src/app/api/runtime/governance/_lib/detector.ts"
      ],
      "violation_id": "pv_aa33c5d6-07b2-48c5-a33d-b162fce6a329_e7f7564a-b2d3-4ecd-aa75-67bfee6a2005_notificationdelivery_outcome_audit_missing",
      "principle_key": "notification.enforceDeliveryOutcomeAudit",
      "runtime_scope": "chat",
      "how_to_improve": "Write delivery lifecycle audit pair and outcome evidence in runtime path and dispatch path before/after final completion guidance.",
      "self_heal_gate": {
        "track": "contract",
        "gate_version": "v1",
        "exception_stats": {
          "repeat_count_7d": 12,
          "repeat_count_30d": 12
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
- 840e5f74-7b04-4a96-8d74-75a11fa394db PRINCIPLE_VIOLATION_DETECTED (2026-02-21T03:51:35.05+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "summary": "Notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.",
      "trigger": "runtime_turn_write",
      "evidence": {
        "tool_name": "restock_sms_dispatch",
        "intent_name": "restock_subscribe",
        "final_answer": "확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159\n확인할 것: 요약: 재입고 알림 신청이 완료되었습니다.\n상세: 상품 유린기 / 채널 sms\n입고 예정: 05/02 (D-70)\n현재 상태: 재고 수량 확인 필요\nKB 정책: 별도 재입고 정책 없음\n다음 선택: 대화 종료 / 다른 문의\n그 다음으로 확인할 것: 알림 시작일 선택",
        "mismatch_type": "external_response_not_received",
        "notification_ids": [
          "3fe95b53-1f02-4713-a607-cd6110d0e94e"
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
      "violation_id": "pv_aa33c5d6-07b2-48c5-a33d-b162fce6a329_e7f7564a-b2d3-4ecd-aa75-67bfee6a2005_notificationdelivery_outcome_audit_missing",
      "principle_key": "notification.enforceDeliveryOutcomeAudit",
      "runtime_scope": "chat",
      "baseline_source": "src/app/api/runtime/chat/policies/principles.ts",
      "issue_fingerprint": "notification.enforcedeliveryoutcomeaudit|chat|notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.|notification subscribe flow completed without deterministic delivery audit lifecycle/evidence.||||"
    }
- cfbe3932-4cc1-4f3e-a0ff-24fd13666e1d RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:51:25.316+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "e7f7564a-b2d3-4ecd-aa75-67bfee6a2005",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- 4784d86c-43d3-4e51-be76-10f075555f86 END_USER_WRITE_LATENCY (2026-02-21T03:51:24.254+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "duration_ms": 4838
    }
- a59ce2fb-e8cf-453f-a7a6-bcde60df2fe1 END_USER_CONTEXT_RESOLVED (2026-02-21T03:51:20.483+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
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
- a5ca9bed-84c9-4ed8-988d-3110a07795e2 END_USER_MATCH_HIT (2026-02-21T03:51:20.213+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
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
- 5cd832f6-ac31-4cc6-8b6f-2107c4dcd192 RESTOCK_SUBSCRIBE_DISPATCH_COMPLETED (2026-02-21T03:51:18.612+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "outcomes": [
        {
          "id": "3fe95b53-1f02-4713-a607-cd6110d0e94e",
          "reason": null,
          "status": "scheduled"
        }
      ],
      "sent_count": 0,
      "failed_count": 0,
      "scheduled_count": 1,
      "notification_ids": [
        "3fe95b53-1f02-4713-a607-cd6110d0e94e"
      ],
      "external_provider": "solapi",
      "external_action_name": "restock_sms_dispatch",
      "external_ack_required": true
    }
- e626af0f-4c4d-4b48-b2a5-4caae4e7f39f RESTOCK_SMS_SCHEDULED (2026-02-21T03:51:18.346+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "bypass": false,
      "channel": "sms",
      "message_id": "3fe95b53-1f02-4713-a607-cd6110d0e94e",
      "phone_masked": "010****7159",
      "bypass_reason": null,
      "scheduled_for": "2026-04-30T08:00:00.000Z",
      "external_ack_id": null,
      "notification_id": "3fe95b53-1f02-4713-a607-cd6110d0e94e",
      "external_provider": "solapi",
      "solapi_message_id": null,
      "external_action_name": "restock_sms_dispatch",
      "external_ack_received": false,
      "external_ack_required": true,
      "provider_response_received": false
    }
- 3be395d2-d3d6-4d5a-a587-b9340cb6577c RESTOCK_SUBSCRIBE_DISPATCH_STARTED (2026-02-21T03:51:17.078+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "channel": "sms",
      "bypass_enabled": "false",
      "scheduled_count": 1,
      "notification_ids": [
        "3fe95b53-1f02-4713-a607-cd6110d0e94e"
      ],
      "external_provider": "solapi",
      "external_action_name": "restock_sms_dispatch",
      "external_ack_required": true
    }
- 99aaf888-50f8-4568-868f-6ad79f11278b PRE_MCP_DECISION (2026-02-21T03:51:16.535+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
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
        "recorded_at": "2026-02-21T03:51:16.535Z",
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
- ffbcc8b2-9475-42c2-a9bc-17632dac2c9e INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:51:16.013+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "intent": "restock_subscribe",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:51:16.013Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- c19a13ff-eea1-47f6-af9b-70f4b00e3322 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:51:15.746+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
  payload:
    {
      "intent": "restock_subscribe",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:51:15.746Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "confirm"
    }
- 6acf33ed-26f3-4407-bbe3-6998c70595bb SLOT_EXTRACTED (2026-02-21T03:51:15.481+00:00) (turn_id=e7f7564a-b2d3-4ecd-aa75-67bfee6a2005)
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
        "recorded_at": "2026-02-21T03:51:15.481Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "confirm",
      "resolved_slots": {}
    }


TURN_ID: f5630be1-e44d-46f1-a88d-95120e35c62c

[TOKEN_USED]

USER:
다른 문의

BOT:
확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159
확인할 것: 좋아요. 다른 문의 내용을 입력해 주세요.
그 다음으로 확인할 것: choice 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 유린기, 연락 채널 sms, 연락처 *******7159\n확인할 것: 좋아요. 다른 문의 내용을 입력해 주세요.\n그 다음으로 확인할 것: choice 확인",
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
- bbf09992-5da9-4149-8899-0100f95029a3 (turn_id=f5630be1-e44d-46f1-a88d-95120e35c62c) (2026-02-21T03:54:31.565+00:00)
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
        "phone_masked": "*******7159",
        "expected_input": "choice"
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
        "recorded_at": "2026-02-21T03:54:31.269Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [
          "choice"
        ],
        "expected_input_stage": "post_action.awaiting_choice",
        "expected_input_source": "contract_stage"
      },
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": []
      },
      "model_resolution": {
        "input_length": 20,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- 6e8c0c71-bb69-4ebc-b98e-9b9ecf35fdcb RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:54:38.564+00:00) (turn_id=f5630be1-e44d-46f1-a88d-95120e35c62c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f5630be1-e44d-46f1-a88d-95120e35c62c",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- f768a87d-efac-4120-a687-8a6793533340 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:54:37.771+00:00) (turn_id=f5630be1-e44d-46f1-a88d-95120e35c62c)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "f5630be1-e44d-46f1-a88d-95120e35c62c",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- 0f238f1a-2974-4aa7-ad85-d8dad2e47138 END_USER_WRITE_LATENCY (2026-02-21T03:54:36.688+00:00) (turn_id=f5630be1-e44d-46f1-a88d-95120e35c62c)
  payload:
    {
      "duration_ms": 4843
    }
- efee445f-fc8a-490a-ba3d-f62ccecc267d END_USER_CONTEXT_RESOLVED (2026-02-21T03:54:32.919+00:00) (turn_id=f5630be1-e44d-46f1-a88d-95120e35c62c)
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
- 9777fc83-9f90-4066-a9a0-83ee11742f43 END_USER_MATCH_HIT (2026-02-21T03:54:32.652+00:00) (turn_id=f5630be1-e44d-46f1-a88d-95120e35c62c)
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


TURN_ID: 300b14b5-9c49-4f16-afdc-a506f660ca84

[TOKEN_USED]

USER:
배송지 변경

BOT:
확인한 것: 연락처 *******7159
확인할 것: 문자로 전송된 인증번호를 입력해주세요.
그 다음으로 확인할 것: 주문번호 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 연락처 *******7159\n확인할 것: 문자로 전송된 인증번호를 입력해주세요.\n그 다음으로 확인할 것: 주문번호 확인",
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
- ccb6abc6-7e7a-4e02-b661-71a790442a00 (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84) (2026-02-21T03:54:49.572+00:00)
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
        "recorded_at": "2026-02-21T03:54:49.307Z",
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
          "phone"
        ],
        "expected_input_stage": "legacy.expected_input",
        "expected_input_source": "derived_from_last_answer"
      },
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone",
          "list_orders",
          "lookup_order",
          "track_shipment",
          "update_order_shipping_address"
        ]
      },
      "model_resolution": {
        "input_length": 6,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
MCP 로그:
- 35bbbec3-f962-4eb5-ab84-b0452c0d5383 solapi:send_otp@1.0: success (2026-02-21T03:54:48.776+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  request:
    {
      "path": "/messages/v4/send-many/detail",
      "method": "POST",
      "destination": "01093107159",
      "required_scope": "messaging.write"
    }
  response:
    {
      "otp_ref": "280bc03d-5e32-44e4-9ba5-e616319b7f16",
      "delivery": "sms",
      "test_code": "101010",
      "test_mode": true,
      "expires_at": "2026-02-21T03:59:48.247Z",
      "destination": "01***59"
    }
이벤트 로그:
- 34da2797-98d8-448f-b1fa-fac70cbd4a2e RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:54:56.497+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "300b14b5-9c49-4f16-afdc-a506f660ca84",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 13f6cc31-2656-4e7c-8abb-8fddcc3a016f RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:54:55.694+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "300b14b5-9c49-4f16-afdc-a506f660ca84",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- c0b703d9-5a07-4901-911a-e1cccc58ef56 END_USER_WRITE_LATENCY (2026-02-21T03:54:54.639+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "duration_ms": 4796
    }
- 64e46065-4f1a-4e62-9461-96aa01fc5022 END_USER_CONTEXT_RESOLVED (2026-02-21T03:54:50.918+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
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
- 2e07a32b-6ec0-44c1-b949-6362f034fa3f END_USER_MATCH_HIT (2026-02-21T03:54:50.639+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
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
- 2a4e780a-3b11-4813-86bc-d89880e4e6ef AUTH_GATE_TRIGGERED (2026-02-21T03:54:49.045+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "action": "ASK_OTP_CODE",
      "intent": "order_change",
      "reason": "OTP_SENT",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:54:49.045Z",
        "function_name": "unknown"
      },
      "force_otp_gate": true,
      "has_sensitive_planned_call": false
    }
- 3acfca41-0460-4342-90d5-84af60857463 AUTH_GATE_PRECHECK (2026-02-21T03:54:46.798+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:54:46.798Z",
        "function_name": "unknown"
      },
      "otp_pending": false,
      "otp_verified": false,
      "planned_calls": [],
      "force_otp_gate": true,
      "allowed_tool_names_count": 3,
      "has_sensitive_planned_call": false,
      "customer_verification_token_present": false
    }
- f86a0020-1c50-4a11-811c-cf31d0b6d22d EXECUTION_GUARD_TRIGGERED (2026-02-21T03:54:46.53+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "tool": "update_order_shipping_address",
      "error": "MUTATION_INTENT_NOT_READY",
      "reason": "MISSING_REQUIRED_SLOTS",
      "missing": {
        "address": true,
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
        "recorded_at": "2026-02-21T03:54:46.530Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 74d7da27-1dd4-4b2a-93a1-cdd1e97a0859 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:54:45.999+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:54:45.999Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 56caabdf-677d-4559-a3f3-d71fe2ffccbf INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:54:45.733+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:54:45.733Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "phone"
    }
- 6b4925f0-1bbb-4c8e-9922-738906117f8a SLOT_EXTRACTED (2026-02-21T03:54:45.465+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
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
        "recorded_at": "2026-02-21T03:54:45.465Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "phone",
      "resolved_slots": {}
    }
- 95ab0e0a-60ee-4ff5-8d71-6a53d56a571f INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T03:54:45.201+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "source": "derived_from_last_answer",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:54:45.201Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": "phone",
      "expected_inputs": [
        "phone"
      ],
      "expected_input_stage": "legacy.expected_input"
    }
- 9917d74b-6a36-414f-b230-c91f25b6102d INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T03:54:44.931+00:00) (turn_id=300b14b5-9c49-4f16-afdc-a506f660ca84)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:54:44.931Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: 8966c962-0b5a-4cca-b37d-06fa9cc5f318

[TOKEN_USED]

USER:
101010

BOT:
요약: 인증번호 확인되었습니다. 변경하실 주문번호를 알려주세요.
근거: KB 및 정책에 따라 처리했습니다.
상세: 인증번호 확인되었습니다. 변경하실 주문번호를 알려주세요.
다음 액션: 추가 요청이 있으면 알려주세요.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 연락처 *******7159\n확인할 것: 인증이 확인되었습니다.\n인증번호 확인되었습니다. 변경하실 주문번호를 알려주세요.\n그 다음으로 확인할 것: 주문 확인",
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
- 58d63839-3d7d-4414-a307-94b1fbdbc469 (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318) (2026-02-21T03:55:11.583+00:00)
  prefix_json:
    {
      "llm": {
        "model": "gpt-4.1-mini"
      },
      "mcp": {
        "last": {
          "error": null,
          "status": "success",
          "function": "verify_otp",
          "result_count": 2
        }
      },
      "slot": {
        "phone": "01093107159",
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
        "recorded_at": "2026-02-21T03:55:11.316Z",
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
        "expected_inputs": [
          "otp_code"
        ],
        "expected_input_prev": "otp_code",
        "expected_input_stage": "auth_gate.otp.awaiting_code",
        "expected_input_source": "contract_stage"
      },
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
          "solapi",
          "juso"
        ],
        "resolved_tool_count": 3,
        "requested_tool_count": 5,
        "tools_by_provider_count": 3,
        "provider_selection_count": 2,
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone",
          "list_orders",
          "lookup_order",
          "track_shipment",
          "update_order_shipping_address"
        ]
      },
      "model_resolution": {
        "input_length": 6,
        "length_rule_hit": false,
        "keyword_rule_hit": false,
        "selection_reason": "short_default"
      }
    }
MCP 로그:
- 5759f559-ab6d-4d7c-a10a-07930398b7aa solapi:verify_otp@1.0: success (2026-02-21T03:55:08.837+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  request:
    {
      "code": "101010",
      "path": "/otp/verify",
      "method": "POST",
      "otp_ref": "280bc03d-5e32-44e4-9ba5-e616319b7f16",
      "required_scope": "messaging.write"
    }
  response:
    {
      "verified": true,
      "customer_verification_token": "55c9c4b1-2ce7-49ed-bc21-a16a73dc56f0"
    }
이벤트 로그:
- 2888130a-dc71-453f-b176-fc2a55c77fc8 FINAL_ANSWER_READY (2026-02-21T03:55:19.349+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "model": "gpt-4.1-mini",
      "answer": "확인한 것: 연락처 *******7159\n확인할 것: 인증이 확인되었습니다.\n인증번호 확인되었습니다. 변경하실 주문번호를 알려주세요.\n그 다음으로 확인할 것: 주문 확인",
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
        "recorded_at": "2026-02-21T03:55:19.349Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "debug_answer": "요약: 인증번호 확인되었습니다. 변경하실 주문번호를 알려주세요.\n근거: KB 및 정책에 따라 처리했습니다.\n상세: 인증번호 확인되었습니다. 변경하실 주문번호를 알려주세요.\n다음 액션: 추가 요청이 있으면 알려주세요.",
      "quick_reply_config": null
    }
- d26a8a22-88d9-4ff9-b668-0c898f4aebc4 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:55:19.082+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "8966c962-0b5a-4cca-b37d-06fa9cc5f318",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 68666871-a73a-472e-9fed-a21cbbe5a66a RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:55:18.033+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "8966c962-0b5a-4cca-b37d-06fa9cc5f318",
      "session_id": "aa33c5d6-07b2-48c5-a33d-b162fce6a329",
      "config_source": "principles_default"
    }
- ceced5c5-c5f0-4527-8d43-bcd0a9889435 END_USER_WRITE_LATENCY (2026-02-21T03:55:16.942+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "duration_ms": 5075
    }
- 7a71d7bf-8cdf-4d88-a2a5-a36b18a07acc END_USER_CONTEXT_RESOLVED (2026-02-21T03:55:12.935+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
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
- 5d8eed82-0b60-4dbc-b992-4213273228aa END_USER_MATCH_HIT (2026-02-21T03:55:12.668+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
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
- 7db96c98-cdef-4139-a2e4-734fbc32def7 PRE_MCP_DECISION (2026-02-21T03:55:09.919+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": false,
        "phone_masked": "*******7159"
      },
      "intent": "order_change",
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
        "recorded_at": "2026-02-21T03:55:09.919Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "101010",
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
- f8e8253c-62ac-44ab-a385-1fec2caf70bf EXECUTION_GUARD_TRIGGERED (2026-02-21T03:55:09.654+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "tool": "update_order_shipping_address",
      "error": "MUTATION_INTENT_NOT_READY",
      "reason": "MISSING_REQUIRED_SLOTS",
      "missing": {
        "address": true,
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
        "recorded_at": "2026-02-21T03:55:09.654Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 628c3568-098a-46dc-8b40-c2e72412c7d9 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:55:07.78+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:55:07.780Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 0f11fad8-c58c-4c20-b575-7fc7f453f3c0 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:55:07.504+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:55:07.504Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "otp_code"
    }
- 7095664f-d620-4360-b49c-ff12a33a98f1 SLOT_EXTRACTED (2026-02-21T03:55:07.236+00:00) (turn_id=8966c962-0b5a-4cca-b37d-06fa9cc5f318)
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
        "recorded_at": "2026-02-21T03:55:07.236Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "otp_code",
      "resolved_slots": {}
    }