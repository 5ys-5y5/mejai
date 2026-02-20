디버그 대원칙:
- 본 원칙은 F_audit_mcp_tools, F_audit_events, F_audit_turn_specs 테이블에 내용을 기록할 때에 최소한의 디버깅으로 최대한의 개선을 위해 반드시 준수하여 해당 테이블에 기록하게 할 것(기록하는 기능 설계시 아래의 원칙 미준수가 감지되면 개선하여 기록하도록 할 것)
- 원인 미확인은 로그 누락/정밀도 부족에서 발생한다.
- 단계별 로그를 촘촘히 남겨 범위를 줄인다 (5->2->1 단계).
- 실패 지점의 직전/직후 로그를 반드시 기록한다.

기대 목록(MCP): solapi:send_otp, cafe24:lookup_order, cafe24:list_orders, solapi:verify_otp, search_address, cafe24:update_order_shipping_address
기대 목록(Event): QUICK_REPLY_RULE_DECISION, FINAL_ANSWER_READY, POLICY_DECISION, RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, RUNTIME_SELF_UPDATE_REVIEW_STARTED, END_USER_WRITE_LATENCY, END_USER_CONTEXT_RESOLVED, END_USER_MATCH_HIT, CONFIRMED_ENTITY_DELTA_APPLIED, END_USER_CONFIRMED_ENTITY_SAVED, AUTH_GATE_TRIGGERED, AUTH_GATE_PRECHECK, EXECUTION_GUARD_TRIGGERED, INTENT_SCOPE_GATE_REVIEW_COMPLETED, INTENT_SCOPE_GATE_REVIEW_STARTED, SLOT_EXTRACTED, POLICY_STATIC_CONFLICT, INPUT_CONTRACT_REVIEW_COMPLETED, INPUT_CONTRACT_REVIEW_STARTED, ORDER_CHOICES_PRESENTED, PRE_MCP_DECISION, RUNTIME_PATCH_PROPOSAL_CREATED, PRINCIPLE_VIOLATION_DETECTED, ADDRESS_CANDIDATES_PRESENTED, ADDRESS_SEARCH_COMPLETED, ADDRESS_SEARCH_STARTED, ENTITY_FIELD_UPDATED, ADDRESS_CANDIDATE_SELECTED
기대 목록(Debug): NO_TOOL_CALLED, send_otp, lookup_order, update_order_shipping_address

사용 모듈(Runtime): src/app/api/runtime/chat/runtime/runtimeTurnIo.ts
사용 모듈(Handlers): -
사용 모듈(Services): -
사용 모듈(Policies): -
사용 모듈(Shared): -

점검 완료 항목: mcp.solapi:send_otp, mcp.cafe24:lookup_order, mcp.cafe24:list_orders, mcp.solapi:verify_otp, mcp.search_address, mcp.cafe24:update_order_shipping_address, event.QUICK_REPLY_RULE_DECISION, event.FINAL_ANSWER_READY, event.POLICY_DECISION, event.RUNTIME_SELF_UPDATE_REVIEW_COMPLETED, event.RUNTIME_SELF_UPDATE_REVIEW_STARTED, event.END_USER_WRITE_LATENCY, event.END_USER_CONTEXT_RESOLVED, event.END_USER_MATCH_HIT, event.CONFIRMED_ENTITY_DELTA_APPLIED, event.END_USER_CONFIRMED_ENTITY_SAVED, event.AUTH_GATE_TRIGGERED, event.AUTH_GATE_PRECHECK, event.EXECUTION_GUARD_TRIGGERED, event.INTENT_SCOPE_GATE_REVIEW_COMPLETED, event.INTENT_SCOPE_GATE_REVIEW_STARTED, event.SLOT_EXTRACTED, event.POLICY_STATIC_CONFLICT, event.INPUT_CONTRACT_REVIEW_COMPLETED, event.INPUT_CONTRACT_REVIEW_STARTED, event.ORDER_CHOICES_PRESENTED, event.PRE_MCP_DECISION, event.RUNTIME_PATCH_PROPOSAL_CREATED, event.PRINCIPLE_VIOLATION_DETECTED, event.ADDRESS_CANDIDATES_PRESENTED, event.ADDRESS_SEARCH_COMPLETED, event.ADDRESS_SEARCH_STARTED, event.ENTITY_FIELD_UPDATED, event.ADDRESS_CANDIDATE_SELECTED, debug.NO_TOOL_CALLED, debug.send_otp, debug.lookup_order, debug.update_order_shipping_address, response_schema.present, response_schema.valid
점검 미완료: -
점검 불가: -


TURN_ID: d227e07c-ff09-4680-854c-ae63ff78718a

[TOKEN_USED]

USER:
배송지 변경

