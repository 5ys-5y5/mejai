export type ConversationPageKey = "/" | "/app/laboratory";

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
    /** LLM 선택 UI 노출 */
    llmSelector: boolean;
    /** KB 선택 UI 노출 */
    kbSelector: boolean;
    /** 관리자 KB 선택 UI 노출 */
    adminKbSelector: boolean;
    /** existing 모드 버튼/동작 허용 */
    modeExisting: boolean;
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
};

export type ConversationPageFeaturesOverride = Partial<ConversationPageFeatures>;

export type ConversationFeaturesProviderShape = {
  pages?: Partial<Record<ConversationPageKey, ConversationPageFeaturesOverride>>;
};

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
      llmSelector: override.setup?.llmSelector ?? base.setup.llmSelector,
      kbSelector: override.setup?.kbSelector ?? base.setup.kbSelector,
      adminKbSelector: override.setup?.adminKbSelector ?? base.setup.adminKbSelector,
      modeExisting: override.setup?.modeExisting ?? base.setup.modeExisting,
      modeNew: override.setup?.modeNew ?? base.setup.modeNew,
      routeSelector: override.setup?.routeSelector ?? base.setup.routeSelector,
      inlineUserKbInput: override.setup?.inlineUserKbInput ?? base.setup.inlineUserKbInput,
      defaultSetupMode: override.setup?.defaultSetupMode ?? base.setup.defaultSetupMode,
      defaultLlm: override.setup?.defaultLlm ?? base.setup.defaultLlm,
    },
  };
}

export function resolveConversationPageFeatures(
  page: ConversationPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): ConversationPageFeatures {
  const base = PAGE_CONVERSATION_FEATURES[page];
  const override = providerValue?.pages?.[page];
  return mergeConversationPageFeatures(base, override);
}

export function isProviderEnabledForPage(page: ConversationPageKey, providerKey: string) {
  return isEnabledByGate(providerKey, PAGE_CONVERSATION_FEATURES[page].mcp.providers);
}

export function isToolEnabledForPage(page: ConversationPageKey, toolId: string) {
  return isEnabledByGate(toolId, PAGE_CONVERSATION_FEATURES[page].mcp.tools);
}

export function isProviderEnabled(providerKey: string, features: ConversationPageFeatures) {
  return isEnabledByGate(providerKey, features.mcp.providers);
}

export function isToolEnabled(toolId: string, features: ConversationPageFeatures) {
  return isEnabledByGate(toolId, features.mcp.tools);
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
export const PAGE_CONVERSATION_FEATURES: Record<ConversationPageKey, ConversationPageFeatures> = {
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
      llmSelector: true,
      kbSelector: false,
      adminKbSelector: false,
      modeExisting: false,
      modeNew: true,
      routeSelector: false,
      inlineUserKbInput: true,
      defaultSetupMode: "new",
      defaultLlm: "chatgpt",
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
      llmSelector: true,
      kbSelector: true,
      adminKbSelector: true,
      modeExisting: true,
      modeNew: true,
      routeSelector: true,
      inlineUserKbInput: false,
      defaultSetupMode: "existing",
      defaultLlm: "chatgpt",
    },
  },
};
