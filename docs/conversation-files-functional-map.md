# Conversation 기능 단위 정의서

요청 기준: 4개 파일을 기능(최상위 정의) 단위로 정리했습니다.

## 파일 목록
- src/components/design-system/conversation/ConversationUI.tsx
- src/components/design-system/conversation/panels.tsx
- src/components/design-system/conversation/runtimeUiCatalog.ts
- src/components/design-system/conversation/ui.tsx

## src/components/design-system/conversation/ConversationUI.tsx

| Line | Kind | Name | 기능 |
|---:|---|---|---|
| 29 | function | ConversationSetupBox | 설정 패널 조립체(설정 UI 컨테이너)입니다. |
| 47 | function | ConversationChatBox | 대화 패널 조립체(스레드/입력/확장 컨트롤 포함)입니다. |
| 110 | function | ConversationSessionHeader | 세션 액션 바(복사/새탭/삭제)입니다. |
| 178 | type | AdminMenuProps | 관리자 토글/복사 메뉴입니다. |
| 195 | function | ConversationAdminMenu | 관리자 토글/복사 메뉴입니다. |
| 277 | type | BaseMessage | 타입 정의입니다. |
| 279 | type | AvatarSelectionStyle | 타입 정의입니다. |
| 281 | type | ThreadProps | 메시지 버블 스레드 렌더러입니다. |
| 297 | function | ConversationThread | 메시지 버블 스레드 렌더러입니다. |
| 374 | type | SetupFieldsProps | LLM/KB/MCP 등 설정 입력 필드 조합기입니다. |
| 424 | function | AdminBadge | 함수/컴포넌트 정의입니다. |
| 432 | function | ConversationSetupFields | LLM/KB/MCP 등 설정 입력 필드 조합기입니다. |
| 619 | type | QuickReply | 타입 정의입니다. |
| 620 | type | ProductCard | 타입 정의입니다. |
| 621 | type | QuickReplyConfig | 타입 정의입니다. |
| 622 | type | RenderPlan | 타입 정의입니다. |
| 634 | type | ReplyMessageShape | 타입 정의입니다. |
| 643 | type | ReplyProps | 타입 정의입니다. |
| 657 | const | warnedUiTypeFallbackKeys | 상수 정의입니다. |
| 659 | function | parseLeadDayValue | 함수/컴포넌트 정의입니다. |
| 666 | function | ConversationGrid | 선택지/카드 공통 그리드 레고입니다. |
| 675 | function | ConversationQuickReplyButton | 텍스트 선택지 버튼 레고입니다. |
| 692 | function | ConversationConfirmButton | 선택 확정 버튼 레고입니다. |
| 711 | function | ConversationReplySelectors | quick reply/card 선택 렌더 분기기입니다. |
| 879 | function | HeroConversationSurface | 랜딩 대화 표면(현재 laboratory 표면 래핑)입니다. |
| 894 | type | LaboratoryExistingConversationMode | 타입 정의입니다. |
| 895 | type | LaboratoryExistingSetupMode | 기존 모델 모드 설정 블록입니다. |
| 897 | type | LaboratoryExistingSetupProps | 기존 모델 모드 설정 블록입니다. |
| 931 | function | LaboratoryExistingSetup | 기존 모델 모드 설정 블록입니다. |
| 1170 | type | LaboratoryNewModelControlsProps | 신규 모델 제어 블록입니다. |
| 1203 | function | LaboratoryNewModelControls | 신규 모델 제어 블록입니다. |
| 1344 | type | LaboratoryPaneChatMessage | 타입 정의입니다. |
| 1387 | type | LaboratoryPaneModelShape | 타입 정의입니다. |
| 1403 | type | LaboratoryConversationPaneProps | 실험실 단일 대화 패널(설정+채팅)입니다. |
| 1439 | function | LaboratoryConversationPane | 실험실 단일 대화 패널(설정+채팅)입니다. |
| 1619 | type | LaboratoryModelConversationMode | 타입 정의입니다. |
| 1620 | type | LaboratoryModelKbItem | 타입 정의입니다. |
| 1629 | type | LaboratoryModelToolShape | 타입 정의입니다. |
| 1636 | type | LaboratoryModelStateLike | 타입 정의입니다. |
| 1676 | type | LaboratoryModelAgentVersionItem | 타입 정의입니다. |
| 1683 | type | LaboratoryModelCardProps | 실험실 모델 카드 단위 조립체입니다. |
| 1739 | function | LaboratoryModelCard | 실험실 모델 카드 단위 조립체입니다. |
| 2188 | function | LaboratoryConversationSurface | 실험실 페이지 메인 대화 표면입니다. |

## src/components/design-system/conversation/panels.tsx

| Line | Kind | Name | 기능 |
|---:|---|---|---|
| 6 | function | ConversationSplitLayout | 설정/대화 2패널 레이아웃 껍데기입니다. |
| 27 | function | ConversationSetupPanel | 설정 영역 카드/패딩 래퍼입니다. |
| 47 | function | ConversationChatPanel | 대화 영역 카드/패딩/오버플로우 래퍼입니다. |

## src/components/design-system/conversation/runtimeUiCatalog.ts

| Line | Kind | Name | 기능 |
|---:|---|---|---|
| 1 | type | RuntimePromptKind | 런타임 프롬프트 의도 분류 타입(정책 분기 키)입니다. |
| 11 | type | RuntimeUiTypeId | 런타임에서 선택 가능한 UI 타입 ID 유니온입니다. |
| 19 | const | RUNTIME_UI_TYPE_IDS | 허용된 UI 타입 ID 목록(유효성 체크 기준)입니다. |
| 28 | const | RUNTIME_UI_TYPE_HIERARCHY | 상위/하위 UI 타입 관계를 정의한 카탈로그입니다. |
| 37 | const | RUNTIME_UI_PROMPT_RULES | prompt/criteria 기반 UI 분류 규칙 집합입니다. |
| 52 | function | escapeHtml | 표 렌더링 전 HTML 이스케이프 유틸입니다. |
| 61 | function | buildIntentDisambiguationTableHtmlFromText | 의도 모호성 텍스트를 표 HTML로 변환합니다. |

## src/components/design-system/conversation/ui.tsx

| Line | Kind | Name | 기능 |
|---:|---|---|---|
| 7 | function | ConversationGrid | 선택지/카드 공통 그리드 레고입니다. |
| 27 | function | ConversationQuickReplyButton | 텍스트 선택지 버튼 레고입니다. |
| 56 | function | ConversationConfirmButton | 선택 확정 버튼 레고입니다. |
| 88 | type | ConversationProductCardItem | 카드 선택지 데이터 스키마 타입입니다. |
| 95 | function | ConversationProductCard | 이미지/텍스트 카드 선택지 레고입니다. |

