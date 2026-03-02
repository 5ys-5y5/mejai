import type { DebugTranscriptOptions } from "@/lib/debugTranscript";

export type ConversationPageKey = string;

export const WIDGET_PAGE_KEY: ConversationPageKey = "/embed";
export type SetupFieldKey =
  | "inlineUserKbInput"
  | "llmSelector"
  | "kbSelector"
  | "adminKbSelector"
  | "routeSelector"
  | "mcpProviderSelector"
  | "mcpActionSelector";

export type ExistingSetupFieldKey =
  | "agentSelector"
  | "versionSelector"
  | "sessionSelector"
  | "sessionIdSearch"
  | "conversationMode";
export type ExistingSetupLabelKey = ExistingSetupFieldKey | "modeExisting" | "modeNew";

export type ConversationSetupUi = {
  order: SetupFieldKey[];
  labels: Record<SetupFieldKey, string>;
  existingOrder: ExistingSetupFieldKey[];
  existingLabels: Record<ExistingSetupLabelKey, string>;
};

/**
 * ì¤ì ëí ê¸°ë¥ ì ì± íì¼
 *
 * ì´ì ê·ì¹:
 * - íì´ì§ë³ ê¸°ë¥ ì°¨ë±ì ì´ íì¼ììë§ ì¡°ì íë¤.
 * - íì´ì§ ì»´í¬ëí¸ìì íëì½ë© ë¶ê¸°(ì: provider.key !== "cafe24")ë¥¼ ë§ë¤ì§ ìëë¤.
 * - UI ë¸ì¶/ëì ê°ë¥ ì¬ë¶/ìì²­ payload í¬í¨ ì¬ë¶ë¥¼ ê°ì ì ì±ì¼ë¡ ë§ì¶ë¤.
 *
 * ì ì© ë²ì:
 * - "/" (ëë© ì²´í)
 * - "/app/conversation" (ëí)
 * - "/embed" (ìì ¯)
 */
type IdGate = {
  /** íì© ëª©ë¡. ë¹ì´ìì¼ë©´ ì ì²´ íì© */
  allowlist?: string[];
  /** ì°¨ë¨ ëª©ë¡. allowlistë³´ë¤ ì°ì  ì°¨ë¨ */
  denylist?: string[];
};

export type FeatureVisibilityMode = "user" | "admin";

type VisibilityFields<T extends Record<string, unknown>> = {
  [K in keyof T as T[K] extends boolean ? K : never]: FeatureVisibilityMode;
};

type ConversationFeatureVisibility = {
  mcp: VisibilityFields<ConversationPageFeatures["mcp"]>;
  adminPanel: VisibilityFields<ConversationPageFeatures["adminPanel"]>;
  interaction: VisibilityFields<ConversationPageFeatures["interaction"]>;
  setup: VisibilityFields<ConversationPageFeatures["setup"]>;
  widget: {
    launcher: FeatureVisibilityMode;
    header: VisibilityFields<ConversationPageFeatures["widget"]["header"]>;
    tabBar: VisibilityFields<ConversationPageFeatures["widget"]["tabBar"]>;
    chatPanel: FeatureVisibilityMode;
    historyPanel: FeatureVisibilityMode;
    setupPanel: FeatureVisibilityMode;
  };
};

export type ConversationPageFeatures = {
  mcp: {
    /** MCP provider ì í UI ë¸ì¶ ì¬ë¶ */
    providerSelector: boolean;
    /** MCP action ì í UI ë¸ì¶ ì¬ë¶ */
    actionSelector: boolean;
    /** provider key ë¨ì íì©/ì°¨ë¨ */
    providers: IdGate;
    /** tool id ë¨ì íì©/ì°¨ë¨ */
    tools: IdGate;
  };
  adminPanel: {
    /** ê´ë¦¬ì ë©ë´ ìì²´ ë¸ì¶ ì¬ë¶ */
    enabled: boolean;
    /** "ì í ON/OFF" í ê¸ ë²í¼ ë¸ì¶ ë° ëì */
    selectionToggle: boolean;
    /** "ë¡ê·¸ ON/OFF" í ê¸ ë²í¼ ë¸ì¶ ë° ëì */
    logsToggle: boolean;
    /** ë©ìì§ ì í ëì íì© ì¬ë¶ */
    messageSelection: boolean;
    /** ë©ìì§ ë©í(role/id/session) ë¸ì¶ ì¬ë¶ */
    messageMeta: boolean;
    /** "ëí ë³µì¬" ë²í¼ ë¸ì¶/ëì */
    copyConversation: boolean;
    /** "ë¬¸ì  ë¡ê·¸ ë³µì¬" ë²í¼ ë¸ì¶/ëì */
    copyIssue: boolean;
  };
  interaction: {
    /** quick reply ì í UI íì±í */
    quickReplies: boolean;
    /** product card ì í UI íì±í */
    productCards: boolean;
    /** 3-phase prompt (confirmed/confirming/next) */
    threePhasePrompt: boolean;
    threePhasePromptLabels: {
      confirmed: string;
      confirming: string;
      next: string;
    };
    threePhasePromptShowConfirmed: boolean;
    threePhasePromptShowConfirming: boolean;
    threePhasePromptShowNext: boolean;
    threePhasePromptHideLabels: boolean;
    /** ìë ¥ì°½/ì ì¡ ë²í¼ íì±í */
    inputSubmit: boolean;
    /** Widget header: agent connect button */
  };
  setup: {
    /** ëª¨ë¸(ê¸°ì¡´/ì ê·) ì í UI ë¸ì¶ */
    modelSelector: boolean;
    /** existing ëª¨ë íì ìì´ì í¸ ì í UI ë¸ì¶ */
    agentSelector: boolean;
    /** LLM ì í UI ë¸ì¶ */
    llmSelector: boolean;
    /** LLM ì í UI íì í­ëª© íì©/ì°¨ë¨ (llm id) */
    llms: IdGate;
    /** KB ì í UI ë¸ì¶ */
    kbSelector: boolean;
    /** KB ì í UI íì í­ëª© íì©/ì°¨ë¨ (KB id) */
    kbIds: IdGate;
    /** ê´ë¦¬ì KB ì í UI ë¸ì¶ */
    adminKbSelector: boolean;
    /** ê´ë¦¬ì KB ì í UI íì í­ëª© íì©/ì°¨ë¨ (KB id) */
    adminKbIds: IdGate;
    /** existing ëª¨ë ë²í¼/ëì íì© */
    modeExisting: boolean;
    /** existing ëª¨ëìì ì¸ì ID ì§ì  ê²ì UI ë¸ì¶ */
    sessionIdSearch: boolean;
    /** new ëª¨ë ë²í¼/ëì íì© */
    modeNew: boolean;
    /** runtime(route) ì í UI ë¸ì¶ */
    routeSelector: boolean;
    /** runtime(route) ì í UI íì í­ëª© íì©/ì°¨ë¨ (route id) */
    routes: IdGate;
    /** ì¸ë¼ì¸ ì¬ì©ì KB ìë ¥ textarea ë¸ì¶ */
    inlineUserKbInput: boolean;
    /** ê¸°ë³¸ ëª¨ë */
    defaultSetupMode: "existing" | "new";
    /** ê¸°ë³¸ LLM */
    defaultLlm: "chatgpt" | "gemini";
  };
  widget: {
    header: {
      enabled: boolean;
      logo: boolean;
      status: boolean;
      agentAction: boolean;
      newConversation: boolean;
      close: boolean;
    };
    chatPanel: boolean;
    historyPanel: boolean;
    tabBar: {
      enabled: boolean;
      chat: boolean;
      list: boolean;
      policy: boolean;
    };
    setupPanel: boolean;
  };
  /** on/off ê¸°ë¥ì user/admin ê°ìì± ì ì´ */
  visibility: ConversationFeatureVisibility;
};

