# /app/admin?tab=chat 설정 전체 항목 (기능 중심)

아래는 **사용자 화면 기준**으로 정리한 전체 목록입니다.
- 최상위는 `런처`, `위젯 헤더`, `위젯 대화`, `위젯 탭바` 4개입니다.
- 표기: `항목명 (type / input / visibility)`
- `visibility`는 `public | user | admin` (3단계) 기준입니다.
- Debug Transcript 내부 항목은 **on/off only**(visibility 없음)입니다.
- 이번에 추가한 항목은 모두 `(추가)` 프리픽스로 표기했습니다.
- `code-only`는 **가시성(visibility)과 무관한 동작 설정**이며, 설정값으로 반영되어야 합니다.

## 대화 설정 관리 구조
- 런처
  widget.is_active (boolean / toggle / no visibility)
    - false면 런처/임베드 모두 완전 숨김
  widget.entry_mode (enum: launcher | embed / select / no visibility)
    - launcher: 런처 클릭 후 위젯 대화 진입
    - embed: 특정 HTML 컨테이너 안에 바로 대화 임베드
  widget.embed_view (enum: chat | setup | both / select / no visibility)
    - embed 시 출력 화면을 제한할 때 사용
  widget.name (string / input text / no visibility)
  widget.agent_id (string / select / no visibility)
  theme.launcher_logo_id (string / input text / no visibility)
  theme.primary_color | launcher_bg (string / input color / no visibility)
  cfg.launcherLabel (string / input text / no visibility)
  cfg.position (enum: bottom-left | bottom-right / select / no visibility)
  launcher.container.bottom (string px / code-only)
  launcher.container.left (string px / code-only)
  launcher.container.right (string px / code-only)
  launcher.container.gap (string px / code-only)
  launcher.container.zIndex (number / code-only)
  launcher.size (number px / code-only)
- 위젯 헤더
  widget.header.enabled (boolean / toggle / visibility)
    widget.header.logo (boolean / toggle / visibility)
    widget.header.status (boolean / toggle / visibility)
    widget.header.agentAction (boolean / toggle / visibility)
    widget.header.newConversation (boolean / toggle / visibility)
    widget.header.close (boolean / toggle / visibility)
  interaction.widgetHeaderAgentAction (boolean / toggle / visibility)
  interaction.widgetHeaderNewConversation (boolean / toggle / visibility)
  interaction.widgetHeaderClose (boolean / toggle / visibility)
