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
 * 以묒븰 ???湲곕뒫 ?뺤콉 ?뚯씪
 *
 * ?댁쁺 洹쒖튃:
 * - ?섏씠吏蹂?湲곕뒫 李⑤벑? ???뚯씪?먯꽌留?議곗젙?쒕떎.
 * - ?섏씠吏 而댄룷?뚰듃?먯꽌 ?섎뱶肄붾뵫 遺꾧린(?? provider.key !== "cafe24")瑜?留뚮뱾吏 ?딅뒗??
 * - UI ?몄텧/?숈옉 媛???щ?/?붿껌 payload ?ы븿 ?щ?瑜?媛숈? ?뺤콉?쇰줈 留욎텣??
 *
 * ?곸슜 踰붿쐞:
 * - "/" (?쒕뵫 泥댄뿕)
 * - "/app/laboratory" (?ㅽ뿕??
 * - "/embed" (?꾩젽)
 */
type IdGate = {
  /** ?덉슜 紐⑸줉. 鍮꾩뼱?덉쑝硫??꾩껜 ?덉슜 */
  allowlist?: string[];
  /** 차단 목록. allowlist보다 ?�선 차단 */
  denylist?: string[];
};

export type FeatureVisibilityMode = "public" | "user" | "admin";
export type AccessRole = "public" | "user" | "admin";

type VisibilityFields<T extends Record<string, unknown>> = {
  [K in keyof T as T[K] extends boolean ? K : never]: FeatureVisibilityMode;
};

type ConversationFeatureVisibility = {
  mcp: VisibilityFields<ConversationPageFeatures["mcp"]>;
  adminPanel: VisibilityFields<ConversationPageFeatures["adminPanel"]>;
  interaction: VisibilityFields<ConversationPageFeatures["interaction"]>;
  setup: VisibilityFields<ConversationPageFeatures["setup"]>;
  widget: {
    header: VisibilityFields<ConversationPageFeatures["widget"]["header"]>;
    chatPanel: FeatureVisibilityMode;
    setupPanel: FeatureVisibilityMode;
    historyPanel: FeatureVisibilityMode;
    tabBar: VisibilityFields<ConversationPageFeatures["widget"]["tabBar"]>;
  };
};

export type ConversationPageFeatures = {
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
    setupPanel: boolean;
    historyPanel: boolean;
    tabBar: {
      enabled: boolean;
      chat: boolean;
      list: boolean;
      policy: boolean;
    };
  };
  mcp: {
    /** MCP provider ?좏깮 UI ?몄텧 ?щ? */
    providerSelector: boolean;
    /** MCP action ?좏깮 UI ?몄텧 ?щ? */
    actionSelector: boolean;
    /** provider key ?⑥쐞 ?덉슜/李⑤떒 */
    providers: IdGate;
    /** tool id ?⑥쐞 ?덉슜/李⑤떒 */
    tools: IdGate;
  };
  adminPanel: {
    /** 愿由ъ옄 硫붾돱 ?먯껜 ?몄텧 ?щ? */
    enabled: boolean;
    /** "?좏깮 ON/OFF" ?좉? 踰꾪듉 ?몄텧 諛??숈옉 */
    selectionToggle: boolean;
    /** 硫붿떆吏 ?좏깮 紐⑤뱶 ?쒖꽦??*/
    messageSelection: boolean;
    /** "濡쒓렇 ON/OFF" ?좉? 踰꾪듉 ?몄텧 諛??숈옉 */
    logsToggle: boolean;
    /** 硫붿떆吏 硫뷀?(role/id/session) ?몄텧 ?щ? */
    messageMeta: boolean;
    /** "???蹂듭궗" 踰꾪듉 ?몄텧/?숈옉 */
    copyConversation: boolean;
    /** "?쇳듃?윾뒪遺뚮ℓ??蹂듭궗" 踰꾪듉 ?몄텧/?숈옉 */
    copyIssue: boolean;
  };
  interaction: {
    /** quick reply ?좏깮 UI ?쒖꽦??*/
    quickReplies: boolean;
    /** product card ?좏깮 UI ?쒖꽦??*/
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
    inputPlaceholder: string;
    /** 초기 ?�내 prefill 메시지 출력 */
    prefill: boolean;
    prefillMessages: string[];
    /** ?낅젰李??꾩넚 踰꾪듉 ?쒖꽦??*/
    inputSubmit: boolean;
    /** Widget header: agent connect button */
    widgetHeaderAgentAction: boolean;
    /** Widget header: new conversation button */
    widgetHeaderNewConversation: boolean;
    /** Widget header: close button */
    widgetHeaderClose: boolean;
  };
  setup: {
    /** 紐⑤뜽(湲곗〈/?좉퇋) ?좏깮 UI ?몄텧 */
    modelSelector: boolean;
    /** existing 紐⑤뱶 ?섏쐞 ?먯씠?꾪듃 ?좏깮 UI ?몄텧 */
    agentSelector: boolean;
    /** LLM ?좏깮 UI ?몄텧 */
    llmSelector: boolean;
    /** LLM ?좏깮 UI ?섏쐞 ??ぉ ?덉슜/李⑤떒 (llm id) */
    llms: IdGate;
    /** KB ?좏깮 UI ?몄텧 */
    kbSelector: boolean;
    /** KB ?좏깮 UI ?섏쐞 ??ぉ ?덉슜/李⑤떒 (KB id) */
    kbIds: IdGate;
    /** 愿由ъ옄 KB ?좏깮 UI ?몄텧 */
    adminKbSelector: boolean;
    /** 愿由ъ옄 KB ?좏깮 UI ?섏쐞 ??ぉ ?덉슜/李⑤떒 (KB id) */
    adminKbIds: IdGate;
    /** existing 紐⑤뱶 踰꾪듉/?숈옉 ?덉슜 */
    modeExisting: boolean;
    /** existing 紐⑤뱶?먯꽌 ?몄뀡 ID 吏곸젒 寃??UI ?몄텧 */
    sessionIdSearch: boolean;
    /** new 紐⑤뱶 踰꾪듉/?숈옉 ?덉슜 */
    modeNew: boolean;
    /** runtime(route) ?좏깮 UI ?몄텧 */
    routeSelector: boolean;
    /** runtime(route) ?좏깮 UI ?섏쐞 ??ぉ ?덉슜/李⑤떒 (route id) */
    routes: IdGate;
    /** ?몃씪???ъ슜??KB ?낅젰 textarea ?몄텧 */
    inlineUserKbInput: boolean;
    /** 기본 모드 */
    defaultSetupMode: "existing" | "new";
    /** 기본 LLM */
    defaultLlm: "chatgpt" | "gemini";
  };
  /** on/off 湲곕뒫??user/admin 媛?쒖꽦 ?쒖뼱 */
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

export type ConversationFeaturesProviderShape = {
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
    inlineUserKbInput: "user",
    llmSelector: "user",
    kbSelector: "user",
    adminKbSelector: "user",
    routeSelector: "user",
    mcpProviderSelector: "MCP provider selector",
    mcpActionSelector: "MCP action selector",
  },
  existingOrder: ["agentSelector", "versionSelector", "conversationMode", "sessionSelector", "sessionIdSearch"],
  existingLabels: {
    modeExisting: "user",
    modeNew: "user",
    agentSelector: "user",
    versionSelector: "Version selector",
    sessionSelector: "Session selector",
    sessionIdSearch: "user",
    conversationMode: "Conversation mode",
  },
};

