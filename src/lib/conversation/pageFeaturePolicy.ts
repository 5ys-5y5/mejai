import type { DebugTranscriptOptions } from "@/lib/debugTranscript";

export type ConversationPageKey = string;
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
 * 중앙 대화 기능 정책 파일
 *
 * 운영 규칙:
 * - 페이지별 기능 차등은 이 파일에서만 조정한다.
 * - 페이지 컴포넌트에서 하드코딩 분기(예: provider.key !== "cafe24")를 만들지 않는다.
 * - UI 노출/동작 가능 여부/요청 payload 포함 여부를 같은 정책으로 맞춘다.
 *
 * 적용 범위:
 * - "/" (랜딩 체험)
 * - "/app/laboratory" (실험실)
 */
type IdGate = {
  /** 허용 목록. 비어있으면 전체 허용 */
  allowlist?: string[];
  /** 차단 목록. allowlist보다 우선 차단 */
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
};

export type ConversationPageFeatures = {
  mcp: {
    /** MCP provider 선택 UI 노출 여부 */
    providerSelector: boolean;
    /** MCP action 선택 UI 노출 여부 */
    actionSelector: boolean;
    /** provider key 단위 허용/차단 */
    providers: IdGate;
    /** tool id 단위 허용/차단 */
    tools: IdGate;
  };
  adminPanel: {
    /** 관리자 메뉴 자체 노출 여부 */
    enabled: boolean;
    /** "선택 ON/OFF" 토글 버튼 노출 및 동작 */
    selectionToggle: boolean;
    /** "로그 ON/OFF" 토글 버튼 노출 및 동작 */
    logsToggle: boolean;
    /** 메시지 선택 동작 허용 여부 */
    messageSelection: boolean;
    /** 메시지 메타(role/id/session) 노출 여부 */
    messageMeta: boolean;
    /** "대화 복사" 버튼 노출/동작 */
    copyConversation: boolean;
    /** "문제 로그 복사" 버튼 노출/동작 */
    copyIssue: boolean;
  };
  interaction: {
    /** quick reply 선택 UI 활성화 */
    quickReplies: boolean;
    /** product card 선택 UI 활성화 */
    productCards: boolean;
    /** 입력창/전송 버튼 활성화 */
    inputSubmit: boolean;
  };
  setup: {
    /** 모델(기존/신규) 선택 UI 노출 */
    modelSelector: boolean;
    /** existing 모드 하위 에이전트 선택 UI 노출 */
    agentSelector: boolean;
    /** LLM 선택 UI 노출 */
    llmSelector: boolean;
    /** KB 선택 UI 노출 */
    kbSelector: boolean;
    /** 관리자 KB 선택 UI 노출 */
    adminKbSelector: boolean;
    /** existing 모드 버튼/동작 허용 */
    modeExisting: boolean;
    /** existing 모드에서 세션 ID 직접 검색 UI 노출 */
    sessionIdSearch: boolean;
    /** new 모드 버튼/동작 허용 */
    modeNew: boolean;
    /** runtime(route) 선택 UI 노출 */
    routeSelector: boolean;
    /** 인라인 사용자 KB 입력 textarea 노출 */
    inlineUserKbInput: boolean;
    /** 기본 모드 */
    defaultSetupMode: "existing" | "new";
    /** 기본 LLM */
    defaultLlm: "chatgpt" | "gemini";
  };
  /** on/off 기능의 user/admin 가시성 제어 */
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
    inlineUserKbInput: "사용자 KB입력란",
    llmSelector: "LLM 선택",
    kbSelector: "KB 선택",
    adminKbSelector: "관리자 KB 선택",
    routeSelector: "Runtime 선택",
    mcpProviderSelector: "MCP 프로바이더 선택",
    mcpActionSelector: "MCP 액션 선택",
  },
  existingOrder: ["agentSelector", "versionSelector", "sessionSelector", "sessionIdSearch", "conversationMode"],
  existingLabels: {
    modeExisting: "기존 모델",
    modeNew: "신규 모델",
    agentSelector: "에이전트 선택",
    versionSelector: "버전 선택",
    sessionSelector: "세션 선택",
    sessionIdSearch: "세션 ID 직접 조회",
    conversationMode: "모드 선택",
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
      inputSubmit: override.interaction?.inputSubmit ?? base.interaction.inputSubmit,
    },
    setup: {
      modelSelector: override.setup?.modelSelector ?? base.setup.modelSelector,
      agentSelector: override.setup?.agentSelector ?? base.setup.agentSelector,
      llmSelector: override.setup?.llmSelector ?? base.setup.llmSelector,
      kbSelector: override.setup?.kbSelector ?? base.setup.kbSelector,
      adminKbSelector: override.setup?.adminKbSelector ?? base.setup.adminKbSelector,
      modeExisting: override.setup?.modeExisting ?? base.setup.modeExisting,
      sessionIdSearch: override.setup?.sessionIdSearch ?? base.setup.sessionIdSearch,
      modeNew: override.setup?.modeNew ?? base.setup.modeNew,
      routeSelector: override.setup?.routeSelector ?? base.setup.routeSelector,
      inlineUserKbInput: override.setup?.inlineUserKbInput ?? base.setup.inlineUserKbInput,
      defaultSetupMode: override.setup?.defaultSetupMode ?? base.setup.defaultSetupMode,
      defaultLlm: override.setup?.defaultLlm ?? base.setup.defaultLlm,
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
    },
  };
}

