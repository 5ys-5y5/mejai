# Summary
- Expanded widget policy normalization to pull legacy/root fields into widget.* so all stored B_chat_widgets values render in policy/base tabs.

# Before
- Only access.allowed_* and setup_config.agent_id were synchronized into widget.*.

# After
- Normalize root-level legacy fields into widget.*:
  - name, is_active, entry_mode, embed_view
  - theme, cfg, launcher, iframe
  - setup_config (root) and legacy kb/mcp/llm fields
  - allowed_domains/paths from root
  - agent_id from root
- Continue syncing access.allowed_* and setup_config.agent_id.

# Files
- src/lib/widgetChatPolicyShape.ts