const DEFAULT_PREFILL_MESSAGES = [
  "Describe your issue and context for the AI assistant.",
  "Provide goals, constraints, and any required inputs.",
];

const DEFAULT_THREE_PHASE_LABELS = {
  confirmed: "Confirmed",
  confirming: "Confirming",
  next: "Confirm Next",
} as const;

const DEFAULT_WIDGET_FEATURES: ConversationPageFeatures["widget"] = {
  header: {
    enabled: true,
    logo: true,
    status: true,
    agentAction: false,
    newConversation: true,
    close: true,
  },
  chatPanel: true,
  setupPanel: true,
  historyPanel: true,
  tabBar: {
    enabled: true,
    chat: true,
    list: true,
    policy: false,
  },
};

const DEFAULT_WIDGET_VISIBILITY: ConversationFeatureVisibility["widget"] = {
  header: {
    enabled: "user",
    logo: "user",
    status: "admin",
    agentAction: "user",
    newConversation: "user",
    close: "user",
  },
  chatPanel: "user",
  setupPanel: "user",
  historyPanel: "user",
  tabBar: {
    enabled: "user",
    chat: "user",
    list: "user",
    policy: "admin",
  },
};

const DEFAULT_PAGE_VISIBILITY: ConversationFeatureVisibility = {
  widget: DEFAULT_WIDGET_VISIBILITY,
  mcp: {
    providerSelector: "user",
    actionSelector: "user",
  },
  adminPanel: {
    enabled: "admin",
    selectionToggle: "admin",
    messageSelection: "admin",
    logsToggle: "admin",
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
    prefill: "user",
    inputSubmit: "user",
    widgetHeaderAgentAction: "user",
    widgetHeaderNewConversation: "user",
    widgetHeaderClose: "user",
  },
  setup: {
    modelSelector: "user",
    agentSelector: "user",
    llmSelector: "user",
    kbSelector: "user",
    adminKbSelector: "user",
    modeExisting: "user",
    sessionIdSearch: "user",
    modeNew: "user",
    routeSelector: "user",
    inlineUserKbInput: "user",
  },
};

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

