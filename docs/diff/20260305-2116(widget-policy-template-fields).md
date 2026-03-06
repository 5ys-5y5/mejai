# 20260305-2116(widget-policy-template-fields)

## 변경 요약
- 대화 정책 로딩 시 템플릿의 name/is_active를 policy widget 값으로 보강
- 정책 저장 시 widget.name/is_active가 있으면 B_chat_widgets 컬럼에 반영

## 변경 내용
- src/app/api/widget-templates/[id]/chat-policy/route.ts
  - GET: B_chat_widgets.name/is_active -> provider.widget 필드 보강
  - POST: provider.widget.name/is_active -> B_chat_widgets 컬럼 업데이트

## 빌드 수정
- ensureTemplateWidgetFields: provider null 처리

## 빌드 수정
- providerShape null 안전 처리

## 추가 수정
- widget.access <-> widget.allowed_domains/paths, setup_config.agent_id <-> widget.agent_id 상호 보강