export type ConversationDataLoadPlan = {
  loadMcp: boolean;
  loadInlineKbSamples: boolean;
  loadKb: boolean;
  loadAgents: boolean;
};

export function deriveConversationDataLoadPlan(features: ConversationPageFeatures): ConversationDataLoadPlan {
  return {
    loadMcp: features.mcp.providerSelector || features.mcp.actionSelector,
    loadInlineKbSamples: features.setup.inlineUserKbInput,
    loadKb:
      features.setup.kbSelector ||
      features.setup.adminKbSelector ||
      features.setup.modeExisting ||
      features.setup.modelSelector,
    loadAgents:
      features.setup.modelSelector ||
      features.setup.agentSelector ||
      features.setup.modeExisting ||
      features.setup.sessionIdSearch,
  };
}

export type ConversationPageFeaturesOverride = Partial<ConversationPageFeatures>;

export type WidgetEntryMode = "launcher" | "embed";
export type WidgetEmbedView = "chat" | "setup" | "list" | "both";

export type WidgetLauncherConfig = {
  label?: string;
  position?: "bottom-right" | "bottom-left";
  container?: {
    bottom?: string;
    left?: string;
    right?: string;
    gap?: string;
    zIndex?: number;
  };
  size?: number;
};

export type WidgetIframeConfig = {
  width?: string;
  height?: string;
  bottomOffset?: string;
  sideOffset?: string;
  borderRadius?: string;
  boxShadow?: string;
  background?: string;
  layout?: "fixed" | "absolute" | "static";
};

export type WidgetThemeConfig = {
  greeting?: string;
  input_placeholder?: string;
  launcher_logo_id?: string;
  primary_color?: string;
  launcher_bg?: string;
  allowed_accounts?: string[];
};

export type WidgetChatPolicyConfig = {
  is_active?: boolean;
  entry_mode?: WidgetEntryMode;
  embed_view?: WidgetEmbedView;
  name?: string;
  agent_id?: string;
  launcherLabel?: string;
  cfg?: {
    launcherLabel?: string;
    position?: WidgetLauncherConfig["position"];
  };
  allowed_domains?: string[];
  allowed_paths?: string[];
  // legacy: moved to theme.allowed_accounts
  allowed_accounts?: string[];
  launcher?: WidgetLauncherConfig;
  iframe?: WidgetIframeConfig;
  theme?: WidgetThemeConfig;
};

export type ConversationFeaturesProviderShape = {
  // widget-centric storage
  features?: ConversationPageFeaturesOverride;
  debug?: Partial<DebugTranscriptOptions>;
  setup_ui?: {
    order?: SetupFieldKey[];
    labels?: Partial<Record<SetupFieldKey, string>>;
    existing_order?: ExistingSetupFieldKey[];
    existing_labels?: Partial<Record<ExistingSetupLabelKey, string>>;
  };
  widget?: WidgetChatPolicyConfig;
  // legacy (page-centric) fields kept for backward compatibility
  pages?: Partial<Record<ConversationPageKey, ConversationPageFeaturesOverride>>;
  debug_copy?: Partial<Record<ConversationPageKey, Partial<DebugTranscriptOptions>>>;
  page_registry?: ConversationPageKey[];
  settings_ui?: {
    setup_fields?: Partial<
      Record<
        ConversationPageKey,
        {
          order?: SetupFieldKey[];
          labels?: Partial<Record<SetupFieldKey, string>>;
          existing_order?: ExistingSetupFieldKey[];
          existing_labels?: Partial<Record<ExistingSetupLabelKey, string>>;
        }
      >
    >;
  };
};