BOT:
확인한 것: 배송지 변경
확인할 것: 원하시는 문의 유형을 선택해주세요. (번호로 답변)
- 1번 | 배송지 변경 | 배송지/수령인 정보 변경
- 2번 | 배송 문의 | 배송 상태/송장 조회
예) 1,2
그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.
RESPONSE_SCHEMA: view=choice, choice_mode=multi, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 배송지 변경\n확인할 것: 원하시는 문의 유형을 선택해주세요. (번호로 답변)\n- 1번 | 배송지 변경 | 배송지/수령인 정보 변경\n- 2번 | 배송 문의 | 배송 상태/송장 조회\n예) 1,2\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
- a15c4539-4c54-4998-8192-a83e975dc7d4 (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a) (2026-02-20T06:39:05.536+00:00)
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
        "node": "v22.22.0",
        "commit": null,
        "build_at": null,
        "build_id": null,
        "deploy_env": "production",
        "runtime_started_at": "2026-02-20T06:32:02.831Z"
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
        "recorded_at": "2026-02-20T06:39:05.273Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": []
      },
      "templates": {
        "override_count": 1,
        "overrides_applied": {
          "order_choice_title": "주문번호를 모르셔도 됩니다. 아래 주문(주문일시/상품명/옵션/금액) 중 해당 주문의 번호를 선택해 주세요."
        }
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
- 003d5b35-3b4f-46d8-8484-f6bd60aea5b8 QUICK_REPLY_RULE_DECISION (2026-02-20T06:39:13.016+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
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
- e3803aad-2514-451c-b9bb-f93708c78dca FINAL_ANSWER_READY (2026-02-20T06:39:12.756+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
  payload:
    {
      "model": "deterministic_intent_disambiguation",
      "answer": "확인한 것: 배송지 변경\n확인할 것: 원하시는 문의 유형을 선택해주세요. (번호로 답변)\n- 1번 | 배송지 변경 | 배송지/수령인 정보 변경\n- 2번 | 배송 문의 | 배송 상태/송장 조회\n예) 1,2\n그 다음으로 확인할 것: 다음 단계로 이어서 안내해 드리겠습니다.",
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
        "recorded_at": "2026-02-20T06:39:12.755Z",
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
- f97f9ca8-92c8-4c0b-b82b-b38b85646202 POLICY_DECISION (2026-02-20T06:39:12.493+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
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
        "recorded_at": "2026-02-20T06:39:12.493Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- 99976e5e-fa54-45b8-a705-22e5ae14b007 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-20T06:39:12.224+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d227e07c-ff09-4680-854c-ae63ff78718a",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- eecb0a6e-8d9c-40e6-b0f7-f446beafb341 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-20T06:39:11.216+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d227e07c-ff09-4680-854c-ae63ff78718a",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "config_source": "principles_default"
    }
- 67192efc-0363-44bd-b548-b90ef117e88c END_USER_WRITE_LATENCY (2026-02-20T06:39:10.02+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
  payload:
    {
      "duration_ms": 4205
    }
- ff18ddfd-c40f-40d6-a5f1-a5ae4ee9bae1 END_USER_CONTEXT_RESOLVED (2026-02-20T06:39:06.867+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
  payload:
    {
      "match_hit": true,
      "end_user_id": "1932cd1e-eeea-4855-ad96-38b22def6179",
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
- 2f6dc70d-5cb2-4e27-b9e3-8791c348f6d7 END_USER_MATCH_HIT (2026-02-20T06:39:06.603+00:00) (turn_id=d227e07c-ff09-4680-854c-ae63ff78718a)
  payload:
    {
      "matched": true,
      "identity_count": 2,
      "identity_types": [
        "email",
        "external"
      ]
    }


TURN_ID: 8e28b545-a43e-4871-a8df-4870f548d2a6

[TOKEN_USED]

USER:
1

BOT:
확인한 것: 연락처 *******7159, 배송지 1
확인할 것: 문자로 전송된 인증번호를 입력해주세요.
그 다음으로 확인할 것: 주문번호 확인
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 연락처 *******7159, 배송지 1\n확인할 것: 문자로 전송된 인증번호를 입력해주세요.\n그 다음으로 확인할 것: 주문번호 확인",
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
- 803e06b9-5b20-49a0-baf1-f3dc730c009d (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6) (2026-02-20T06:39:27.023+00:00)
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
        "recorded_at": "2026-02-20T06:39:26.755Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write",
          "R275_order_change_list_orders_by_phone"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ],
        "tool_policies": [
          "list_orders"
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
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- dd8c5583-723a-444f-8cac-071233d9d43e solapi:send_otp@1.0: success (2026-02-20T06:39:26.228+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  request:
    {
      "path": "/messages/v4/send-many/detail",
      "method": "POST",
      "destination": "01093107159",
      "required_scope": "messaging.write"
    }
  response:
    {
      "otp_ref": "2f464ac1-09ad-4746-ac98-3444c60975a9",
      "delivery": "sms",
      "test_code": "101010",
      "test_mode": true,
      "expires_at": "2026-02-20T06:44:25.685Z",
      "destination": "01***59"
    }
이벤트 로그:
- 266e09ce-0e95-42d7-bf4a-5478af840715 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-20T06:39:35.331+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "keys": [
        "phone",
        "address"
      ],
      "delta": {
        "phone": "01093107159",
        "address": "1"
      },
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:35.331Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- 3ce243eb-83f6-42f9-b37b-4888a9a1d257 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-20T06:39:35.067+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "8e28b545-a43e-4871-a8df-4870f548d2a6",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 9d4f1483-a7b6-4292-a580-1da724ae900f RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-20T06:39:33.992+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "8e28b545-a43e-4871-a8df-4870f548d2a6",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "config_source": "principles_default"
    }
- 3a128180-616f-4944-822b-e3aa3794cfd5 END_USER_WRITE_LATENCY (2026-02-20T06:39:32.924+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "duration_ms": 5619
    }
- fa8deecd-a9c3-4a28-a656-0f1adc9b1f41 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-20T06:39:32.662+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "keys": [
        "phone",
        "address"
      ],
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "key_count": 2,
      "keys_truncated": false
    }
- f65366c1-1de1-4334-8131-1367758df300 END_USER_CONTEXT_RESOLVED (2026-02-20T06:39:27.83+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "match_hit": false,
      "end_user_id": "1932cd1e-eeea-4855-ad96-38b22def6179",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": false,
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
- e23ee217-580d-4270-9e00-5500a8338f8d AUTH_GATE_TRIGGERED (2026-02-20T06:39:26.486+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "action": "ASK_OTP_CODE",
      "intent": "order_change",
      "reason": "OTP_SENT",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:26.486Z",
        "function_name": "unknown"
      },
      "force_otp_gate": true,
      "has_sensitive_planned_call": true
    }
- fe4299c5-a8eb-459a-a060-2a845a4980e4 AUTH_GATE_PRECHECK (2026-02-20T06:39:24.278+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:24.278Z",
        "function_name": "unknown"
      },
      "otp_pending": false,
      "otp_verified": false,
      "planned_calls": [
        "list_orders"
      ],
      "force_otp_gate": true,
      "allowed_tool_names_count": 15,
      "has_sensitive_planned_call": true,
      "customer_verification_token_present": false
    }
- 87ff86d8-ddcc-42ea-b66b-2385ba28715d EXECUTION_GUARD_TRIGGERED (2026-02-20T06:39:24.022+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
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
        "recorded_at": "2026-02-20T06:39:24.022Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 0cfffe0f-2131-4eb7-9045-39d269ddd785 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-20T06:39:23.462+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:23.462Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- c68bb236-2bfc-4fa6-9275-c66892de2fd3 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-20T06:39:23.204+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:23.204Z",
        "function_name": "unknown"
      },
      "query_source": "intent_disambiguation_source_text",
      "expected_input": "address"
    }
- 16098818-fafb-4841-bf13-df24312888d4 SLOT_EXTRACTED (2026-02-20T06:39:22.94+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
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
        "recorded_at": "2026-02-20T06:39:22.940Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "intent_disambiguation_source_text",
      "missing_slots": [],
      "expected_input": "address",
      "resolved_slots": {}
    }
- 325e80e7-4f7c-439e-835d-8f5eabe7e6c0 POLICY_STATIC_CONFLICT (2026-02-20T06:39:22.675+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-20T06:39:22.675Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }
- 79e55e77-4173-4fb6-9592-053bcbcfa664 INPUT_CONTRACT_REVIEW_COMPLETED (2026-02-20T06:39:22.408+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "source": "derived_from_last_answer",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:22.408Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": "address",
      "expected_inputs": [
        "address"
      ],
      "expected_input_stage": "legacy.expected_input"
    }
- 3d30c6f2-5e46-417e-8af4-01d568fc3691 INPUT_CONTRACT_REVIEW_STARTED (2026-02-20T06:39:22.151+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
  payload:
    {
      "source": null,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:22.151Z",
        "function_name": "unknown"
      },
      "intent_name": "general",
      "expected_input": null,
      "expected_inputs": [],
      "expected_input_stage": null
    }
- 49f4354a-de1c-46b6-bb81-d284e0352a3c POLICY_DECISION (2026-02-20T06:39:21.885+00:00) (turn_id=8e28b545-a43e-4871-a8df-4870f548d2a6)
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
        "recorded_at": "2026-02-20T06:39:21.885Z",
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


TURN_ID: a39bad5a-9c27-4a62-847f-1aacc9e911f1

[TOKEN_USED]

USER:
101010

BOT:
확인한 것: 연락처 *******7159, 배송지 1
확인할 것: 아래 주문이 맞는지 확인해 주세요.
- 주문번호: 20260127-0000014
- 상품: 아드헬린 린넨 플레어 원피스 그레이
- 옵션: 옵션 없음
- 가격: 1000.00
- 수량: 1
네/아니오로 답해주세요.
그 다음으로 확인할 것: 추가 도움 요청 확인
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 연락처 *******7159, 배송지 1\n확인할 것: 아래 주문이 맞는지 확인해 주세요.\n- 주문번호: 20260127-0000014\n- 상품: 아드헬린 린넨 플레어 원피스 그레이\n- 옵션: 옵션 없음\n- 가격: 1000.00\n- 수량: 1\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
- 25314e5c-2c8e-47a4-bf28-f5163e8624fd (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1) (2026-02-20T06:39:50.353+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "success",
          "function": "lookup_order",
          "result_count": 1
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
        "recorded_at": "2026-02-20T06:39:50.088Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write",
          "R275_order_change_list_orders_by_phone"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ],
        "tool_policies": [
          "list_orders"
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
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 6,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- 6a254669-593b-47a9-b0df-22ed7585dbb0 cafe24:lookup_order@1.0: success (2026-02-20T06:39:49.786+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  request:
    {
      "path": "/orders/{order_id}",
      "method": "GET",
      "order_id": "20260127-0000014",
      "required_scope": "mall.read_order",
      "customer_verification_token": "cbfec468-5a27-4b4e-a49a-c9e2b591ddd7"
    }
  response:
    {
      "order": {
        "paid": "T",
        "buyer": {
          "name": "mejai",
          "email": "ydsjy05@naver.com",
          "phone": "",
          "shop_no": 1,
          "user_id": null,
          "cellphone": "010-9310-7159",
          "member_id": "mejai",
          "user_name": null,
          "company_name": null,
          "updated_date": null,
          "buyer_zipcode": "08813",
          "buyer_address1": "서울 관악구 신림동 1515-7 ",
          "buyer_address2": "203",
          "names_furigana": "",
          "member_group_no": 1,
          "customer_notification": null,
          "company_registration_no": null
        },
        "items": [
          {
            "gift": "F",
            "labels": null,
            "hs_code": "",
            "item_no": 2,
            "options": [],
            "shop_no": 1,
            "quantity": 1,
            "tax_rate": 10,
            "option_id": "000A",
            "claim_code": null,
            "product_no": 20,
            "cancel_date": null,
            "option_type": null,
            "refund_date": null,
            "status_code": "N1",
            "status_text": "배송준비중",
            "supplier_id": "S0000000",
            "tracking_no": null,
            "volume_size": null,
            "claim_reason": null,
            "cloth_fabric": null,
            "made_in_code": "KR",
            "option_price": "0.00",
            "option_value": "",
            "order_status": "N20",
            "ordered_date": "2026-02-02T16:03:12+09:00",
            "origin_place": "국내 ",
            "product_code": "P000000U",
            "product_name": "아드헬린 린넨 플레어 원피스 그레이",
            "shipped_date": null,
            "store_pickup": "F",
            "subscription": "F",
            "supply_price": "1000.00",
            "variant_code": "P000000U000A",
            "exchange_date": null,
            "multi_invoice": null,
            "product_price": "1000.00",
            "shipping_code": "D-20260127-0000014-00",
            "supplier_name": "자체공급",
            "claim_quantity": 0,
            "delivered_date": null,
            "market_item_no": null,
            "payment_amount": null,
            "product_bundle": "F",
            "product_weight": "1.00",
            "request_undone": null,
            "order_item_code": "20260127-0000014-01",
            "origin_place_no": 1798,
            "payment_info_id": "0",
            "eng_product_name": "",
            "one_plus_n_event": null,
            "original_item_no": [],
            "product_material": "",
            "product_tax_type": "A",
            "refund_bank_name": "",
            "claim_reason_type": null,
            "post_express_flag": null,
            "product_bundle_no": "0",
            "shipping_fee_type": "X",
            "clearance_category": null,
            "item_granting_gift": null,
            "market_fail_reason": null,
            "naver_pay_order_id": null,
            "open_market_status": "",
            "origin_place_value": "",
            "volume_size_weight": null,
            "was_product_bundle": null,
            "cancel_request_date": null,
            "custom_product_code": "",
            "custom_variant_code": null,
            "product_bundle_list": null,
            "product_bundle_name": null,
            "product_bundle_type": null,
            "return_request_date": null,
            "shipping_company_id": "2",
            "option_value_default": "",
            "product_material_eng": null,
            "product_name_default": "아드헬린 린넨 플레어 원피스 그레이",
            "bundled_shipping_type": "N",
            "coupon_discount_price": "0.00",
            "exchange_request_date": null,
            "internal_product_name": "",
            "market_cancel_request": null,
            "return_collected_date": null,
            "return_confirmed_date": null,
            "shipping_company_code": "0001",
            "shipping_company_name": "자체배송",
            "supplier_product_name": "",
            "market_discount_amount": "0.00",
            "naver_pay_claim_status": null,
            "order_status_before_cs": null,
            "refund_bank_account_no": "",
            "shipping_expected_date": null,
            "shipping_fee_type_text": "기본배송",
            "additional_option_value": "",
            "clearance_category_code": null,
            "clearance_category_info": null,
            "individual_shipping_fee": "0.00",
            "market_fail_reason_type": null,
            "original_bundle_item_no": null,
            "shipping_payment_option": "P",
            "additional_option_values": [
              {
                "key": null,
                "name": null,
                "type": null,
                "value": null
              }
            ],
            "app_item_discount_amount": null,
            "market_fail_reason_guide": null,
            "additional_discount_price": "0.00",
            "purchaseconfirmation_date": null,
            "supplier_transaction_type": " ",
            "market_custom_variant_code": null,
            "refund_bank_account_holder": "",
            "product_bundle_name_default": null,
            "order_status_additional_info": "",
            "market_cancel_request_quantity": null
          }
        ],
        "return": [],
        "postpay": "F",
        "shop_no": 1,
        "canceled": "F",
        "currency": "KRW",
        "order_id": "20260127-0000014",
        "bank_code": "bank_13",
        "market_id": "self",
        "member_id": "mejai",
        "receivers": [
          {
            "name": "mejai",
            "phone": "",
            "city_en": null,
            "name_en": "",
            "shop_no": 1,
            "zipcode": "08793",
            "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
            "address2": "11호",
            "state_en": null,
            "cellphone": "01093107159",
            "street_en": null,
            "address_city": "",
            "address_full": "서울특별시 관악구 인헌2길 8-3 (봉천동) 11호",
            "country_code": null,
            "country_name": null,
            "address_state": "",
            "name_furigana": "",
            "shipping_code": "D-20260127-0000014-00",
            "address_street": "",
            "country_name_en": null,
            "shipping_message": "",
            "virtual_phone_no": null,
            "wished_delivery_date": "",
            "wished_delivery_time": null,
            "clearance_information": null,
            "clearance_information_type": null
          }
        ],
        "commission": "0.00",
        "order_date": "2026-01-27T01:49:00+09:00",
        "tax_detail": null,
        "use_escrow": "F",
        "cancel_date": null,
        "first_order": "T",
        "include_tax": "T",
        "loan_status": null,
        "naver_point": null,
        "social_name": null,
        "billing_name": "성지용",
        "easypay_name": "",
        "payment_date": "2026-02-02T16:03:12+09:00",
        "service_data": null,
        "service_type": null,
        "store_pickup": "F",
        "subscription": "F",
        "exchange_rate": "1.0000",
        "shipping_type": "A",
        "bank_code_name": "농협",
        "order_place_id": "self",
        "payment_amount": "3500.00",
        "payment_method": [
          "cash"
        ],
        "bank_account_no": "3020654717291",
        "market_order_no": null,
        "shipping_status": "F",
        "transaction_ids": null,
        "market_seller_id": null,
        "order_place_name": "PC쇼핑몰",
        "order_from_mobile": "F",
        "wished_carrier_id": null,
        "multiple_addresses": "F",
        "shipping_type_text": "국내배송",
        "social_member_code": null,
        "total_supply_price": "1000",
        "actual_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_method_name": [
          "무통장입금"
        ],
        "shipping_fee_detail": [
          {
            "items": [
              "20260127-0000014-01"
            ],
            "shipping_fee": "2500.00",
            "supplier_code": "S0000000",
            "cancel_shipping_fee": "0.00",
            "return_shipping_fee": "0.00",
            "shipping_group_code": 5,
            "refunded_shipping_fee": "0.00",
            "additional_shipping_fee": "0.00"
          }
        ],
        "wished_carrier_name": null,
        "initial_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_confirmation": null,
        "wished_delivery_date": "",
        "wished_delivery_time": null,
        "first_payment_methods": [
          "cash"
        ],
        "member_authentication": "T",
        "payment_gateway_names": null,
        "return_confirmed_date": null,
        "show_shipping_address": "T",
        "additional_handling_fee": "0.00",
        "additional_shipping_fee": "0.00",
        "admin_additional_amount": null,
        "bank_account_owner_name": "성지용",
        "sub_payment_method_code": null,
        "sub_payment_method_name": null,
        "regional_surcharge_detail": [],
        "additional_order_info_list": [],
        "naverpay_payment_information": null,
        "customer_group_no_when_ordering": "1",
        "international_shipping_insurance": "0.00"
      }
    }
- d028caa7-97cc-4e57-a567-c7ebb6227521 cafe24:list_orders@1.0: success (2026-02-20T06:39:48.477+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  request:
    {
      "path": "/orders",
      "phone": "01093107159",
      "method": "GET",
      "end_date": "2026-02-20",
      "cellphone": "01093107159",
      "start_date": "2026-01-21",
      "required_scope": "mall.read_order"
    }
  response:
    {
      "links": [],
      "orders": [
        {
          "paid": "T",
          "postpay": "F",
          "shop_no": 1,
          "canceled": "F",
          "currency": "KRW",
          "order_id": "20260127-0000014",
          "bank_code": "bank_13",
          "market_id": "self",
          "member_id": "mejai",
          "commission": "0.00",
          "order_date": "2026-01-27T01:49:00+09:00",
          "tax_detail": null,
          "use_escrow": "F",
          "cancel_date": null,
          "first_order": "T",
          "include_tax": "T",
          "loan_status": null,
          "naver_point": null,
          "social_name": null,
          "billing_name": "성지용",
          "easypay_name": "",
          "member_email": "ydsjy05@naver.com",
          "payment_date": "2026-02-02T16:03:12+09:00",
          "service_data": null,
          "service_type": null,
          "store_pickup": "F",
          "subscription": "F",
          "exchange_rate": "1.0000",
          "shipping_type": "A",
          "bank_code_name": "농협",
          "order_place_id": "self",
          "payment_amount": "3500.00",
          "payment_method": [
            "cash"
          ],
          "bank_account_no": "3020654717291",
          "market_order_no": null,
          "shipping_status": "F",
          "transaction_ids": null,
          "market_seller_id": null,
          "order_place_name": "PC쇼핑몰",
          "order_from_mobile": "F",
          "wished_carrier_id": null,
          "multiple_addresses": "F",
          "shipping_type_text": "국내배송",
          "social_member_code": null,
          "total_supply_price": "1000",
          "actual_order_amount": {
            "tax": null,
            "shipping_fee": "2500.00",
            "payment_amount": "3500.00",
            "total_amount_due": "0.00",
            "order_price_amount": "1000.00",
            "app_discount_amount": "0.00",
            "points_spent_amount": "0.00",
            "credits_spent_amount": "0.00",
            "coupon_discount_price": "0.00",
            "point_incentive_amount": "0.00",
            "coupon_shipping_fee_amount": "0.00",
            "membership_discount_amount": "0.00",
            "set_product_discount_amount": "0.00",
            "market_other_discount_amount": "0.00",
            "shipping_fee_discount_amount": "0.00"
          },
          "payment_method_name": [
            "무통장입금"
          ],
          "shipping_fee_detail": [
            {
              "items": [
                "20260127-0000014-01"
              ],
              "shipping_fee": "2500.00",
              "supplier_code": "S0000000",
              "cancel_shipping_fee": "0.00",
              "return_shipping_fee": "0.00",
              "shipping_group_code": 5,
              "refunded_shipping_fee": "0.00",
              "additional_shipping_fee": "0.00"
            }
          ],
          "wished_carrier_name": null,
          "initial_order_amount": {
            "tax": null,
            "shipping_fee": "2500.00",
            "payment_amount": "3500.00",
            "total_amount_due": "0.00",
            "order_price_amount": "1000.00",
            "app_discount_amount": "0.00",
            "points_spent_amount": "0.00",
            "credits_spent_amount": "0.00",
            "coupon_discount_price": "0.00",
            "point_incentive_amount": "0.00",
            "coupon_shipping_fee_amount": "0.00",
            "membership_discount_amount": "0.00",
            "set_product_discount_amount": "0.00",
            "market_other_discount_amount": "0.00",
            "shipping_fee_discount_amount": "0.00"
          },
          "payment_confirmation": null,
          "wished_delivery_date": "",
          "wished_delivery_time": null,
          "first_payment_methods": [
            "cash"
          ],
          "member_authentication": "T",
          "payment_gateway_names": null,
          "return_confirmed_date": null,
          "show_shipping_address": "T",
          "group_no_when_ordering": "1",
          "additional_handling_fee": "0.00",
          "additional_shipping_fee": "0.00",
          "admin_additional_amount": null,
          "bank_account_owner_name": "성지용",
          "sub_payment_method_code": null,
          "sub_payment_method_name": null,
          "regional_surcharge_detail": [],
          "additional_order_info_list": [],
          "naverpay_payment_information": null,
          "international_shipping_insurance": "0.00"
        }
      ]
    }
- bb3481f8-7085-4b24-bfb6-e0aa15d009f4 solapi:verify_otp@1.0: success (2026-02-20T06:39:45.156+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  request:
    {
      "code": "101010",
      "path": "/otp/verify",
      "method": "POST",
      "otp_ref": "2f464ac1-09ad-4746-ac98-3444c60975a9",
      "required_scope": "messaging.write"
    }
  response:
    {
      "verified": true,
      "customer_verification_token": "cbfec468-5a27-4b4e-a49a-c9e2b591ddd7"
    }
이벤트 로그:
- baf359e2-ec43-4dce-b55d-bff6d11c19e3 QUICK_REPLY_RULE_DECISION (2026-02-20T06:39:59.043+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": "yes_no",
        "criteria": "policy:ORDER_CONFIRMATION_REQUIRED",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/toolRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "runToolRuntime"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- 89fad058-b5fc-40e8-afcb-fcb1c0b114c7 ORDER_CHOICES_PRESENTED (2026-02-20T06:39:58.786+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "choices": [
        {
          "index": 1,
          "label": "1번 주문\n  주문일: 01/26 16:49\n  주문번호: 20260127-0000014\n  상품: 아드헬린 린넨 플레어 원피스 그레이\n  옵션: 옵션 없음\n  수량: 1\n  결제금액: 1,000원",
          "price": "1000.00",
          "order_id": "20260127-0000014",
          "quantity": "1",
          "image_url": null,
          "order_date": "2026-01-27T01:49:00+09:00",
          "option_name": "옵션 없음",
          "product_name": "아드헬린 린넨 플레어 원피스 그레이",
          "order_date_short": "01/26 16:49"
        }
      ],
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:58.786Z",
        "function_name": "unknown"
      },
      "auto_selected": false,
      "confirm_required": true,
      "pending_order_id": "20260127-0000014"
    }
- 875b4251-65f6-4a3d-994b-2a479c9c60e6 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-20T06:39:58.515+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "keys": [
        "order_id",
        "target_summary"
      ],
      "delta": {
        "order_id": "20260127-0000014",
        "target_summary": [
          "주문번호: 20260127-0000014",
          "상품: 아드헬린 린넨 플레어 원피스 그레이",
          "옵션: 옵션 없음",
          "가격: 1000.00",
          "수량: 1"
        ]
      },
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:58.515Z",
        "function_name": "unknown"
      },
      "key_count": 2
    }
- a26e4c83-e020-427f-9810-c9e3e404fc36 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-20T06:39:58.242+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "a39bad5a-9c27-4a62-847f-1aacc9e911f1",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 23ec48b4-715d-4ea4-bc31-c28c127524dc RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-20T06:39:57.631+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "a39bad5a-9c27-4a62-847f-1aacc9e911f1",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "config_source": "principles_default"
    }
- af516f88-297b-43b8-a50e-aa65725d4399 END_USER_WRITE_LATENCY (2026-02-20T06:39:56.574+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "duration_ms": 5934
    }
- 2ffc09ec-5bf2-4094-8be7-a2f03d6dc303 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-20T06:39:56.311+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "keys": [
        "order_id",
        "target_summary"
      ],
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "key_count": 2,
      "keys_truncated": false
    }
- 510ff1f4-1bd5-4d04-8f5d-45e1dd6a1446 END_USER_CONTEXT_RESOLVED (2026-02-20T06:39:51.174+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "match_hit": false,
      "end_user_id": "1932cd1e-eeea-4855-ad96-38b22def6179",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": false,
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
- 97811ac2-3082-446c-8934-121f94168d64 PRE_MCP_DECISION (2026-02-20T06:39:46.224+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": null,
        "has_address": true,
        "phone_masked": "*******7159"
      },
      "intent": "order_change",
      "allowed": [
        "update_order_shipping_address",
        "list_orders",
        "lookup_order",
        "search_address",
        "send_otp",
        "verify_otp"
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
        "recorded_at": "2026-02-20T06:39:46.224Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "101010",
      "final_calls": [
        {
          "args": {
            "phone": "01093107159",
            "end_date": "2026-02-20",
            "cellphone": "01093107159",
            "start_date": "2026-01-21"
          },
          "name": "list_orders"
        }
      ],
      "forced_calls": [
        {
          "args": {
            "phone": "01093107159"
          },
          "name": "list_orders"
        }
      ],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "allowed_tool_names": [
        "cafe24:list_orders"
      ],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 15
    }
- 18f3bbc3-24ac-45b8-a040-00a1e97235be EXECUTION_GUARD_TRIGGERED (2026-02-20T06:39:45.951+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
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
        "recorded_at": "2026-02-20T06:39:45.951Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- b299640a-d423-4a2b-8027-0a741f492708 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-20T06:39:43.975+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:43.975Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- fc5ed8c3-caf8-49aa-94d3-4309c7df501c INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-20T06:39:43.713+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:39:43.713Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "otp_code"
    }
- 3ff34e68-c8c3-4b54-8d2b-5dc00ff8b974 SLOT_EXTRACTED (2026-02-20T06:39:43.449+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
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
        "recorded_at": "2026-02-20T06:39:43.449Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "otp_code",
      "resolved_slots": {}
    }
- 95612f39-a592-4481-980e-c4d2f7e94d6e POLICY_STATIC_CONFLICT (2026-02-20T06:39:43.192+00:00) (turn_id=a39bad5a-9c27-4a62-847f-1aacc9e911f1)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-20T06:39:43.192Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }


TURN_ID: 6fe38de9-f2f0-4507-9984-d2d207a713c8

[TOKEN_USED]

USER:
네

BOT:
확인한 것: 주문 확인 완료 (주문번호 20260127-0000014)
확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요.
그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.
RESPONSE_SCHEMA: view=text, choice_mode=single, quick_replies=0, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 주문 확인 완료 (주문번호 20260127-0000014)\n확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요.\n그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.",
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
- 0c2be41f-b001-4d00-a921-1c0f267002c0 (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8) (2026-02-20T06:40:12.477+00:00)
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
        "address": "1",
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
        "recorded_at": "2026-02-20T06:40:12.201Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [
          "confirm"
        ],
        "expected_input_stage": "target.awaiting_confirm",
        "expected_input_source": "contract_stage"
      },
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
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 07d7fd94-50fb-4329-ae27-92d5639d8409 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-20T06:40:26.296+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "keys": [
        "order_id"
      ],
      "delta": {
        "order_id": "20260127-0000014"
      },
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:26.295Z",
        "function_name": "unknown"
      },
      "key_count": 1
    }
