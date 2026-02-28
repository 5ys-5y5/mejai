# ChatSettingsPanel 상세 기능 매핑 (/app/conversation)

대상 파일: `src/app/app/conversation/ChatSettingsPanel.tsx`
대상 페이지: `http://localhost:3000/app/conversation`

이 문서는 ChatSettingsPanel이 화면에 무엇을 보여주는지, 어떤 데이터에서 읽고/어디로 저장하는지, 그리고 삭제 가능성(다른 코드/DB 영향)을 상세히 정리합니다.

## 1) 데이터 흐름 요약

- **로드(읽기)**
  - `/api/auth-settings/providers?provider=chat_policy`
    - 응답 `provider`를 `applyProviderToDraft()`로 해석해 화면 상태(`draftByPage`, `debugCopyDraftByPage`, `setupUiByPage`, `registeredPages`)를 구성합니다.
  - `/api/runtime/governance/config`
    - Runtime Self Update 토글 상태(`governanceConfig`)를 로드합니다.
  - `/api/runtime/debug-fields`
    - Debug Transcript 섹션의 샘플 필드/이벤트/툴 목록(`debugFieldExamples`, `debugFieldEventTypes`, `debugFieldMcpTools`)을 로드합니다.

- **저장(쓰기)**
  - `/api/auth-settings/providers` (POST)
    - `provider: "chat_policy"`로 아래 데이터를 저장합니다.
      - `pages`: 각 페이지 정책
      - `debug_copy`: Debug Transcript 옵션
      - `page_registry`: 등록된 페이지 목록
      - `settings_ui.setup_fields`: Setup UI 라벨/순서
  - `/api/runtime/governance/config` (POST)
    - Runtime Self Update 토글/가시성 저장

- **UI 컬럼 구조**
  - `columnKeys = ["__header", ...registeredPages]`
  - 헤더 컬럼은 **코드 라벨/기본 구조**를, 각 페이지 컬럼은 **실제 적용 값**을 보여줍니다.
  - `registeredPages`는 `provider.pages`, `provider.settings_ui.setup_fields`, `provider.page_registry`에서 파생됩니다.

## 2) 화면 구성: 섹션별 상세 항목

### 2.1 Admin Panel 섹션
- 위치: 각 페이지 컬럼 내부
- 데이터 소스: `draft.adminPanel.*` + `draft.visibility.adminPanel.*`
- 저장 위치: `/api/auth-settings/providers`의 `pages[page]`

표시 항목과 바인딩
- `adminPanel.enabled` (관리 패널 활성화)
  - 표시: ToggleField
  - 상태: `draft.adminPanel.enabled`
  - 가시성: `draft.visibility.adminPanel.enabled`
- `adminPanel.selectionToggle`
  - 상태: `draft.adminPanel.selectionToggle`
  - 가시성: `draft.visibility.adminPanel.selectionToggle`
- `adminPanel.logsToggle`
  - 상태: `draft.adminPanel.logsToggle`
  - 가시성: `draft.visibility.adminPanel.logsToggle`
- `adminPanel.messageSelection`
  - 상태: `draft.adminPanel.messageSelection`
  - 가시성: `draft.visibility.adminPanel.messageSelection`
- `adminPanel.messageMeta`
  - 상태: `draft.adminPanel.messageMeta`
  - 가시성: `draft.visibility.adminPanel.messageMeta`
- `adminPanel.copyConversation`
  - 상태: `draft.adminPanel.copyConversation`
  - 가시성: `draft.visibility.adminPanel.copyConversation`
  - 변경 범위: `updateAllPages()` (모든 페이지 동시 변경)
- `adminPanel.copyIssue`
  - 상태: `draft.adminPanel.copyIssue`
  - 가시성: `draft.visibility.adminPanel.copyIssue`
  - 변경 범위: `updateAllPages()`

삭제 영향/가능 여부
- **삭제 가능**: UI 제거만으로 런타임/DB 동작은 변경되지 않습니다.
- **영향**: 해당 값을 편집할 수 없게 됩니다. 기존 저장 값은 유지됩니다.

### 2.2 Debug Transcript (대화 복사) 섹션
- 위치: 각 페이지 컬럼 내부
- 데이터 소스: `debugCopyDraftByPage[page]`
- 저장 위치: `/api/auth-settings/providers`의 `debug_copy[page]`

표시 항목과 바인딩
- 출력 모드
  - `debugCopyDraft.outputMode` + `debugCopyDraft.sections.logs.debug.usedOnly`
  - SelectPopover (`full`, `summary`, `used_only`)
- Header 그룹
  - `debugCopyDraft.sections.header.enabled`
  - 세부 토글: `principle`, `expectedLists`, `resolvedModules`, `resolvedModels`, `resolvedKb`, `resolvedMcp`, `resolvedTools`, `resolvedPolicies`, `resolvedPolicyIssues`, `resolvedPolicyActions`, `resolvedPolicyMemos`
- Turn 그룹
  - `debugCopyDraft.sections.turn.enabled`
  - 세부 토글: `user`, `assistant`, `tool`, `history`, `messages`, `chat`, `requestMeta`, `requestBody`, `responseBody`, `renderPlan`, `responseSchemaDetailFields`, `renderPlanDetailFields`
  - 세부 필드 트리: `RESPONSE_SCHEMA_DETAIL_TREE`, `RENDER_PLAN_DETAIL_TREE`
- Logs 그룹
  - `debugCopyDraft.sections.logs.enabled`
  - 세부 토글: `event`, `mcp`, `debug`
  - `event.allowlist` (CSV 입력)
  - `mcp.allowlist` (CSV 입력)
  - `debug.policyVersion`, `debug.showFields`, `debug.prefixJsonSections`, `debug.usedOnly` 등