const DEFAULT_SETUP_UI: ConversationSetupUi = {
  order: [
    "inlineUserKbInput",
    "llmSelector",
    "kbSelector",
    "adminKbSelector",
    "routeSelector",
    "mcpProviderSelector",
    "mcpActionSelector",
  ],
  labels: {
    inlineUserKbInput: "사용자 KB입력란",
    llmSelector: "LLM 선택",
    kbSelector: "KB 선택",
    adminKbSelector: "관리자 KB 선택",
    routeSelector: "Runtime 선택",
    mcpProviderSelector: "MCP 프로바이더 선택",
    mcpActionSelector: "MCP 액션 선택",
  },
  existingOrder: ["agentSelector", "versionSelector", "conversationMode", "sessionSelector", "sessionIdSearch"],
  existingLabels: {
    modeExisting: "기존 모드",
    modeNew: "신규 모드",
    agentSelector: "에이전트 선택",
    versionSelector: "버전 선택",
    sessionSelector: "세션 선택",
    sessionIdSearch: "세션 ID 직접 조회",
    conversationMode: "모드 선택",
  },
};

const DEFAULT_THREE_PHASE_LABELS = {
  confirmed: "확인된 결과",
  confirming: "확인중 결과",
  next: "그 다음으로 확인된 결과",
} as const;

function normalizeSetupOrder(order?: SetupFieldKey[]) {
  const seen = new Set<SetupFieldKey>();
  const normalized: SetupFieldKey[] = [];
  (order || []).forEach((key) => {
    if (seen.has(key)) return;
    if (!DEFAULT_SETUP_UI.order.includes(key)) return;
    seen.add(key);
    normalized.push(key);
  });
  DEFAULT_SETUP_UI.order.forEach((key) => {
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(key);
  });
  return normalized;
}

function normalizeExistingSetupOrder(order?: ExistingSetupFieldKey[]) {
  const seen = new Set<ExistingSetupFieldKey>();
  const normalized: ExistingSetupFieldKey[] = [];
  (order || []).forEach((key) => {
    if (seen.has(key)) return;
    if (!DEFAULT_SETUP_UI.existingOrder.includes(key)) return;
    seen.add(key);
    normalized.push(key);
  });
  DEFAULT_SETUP_UI.existingOrder.forEach((key) => {
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(key);
  });
  return normalized;
}

const MOJIBAKE_RE = /[ÃÂÀÁÐÑìëíðñ]/;

function isMojibakeLabel(value: string) {
  if (!value) return false;
  if (/[\uAC00-\uD7A3]/.test(value)) return false;
  return MOJIBAKE_RE.test(value);
}

function normalizeLabelValue(value: unknown, fallback: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || isMojibakeLabel(trimmed)) return fallback;
  return trimmed;
}

function normalizeLabelMap<T extends Record<string, string>>(
  override: Partial<Record<keyof T, string>> | undefined,
  defaults: T
): T {
  const next: T = { ...defaults };
  if (!override) return next;
  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    const raw = override[key];
    if (typeof raw !== "string") return;
    next[key] = normalizeLabelValue(raw, defaults[key]);
  });
  return next;
}

export function resolveConversationSetupUi(
  page: ConversationPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): ConversationSetupUi {
  const resolvedPage = resolveRegisteredPageKey(page, providerValue);
  const override =
    providerValue?.setup_ui ??
    providerValue?.settings_ui?.setup_fields?.[resolvedPage];
  return {
    order: normalizeSetupOrder(override?.order),
    labels: normalizeLabelMap(override?.labels, DEFAULT_SETUP_UI.labels),
    existingOrder: normalizeExistingSetupOrder(override?.existing_order),
    existingLabels: normalizeLabelMap(override?.existing_labels, DEFAULT_SETUP_UI.existingLabels),
  };
}

function inAllowlist(id: string, allowlist?: string[]) {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.includes(id);
}

function inDenylist(id: string, denylist?: string[]) {
  if (!denylist || denylist.length === 0) return false;
  return denylist.includes(id);
}

export function isEnabledByGate(id: string, gate: IdGate) {
  const key = String(id || "").trim();
  if (!key) return false;
  return inAllowlist(key, gate.allowlist) && !inDenylist(key, gate.denylist);
}

function mergeIdGate(base: IdGate, override?: IdGate): IdGate {
  if (!override) return base;
  return {
    allowlist: Array.isArray(override.allowlist) ? [...override.allowlist] : base.allowlist,
    denylist: Array.isArray(override.denylist) ? [...override.denylist] : base.denylist,
  };
}

function normalizeThreePhaseLabels(
  override?: Partial<{ confirmed: string; confirming: string; next: string }>,
  fallback?: { confirmed: string; confirming: string; next: string }
) {
  return {
    confirmed: normalizeLabelValue(
      override?.confirmed || fallback?.confirmed,
      DEFAULT_THREE_PHASE_LABELS.confirmed
    ),
    confirming: normalizeLabelValue(
      override?.confirming || fallback?.confirming,
      DEFAULT_THREE_PHASE_LABELS.confirming
    ),
    next: normalizeLabelValue(
      override?.next || fallback?.next,
      DEFAULT_THREE_PHASE_LABELS.next
    ),
  };
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : [];
}

export function normalizeWidgetChatPolicyConfig(
  input?: WidgetChatPolicyConfig | null
): WidgetChatPolicyConfig {
  if (!input) return {};
  const legacyAllowedAccounts = normalizeStringArray(input.allowed_accounts);
  const themeAllowedAccounts = normalizeStringArray(input.theme?.allowed_accounts);
  const theme = {
    ...(input.theme || {}),
    ...(themeAllowedAccounts !== undefined ? { allowed_accounts: themeAllowedAccounts } : {}),
  };
  if (themeAllowedAccounts === undefined && legacyAllowedAccounts !== undefined) {
    theme.allowed_accounts = legacyAllowedAccounts;
  }
  const { allowed_accounts: _legacy, ...rest } = input;
  return {
    ...rest,
    theme,
  };
}

