# Runtime Hardcoding Reduction TODO

Updated: 2026-02-05

## Completed

- [x] Added centralized quick-reply rule resolver
  - `src/app/api/runtime/chat/runtime/quickReplyConfigRuntime.ts`
- [x] Intent disambiguation now computes quick-reply mode dynamically via helper
  - `src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts`
- [x] Restock lead-day prompts now use centralized quick-reply resolver
  - `src/app/api/runtime/chat/handlers/restockHandler.ts`
  - `src/app/api/runtime/chat/runtime/restockPendingRuntime.ts`
- [x] UI fallback quick-reply config now uses centralized resolver
  - `src/app/api/runtime/chat/presentation/ui-responseDecorators.ts`
- [x] Added rule source trace fields (`source_function`, `source_module`)
  - emitted and copied in Laboratory transcript
- [x] Added decision `call_chain` capture in audit events/debug logs
  - `src/app/api/runtime/chat/services/auditRuntime.ts`
- [x] Order choices quick-reply rule switched to centralized resolver
  - `src/app/api/runtime/chat/runtime/toolRuntime.ts`
- [x] Post-action choice/satisfaction quick-reply rule switched to centralized resolver
  - `src/app/api/runtime/chat/runtime/postActionRuntime.ts`
- [x] YES/NO confirmations now carry explicit quick-reply config in key runtime/handler paths
  - `src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts`
  - `src/app/api/runtime/chat/runtime/pendingStateRuntime.ts`
  - `src/app/api/runtime/chat/runtime/restockPendingRuntime.ts`
  - `src/app/api/runtime/chat/handlers/orderChangeHandler.ts`
  - `src/app/api/runtime/chat/handlers/refundHandler.ts`

## Next (High Priority)

- [x] Replace text-pattern quick-reply extraction with explicit runtime metadata in all stages
  - target: stop relying on message text in `deriveQuickReplies`
  - [x] intent disambiguation replies now emit explicit `quick_replies` + `quick_reply_config`
  - [x] responder now prefers `quick_reply_config`-based derivation before message-text fallback
  - [x] emit explicit `quick_replies` for remaining deterministic numbered/day-choice responses
    - restock lead-day prompts now emit explicit `D-n` quick replies in handler/runtime flows
  - [x] reduce `deriveQuickRepliesWithTrace` to minimal fallback-only role
    - fallback now limited to numbered/day-choice parsing
- [x] Add `quick_reply_config` to YES/NO confirmations across handlers/runtime
  - [x] `toolRuntime.ts` forced-confirm style replies
  - [x] `finalizeRuntime.ts` forced template replies (yes/no auto detection)
  - [x] static validator: yes/no prompt in `respond(...message...)` must include `quick_reply_config`
    - `scripts/validate-runtime-quick-reply-config.mjs`
  - [x] static validator: banned hardcoded yes/no prompt literal outside template resolver
    - `scripts/validate-runtime-prompt-templates.mjs`
- [x] Promote selection/confirmation templates to policy/KB-configurable values
  - avoid hardcoded Korean prompt strings in runtime handlers
  - [x] intent disambiguation prompt title/example can be overridden by bot_context
    - keys: `intent_disambiguation_prompt_title`, `intent_disambiguation_prompt_example`
  - [x] yes/no confirmation suffix is centralized and overrideable
    - `src/app/api/runtime/chat/runtime/promptTemplateRuntime.ts`
    - key: `confirm_yes_no_suffix` (`template_overrides` 또는 `template_confirm_yes_no_suffix`)
  - [x] compiled policy templates are auto-mapped into runtime template overrides
    - applied at orchestrator bootstrap via `resolveRuntimeTemplateOverridesFromPolicy`
  - [x] externalize lead-day prompt template keys (title/selectable/example/retry) to policy templates
  - [x] externalize numbered-choice prompt template keys to policy templates
    - `restock_product_choice_title`, `order_choice_title`, `order_choice_header`, `numbered_choice_example`
  - [x] add template key coverage validation
    - `scripts/validate-runtime-template-keys.mjs`
- [x] Add `QUICK_REPLY_RULE_DECISION` event type for each response turn
  - includes resolved mode/min/max/submit and source rule ids
  - [x] includes `quick_reply_source` to trace decorator-vs-payload origin

## Next (Medium Priority)

- [x] Introduce response schema object for all deterministic replies
  - `{ message, ui_hints, quick_replies, quick_reply_config, cards }`
  - [x] response includes `response_schema` base envelope
  - [x] add strict runtime type and enforce in responder path
    - `RuntimeResponderPayload`, `RuntimeResponseSchema`
  - [x] include `cards/ui_hints` population contract and validator
    - `validateRuntimeResponseSchema`
    - `scripts/validate-runtime-response-schema.mjs`
- [x] Move numeric choice parsing rules to shared policy helper
  - `parseIndexedChoice/parseIndexedChoices/parseLeadDaysSelection` are centralized in `intentSlotPolicy.ts`
  - UI fallback parser also reuses shared helpers:
    - `extractNumberedOptionIndicesFromText`
    - `extractLeadDayOptionsFromText`
- [x] Expand `call_chain` depth controls and PII-safe truncation in audit tables
  - [x] runtime call-chain is attached to debug prefix as `execution.call_chain`
  - [x] audit `_decision.call_chain` max depth capped (`MAX_DECISION_CALL_CHAIN=12`)
  - [x] audit function name includes digit-mask + max-length truncation
- [x] Ensure non-terminal fallback answers expose explicit next action
  - restock non-target fallback now transitions to `awaiting_product_choice` with numbered options
  - emits `next_action` and `candidate_count` in `POLICY_DECISION`
- [x] Gate out-of-scope alternative suggestions with explicit user consent at intent level
  - principle flag: `requireConsentBeforeAlternativeSuggestion`
  - intent scope: `alternativeSuggestionConsentIntents` (currently `restock_inquiry`)
  - state transition: `awaiting_non_target_alternative_confirm` -> yes/no -> choice/input
  - upgraded principle: do not expose alternative item list before consent (`hideAlternativeCandidatesBeforeConsent`)
  - consent question text is generated via policy function (`generateAlternativeRestockConsentQuestion`)
- [x] Remove unsafe `.insert(...).catch(...)` chaining for Supabase audit writes
  - replaced with async `try/catch` fire-and-forget blocks in runtime responder

## Workload Snapshot (Remaining)

- Total remaining tracks: 0
- Estimated remaining effort: 0 dev-day (current scope completed)
- Breakdown:
  - done: 대화 복사 로그 기반 회귀 점검 항목 반영

## Constraints / Notes

- Some deterministic prompts are still intentionally hardcoded due to business/legal wording requirements.
- Any move to externalized templates must preserve exact guard semantics and auditability.
