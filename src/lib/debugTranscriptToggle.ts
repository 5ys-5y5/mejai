import type { DebugTranscriptOptions } from "@/lib/debugTranscript";

export type DebugFieldTree = {
  key: string;
  label: string;
  description?: string;
  children?: DebugFieldTree[];
};

export type DebugToggleOption = {
  id: string;
  label: string;
  group: string;
  path: string[];
};

export const RESPONSE_SCHEMA_DETAIL_TREE: DebugFieldTree[] = [
  {
    key: "response_schema_detail_fields",
    label: "RESPONSE_SCHEMA_DETAIL fields",
    description: "RESPONSE_SCHEMA_DETAIL 블록에서 포함할 세부 필드를 선택합니다.",
    children: [
      { key: "message", label: "message", description: "응답 메시지 원문 텍스트." },
      {
        key: "ui_hints",
        label: "UI hints",
        description: "클라이언트 UI 힌트(view, choice_mode 등).",
        children: [
          { key: "ui_hints.view", label: "view", description: "응답 UI 유형(text/choice/cards)." },
          { key: "ui_hints.choice_mode", label: "choice mode", description: "선택 모드(single/multi)." },
        ],
      },
      { key: "quick_replies", label: "quick replies", description: "빠른 응답 버튼 목록." },
      { key: "cards", label: "cards", description: "카드형 UI 데이터 목록." },
    ],
  },
];

export const RENDER_PLAN_DETAIL_TREE: DebugFieldTree[] = [
  {
    key: "render_plan_detail_fields",
    label: "RENDER_PLAN_DETAIL fields",
    description: "RENDER_PLAN_DETAIL 블록에서 포함할 세부 필드를 선택합니다.",
    children: [
      { key: "view", label: "view", description: "렌더링 UI 타입(text/choice/cards)." },
      { key: "enable_quick_replies", label: "quick replies", description: "빠른 응답 노출 여부." },
      { key: "enable_cards", label: "cards", description: "카드 UI 노출 여부." },
      { key: "interaction_scope", label: "interaction scope", description: "상호작용 범위(latest_only/any)." },
      { key: "selection_mode", label: "selection mode", description: "선택 모드(single/multi)." },
      { key: "min_select", label: "min select", description: "최소 선택 개수." },
      { key: "max_select", label: "max select", description: "최대 선택 개수." },
      { key: "submit_format", label: "submit format", description: "제출 포맷(single/csv)." },
      { key: "prompt_kind", label: "prompt kind", description: "프롬프트 종류(의도/재입고 등)." },
      {
        key: "quick_reply_source",
        label: "quick reply source",
        description: "quick reply 생성/선택 출처 정보.",
        children: [
          { key: "quick_reply_source.type", label: "type", description: "출처 타입(명시/정책 등)." },
          { key: "quick_reply_source.criteria", label: "criteria", description: "선택 기준 문자열." },
          { key: "quick_reply_source.source_function", label: "source function", description: "생성 함수명." },
          { key: "quick_reply_source.source_module", label: "source module", description: "생성 모듈 경로." },
        ],
      },
      {
        key: "grid_columns",
        label: "grid columns",
        description: "카드/퀵리플라이 그리드 컬럼 수.",
        children: [
          { key: "grid_columns.quick_replies", label: "quick replies", description: "퀵리플라이 컬럼 수." },
          { key: "grid_columns.cards", label: "cards", description: "카드 컬럼 수." },
        ],
      },
      {
        key: "debug",
        label: "debug",
        description: "렌더 플랜 디버그 메타.",
        children: [
          { key: "debug.policy_version", label: "policy version", description: "정책 버전." },
          { key: "debug.quick_replies_count", label: "quick replies count", description: "퀵리플라이 개수." },
          { key: "debug.cards_count", label: "cards count", description: "카드 개수." },
          { key: "debug.selection_mode_source", label: "selection mode source", description: "selection_mode 결정 근거." },
          { key: "debug.min_select_source", label: "min select source", description: "min_select 결정 근거." },
          { key: "debug.max_select_source", label: "max select source", description: "max_select 결정 근거." },
          { key: "debug.submit_format_source", label: "submit format source", description: "submit_format 결정 근거." },
        ],
      },
    ],
  },
];