- 98adabb1-28b7-4d85-8a17-e822447ec71f RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-20T06:40:26.033+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6fe38de9-f2f0-4507-9984-d2d207a713c8",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "proposal_count": 1,
      "violation_count": 1,
      "deduped_violation_count": 0
    }
- b1d63263-b88d-4ecc-a732-1719077e4aef RUNTIME_PATCH_PROPOSAL_CREATED (2026-02-20T06:40:25.762+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "title": "Principle violation patch proposal",
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "status": "pending",
      "trigger": "runtime_turn_write",
      "turn_id": "6fe38de9-f2f0-4507-9984-d2d207a713c8",
      "rationale": "Prefer runtime decision-path fix over principle text changes (force_template_misapplied=false, expected_input=-, policy_reason=-)",
      "confidence": 0.7,
      "created_at": "2026-02-20T06:40:25.480Z",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "why_failed": "Address slot was already resolved, but final response selection re-asked address.",
      "change_plan": [
        "At final response stage, if expected_input=address and resolved address exists, forbid address prompt template.",
        "If policy decision is DEFER_FORCE_RESPONSE_TEMPLATE with ORDER_AND_ADDRESS_ALREADY_AVAILABLE, preserve decision through finalization.",
        "Emit explicit debug evidence (resolved_address / policy_decision_reason / final_template) around failure boundary."
      ],
      "proposal_id": "rp_1771569621030_s96ap5",
      "target_files": [
        "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
        "src/app/api/runtime/chat/handlers/restockHandler.ts",
        "src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts"
      ],
      "violation_id": "pv_d14027e2-742c-44a0-8d0d-72db1b35273d_6fe38de9-f2f0-4507-9984-d2d207a713c8_memoryno_repeat_address_question",
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
          "slot_resolved_address",
          "policy_decision_reason",
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
      "issue_fingerprint": "memory.enforcenorepeatquestions|chat|확인한 것: 주문 확인 완료 (주문번호 20260127-0000014) 확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요. 그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.|address was already known but the bot asked for address again.||||"
    }
