import { insertTurnWithDebug, makeReplyWithDebug } from "./runtimeTurnIo";

type RuntimeStateSnapshot = {
  llmModel: string | null;
  mcpTools: string[];
  mcpProviders: string[];
  mcpLastFunction: string | null;
  mcpLastStatus: string | null;
  mcpLastError: string | null;
  mcpLastCount: number | null;
  mcpLogs: string[];
  providerConfig?: Record<string, unknown>;
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
  mcpCandidateCalls: string[];
  mcpSkipped: string[];
  policyInputRules: string[];
  policyToolRules: string[];
  contextContamination: string[];
  conversationMode: string;
};

export function createRuntimeConversationIo(input: {
  context: any;
  insertFinalTurn: (context: any, payload: Record<string, unknown>, debugPrefixJson: Record<string, unknown>) => Promise<any>;
  pendingIntentQueue: string[];
  getSnapshot: (llmModel: string | null, tools: string[]) => RuntimeStateSnapshot;
  getFallbackSnapshot: () => RuntimeStateSnapshot;
  getToolResults: () => Array<{ name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown }>;
  getMcpSkipLogs: () => string[];
  buildDebugPrefixJson: (payload: Record<string, unknown>) => Record<string, unknown>;
  getLastDebugPrefixJson: () => Record<string, unknown> | null;
  setLastDebugPrefixJson: (next: Record<string, unknown> | null) => void;
  setLatestTurnId: (id: string | null) => void;
}) {
  const {
    context,
    insertFinalTurn,
    pendingIntentQueue,
    getSnapshot,
    getFallbackSnapshot,
    getToolResults,
    getMcpSkipLogs,
    buildDebugPrefixJson,
    getLastDebugPrefixJson,
    setLastDebugPrefixJson,
    setLatestTurnId,
  } = input;

  function makeReply(text: string, llmModel?: string | null, tools?: string[]) {
    const made = makeReplyWithDebug({
      text,
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

  async function insertTurn(payload: Record<string, unknown>) {
    const inserted = await insertTurnWithDebug({
      payload,
      currentDebugPrefixJson: getLastDebugPrefixJson(),
      getFallbackSnapshot,
      buildDebugPrefixJson,
      pendingIntentQueue,
      insertFinalTurn,
      context,
    });
    setLastDebugPrefixJson(inserted.lastDebugPrefixJson);
    setLatestTurnId(inserted.latestTurnId);
    return inserted.result;
  }

  return { makeReply, insertTurn };
}