export const PREFIX_JSON_SECTIONS_TREE: DebugFieldTree[] = [
  {
    key: "prefix_json_sections",
    label: "prefix_json 섹션",
    description: "DEBUG prefix_json 블록에서 포함할 상위 섹션을 선택합니다.",
    children: [
      { key: "requestMeta", label: "request_meta", description: "요청 출처/위젯/도메인 등 메타." },
      { key: "resolvedAgent", label: "resolved_agent", description: "에이전트/도구 해석 결과(mcp_tool_ids 포함)." },
      { key: "kbResolution", label: "kb_resolution", description: "KB 선택/필터/그룹 적용 결과." },
      { key: "modelResolution", label: "model_resolution", description: "모델 선택 근거와 입력 길이." },
      {
        key: "toolAllowlist",
        label: "tool_allowlist",
        description: "도구 허용/차단 및 해석 결과 요약.",
        children: [
          { key: "toolAllowlistResolvedToolIds", label: "resolved_tool_ids", description: "허용된 도구 ID 목록." },
          { key: "toolAllowlistAllowedToolNames", label: "allowed_tool_names", description: "허용된 도구 이름 목록." },
          { key: "toolAllowlistAllowedToolCount", label: "allowed_tool_count", description: "허용된 도구 개수." },
          { key: "toolAllowlistMissingExpectedTools", label: "missing_tools_expected_by_intent", description: "의도 대비 누락된 도구." },
          { key: "toolAllowlistRequestedToolCount", label: "requested_tool_count", description: "요청된 도구 수." },
          { key: "toolAllowlistValidToolCount", label: "valid_tool_count", description: "유효 도구 수." },
          { key: "toolAllowlistProviderSelectionCount", label: "provider_selection_count", description: "선택된 provider 수." },
          { key: "toolAllowlistProviderSelections", label: "provider_selections", description: "선택된 provider 목록." },
          { key: "toolAllowlistToolsByIdCount", label: "tools_by_id_count", description: "ID 기준 도구 개수." },
          { key: "toolAllowlistToolsByProviderCount", label: "tools_by_provider_count", description: "provider 기준 도구 개수." },
          { key: "toolAllowlistResolvedToolCount", label: "resolved_tool_count", description: "최종 해석된 도구 개수." },
          {
            key: "toolAllowlistQueryError",
            label: "query_error",
            description: "도구 조회 오류 요약.",
            children: [
              { key: "toolAllowlistQueryErrorById", label: "by_id", description: "ID 조회 오류." },
              { key: "toolAllowlistQueryErrorByProvider", label: "by_provider", description: "Provider 조회 오류." },
            ],
          },
        ],
      },
      { key: "slotFlow", label: "slot_flow", description: "슬롯 추론/보완 흐름 정보." },
      { key: "intentScope", label: "intent_scope", description: "의도 범위 불일치/사유." },
      { key: "policyConflicts", label: "policy_conflicts", description: "정책 충돌 리스트." },
      { key: "conflictResolution", label: "conflict_resolution", description: "정책 충돌 해소 방식." },
    ],
  },
];

function flattenDebugFieldTreeOptions(
  tree: DebugFieldTree[],
  group: string,
  pathPrefix: string[],
  idPrefix: string,
  parentLabel = ""
): DebugToggleOption[] {
  const items: DebugToggleOption[] = [];
  tree.forEach((node) => {
    const label = parentLabel ? `${parentLabel} / ${node.label}` : node.label;
    items.push({
      id: `${idPrefix}:${node.key}`,
      label,
      group,
      path: [...pathPrefix, node.key],
    });
    if (node.children && node.children.length > 0) {
      items.push(...flattenDebugFieldTreeOptions(node.children, group, pathPrefix, idPrefix, label));
    }
  });
  return items;
}

