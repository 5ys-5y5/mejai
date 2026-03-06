# 20260305-2008(widget-template-agent-id)

## 변경 요약
- widget template API에서 agent_id를 setup_config에 병합해 chat_policy로 저장되도록 수정
- 템플릿 조회 응답에 setup_config.agent_id를 agent_id로 노출

## 변경 전 문제
- /app/conversation 에서 agent 선택 후 저장해도 B_chat_widgets.chat_policy에 agent_id가 반영되지 않아 값이 유지되지 않음

## 변경 내용
- src/app/api/widget-templates/route.ts
  - mapTemplateRow: setup_config.agent_id -> agent_id 추가
  - POST: body.agent_id가 있으면 setup_config에 병합
- src/app/api/widget-templates/[id]/route.ts
  - mapTemplateRow: setup_config.agent_id -> agent_id 추가
  - PATCH: body.agent_id가 있으면 setup_config에 병합

## 변경 후 기대
- 템플릿 저장 시 agent_id가 chat_policy.widget.setup_config.agent_id에 저장되고,
  템플릿 조회/목록에서 agent_id가 정상 반영됨
