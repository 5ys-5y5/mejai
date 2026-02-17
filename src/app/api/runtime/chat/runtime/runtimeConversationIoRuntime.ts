import { insertTurnWithDebug, makeReplyWithDebug } from "./runtimeTurnIo";
import type { RuntimeContext } from "../shared/runtimeTypes";

type RuntimeStateSnapshot = {
  llmModel: string | null;
  mcpTools: string[];
  mcpProviders: string[];
  mcpLastFunction: string | null;
  mcpLastStatus: string | null;
  mcpLastError: string | null;
  mcpLastCount: number | null;
  mcpLogs: string[];
  providerConfig?: Record<string, any>;
  providerAvailable: string[];
  authSettingsId: string | null;
  userId: string;
  orgId: string | null;
  userPlan: string | null;
  userIsAdmin: boolean | null;
  userRole: string | null;
  kbUserId: string;
  kbAdminIds: string[];
  usedRuleIds: string[];
  usedTemplateIds: string[];
  usedToolPolicies: string[];
  slotExpectedInput: string | null;
  slotOrderId: string | null;
  slotPhone: string | null;
  slotPhoneMasked: string;
  slotZipcode: string | null;
  slotAddress: string | null;
  slotExpectedInputPrev?: string | null;
  slotExpectedInputSource?: string | null;
  slotDerivedOrderId?: string | null;
  slotDerivedPhone?: string | null;
  slotDerivedZipcode?: string | null;
  slotDerivedAddress?: string | null;
  mcpCandidateCalls: string[];
  mcpSkipped: string[];
  policyInputRules: string[];
  policyToolRules: string[];
  contextContamination: string[];
  conversationMode: string;
  runtimeCallChain?: Array<{ module_path: string; function_name: string }>;
  templateOverrides?: Record<string, string>;
  requestDomain?: string | null;
  requestOrigin?: string | null;
  requestWidgetOrgIdPresent?: boolean;
  requestWidgetUserIdPresent?: boolean;
  requestWidgetAgentIdPresent?: boolean;
  requestWidgetSecretPresent?: boolean;
  agentIsActive?: boolean | null;
  agentResolvedFromParent?: boolean;
  agentMcpToolIdsRaw?: string[];
  userGroup?: Record<string, any> | null;
  kbAdminApplyGroups?: Array<Record<string, any>>;
  kbAdminApplyGroupsMode?: Array<string | null>;
  kbAdminFilterReasons?: Array<string>;
  modelSelectionReason?: string | null;
  modelSelectionInputLength?: number | null;
  modelSelectionLengthRuleHit?: boolean | null;
  modelSelectionKeywordRuleHit?: boolean | null;
  allowlistResolvedToolIds?: string[];
  allowlistAllowedToolNames?: string[];
  allowlistAllowedToolCount?: number | null;
  allowlistMissingExpectedTools?: string[];
  intentScopeMismatchReason?: string | null;
  policyConflicts?: Array<Record<string, any>>;
  policyConflictResolution?: string | null;
};

export function createRuntimeConversationIo(input: {
  context: RuntimeContext;
  insertFinalTurn: (
    context: RuntimeContext,
    payload: Record<string, any>,
    debugPrefixJson: Record<string, any>
  ) => Promise<Record<string, any>>;
  pendingIntentQueue: string[];
  orgId?: string | null;
  getSnapshot: (llmModel: string | null, tools: string[]) => RuntimeStateSnapshot;
  getFallbackSnapshot: () => RuntimeStateSnapshot;
  getToolResults: () => Array<{ name: string; ok: boolean; data?: Record<string, any>; error?: unknown }>;
  getMcpSkipLogs: () => string[];
  buildDebugPrefixJson: (payload: Record<string, any>) => Record<string, any>;
  getLastDebugPrefixJson: () => Record<string, any> | null;
  setLastDebugPrefixJson: (next: Record<string, any> | null) => void;
  setLatestTurnId: (id: string | null) => void;
  decorateReplyText?: (text: string) => string;
}) {
  const {
    context,
    insertFinalTurn,
    pendingIntentQueue,
    orgId,
    getSnapshot,
    getFallbackSnapshot,
    getToolResults,
    getMcpSkipLogs,
    buildDebugPrefixJson,
    getLastDebugPrefixJson,
    setLastDebugPrefixJson,
    setLatestTurnId,
    decorateReplyText,
  } = input;

  function makeReply(text: string, llmModel?: string | null, tools?: string[]) {
    const decoratedText = decorateReplyText ? decorateReplyText(text) : text;
    const made = makeReplyWithDebug({
      text: decoratedText,
      llmModel,
      tools,
      toolResults: getToolResults(),
      mcpSkipLogs: getMcpSkipLogs(),
      getDebugSnapshot: (resolvedLlmModel, resolvedTools) => getSnapshot(resolvedLlmModel, resolvedTools),
      buildDebugPrefixJson,
      currentDebugPrefixJson: getLastDebugPrefixJson(),
    });
    setLastDebugPrefixJson(made.lastDebugPrefixJson);
    return made.text;
  }

  async function insertTurn(payload: Record<string, any>) {
    const inserted = await insertTurnWithDebug({
      payload,
      currentDebugPrefixJson: getLastDebugPrefixJson(),
      getFallbackSnapshot,
      buildDebugPrefixJson,
      pendingIntentQueue,
      insertFinalTurn,
      context,
      orgId,
    });
    setLastDebugPrefixJson(inserted.lastDebugPrefixJson);
    setLatestTurnId(inserted.latestTurnId);
    return inserted.result;
  }

  return { makeReply, insertTurn };
}


