

SESSION_ID: 8e82e9e0-b554-43a6-a7be-39fce4fa707d
PAGE: /app/laboratory
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): FINAL_ANSWER_READY, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_MISS, KB_LLM_ANSWER_EMPTY, KB_LLM_PROMPT_BUILT, INTENT_ROUTED, KB_MATCH_COMPLETED, KB_MATCH_STARTED, QUICK_REPLY_RULE_DECISION, POLICY_DECISION, CONFIRMED_ENTITY_DELTA_APPLIED, END_USER_CONFIRMED_ENTITY_SAVED, END_USER_MATCH_HIT, PRE_MCP_DECISION, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED
기대 목록(Debug): NO_TOOL_CALLED

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.FINAL_ANSWER_READY, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_MISS, event.KB_LLM_ANSWER_EMPTY, event.KB_LLM_PROMPT_BUILT, event.INTENT_ROUTED, event.KB_MATCH_COMPLETED, event.KB_MATCH_STARTED, event.QUICK_REPLY_RULE_DECISION, event.POLICY_DECISION, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.END_USER_CONFIRMED_ENTITY_SAVED, event.END_USER_MATCH_HIT, event.PRE_MCP_DECISION, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, debug.NO_TOOL_CALLED, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: 011ca18b-5145-4c88-a79e-997d3e69985a

[TOKEN_USED]

USER:
신청 시기

BOT:
요약: KB에 해당 정보가 없습니다.
근거: KB 및 정책에 따라 처리했습니다.
상세: 아래 항목 중 궁금한 내용을 알려주세요.
- 재입고
다음 액션: 추가 요청이 있으면 알려주세요.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 신청 시기\n확인할 것: KB에 해당 정보가 없습니다.\n아래 항목 중 궁금한 내용을 알려주세요.\n- 재입고\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
- b3f0e30d-6edc-4e3e-b44a-c6fddf988ecd (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a) (2026-03-11T23:47:35.404+00:00)
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
      "llm": {
        "model": "kb_llm_fallback"
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
        "runtime_started_at": "2026-03-11T23:47:32.835Z"
      },
      "widget": {
        "id": "1f2b5c94-3e64-426f-a5c9-915d96b23d08",
        "name": "login",
        "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
        "public_key": "mw_pk_82702f944a201fcf15f7c19e75262852"
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
        "recorded_at": "2026-03-11T23:47:35.237Z",
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
            "module_path": "src/app/api/runtime/chat/services/kbAnswerRuntime.ts",
            "function_name": "buildKbAnswerPrompt"
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": []
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
        "input_length": 5,
        "length_rule_hit": false,
        "keyword_rule_hit": true,
        "selection_reason": "keyword_rule"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- c66f536b-1af4-44d1-aa08-bd564c6037e7 FINAL_ANSWER_READY (2026-03-11T23:47:38.918+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "model": "kb_llm_fallback",
      "answer": "확인한 것: 신청 시기\n확인할 것: KB에 해당 정보가 없습니다.\n아래 항목 중 궁금한 내용을 알려주세요.\n- 재입고\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-03-11T23:47:38.918Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "debug_answer": "요약: KB에 해당 정보가 없습니다.\n근거: KB 및 정책에 따라 처리했습니다.\n상세: 아래 항목 중 궁금한 내용을 알려주세요.\n- 재입고\n다음 액션: 추가 요청이 있으면 알려주세요.",
      "intent_route": "general"
    }
- a8582071-9dd5-4cc0-95c0-e8de3a0f4c75 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-11T23:47:38.753+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "011ca18b-5145-4c88-a79e-997d3e69985a",
      "session_id": "8e82e9e0-b554-43a6-a7be-39fce4fa707d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 95a3dbe2-52a2-4da2-8b37-baf89a7c9c6d RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-11T23:47:38.373+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "011ca18b-5145-4c88-a79e-997d3e69985a",
      "session_id": "8e82e9e0-b554-43a6-a7be-39fce4fa707d",
      "config_source": "principles_default"
    }
- ff238077-6d51-4c4f-ace9-4db21a69d5df END_USER_WRITE_LATENCY (2026-03-11T23:47:37.708+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "duration_ms": 2132
    }
- ec255b87-f275-4962-abbf-1fd879f414bd END_USER_CONTEXT_RESOLVED (2026-03-11T23:47:36.396+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "match_hit": false,
      "end_user_id": "3a8242a0-07af-49be-9604-9398e4a15ec0",
      "identity_count": 1,
      "identity_types": [
        "external"
      ],
      "match_attempted": true,
      "resolution_source": "created"
    }
