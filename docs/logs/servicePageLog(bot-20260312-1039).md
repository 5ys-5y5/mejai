

SESSION_ID: ccc54e68-a052-4263-af84-f7eeb1f65bca
PAGE: /app/laboratory
KIND: conversation

디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): -
기대 목록(Event): FINAL_ANSWER_READY, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_HIT, KB_LLM_ANSWER_EMPTY, KB_LLM_PROMPT_BUILT, INTENT_ROUTED, KB_MATCH_COMPLETED, KB_MATCH_STARTED
기대 목록(Debug): NO_TOOL_CALLED

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: event.FINAL_ANSWER_READY, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_HIT, event.KB_LLM_ANSWER_EMPTY, event.KB_LLM_PROMPT_BUILT, event.INTENT_ROUTED, event.KB_MATCH_COMPLETED, event.KB_MATCH_STARTED, debug.NO_TOOL_CALLED, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: 2584f50a-fb1b-4b27-953e-6b791bb690d0

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
- 90de1809-ac93-4c06-b72c-101b65ace5c4 (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0) (2026-03-12T01:34:46.449+00:00)
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
        "id": "f029c027-6951-4677-9ea6-de8c6e3fa5ab",
        "name": "login",
        "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
        "public_key": "mw_pk_798b4ab1e0562746bd12fcef58ed7faa"
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
        "recorded_at": "2026-03-12T01:34:45.672Z",
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
- 97f56e8e-cbe6-480b-a8da-1762a279efd8 FINAL_ANSWER_READY (2026-03-12T01:34:50.482+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
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
        "recorded_at": "2026-03-12T01:34:50.482Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "debug_answer": "요약: KB에 해당 정보가 없습니다.\n근거: KB 및 정책에 따라 처리했습니다.\n상세: 아래 항목 중 궁금한 내용을 알려주세요.\n- 재입고\n다음 액션: 추가 요청이 있으면 알려주세요.",
      "intent_route": "general"
    }
- 1e9e8504-8c20-4fc8-9129-06ec8ae88d8f RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-03-12T01:34:50.315+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "2584f50a-fb1b-4b27-953e-6b791bb690d0",
      "session_id": "ccc54e68-a052-4263-af84-f7eeb1f65bca",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- d3952424-6420-43d8-9618-bdc3ac117d73 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-03-12T01:34:49.653+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "2584f50a-fb1b-4b27-953e-6b791bb690d0",
      "session_id": "ccc54e68-a052-4263-af84-f7eeb1f65bca",
      "config_source": "principles_default"
    }
- b296bcd4-a7a5-4687-89cb-b3a29f89e33f END_USER_WRITE_LATENCY (2026-03-12T01:34:48.984+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "duration_ms": 2363
    }
- 5c20baae-be29-4ab6-a17d-72dac77f439c END_USER_CONTEXT_RESOLVED (2026-03-12T01:34:47.297+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "match_hit": true,
      "end_user_id": "2b081954-7e8d-424b-9c95-e5ab13ec7727",
      "identity_count": 1,
      "identity_types": [
        "external"
      ],
      "match_attempted": true,
      "resolution_source": "identity_match"
    }
- 16217d71-985d-42a5-8dd8-4c539ce36490 END_USER_MATCH_HIT (2026-03-12T01:34:47.134+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "matched": true,
      "identity_count": 1,
      "identity_types": [
        "external"
      ]
    }
- a74c6149-9db3-4407-91fb-9cefcc3d07e3 KB_LLM_ANSWER_EMPTY (2026-03-12T01:34:45.481+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "reason": "KB_NO_MATCH",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T01:34:45.481Z",
        "function_name": "unknown"
      },
      "fallback_used": true
    }
- 116f5165-ba43-43e7-9048-0fe40c5e982d KB_LLM_PROMPT_BUILT (2026-03-12T01:34:45.298+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T01:34:45.297Z",
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
- 23e099ba-963c-4fb5-8b77-e48b8ee8dc85 INTENT_ROUTED (2026-03-12T01:34:45.125+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T01:34:45.125Z",
        "function_name": "unknown"
      },
      "intent_route": "kb_answer",
      "intent_selected": "general",
      "has_pending_flow": false,
      "kb_content_present": true,
      "has_expected_inputs": false,
      "transactional_intent": false
    }
- 8fa7b490-62e6-4555-9e09-8077379cd0a4 KB_MATCH_COMPLETED (2026-03-12T01:34:44.954+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
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
        "recorded_at": "2026-03-12T01:34:44.954Z",
        "function_name": "unknown"
      },
      "source_kb_id": null,
      "source_kb_title": null
    }
- 35f009bf-f750-48e8-85b9-d490347f2567 KB_MATCH_STARTED (2026-03-12T01:34:44.778+00:00) (turn_id=2584f50a-fb1b-4b27-953e-6b791bb690d0)
  payload:
    {
      "kb_id": "__INLINE_KB__",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-03-12T01:34:44.777Z",
        "function_name": "unknown"
      },
      "query_text": "신청 시기",
      "admin_kb_ids": []
    }
