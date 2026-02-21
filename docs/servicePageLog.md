TURN_ID: -

[TOKEN_USED]

USER:
재입고

BOT:
응답 실패

[TOKEN_UNUSED]

TURN_ID: 612af1c9-ae77-4e5b-9785-641011306f09

TURN_ID: 612af1c9-ae77-4e5b-9785-641011306f09

[TOKEN_USED]

USER:
재입고 일정

BOT:
확인한 것: 재입고 일정
확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대체 상품 확인해 드려도 될까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대체 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 23916a8d-8110-4541-a5d2-f551040fa29a (turn_id=612af1c9-ae77-4e5b-9785-641011306f09) (2026-02-21T09:47:07.721+00:00)
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
        "recorded_at": "2026-02-21T09:47:07.556Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_source": "reset_by_restock_intent"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- e0853acf-5ecb-4139-b23b-408a6027506d QUICK_REPLY_RULE_DECISION (2026-02-21T09:47:12.069+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
- 8cb1c0d6-f6ff-47da-8db6-de8e284a5a6c FINAL_ANSWER_READY (2026-02-21T09:47:11.912+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대체 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-02-21T09:47:11.912Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockIntent"
      }
    }
- cb1f9e07-4bdc-4b92-b598-f2dfb590dbba POLICY_DECISION (2026-02-21T09:47:11.749+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "stage": "tool",
      "action": "ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
        "recorded_at": "2026-02-21T09:47:11.749Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 2ee43924-5810-4830-9bb5-2684e23b687c RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:47:11.575+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "612af1c9-ae77-4e5b-9785-641011306f09",
      "session_id": "ee9dc649-7bf4-46e2-9385-0ab3be925b52",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- f0e4d4e9-8849-4a05-8603-e1876e1e4007 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:47:11.208+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "612af1c9-ae77-4e5b-9785-641011306f09",
      "session_id": "ee9dc649-7bf4-46e2-9385-0ab3be925b52",
      "config_source": "principles_default"
    }
- 6ba8b30e-4371-44bb-92f3-d4b2b653b224 END_USER_WRITE_LATENCY (2026-02-21T09:47:10.532+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "duration_ms": 2639
    }