export function normalizeConversationFeatureProvider(
  input?: ConversationFeaturesProviderShape | null
): ConversationFeaturesProviderShape | null {
  if (!input) return null;
  const pages = input.pages || undefined;
  const debugCopy = input.debug_copy || undefined;
  const settingsUi = input.settings_ui || undefined;
  const legacyPage = pages?.[WIDGET_PAGE_KEY] || pages?.["/embed"];
  const legacyDebug = debugCopy?.[WIDGET_PAGE_KEY] || debugCopy?.["/embed"];
  const legacySetup = settingsUi?.setup_fields?.[WIDGET_PAGE_KEY] || settingsUi?.setup_fields?.["/embed"];
  const features = input.features || legacyPage || undefined;
  const debug = input.debug || legacyDebug || undefined;
  const setupUi = input.setup_ui || legacySetup || undefined;
  const legacyWidget =
    (legacyPage && typeof legacyPage === "object" ? (legacyPage as { widget?: WidgetChatPolicyConfig }).widget : undefined) ||
    undefined;
  const widgetSource = input.widget || legacyWidget;
  const widget = widgetSource ? normalizeWidgetChatPolicyConfig(widgetSource) : undefined;
  const normalized: ConversationFeaturesProviderShape = {};
  if (features && Object.keys(features).length > 0) normalized.features = features;
  if (debug && Object.keys(debug).length > 0) normalized.debug = debug;
  if (setupUi && Object.keys(setupUi).length > 0) {
    normalized.setup_ui = setupUi;
  }
  if (widget && Object.keys(widget).length > 0) normalized.widget = widget;
  return normalized;
}

