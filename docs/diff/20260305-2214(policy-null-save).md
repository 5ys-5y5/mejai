# Summary
- Added helper to persist null-valued feature keys when saving chat_policy.
- Conversation policy save now expands missing feature keys to nulls before POST.

# Files
- src/lib/widgetPolicyUtils.ts
- src/app/app/conversation/page.tsx
