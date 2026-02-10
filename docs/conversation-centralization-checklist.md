# Conversation Complete Centralization Checklist

This checklist is the single source of truth for conversation centralization work.

## 1) UI Centralization (`ConversationUI.tsx`)
- [x] Runtime conversation pages use only `HeroConversationSurface` / `ConversationSurface`.
- [x] UI composition logic for conversation runtime lives in `src/components/design-system/conversation/ConversationUI.tsx`.
- [x] Client message shape no longer uses `quickReplyConfig` as a render input.

## 2) Render Decision Centralization (`renderPolicy.ts`)
- [x] UI render decision uses `render_plan` from runtime policy output.
- [x] Client-side `quick_reply_config` fallback parsing is removed from transcript mapping.
- [x] Conversation selector rendering requires `renderPlan` and does not infer view from legacy fields.

## 3) Policy Centralization (Settings `tab=chat`)
- [x] Page feature resolution is sourced from `chat_policy` provider config.
- [x] Runtime request includes `page_key` so server resolves per-page policy.
- [x] Server route sanitizes disallowed interaction outputs based on resolved page policy.

## 4) Shared Runtime Controller Centralization
- [x] `user-profile` admin state is always loaded from one shared hook.
- [x] Runtime config aggregation is centralized in `useConversationPageRuntimeConfig`.
- [x] MCP catalog loading/filtering is centralized in `useConversationMcpCatalog`.

## 5) Verification Gate (must pass after every centralization change)
- [x] `npx.cmd tsc --noEmit`
- [x] ESLint on changed conversation/runtime files

## Notes
- `src/app/app/design-system/page.tsx` is a design-system documentation/demo page, not an operational runtime conversation page.