- 위젯 대화
  widget.chatPanel (boolean / toggle / visibility)
  widget.historyPanel (boolean / toggle / visibility)
  대화 기본값
    theme.greeting (string / input text / no visibility)
    theme.input_placeholder (string / input text / no visibility)
  위젯 프레임/사이즈
    iframe.width (string px|vw / code-only)
    iframe.height (string px|vh / code-only)
    iframe.bottomOffset (string px / code-only)
    iframe.sideOffset (string px / code-only)
    iframe.borderRadius (string px / code-only)
    iframe.boxShadow (string / code-only)
    iframe.background (string / code-only)
    iframe.layout (enum: fixed | absolute / code-only)
  Admin Panel
    adminPanel.enabled (boolean / toggle / visibility)
    adminPanel.selectionToggle (boolean / toggle / visibility)
    adminPanel.logsToggle (boolean / toggle / visibility)
    adminPanel.messageSelection (boolean / toggle / visibility)
    adminPanel.messageMeta (boolean / toggle / visibility)
    adminPanel.copyConversation (boolean / toggle / visibility)
    adminPanel.copyIssue (boolean / toggle / visibility)
  Debug Transcript
    debug.outputMode (enum: full | summary | used_only / select / no visibility)
    debug.sections.header (boolean / toggle / on/off only)
      header.principle “대원칙” (boolean / toggle / on/off only)
      header.expectedLists “기대 목록” (boolean / toggle / on/off only)
      header.runtimeModules “사용 모듈” (boolean / toggle / on/off only)
      header.auditStatus “점검 상태” (boolean / toggle / on/off only)
    debug.sections.turn (boolean / toggle / on/off only)
      turn.turnId “TURN_ID” (boolean / toggle / on/off only)
      turn.tokenUsed “TOKEN_USED” (boolean / toggle / on/off only)
      turn.tokenUnused “TOKEN_UNUSED” (boolean / toggle / on/off only)
      turn.responseSchemaSummary “RESPONSE_SCHEMA(요약)” (boolean / toggle / on/off only)
      turn.responseSchemaDetail “RESPONSE_SCHEMA(상세)” (boolean / toggle / on/off only)
        response_schema_detail_fields (BooleanMap / tree toggles / on/off only)
          message (boolean / toggle / on/off only)
          ui_hints (boolean / toggle / on/off only)
            ui_hints.view (boolean / toggle / on/off only)
            ui_hints.choice_mode (boolean / toggle / on/off only)
          quick_replies (boolean / toggle / on/off only)
          cards (boolean / toggle / on/off only)
      turn.renderPlanSummary “RENDER_PLAN(요약)” (boolean / toggle / on/off only)
      turn.renderPlanDetail “RENDER_PLAN(상세)” (boolean / toggle / on/off only)
        render_plan_detail_fields (BooleanMap / tree toggles / on/off only)
          view (boolean / toggle / on/off only)
          enable_quick_replies (boolean / toggle / on/off only)
          enable_cards (boolean / toggle / on/off only)
          interaction_scope (boolean / toggle / on/off only)
          selection_mode (boolean / toggle / on/off only)
          min_select (boolean / toggle / on/off only)
          max_select (boolean / toggle / on/off only)
          submit_format (boolean / toggle / on/off only)
          prompt_kind (boolean / toggle / on/off only)
          quick_reply_source (boolean / toggle / on/off only)
            quick_reply_source.type (boolean / toggle / on/off only)
            quick_reply_source.criteria (boolean / toggle / on/off only)
            quick_reply_source.source_function (boolean / toggle / on/off only)
            quick_reply_source.source_module (boolean / toggle / on/off only)
          grid_columns (boolean / toggle / on/off only)
            grid_columns.quick_replies (boolean / toggle / on/off only)
            grid_columns.cards (boolean / toggle / on/off only)
          debug (boolean / toggle / on/off only)
            debug.policy_version (boolean / toggle / on/off only)
            debug.quick_replies_count (boolean / toggle / on/off only)
            debug.cards_count (boolean / toggle / on/off only)
            debug.selection_mode_source (boolean / toggle / on/off only)
            debug.min_select_source (boolean / toggle / on/off only)
            debug.max_select_source (boolean / toggle / on/off only)
            debug.submit_format_source (boolean / toggle / on/off only)
      turn.quickReplyRule “QUICK_REPLY_RULE” (boolean / toggle / on/off only)
    debug.sections.logs (boolean / toggle / on/off only)
      logs.issueSummary “문제 요약” (boolean / toggle / on/off only)
      logs.debug.enabled “DEBUG 로그” (boolean / toggle / on/off only)
      logs.debug.prefixJson “DEBUG prefix_json” (boolean / toggle / on/off only)
      logs.debug.prefixJsonSections (BooleanMap / tree toggles / on/off only)
        request_meta (boolean / toggle / on/off only)
        resolved_agent (boolean / toggle / on/off only)
        kb_resolution (boolean / toggle / on/off only)
        model_resolution (boolean / toggle / on/off only)
        tool_allowlist (boolean / toggle / on/off only)
          resolved_tool_ids (boolean / toggle / on/off only)
          allowed_tool_names (boolean / toggle / on/off only)
          allowed_tool_count (boolean / toggle / on/off only)
          missing_tools_expected_by_intent (boolean / toggle / on/off only)
          requested_tool_count (boolean / toggle / on/off only)
          valid_tool_count (boolean / toggle / on/off only)
          provider_selection_count (boolean / toggle / on/off only)
          provider_selections (boolean / toggle / on/off only)
          tools_by_id_count (boolean / toggle / on/off only)
          tools_by_provider_count (boolean / toggle / on/off only)
          resolved_tool_count (boolean / toggle / on/off only)
          query_error (boolean / toggle / on/off only)
            by_id (boolean / toggle / on/off only)
            by_provider (boolean / toggle / on/off only)
        slot_flow (boolean / toggle / on/off only)
        intent_scope (boolean / toggle / on/off only)
        policy_conflicts (boolean / toggle / on/off only)
        conflict_resolution (boolean / toggle / on/off only)
      logs.mcp.enabled “MCP 로그” (boolean / toggle / on/off only)
        logs.mcp.request (boolean / toggle / on/off only)
        logs.mcp.response (boolean / toggle / on/off only)
        logs.mcp.includeSuccess (boolean / toggle / on/off only)
        logs.mcp.includeError (boolean / toggle / on/off only)
      logs.event.enabled (boolean / toggle / on/off only)
        logs.event.payload (boolean / toggle / on/off only)
        logs.event.allowlist (string[] / input CSV / on/off only)
    debug.auditBotScope (enum: runtime_turns_only | all_bot_messages / select / no visibility)
      - OFF이면 대화 복사 시 해당 디버그 출력이 제외됨
  Interaction
    interaction.quickReplies (boolean / toggle / visibility)
    interaction.productCards (boolean / toggle / visibility)
    interaction.prefill (boolean / toggle / visibility)
    interaction.prefillMessages (string[] / textarea lines / no visibility)
    interaction.inputPlaceholder (string / input text / no visibility)
    interaction.inputSubmit (boolean / toggle / visibility)
    interaction.threePhasePrompt (boolean / toggle / visibility)
      interaction.threePhasePromptShowConfirmed (boolean / toggle / visibility)
      interaction.threePhasePromptShowConfirming (boolean / toggle / visibility)
      interaction.threePhasePromptShowNext (boolean / toggle / visibility)
      interaction.threePhasePromptHideLabels (boolean / toggle / visibility)
      interaction.threePhasePromptLabels.confirmed (string / inline label edit / no visibility)
      interaction.threePhasePromptLabels.confirming (string / inline label edit / no visibility)
      interaction.threePhasePromptLabels.next (string / inline label edit / no visibility)
  MCP
    mcp.providerSelector (boolean / toggle / visibility)
    mcp.actionSelector (boolean / toggle / visibility)
  Runtime
    runtime.selfUpdate.enabled (boolean / toggle / visibility)