- 7ca7c5b5-15bc-4024-afef-0a727b07cc77 PRINCIPLE_VIOLATION_DETECTED (2026-02-20T06:40:25.48+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "summary": "Address was already known but the bot asked for address again.",
      "trigger": "runtime_turn_write",
      "evidence": {
        "answer": "확인한 것: 주문 확인 완료 (주문번호 20260127-0000014)\n확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요.\n그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.",
        "expected_input": null,
        "known_address_count": 1,
        "expected_reuse_order": [
          "derived",
          "prevEntity",
          "prevTranscript",
          "recentEntity"
        ],
        "slot_resolved_address": null,
        "policy_decision_action": null,
        "policy_decision_reason": null,
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
      "violation_id": "pv_d14027e2-742c-44a0-8d0d-72db1b35273d_6fe38de9-f2f0-4507-9984-d2d207a713c8_memoryno_repeat_address_question",
      "principle_key": "memory.enforceNoRepeatQuestions",
      "runtime_scope": "chat",
      "baseline_source": "src/app/api/runtime/chat/policies/principles.ts",
      "issue_fingerprint": "memory.enforcenorepeatquestions|chat|확인한 것: 주문 확인 완료 (주문번호 20260127-0000014) 확인할 것: 우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요. 그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.|address was already known but the bot asked for address again.||||"
    }
- a5dc0e7a-751f-49fb-9e78-5eafa8e56570 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-20T06:40:19.699+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "6fe38de9-f2f0-4507-9984-d2d207a713c8",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "config_source": "principles_default"
    }
- 56f9e37d-3aea-41c0-ad5f-555f4547dd48 END_USER_WRITE_LATENCY (2026-02-20T06:40:18.641+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "duration_ms": 5891
    }
- 79e35692-035c-4c1a-b190-db855aa41c66 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-20T06:40:18.37+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "keys": [
        "order_id"
      ],
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "key_count": 1,
      "keys_truncated": false
    }