- 714e38ee-fcdd-4150-ac61-ee588de184e4 END_USER_MATCH_MISS (2026-03-11T23:47:36.235+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "matched": false,
      "identity_count": 1,
      "identity_types": [
        "external"
      ]
    }
- 4ffd7493-44f3-438b-a586-1d6064ffdeec KB_LLM_ANSWER_EMPTY (2026-03-11T23:47:35.061+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "reason": "KB_NO_MATCH",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T23:47:35.061Z",
        "function_name": "unknown"
      },
      "fallback_used": true
    }
- 4f30a28c-b347-4ab0-a476-a2fe05d81702 KB_LLM_PROMPT_BUILT (2026-03-11T23:47:34.891+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T23:47:34.891Z",
        "function_name": "unknown"
      },
      "kb_topics": [
        "재입고"
      ],
      "intent_route": "kb_answer",
      "answerability": {
        "reason": "KB_NO_MATCH",
        "canAnswer": false,
        "evidenceKeys": []
      },
      "evidence_keys": [],
      "kb_context_size": 43,
      "kb_context_source": "full"
    }
- 987c773d-0a9d-4830-bb8f-20a1a2f25625 INTENT_ROUTED (2026-03-11T23:47:34.726+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T23:47:34.726Z",
        "function_name": "unknown"
      },
      "intent_route": "kb_answer",
      "intent_selected": "general",
      "has_pending_flow": false,
      "kb_content_present": true,
      "has_expected_inputs": false,
      "transactional_intent": false
    }
- 9809090a-bcb5-4e31-9d92-61bc496667a1 KB_MATCH_COMPLETED (2026-03-11T23:47:34.293+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "key": null,
      "score": null,
      "matched": false,
      "section": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T23:47:34.293Z",
        "function_name": "unknown"
      },
      "source_kb_id": null,
      "source_kb_title": null
    }
- 90e5d777-e2db-47e0-8b6b-729f8f08a2e5 KB_MATCH_STARTED (2026-03-11T23:47:34.12+00:00) (turn_id=011ca18b-5145-4c88-a79e-997d3e69985a)
  payload:
    {
      "kb_id": "__INLINE_KB__",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-11T23:47:34.120Z",
        "function_name": "unknown"
      },
      "query_text": "신청 시기",
      "admin_kb_ids": []
    }


TURN_ID: b1c1ec23-5292-4666-9f28-302178d4ceee

[TOKEN_USED]

USER:
볼캡 재입고

BOT:
확인한 것: 볼캡 재입고
확인할 것: 요약: 코듀로이 볼캡 입고 예정일 07/05입니다.
상세: 예정일 2026-07-05 (D-115)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 볼캡 재입고\n확인할 것: 요약: 코듀로이 볼캡 입고 예정일 07/05입니다.\n상세: 예정일 2026-07-05 (D-115)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
- 58165c10-a69c-4ff4-afce-d6b0aa679f38 (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee) (2026-03-12T00:11:48.055+00:00)
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
        "recorded_at": "2026-03-12T00:11:47.879Z",
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
        "expected_input_source": "reset_by_restock_intent"
      },
      "model_resolution": {
        "input_length": 6,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      }
    }