export function resolveConversationPageFeatures(
  page: ConversationPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): ConversationPageFeatures {
  const resolvedPage = resolveRegisteredPageKey(page, providerValue);
  const base = getDefaultConversationPageFeatures(resolvedPage);
  const override = providerValue?.pages?.[resolvedPage];
  return mergeConversationPageFeatures(base, override);
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
  };
}

/**
 * 정책 편집 가이드:
 * 1) 특정 페이지에서 provider를 막고 싶으면:
 *    mcp.providers.denylist 에 key 추가 (예: "cafe24")
 * 2) 특정 tool만 허용하고 싶으면:
 *    mcp.tools.allowlist 에 tool id만 나열
 * 3) 관리자 복사 기능만 끄고 싶으면:
 *    adminPanel.copyConversation / copyIssue = false
 * 4) 선택형 응답(quickReplies/cards)만 끄고 싶으면:
 *    interaction.quickReplies / productCards = false
 */
export const PAGE_CONVERSATION_FEATURES: Record<string, ConversationPageFeatures> = {
  "/": {
    mcp: {
      providerSelector: true,
      actionSelector: true,
      providers: {
        // 랜딩은 Cafe24 provider 차단
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
      inputSubmit: true,
    },
    setup: {
      modelSelector: false,
      agentSelector: false,
      llmSelector: true,
      kbSelector: false,
      adminKbSelector: false,
      modeExisting: false,
      sessionIdSearch: false,
      modeNew: true,
      routeSelector: false,
      inlineUserKbInput: true,
      defaultSetupMode: "new",
      defaultLlm: "chatgpt",
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
    },
  },
  "/app/laboratory": {
    mcp: {
      providerSelector: true,
      actionSelector: true,
      // 실험실은 기본 전체 허용
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
      inputSubmit: true,
    },
    setup: {
      modelSelector: true,
      agentSelector: true,
      llmSelector: true,
      kbSelector: true,
      adminKbSelector: true,
      modeExisting: true,
      sessionIdSearch: true,
      modeNew: true,
      routeSelector: true,
      inlineUserKbInput: false,
      defaultSetupMode: "existing",
      defaultLlm: "chatgpt",
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
    },
  },
};

export function getConversationPageBaseKey(page: ConversationPageKey): "/" | "/app/laboratory" {
  const normalized = String(page || "").trim();
  if (normalized === "/") return "/";
  if (normalized === "/app/laboratory") return "/app/laboratory";
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
  if ((providerValue?.page_registry || []).includes(normalized)) return normalized;
  return normalized;
}