- 076ed0a7-535b-401c-ae5f-7fd3d6f76cab END_USER_CONTEXT_RESOLVED (2026-02-20T06:40:13.285+00:00) (turn_id=6fe38de9-f2f0-4507-9984-d2d207a713c8)
  payload:
    {
      "match_hit": false,
      "end_user_id": "1932cd1e-eeea-4855-ad96-38b22def6179",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": false,
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


TURN_ID: 54cfcf79-cd6e-4b55-8428-8f5463ff5d38

[TOKEN_USED]

USER:
여수시 둔덕동 라온유아파트 112동 201호

BOT:
확인한 것: 정보 업데이트: 배송지 1 -> 여수시 둔덕동 라온유아파트 112동 201호. 이후 안내는 변경된 정보 기준으로 진행합니다. 주문 확인 완료 (주문번호 20260127-0000014)
확인할 것: 입력하신 주소와 매칭된 후보가 여러 개입니다. 정확한 주소를 선택해 주세요.
입력 주소: 여수시 둔덕동 라온유아파트 112동 201호

1번
- 지번주소: 전라남도 여수시 둔덕동 266 라온유아파트
- 도로명주소: 전라남도 여수시 상암로 8 (둔덕동)
- 우편번호: 59625

2번
- 지번주소: 전라남도 여수시 둔덕동 266 라온유아파트
- 도로명주소: 전라남도 여수시 상암로 16 (둔덕동, 라온유아파트)
- 우편번호: 59625

원하는 번호를 입력해 주세요. (예: 1)
그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 정보 업데이트: 배송지 1 -> 여수시 둔덕동 라온유아파트 112동 201호. 이후 안내는 변경된 정보 기준으로 진행합니다. 주문 확인 완료 (주문번호 20260127-0000014)\n확인할 것: 입력하신 주소와 매칭된 후보가 여러 개입니다. 정확한 주소를 선택해 주세요.\n입력 주소: 여수시 둔덕동 라온유아파트 112동 201호\n\n1번\n- 지번주소: 전라남도 여수시 둔덕동 266 라온유아파트\n- 도로명주소: 전라남도 여수시 상암로 8 (둔덕동)\n- 우편번호: 59625\n\n2번\n- 지번주소: 전라남도 여수시 둔덕동 266 라온유아파트\n- 도로명주소: 전라남도 여수시 상암로 16 (둔덕동, 라온유아파트)\n- 우편번호: 59625\n\n원하는 번호를 입력해 주세요. (예: 1)\n그 다음으로 확인할 것: 답변을 주시면 주소 후보가 여러 개인 경우 선택을 안내하겠습니다.",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "single"
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
- 12ceee6f-f4fb-4816-a494-6ccc0bbc7e0d (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38) (2026-02-20T06:40:50.581+00:00)
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
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "order_id": "20260127-0000014",
        "phone_masked": "*******7159",
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
        "recorded_at": "2026-02-20T06:40:50.290Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write",
          "R268_order_change_need_zipcode_tool"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ],
        "template_ids": [
          "order_change_need_zipcode"
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
        "derived_address": "여수시 둔덕동 라온유아파트 112동 201호",
        "expected_inputs": [
          "address"
        ],
        "expected_input_prev": "address",
        "expected_input_stage": "order_change.address.awaiting_address",
        "expected_input_source": "contract_stage"
      },
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
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 24,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- 6f9d5937-dd92-4a00-bc49-8e3a11f72167 search_address@-: success (2026-02-20T06:40:49.505+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  request:
    {
      "keyword": "여수시 둔덕동 라온유아파트 112동 201호",
      "search_keywords": [
        "여수시 둔덕동 라온유아파트 112동 201호",
        "여수시 둔덕동 라온유아파트 112동 201",
        "여수시 둔덕동 라온유아파트 112동",
        "여수시 둔덕동 라온유아파트 112",
        "여수시 둔덕동 라온유아파트"
      ]
    }
  response:
    {
      "debug": {
        "url": "https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=U01TX0FVVEgyMDI2MDIwMjE3MjcxNTExNzUyODk%3D&currentPage=1&countPerPage=10&keyword=%EC%97%AC%EC%88%98%EC%8B%9C+%EB%91%94%EB%8D%95%EB%8F%99+%EB%9D%BC%EC%98%A8%EC%9C%A0%EC%95%84%ED%8C%8C%ED%8A%B8+112%EB%8F%99+201%ED%98%B8&resultType=json",
        "source": "JUSO_API",
        "status": 200,
        "keyFound": true,
        "keyLength": 40,
        "rawResponseLength": 1186
      },
      "source": "JUSO_API",
      "results": [
        {
          "rn": "상암로",
          "bdNm": "라온유아파트",
          "liNm": "",
          "mtYn": "0",
          "siNm": "전라남도",
          "admCd": "4613012300",
          "emdNm": "둔덕동",
          "emdNo": "01",
          "sggNm": "여수시",
          "zipNo": "59625",
          "bdKdcd": "0",
          "udrtYn": "0",
          "bdMgtSn": "4613012300102660017000001",
          "engAddr": "8 Sangam-ro, Yeosu-si, Jeollanam-do",
          "rnMgtSn": "461303282037",
          "buldMnnm": "8",
          "buldSlno": "0",
          "lnbrMnnm": "266",
          "lnbrSlno": "0",
          "roadAddr": "전라남도 여수시 상암로 8 (둔덕동)",
          "jibunAddr": "전라남도 여수시 둔덕동 266 라온유아파트",
          "detBdNmList": "상가동",
          "roadAddrPart1": "전라남도 여수시 상암로 8",
          "roadAddrPart2": " (둔덕동)"
        },
        {
          "rn": "상암로",
          "bdNm": "라온유아파트",
          "liNm": "",
          "mtYn": "0",
          "siNm": "전라남도",
          "admCd": "4613012300",
          "emdNm": "둔덕동",
          "emdNo": "01",
          "sggNm": "여수시",
          "zipNo": "59625",
          "bdKdcd": "1",
          "udrtYn": "0",
          "bdMgtSn": "4613012300102540000000001",
          "engAddr": "16 Sangam-ro, Yeosu-si, Jeollanam-do",
          "rnMgtSn": "461303282037",
          "buldMnnm": "16",
          "buldSlno": "0",
          "lnbrMnnm": "266",
          "lnbrSlno": "0",
          "roadAddr": "전라남도 여수시 상암로 16 (둔덕동, 라온유아파트)",
          "jibunAddr": "전라남도 여수시 둔덕동 266 라온유아파트",
          "detBdNmList": "101동,105동,108동,상가동,104동,103동,107동,106동,111동,110동,109동,112동,102동",
          "roadAddrPart1": "전라남도 여수시 상암로 16",
          "roadAddrPart2": " (둔덕동, 라온유아파트)"
        }
      ],
      "totalCount": "2",
      "_search_attempts": [
        {
          "status": "success",
          "keyword": "여수시 둔덕동 라온유아파트 112동 201호",
          "total_count": "2"
        }
      ],
      "_search_keywords": [
        "여수시 둔덕동 라온유아파트 112동 201호",
        "여수시 둔덕동 라온유아파트 112동 201",
        "여수시 둔덕동 라온유아파트 112동",
        "여수시 둔덕동 라온유아파트 112",
        "여수시 둔덕동 라온유아파트"
      ]
    }
이벤트 로그:
- 1aa838ea-f4b6-4864-96ec-a3423d6b0728 QUICK_REPLY_RULE_DECISION (2026-02-20T06:41:00.433+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "guard:RUNTIME_PRINCIPLE_MISSING_ZIPCODE_CHOICE",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/handlers/orderChangeHandler.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleOrderChangePostTools"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- d39259a5-9940-4156-8973-9fe3e7b5d280 EXECUTION_GUARD_TRIGGERED (2026-02-20T06:41:00.163+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
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
        "recorded_at": "2026-02-20T06:41:00.163Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- b38a6fdd-3795-445e-bc78-00ee9e88c53d CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-20T06:40:59.891+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "keys": [
        "order_id",
        "address",
        "candidate_count"
      ],
      "delta": {
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "order_id": "20260127-0000014",
        "candidate_count": 2
      },
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:59.891Z",
        "function_name": "unknown"
      },
      "key_count": 3
    }
- 4159d6e2-c0f2-4c8e-9e6e-2c0ab1a710f6 RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-20T06:40:59.631+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "54cfcf79-cd6e-4b55-8428-8f5463ff5d38",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- 7d5f5bf4-7ef2-4253-8ef5-3e641ed82da2 RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-20T06:40:58.542+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "54cfcf79-cd6e-4b55-8428-8f5463ff5d38",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "config_source": "principles_default"
    }
- a7b0d651-34af-4924-9a4b-d6435d65598a END_USER_WRITE_LATENCY (2026-02-20T06:40:57.486+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "duration_ms": 6621
    }
- 8f30ee9a-5371-4e85-b90b-ebf458151732 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-20T06:40:57.226+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "keys": [
        "address",
        "order_id",
        "candidate_count"
      ],
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "key_count": 3,
      "keys_truncated": false
    }
- f0bfafbf-8bd2-4612-b70c-716c365fd863 END_USER_CONTEXT_RESOLVED (2026-02-20T06:40:51.398+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "match_hit": false,
      "end_user_id": "1932cd1e-eeea-4855-ad96-38b22def6179",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": false,
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
- dcd1fe2e-e2b0-4ac2-8e82-0ea9d28fc8ca ADDRESS_CANDIDATES_PRESENTED (2026-02-20T06:40:50.027+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:50.027Z",
        "function_name": "unknown"
      },
      "candidates": [
        {
          "index": 1,
          "zip_no": "59625",
          "road_addr": "전라남도 여수시 상암로 8 (둔덕동)",
          "jibun_addr": "전라남도 여수시 둔덕동 266 라온유아파트",
          "display_label": "전라남도 여수시 둔덕동 266 라온유아파트 / 전라남도 여수시 상암로 8 (둔덕동) / 59625"
        },
        {
          "index": 2,
          "zip_no": "59625",
          "road_addr": "전라남도 여수시 상암로 16 (둔덕동, 라온유아파트)",
          "jibun_addr": "전라남도 여수시 둔덕동 266 라온유아파트",
          "display_label": "전라남도 여수시 둔덕동 266 라온유아파트 / 전라남도 여수시 상암로 16 (둔덕동, 라온유아파트) / 59625"
        }
      ],
      "query_text": "여수시 둔덕동 라온유아파트 112동 201호",
      "candidate_count": 2
    }
- bb5e1da8-e63b-4dbb-8a6d-fbf9ab12b610 ADDRESS_SEARCH_COMPLETED (2026-02-20T06:40:49.771+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:49.771Z",
        "function_name": "unknown"
      },
      "query_text": "여수시 둔덕동 라온유아파트 112동 201호",
      "result_count": 2,
      "candidate_count": 2
    }
- 23dbbe41-77ff-4724-ae7c-253c8494b067 ADDRESS_SEARCH_STARTED (2026-02-20T06:40:48.514+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:48.514Z",
        "function_name": "unknown"
      },
      "query_text": "여수시 둔덕동 라온유아파트 112동 201호"
    }
- 286b17b5-6aa5-4461-b73b-4d38e9ad5d2d POLICY_DECISION (2026-02-20T06:40:48.245+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
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
        "recorded_at": "2026-02-20T06:40:48.245Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- 7b579e95-2380-4207-8d1f-e28335785922 POLICY_DECISION (2026-02-20T06:40:47.97+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "stage": "tool",
      "action": "DEFER_FORCE_RESPONSE_TEMPLATE",
      "reason": "ORDER_AND_ADDRESS_ALREADY_AVAILABLE",
      "template": "order_change_need_zipcode",
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
        "recorded_at": "2026-02-20T06:40:47.970Z",
        "function_name": "emit:POLICY_DECISION"
      }
    }
- a37c9b04-78b4-4d7b-9467-3229a4419f09 PRE_MCP_DECISION (2026-02-20T06:40:47.704+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": "20260127-0000014",
        "has_address": true,
        "phone_masked": "*******7159"
      },
      "intent": "order_change",
      "allowed": [
        "update_order_shipping_address",
        "list_orders",
        "lookup_order",
        "search_address",
        "send_otp",
        "verify_otp"
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
        "recorded_at": "2026-02-20T06:40:47.704Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "여수시 둔덕동 라온유아파트 112동 201호",
      "final_calls": [],
      "forced_calls": [],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "allowed_tool_names": [],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 15
    }
- 4773b069-9b2d-43ed-9a32-524bd4da5d14 EXECUTION_GUARD_TRIGGERED (2026-02-20T06:40:47.441+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "tool": "update_order_shipping_address",
      "error": "MUTATION_INTENT_NOT_READY",
      "reason": "MISSING_REQUIRED_SLOTS",
      "missing": {
        "address": false,
        "zipcode": true,
        "order_id": false
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
        "recorded_at": "2026-02-20T06:40:47.441Z",
        "function_name": "emit:EXECUTION_GUARD_TRIGGERED"
      }
    }
- 5d1663b3-3809-4398-9ebf-bac9431d27c8 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-20T06:40:46.912+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:46.912Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 597818e5-3e63-4dd2-9ced-2a69070ce283 INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-20T06:40:46.659+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:46.658Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "address"
    }