export function mergeConversationPageFeatures(
  base: ConversationPageFeatures,
  override?: ConversationPageFeaturesOverride
): ConversationPageFeatures {
  if (!override) return base;
  return {
    mcp: {
      providerSelector: override.mcp?.providerSelector ?? base.mcp.providerSelector,
      actionSelector: override.mcp?.actionSelector ?? base.mcp.actionSelector,
      providers: mergeIdGate(base.mcp.providers, override.mcp?.providers),
      tools: mergeIdGate(base.mcp.tools, override.mcp?.tools),
    },
    adminPanel: {
      enabled: override.adminPanel?.enabled ?? base.adminPanel.enabled,
      selectionToggle: override.adminPanel?.selectionToggle ?? base.adminPanel.selectionToggle,
      logsToggle: override.adminPanel?.logsToggle ?? base.adminPanel.logsToggle,
      messageSelection: override.adminPanel?.messageSelection ?? base.adminPanel.messageSelection,
      messageMeta: override.adminPanel?.messageMeta ?? base.adminPanel.messageMeta,
      copyConversation: override.adminPanel?.copyConversation ?? base.adminPanel.copyConversation,
      copyIssue: override.adminPanel?.copyIssue ?? base.adminPanel.copyIssue,
    },
    interaction: {
      quickReplies: override.interaction?.quickReplies ?? base.interaction.quickReplies,
      productCards: override.interaction?.productCards ?? base.interaction.productCards,
      threePhasePrompt: override.interaction?.threePhasePrompt ?? base.interaction.threePhasePrompt,
      threePhasePromptLabels: normalizeThreePhaseLabels(
        override.interaction?.threePhasePromptLabels,
        base.interaction.threePhasePromptLabels
      ),
      threePhasePromptShowConfirmed: override.interaction?.threePhasePromptShowConfirmed ?? base.interaction.threePhasePromptShowConfirmed,
      threePhasePromptShowConfirming: override.interaction?.threePhasePromptShowConfirming ?? base.interaction.threePhasePromptShowConfirming,
      threePhasePromptShowNext: override.interaction?.threePhasePromptShowNext ?? base.interaction.threePhasePromptShowNext,
      threePhasePromptHideLabels: override.interaction?.threePhasePromptHideLabels ?? base.interaction.threePhasePromptHideLabels,
      inputSubmit: override.interaction?.inputSubmit ?? base.interaction.inputSubmit,
    },
    setup: {
      modelSelector: override.setup?.modelSelector ?? base.setup.modelSelector,
      agentSelector: override.setup?.agentSelector ?? base.setup.agentSelector,
      llmSelector: override.setup?.llmSelector ?? base.setup.llmSelector,
      llms: mergeIdGate(base.setup.llms, override.setup?.llms),
      kbSelector: override.setup?.kbSelector ?? base.setup.kbSelector,
      kbIds: mergeIdGate(base.setup.kbIds, override.setup?.kbIds),
      adminKbSelector: override.setup?.adminKbSelector ?? base.setup.adminKbSelector,
      adminKbIds: mergeIdGate(base.setup.adminKbIds, override.setup?.adminKbIds),
      modeExisting: override.setup?.modeExisting ?? base.setup.modeExisting,
      sessionIdSearch: override.setup?.sessionIdSearch ?? base.setup.sessionIdSearch,
      modeNew: override.setup?.modeNew ?? base.setup.modeNew,
      routeSelector: override.setup?.routeSelector ?? base.setup.routeSelector,
      routes: mergeIdGate(base.setup.routes, override.setup?.routes),
      inlineUserKbInput: override.setup?.inlineUserKbInput ?? base.setup.inlineUserKbInput,
      defaultSetupMode: override.setup?.defaultSetupMode ?? base.setup.defaultSetupMode,
      defaultLlm: override.setup?.defaultLlm ?? base.setup.defaultLlm,
    },
    widget: {
      header: {
        enabled: override.widget?.header?.enabled ?? base.widget.header.enabled,
        logo: override.widget?.header?.logo ?? base.widget.header.logo,
        status: override.widget?.header?.status ?? base.widget.header.status,
        agentAction: override.widget?.header?.agentAction ?? base.widget.header.agentAction,
        newConversation: override.widget?.header?.newConversation ?? base.widget.header.newConversation,
        close: override.widget?.header?.close ?? base.widget.header.close,
      },
      chatPanel: override.widget?.chatPanel ?? base.widget.chatPanel,
      historyPanel: override.widget?.historyPanel ?? base.widget.historyPanel,
      tabBar: {
        enabled: override.widget?.tabBar?.enabled ?? base.widget.tabBar.enabled,
        chat: override.widget?.tabBar?.chat ?? base.widget.tabBar.chat,
        list: override.widget?.tabBar?.list ?? base.widget.tabBar.list,
        policy: override.widget?.tabBar?.policy ?? base.widget.tabBar.policy,
      },
      setupPanel: override.widget?.setupPanel ?? base.widget.setupPanel,
    },
    visibility: {
      mcp: {
        providerSelector: override.visibility?.mcp?.providerSelector ?? base.visibility.mcp.providerSelector,
        actionSelector: override.visibility?.mcp?.actionSelector ?? base.visibility.mcp.actionSelector,
      },
      adminPanel: {
        enabled: override.visibility?.adminPanel?.enabled ?? base.visibility.adminPanel.enabled,
        selectionToggle: override.visibility?.adminPanel?.selectionToggle ?? base.visibility.adminPanel.selectionToggle,
        logsToggle: override.visibility?.adminPanel?.logsToggle ?? base.visibility.adminPanel.logsToggle,
        messageSelection: override.visibility?.adminPanel?.messageSelection ?? base.visibility.adminPanel.messageSelection,
        messageMeta: override.visibility?.adminPanel?.messageMeta ?? base.visibility.adminPanel.messageMeta,
        copyConversation:
          override.visibility?.adminPanel?.copyConversation ?? base.visibility.adminPanel.copyConversation,
        copyIssue: override.visibility?.adminPanel?.copyIssue ?? base.visibility.adminPanel.copyIssue,
      },
      interaction: {
        quickReplies: override.visibility?.interaction?.quickReplies ?? base.visibility.interaction.quickReplies,
        productCards: override.visibility?.interaction?.productCards ?? base.visibility.interaction.productCards,
        threePhasePrompt: override.visibility?.interaction?.threePhasePrompt ?? base.visibility.interaction.threePhasePrompt,
        threePhasePromptShowConfirmed:
          override.visibility?.interaction?.threePhasePromptShowConfirmed ?? base.visibility.interaction.threePhasePromptShowConfirmed,
        threePhasePromptShowConfirming:
          override.visibility?.interaction?.threePhasePromptShowConfirming ?? base.visibility.interaction.threePhasePromptShowConfirming,
        threePhasePromptShowNext:
          override.visibility?.interaction?.threePhasePromptShowNext ?? base.visibility.interaction.threePhasePromptShowNext,
        threePhasePromptHideLabels:
          override.visibility?.interaction?.threePhasePromptHideLabels ?? base.visibility.interaction.threePhasePromptHideLabels,
        inputSubmit: override.visibility?.interaction?.inputSubmit ?? base.visibility.interaction.inputSubmit,
      },
      setup: {
        modelSelector: override.visibility?.setup?.modelSelector ?? base.visibility.setup.modelSelector,
        agentSelector: override.visibility?.setup?.agentSelector ?? base.visibility.setup.agentSelector,
        llmSelector: override.visibility?.setup?.llmSelector ?? base.visibility.setup.llmSelector,
        kbSelector: override.visibility?.setup?.kbSelector ?? base.visibility.setup.kbSelector,
        adminKbSelector: override.visibility?.setup?.adminKbSelector ?? base.visibility.setup.adminKbSelector,
        modeExisting: override.visibility?.setup?.modeExisting ?? base.visibility.setup.modeExisting,
        sessionIdSearch: override.visibility?.setup?.sessionIdSearch ?? base.visibility.setup.sessionIdSearch,
        modeNew: override.visibility?.setup?.modeNew ?? base.visibility.setup.modeNew,
        routeSelector: override.visibility?.setup?.routeSelector ?? base.visibility.setup.routeSelector,
        inlineUserKbInput:
          override.visibility?.setup?.inlineUserKbInput ?? base.visibility.setup.inlineUserKbInput,
      },
      widget: {
        launcher: override.visibility?.widget?.launcher ?? base.visibility.widget.launcher,
        header: {
          enabled: override.visibility?.widget?.header?.enabled ?? base.visibility.widget.header.enabled,
          logo: override.visibility?.widget?.header?.logo ?? base.visibility.widget.header.logo,
          status: override.visibility?.widget?.header?.status ?? base.visibility.widget.header.status,
          agentAction: override.visibility?.widget?.header?.agentAction ?? base.visibility.widget.header.agentAction,
          newConversation:
            override.visibility?.widget?.header?.newConversation ?? base.visibility.widget.header.newConversation,
          close: override.visibility?.widget?.header?.close ?? base.visibility.widget.header.close,
        },
        tabBar: {
          enabled: override.visibility?.widget?.tabBar?.enabled ?? base.visibility.widget.tabBar.enabled,
          chat: override.visibility?.widget?.tabBar?.chat ?? base.visibility.widget.tabBar.chat,
          list: override.visibility?.widget?.tabBar?.list ?? base.visibility.widget.tabBar.list,
          policy: override.visibility?.widget?.tabBar?.policy ?? base.visibility.widget.tabBar.policy,
        },
        chatPanel: override.visibility?.widget?.chatPanel ?? base.visibility.widget.chatPanel,
        historyPanel: override.visibility?.widget?.historyPanel ?? base.visibility.widget.historyPanel,
        setupPanel: override.visibility?.widget?.setupPanel ?? base.visibility.widget.setupPanel,
      },
    },
  };
}

export function resolveConversationPageFeatures(
  page: ConversationPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): ConversationPageFeatures {
  const resolvedPage = resolveRegisteredPageKey(page, providerValue);
  const base = getDefaultConversationPageFeatures(resolvedPage);
  const override = providerValue?.features ?? providerValue?.pages?.[resolvedPage];
  let merged = mergeConversationPageFeatures(base, override);
  return merged;
}

export function isProviderEnabledForPage(page: ConversationPageKey, providerKey: string) {
  return isEnabledByGate(providerKey, getDefaultConversationPageFeatures(page).mcp.providers);
}

export function isToolEnabledForPage(page: ConversationPageKey, toolId: string) {
  return isEnabledByGate(toolId, getDefaultConversationPageFeatures(page).mcp.tools);
}

export function isProviderEnabled(providerKey: string, features: ConversationPageFeatures) {
  return isEnabledByGate(providerKey, features.mcp.providers);
}

