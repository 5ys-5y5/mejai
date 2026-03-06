# Summary
- Fixed build error in normalizeWidgetChatPolicyProvider by introducing the provider variable before normalization.

# Before
```ts
return {
  ...(record.widget ? { widget: record.widget } : {}),
  ...
} as ConversationFeaturesProviderShape;
return normalizeWidgetPolicyWidgetFields(provider);
```

# After
```ts
const provider: ConversationFeaturesProviderShape = {
  ...(record.widget ? { widget: record.widget } : {}),
  ...
};
return normalizeWidgetPolicyWidgetFields(provider);
```

# Files
- src/lib/widgetChatPolicyShape.ts
