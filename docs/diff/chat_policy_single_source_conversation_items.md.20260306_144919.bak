# 대화 정책 탭 항목 정리 계획 (Single Source 적용)

## 범위
- 대상 UI: `/app/conversation` 페이지의 "대화 정책" 탭
- 대상 컴포넌트: `src/components/conversation/ChatSettingsPanel.tsx`
- 본 문서는 "chat_policy_single_source" 설계 원칙을 각 항목에 적용한 정리 방향을 명시한다.

## 공통 원칙 (요약)
- DB 컬럼으로 존재하는 값은 `chat_policy`에 저장하지 않는다.
- UI 표시명도 실제 원천 정의명을 사용한다.
- 기능 파괴 방지 및 최소 수정이 최우선이다.
- `widget.access.*` 강제 통합 금지, 필요 시 기능별 분리 유지.

## 항목별 정리

### 1) 템플릿 메타 (DB 원천)
- `B_chat_widgets.name`
  - 현재 UI 라벨: `widget.name`
  - 정리 방향: UI 라벨/입력/저장을 모두 `B_chat_widgets.name`으로 통일한다.
  - 정책(JSON)에는 저장하지 않는다.
- `B_chat_widgets.is_active`
  - 현재 UI 라벨: `widget.is_active`
  - 정리 방향: UI 라벨/입력/저장을 모두 `B_chat_widgets.is_active`로 통일한다.
  - 정책(JSON)에는 저장하지 않는다.

### 2) 위젯 기본 설정 (정책 원천)
- `chat_policy.widget.agent_id`
- `chat_policy.widget.entry_mode`
- `chat_policy.widget.embed_view`
정리 방향:
- DB 컬럼에 동일 의미 값이 없으므로 `chat_policy.widget.*`에만 유지한다.
- UI 라벨은 실제 저장 경로(`chat_policy.widget.*`)로 맞춘다.

### 3) 위젯 구성 (정책 원천: setup_config)
- `chat_policy.widget.setup_config.kb.mode`
- `chat_policy.widget.setup_config.kb.kb_id`
- `chat_policy.widget.setup_config.kb.admin_kb_ids`
- `chat_policy.widget.setup_config.mcp.provider_keys`
- `chat_policy.widget.setup_config.mcp.tool_ids`
- `chat_policy.widget.setup_config.llm.default`
정리 방향:
- `setup_config`는 정책 원천으로 유지한다.
- 동일 의미의 다른 경로가 발견될 경우, 런타임/저장/표시 경로를 조사한 뒤 단일화한다.

### 4) 위젯 테마/런처/임베드 UI (정책 원천)
- `chat_policy.widget.theme.greeting`
- `chat_policy.widget.theme.input_placeholder`
- `chat_policy.widget.theme.launcher_logo_id`
- `chat_policy.widget.theme.primary_color`
- `chat_policy.widget.theme.launcher_bg`
- `chat_policy.widget.theme.allowed_accounts`
- `chat_policy.widget.cfg.launcherLabel`
- `chat_policy.widget.cfg.position`
- `chat_policy.widget.launcher.container.bottom`
- `chat_policy.widget.launcher.container.left`
- `chat_policy.widget.launcher.container.right`
- `chat_policy.widget.launcher.container.gap`
- `chat_policy.widget.launcher.container.zIndex`
- `chat_policy.widget.launcher.size`
- `chat_policy.widget.iframe.width`
- `chat_policy.widget.iframe.height`
- `chat_policy.widget.iframe.borderRadius`
- `chat_policy.widget.iframe.boxShadow`
- `chat_policy.widget.iframe.background`
- `chat_policy.widget.iframe.layout`
- `chat_policy.widget.iframe.bottomOffset`
- `chat_policy.widget.iframe.sideOffset`
정리 방향:
- 위 항목은 모두 정책 원천에만 유지한다.
- DB 컬럼과 중복되는 값이 없으므로 별도 이동/삭제는 하지 않는다.

### 5) 허용 도메인/경로 (중복 후보)
- 현재 UI 경로:
  - `chat_policy.widget.allowed_domains`
  - `chat_policy.widget.allowed_paths`
- 존재 가능한 중복 경로:
  - `chat_policy.widget.access.allowed_domains`
  - `chat_policy.widget.access.allowed_paths`

정리 방향:
- `widget.access.*`를 강제로 통합하지 않는다.
- 기능 파괴 방지를 위해, 런타임/저장/표시 경로를 조사 후 **최소 변경**으로 단일화한다.
- 단일화 기준은 "현재 가장 널리 사용되는 경로"이며, 변경 시 영향 범위를 문서화한다.

