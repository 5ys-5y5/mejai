# Summary
- Added display/edit fields for widget setup_config (kb/mcp/llm) in ChatSettingsPanel so B_chat_widgets chat_policy values show in policy/base tabs.

# Before
```tsx
{showWidgetBasics ? (
  <RowGroup label="기본 세팅">
    ...
  </RowGroup>
) : null}

{showThemeBasics ? (
  <RowGroup label="대화 기본값">
    ...
  </RowGroup>
) : null}
```

# After
```tsx
{showWidgetBasics ? (
  <RowGroup label="기본 세팅">
    ...
  </RowGroup>
) : null}

<RowGroup label="구성">
  <Row label="setup_config.kb.mode" ... />
  <Row label="setup_config.kb.kb_id" ... />
  <Row label="setup_config.kb.admin_kb_ids" ... />
  <Row label="setup_config.mcp.provider_keys" ... />
  <Row label="setup_config.mcp.tool_ids" ... />
  <Row label="setup_config.llm.default" ... />
</RowGroup>

{showThemeBasics ? (
  <RowGroup label="대화 기본값">
    ...
  </RowGroup>
) : null}
```

# Files
- src/components/conversation/ChatSettingsPanel.tsx