- 52e79911-2d38-46b8-ab16-6dc36c781e5e END_USER_CONTEXT_RESOLVED (2026-02-21T09:47:08.547+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
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
- fd3a43ad-b0d4-4cb2-b9e6-632dbeb9c2ee END_USER_MATCH_HIT (2026-02-21T09:47:08.378+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- e71b2a06-7363-4250-bd13-5616ec4180e8 PRE_MCP_DECISION (2026-02-21T09:47:05.656+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
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
        "recorded_at": "2026-02-21T09:47:05.656Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "재입고 일정",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "재입고 일정"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- d38e6153-19c2-4e8d-80c7-895a76d0ce26 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T09:47:05.334+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:47:05.334Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- bb0d02a9-0f2f-4c1f-b210-1a67b4c40a15 POLICY_DECISION (2026-02-21T09:47:05.163+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
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
        "recorded_at": "2026-02-21T09:47:05.163Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 4ee9c3f8-2e60-4031-91ac-84871f541495 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T09:47:05.006+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:47:05.006Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- 3b7f27e8-a2f1-4263-be33-af0ecd8d6edc SLOT_EXTRACTED (2026-02-21T09:47:04.837+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
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
        "recorded_at": "2026-02-21T09:47:04.837Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- f5f981e0-73e3-4d6f-8823-b1cd6e646256 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T09:47:04.676+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:47:04.676Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- c973ecae-81c5-4fbb-aa99-72321e5d02ed INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T09:47:04.515+00:00) (turn_id=612af1c9-ae77-4e5b-9785-641011306f09)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:47:04.515Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: c8866e37-ded0-48ef-9a4e-0c6dd7107ccb

TURN_ID: c8866e37-ded0-48ef-9a4e-0c6dd7107ccb

[TOKEN_USED]

USER:
재입고 일정

BOT:
확인한 것: 재입고 일정
확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- f7670bbb-a60e-4be2-ae8e-aab27eb81365 (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb) (2026-02-21T09:48:53.176+00:00)
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
        "recorded_at": "2026-02-21T09:48:53.015Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_source": "reset_by_restock_intent"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 72824b22-3734-48cd-a5db-ab8cbac33201 QUICK_REPLY_RULE_DECISION (2026-02-21T09:48:57.478+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
- 92066649-32da-47b3-8424-ab90e0945759 FINAL_ANSWER_READY (2026-02-21T09:48:57.316+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-02-21T09:48:57.316Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockIntent"
      }
    }
- 6c06284b-ee91-4f5c-b8c4-5a8776a2b30a POLICY_DECISION (2026-02-21T09:48:57.157+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "stage": "tool",
      "action": "ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
        "recorded_at": "2026-02-21T09:48:57.157Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 2d818fd1-369a-47a4-a914-b4b2ce4b97af RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:48:56.879+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 5f128050-2068-4b8a-8994-d39825b6f031 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:48:56.513+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- 4029d1bd-b2f6-4b8e-9d59-f608acb7b416 END_USER_WRITE_LATENCY (2026-02-21T09:48:55.885+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "duration_ms": 2543
    }
- e3328813-d223-47b1-b08c-40170bdd99c0 END_USER_CONTEXT_RESOLVED (2026-02-21T09:48:53.978+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
- 6f087c3f-e2e8-4af2-9f1c-0ed8e6372f76 END_USER_MATCH_HIT (2026-02-21T09:48:53.821+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 143e6682-47ff-4f82-87f6-02b56cdd47c6 PRE_MCP_DECISION (2026-02-21T09:48:51.307+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:51.307Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "재입고 일정",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "재입고 일정"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- d830ca93-3946-4f84-846c-62ac03c1add5 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T09:48:50.991+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.991Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- ae6bcef6-eccf-4b23-9f0c-021559d5f133 POLICY_DECISION (2026-02-21T09:48:50.834+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.834Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 1932279c-3a48-4aef-9f54-a1367652e9ae INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T09:48:50.68+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.680Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- e2273b22-f761-4760-b3e1-b38613ebde1a SLOT_EXTRACTED (2026-02-21T09:48:50.518+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.518Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 847e84a3-c1cd-4ee4-b534-9c9f7b43f030 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T09:48:50.362+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.362Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- e927ebed-20cc-4e03-b67a-d106b9033d2c INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T09:48:50.208+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.208Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: d14398b5-623f-44fb-a7f9-317840678313

TURN_ID: c8866e37-ded0-48ef-9a4e-0c6dd7107ccb

[TOKEN_USED]

USER:
재입고 일정

BOT:
확인한 것: 재입고 일정
확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- f7670bbb-a60e-4be2-ae8e-aab27eb81365 (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb) (2026-02-21T09:48:53.176+00:00)
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
        "recorded_at": "2026-02-21T09:48:53.015Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_source": "reset_by_restock_intent"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 72824b22-3734-48cd-a5db-ab8cbac33201 QUICK_REPLY_RULE_DECISION (2026-02-21T09:48:57.478+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
- 92066649-32da-47b3-8424-ab90e0945759 FINAL_ANSWER_READY (2026-02-21T09:48:57.316+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-02-21T09:48:57.316Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockIntent"
      }
    }
- 6c06284b-ee91-4f5c-b8c4-5a8776a2b30a POLICY_DECISION (2026-02-21T09:48:57.157+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "stage": "tool",
      "action": "ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
        "recorded_at": "2026-02-21T09:48:57.157Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 2d818fd1-369a-47a4-a914-b4b2ce4b97af RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:48:56.879+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 5f128050-2068-4b8a-8994-d39825b6f031 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:48:56.513+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- 4029d1bd-b2f6-4b8e-9d59-f608acb7b416 END_USER_WRITE_LATENCY (2026-02-21T09:48:55.885+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "duration_ms": 2543
    }
- e3328813-d223-47b1-b08c-40170bdd99c0 END_USER_CONTEXT_RESOLVED (2026-02-21T09:48:53.978+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
- 6f087c3f-e2e8-4af2-9f1c-0ed8e6372f76 END_USER_MATCH_HIT (2026-02-21T09:48:53.821+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 143e6682-47ff-4f82-87f6-02b56cdd47c6 PRE_MCP_DECISION (2026-02-21T09:48:51.307+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:51.307Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "재입고 일정",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "재입고 일정"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- d830ca93-3946-4f84-846c-62ac03c1add5 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T09:48:50.991+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.991Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- ae6bcef6-eccf-4b23-9f0c-021559d5f133 POLICY_DECISION (2026-02-21T09:48:50.834+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.834Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 1932279c-3a48-4aef-9f54-a1367652e9ae INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T09:48:50.68+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.680Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- e2273b22-f761-4760-b3e1-b38613ebde1a SLOT_EXTRACTED (2026-02-21T09:48:50.518+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.518Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 847e84a3-c1cd-4ee4-b534-9c9f7b43f030 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T09:48:50.362+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.362Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- e927ebed-20cc-4e03-b67a-d106b9033d2c INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T09:48:50.208+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.208Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: d14398b5-623f-44fb-a7f9-317840678313

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 네
확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?
- 1번 | 코듀로이 볼캡 | 03/23
- 2번 | 골덴 원피스 | 04/01
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 네\n확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?\n- 1번 | 코듀로이 볼캡 | 03/23\n- 2번 | 골덴 원피스 | 04/01\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 4dcc0966-2949-4f6f-9e71-7849d2a3cac5 (turn_id=d14398b5-623f-44fb-a7f9-317840678313) (2026-02-21T09:49:22.929+00:00)
  prefix_json:
    {
      "slot": {
        "phone_masked": "-",
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
        "recorded_at": "2026-02-21T09:49:22.771Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "contract_stage"
      }
    }
이벤트 로그:
- 9f4f3c7f-298f-454c-8286-12d8a818b9d0 QUICK_REPLY_RULE_DECISION (2026-02-21T09:49:27.119+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_non_target_alternative_choice",
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
- 3cbad17c-fe92-4602-b93f-5ca57f53c762 FINAL_ANSWER_READY (2026-02-21T09:49:26.964+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 네\n확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?\n- 1번 | 코듀로이 볼캡 | 03/23\n- 2번 | 골덴 원피스 | 04/01\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-02-21T09:49:26.964Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_non_target_alternative_choice",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockPendingStage"
      }
    }
- e8f14830-fcb9-45e3-8cbc-5f1bbfea26a2 POLICY_DECISION (2026-02-21T09:49:26.803+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "stage": "tool",
      "action": "ASK_RESTOCK_PRODUCT_CHOICE",
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
        "recorded_at": "2026-02-21T09:49:26.803Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 963c636f-2f49-4136-ad85-24d1b527f723 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:49:26.645+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d14398b5-623f-44fb-a7f9-317840678313",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 6bf1695a-9ec1-40e1-b840-1d137cf459cb RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:49:26.299+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d14398b5-623f-44fb-a7f9-317840678313",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- 0346ee9c-131d-4402-abed-2e97407b1b6d END_USER_WRITE_LATENCY (2026-02-21T09:49:25.656+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "duration_ms": 2563
    }
- ee9b83cc-4fb5-4f0d-b596-3fafcd2f47b9 END_USER_CONTEXT_RESOLVED (2026-02-21T09:49:23.726+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
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
- f5aba733-24c3-476c-82f1-3db80229c5c7 END_USER_MATCH_HIT (2026-02-21T09:49:23.57+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }


TURN_ID: 7f771e21-9f13-4ff4-bcb9-838ee658f987

TURN_ID: c8866e37-ded0-48ef-9a4e-0c6dd7107ccb

[TOKEN_USED]

USER:
재입고 일정

BOT:
확인한 것: 재입고 일정
확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- f7670bbb-a60e-4be2-ae8e-aab27eb81365 (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb) (2026-02-21T09:48:53.176+00:00)
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
        "recorded_at": "2026-02-21T09:48:53.015Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_source": "reset_by_restock_intent"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 72824b22-3734-48cd-a5db-ab8cbac33201 QUICK_REPLY_RULE_DECISION (2026-02-21T09:48:57.478+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
- 92066649-32da-47b3-8424-ab90e0945759 FINAL_ANSWER_READY (2026-02-21T09:48:57.316+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-02-21T09:48:57.316Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockIntent"
      }
    }
- 6c06284b-ee91-4f5c-b8c4-5a8776a2b30a POLICY_DECISION (2026-02-21T09:48:57.157+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "stage": "tool",
      "action": "ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
        "recorded_at": "2026-02-21T09:48:57.157Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 2d818fd1-369a-47a4-a914-b4b2ce4b97af RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:48:56.879+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 5f128050-2068-4b8a-8994-d39825b6f031 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:48:56.513+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- 4029d1bd-b2f6-4b8e-9d59-f608acb7b416 END_USER_WRITE_LATENCY (2026-02-21T09:48:55.885+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "duration_ms": 2543
    }
- e3328813-d223-47b1-b08c-40170bdd99c0 END_USER_CONTEXT_RESOLVED (2026-02-21T09:48:53.978+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
- 6f087c3f-e2e8-4af2-9f1c-0ed8e6372f76 END_USER_MATCH_HIT (2026-02-21T09:48:53.821+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 143e6682-47ff-4f82-87f6-02b56cdd47c6 PRE_MCP_DECISION (2026-02-21T09:48:51.307+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:51.307Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "재입고 일정",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "재입고 일정"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- d830ca93-3946-4f84-846c-62ac03c1add5 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T09:48:50.991+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.991Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- ae6bcef6-eccf-4b23-9f0c-021559d5f133 POLICY_DECISION (2026-02-21T09:48:50.834+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.834Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 1932279c-3a48-4aef-9f54-a1367652e9ae INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T09:48:50.68+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.680Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- e2273b22-f761-4760-b3e1-b38613ebde1a SLOT_EXTRACTED (2026-02-21T09:48:50.518+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.518Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 847e84a3-c1cd-4ee4-b534-9c9f7b43f030 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T09:48:50.362+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.362Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- e927ebed-20cc-4e03-b67a-d106b9033d2c INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T09:48:50.208+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.208Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: d14398b5-623f-44fb-a7f9-317840678313

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 네
확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?
- 1번 | 코듀로이 볼캡 | 03/23
- 2번 | 골덴 원피스 | 04/01
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 네\n확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?\n- 1번 | 코듀로이 볼캡 | 03/23\n- 2번 | 골덴 원피스 | 04/01\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 4dcc0966-2949-4f6f-9e71-7849d2a3cac5 (turn_id=d14398b5-623f-44fb-a7f9-317840678313) (2026-02-21T09:49:22.929+00:00)
  prefix_json:
    {
      "slot": {
        "phone_masked": "-",
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
        "recorded_at": "2026-02-21T09:49:22.771Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "contract_stage"
      }
    }
이벤트 로그:
- 9f4f3c7f-298f-454c-8286-12d8a818b9d0 QUICK_REPLY_RULE_DECISION (2026-02-21T09:49:27.119+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_non_target_alternative_choice",
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
- 3cbad17c-fe92-4602-b93f-5ca57f53c762 FINAL_ANSWER_READY (2026-02-21T09:49:26.964+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 네\n확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?\n- 1번 | 코듀로이 볼캡 | 03/23\n- 2번 | 골덴 원피스 | 04/01\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-02-21T09:49:26.964Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_non_target_alternative_choice",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockPendingStage"
      }
    }
- e8f14830-fcb9-45e3-8cbc-5f1bbfea26a2 POLICY_DECISION (2026-02-21T09:49:26.803+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "stage": "tool",
      "action": "ASK_RESTOCK_PRODUCT_CHOICE",
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
        "recorded_at": "2026-02-21T09:49:26.803Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 963c636f-2f49-4136-ad85-24d1b527f723 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:49:26.645+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d14398b5-623f-44fb-a7f9-317840678313",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 6bf1695a-9ec1-40e1-b840-1d137cf459cb RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:49:26.299+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d14398b5-623f-44fb-a7f9-317840678313",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- 0346ee9c-131d-4402-abed-2e97407b1b6d END_USER_WRITE_LATENCY (2026-02-21T09:49:25.656+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "duration_ms": 2563
    }
- ee9b83cc-4fb5-4f0d-b596-3fafcd2f47b9 END_USER_CONTEXT_RESOLVED (2026-02-21T09:49:23.726+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
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
- f5aba733-24c3-476c-82f1-3db80229c5c7 END_USER_MATCH_HIT (2026-02-21T09:49:23.57+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }


TURN_ID: 7f771e21-9f13-4ff4-bcb9-838ee658f987

[TOKEN_USED]

USER:
2

BOT:
확인한 것: 상품 골덴 원피스
확인할 것: 요약: 골덴 원피스 입고 예정일 04/01입니다.
상세: 예정일 2026-04-01 (D-39)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 입고 일정 안내 및 알림 신청 여부 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 골덴 원피스\n확인할 것: 요약: 골덴 원피스 입고 예정일 04/01입니다.\n상세: 예정일 2026-04-01 (D-39)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 입고 일정 안내 및 알림 신청 여부 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- d421823f-c9a9-488c-b2c5-360fcaf7e0d3 (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987) (2026-02-21T09:49:33.657+00:00)
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
        "recorded_at": "2026-02-21T09:49:33.430Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [
          "product_query"
        ],
        "expected_input_stage": "restock.awaiting_product",
        "expected_input_source": "contract_stage"
      }
    }
이벤트 로그:
- c1c29afd-03ed-491e-a653-34268d2ef909 QUICK_REPLY_RULE_DECISION (2026-02-21T09:49:38.776+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
- 2d75d9ec-6c81-4664-9245-9b404bcf9e57 FINAL_ANSWER_READY (2026-02-21T09:49:38.615+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 상품 골덴 원피스\n확인할 것: 요약: 골덴 원피스 입고 예정일 04/01입니다.\n상세: 예정일 2026-04-01 (D-39)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 입고 일정 안내 및 알림 신청 여부 확인",
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
        "recorded_at": "2026-02-21T09:49:38.615Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- 7308a07e-a371-41d0-8937-b1b478a143c8 POLICY_DECISION (2026-02-21T09:49:38.457+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "stage": "tool",
      "action": "RESTOCK_SCHEDULE_ANSWERED_BY_KB_CHOICE",
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
        "recorded_at": "2026-02-21T09:49:38.457Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "골덴 원피스"
    }
- cc31955a-f2ad-4130-b97e-5b27e71dcf78 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T09:49:38.3+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "keys": [
        "product_name",
        "channel",
        "day",
        "month"
      ],
      "delta": {
        "day": "1",
        "month": "4",
        "channel": "sms",
        "product_name": "골덴 원피스"
      },
      "flow_id": "793d72d2-a87d-4b23-ab11-5a4d58203bff",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:49:38.300Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- b78cfb4d-2985-4597-a274-12859b47e358 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:49:38.145+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7f771e21-9f13-4ff4-bcb9-838ee658f987",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- c0c71e7b-94f9-4707-a617-68de0d7b85bb RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:49:37.783+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7f771e21-9f13-4ff4-bcb9-838ee658f987",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- a1f2ddea-a96b-4d47-b3c0-fcc6966d5f82 END_USER_WRITE_LATENCY (2026-02-21T09:49:37.157+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "duration_ms": 3333
    }
- 9c6d2bb0-072d-4268-8b8a-d7b4a4b06806 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T09:49:37.004+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "keys": [
        "day",
        "month",
        "channel",
        "product_name"
      ],
      "flow_id": "793d72d2-a87d-4b23-ab11-5a4d58203bff",
      "key_count": 4,
      "keys_truncated": false
    }
- 6e5d00ee-2350-423f-bd14-03d8d7e69237 END_USER_CONTEXT_RESOLVED (2026-02-21T09:49:34.468+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
- a9811827-a3fb-4ebe-b569-f694d68ba091 END_USER_MATCH_HIT (2026-02-21T09:49:34.302+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 33a50cc6-eb08-43f1-91a0-97761c9f8317 PRE_MCP_DECISION (2026-02-21T09:49:33.265+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
        "recorded_at": "2026-02-21T09:49:33.265Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "2",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "골덴 원피스"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- a31395d1-c31b-4af2-a81c-c5d7ee6a679b INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T09:49:32.935+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:49:32.935Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "골덴 원피스"
      }
    }
- 94ceb9d7-53f9-4d3d-aa33-08339a988154 POLICY_DECISION (2026-02-21T09:49:32.773+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
        "recorded_at": "2026-02-21T09:49:32.773Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "골덴 원피스"
      }
    }
- ef14beef-f5a5-4184-ade8-c74756f19ccd INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T09:49:32.617+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:49:32.617Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "product_query"
    }
- e0f9a5dd-e17d-4abb-b5b8-089edd00df38 SLOT_EXTRACTED (2026-02-21T09:49:32.458+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
        "recorded_at": "2026-02-21T09:49:32.458Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "product_query",
      "resolved_slots": {
        "product_query": "골덴 원피스"
      }
    }


TURN_ID: 7f771e21-9f13-4ff4-bcb9-838ee658f987

TURN_ID: c8866e37-ded0-48ef-9a4e-0c6dd7107ccb

[TOKEN_USED]

USER:
재입고 일정

BOT:
확인한 것: 재입고 일정
확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?
네/아니오로 답해주세요.
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- f7670bbb-a60e-4be2-ae8e-aab27eb81365 (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb) (2026-02-21T09:48:53.176+00:00)
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
        "recorded_at": "2026-02-21T09:48:53.015Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [],
        "expected_input_source": "reset_by_restock_intent"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 72824b22-3734-48cd-a5db-ab8cbac33201 QUICK_REPLY_RULE_DECISION (2026-02-21T09:48:57.478+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
- 92066649-32da-47b3-8424-ab90e0945759 FINAL_ANSWER_READY (2026-02-21T09:48:57.316+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 재입고 일정\n확인할 것: 요청하신 상품은 현재 재입고 예정이 없습니다. 대신 다른 상품 확인해 드려도 될까요?\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-02-21T09:48:57.316Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "policy:ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockIntent"
      }
    }
- 6c06284b-ee91-4f5c-b8c4-5a8776a2b30a POLICY_DECISION (2026-02-21T09:48:57.157+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "stage": "tool",
      "action": "ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM",
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
        "recorded_at": "2026-02-21T09:48:57.157Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 2d818fd1-369a-47a4-a914-b4b2ce4b97af RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:48:56.879+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 5f128050-2068-4b8a-8994-d39825b6f031 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:48:56.513+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "c8866e37-ded0-48ef-9a4e-0c6dd7107ccb",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- 4029d1bd-b2f6-4b8e-9d59-f608acb7b416 END_USER_WRITE_LATENCY (2026-02-21T09:48:55.885+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "duration_ms": 2543
    }
- e3328813-d223-47b1-b08c-40170bdd99c0 END_USER_CONTEXT_RESOLVED (2026-02-21T09:48:53.978+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
- 6f087c3f-e2e8-4af2-9f1c-0ed8e6372f76 END_USER_MATCH_HIT (2026-02-21T09:48:53.821+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 143e6682-47ff-4f82-87f6-02b56cdd47c6 PRE_MCP_DECISION (2026-02-21T09:48:51.307+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:51.307Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "재입고 일정",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "재입고 일정"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- d830ca93-3946-4f84-846c-62ac03c1add5 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T09:48:50.991+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.991Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- ae6bcef6-eccf-4b23-9f0c-021559d5f133 POLICY_DECISION (2026-02-21T09:48:50.834+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.834Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 1932279c-3a48-4aef-9f54-a1367652e9ae INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T09:48:50.68+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.680Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": null
    }
- e2273b22-f761-4760-b3e1-b38613ebde1a SLOT_EXTRACTED (2026-02-21T09:48:50.518+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
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
        "recorded_at": "2026-02-21T09:48:50.518Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": null,
      "resolved_slots": {
        "product_query": "재입고 일정"
      }
    }
- 847e84a3-c1cd-4ee4-b534-9c9f7b43f030 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-21T09:48:50.362+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": "reset_by_restock_intent",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.362Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- e927ebed-20cc-4e03-b67a-d106b9033d2c INPUT_CONTRACT_REVIEW_STARTED (2026-02-21T09:48:50.208+00:00) (turn_id=c8866e37-ded0-48ef-9a4e-0c6dd7107ccb)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:48:50.208Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }


TURN_ID: d14398b5-623f-44fb-a7f9-317840678313

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 네
확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?
- 1번 | 코듀로이 볼캡 | 03/23
- 2번 | 골덴 원피스 | 04/01
그 다음으로 확인할 것: 알림 시작일 선택
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 네\n확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?\n- 1번 | 코듀로이 볼캡 | 03/23\n- 2번 | 골덴 원피스 | 04/01\n그 다음으로 확인할 것: 알림 시작일 선택",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- 4dcc0966-2949-4f6f-9e71-7849d2a3cac5 (turn_id=d14398b5-623f-44fb-a7f9-317840678313) (2026-02-21T09:49:22.929+00:00)
  prefix_json:
    {
      "slot": {
        "phone_masked": "-",
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
        "recorded_at": "2026-02-21T09:49:22.771Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "restock.awaiting_confirm",
        "expected_input_source": "contract_stage"
      }
    }
이벤트 로그:
- 9f4f3c7f-298f-454c-8286-12d8a818b9d0 QUICK_REPLY_RULE_DECISION (2026-02-21T09:49:27.119+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_non_target_alternative_choice",
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
- 3cbad17c-fe92-4602-b93f-5ca57f53c762 FINAL_ANSWER_READY (2026-02-21T09:49:26.964+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 네\n확인할 것: 다음 중 어떤 상품의 재입고 알림을 원하시나요?\n- 1번 | 코듀로이 볼캡 | 03/23\n- 2번 | 골덴 원피스 | 04/01\n그 다음으로 확인할 것: 알림 시작일 선택",
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
        "recorded_at": "2026-02-21T09:49:26.964Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_non_target_alternative_choice",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleRestockPendingStage"
      }
    }
- e8f14830-fcb9-45e3-8cbc-5f1bbfea26a2 POLICY_DECISION (2026-02-21T09:49:26.803+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "stage": "tool",
      "action": "ASK_RESTOCK_PRODUCT_CHOICE",
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
        "recorded_at": "2026-02-21T09:49:26.803Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "candidate_count": 2
    }
- 963c636f-2f49-4136-ad85-24d1b527f723 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:49:26.645+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d14398b5-623f-44fb-a7f9-317840678313",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 6bf1695a-9ec1-40e1-b840-1d137cf459cb RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:49:26.299+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d14398b5-623f-44fb-a7f9-317840678313",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- 0346ee9c-131d-4402-abed-2e97407b1b6d END_USER_WRITE_LATENCY (2026-02-21T09:49:25.656+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "duration_ms": 2563
    }
- ee9b83cc-4fb5-4f0d-b596-3fafcd2f47b9 END_USER_CONTEXT_RESOLVED (2026-02-21T09:49:23.726+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
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
- f5aba733-24c3-476c-82f1-3db80229c5c7 END_USER_MATCH_HIT (2026-02-21T09:49:23.57+00:00) (turn_id=d14398b5-623f-44fb-a7f9-317840678313)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }


TURN_ID: 7f771e21-9f13-4ff4-bcb9-838ee658f987

[TOKEN_USED]

USER:
2

BOT:
확인한 것: 상품 골덴 원피스
확인할 것: 요약: 골덴 원피스 입고 예정일 04/01입니다.
상세: 예정일 2026-04-01 (D-39)
다음 선택: 재입고 알림 신청 / 대화 종료
그 다음으로 확인할 것: 입고 일정 안내 및 알림 신청 여부 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 상품 골덴 원피스\n확인할 것: 요약: 골덴 원피스 입고 예정일 04/01입니다.\n상세: 예정일 2026-04-01 (D-39)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 입고 일정 안내 및 알림 신청 여부 확인",
    "ui_hints": {
      "view": "text",
      "choice_mode": "single"
    },
    "quick_replies": [],
    "cards": []
  }

[TOKEN_UNUSED]
DEBUG 로그:
- d421823f-c9a9-488c-b2c5-360fcaf7e0d3 (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987) (2026-02-21T09:49:33.657+00:00)
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
        "recorded_at": "2026-02-21T09:49:33.430Z",
        "function_name": "insertTurnWithDebug"
      },
      "slot_flow": {
        "expected_inputs": [
          "product_query"
        ],
        "expected_input_stage": "restock.awaiting_product",
        "expected_input_source": "contract_stage"
      }
    }
이벤트 로그:
- c1c29afd-03ed-491e-a653-34268d2ef909 QUICK_REPLY_RULE_DECISION (2026-02-21T09:49:38.776+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
- 2d75d9ec-6c81-4664-9245-9b404bcf9e57 FINAL_ANSWER_READY (2026-02-21T09:49:38.615+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "model": "deterministic_restock_kb",
      "answer": "확인한 것: 상품 골덴 원피스\n확인할 것: 요약: 골덴 원피스 입고 예정일 04/01입니다.\n상세: 예정일 2026-04-01 (D-39)\n다음 선택: 재입고 알림 신청 / 대화 종료\n그 다음으로 확인할 것: 입고 일정 안내 및 알림 신청 여부 확인",
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
        "recorded_at": "2026-02-21T09:49:38.615Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      }
    }
- 7308a07e-a371-41d0-8937-b1b478a143c8 POLICY_DECISION (2026-02-21T09:49:38.457+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "stage": "tool",
      "action": "RESTOCK_SCHEDULE_ANSWERED_BY_KB_CHOICE",
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
        "recorded_at": "2026-02-21T09:49:38.457Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "product_name": "골덴 원피스"
    }
- cc31955a-f2ad-4130-b97e-5b27e71dcf78 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-21T09:49:38.3+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "keys": [
        "product_name",
        "channel",
        "day",
        "month"
      ],
      "delta": {
        "day": "1",
        "month": "4",
        "channel": "sms",
        "product_name": "골덴 원피스"
      },
      "flow_id": "793d72d2-a87d-4b23-ab11-5a4d58203bff",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:49:38.300Z",
        "function_name": "unknown"
      },
      "key_count": 4
    }
- b78cfb4d-2985-4597-a274-12859b47e358 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-21T09:49:38.145+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7f771e21-9f13-4ff4-bcb9-838ee658f987",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- c0c71e7b-94f9-4707-a617-68de0d7b85bb RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-21T09:49:37.783+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "7f771e21-9f13-4ff4-bcb9-838ee658f987",
      "session_id": "fbca1798-df27-49bb-b1b5-e86e5fc55069",
      "config_source": "principles_default"
    }
- a1f2ddea-a96b-4d47-b3c0-fcc6966d5f82 END_USER_WRITE_LATENCY (2026-02-21T09:49:37.157+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "duration_ms": 3333
    }
- 9c6d2bb0-072d-4268-8b8a-d7b4a4b06806 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-21T09:49:37.004+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "keys": [
        "day",
        "month",
        "channel",
        "product_name"
      ],
      "flow_id": "793d72d2-a87d-4b23-ab11-5a4d58203bff",
      "key_count": 4,
      "keys_truncated": false
    }
- 6e5d00ee-2350-423f-bd14-03d8d7e69237 END_USER_CONTEXT_RESOLVED (2026-02-21T09:49:34.468+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
- a9811827-a3fb-4ebe-b569-f694d68ba091 END_USER_MATCH_HIT (2026-02-21T09:49:34.302+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }
- 33a50cc6-eb08-43f1-91a0-97761c9f8317 PRE_MCP_DECISION (2026-02-21T09:49:33.265+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
        "recorded_at": "2026-02-21T09:49:33.265Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "2",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {
        "product_query": "골덴 원피스"
      },
      "policy_conflicts": [],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 3
    }
- a31395d1-c31b-4af2-a81c-c5d7ee6a679b INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-21T09:49:32.935+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "intent": "restock_inquiry",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:49:32.935Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "골덴 원피스"
      }
    }
- 94ceb9d7-53f9-4d3d-aa33-08339a988154 POLICY_DECISION (2026-02-21T09:49:32.773+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
        "recorded_at": "2026-02-21T09:49:32.773Z",
        "function_name": "emit:POLICY_DECISION"
      },
      "required_slots": [
        "product_query"
      ],
      "resolved_slots": {
        "product_query": "골덴 원피스"
      }
    }
- ef14beef-f5a5-4184-ade8-c74756f19ccd INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-21T09:49:32.617+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
  payload:
    {
      "intent": "restock_inquiry",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-21T09:49:32.617Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "product_query"
    }
- e0f9a5dd-e17d-4abb-b5b8-089edd00df38 SLOT_EXTRACTED (2026-02-21T09:49:32.458+00:00) (turn_id=7f771e21-9f13-4ff4-bcb9-838ee658f987)
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
        "recorded_at": "2026-02-21T09:49:32.458Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "product_query",
      "resolved_slots": {
        "product_query": "골덴 원피스"
      }
    }