### 6) 관리자 패널 토글 (정책 원천: features/adminPanel)
- `chat_policy.features.adminPanel.enabled`
- `chat_policy.features.adminPanel.logsToggle`
- `chat_policy.features.adminPanel.copyConversation`
정리 방향:
- 정책 원천 유지. 중복 경로가 없으면 변경 없음.

### 7) 사용자 인터랙션 토글 (정책 원천: features/interaction)
- `chat_policy.features.interaction.quickReplies`
- `chat_policy.features.interaction.productCards`
- `chat_policy.features.interaction.inputSubmit`
- `chat_policy.features.interaction.threePhasePrompt`
- `chat_policy.features.interaction.threePhasePromptShowConfirmed`
- `chat_policy.features.interaction.threePhasePromptShowConfirming`
- `chat_policy.features.interaction.threePhasePromptShowNext`
- `chat_policy.features.interaction.threePhasePromptHideLabels`
- `chat_policy.features.interaction.threePhasePromptLabels.*` (라벨 편집)
정리 방향:
- 정책 원천 유지. 중복 경로가 없으면 변경 없음.

### 8) 위젯 헤더 토글 (정책 원천: features/widget.header)
- `chat_policy.features.widget.header.enabled`
- `chat_policy.features.widget.header.logo`
- `chat_policy.features.widget.header.status`
- `chat_policy.features.widget.header.agentAction`
- `chat_policy.features.widget.header.newConversation`
- `chat_policy.features.widget.header.close`
정리 방향:
- 정책 원천 유지. 중복 경로가 없으면 변경 없음.

### 9) 위젯 탭바/패널 토글 (정책 원천: features/widget)
- `chat_policy.features.widget.tabBar.enabled`
- `chat_policy.features.widget.tabBar.chat`
- `chat_policy.features.widget.tabBar.list`
- `chat_policy.features.widget.tabBar.policy`
- `chat_policy.features.widget.chatPanel`
- `chat_policy.features.widget.historyPanel`
- `chat_policy.features.widget.setupPanel`
정리 방향:
- 정책 원천 유지.
- 탭바 토글은 패널 토글과 연동되므로, 저장 경로는 그대로 유지한다.

### 10) MCP 선택 UI (정책 원천: features/mcp)
- `chat_policy.features.mcp.providerSelector`
- `chat_policy.features.mcp.actionSelector`
- `chat_policy.features.mcp.providers.allowlist/denylist`
- `chat_policy.features.mcp.tools.allowlist/denylist`
정리 방향:
- 정책 원천 유지. 중복 경로가 없으면 변경 없음.

### 11) Setup UI (정책 원천: features/setup 및 setup_ui)
- `chat_policy.features.setup.modelSelector`
- `chat_policy.features.setup.modeExisting`
- `chat_policy.features.setup.agentSelector`
- `chat_policy.features.setup.sessionIdSearch`
- `chat_policy.features.setup.modeNew`
- `chat_policy.features.setup.inlineUserKbInput`
- `chat_policy.features.setup.llmSelector`
- `chat_policy.features.setup.kbSelector`
- `chat_policy.features.setup.adminKbSelector`
- `chat_policy.features.setup.routeSelector`
- `chat_policy.features.setup.defaultSetupMode`
- `chat_policy.features.setup.defaultLlm`
- `chat_policy.features.setup.llms.allowlist/denylist`
- `chat_policy.features.setup.kbIds.allowlist/denylist`
- `chat_policy.features.setup.adminKbIds.allowlist/denylist`
- `chat_policy.features.setup.routes.allowlist/denylist`
- `chat_policy.setup_ui.labels.*` 및 `chat_policy.setup_ui.existing_labels.*`

정리 방향:
- 정책 원천 유지.
- `setup_ui`와 `settings_ui.setup_fields[pageKey]`가 이중으로 기록되는 구조는 계약 레벨이라 유지하되,
  "읽기 우선순위"를 문서화한다.
  - 읽기: `settings_ui.setup_fields[pageKey]` 우선, 없으면 `setup_ui` 사용
  - 쓰기: 두 경로 모두 업데이트(기존 호환 유지)

### 12) Visibility (정책 원천: features.visibility)
- `chat_policy.features.visibility.*` 전 항목
정리 방향:
- 정책 원천 유지. 중복 경로가 없으면 변경 없음.

### 13) Runtime 거버넌스 (정책 외부)
- `runtime.selfUpdate.enabled` (API: `/api/runtime/governance/config`)
정리 방향:
- 정책(JSON) 항목이 아니므로 `chat_policy`와 분리 유지.
- UI 라벨은 정책 외부임을 명확히 표시한다.

## 비고
- 본 문서는 “항목별 정리 방향”만 정의한다.
- 실제 코드 변경 전에는 `docs/chat_policy_single_source.md`의 실행 정책(확정/기록/범위 제한)을 따른다.
