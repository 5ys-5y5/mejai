# Summary
- Filtered agent selections to those whose B_bot_agents.editable_id includes the current user id.
- Rendered agent options with status dot + name/version/llm, and passed filtered agents into ChatSettingsPanel.

# Before
- All agents were listed and labels did not include llm.
- ChatSettingsPanel did not receive agents list; it only showed current id fallback.

# After
- Only editable agents are listed (editable_id contains current user).
- Agent labels include name, version, llm; status dot shown in option renderer.
- ChatSettingsPanel receives editableAgents for widget.agent_id selection.

# Files
- src/app/app/conversation/page.tsx
- src/components/conversation/ChatSettingsPanel.tsx