export function isToolEnabled(toolId: string, features: ConversationPageFeatures) {
  return isEnabledByGate(toolId, features.mcp.tools);
}

function withVisibilityFlag(enabled: boolean, visibility: FeatureVisibilityMode, isAdminUser: boolean) {
  if (!enabled) return false;
  if (visibility === "admin" && !isAdminUser) return false;
  return true;
}

export function applyConversationFeatureVisibility(
  features: ConversationPageFeatures,
  isAdminUser: boolean
): ConversationPageFeatures {
  return {
    ...features,
    mcp: {
      ...features.mcp,
      providerSelector: withVisibilityFlag(
        features.mcp.providerSelector,
        features.visibility.mcp.providerSelector,
        isAdminUser
      ),
      actionSelector: withVisibilityFlag(features.mcp.actionSelector, features.visibility.mcp.actionSelector, isAdminUser),
    },
    adminPanel: {
      ...features.adminPanel,
      enabled: withVisibilityFlag(features.adminPanel.enabled, features.visibility.adminPanel.enabled, isAdminUser),
      selectionToggle: withVisibilityFlag(
        features.adminPanel.selectionToggle,
        features.visibility.adminPanel.selectionToggle,
        isAdminUser
      ),
      logsToggle: withVisibilityFlag(features.adminPanel.logsToggle, features.visibility.adminPanel.logsToggle, isAdminUser),
      messageSelection: withVisibilityFlag(
        features.adminPanel.messageSelection,
        features.visibility.adminPanel.messageSelection,
        isAdminUser
      ),
      messageMeta: withVisibilityFlag(features.adminPanel.messageMeta, features.visibility.adminPanel.messageMeta, isAdminUser),
      copyConversation: withVisibilityFlag(
        features.adminPanel.copyConversation,
        features.visibility.adminPanel.copyConversation,
        isAdminUser
      ),
      copyIssue: withVisibilityFlag(features.adminPanel.copyIssue, features.visibility.adminPanel.copyIssue, isAdminUser),
    },
    interaction: {
      ...features.interaction,
      quickReplies: withVisibilityFlag(
        features.interaction.quickReplies,
        features.visibility.interaction.quickReplies,
        isAdminUser
      ),
      productCards: withVisibilityFlag(
        features.interaction.productCards,
        features.visibility.interaction.productCards,
        isAdminUser
      ),
      threePhasePrompt: withVisibilityFlag(
        features.interaction.threePhasePrompt,
        features.visibility.interaction.threePhasePrompt,
        isAdminUser
      ),
      threePhasePromptShowConfirmed: withVisibilityFlag(
        features.interaction.threePhasePromptShowConfirmed,
        features.visibility.interaction.threePhasePromptShowConfirmed,
        isAdminUser
      ),
      threePhasePromptShowConfirming: withVisibilityFlag(
        features.interaction.threePhasePromptShowConfirming,
        features.visibility.interaction.threePhasePromptShowConfirming,
        isAdminUser
      ),
      threePhasePromptShowNext: withVisibilityFlag(
        features.interaction.threePhasePromptShowNext,
        features.visibility.interaction.threePhasePromptShowNext,
        isAdminUser
      ),
      threePhasePromptHideLabels: withVisibilityFlag(
        features.interaction.threePhasePromptHideLabels,
        features.visibility.interaction.threePhasePromptHideLabels,
        isAdminUser
      ),
      threePhasePromptLabels: features.interaction.threePhasePromptLabels,
      inputSubmit: withVisibilityFlag(features.interaction.inputSubmit, features.visibility.interaction.inputSubmit, isAdminUser),
    },
    setup: {
      ...features.setup,
      modelSelector: withVisibilityFlag(features.setup.modelSelector, features.visibility.setup.modelSelector, isAdminUser),
      agentSelector: withVisibilityFlag(features.setup.agentSelector, features.visibility.setup.agentSelector, isAdminUser),
      llmSelector: withVisibilityFlag(features.setup.llmSelector, features.visibility.setup.llmSelector, isAdminUser),
      kbSelector: withVisibilityFlag(features.setup.kbSelector, features.visibility.setup.kbSelector, isAdminUser),
      adminKbSelector: withVisibilityFlag(
        features.setup.adminKbSelector,
        features.visibility.setup.adminKbSelector,
        isAdminUser
      ),
      modeExisting: withVisibilityFlag(features.setup.modeExisting, features.visibility.setup.modeExisting, isAdminUser),
      sessionIdSearch: withVisibilityFlag(
        features.setup.sessionIdSearch,
        features.visibility.setup.sessionIdSearch,
        isAdminUser
      ),
      modeNew: withVisibilityFlag(features.setup.modeNew, features.visibility.setup.modeNew, isAdminUser),
      routeSelector: withVisibilityFlag(features.setup.routeSelector, features.visibility.setup.routeSelector, isAdminUser),
      inlineUserKbInput: withVisibilityFlag(
        features.setup.inlineUserKbInput,
        features.visibility.setup.inlineUserKbInput,
        isAdminUser
      ),
    },
    widget: {
      header: {
        enabled: withVisibilityFlag(
          features.widget.header.enabled,
          features.visibility.widget.header.enabled,
          isAdminUser
        ),
        logo: withVisibilityFlag(features.widget.header.logo, features.visibility.widget.header.logo, isAdminUser),
        status: withVisibilityFlag(features.widget.header.status, features.visibility.widget.header.status, isAdminUser),
        agentAction: withVisibilityFlag(
          features.widget.header.agentAction,
          features.visibility.widget.header.agentAction,
          isAdminUser
        ),
        newConversation: withVisibilityFlag(
          features.widget.header.newConversation,
          features.visibility.widget.header.newConversation,
          isAdminUser
        ),
        close: withVisibilityFlag(features.widget.header.close, features.visibility.widget.header.close, isAdminUser),
      },
      chatPanel: withVisibilityFlag(features.widget.chatPanel, features.visibility.widget.chatPanel, isAdminUser),
      historyPanel: withVisibilityFlag(
        features.widget.historyPanel,
        features.visibility.widget.historyPanel,
        isAdminUser
      ),
      tabBar: {
        enabled: withVisibilityFlag(
          features.widget.tabBar.enabled,
          features.visibility.widget.tabBar.enabled,
          isAdminUser
        ),
        chat: withVisibilityFlag(features.widget.tabBar.chat, features.visibility.widget.tabBar.chat, isAdminUser),
        list: withVisibilityFlag(features.widget.tabBar.list, features.visibility.widget.tabBar.list, isAdminUser),
        policy: withVisibilityFlag(
          features.widget.tabBar.policy,
          features.visibility.widget.tabBar.policy,
          isAdminUser
        ),
      },
      setupPanel: withVisibilityFlag(
        features.widget.setupPanel,
        features.visibility.widget.setupPanel,
        isAdminUser
      ),
    },
  };
}

