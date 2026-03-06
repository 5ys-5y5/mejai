# Summary
- Added preserveNulls mode to ChatSettingsPanel to display missing policy fields as NULL and keep keys with null values.
- Toggle rows now support null state for ON/OFF and USER/ADMIN visibility.
- /app/conversation uses preserveNulls for policy panels.

# Files
- src/components/conversation/ChatSettingsPanel.tsx
- src/app/app/conversation/page.tsx
