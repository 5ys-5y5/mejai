# Summary
- Ensured widget.name/is_active are injected into chat_policy when listing templates so policy UI shows widget.name.

# Before
- /api/widget-templates list returned chat_policy without widget.name when only B_chat_widgets.name was set.

# After
- mapTemplateRow merges template name/is_active into provider.widget for list responses.

# Files
- src/app/api/widget-templates/route.ts
