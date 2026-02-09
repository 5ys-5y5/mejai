import { mapRuntimeResponseToTranscriptFields } from "@/lib/runtimeResponseTranscript";

export type KbItem = {
  id: string;
  title: string;
  content?: string | null;
  is_admin?: boolean | string | null;
  is_sample?: boolean | null;
  apply_groups?: Array<{ path: string; values: string[] }> | null;
  apply_groups_mode?: "all" | "any" | null;
  applies_to_user?: boolean | null;
};

export type MpcTool = {
  id: string;
  tool_key?: string;
  provider_key?: string;
  name: string;
  description?: string | null;
  provider?: string;
};

export type McpProvider = {
  key: string;
  title: string;
  description?: string;
  action_count?: number;
  actions?: MpcTool[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  richHtml?: string;
  turnId?: string | null;
  isLoading?: boolean;
  loadingLogs?: string[];
  quickReplies?: Array<{ label: string; value: string }>;
  quickReplyConfig?: {
    selection_mode: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
  productCards?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    value: string;
  }>;
  responseSchema?: {
    message: string | null;
    ui_hints?: {
      view?: "text" | "choice" | "cards";
      choice_mode?: "single" | "multi";
    };
    quick_replies?: Array<{ label: string; value: string }>;
    quick_reply_config?: {
      selection_mode: "single" | "multi";
      min_select?: number;
      max_select?: number;
      submit_format?: "single" | "csv";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    } | null;
    cards?: Array<Record<string, unknown>>;
  };
  responseSchemaIssues?: string[];
  renderPlan?: {
    view: "text" | "choice" | "cards";
    enable_quick_replies: boolean;
    enable_cards: boolean;
    quick_reply_source: {
      type: "explicit" | "config" | "fallback" | "none";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    };
    selection_mode: "single" | "multi";
    min_select: number;
    max_select: number;
    submit_format: "single" | "csv";
    grid_columns: { quick_replies: number; cards: number };
    prompt_kind:
      | "lead_day"
      | "intent_disambiguation"
      | "restock_product_choice"
      | "restock_subscribe_confirm"
      | "restock_subscribe_phone"
      | "restock_post_subscribe"
      | "restock_alternative_confirm"
      | null;
    debug?: {
      policy_version: string;
      quick_replies_count: number;
      cards_count: number;
      selection_mode_source: "config" | "prompt" | "default";
      min_select_source: "config" | "prompt" | "default";
      max_select_source: "config" | "default";
      submit_format_source: "config" | "default";
    };
  };
};

export type AgentItem = {
  id: string;
  parent_id?: string | null;
  name: string;
  llm: "chatgpt" | "gemini" | null;
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
  version?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

export type SessionItem = {
  id: string;
  session_code: string | null;
  started_at: string | null;
  agent_id: string | null;
  caller_masked?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type TurnRow = {
  id: string;
  seq: number | null;
  transcript_text: string | null;
  answer_text: string | null;
  final_answer: string | null;
  turn_id?: string | null;
  quick_replies?: Array<{ label?: string; value?: string }> | null;
  quick_reply_config?: {
    selection_mode?: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  } | null;
  response_schema?: {
    message?: string | null;
    ui_hints?: { view?: "text" | "choice" | "cards"; choice_mode?: "single" | "multi" };
    quick_replies?: Array<{ label?: string; value?: string }>;
    cards?: Array<Record<string, unknown>>;
  } | null;
  response_schema_issues?: string[] | null;
  render_plan?: {
    view?: "text" | "choice" | "cards";
    enable_quick_replies?: boolean;
    enable_cards?: boolean;
    selection_mode?: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    grid_columns?: { quick_replies?: number; cards?: number };
    prompt_kind?:
      | "lead_day"
      | "intent_disambiguation"
      | "restock_product_choice"
      | "restock_subscribe_confirm"
      | "restock_subscribe_phone"
      | "restock_post_subscribe"
      | "restock_alternative_confirm"
      | null;
    quick_reply_source?: {
      type?: "explicit" | "config" | "fallback" | "none";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    };
    debug?: Record<string, unknown>;
  } | null;
};

export type ConversationMode = "history" | "edit" | "new";
export type SetupMode = "existing" | "new";

export type MessageLogBundle = {
  mcp_logs: LabLog["mcp_logs"];
  event_logs: LabLog["event_logs"];
  debug_logs: LabLog["debug_logs"];
  logsError: string | null;
  logsLoading: boolean;
};

export type LabLog = {
  mcp_logs: Array<{
    id?: string | null;
    tool_name: string;
    tool_version?: string | null;
    status: string;
    request_payload: Record<string, unknown> | null;
    response_payload: Record<string, unknown> | null;
    policy_decision?: Record<string, unknown> | null;
    latency_ms: number | null;
    created_at: string | null;
    session_id?: string | null;
    turn_id?: string | null;
  }>;
  event_logs: Array<{
    id?: string | null;
    event_type: string;
    payload: Record<string, unknown> | null;
    created_at: string | null;
    session_id?: string | null;
    turn_id?: string | null;
  }>;
  debug_logs: Array<{
    id?: string | null;
    session_id?: string | null;
    turn_id?: string | null;
    seq?: number | null;
    prefix_json?: Record<string, unknown> | null;
    prefix_tree?: Record<string, unknown> | null;
    created_at: string | null;
  }>;
};

export type ModelConfig = {
  llm: string;
  kbId: string;
  adminKbIds: string[];
  mcpProviderKeys: string[];
  mcpToolIds: string[];
  route: string;
  inlineKb: string;
  inlineKbSampleSelectionOrder: string[];
};

export type ModelState = {
  id: string;
  config: ModelConfig;
  sessionId: string | null;
  messages: ChatMessage[];
  selectedMessageIds: string[];
  messageLogs: Record<string, MessageLogBundle>;
  lastLogAt: string | null;
  layoutExpanded: boolean;
  detailsOpen: {
    llm: boolean;
    kb: boolean;
    adminKb: boolean;
    mcp: boolean;
    route: boolean;
  };
  input: string;
  sending: boolean;
  selectedAgentGroupId: string;
  selectedAgentId: string;
  sessions: SessionItem[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  selectedSessionId: string | null;
  conversationSnapshotText: string | null;
  issueSnapshotText: string | null;
  historyMessages: ChatMessage[];
  conversationMode: ConversationMode;
  editSessionId: string | null;
  setupMode: SetupMode;
  adminLogControlsOpen: boolean;
  showAdminLogs: boolean;
  chatSelectionEnabled: boolean;
};

export const MAX_MODELS = 5;
export const WS_URL = process.env.NEXT_PUBLIC_CALL_WS_URL || "";
export const EXPANDED_PANEL_HEIGHT = 600;

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultModel(): ModelState {
  return {
    id: makeId(),
    config: {
      llm: "chatgpt",
      kbId: "",
      adminKbIds: [],
      mcpProviderKeys: [],
      mcpToolIds: [],
      route: "shipping",
      inlineKb: "",
      inlineKbSampleSelectionOrder: [],
    },
    sessionId: null,
    messages: [],
    selectedMessageIds: [],
    messageLogs: {},
    lastLogAt: null,
    layoutExpanded: false,
    detailsOpen: {
      llm: false,
      kb: false,
      adminKb: false,
      mcp: false,
      route: false,
    },
    input: "",
    sending: false,
    selectedAgentGroupId: "",
    selectedAgentId: "",
    sessions: [],
    sessionsLoading: false,
    sessionsError: null,
    selectedSessionId: null,
    conversationSnapshotText: null,
    issueSnapshotText: null,
    historyMessages: [],
    conversationMode: "new",
    editSessionId: null,
    setupMode: "existing",
    adminLogControlsOpen: false,
    showAdminLogs: false,
    chatSelectionEnabled: false,
  };
}

function parseVersionParts(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  const match = raw.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (!match) return null;
  const major = Number(match[1] || 0);
  const minor = Number(match[2] || 0);
  const patch = Number(match[3] || 0);
  return [major, minor, patch];
}

export function compareAgentVersions(a: AgentItem, b: AgentItem) {
  const aParts = parseVersionParts(a.version);
  const bParts = parseVersionParts(b.version);
  if (aParts && bParts) {
    for (let i = 0; i < 3; i += 1) {
      if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
    }
  } else if (aParts && !bParts) {
    return -1;
  } else if (!aParts && bParts) {
    return 1;
  }
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}

export function makeSnippet(value?: string | null, max = 90) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "내용 없음";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function describeRoute(route: string) {
  if (route === "shipping") {
    return "Core Runtime /api/runtime/chat (배송/주문 실행 엔진).";
  }
  return "Core Runtime /api/runtime/chat (배송/주문 실행 엔진).";
}

export function describeLlm(llm: string) {
  if (llm === "chatgpt") return "OpenAI ChatGPT 모델 계열.";
  if (llm === "gemini") return "Google Gemini 모델 계열.";
  return "모델 정보 없음.";
}

export function buildHistoryMessages(turns: TurnRow[]) {
  const acc: ChatMessage[] = [];
  turns.forEach((turn) => {
    if (turn.transcript_text) {
      acc.push({ id: `${turn.id}-user`, role: "user", content: turn.transcript_text, turnId: turn.id });
    }
    const answer = turn.final_answer || turn.answer_text;
    if (answer) {
      const mapped = mapRuntimeResponseToTranscriptFields({
        turn_id: turn.id,
        quick_replies: turn.quick_replies || undefined,
        quick_reply_config: turn.quick_reply_config || undefined,
        response_schema: turn.response_schema || undefined,
        response_schema_issues: turn.response_schema_issues || undefined,
        render_plan: turn.render_plan || undefined,
      });
      const fallbackResponseSchema: ChatMessage["responseSchema"] = {
        message: answer,
        ui_hints: { view: "text", choice_mode: "single" },
        quick_replies: [],
        cards: [],
      };
      const fallbackRenderPlan: ChatMessage["renderPlan"] = {
        view: "text",
        enable_quick_replies: false,
        enable_cards: false,
        quick_reply_source: { type: "none" },
        selection_mode: "single",
        min_select: 1,
        max_select: 1,
        submit_format: "single",
        grid_columns: { quick_replies: 1, cards: 1 },
        prompt_kind: null,
      };
      const normalizedRenderPlan: ChatMessage["renderPlan"] = mapped.renderPlan
        ? {
            view: mapped.renderPlan.view,
            enable_quick_replies: Boolean(mapped.renderPlan.enable_quick_replies),
            enable_cards: Boolean(mapped.renderPlan.enable_cards),
            quick_reply_source: {
              type:
                mapped.renderPlan.quick_reply_source?.type === "explicit" ||
                mapped.renderPlan.quick_reply_source?.type === "config" ||
                mapped.renderPlan.quick_reply_source?.type === "fallback"
                  ? mapped.renderPlan.quick_reply_source.type
                  : "none",
              criteria: mapped.renderPlan.quick_reply_source?.criteria,
              source_function: mapped.renderPlan.quick_reply_source?.source_function,
              source_module: mapped.renderPlan.quick_reply_source?.source_module,
            },
            selection_mode: mapped.renderPlan.selection_mode === "multi" ? "multi" : "single",
            min_select: Number.isFinite(Number(mapped.renderPlan.min_select)) ? Number(mapped.renderPlan.min_select) : 1,
            max_select: Number.isFinite(Number(mapped.renderPlan.max_select)) ? Number(mapped.renderPlan.max_select) : 1,
            submit_format: mapped.renderPlan.submit_format === "csv" ? "csv" : "single",
            grid_columns: {
              quick_replies: Number.isFinite(Number(mapped.renderPlan.grid_columns?.quick_replies))
                ? Number(mapped.renderPlan.grid_columns?.quick_replies)
                : 1,
              cards: Number.isFinite(Number(mapped.renderPlan.grid_columns?.cards))
                ? Number(mapped.renderPlan.grid_columns?.cards)
                : 1,
            },
            prompt_kind: mapped.renderPlan.prompt_kind || null,
          }
        : fallbackRenderPlan;
      acc.push({
        id: `${turn.id}-bot`,
        role: "bot",
        content: answer,
        turnId: turn.id,
        responseSchema: mapped.responseSchema || fallbackResponseSchema,
        responseSchemaIssues: mapped.responseSchemaIssues,
        quickReplyConfig: mapped.quickReplyConfig,
        renderPlan: normalizedRenderPlan,
      });
    }
  });
  return acc;
}
