type DebugSnapshot = {
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

type MakeReplyParams = {
  text: string;
  llmModel?: string | null;
  tools?: string[];
  toolResults: Array<{ name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown }>;
  mcpSkipLogs: string[];
  getDebugSnapshot: (llmModel: string | null, tools: string[]) => DebugSnapshot;
  buildDebugPrefixJson: (payload: Record<string, unknown>) => Record<string, unknown>;
  currentDebugPrefixJson: Record<string, unknown> | null;
};

export function makeReplyWithDebug(params: MakeReplyParams): {
  text: string;
  lastDebugPrefixJson: Record<string, unknown> | null;
} {
  const {
    text,
    llmModel,
    tools,
    toolResults,
    mcpSkipLogs,
    getDebugSnapshot,
    buildDebugPrefixJson,
    currentDebugPrefixJson,
  } = params;

  let nextDebugPrefixJson = currentDebugPrefixJson;
  try {
    const mcpLogLines = toolResults.map((tool) => {
      const status = tool.ok ? "success" : "error";
      const error = tool.ok ? "" : String(tool.error || "MCP_ERROR");
      let count: number | null = null;
      if (tool.ok && tool.data) {
        const data = tool.data as any;
        if (Array.isArray(data)) count = data.length;
        else if (data && typeof data === "object") {
          if (typeof data.count === "number") count = data.count;
          else if (Array.isArray(data.items)) count = data.items.length;
          else if (Array.isArray(data.orders)) count = data.orders.length;
          else if (data.orders && Array.isArray(data.orders.order)) count = data.orders.order.length;
        }
      }
      const countText = count !== null ? ` (count=${count})` : "";
      return error ? `${tool.name}: ${status}${countText} - ${error}` : `${tool.name}: ${status}${countText}`;
    });
    const allMcpLogs = [...mcpLogLines, ...mcpSkipLogs];
    const snapshot = getDebugSnapshot(llmModel || null, tools || []);
    nextDebugPrefixJson = buildDebugPrefixJson({
      ...snapshot,
      mcpLogs: allMcpLogs,
    });
  } catch (error) {
    nextDebugPrefixJson =
      nextDebugPrefixJson ||
      buildDebugPrefixJson({
        llmModel: llmModel || null,
        mcpTools: tools || [],
        mcpProviders: [],
        mcpLastFunction: "none",
        mcpLastStatus: "none",
        mcpLastError: null,
        mcpLastCount: null,
        mcpLogs: [`make_reply_debug_fallback: ${error instanceof Error ? error.message : String(error)}`],
        providerAvailable: [],
      });
  }

  return { text, lastDebugPrefixJson: nextDebugPrefixJson };
}

type InsertTurnParams = {
  payload: Record<string, unknown>;
  currentDebugPrefixJson: Record<string, unknown> | null;
  getFallbackSnapshot: () => DebugSnapshot;
  buildDebugPrefixJson: (payload: Record<string, unknown>) => Record<string, unknown>;
  pendingIntentQueue: string[];
  insertFinalTurn: (context: any, payload: Record<string, unknown>, debugPrefixJson: Record<string, unknown>) => Promise<any>;
  context: any;
};

export async function insertTurnWithDebug(params: InsertTurnParams): Promise<{
  result: any;
  lastDebugPrefixJson: Record<string, unknown>;
  latestTurnId: string | null;
}> {
  const {
    payload,
    currentDebugPrefixJson,
    getFallbackSnapshot,
    buildDebugPrefixJson,
    pendingIntentQueue,
    insertFinalTurn,
    context,
  } = params;
  let nextDebugPrefixJson = currentDebugPrefixJson;

  if (!nextDebugPrefixJson) {
    nextDebugPrefixJson = buildDebugPrefixJson(getFallbackSnapshot());
  }

  if (!Object.prototype.hasOwnProperty.call(payload, "failed")) {
    payload.failed = null;
  }
  if (pendingIntentQueue.length > 0) {
    const currentBotContext =
      payload.bot_context && typeof payload.bot_context === "object"
        ? ({ ...(payload.bot_context as Record<string, unknown>) } as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    payload.bot_context = {
      ...currentBotContext,
      intent_queue: pendingIntentQueue,
      intent_disambiguation_pending: false,
      intent_disambiguation_source_text: null,
    };
  }
  const result = await insertFinalTurn(context, payload, nextDebugPrefixJson);
  const latestTurnId = result.data?.id || null;
  return { result, lastDebugPrefixJson: nextDebugPrefixJson, latestTurnId };
}