/**
 * ì ì± í¸ì§ ê°ì´ë:
 * 1) í¹ì  íì´ì§ìì providerë¥¼ ë§ê³  ì¶ì¼ë©´:
 *    mcp.providers.denylist ì key ì¶ê° (ì: "cafe24")
 * 2) í¹ì  toolë§ íì©íê³  ì¶ì¼ë©´:
 *    mcp.tools.allowlist ì tool idë§ ëì´
 * 3) ê´ë¦¬ì ë³µì¬ ê¸°ë¥ë§ ëê³  ì¶ì¼ë©´:
 *    adminPanel.copyConversation / copyIssue = false
 * 4) ì íí ìëµ(quickReplies/cards)ë§ ëê³  ì¶ì¼ë©´:
 *    interaction.quickReplies / productCards = false
 */
export const PAGE_CONVERSATION_FEATURES: Record<string, ConversationPageFeatures> = {
  "/": {
    mcp: {
      providerSelector: true,
      actionSelector: true,
      providers: {
        // ëë©ì Cafe24 provider ì°¨ë¨
        denylist: ["cafe24"],
      },
      tools: {},
    },
    adminPanel: {
      enabled: true,
      selectionToggle: true,
      logsToggle: true,
      messageSelection: true,
      messageMeta: true,
      copyConversation: true,
      copyIssue: true,
    },
    interaction: {
      quickReplies: true,
      productCards: true,
      threePhasePrompt: true,
      threePhasePromptLabels: DEFAULT_THREE_PHASE_LABELS,
      threePhasePromptShowConfirmed: true,
      threePhasePromptShowConfirming: true,
      threePhasePromptShowNext: true,
      threePhasePromptHideLabels: false,
      inputSubmit: true,
    },
    setup: {
      modelSelector: false,
      agentSelector: false,
      llmSelector: true,
      llms: {},
      kbSelector: false,
      kbIds: {},
      adminKbSelector: false,
      adminKbIds: {},
      modeExisting: false,
      sessionIdSearch: false,
      modeNew: true,
      routeSelector: false,
      routes: {},
      inlineUserKbInput: true,
      defaultSetupMode: "new",
      defaultLlm: "chatgpt",
    },
    widget: {
      header: {
        enabled: true,
        logo: true,
        status: true,
        agentAction: true,
        newConversation: true,
        close: true,
      },
      chatPanel: true,
      historyPanel: true,
      tabBar: {
        enabled: true,
        chat: true,
        list: true,
        policy: true,
      },
      setupPanel: true,
    },
    visibility: {
      mcp: {
        providerSelector: "user",
        actionSelector: "user",
      },
      adminPanel: {
        enabled: "user",
        selectionToggle: "user",
        logsToggle: "user",
        messageSelection: "user",
        messageMeta: "user",
        copyConversation: "user",
        copyIssue: "user",
      },
      interaction: {
        quickReplies: "user",
        productCards: "user",
        threePhasePrompt: "user",
        threePhasePromptShowConfirmed: "user",
        threePhasePromptShowConfirming: "user",
        threePhasePromptShowNext: "user",
        threePhasePromptHideLabels: "user",
        inputSubmit: "user",
      },
      setup: {
        modelSelector: "user",
        agentSelector: "user",
        llmSelector: "user",
        kbSelector: "user",
        adminKbSelector: "admin",
        modeExisting: "user",
        sessionIdSearch: "user",
        modeNew: "user",
        routeSelector: "user",
        inlineUserKbInput: "user",
      },
      widget: {
        launcher: "user",
        header: {
          enabled: "user",
          logo: "user",
          status: "user",
          agentAction: "user",
          newConversation: "user",
          close: "user",
        },
        tabBar: {
          enabled: "user",
          chat: "user",
          list: "user",
          policy: "user",
        },
        chatPanel: "user",
        historyPanel: "user",
        setupPanel: "user",
      },
    },
  },
  "/app/conversation": {
    mcp: {
      providerSelector: true,
      actionSelector: true,
      // ëíì ê¸°ë³¸ ì ì²´ íì©
      providers: {},
      tools: {},
    },
    adminPanel: {
      enabled: true,
      selectionToggle: true,
      logsToggle: true,
      messageSelection: true,
      messageMeta: true,
      copyConversation: true,
      copyIssue: true,
    },
    interaction: {
      quickReplies: true,
      productCards: true,
      threePhasePrompt: true,
      threePhasePromptLabels: DEFAULT_THREE_PHASE_LABELS,
      threePhasePromptShowConfirmed: true,
      threePhasePromptShowConfirming: true,
      threePhasePromptShowNext: true,
      threePhasePromptHideLabels: false,
      inputSubmit: true,
    },
    setup: {
      modelSelector: true,
      agentSelector: true,
      llmSelector: true,
      llms: {},
      kbSelector: true,
      kbIds: {},
      adminKbSelector: true,
      adminKbIds: {},
      modeExisting: true,
      sessionIdSearch: true,
      modeNew: true,
      routeSelector: true,
      routes: {},
      inlineUserKbInput: false,
      defaultSetupMode: "existing",
      defaultLlm: "chatgpt",
    },
    widget: {
      header: {
        enabled: true,
        logo: true,
        status: true,
        agentAction: true,
        newConversation: true,
        close: true,
      },
      chatPanel: true,
      historyPanel: true,
      tabBar: {
        enabled: true,
        chat: true,
        list: true,
        policy: true,
      },
      setupPanel: true,
    },
    visibility: {
      mcp: {
        providerSelector: "user",
        actionSelector: "user",
      },
      adminPanel: {
        enabled: "admin",
        selectionToggle: "admin",
        logsToggle: "admin",
        messageSelection: "admin",
        messageMeta: "admin",
        copyConversation: "admin",
        copyIssue: "admin",
      },
      interaction: {
        quickReplies: "user",
        productCards: "user",
        threePhasePrompt: "user",
        threePhasePromptShowConfirmed: "user",
        threePhasePromptShowConfirming: "user",
        threePhasePromptShowNext: "user",
        threePhasePromptHideLabels: "user",
        inputSubmit: "user",
      },
      setup: {
        modelSelector: "user",
        agentSelector: "user",
        llmSelector: "user",
        kbSelector: "user",
        adminKbSelector: "admin",
        modeExisting: "user",
        sessionIdSearch: "user",
        modeNew: "user",
        routeSelector: "user",
        inlineUserKbInput: "user",
      },
      widget: {
        launcher: "user",
        header: {
          enabled: "user",
          logo: "user",
          status: "user",
          agentAction: "user",
          newConversation: "user",
          close: "user",
        },
        tabBar: {
          enabled: "user",
          chat: "user",
          list: "user",
          policy: "user",
        },
        chatPanel: "user",
        historyPanel: "user",
        setupPanel: "user",
      },
    },
  },
  [WIDGET_PAGE_KEY]: {
    mcp: {
      providerSelector: true,
      actionSelector: true,
      providers: {
        denylist: ["cafe24"],
      },
      tools: {},
    },
    adminPanel: {
      enabled: true,
      selectionToggle: true,
      logsToggle: true,
      messageSelection: true,
      messageMeta: true,
      copyConversation: true,
      copyIssue: true,
    },
    interaction: {
      quickReplies: true,
      productCards: true,
      threePhasePrompt: true,
      threePhasePromptLabels: DEFAULT_THREE_PHASE_LABELS,
      threePhasePromptShowConfirmed: true,
      threePhasePromptShowConfirming: true,
      threePhasePromptShowNext: true,
      threePhasePromptHideLabels: false,
      inputSubmit: true,
    },
    setup: {
      modelSelector: false,
      agentSelector: false,
      llmSelector: true,
      llms: {},
      kbSelector: false,
      kbIds: {},
      adminKbSelector: false,
      adminKbIds: {},
      modeExisting: false,
      sessionIdSearch: false,
      modeNew: true,
      routeSelector: false,
      routes: {},
      inlineUserKbInput: true,
      defaultSetupMode: "new",
      defaultLlm: "chatgpt",
    },
    widget: {
      header: {
        enabled: true,
        logo: true,
        status: true,
        agentAction: true,
        newConversation: true,
        close: true,
      },
      chatPanel: true,
      historyPanel: true,
      tabBar: {
        enabled: true,
        chat: true,
        list: true,
        policy: true,
      },
      setupPanel: true,
    },
    visibility: {
      mcp: {
        providerSelector: "user",
        actionSelector: "user",
      },
      adminPanel: {
        enabled: "user",
        selectionToggle: "user",
        logsToggle: "user",
        messageSelection: "user",
        messageMeta: "user",
        copyConversation: "user",
        copyIssue: "user",
      },
      interaction: {
        quickReplies: "user",
        productCards: "user",
        threePhasePrompt: "user",
        threePhasePromptShowConfirmed: "user",
        threePhasePromptShowConfirming: "user",
        threePhasePromptShowNext: "user",
        threePhasePromptHideLabels: "user",
        inputSubmit: "user",
      },
      setup: {
        modelSelector: "user",
        agentSelector: "user",
        llmSelector: "user",
        kbSelector: "user",
        adminKbSelector: "admin",
        modeExisting: "user",
        sessionIdSearch: "user",
        modeNew: "user",
        routeSelector: "user",
        inlineUserKbInput: "user",
      },
      widget: {
        launcher: "user",
        header: {
          enabled: "user",
          logo: "user",
          status: "user",
          agentAction: "user",
          newConversation: "user",
          close: "user",
        },
        tabBar: {
          enabled: "user",
          chat: "user",
          list: "user",
          policy: "user",
        },
        chatPanel: "user",
        historyPanel: "user",
        setupPanel: "user",
      },
    },
  },
};

export function getConversationPageBaseKey(page: ConversationPageKey): "/" | "/app/conversation" | typeof WIDGET_PAGE_KEY {
  const normalized = String(page || "").trim();
  if (normalized === "/") return "/";
  if (normalized === "/app/conversation") return "/app/conversation";
  if (normalized === WIDGET_PAGE_KEY || normalized.startsWith(`${WIDGET_PAGE_KEY}/`)) return WIDGET_PAGE_KEY;
  return "/";
}

export function getDefaultConversationPageFeatures(page: ConversationPageKey): ConversationPageFeatures {
  const exact = PAGE_CONVERSATION_FEATURES[page];
  if (exact) return exact;
  return PAGE_CONVERSATION_FEATURES[getConversationPageBaseKey(page)];
}

export function resolveRegisteredPageKey(
  page: ConversationPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): ConversationPageKey {
  const normalized = String(page || "").trim();
  if (!normalized) return "/";
  if (providerValue?.pages?.[normalized]) return normalized;
  if (providerValue?.settings_ui?.setup_fields?.[normalized]) return normalized;
  if (providerValue?.setup_ui && normalized === WIDGET_PAGE_KEY) return normalized;
  return normalized;
}

