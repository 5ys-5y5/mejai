# 20260305-2103(widget-policy-merge-chat-settings)

## 변경 요약
- 대화 정책 로딩 시 B_chat_settings.chat_policy를 기본값으로 병합

## 변경 내용
- src/app/api/widget-templates/[id]/chat-policy/route.ts
  - B_chat_settings 최신 row의 chat_policy를 읽어 템플릿 정책과 병합

## 롤백
- B_chat_settings 병합 제거 (B_chat_widgets 기준으로만 provider 반환)