export function resolveConversationSetupUi(
  page: ConversationPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): ConversationSetupUi {
  const resolvedPage = resolveRegisteredPageKey(page, providerValue);
  const override = providerValue?.settings_ui?.setup_fields?.[resolvedPage];
  return {
    order: normalizeSetupOrder(override?.order),
    labels: {
      ...DEFAULT_SETUP_UI.labels,
      ...(override?.labels || {}),
    },
    existingOrder: normalizeExistingSetupOrder(override?.existing_order),
    existingLabels: {
      ...DEFAULT_SETUP_UI.existingLabels,
      ...(override?.existing_labels || {}),
    },
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
    confirmed: String(override?.confirmed || fallback?.confirmed || DEFAULT_THREE_PHASE_LABELS.confirmed).trim() || DEFAULT_THREE_PHASE_LABELS.confirmed,
    confirming: String(override?.confirming || fallback?.confirming || DEFAULT_THREE_PHASE_LABELS.confirming).trim() || DEFAULT_THREE_PHASE_LABELS.confirming,
    next: String(override?.next || fallback?.next || DEFAULT_THREE_PHASE_LABELS.next).trim() || DEFAULT_THREE_PHASE_LABELS.next,
  };
}

function normalizePrefillMessages(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

export function mergeConversationPageFeatures(
  base: ConversationPageFeatures,
  override?: ConversationPageFeaturesOverride
): ConversationPageFeatures {
  if (!override) return base;
  return {
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
      setupPanel: override.widget?.setupPanel ?? base.widget.setupPanel,
      historyPanel: override.widget?.historyPanel ?? base.widget.historyPanel,
      tabBar: {
        enabled: override.widget?.tabBar?.enabled ?? base.widget.tabBar.enabled,
        chat: override.widget?.tabBar?.chat ?? base.widget.tabBar.chat,
        list: override.widget?.tabBar?.list ?? base.widget.tabBar.list,
        policy: override.widget?.tabBar?.policy ?? base.widget.tabBar.policy,
      },
    },
    mcp: {
      providerSelector: override.mcp?.providerSelector ?? base.mcp.providerSelector,
      actionSelector: override.mcp?.actionSelector ?? base.mcp.actionSelector,
      providers: mergeIdGate(base.mcp.providers, override.mcp?.providers),
      tools: mergeIdGate(base.mcp.tools, override.mcp?.tools),
    },
    adminPanel: {
      enabled: override.adminPanel?.enabled ?? base.adminPanel.enabled,
      selectionToggle: override.adminPanel?.selectionToggle ?? base.adminPanel.selectionToggle,
      messageSelection:
        override.adminPanel?.messageSelection ??
        override.adminPanel?.messageMeta ??
        base.adminPanel.messageSelection ??
        base.adminPanel.messageMeta,
      logsToggle: override.adminPanel?.logsToggle ?? base.adminPanel.logsToggle,
      messageMeta: override.adminPanel?.messageMeta ?? base.adminPanel.messageMeta,
      copyConversation: override.adminPanel?.copyConversation ?? base.adminPanel.copyConversation,
      copyIssue: override.adminPanel?.copyIssue ?? base.adminPanel.copyIssue ?? base.adminPanel.copyConversation,
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
      inputPlaceholder: String((override.interaction?.inputPlaceholder ?? base.interaction.inputPlaceholder) || ""),
      prefill: override.interaction?.prefill ?? base.interaction.prefill,
      prefillMessages: normalizePrefillMessages(
        override.interaction?.prefillMessages,
        base.interaction.prefillMessages
      ),
      inputSubmit: override.interaction?.inputSubmit ?? base.interaction.inputSubmit,
      widgetHeaderAgentAction: override.interaction?.widgetHeaderAgentAction ?? base.interaction.widgetHeaderAgentAction,
      widgetHeaderNewConversation: override.interaction?.widgetHeaderNewConversation ?? base.interaction.widgetHeaderNewConversation,
      widgetHeaderClose: override.interaction?.widgetHeaderClose ?? base.interaction.widgetHeaderClose,
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
    visibility: {
      widget: {
        header: {
          enabled: override.visibility?.widget?.header?.enabled ?? base.visibility.widget.header.enabled,
          logo: override.visibility?.widget?.header?.logo ?? base.visibility.widget.header.logo,
          status: override.visibility?.widget?.header?.status ?? base.visibility.widget.header.status,
          agentAction: override.visibility?.widget?.header?.agentAction ?? base.visibility.widget.header.agentAction,
          newConversation:
            override.visibility?.widget?.header?.newConversation ?? base.visibility.widget.header.newConversation,
          close: override.visibility?.widget?.header?.close ?? base.visibility.widget.header.close,
        },
        chatPanel: override.visibility?.widget?.chatPanel ?? base.visibility.widget.chatPanel,
        setupPanel: override.visibility?.widget?.setupPanel ?? base.visibility.widget.setupPanel,
        historyPanel: override.visibility?.widget?.historyPanel ?? base.visibility.widget.historyPanel,
        tabBar: {
          enabled: override.visibility?.widget?.tabBar?.enabled ?? base.visibility.widget.tabBar.enabled,
          chat: override.visibility?.widget?.tabBar?.chat ?? base.visibility.widget.tabBar.chat,
          list: override.visibility?.widget?.tabBar?.list ?? base.visibility.widget.tabBar.list,
          policy: override.visibility?.widget?.tabBar?.policy ?? base.visibility.widget.tabBar.policy,
        },
      },
      mcp: {
        providerSelector: override.visibility?.mcp?.providerSelector ?? base.visibility.mcp.providerSelector,
        actionSelector: override.visibility?.mcp?.actionSelector ?? base.visibility.mcp.actionSelector,
      },
      adminPanel: {
        enabled: override.visibility?.adminPanel?.enabled ?? base.visibility.adminPanel.enabled,
        selectionToggle: override.visibility?.adminPanel?.selectionToggle ?? base.visibility.adminPanel.selectionToggle,
        messageSelection:
          override.visibility?.adminPanel?.messageSelection ??
          override.visibility?.adminPanel?.messageMeta ??
          base.visibility.adminPanel.messageSelection ??
          base.visibility.adminPanel.messageMeta,
        logsToggle: override.visibility?.adminPanel?.logsToggle ?? base.visibility.adminPanel.logsToggle,
        messageMeta: override.visibility?.adminPanel?.messageMeta ?? base.visibility.adminPanel.messageMeta,
        copyConversation:
          override.visibility?.adminPanel?.copyConversation ?? base.visibility.adminPanel.copyConversation,
        copyIssue: override.visibility?.adminPanel?.copyIssue ?? base.visibility.adminPanel.copyIssue ?? base.visibility.adminPanel.copyConversation,
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
        prefill: override.visibility?.interaction?.prefill ?? base.visibility.interaction.prefill,
        inputSubmit: override.visibility?.interaction?.inputSubmit ?? base.visibility.interaction.inputSubmit,
        widgetHeaderAgentAction: override.visibility?.interaction?.widgetHeaderAgentAction ?? base.visibility.interaction.widgetHeaderAgentAction,
        widgetHeaderNewConversation: override.visibility?.interaction?.widgetHeaderNewConversation ?? base.visibility.interaction.widgetHeaderNewConversation,
        widgetHeaderClose: override.visibility?.interaction?.widgetHeaderClose ?? base.visibility.interaction.widgetHeaderClose,
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
    },
  };
}

export function resolveConversationPageFeatures(
  page: ConversationPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): ConversationPageFeatures {
  if (!providerValue) {
    throw new Error("CHAT_POLICY_MISSING");
  }
  const resolvedPage = normalizeConversationPageKey(page);
  const registry = Array.isArray(providerValue.page_registry)
    ? providerValue.page_registry.map((entry) => normalizeConversationPageKey(entry))
    : [];
  if (!registry.includes(resolvedPage)) {
    throw new Error("CHAT_POLICY_PAGE_NOT_REGISTERED");
  }
  const override = providerValue.pages?.[resolvedPage];
  if (!override) {
    throw new Error("CHAT_POLICY_PAGE_SETTINGS_MISSING");
  }
  const base = getDefaultConversationPageFeatures(resolvedPage);
  let merged = mergeConversationPageFeatures(base, override);
  if (merged.interaction.prefill && resolvedPage !== "/") {
    const rootOverride = providerValue.pages?.["/"];
    if (!rootOverride) {
      throw new Error("CHAT_POLICY_PAGE_SETTINGS_MISSING");
    }
    const rootBase = getDefaultConversationPageFeatures("/");
    const rootMerged = mergeConversationPageFeatures(rootBase, rootOverride);
    merged = {
      ...merged,
      interaction: { ...merged.interaction, prefillMessages: rootMerged.interaction.prefillMessages },
    };
  }
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

function withVisibilityFlag(enabled: boolean, visibility: FeatureVisibilityMode, accessRole: AccessRole) {
  if (!enabled) return false;
  if (visibility === "public") return true;
  if (visibility === "user") return accessRole === "user" || accessRole === "admin";
  return accessRole === "admin";
}

export function applyConversationFeatureVisibility(
  features: ConversationPageFeatures,
  accessRole: AccessRole
): ConversationPageFeatures {
  return {
    ...features,
    widget: {
      ...features.widget,
      header: {
        ...features.widget.header,
        enabled: withVisibilityFlag(
          features.widget.header.enabled,
          features.visibility.widget.header.enabled,
          accessRole
        ),
        logo: withVisibilityFlag(features.widget.header.logo, features.visibility.widget.header.logo, accessRole),
        status: withVisibilityFlag(features.widget.header.status, features.visibility.widget.header.status, accessRole),
        agentAction: withVisibilityFlag(
          features.widget.header.agentAction,
          features.visibility.widget.header.agentAction,
          accessRole
        ),
        newConversation: withVisibilityFlag(
          features.widget.header.newConversation,
          features.visibility.widget.header.newConversation,
          accessRole
        ),
        close: withVisibilityFlag(
          features.widget.header.close,
          features.visibility.widget.header.close,
          accessRole
        ),
      },
      chatPanel: withVisibilityFlag(features.widget.chatPanel, features.visibility.widget.chatPanel, accessRole),
      setupPanel: withVisibilityFlag(features.widget.setupPanel, features.visibility.widget.setupPanel, accessRole),
      historyPanel: withVisibilityFlag(
        features.widget.historyPanel,
        features.visibility.widget.historyPanel,
        accessRole
      ),
      tabBar: {
        ...features.widget.tabBar,
        enabled: withVisibilityFlag(
          features.widget.tabBar.enabled,
          features.visibility.widget.tabBar.enabled,
          accessRole
        ),
        chat: withVisibilityFlag(features.widget.tabBar.chat, features.visibility.widget.tabBar.chat, accessRole),
        list: withVisibilityFlag(features.widget.tabBar.list, features.visibility.widget.tabBar.list, accessRole),
        policy: withVisibilityFlag(features.widget.tabBar.policy, features.visibility.widget.tabBar.policy, accessRole),
      },
    },
    mcp: {
      ...features.mcp,
      providerSelector: withVisibilityFlag(
        features.mcp.providerSelector,
        features.visibility.mcp.providerSelector,
        accessRole
      ),
      actionSelector: withVisibilityFlag(features.mcp.actionSelector, features.visibility.mcp.actionSelector, accessRole),
    },
    adminPanel: {
      ...features.adminPanel,
      enabled: withVisibilityFlag(features.adminPanel.enabled, features.visibility.adminPanel.enabled, accessRole),
      selectionToggle: withVisibilityFlag(
        features.adminPanel.selectionToggle,
        features.visibility.adminPanel.selectionToggle,
        accessRole
      ),
      messageSelection: withVisibilityFlag(
        features.adminPanel.messageSelection,
        features.visibility.adminPanel.messageSelection,
        accessRole
      ),
      logsToggle: withVisibilityFlag(
        features.adminPanel.logsToggle,
        features.visibility.adminPanel.logsToggle,
        accessRole
      ),
      messageMeta: withVisibilityFlag(features.adminPanel.messageMeta, features.visibility.adminPanel.messageMeta, accessRole),
      copyConversation: withVisibilityFlag(
        features.adminPanel.copyConversation,
        features.visibility.adminPanel.copyConversation,
        accessRole
      ),
      copyIssue: withVisibilityFlag(
        features.adminPanel.copyIssue,
        features.visibility.adminPanel.copyIssue,
        accessRole
      ),
    },
    interaction: {
      ...features.interaction,
      quickReplies: withVisibilityFlag(
        features.interaction.quickReplies,
        features.visibility.interaction.quickReplies,
        accessRole
      ),
      productCards: withVisibilityFlag(
        features.interaction.productCards,
        features.visibility.interaction.productCards,
        accessRole
      ),
      threePhasePrompt: withVisibilityFlag(
        features.interaction.threePhasePrompt,
        features.visibility.interaction.threePhasePrompt,
        accessRole
      ),
      threePhasePromptShowConfirmed: withVisibilityFlag(
        features.interaction.threePhasePromptShowConfirmed,
        features.visibility.interaction.threePhasePromptShowConfirmed,
        accessRole
      ),
      threePhasePromptShowConfirming: withVisibilityFlag(
        features.interaction.threePhasePromptShowConfirming,
        features.visibility.interaction.threePhasePromptShowConfirming,
        accessRole
      ),
      threePhasePromptShowNext: withVisibilityFlag(
        features.interaction.threePhasePromptShowNext,
        features.visibility.interaction.threePhasePromptShowNext,
        accessRole
      ),
      threePhasePromptHideLabels: withVisibilityFlag(
        features.interaction.threePhasePromptHideLabels,
        features.visibility.interaction.threePhasePromptHideLabels,
        accessRole
      ),
      threePhasePromptLabels: features.interaction.threePhasePromptLabels,
      inputPlaceholder: features.interaction.inputPlaceholder,
      prefill: withVisibilityFlag(features.interaction.prefill, features.visibility.interaction.prefill, accessRole),
      prefillMessages: features.interaction.prefillMessages,
      inputSubmit: withVisibilityFlag(features.interaction.inputSubmit, features.visibility.interaction.inputSubmit, accessRole),
      widgetHeaderAgentAction: withVisibilityFlag(
        features.interaction.widgetHeaderAgentAction,
        features.visibility.interaction.widgetHeaderAgentAction,
        accessRole
      ),
      widgetHeaderNewConversation: withVisibilityFlag(
        features.interaction.widgetHeaderNewConversation,
        features.visibility.interaction.widgetHeaderNewConversation,
        accessRole
      ),
      widgetHeaderClose: withVisibilityFlag(
        features.interaction.widgetHeaderClose,
        features.visibility.interaction.widgetHeaderClose,
        accessRole
      ),
    },
    setup: {
      ...features.setup,
      modelSelector: withVisibilityFlag(features.setup.modelSelector, features.visibility.setup.modelSelector, accessRole),
      agentSelector: withVisibilityFlag(features.setup.agentSelector, features.visibility.setup.agentSelector, accessRole),
      llmSelector: withVisibilityFlag(features.setup.llmSelector, features.visibility.setup.llmSelector, accessRole),
      kbSelector: withVisibilityFlag(features.setup.kbSelector, features.visibility.setup.kbSelector, accessRole),
      adminKbSelector: withVisibilityFlag(
        features.setup.adminKbSelector,
        features.visibility.setup.adminKbSelector,
        accessRole
      ),
      modeExisting: withVisibilityFlag(features.setup.modeExisting, features.visibility.setup.modeExisting, accessRole),
      sessionIdSearch: withVisibilityFlag(
        features.setup.sessionIdSearch,
        features.visibility.setup.sessionIdSearch,
        accessRole
      ),
      modeNew: withVisibilityFlag(features.setup.modeNew, features.visibility.setup.modeNew, accessRole),
      routeSelector: withVisibilityFlag(features.setup.routeSelector, features.visibility.setup.routeSelector, accessRole),
      inlineUserKbInput: withVisibilityFlag(
        features.setup.inlineUserKbInput,
        features.visibility.setup.inlineUserKbInput,
        accessRole
      ),
    },
  };
}

/**
 * ?뺤콉 ?몄쭛 媛?대뱶:
 * 1) ?뱀젙 ?섏씠吏?먯꽌 provider瑜?留됯퀬 ?띠쑝硫?
 *    mcp.providers.denylist ??key 異붽? (?? "cafe24")
 * 2) ?뱀젙 tool留??덉슜?섍퀬 ?띠쑝硫?
 *    mcp.tools.allowlist ??tool id留??섏뿴
 * 3) 愿由ъ옄 蹂듭궗 湲곕뒫留??꾧퀬 ?띠쑝硫?
 * 4) ?좏깮???묐떟(quickReplies/cards)留??꾧퀬 ?띠쑝硫?
 *    interaction.quickReplies / productCards = false
 */
export const PAGE_CONVERSATION_FEATURES: Record<string, ConversationPageFeatures> = {
  "/": {
    widget: {
      ...DEFAULT_WIDGET_FEATURES,
      header: {
        ...DEFAULT_WIDGET_FEATURES.header,
        close: false,
      },
      tabBar: {
        ...DEFAULT_WIDGET_FEATURES.tabBar,
        policy: false,
      },
    },
    mcp: {
      providerSelector: true,
      actionSelector: true,
      providers: {
        // ?쒕뵫? Cafe24 provider 李⑤떒
        denylist: ["cafe24"],
      },
      tools: {},
    },
    adminPanel: {
      enabled: true,
      selectionToggle: true,
      messageSelection: true,
      logsToggle: true,
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
      inputPlaceholder: "",
      prefill: true,
      prefillMessages: DEFAULT_PREFILL_MESSAGES,
      inputSubmit: true,
      widgetHeaderAgentAction: false,
      widgetHeaderNewConversation: true,
      widgetHeaderClose: true,
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
    visibility: DEFAULT_PAGE_VISIBILITY,
  },
  "/app/laboratory": {
    widget: {
      ...DEFAULT_WIDGET_FEATURES,
      header: {
        ...DEFAULT_WIDGET_FEATURES.header,
        close: false,
      },
      tabBar: {
        ...DEFAULT_WIDGET_FEATURES.tabBar,
        policy: false,
      },
    },
    mcp: {
      providerSelector: true,
      actionSelector: true,
      // ?ㅽ뿕?ㅼ? 湲곕낯 ?꾩껜 ?덉슜
      providers: {},
      tools: {},
    },
    adminPanel: {
      enabled: true,
      selectionToggle: true,
      messageSelection: true,
      logsToggle: true,
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
      inputPlaceholder: "",
      prefill: true,
      prefillMessages: DEFAULT_PREFILL_MESSAGES,
      inputSubmit: true,
      widgetHeaderAgentAction: false,
      widgetHeaderNewConversation: true,
      widgetHeaderClose: true,
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
    visibility: {
      widget: {
        ...DEFAULT_WIDGET_VISIBILITY,
        header: {
          ...DEFAULT_WIDGET_VISIBILITY.header,
          close: "public",
        },
        tabBar: {
          ...DEFAULT_WIDGET_VISIBILITY.tabBar,
          policy: "admin",
        },
      },
      mcp: {
        providerSelector: "public",
        actionSelector: "public",
      },
      adminPanel: {
        enabled: "admin",
        selectionToggle: "admin",
        messageSelection: "admin",
        logsToggle: "admin",
        messageMeta: "admin",
        copyConversation: "admin",
        copyIssue: "admin",
      },
      interaction: {
        quickReplies: "public",
        productCards: "public",
        threePhasePrompt: "public",
        threePhasePromptShowConfirmed: "public",
        threePhasePromptShowConfirming: "public",
        threePhasePromptShowNext: "public",
        threePhasePromptHideLabels: "public",
        prefill: "public",
        inputSubmit: "public",
        widgetHeaderAgentAction: "public",
        widgetHeaderNewConversation: "public",
        widgetHeaderClose: "public",
      },
      setup: {
        modelSelector: "public",
        agentSelector: "public",
        llmSelector: "public",
        kbSelector: "public",
        adminKbSelector: "public",
        modeExisting: "public",
        sessionIdSearch: "public",
        modeNew: "public",
        routeSelector: "public",
        inlineUserKbInput: "public",
      },
    },
  },
  [WIDGET_PAGE_KEY]: {
    widget: {
      ...DEFAULT_WIDGET_FEATURES,
      header: {
        ...DEFAULT_WIDGET_FEATURES.header,
        close: true,
      },
      tabBar: {
        ...DEFAULT_WIDGET_FEATURES.tabBar,
        policy: false,
      },
    },
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
      messageSelection: true,
      logsToggle: true,
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
      inputPlaceholder: "",
      prefill: false,
      prefillMessages: [],
      inputSubmit: true,
      widgetHeaderAgentAction: false,
      widgetHeaderNewConversation: true,
      widgetHeaderClose: true,
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
    visibility: DEFAULT_PAGE_VISIBILITY,
  },
  "/demo": {
    widget: {
      ...DEFAULT_WIDGET_FEATURES,
      header: {
        ...DEFAULT_WIDGET_FEATURES.header,
        close: true,
      },
      tabBar: {
        ...DEFAULT_WIDGET_FEATURES.tabBar,
        policy: false,
      },
    },
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
      messageSelection: true,
      logsToggle: true,
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
      inputPlaceholder: "",
      prefill: true,
      prefillMessages: DEFAULT_PREFILL_MESSAGES,
      inputSubmit: true,
      widgetHeaderAgentAction: false,
      widgetHeaderNewConversation: true,
      widgetHeaderClose: true,
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
    visibility: DEFAULT_PAGE_VISIBILITY,
  },
  "/call": {
    widget: {
      ...DEFAULT_WIDGET_FEATURES,
      header: {
        ...DEFAULT_WIDGET_FEATURES.header,
        close: true,
      },
      tabBar: {
        ...DEFAULT_WIDGET_FEATURES.tabBar,
        policy: false,
      },
    },
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
      messageSelection: true,
      logsToggle: true,
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
      inputPlaceholder: "",
      prefill: true,
      prefillMessages: DEFAULT_PREFILL_MESSAGES,
      inputSubmit: true,
      widgetHeaderAgentAction: false,
      widgetHeaderNewConversation: true,
      widgetHeaderClose: true,
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
    visibility: DEFAULT_PAGE_VISIBILITY,
  },
};

export function normalizeConversationPageKey(page: ConversationPageKey): ConversationPageKey {
  const normalized = String(page || "").trim();
  if (!normalized) return "/";
  if (normalized === "/") return "/";
  if (normalized === "/app/laboratory") return "/app/laboratory";
  if (normalized === "/demo") return "/demo";
  if (normalized === "/call" || normalized.startsWith("/call/")) return "/call";
  if (normalized === WIDGET_PAGE_KEY || normalized.startsWith(`${WIDGET_PAGE_KEY}/`)) return WIDGET_PAGE_KEY;
  return normalized;
}

export function getConversationPageBaseKey(
  page: ConversationPageKey
): "/" | "/app/laboratory" | typeof WIDGET_PAGE_KEY | "/demo" | "/call" {
  const normalized = normalizeConversationPageKey(page);
  if (normalized === "/") return "/";
  if (normalized === "/app/laboratory") return "/app/laboratory";
  if (normalized === "/demo") return "/demo";
  if (normalized === "/call") return "/call";
  if (normalized === WIDGET_PAGE_KEY) return WIDGET_PAGE_KEY;
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
  const normalized = normalizeConversationPageKey(page);
  if (!normalized) return "/";
  if (providerValue?.pages?.[normalized]) return normalized;
  if (providerValue?.settings_ui?.setup_fields?.[normalized]) return normalized;
  if ((providerValue?.page_registry || []).includes(normalized)) return normalized;
  return normalized;
}

