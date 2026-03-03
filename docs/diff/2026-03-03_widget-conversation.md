# 위젯 관리(Conversation) 변경 로그

## 범위
- 설계 문서: `docs/widget_conversation_page.md`
- 기준일: 2026-03-03

## 체크리스트 상태
- [x] WCP-001 템플릿 메타 저장 유틸리티
- [x] WCP-002 런타임 템플릿/인스턴스/오버라이드 병합
- [x] WCP-003 overrides 인코딩/디코딩 유틸리티
- [x] WCP-004 템플릿 CRUD API
- [x] WCP-005 템플릿 정책 API
- [x] WCP-006 ChatSettingsPanel dataSource 리팩터링
- [x] WCP-007 /app/conversation 기본/정책 UI
- [x] WCP-008 /app/conversation 구성 규칙 UI
- [x] WCP-009 런타임(`/api/widget/*`) 정책/설정/overrides 반영
- [x] WCP-010 embed/launcher/public widget.js overrides 전달
- [x] WCP-011 /app/install 템플릿 기반 설치 코드/미리보기
- [ ] WCP-012 Landing/demo 템플릿 연동
- [ ] WCP-013 테스트/검증 및 문서

## WCP-001
변경:
- 추가: `src/lib/widgetTemplateMeta.ts`

롤백:
- 파일 삭제 후 기존 theme 메타 접근 경로 제거

## WCP-002
변경:
- 추가: `src/lib/widgetRuntimeConfig.ts`

롤백:
- 런타임에서 템플릿/오버라이드 병합 로직 제거

## WCP-003
변경:
- 추가: `src/lib/widgetOverrides.ts`

롤백:
- `ovr` 파라미터 처리 제거

## WCP-004
변경:
- 추가: `src/app/api/widget-templates/route.ts`
- 추가: `src/app/api/widget-templates/[id]/route.ts`

롤백:
- 템플릿 CRUD API 제거

## WCP-005
변경:
- 추가: `src/app/api/widget-templates/[id]/chat-policy/route.ts`

롤백:
- 템플릿 정책 API 제거

## WCP-006
변경:
- 수정: `src/components/settings/ChatSettingsPanel.tsx`

롤백:
- `dataSource` 처리 제거 및 기존 auth-settings provider 흐름만 남김

## WCP-007
변경:
- 추가: `src/app/app/conversation/page.tsx`

롤백:
- 페이지 제거 또는 라우트 비활성화

## WCP-008
변경:
- 수정: `src/app/app/conversation/page.tsx`

롤백:
- 에이전트/MCP/KB UI 제약 제거

## WCP-009
변경:
- 수정: `src/app/api/widget/init/route.ts`
- 수정: `src/app/api/widget/config/route.ts`
- 수정: `src/app/api/widget/chat/route.ts`
- 수정: `src/app/api/widget/stream/route.ts`

롤백:
- overrides/템플릿 병합 로직 제거, 기존 widget row만 사용

## WCP-010
변경:
- 수정: `src/app/embed/[key]/page.tsx`
- 수정: `src/components/design-system/widget/WidgetUI.parts.tsx`
- 수정: `public/widget.js`

롤백:
- overrides 전달(postMessage/ovr param) 제거

## WCP-011
변경:
- 수정: `src/app/app/install/page.tsx`
- 추가: `src/components/settings/WidgetInstallPanel.tsx`

롤백:
- 설치 UI를 기존 위젯 선택 방식으로 복원

## WCP-012
변경:
- (미진행)

롤백:
- N/A

## WCP-013
변경:
- (미진행)

롤백:
- N/A