export const DEBUG_COPY_TOGGLE_DEFS: DebugToggleOption[] = [
  { id: "includePrincipleHeader", label: "Principle Header", group: "Common", path: ["includePrincipleHeader"] },
  { id: "includeResponseSchema", label: "Response Schema", group: "Common", path: ["includeResponseSchema"] },
  { id: "includeRenderPlan", label: "Render Plan", group: "Common", path: ["includeRenderPlan"] },
  { id: "includeQuickReplyRule", label: "Quick Reply Rule", group: "Common", path: ["includeQuickReplyRule"] },
  { id: "includeTurnLogs", label: "Turn Logs", group: "Common", path: ["includeTurnLogs"] },
  { id: "includeTokenUnused", label: "Token Unused", group: "Common", path: ["includeTokenUnused"] },
  { id: "includeTurnId", label: "Turn Id", group: "Common", path: ["includeTurnId"] },
  { id: "sections.header.enabled", label: "Enabled", group: "Header", path: ["sections", "header", "enabled"] },
  { id: "sections.header.principle", label: "Principle", group: "Header", path: ["sections", "header", "principle"] },
  { id: "sections.header.expectedLists", label: "Expected Lists", group: "Header", path: ["sections", "header", "expectedLists"] },
  { id: "sections.header.runtimeModules", label: "Runtime Modules", group: "Header", path: ["sections", "header", "runtimeModules"] },
  { id: "sections.header.auditStatus", label: "Audit Status", group: "Header", path: ["sections", "header", "auditStatus"] },
  { id: "sections.turn.enabled", label: "Enabled", group: "Turn", path: ["sections", "turn", "enabled"] },
  { id: "sections.turn.turnId", label: "Turn Id", group: "Turn", path: ["sections", "turn", "turnId"] },
  { id: "sections.turn.tokenUsed", label: "Token Used", group: "Turn", path: ["sections", "turn", "tokenUsed"] },
  { id: "sections.turn.tokenUnused", label: "Token Unused", group: "Turn", path: ["sections", "turn", "tokenUnused"] },
  { id: "sections.turn.responseSchemaSummary", label: "Response Schema Summary", group: "Turn", path: ["sections", "turn", "responseSchemaSummary"] },
  { id: "sections.turn.responseSchemaDetail", label: "Response Schema Detail", group: "Turn", path: ["sections", "turn", "responseSchemaDetail"] },
  { id: "sections.turn.renderPlanSummary", label: "Render Plan Summary", group: "Turn", path: ["sections", "turn", "renderPlanSummary"] },
  { id: "sections.turn.renderPlanDetail", label: "Render Plan Detail", group: "Turn", path: ["sections", "turn", "renderPlanDetail"] },
  { id: "sections.turn.quickReplyRule", label: "Quick Reply Rule", group: "Turn", path: ["sections", "turn", "quickReplyRule"] },
  { id: "sections.logs.enabled", label: "Enabled", group: "Logs", path: ["sections", "logs", "enabled"] },
  { id: "sections.logs.issueSummary", label: "Issue Summary", group: "Logs", path: ["sections", "logs", "issueSummary"] },
  { id: "sections.logs.debug.enabled", label: "Debug Enabled", group: "Logs > Debug", path: ["sections", "logs", "debug", "enabled"] },
  {
    id: "sections.logs.debug.dedupeGlobalPrefixJson",
    label: "Debug global context once",
    group: "Logs > Debug",
    path: ["sections", "logs", "debug", "dedupeGlobalPrefixJson"],
  },
  { id: "sections.logs.mcp.enabled", label: "MCP Enabled", group: "Logs > MCP", path: ["sections", "logs", "mcp", "enabled"] },
  { id: "sections.logs.mcp.request", label: "MCP Request", group: "Logs > MCP", path: ["sections", "logs", "mcp", "request"] },
  { id: "sections.logs.mcp.response", label: "MCP Response", group: "Logs > MCP", path: ["sections", "logs", "mcp", "response"] },
  { id: "sections.logs.mcp.includeSuccess", label: "MCP Success", group: "Logs > MCP", path: ["sections", "logs", "mcp", "includeSuccess"] },
  { id: "sections.logs.mcp.includeError", label: "MCP Error", group: "Logs > MCP", path: ["sections", "logs", "mcp", "includeError"] },
  { id: "sections.logs.event.enabled", label: "Event Enabled", group: "Logs > Event", path: ["sections", "logs", "event", "enabled"] },
  { id: "sections.logs.event.payload", label: "Event Payload", group: "Logs > Event", path: ["sections", "logs", "event", "payload"] },
  ...flattenDebugFieldTreeOptions(
    RESPONSE_SCHEMA_DETAIL_TREE,
    "Turn > Response Schema Detail Fields",
    ["sections", "turn", "responseSchemaDetailFields"],
    "turn.responseSchemaDetailFields"
  ),
  ...flattenDebugFieldTreeOptions(
    RENDER_PLAN_DETAIL_TREE,
    "Turn > Render Plan Detail Fields",
    ["sections", "turn", "renderPlanDetailFields"],
    "turn.renderPlanDetailFields"
  ),
  ...flattenDebugFieldTreeOptions(
    PREFIX_JSON_SECTIONS_TREE[0]?.children ?? [],
    "Logs > Debug Prefix JSON",
    ["sections", "logs", "debug", "prefixJsonSections"],
    "logs.debug.prefixJsonSections"
  ),
];

export const DEBUG_COPY_TOGGLE_OPTIONS = DEBUG_COPY_TOGGLE_DEFS.map((def) => ({
  id: def.id,
  label: def.label,
  group: def.group,
}));

function readDebugToggleValue(options: DebugTranscriptOptions, path: string[]): boolean {
  let current: unknown = options;
  for (const key of path) {
    if (!current || typeof current !== "object") return true;
    current = (current as Record<string, unknown>)[key];
  }
  return current !== false;
}

function setDebugToggleValue(options: DebugTranscriptOptions, path: string[], value: boolean) {
  let current: Record<string, unknown> = options as Record<string, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    const next = current[key];
    if (!next || typeof next !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}

export function resolveDebugToggleValues(options: DebugTranscriptOptions): string[] {
  return DEBUG_COPY_TOGGLE_DEFS.filter((def) => readDebugToggleValue(options, def.path)).map((def) => def.id);
}

export function applyDebugToggleSelection(options: DebugTranscriptOptions, selected: string[]): DebugTranscriptOptions {
  const selectedSet = new Set(selected);
  const next = structuredClone(options);
  DEBUG_COPY_TOGGLE_DEFS.forEach((def) => {
    setDebugToggleValue(next, def.path, selectedSet.has(def.id));
  });
  return next;
}
