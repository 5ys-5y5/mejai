# 대화 정책 트리 (Conversation Policy)

Source
- UI: `src/components/conversation/ChatSettingsPanel.tsx`
- Runtime debug 출력 여부: `src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts`
- Admin menu 실제 기능: `src/components/design-system/conversation/ConversationUI.parts.tsx`

## 트리 (대화 정책 탭 기준)

- `widget.is_active`
  - 기본 세팅
    - `widget.name`
    - `widget.agent_id`
    - `widget.entry_mode`
    - `widget.embed_view`
  - 구성
    - `setup_config.kb.mode`
    - `setup_config.kb.kb_id`
    - `setup_config.kb.admin_kb_ids`
    - `setup_config.mcp.provider_keys`
    - `setup_config.mcp.tool_ids`
    - `setup_config.llm.default`
  - 대화 기본값
    - `theme.greeting`
    - `theme.input_placeholder`
  - 런처 디자인
    - `cfg.launcherLabel`
    - `cfg.position`
    - `theme.launcher_logo_id`
    - `theme.primary_color | launcher_bg`
    - `launcher.container.bottom`
    - `launcher.container.left`
    - `launcher.container.right`
    - `launcher.container.gap`
    - `launcher.container.zIndex`
    - `launcher.size`
  - 위젯 디자인
    - `iframe.width`
    - `iframe.height`
    - `iframe.borderRadius`
    - `iframe.boxShadow`
    - `iframe.background`
    - `iframe.layout`
    - `iframe.bottomOffset`
    - `iframe.sideOffset`
  - 노출/권한
    - `widget.allowed_domains`
    - `widget.allowed_paths`
    - `theme.allowed_accounts`

- `widget.header.enabled`
  - `widget.header.logo`
  - `widget.header.status`
  - `widget.header.agentAction`
  - `widget.header.newConversation`
  - `widget.header.close`

- `widget.tabBar.enabled`
  - `widget.tabBar.chat`
    - Admin Panel
      - `adminPanel.enabled`
      - `adminPanel.logsToggle`
      - `adminPanel.copyConversation`
    - Interaction
      - `interaction.quickReplies`
      - `interaction.productCards`
      - `interaction.inputSubmit`
      - `interaction.threePhasePrompt`
        - `interaction.threePhasePromptShowConfirmed`
        - `interaction.threePhasePromptShowConfirming`
        - `interaction.threePhasePromptShowNext`
        - `interaction.threePhasePromptHideLabels`
        - (editable) `interaction.threePhasePromptLabels.confirmed`
        - (editable) `interaction.threePhasePromptLabels.confirming`
        - (editable) `interaction.threePhasePromptLabels.next`
  - `widget.tabBar.list`
  - `widget.tabBar.policy`
    - Setup
      - `setup.modelSelector`
      - `setup.modeExisting`
        - `setup.agentSelector`
        - `setup.sessionIdSearch`
        - (editable) `setup.existingLabels.versionSelector`
        - (editable) `setup.existingLabels.sessionSelector`
        - (editable) `setup.existingLabels.conversationMode`
      - `setup.modeNew`
        - `setup.inlineUserKbInput`
        - `setup.llmSelector`
        - `setup.kbSelector`
        - `setup.adminKbSelector`
      - `setup.routeSelector`
      - `setup.defaultSetupMode`
      - `setup.defaultLlm`
      - `setup.llms`
      - `setup.kbIds`
      - `setup.adminKbIds`
      - `setup.routes`
    - Allow/Deny
    - MCP
      - `mcp.providerSelector`
      - `mcp.actionSelector`
    - Runtime
      - `runtime.selfUpdate.enabled`

## 합쳐져야 하는 항목 (토글/가시성 Row에 라벨 편집 통합)

아래 항목들은 **토글/가시성 Row에서 라벨 편집까지 가능하도록 통합**합니다.

### Interaction (요청하신 항목)
- `interaction.threePhasePromptShowConfirmed` + `interaction.threePhasePromptLabels.confirmed`
- `interaction.threePhasePromptShowConfirming` + `interaction.threePhasePromptLabels.confirming`
- `interaction.threePhasePromptShowNext` + `interaction.threePhasePromptLabels.next`

### Setup (Existing)
- `setup.modeExisting` + `setup.existingLabels.modeExisting`
- `setup.agentSelector` + `setup.existingLabels.agentSelector`
- `setup.sessionIdSearch` + `setup.existingLabels.sessionIdSearch`

`setup.existingLabels.versionSelector`, `setup.existingLabels.sessionSelector`, `setup.existingLabels.conversationMode`는
토글 항목이 없어 별도 라벨 편집 Row로 유지됩니다.

### Setup (New/Route)
- `setup.inlineUserKbInput` + `setup.labels.inlineUserKbInput`
- `setup.llmSelector` + `setup.labels.llmSelector`
- `setup.kbSelector` + `setup.labels.kbSelector`
- `setup.adminKbSelector` + `setup.labels.adminKbSelector`
- `setup.routeSelector` + `setup.labels.routeSelector`

현 상태는 토글/가시성 Row와 라벨 편집 Row가 분리되어 있어 동일 항목이 두 줄로 노출됩니다.
요청대로 토글 Row 안에서 라벨을 바로 수정할 수 있도록 합치는 것이 목표입니다.

## 삭제(정리) 후보

Admin Panel 영역에서 실제 UI/기능 기준으로 삭제 대상:
- `adminPanel.selectionToggle`
- `adminPanel.messageSelection`
- `adminPanel.messageMeta`
- `adminPanel.copyIssue`

남아있는 항목:
- `adminPanel.enabled`
- `adminPanel.logsToggle`
- `adminPanel.copyConversation`

## Debug Transcript 동작 메모

- 정책 UI의 Debug Transcript 섹션은 제거 예정.
- 실제 런타임 출력 여부는 `DEBUG_RUNTIME_CHAT=1` 또는 `NODE_ENV !== "production"` 조건으로 유지.