- c3eb0548-1dbd-49d3-a581-1b06fbe0ec23 SLOT_EXTRACTED (2026-02-20T06:40:46.393+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "derived": {
        "phone": null,
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "zipcode": null,
        "order_id": null,
        "phone_masked": "-"
      },
      "resolved": {
        "phone": "01093107159",
        "intent": "order_change",
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "zipcode": null,
        "order_id": "20260127-0000014",
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
        "recorded_at": "2026-02-20T06:40:46.393Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "address",
      "resolved_slots": {}
    }
- cf32fc32-e773-45ed-9e5f-ed0f2003fcaa POLICY_STATIC_CONFLICT (2026-02-20T06:40:46.128+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-20T06:40:46.128Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }
- 29507e70-1b23-4511-bf78-13a954b5221f ENTITY_FIELD_UPDATED (2026-02-20T06:40:45.865+00:00) (turn_id=54cfcf79-cd6e-4b55-8428-8f5463ff5d38)
  payload:
    {
      "intent": "order_change",
      "updates": [
        {
          "next": "여수시 둔덕동 라온유아파트 112동 201호",
          "prev": "1",
          "field": "address"
        }
      ],
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:40:45.865Z",
        "function_name": "unknown"
      },
      "update_notice": "정보 업데이트: 배송지 1 -> 여수시 둔덕동 라온유아파트 112동 201호. 이후 안내는 변경된 정보 기준으로 진행합니다."
    }


TURN_ID: d1b3ea84-0991-4b32-9782-2be5467f70ca

[TOKEN_USED]

USER:
1

BOT:
확인한 것: 주소 여수시 둔덕동 라온유아파트 112동 201호
확인할 것: 선택하신 주소가 맞는지 확인해 주세요.
- 지번주소: 전라남도 여수시 둔덕동 266 라온유아파트
- 도로명주소: 전라남도 여수시 상암로 8 (둔덕동)
- 우편번호: 59625
네/아니오로 답해주세요.
그 다음으로 확인할 것: 배송지 변경 적용
RESPONSE_SCHEMA: view=choice, choice_mode=single, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 주소 여수시 둔덕동 라온유아파트 112동 201호\n확인할 것: 선택하신 주소가 맞는지 확인해 주세요.\n- 지번주소: 전라남도 여수시 둔덕동 266 라온유아파트\n- 도로명주소: 전라남도 여수시 상암로 8 (둔덕동)\n- 우편번호: 59625\n네/아니오로 답해주세요.\n그 다음으로 확인할 것: 배송지 변경 적용",
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
- da1dc0ca-3657-459a-8911-753017faf9d2 (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca) (2026-02-20T06:41:14.113+00:00)
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
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
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
        "recorded_at": "2026-02-20T06:41:13.837Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
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
          }
        ]
      },
      "slot_flow": {
        "expected_inputs": [
          "choice"
        ],
        "expected_input_stage": "order_change.address.awaiting_zipcode_choice",
        "expected_input_source": "contract_stage"
      },
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
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": []
      }
    }
이벤트 로그:
- 017a07fe-6fb1-45c7-b5e1-90fbbfe697f0 QUICK_REPLY_RULE_DECISION (2026-02-20T06:41:24.5+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "state:awaiting_zipcode_confirm_from_choice",
        "max_select": 1,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
        "submit_format": "single",
        "selection_mode": "single",
        "source_function": "handleAddressChangeRefundPending"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- f3a94dbc-6f91-4fb6-bb86-84e5804950f3 CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-20T06:41:24.231+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "keys": [
        "order_id",
        "address",
        "zipcode",
        "road_addr",
        "jibun_addr",
        "candidate_count",
        "index"
      ],
      "delta": {
        "index": 1,
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "zipcode": "59625",
        "order_id": "20260127-0000014",
        "road_addr": "전라남도 여수시 상암로 8 (둔덕동)",
        "jibun_addr": "전라남도 여수시 둔덕동 266 라온유아파트",
        "candidate_count": 2
      },
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:41:24.231Z",
        "function_name": "unknown"
      },
      "key_count": 7
    }
- 49e10017-d92d-40a0-a665-ad4d74fe939a RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-20T06:41:23.965+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d1b3ea84-0991-4b32-9782-2be5467f70ca",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- b3ee6b32-e87b-4d7f-b518-371481f8988d RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-20T06:41:22.946+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "d1b3ea84-0991-4b32-9782-2be5467f70ca",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "config_source": "principles_default"
    }
- 1450a997-35ee-44b9-8169-8ca9c7dec7f5 END_USER_WRITE_LATENCY (2026-02-20T06:41:21.889+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "duration_ms": 7489
    }
- 21c734cc-d17f-4d86-a4df-3dbc869ff470 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-20T06:41:21.613+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "keys": [
        "index",
        "address",
        "zipcode",
        "order_id",
        "road_addr",
        "jibun_addr",
        "candidate_count"
      ],
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "key_count": 7,
      "keys_truncated": false
    }
- 86c74a43-6d57-4760-8068-2bffbd11f172 END_USER_CONTEXT_RESOLVED (2026-02-20T06:41:14.938+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "match_hit": false,
      "end_user_id": "1932cd1e-eeea-4855-ad96-38b22def6179",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": false,
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
- 3aefeff3-1b57-4ad3-9a38-00ef5baf8a3e ADDRESS_CANDIDATE_SELECTED (2026-02-20T06:41:13.574+00:00) (turn_id=d1b3ea84-0991-4b32-9782-2be5467f70ca)
  payload:
    {
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:41:13.574Z",
        "function_name": "unknown"
      },
      "selected_index": 1,
      "selection_source": "number_input",
      "selected_candidate": {
        "index": 1,
        "zip_no": "59625",
        "road_addr": "전라남도 여수시 상암로 8 (둔덕동)",
        "jibun_addr": "전라남도 여수시 둔덕동 266 라온유아파트",
        "display_label": "전라남도 여수시 둔덕동 266 라온유아파트 / 전라남도 여수시 상암로 8 (둔덕동) / 59625"
      }
    }


TURN_ID: 23103ab4-09f2-4674-b0d2-39f19b0fbaf1

[TOKEN_USED]

USER:
네