- Debug 예시/도움말
  - `/api/runtime/debug-fields`에서 샘플 경로/이벤트/툴을 로드하여 inline help에 표시

삭제 영향/가능 여부
- **삭제 가능**: UI 제거만으로 다른 코드/DB에 즉시 영향은 없습니다.
- **영향**: debug_copy 설정 편집 불가. 저장된 설정은 유지됩니다.

### 2.3 Interaction 섹션
- 위치: 각 페이지 컬럼 내부
- 데이터 소스: `draft.interaction.*` + `draft.visibility.interaction.*`
- 저장 위치: `/api/auth-settings/providers`의 `pages[page]`

표시 항목과 바인딩
- `interaction.quickReplies`
  - 상태: `draft.interaction.quickReplies`
  - 가시성: `draft.visibility.interaction.quickReplies`
- `interaction.productCards`
  - 상태: `draft.interaction.productCards`
  - 가시성: `draft.visibility.interaction.productCards`
- `interaction.prefill`
  - 상태: `draft.interaction.prefill`
  - 가시성: `draft.visibility.interaction.prefill`
- `interaction.prefillMessages`
  - 텍스트 영역 (줄바꿈 목록)
- `interaction.inputPlaceholder`
  - 입력 필드
- `interaction.widgetHeaderNewConversation`
  - 상태: `draft.interaction.widgetHeaderNewConversation`
  - 가시성: `draft.visibility.interaction.widgetHeaderNewConversation`
- `interaction.widgetHeaderAgentAction`
  - 상태: `draft.interaction.widgetHeaderAgentAction`
  - 가시성: `draft.visibility.interaction.widgetHeaderAgentAction`
- `interaction.widgetHeaderClose`
  - 상태: `draft.interaction.widgetHeaderClose`
  - 가시성: `draft.visibility.interaction.widgetHeaderClose`
- `interaction.threePhasePrompt`
  - 상태: `draft.interaction.threePhasePrompt`
  - 가시성: `draft.visibility.interaction.threePhasePrompt`
  - 세부 항목:
    - `threePhasePromptLabels.*`
    - `threePhasePromptShowConfirmed`
    - `threePhasePromptShowConfirming`
    - `threePhasePromptShowNext`
    - `threePhasePromptHideLabels`
- `interaction.inputSubmit`
  - 상태: `draft.interaction.inputSubmit`
  - 가시성: `draft.visibility.interaction.inputSubmit`

삭제 영향/가능 여부
- **삭제 가능**: UI 제거만으로 다른 코드/DB에 즉시 영향은 없습니다.
- **영향**: 위젯/대화 UI 인터랙션 정책을 편집할 수 없게 됩니다.

### 2.4 Setup 섹션
- 위치: 각 페이지 컬럼 내부
- 데이터 소스: `draft.setup.*` + `draft.visibility.setup.*` + `setupUiByPage[page]`
- 저장 위치: `/api/auth-settings/providers`의 `pages[page]` 및 `settings_ui.setup_fields`

표시 항목과 바인딩
- Runtime Self Update
  - 데이터: `/api/runtime/governance/config`
  - 상태: `governanceConfig.enabled`
  - 가시성: `governanceConfig.visibility_mode`
  - 토글 저장: `/api/runtime/governance/config` POST
- 기존/신규 Setup 필드 구성
  - `setup.modeExisting`, `setup.modeNew` 토글
  - `setupUiByPage[page].existingOrder` / `order` 드래그 정렬
  - 라벨 커스터마이즈: `setupUiByPage[page].existingLabels`, `setupUiByPage[page].labels`
- 기본 LLM 선택
  - `draft.setup.defaultLlm` (SelectPopover: `chatgpt`, `gemini`)
- Setup 필드 토글
  - `setup.inlineUserKbInput`
  - `setup.llmSelector`
  - `setup.kbSelector`
  - `setup.adminKbSelector`
  - `setup.routeSelector`
  - `setup.mcpProviderSelector`
  - `setup.mcpActionSelector`
  - `setup.agentSelector` (existing)
  - `setup.versionSelector` (existing)
  - `setup.sessionSelector` (existing)
  - `setup.sessionIdSearch` (existing)
  - `setup.conversationMode` (existing)

삭제 영향/가능 여부
- **삭제 가능**: UI 제거만으로 런타임/DB에 즉시 영향은 없습니다.
- **영향**: 설정 UI 구성(순서/라벨/활성) 및 Self Update 토글을 관리할 수 없게 됩니다.

## 3) 기타 내부 로직

- 페이지 목록 정규화
  - `BASE_PAGE_KEYS = ["/app/conversation", "/embed"]`
  - `EXCLUDED_PAGE_KEYS = ["/"]`
  - `normalizePages()`가 provider 기반 페이지 목록을 병합/정렬

- 변경 범위
  - `updatePage(page, updater)`는 특정 페이지의 정책만 수정
  - `updateAllPages(updater)`는 모든 페이지에 동일 변경

## 4) 삭제 가능/불가능 요약

- **UI 섹션 삭제는 모두 가능**
  - ChatSettingsPanel은 순수 UI + API 호출(읽기/쓰기) 역할입니다.
  - 삭제해도 런타임 정책 실행이나 DB 자체에 직접적인 영향은 없습니다.
- **삭제 시 기능 상실**
  - 정책 편집 UI가 사라지므로, 정책은 기존 값이 유지되고 수정 불가 상태가 됩니다.
- **특히 주의**
  - Runtime Self Update는 `/api/runtime/governance/config`에서 별도 관리됨.
  - UI를 삭제하면 governance 설정 변경 경로가 사라집니다.

