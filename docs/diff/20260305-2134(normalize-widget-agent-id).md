# Summary
- Normalized widget.agent_id/access fields at the shared contract layer so policy lists and editors always receive agent_id even when only setup_config.agent_id exists.

# Before
```ts
export function normalizeWidgetChatPolicyProvider(input: unknown): ConversationFeaturesProviderShape | null {
  if (!input) return null;
  if (isProviderShape(input)) return input as ConversationFeaturesProviderShape;
  ...
  return {
    ...(record.widget ? { widget: record.widget } : {}),
    ...
  };
}
```

# After
```ts
export function normalizeWidgetChatPolicyProvider(input: unknown): ConversationFeaturesProviderShape | null {
  if (!input) return null;
  if (isProviderShape(input)) return normalizeWidgetPolicyWidgetFields(input as ConversationFeaturesProviderShape);
  ...
  const provider = { ...(record.widget ? { widget: record.widget } : {}), ... } as ConversationFeaturesProviderShape;
  return normalizeWidgetPolicyWidgetFields(provider);
}
```

# Files
- src/lib/widgetChatPolicyShape.ts
- src/app/api/widget-templates/[id]/chat-policy/route.ts