BOT:
요약: 배송지 변경이 완료되었습니다.
근거: 주문 정보 변경 정책에 따라 처리했습니다.
상세: 주문번호 20260127-0000014의 배송지를 변경했습니다.
- 변경 전: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 11호
- 요청: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호
- 적용: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호
다음 액션: 추가 변경 사항이 있으면 알려주세요.
RESPONSE_SCHEMA: view=choice, choice_mode=multi, quick_replies=2, cards=0
RESPONSE_SCHEMA_DETAIL:
  {
    "message": "확인한 것: 주소 전라남도 여수시 상암로 8 (둔덕동) (59625)\n확인할 것: 배송지 변경이 완료되었습니다.\n주문번호 20260127-0000014의 배송지가 업데이트되었습니다.\n변경 전: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 11호\n변경 후: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호\n추가로 변경할 내용이 있으면 알려주세요.\n그 다음으로 확인할 것: 추가 도움 요청 확인",
    "ui_hints": {
      "view": "choice",
      "choice_mode": "multi"
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
RENDER_PLAN: view=choice, quick_replies=true, cards=false, mode=multi, min=1, max=2, submit=csv, prompt=-
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
QUICK_REPLY_RULE: mode=multi, min=1, max=2, submit=csv, source=explicit, criteria=payload:quick_replies, module=-, function=-

[TOKEN_UNUSED]
DEBUG 로그:
- 09b1fc19-a600-4b9b-9828-1d33b8715651 (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1) (2026-02-20T06:41:47.821+00:00)
  prefix_json:
    {
      "mcp": {
        "last": {
          "error": null,
          "status": "success",
          "function": "update_order_shipping_address",
          "result_count": 1
        }
      },
      "slot": {
        "phone": "01093107159",
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "zipcode": "59625",
        "order_id": "20260127-0000014",
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
        "recorded_at": "2026-02-20T06:41:47.536Z",
        "function_name": "insertTurnWithDebug"
      },
      "kb_admin": {
        "rule_ids": [
          "R270_order_change_allow_write",
          "R271_order_change_force_update"
        ],
        "kb_user_id": "f29567ba-275a-4cd9-add8-fa7b3d6e54c2",
        "kb_admin_ids": [
          "0da02c01-aad4-4286-a445-4db7a89f8ebe",
          "878b3ffe-2e18-4820-bda6-ffeccaa4212b"
        ],
        "tool_policies": [
          "update_order_shipping_address"
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
        "derived_address": "여수시 둔덕동 라온유아파트 112동 201호",
        "derived_zipcode": "59625",
        "expected_inputs": [
          "confirm"
        ],
        "derived_order_id": "20260127-0000014",
        "expected_input_stage": "order_change.address.awaiting_zipcode_confirm",
        "expected_input_source": "contract_stage"
      },
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
        "missing_tools_expected_by_intent": [
          "find_customer_by_phone"
        ]
      },
      "model_resolution": {
        "input_length": 1,
        "length_rule_hit": null,
        "keyword_rule_hit": null,
        "selection_reason": "deterministic_or_skipped"
      },
      "policy_conflicts": {
        "conflicts": [
          {
            "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
            "ruleA": "R268_order_change_need_zipcode_tool",
            "ruleB": "R271_order_change_force_update",
            "stage": "tool",
            "intentScope": "order_change"
          }
        ],
        "resolution": "tool_stage_force_response_precedence"
      }
    }
MCP 로그:
- 7866c96b-f023-4372-b485-25c42bddde11 cafe24:update_order_shipping_address@1.0: success (2026-02-20T06:41:47.265+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  request:
    {
      "path": "/orders/{order_id}/receivers",
      "method": "PUT",
      "zipcode": "59625",
      "address1": "전라남도 여수시 상암로 8 (둔덕동)",
      "address2": "112동 201호",
      "order_id": "20260127-0000014",
      "cellphone": "01093107159",
      "required_scope": "mall.write_order",
      "customer_verification_token": "cbfec468-5a27-4b4e-a49a-c9e2b591ddd7"
    }
  response:
    {
      "receivers": [
        {
          "name": "mejai",
          "phone": "",
          "city_en": "",
          "name_en": "",
          "shop_no": 1,
          "zipcode": "59625",
          "address1": "전라남도 여수시 상암로 8 (둔덕동)",
          "address2": "112동 201호",
          "state_en": "",
          "cellphone": "01093107159",
          "street_en": "",
          "address_city": "",
          "address_full": "전라남도 여수시 상암로 8 (둔덕동) 112동 201호",
          "country_code": "",
          "country_name": "",
          "address_state": "",
          "name_furigana": "",
          "shipping_code": "D-20260127-0000014-00",
          "address_street": "",
          "country_name_en": "",
          "shipping_message": "",
          "virtual_phone_no": null,
          "wished_delivery_date": null,
          "wished_delivery_time": {
            "end_hour": null,
            "start_hour": null
          },
          "clearance_information": null,
          "use_fast_delivery_date": null,
          "use_fast_delivery_time": null,
          "clearance_information_type": null,
          "change_default_shipping_address": "F"
        }
      ]
    }
- be7f371e-ea47-440f-85a0-edc2c7b474fa cafe24:lookup_order@1.0: success (2026-02-20T06:41:45.466+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  request:
    {
      "path": "/orders/{order_id}",
      "method": "GET",
      "order_id": "20260127-0000014",
      "required_scope": "mall.read_order",
      "customer_verification_token": "cbfec468-5a27-4b4e-a49a-c9e2b591ddd7"
    }
  response:
    {
      "order": {
        "paid": "T",
        "buyer": {
          "name": "mejai",
          "email": "ydsjy05@naver.com",
          "phone": "",
          "shop_no": 1,
          "user_id": null,
          "cellphone": "010-9310-7159",
          "member_id": "mejai",
          "user_name": null,
          "company_name": null,
          "updated_date": null,
          "buyer_zipcode": "08813",
          "buyer_address1": "서울 관악구 신림동 1515-7 ",
          "buyer_address2": "203",
          "names_furigana": "",
          "member_group_no": 1,
          "customer_notification": null,
          "company_registration_no": null
        },
        "items": [
          {
            "gift": "F",
            "labels": null,
            "hs_code": "",
            "item_no": 2,
            "options": [],
            "shop_no": 1,
            "quantity": 1,
            "tax_rate": 10,
            "option_id": "000A",
            "claim_code": null,
            "product_no": 20,
            "cancel_date": null,
            "option_type": null,
            "refund_date": null,
            "status_code": "N1",
            "status_text": "배송준비중",
            "supplier_id": "S0000000",
            "tracking_no": null,
            "volume_size": null,
            "claim_reason": null,
            "cloth_fabric": null,
            "made_in_code": "KR",
            "option_price": "0.00",
            "option_value": "",
            "order_status": "N20",
            "ordered_date": "2026-02-02T16:03:12+09:00",
            "origin_place": "국내 ",
            "product_code": "P000000U",
            "product_name": "아드헬린 린넨 플레어 원피스 그레이",
            "shipped_date": null,
            "store_pickup": "F",
            "subscription": "F",
            "supply_price": "1000.00",
            "variant_code": "P000000U000A",
            "exchange_date": null,
            "multi_invoice": null,
            "product_price": "1000.00",
            "shipping_code": "D-20260127-0000014-00",
            "supplier_name": "자체공급",
            "claim_quantity": 0,
            "delivered_date": null,
            "market_item_no": null,
            "payment_amount": null,
            "product_bundle": "F",
            "product_weight": "1.00",
            "request_undone": null,
            "order_item_code": "20260127-0000014-01",
            "origin_place_no": 1798,
            "payment_info_id": "0",
            "eng_product_name": "",
            "one_plus_n_event": null,
            "original_item_no": [],
            "product_material": "",
            "product_tax_type": "A",
            "refund_bank_name": "",
            "claim_reason_type": null,
            "post_express_flag": null,
            "product_bundle_no": "0",
            "shipping_fee_type": "X",
            "clearance_category": null,
            "item_granting_gift": null,
            "market_fail_reason": null,
            "naver_pay_order_id": null,
            "open_market_status": "",
            "origin_place_value": "",
            "volume_size_weight": null,
            "was_product_bundle": null,
            "cancel_request_date": null,
            "custom_product_code": "",
            "custom_variant_code": null,
            "product_bundle_list": null,
            "product_bundle_name": null,
            "product_bundle_type": null,
            "return_request_date": null,
            "shipping_company_id": "2",
            "option_value_default": "",
            "product_material_eng": null,
            "product_name_default": "아드헬린 린넨 플레어 원피스 그레이",
            "bundled_shipping_type": "N",
            "coupon_discount_price": "0.00",
            "exchange_request_date": null,
            "internal_product_name": "",
            "market_cancel_request": null,
            "return_collected_date": null,
            "return_confirmed_date": null,
            "shipping_company_code": "0001",
            "shipping_company_name": "자체배송",
            "supplier_product_name": "",
            "market_discount_amount": "0.00",
            "naver_pay_claim_status": null,
            "order_status_before_cs": null,
            "refund_bank_account_no": "",
            "shipping_expected_date": null,
            "shipping_fee_type_text": "기본배송",
            "additional_option_value": "",
            "clearance_category_code": null,
            "clearance_category_info": null,
            "individual_shipping_fee": "0.00",
            "market_fail_reason_type": null,
            "original_bundle_item_no": null,
            "shipping_payment_option": "P",
            "additional_option_values": [
              {
                "key": null,
                "name": null,
                "type": null,
                "value": null
              }
            ],
            "app_item_discount_amount": null,
            "market_fail_reason_guide": null,
            "additional_discount_price": "0.00",
            "purchaseconfirmation_date": null,
            "supplier_transaction_type": " ",
            "market_custom_variant_code": null,
            "refund_bank_account_holder": "",
            "product_bundle_name_default": null,
            "order_status_additional_info": "",
            "market_cancel_request_quantity": null
          }
        ],
        "return": [],
        "postpay": "F",
        "shop_no": 1,
        "canceled": "F",
        "currency": "KRW",
        "order_id": "20260127-0000014",
        "bank_code": "bank_13",
        "market_id": "self",
        "member_id": "mejai",
        "receivers": [
          {
            "name": "mejai",
            "phone": "",
            "city_en": null,
            "name_en": "",
            "shop_no": 1,
            "zipcode": "08793",
            "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
            "address2": "11호",
            "state_en": null,
            "cellphone": "01093107159",
            "street_en": null,
            "address_city": "",
            "address_full": "서울특별시 관악구 인헌2길 8-3 (봉천동) 11호",
            "country_code": null,
            "country_name": null,
            "address_state": "",
            "name_furigana": "",
            "shipping_code": "D-20260127-0000014-00",
            "address_street": "",
            "country_name_en": null,
            "shipping_message": "",
            "virtual_phone_no": null,
            "wished_delivery_date": "",
            "wished_delivery_time": null,
            "clearance_information": null,
            "clearance_information_type": null
          }
        ],
        "commission": "0.00",
        "order_date": "2026-01-27T01:49:00+09:00",
        "tax_detail": null,
        "use_escrow": "F",
        "cancel_date": null,
        "first_order": "T",
        "include_tax": "T",
        "loan_status": null,
        "naver_point": null,
        "social_name": null,
        "billing_name": "성지용",
        "easypay_name": "",
        "payment_date": "2026-02-02T16:03:12+09:00",
        "service_data": null,
        "service_type": null,
        "store_pickup": "F",
        "subscription": "F",
        "exchange_rate": "1.0000",
        "shipping_type": "A",
        "bank_code_name": "농협",
        "order_place_id": "self",
        "payment_amount": "3500.00",
        "payment_method": [
          "cash"
        ],
        "bank_account_no": "3020654717291",
        "market_order_no": null,
        "shipping_status": "F",
        "transaction_ids": null,
        "market_seller_id": null,
        "order_place_name": "PC쇼핑몰",
        "order_from_mobile": "F",
        "wished_carrier_id": null,
        "multiple_addresses": "F",
        "shipping_type_text": "국내배송",
        "social_member_code": null,
        "total_supply_price": "1000",
        "actual_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_method_name": [
          "무통장입금"
        ],
        "shipping_fee_detail": [
          {
            "items": [
              "20260127-0000014-01"
            ],
            "shipping_fee": "2500.00",
            "supplier_code": "S0000000",
            "cancel_shipping_fee": "0.00",
            "return_shipping_fee": "0.00",
            "shipping_group_code": 5,
            "refunded_shipping_fee": "0.00",
            "additional_shipping_fee": "0.00"
          }
        ],
        "wished_carrier_name": null,
        "initial_order_amount": {
          "tax": null,
          "shipping_fee": "2500.00",
          "payment_amount": "3500.00",
          "total_amount_due": "0.00",
          "order_price_amount": "1000.00",
          "app_discount_amount": "0.00",
          "points_spent_amount": "0.00",
          "credits_spent_amount": "0.00",
          "coupon_discount_price": "0.00",
          "point_incentive_amount": "0.00",
          "coupon_shipping_fee_amount": "0.00",
          "membership_discount_amount": "0.00",
          "set_product_discount_amount": "0.00",
          "market_other_discount_amount": "0.00",
          "shipping_fee_discount_amount": "0.00"
        },
        "payment_confirmation": null,
        "wished_delivery_date": "",
        "wished_delivery_time": null,
        "first_payment_methods": [
          "cash"
        ],
        "member_authentication": "T",
        "payment_gateway_names": null,
        "return_confirmed_date": null,
        "show_shipping_address": "T",
        "additional_handling_fee": "0.00",
        "additional_shipping_fee": "0.00",
        "admin_additional_amount": null,
        "bank_account_owner_name": "성지용",
        "sub_payment_method_code": null,
        "sub_payment_method_name": null,
        "regional_surcharge_detail": [],
        "additional_order_info_list": [],
        "naverpay_payment_information": null,
        "customer_group_no_when_ordering": "1",
        "international_shipping_insurance": "0.00"
      }
    }
이벤트 로그:
- efc7ddca-223f-4af2-9e5f-340271735518 QUICK_REPLY_RULE_DECISION (2026-02-20T06:42:00.809+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "quick_reply_count": 2,
      "quick_reply_config": {
        "preset": null,
        "criteria": "decorator:default_single",
        "max_select": 2,
        "min_select": 1,
        "source_module": "src/app/api/runtime/chat/presentation/ui-responseDecorators.ts",
        "submit_format": "csv",
        "selection_mode": "multi",
        "source_function": "deriveQuickReplyConfig"
      },
      "quick_reply_source": {
        "criteria": "payload:quick_replies"
      }
    }
- d27d69b8-2e8c-40a0-b85f-e3aa66a966c7 FINAL_ANSWER_READY (2026-02-20T06:42:00.531+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "model": "deterministic_order_change_success",
      "answer": "확인한 것: 주소 전라남도 여수시 상암로 8 (둔덕동) (59625)\n확인할 것: 배송지 변경이 완료되었습니다.\n주문번호 20260127-0000014의 배송지가 업데이트되었습니다.\n변경 전: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 11호\n변경 후: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호\n추가로 변경할 내용이 있으면 알려주세요.\n그 다음으로 확인할 것: 추가 도움 요청 확인",
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
        "recorded_at": "2026-02-20T06:42:00.531Z",
        "function_name": "emit:FINAL_ANSWER_READY"
      },
      "change_audit": {
        "diff": {
          "applied_changed_from_before": true,
          "request_changed_from_before": true,
          "applied_differs_from_request": false
        },
        "tool": "cafe24:update_order_shipping_address",
        "after": {
          "zipcode": "59625",
          "address1": "전라남도 여수시 상암로 8 (둔덕동)",
          "address2": "112동 201호",
          "rendered": "(59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호",
          "address_full": "전라남도 여수시 상암로 8 (둔덕동) 112동 201호"
        },
        "before": {
          "zipcode": "08793",
          "address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
          "address2": "11호",
          "rendered": "(08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 11호",
          "address_full": "서울특별시 관악구 인헌2길 8-3 (봉천동) 11호"
        },
        "request": {
          "zipcode": "59625",
          "address1": "전라남도 여수시 상암로 8 (둔덕동)",
          "address2": "112동 201호",
          "rendered": "(59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호"
        }
      },
      "debug_answer": "요약: 배송지 변경이 완료되었습니다.\n근거: 주문 정보 변경 정책에 따라 처리했습니다.\n상세: 주문번호 20260127-0000014의 배송지를 변경했습니다.\n- 변경 전: (08793) 서울특별시 관악구 인헌2길 8-3 (봉천동) 11호\n- 요청: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호\n- 적용: (59625) 전라남도 여수시 상암로 8 (둔덕동) 112동 201호\n다음 액션: 추가 변경 사항이 있으면 알려주세요."
    }
- a61b2868-baef-4829-bfb4-b16b0d27ef5d CONFIRMED_ENTITY_DELTA_APPLIED (2026-02-20T06:42:00.262+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "keys": [
        "order_id",
        "resolved_road_address",
        "resolved_jibun_address",
        "shipping_before_zipcode",
        "shipping_before_address1",
        "shipping_before_address2",
        "shipping_before_address_full",
        "shipping_request_zipcode",
        "shipping_request_address1",
        "shipping_request_address2",
        "original_entity_before_last_tool"
      ],
      "delta": {
        "order_id": "20260127-0000014",
        "resolved_road_address": "전라남도 여수시 상암로 8 (둔덕동)",
        "resolved_jibun_address": "전라남도 여수시 둔덕동 266 라온유아파트",
        "shipping_before_zipcode": "08793",
        "shipping_before_address1": "서울특별시 관악구 인헌2길 8-3 (봉천동)",
        "shipping_before_address2": "11호",
        "shipping_request_zipcode": "59625",
        "shipping_request_address1": "전라남도 여수시 상암로 8 (둔덕동)",
        "shipping_request_address2": "112동 201호",
        "shipping_before_address_full": "서울특별시 관악구 인헌2길 8-3 (봉천동) 11호",
        "original_entity_before_last_tool": "update_order_shipping_address"
      },
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:42:00.262Z",
        "function_name": "unknown"
      },
      "key_count": 11
    }
- fcc2069b-ffc5-4f1a-81ba-4bf06a47804c RUNTIME_SELF_UPDATE_REVIEW_COMPLETED (2026-02-20T06:41:59.978+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "23103ab4-09f2-4674-b0d2-39f19b0fbaf1",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "violation_count": 0,
      "deduped_violation_count": 0
    }
- a53a882e-86de-40d4-94b4-3efd8c0fc95b RUNTIME_SELF_UPDATE_REVIEW_STARTED (2026-02-20T06:41:58.696+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "org_id": "8ad81b6b-3210-40dd-8e00-9a43a4395923",
      "turn_id": "23103ab4-09f2-4674-b0d2-39f19b0fbaf1",
      "session_id": "d14027e2-742c-44a0-8d0d-72db1b35273d",
      "config_source": "principles_default"
    }
- 278e8ae1-48c2-4d31-bb94-d1af2fc9a452 END_USER_WRITE_LATENCY (2026-02-20T06:41:57.637+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "duration_ms": 9536
    }
- 69987c80-b532-47dd-a99b-dfa1cc3a89e1 END_USER_CONFIRMED_ENTITY_SAVED (2026-02-20T06:41:57.374+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "keys": [
        "order_id",
        "resolved_road_address",
        "resolved_jibun_address",
        "shipping_before_zipcode",
        "shipping_before_address1",
        "shipping_before_address2",
        "shipping_request_zipcode",
        "shipping_request_address1",
        "shipping_request_address2",
        "shipping_before_address_full",
        "original_entity_before_last_tool"
      ],
      "flow_id": "c33491f9-73bc-439f-9dd2-7ec298450d98",
      "key_count": 11,
      "keys_truncated": false
    }
- 7dd25bb6-f240-473f-9913-e848840b2828 END_USER_CONTEXT_RESOLVED (2026-02-20T06:41:48.639+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "match_hit": false,
      "end_user_id": "1932cd1e-eeea-4855-ad96-38b22def6179",
      "identity_count": 3,
      "identity_types": [
        "email",
        "phone",
        "external"
      ],
      "runtime_source": "auth_user",
      "match_attempted": false,
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
- aa2bb79e-d668-4fe4-8e29-e4ae953209c4 PRE_MCP_DECISION (2026-02-20T06:41:43.731+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "denied": [],
      "entity": {
        "order_id": "20260127-0000014",
        "has_address": true,
        "phone_masked": "*******7159"
      },
      "intent": "order_change",
      "allowed": [
        "update_order_shipping_address",
        "list_orders",
        "lookup_order",
        "search_address",
        "send_otp",
        "verify_otp"
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
        "recorded_at": "2026-02-20T06:41:43.731Z",
        "function_name": "emit:PRE_MCP_DECISION"
      },
      "query_text": "네",
      "final_calls": [
        {
          "args": {
            "zipcode": "59625",
            "address1": "전라남도 여수시 상암로 8 (둔덕동)",
            "address2": "112동 201호",
            "order_id": "20260127-0000014",
            "cellphone": "01093107159",
            "customer_verification_token": "cbfec468-5a27-4b4e-a49a-c9e2b591ddd7"
          },
          "name": "update_order_shipping_address"
        }
      ],
      "forced_calls": [
        {
          "args": {
            "zipcode": "59625",
            "address1": "전라남도 여수시 상암로 8 (둔덕동)",
            "address2": "112동 201호",
            "order_id": "20260127-0000014",
            "cellphone": "01093107159",
            "customer_verification_token": "cbfec468-5a27-4b4e-a49a-c9e2b591ddd7"
          },
          "name": "update_order_shipping_address"
        }
      ],
      "query_source": "current_message",
      "missing_slots": [],
      "resolved_slots": {},
      "policy_conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "allowed_tool_names": [
        "cafe24:update_order_shipping_address"
      ],
      "blocked_by_missing_slots": false,
      "allowed_tool_names_total": 15
    }
- 56dd2c9b-85d8-4f16-aaf4-fdec076693a7 INTENT_SCOPE_GATE_REVIEW_COMPLETED (2026-02-20T06:41:43.198+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "intent": "order_change",
      "blocked": false,
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:41:43.198Z",
        "function_name": "unknown"
      },
      "missing_slots": [],
      "required_slots": [],
      "resolved_slots": {}
    }
- 2df1e0fa-860d-4959-bdd5-d3e4e151099b INTENT_SCOPE_GATE_REVIEW_STARTED (2026-02-20T06:41:42.931+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "phase": "runtime",
        "call_chain": [],
        "module_path": "unknown",
        "recorded_at": "2026-02-20T06:41:42.931Z",
        "function_name": "unknown"
      },
      "query_source": "current_message",
      "expected_input": "confirm"
    }