- 위젯 탭바
  widget.tabBar.enabled (boolean / toggle / visibility)
    widget.tabBar.chat (boolean / toggle / visibility)
    widget.tabBar.list (boolean / toggle / visibility)
    widget.tabBar.policy (boolean / toggle / visibility)
  widget.setupPanel (boolean / toggle / visibility)
  노출/권한
    widget.allowed_domains (string[] / textarea lines+comma / no visibility)
    widget.allowed_paths (string[] / textarea lines+comma / no visibility)
    theme.allowed_accounts (string[] / textarea lines+comma / no visibility)
  Setup
    setup.modelSelector (boolean / toggle / visibility)
    setup.modeExisting (boolean / toggle / visibility)
      setup.agentSelector (boolean / toggle / visibility)
      setup.sessionIdSearch (boolean / toggle / visibility)
      setup.existingLabels.agentSelector (string / inline label edit / no visibility)
      setup.existingLabels.versionSelector (string / inline label edit / no visibility)
      setup.existingLabels.sessionSelector (string / inline label edit / no visibility)
      setup.existingLabels.sessionIdSearch (string / inline label edit / no visibility)
      setup.existingLabels.conversationMode (string / inline label edit / no visibility)
      setup.existingLabels.modeExisting (string / inline label edit / no visibility)
    setup.modeNew (boolean / toggle / visibility)
      setup.inlineUserKbInput (boolean / toggle / visibility)
      setup.llmSelector (boolean / toggle / visibility)
      setup.kbSelector (boolean / toggle / visibility)
      setup.adminKbSelector (boolean / toggle / visibility)
    setup.routeSelector (boolean / toggle / visibility)
      (중복) setup.mcpProviderSelector (boolean / toggle / visibility -> 실제 mcp.providerSelector)
      (중복) setup.mcpActionSelector (boolean / toggle / visibility -> 실제 mcp.actionSelector)
      setup.labels.inlineUserKbInput (string / inline label edit / no visibility)
      setup.labels.llmSelector (string / inline label edit / no visibility)
      setup.labels.kbSelector (string / inline label edit / no visibility)
      setup.labels.adminKbSelector (string / inline label edit / no visibility)
      setup.labels.routeSelector (string / inline label edit / no visibility)
      (중복) setup.labels.mcpProviderSelector (string / inline label edit / no visibility)
      (중복) setup.labels.mcpActionSelector (string / inline label edit / no visibility)
    setup.defaultSetupMode (enum: existing | new / select / no visibility)
    setup.defaultLlm (enum: chatgpt | gemini / select / no visibility)
    setup.llms (string[] / input CSV gate / no visibility)
    setup.kbIds (string[] / input CSV gate / no visibility)
    setup.adminKbIds (string[] / input CSV gate / no visibility)
    setup.routes (string[] / input CSV gate / no visibility)