이벤트 로그:
- b2a463b9-abe9-4970-a47b-9247bf72b219 QUICK_REPLY_RULE_DECISION (2026-03-12T00:11:54.166+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
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
- 46b87c8f-daf9-439d-bf4f-5e91a759c41d FINAL_ANSWER_READY (2026-03-12T00:11:54+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 볼캡 재입고\n확인할 것: 요약: 코듀로이 볼캡 입고 예정일 07/05입니다.\n상세: 예정일 2026-07-05 (D-115)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-03-12T00:11:54.000Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- fc3cf0dd-870f-4a4d-b725-593508ea460f POLICY_DECISION (2026-03-12T00:11:53.817+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
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
        "recorded_at": "2026-03-12T00:11:53.816Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "코듀로이 볼캡"
    }
- fce7fc6d-049d-4aa1-9215-d9baaf9a07f4 CONFIRMED_ENTITY_DELTA_APPLIED (2026-03-12T00:11:53.657+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "keys": [
        "product_name",
        "channel"
      ],
      "delta": {
        "channel": "sms",
        "product_name": "코듀로이 볼캡"
      },
      "flow_id": "202890ed-1e52-4a2b-b572-b6037237b721",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:53.657Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 884f9080-937d-4741-a061-bc011e9cfafe RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-12T00:11:53.491+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "b1c1ec23-5292-4666-9f28-302178d4ceee",
      "session_id": "8e82e9e0-b554-43a6-a7be-39fce4fa707d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- d35c9d5d-a94a-4721-9b66-f17343ae1828 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-12T00:11:52.791+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "b1c1ec23-5292-4666-9f28-302178d4ceee",
      "session_id": "8e82e9e0-b554-43a6-a7be-39fce4fa707d",
      "config_source": "principles_default"
    }
- 1c9012a3-8bf0-4ab1-a6e3-c630455deb9a END_USER_WRITE_LATENCY (2026-03-12T00:11:52.114+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "duration_ms": 3877
    }
- aef750a9-88a0-4dc1-83f6-0f3fb18f09ec END_USER_CONFIRMED_ENTITY_SAVED (2026-03-12T00:11:51.951+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "keys": [
        "channel",
        "product_name"
      ],
      "flow_id": "202890ed-1e52-4a2b-b572-b6037237b721",
      "key_count": 2,
      "keys_truncated": false
    }
- d5f84f07-d5be-4a72-80dc-5b5b9c916d43 END_USER_CONTEXT_RESOLVED (2026-03-12T00:11:48.973+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "match_hit": true,
      "end_user_id": "3a8242a0-07af-49be-9604-9398e4a15ec0",
      "identity_count": 1,
      "identity_types": [
        "external"
      ],
      "match_attempted": true,
      "resolution_source": "session"
    }
- 71cbc065-648f-48ef-89ae-bd12b187a37c END_USER_MATCH_HIT (2026-03-12T00:11:48.778+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "matched": true,
      "identity_count": 1,
      "identity_types": [
        "external"
      ]
    }
- 3936e046-7f63-4e6d-94b8-43d3cb8e885f PRE_MCP_DECISION (2026-03-12T00:11:47.616+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
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
        "recorded_at": "2026-03-12T00:11:47.616Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "볼캡 재입고",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "볼캡 재입고"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false
    }
- 4abe1235-07c8-4f03-85ec-daa1fbd2f809 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-03-12T00:11:47.255+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:47.255Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "볼캡 재입고"
      }
    }
- c7ac126e-704a-49fb-b890-423e2ad94768 POLICY_DECISION (2026-03-12T00:11:47.083+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
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
        "recorded_at": "2026-03-12T00:11:47.082Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "볼캡 재입고"
      }
    }
- 64d8e356-088c-4585-be74-400c5db63860 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-03-12T00:11:46.913+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:46.913Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- d19c9f1e-e3c9-4396-b217-54e170bfe11f SLOT_EXTRACTED (2026-03-12T00:11:46.746+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
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
        "recorded_at": "2026-03-12T00:11:46.746Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "볼캡 재입고"
      }
    }
- e86376ad-07ed-436d-be0b-fbda603ca569 INTENT_ROUTED (2026-03-12T00:11:46.528+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:46.528Z",
        "function_name": "unknown"
      },
      "intent_route": "transactional",
      "intent_selected": "restock_inquiry",
      "has_pending_flow": false,
      "kb_content_present": true,
      "has_expected_inputs": false,
      "transactional_intent": true
    }
- 69fb6552-2f33-4acb-9478-d2fba1215d83 KB_MATCH_COMPLETED (2026-03-12T00:11:46.362+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "key": "재입고",
      "score": 0.93,
      "matched": true,
      "section": "재입고",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:46.362Z",
        "function_name": "unknown"
      },
      "source_kb_id": "__INLINE_KB__",
      "source_kb_title": "사용자 KB"
    }
- 1eef30e8-4682-4a83-87f7-6de05c1dde49 KB_MATCH_STARTED (2026-03-12T00:11:46.182+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "kb_id": "__INLINE_KB__",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:46.182Z",
        "function_name": "unknown"
      },
      "query_text": "볼캡 재입고",
      "admin_kb_ids": []
    }
- 1375fcbb-0d72-4f05-b558-93e927b799f7 INPUT_CONTRACT_REVIEW_COMPLETED (2026-03-12T00:11:46.011+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:46.011Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 673a2ca9-3f00-4a01-8e19-3a38f26f44f6 INPUT_CONTRACT_REVIEW_STARTED (2026-03-12T00:11:45.846+00:00) (turn_id=b1c1ec23-5292-4666-9f28-302178d4ceee)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T00:11:45.845Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
