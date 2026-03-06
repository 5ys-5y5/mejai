# 변경 요약
- /api/widget/chat 실패(AGENT_NOT_ALLOWED/KB_NOT_ALLOWED/MCP_REQUIRED) 시 WIDGET_CHAT_ERROR 이벤트 기록.
- /api/transcript/copy에서 transcript 결과를 docs/logs/servicePageLog(bot-YYYYMMDD-HHmm).md로 저장.
- transcript가 비어있으면 마지막 WIDGET_CHAT_ERROR를 실패 사유로 기록.

# 수정 파일
- src/app/api/widget/chat/route.ts
- src/app/api/transcript/copy/route.ts
