# 변경 요약 (20260305-1636)

## 변경 사항
- src/app/app/design-system/page.tsx: DependencyMeta 호출에 	ype prop 누락으로 빌드 에러 발생 → 	ype={meta.type} 추가.

## 빌드/검증
- 
pm run build: pending (아래 실행 예정)
- chrome-devtools 검증: pending (로그인 필요 시 요청 예정)
- src/app/app/design-system/page.tsx: 다른 DependencyMeta 호출에도 	ype 누락 → 	ype={meta.type} 추가.
- src/lib/conversation/pageFeaturePolicy.ts: WidgetChatPolicyConfig에 setup_config 추가 (빌드 에러 수정).
- src/lib/conversation/pageFeaturePolicy.ts: WidgetChatPolicyConfig에 ccess 필드 추가 (allowed_domains/allowed_paths).
- src/lib/conversation/pageFeaturePolicy.ts: ccess.allowed_domains/allowed_paths에 
ull 허용으로 타입 불일치 해결.

## 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).

## chrome-devtools 확인
- /app/install: 템플릿 선택 UI 및 page_keys 입력/저장 버튼 표시 확인.
- /app/conversation-dup: 템플릿 리스트/새로고침 버튼 표시, 새로고침 클릭 시 API 응답 OK 로그 확인 (콘솔 오류 없음).
- src/app/app/conversation-dup/page.tsx: 미리보기에서 public_key가 없을 때 	emplate_id(템플릿 id)로 프리뷰 가능하도록 previewKey/	emplateId fallback 추가.

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- src/components/design-system/widget/WidgetUI.parts.tsx: uildWidgetEmbedSrc에 preview 옵션 추가, WidgetLauncherRuntime에 previewMode 추가.
- src/app/app/conversation-dup/page.tsx: 프리뷰 URL에 preview=1 포함 및 런처에 previewMode 전달.
- src/app/embed/[key]/page.tsx: preview 쿼리 파라미터를 init payload로 전달.
- src/app/api/widget/init/route.ts: preview 모드일 때 관리자만 비공개 템플릿/도메인 제한 우회 허용.

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- src/app/api/widget/init/route.ts: preview 허용 조건에 동일 오리진/리퍼러 확인 추가 (세션 없는 로컬 프리뷰 대응).

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- src/app/api/widget/chat/route.ts: preview 모드 동일 오리진/관리자 허용으로 비공개 템플릿 대화 가능 처리.
- src/app/embed/[key]/page.tsx: /api/widget/chat 요청에 preview 플래그 전달.

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- src/app/api/widget/chat/route.ts: preview 모드에서 MCP/KB 강제 및 usable/public 제약을 완화.

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- src/app/api/widget/chat/route.ts: WIDGET_RUNTIME_BASE_URL가 잘못된 값이면 무시하고 기본 호스트를 사용하도록 방어 로직 추가.

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- DB: B_chat_widgets.created_by가 null인 템플릿을 admin 사용자(a7baaa2-806f-4457-88f0-7d29f802d126)로 채움 (미리보기 런타임 org_id 요구 해결).
- src/app/api/widget/chat/route.ts: x-widget-org-id 및 로그에 org_id 매핑 사용 (created_by → org_id 조회).

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).

## chrome-devtools 확인
- /app/conversation-dup 미리보기 탭에서 템플릿 ID 기반 프리뷰 로드 및 입력/응답 확인 (메시지 전송 → 응답 수신).
- src/app/app/conversation/page.tsx: conversation-dup 구현을 동일하게 적용하기 위해 전체 파일을 conversation-dup로 교체.

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- chrome-devtools: /app/conversation가 /app/conversation-dup와 동일 UI/구성으로 로드되는 것 확인.
- src/app/app/conversation-dup/page.tsx: 파일 삭제 (conversation-dup 제거).

## 추가 빌드/검증
- 
pm run build: 성공 (middleware deprecation warning만 존재).
- src/app/app/conversation-dup/: 디렉터리 삭제.
