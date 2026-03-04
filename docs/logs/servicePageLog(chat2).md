디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): solapi:send_otp, search_address, solapi:verify_otp
기대 목록(Event): QUICK_REPLY_RULE_DECISION, FINAL_ANSWER_READY, POLICY_DECISION, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_HIT, CONFIRMED_ENTITY_DELTA_APPLIED, END_USER_CONFIRMED_ENTITY_SAVED, AUTH_GATE_TRIGGERED, AUTH_GATE_PRECHECK, EXECUTION_GUARD_TRIGGERED, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED, RUNTIME_PATCH_PROPOSAL_CREATED, PRINCIPLE_VIOLATION_DETECTED, ADDRESS_SEARCH_STARTED, PRE_MCP_DECISION
기대 목록(Debug): NO_TOOL_CALLED, send_otp, verify_otp

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: mcp.solapi:send_otp, mcp.search_address, mcp.solapi:verify_otp, event.QUICK_REPLY_RULE_DECISION, event.FINAL_ANSWER_READY, event.POLICY_DECISION, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_HIT, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.END_USER_CONFIRMED_ENTITY_SAVED, event.AUTH_GATE_TRIGGERED, event.AUTH_GATE_PRECHECK, event.EXECUTION_GUARD_TRIGGERED, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, event.RUNTIME_PATCH_PROPOSAL_CREATED, event.PRINCIPLE_VIOLATION_DETECTED, event.ADDRESS_SEARCH_STARTED, event.PRE_MCP_DECISION, debug.NO_TOOL_CALLED, debug.send_otp, debug.verify_otp, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: afe82b4d-0faf-47f7-a6bb-d023aa43c95b

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
- 54cb89e4-da06-40e4-96c6-1f9885964ff6 (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b) (2026-02-21T03:56:31.172+00:00)
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
        "recorded_at": "2026-02-21T03:56:30.899Z",
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": []
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
- 83a38419-ca1d-420b-9a72-9911ceb4e549 QUICK_REPLY_RULE_DECISION (2026-02-21T03:56:38.572+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
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
- 3c5f5808-2f53-40fc-85f2-b22e7d336a54 FINAL_ANSWER_READY (2026-02-21T03:56:38.305+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
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
        "recorded_at": "2026-02-21T03:56:38.305Z",
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
- ef052d64-52cb-479e-aa72-1b642f860e49 POLICY_DECISION (2026-02-21T03:56:38.044+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
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
        "recorded_at": "2026-02-21T03:56:38.044Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- f8aaaa52-99d0-4df2-8a97-b310f6a0c454 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:56:37.781+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "afe82b4d-0faf-47f7-a6bb-d023aa43c95b",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 82740bc9-c4fc-40b8-8eed-0d087b2f61f1 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:56:36.765+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "afe82b4d-0faf-47f7-a6bb-d023aa43c95b",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "config_source": "principles_default"
    }
- 902f8255-8d8d-464e-8837-0a2d9e0a04d6 END_USER_WRITE_LATENCY (2026-02-21T03:56:35.722+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
  payload:
    {
      "duration_ms": 4271
    }
- 8d1dcdd7-068d-42f9-a821-f99983f3c1be END_USER_CONTEXT_RESOLVED (2026-02-21T03:56:32.514+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
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
- f4349b3a-405a-4c3e-8b38-98393d5839eb END_USER_MATCH_HIT (2026-02-21T03:56:32.244+00:00) (turn_id=afe82b4d-0faf-47f7-a6bb-d023aa43c95b)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }


TURN_ID: 99ea2b56-f163-4599-a36a-5a3eb58cc12a

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
- eeb1e912-c26d-434b-ac58-52575a96fbca (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a) (2026-02-21T03:56:48.183+00:00)
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
        "recorded_at": "2026-02-21T03:56:47.917Z",
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
        "derived_address": "1",
        "expected_inputs": [
          "address"
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
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- bdcf672d-9b15-489a-992a-7663ee0ad30f CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:56:55.594+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "keys": [
        "address"
      ],
      "delta": {
        "address": "1"
      },
      "flow_id": "988ebd25-f8b1-4bb3-8649-f519b1cfa430",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:56:55.594Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 335902f6-c0ac-424e-a63b-f367b6177fac RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:56:55.332+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "99ea2b56-f163-4599-a36a-5a3eb58cc12a",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- e8532e95-1e55-4503-8ef3-da20f293d6e8 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:56:54.783+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "99ea2b56-f163-4599-a36a-5a3eb58cc12a",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "config_source": "principles_default"
    }
- a7fc6c00-3537-417a-8d84-80b994b865fb END_USER_WRITE_LATENCY (2026-02-21T03:56:53.74+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "duration_ms": 5292
    }
- 28c81414-7e80-4d9c-aa59-e9542c2f101f END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:56:53.481+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "keys": [
        "address"
      ],
      "flow_id": "988ebd25-f8b1-4bb3-8649-f519b1cfa430",
      "key_count": 1,
      "keys_truncated": false
    }
- 516bc26f-a161-4d84-8b7f-396383d685ae END_USER_CONTEXT_RESOLVED (2026-02-21T03:56:49.519+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
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
- fdcc01e9-e9c5-4ad3-b570-df2e6bde3a86 END_USER_MATCH_HIT (2026-02-21T03:56:49.255+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 88e73029-9bef-4e25-a456-9cc1a3f9891c AUTH_GATE_TRIGGERED (2026-02-21T03:56:47.647+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "action": "ASK_PHONE_FOR_OTP",
      "intent": "order_change",
      "reason": "SENSITIVE_INTENT_PRE_TOOL",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:56:47.647Z",
        "function_name": "unknown"
      },
      "force_otp_gate": true,
      "has_sensitive_planned_call": false
    }
- 82c7ae2f-eaf1-4873-ac04-90412683bd0c AUTH_GATE_PRECHECK (2026-02-21T03:56:47.382+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:56:47.382Z",
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
- a3d2e036-cff2-4df8-acf2-143bab3dde9e EXECUTION_GUARD_TRIGGERED (2026-02-21T03:56:47.129+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
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
        "recorded_at": "2026-02-21T03:56:47.129Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- ffc5687a-999d-4402-b792-9262a771b8a6 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:56:46.591+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:56:46.591Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- e5bb64b9-e47d-4b6e-8329-440919137d33 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:56:46.337+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:56:46.337Z",
        "function_name": "unknown"
      },
      "query_source": "intent_disambiguation_source_text",
      "expected_input": "address"
    }
- 2d57f8d0-faa1-4b3c-82c7-15078acfc2a0 SLOT_EXTRACTED (2026-02-21T03:56:46.073+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
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
        "recorded_at": "2026-02-21T03:56:46.073Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "intent_disambiguation_source_text",
      "missing_slots": [],
      "expected_input": "address",
      "resolved_slots": {}
    }
- 40dc8c2a-bc34-47a7-a9d2-7a1debf00f0d INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T03:56:45.807+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "source": "derived_from_last_answer",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:56:45.807Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": "address",
      "expected_inputs": [
        "address"
      ],
      "expected_input_stage": "legacy.expected_input"
    }
- 2fc634f0-ab9b-4fc7-a276-fc4f7334faad INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T03:56:45.531+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:56:45.531Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 1a47af56-14e0-4851-914f-22a2f9ef038a POLICY_DECISION (2026-02-21T03:56:45.277+00:00) (turn_id=99ea2b56-f163-4599-a36a-5a3eb58cc12a)
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
        "recorded_at": "2026-02-21T03:56:45.277Z",
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


TURN_ID: b9ed6ba5-802e-4193-8a44-2457d7d7cd5f

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
- 15147945-6798-43ee-9c46-270141bfdd33 (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f) (2026-02-21T03:57:08.971+00:00)
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
        "recorded_at": "2026-02-21T03:57:08.706Z",
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
        "input_length": 11,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
MCP 로그:
- f9d11244-c5ed-471f-862e-2aa07e8f40a8 solapi:send_otp@1.0: success (2026-02-21T03:57:08.437+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  request:
    {
      "path": "/messages/v4/send-many/detail",
      "method": "POST",
      "destination": "01093107159",
      "required_scope": "messaging.write"
    }
  response:
    {
      "otp_ref": "760b35d6-0214-4b03-9057-bb610ba2dd8e",
      "delivery": "sms",
      "test_code": "101010",
      "test_mode": true,
      "expires_at": "2026-02-21T04:02:07.892Z",
      "destination": "01***59"
    }
이벤트 로그:
- 3bf1c94c-0986-42f5-940e-31b2a53666eb CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:57:17.492+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  payload:
    {
      "keys": [
        "phone"
      ],
      "delta": {
        "phone": "01093107159"
      },
      "flow_id": "988ebd25-f8b1-4bb3-8649-f519b1cfa430",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:57:17.492Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 69febc67-d8cb-4093-8dab-18c7f0ab1ca6 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:57:17.228+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "b9ed6ba5-802e-4193-8a44-2457d7d7cd5f",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- dcdd8705-60a4-4818-829e-9614191533ff RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:57:16.202+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "b9ed6ba5-802e-4193-8a44-2457d7d7cd5f",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "config_source": "principles_default"
    }
- 03f1054a-2181-4309-99d9-c73cc2c2a5ef END_USER_WRITE_LATENCY (2026-02-21T03:57:15.139+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  payload:
    {
      "duration_ms": 5886
    }
- 3bfd9b82-1f0a-47ad-88ed-bb6f75aafbab END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:57:14.863+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  payload:
    {
      "keys": [
        "phone"
      ],
      "flow_id": "988ebd25-f8b1-4bb3-8649-f519b1cfa430",
      "key_count": 1,
      "keys_truncated": false
    }
- bb218822-0ba5-4c2e-bf96-6a748d46f8d5 END_USER_CONTEXT_RESOLVED (2026-02-21T03:57:10.316+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
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
- fe7aaf89-5334-4ccb-9efa-913aa205f7e3 END_USER_MATCH_HIT (2026-02-21T03:57:10.046+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
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
- d5a8c135-859d-4762-a5e9-cdf4e7f413f4 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:57:06.63+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:57:06.630Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 2997bdaf-9314-44d3-af0e-444f5399c76a INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:57:06.369+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:57:06.369Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "phone"
    }
- 31b804db-c7e6-4744-ae79-328bd1f79633 SLOT_EXTRACTED (2026-02-21T03:57:06.105+00:00) (turn_id=b9ed6ba5-802e-4193-8a44-2457d7d7cd5f)
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
        "recorded_at": "2026-02-21T03:57:06.105Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "phone",
      "resolved_slots": {}
    }


TURN_ID: 5fcd9088-91eb-4ff5-aa0c-826fd6be8f03

[TOKEN_USED]

USER:
101010

BOT:
확인한 것: 연락처 *******7159, 배송지 1
확인할 것: 인증이 확인되었습니다.
입력하신 주소로 우편번호를 찾지 못했어요. 도로명/지번 주소를 다시 입력해주세요.
그 다음으로 확인할 것: 주문 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 연락처 *******7159, 배송지 1\n확인할 것: 인증이 확인되었습니다.\n입력하신 주소로 우편번호를 찾지 못했어요. 도로명/지번 주소를 다시 입력해주세요.\n그 다음으로 확인할 것: 주문 확인",
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
- 4bf8b262-8086-4304-8f77-0dfac5e49e0b (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03) (2026-02-21T03:57:31.998+00:00)
  prefix_json:
    {
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
        "recorded_at": "2026-02-21T03:57:31.729Z",
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
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
문제 요약:
- search_address: status=error
MCP 로그:
- a6d47857-d493-4203-818e-284bf88ecd2a search_address@-: error (2026-02-21T03:57:31.462+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  request:
    {
      "keyword": "1",
      "search_keywords": [
        "1"
      ]
    }
  response:
    {
      "error": "Address search failed. See debug info."
    }
- aa1bfb5b-21f0-43c9-8735-405ff1031e1b solapi:verify_otp@1.0: success (2026-02-21T03:57:29.091+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  request:
    {
      "code": "101010",
      "path": "/otp/verify",
      "method": "POST",
      "otp_ref": "760b35d6-0214-4b03-9057-bb610ba2dd8e",
      "required_scope": "messaging.write"
    }
  response:
    {
      "verified": true,
      "customer_verification_token": "18449103-ff3c-4c0c-9804-ef47fb9467c7"
    }
이벤트 로그:
- e8879c0b-bb67-43f1-8b18-0cd0a633756a EXECUTION_GUARD_TRIGGERED (2026-02-21T03:57:46.162+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
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
        "recorded_at": "2026-02-21T03:57:46.162Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 77acb3df-cdcc-4d3e-9744-a1625bb0677b CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T03:57:45.898+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "keys": [
        "address"
      ],
      "delta": {
        "address": "1"
      },
      "flow_id": "988ebd25-f8b1-4bb3-8649-f519b1cfa430",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:57:45.898Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 9bbbbc27-b953-4e15-b49c-5552fc2935eb RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T03:57:45.631+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "5fcd9088-91eb-4ff5-aa0c-826fd6be8f03",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "proposal_count": 1,
      "violation_count": 1,
      "deduped_violation_count": 0
    }
- b00ea1a0-2135-4917-80c5-ba45454c3923 RUNTIME_PATCH_PROPOSAL_CREATED (2026-02-21T03:57:45.346+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "title": "Principle violation patch proposal",
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "status": "pending",
      "trigger": "runtime_turn_write",
      "turn_id": "5fcd9088-91eb-4ff5-aa0c-826fd6be8f03",
      "rationale": "Prefer runtime decision-path fix over principle text changes (force_template_misapplied=false, expected_input=otp_code, policy_reason=ADDRESS_PRESENT_ZIPCODE_MISSING)",
      "confidence": 0.7,
      "created_at": "2026-02-21T03:57:45.070Z",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "why_failed": "Address slot was already resolved, but final response selection re-asked address.",
      "change_plan": [
        "At final response stage, if expected_input=address and resolved address exists, forbid address prompt template.",
        "If policy decision is DEFER_FORCE_RESPONSE_TEMPLATE with ORDER_AND_ADDRESS_ALREADY_AVAILABLE, preserve decision through finalization.",
        "Emit explicit debug evidence (resolved_address / policy_decision_reason / final_template) around failure boundary."
      ],
      "proposal_id": "rp_1771646260895_gt51an",
      "target_files": [
        "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
        "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts"
      ],
      "violation_id": "pv_d6b3971b-8a54-4962-bc15-744b82277c34_5fcd9088-91eb-4ff5-aa0c-826fd6be8f03_memoryno_repeat_address_question",
      "principle_key": "memory.enforceNoRepeatQuestions",
      "runtime_scope": "chat",
      "how_to_improve": "Use finalized slot/policy decision evidence to block address re-ask in final response path; add guard in runtime finalize/handler path.",
      "self_heal_gate": {
        "track": "contract",
        "gate_version": "v1",
        "exception_stats": {
          "repeat_count_7d": 23,
          "repeat_count_30d": 23
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
      "issue_fingerprint": "memory.enforcenorepeatquestions|chat|확인한 것: 연락처 *******7159, 배송지 1 확인할 것: 인증이 확인되었습니다. 입력하신 주소로 우편번호를 찾지 못했어요. 도로명/지번 주소를 다시 입력해주세요. 그 다음으로 확인할 것: 주문 확인|address was already known but the bot asked for address again.|||otp_code|address_present_zipcode_missing"
    }
- 5da29281-9559-45d8-bf08-135a61c0275f PRINCIPLE_VIOLATION_DETECTED (2026-02-21T03:57:45.07+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "summary": "Address was already known but the bot asked for address again.",
      "trigger": "runtime_turn_write",
      "evidence": {
        "answer": "확인한 것: 연락처 *******7159, 배송지 1\n확인할 것: 인증이 확인되었습니다.\n입력하신 주소로 우편번호를 찾지 못했어요. 도로명/지번 주소를 다시 입력해주세요.\n그 다음으로 확인할 것: 주문 확인",
        "expected_input": "otp_code",
        "known_address_count": 1,
        "expected_reuse_order": [
          "derived",
          "prevEntity",
          "prevTranscript",
          "recentEntity"
        ],
        "slot_resolved_address": "1",
        "policy_decision_action": "ENFORCE_RUNTIME_PRINCIPLE_ADDRESS_ZIPCODE_RESOLUTION",
        "policy_decision_reason": "ADDRESS_PRESENT_ZIPCODE_MISSING",
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
      "violation_id": "pv_d6b3971b-8a54-4962-bc15-744b82277c34_5fcd9088-91eb-4ff5-aa0c-826fd6be8f03_memoryno_repeat_address_question",
      "principle_key": "memory.enforceNoRepeatQuestions",
      "runtime_scope": "chat",
      "baseline_source": "src/app/api/runtime/chat/policies/principles.ts",
      "issue_fingerprint": "memory.enforcenorepeatquestions|chat|확인한 것: 연락처 *******7159, 배송지 1 확인할 것: 인증이 확인되었습니다. 입력하신 주소로 우편번호를 찾지 못했어요. 도로명/지번 주소를 다시 입력해주세요. 그 다음으로 확인할 것: 주문 확인|address was already known but the bot asked for address again.|||otp_code|address_present_zipcode_missing"
    }
- 1ac64ace-fb64-4e90-9bbf-56eb6a9a0572 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T03:57:39.583+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "5fcd9088-91eb-4ff5-aa0c-826fd6be8f03",
      "session_id": "d6b3971b-8a54-4962-bc15-744b82277c34",
      "config_source": "principles_default"
    }
- 0887792d-1c07-447d-a352-5ee18a5b5d43 END_USER_WRITE_LATENCY (2026-02-21T03:57:38.519+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "duration_ms": 6253
    }
- 3b970509-63c4-450f-a763-753fe83ef15b END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T03:57:38.255+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "keys": [
        "address"
      ],
      "flow_id": "988ebd25-f8b1-4bb3-8649-f519b1cfa430",
      "key_count": 1,
      "keys_truncated": false
    }
- 320ecd32-0336-4114-946b-8775973825fc END_USER_CONTEXT_RESOLVED (2026-02-21T03:57:33.328+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
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
- e4002099-f471-4abf-99b3-f4ab9b228c2b END_USER_MATCH_HIT (2026-02-21T03:57:33.065+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
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
- 2230c477-1bc5-42a3-8382-e3997f7de400 ADDRESS_SEARCH_STARTED (2026-02-21T03:57:30.707+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:57:30.707Z",
        "function_name": "unknown"
      },
      "query_text": "1"
    }
- cd374a8d-2952-468e-b3fc-abaff76b5247 POLICY_DECISION (2026-02-21T03:57:30.436+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
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
        "recorded_at": "2026-02-21T03:57:30.436Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- 03108b3e-7b1f-4dc1-9e1f-4cb5311b27c3 PRE_MCP_DECISION (2026-02-21T03:57:30.167+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": true,
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
        "recorded_at": "2026-02-21T03:57:30.167Z",
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
- ccbddbce-2248-47d7-b2e3-e16c4deaa1c8 EXECUTION_GUARD_TRIGGERED (2026-02-21T03:57:29.898+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
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
        "recorded_at": "2026-02-21T03:57:29.898Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 4fe4935a-6ee4-48e3-a553-292919aa8186 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T03:57:28.038+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:57:28.038Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- a4aa4e7a-f12d-4cc8-889a-7976de9b5f47 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T03:57:27.766+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T03:57:27.766Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "otp_code"
    }
- 42c3b10c-c337-4914-84c6-5369ee44d1b2 SLOT_EXTRACTED (2026-02-21T03:57:27.5+00:00) (turn_id=5fcd9088-91eb-4ff5-aa0c-826fd6be8f03)
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
        "recorded_at": "2026-02-21T03:57:27.500Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "otp_code",
      "resolved_slots": {}
    }