## 구현 가이드 (상하위 토글/박스/정렬 고정)

아래 규칙을 그대로 구현합니다. (헤더/페이지 열 동기화 포함)

1) 토글 카드 구조
- 최상위 그룹은 `Card` 또는 `fieldset`로 구분합니다.
- 그룹 내부는 `rounded-lg border border-slate-200 bg-white p-2` 컨테이너를 사용합니다.
- 상위 토글(자식이 있는 항목)은 `GroupToggleField`를 사용하고, `expandable=true`로 설정합니다.
- 하위 토글들은 `detail-block`(좌측 라인) 아래에 배치합니다.

2) 하위 영역 스타일
- 하위 영역은 아래 클래스를 고정으로 사용합니다.
  - `detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3`
- 하위에 또 하위 토글이 있는 경우(토글 내 토글), 동일하게 `detail-block`을 중첩합니다.

3) 헤더 열과 페이지 열 동기화
- 헤더 열(`isHeader`)과 각 페이지 열은 **같은 항목이 같은 높이에 존재**해야 합니다.
- 이를 위해 헤더 열과 페이지 열에서 **동일한 토글 순서**를 렌더링합니다.
- 헤더 열은 `state-controls`(ON/OFF, PUBLIC/USER/ADMIN)를 숨깁니다.
  - 카드 클래스: `"[&_.state-controls]:hidden"`
- 헤더 열의 입력/텍스트 필드는 비활성화합니다.
  - 입력 클래스: `"[&_.config-input]:pointer-events-none [&_.config-input]:opacity-70"`

4) 펼침 상태 동기화
- 상위 토글을 헤더 열에서 클릭하면 **모든 페이지 열의 펼침 상태를 동기화**합니다.
- 방식: `setExpandAll(setXxxOpenByPage, !xxxOpenByPage['/'])`
- 페이지 열에서는 해당 페이지의 상태만 토글합니다.

5) 중첩 토글 렌더 예시 (구조만 참고)
- 상위 토글: `GroupToggleField`
- 하위 토글: `ToggleField`
- 하위 그룹 라벨: `text-[11px] font-semibold text-slate-600`

6) 동일 높이 보장 규칙
- 토글 행 높이는 항상 `h-12` 고정.
- 헤더/페이지 열 모두 동일한 토글 리스트를 렌더링하고, 페이지 열에만 상태 버튼 표시.
- `detail-block`도 동일한 순서로 렌더링하여 정렬 오차를 방지합니다.

7) 입력 필드
- 일반 입력: `config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs`
- textarea: `config-input min-h-[70px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs`

## 권한 체계 기준
- admin: `A_iam_user_access_maps` 테이블에서 `is_admin = true`
- user: `A_iam_user_access_maps` 테이블에 등록된 유저
- public: 그 외 모든 유저/비유저

## 비고
- Debug Transcript는 visibility가 없으며, OFF이면 대화 복사 시 해당 디버그가 출력되지 않습니다.
- `code-only` 항목은 **가시성(visibility)과 무관한 동작 설정**입니다.
  - 페이지별 하드코딩 값은 **비하드코딩으로 전환하고 설정값이 반영**되도록 구현해야 합니다.
  - 위젯 아이콘은 `z_etc_user_logo` 테이블에 등록된 파일의 `id`(`theme.launcher_logo_id`)만 사용합니다.