- 891d3c68-e4c9-4fb7-a794-c1d5f7aeefd8 SLOT_EXTRACTED (2026-02-20T06:41:42.655+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "derived": {
        "phone": null,
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "zipcode": "59625",
        "order_id": "20260127-0000014",
        "phone_masked": "-"
      },
      "resolved": {
        "phone": "01093107159",
        "intent": "order_change",
        "address": "여수시 둔덕동 라온유아파트 112동 201호",
        "zipcode": "59625",
        "order_id": "20260127-0000014",
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
        "recorded_at": "2026-02-20T06:41:42.655Z",
        "function_name": "emit:SLOT_EXTRACTED"
      },
      "query_source": "current_message",
      "missing_slots": [],
      "expected_input": "confirm",
      "resolved_slots": {}
    }
- c48d9018-313b-4620-a260-1c924c2e983e POLICY_STATIC_CONFLICT (2026-02-20T06:41:42.394+00:00) (turn_id=23103ab4-09f2-4674-b0d2-39f19b0fbaf1)
  payload:
    {
      "intent": "order_change",
      "_decision": {
        "line": 42,
        "phase": "runtime",
        "column": 0,
        "call_chain": [
          {
            "line": 42,
            "column": 0,
            "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
            "function_name": "emit:POLICY_STATIC_CONFLICT"
          }
        ],
        "module_path": "src/app/api/runtime/chat/runtime/policyInputRuntime.ts",
        "recorded_at": "2026-02-20T06:41:42.394Z",
        "function_name": "emit:POLICY_STATIC_CONFLICT"
      },
      "conflicts": [
        {
          "kind": "FORCE_RESPONSE_VS_FORCE_TOOL",
          "ruleA": "R268_order_change_need_zipcode_tool",
          "ruleB": "R271_order_change_force_update",
          "stage": "tool",
          "intentScope": "order_change"
        }
      ],
      "resolution": "tool_stage_force_response_precedence"
    }