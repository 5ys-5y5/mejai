import { flushMcpSkipLogsWithAudit, updateMcpTracking } from "./toolRuntime";
import type { RuntimePipelineState } from "./runtimePipelineState";

const DEFAULT_TOOL_PROVIDER_MAP: Record<string, string> = {
  find_customer_by_phone: "cafe24",
  lookup_order: "cafe24",
  track_shipment: "cafe24",
  create_ticket: "cafe24",
  list_orders: "cafe24",
  send_otp: "solapi",
  verify_otp: "solapi",
  update_order_shipping_address: "cafe24",
};

export function createRuntimeMcpOps(input: {
  usedProviders: string[];
  mcpSkipLogs: string[];
  mcpSkipQueue: Array<{ tool: string; reason: string; args?: Record<string, unknown>; detail?: Record<string, unknown> }>;
  pipelineState: RuntimePipelineState;
  getResolvedIntent: () => string;
  getPolicyEntity: () => Record<string, unknown>;
  setTracking: (next: {
    lastMcpFunction: string | null;
    lastMcpStatus: string | null;
    lastMcpError: string | null;
    lastMcpCount: number | null;
  }) => void;
  insertEvent: (
    context: unknown,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  context: unknown;
  sessionId: string;
  getLatestTurnId: () => string | null;
  allowedToolIdByName: Map<string, string>;
  allowedToolVersionByName: Map<string, string | null>;
  nowIso: () => string;
}) {
  const {
    usedProviders,
    mcpSkipLogs,
    mcpSkipQueue,
    pipelineState,
    getResolvedIntent,
    getPolicyEntity,
    setTracking,
    insertEvent,
    context,
    sessionId,
    getLatestTurnId,
    allowedToolIdByName,
    allowedToolVersionByName,
    nowIso,
  } = input;

  const noteMcp = (name: string, result: { ok: boolean; error?: string; data?: Record<string, unknown> }) => {
    const tracking = updateMcpTracking({ name, result, toolProviderMap: DEFAULT_TOOL_PROVIDER_MAP, usedProviders });
    setTracking(tracking);
    pipelineState.usedProviders = usedProviders;
  };

  const noteMcpSkip = (
    name: string,
    reason: string,
    detail?: Record<string, unknown>,
    args?: Record<string, unknown>
  ) => {
    const provider = DEFAULT_TOOL_PROVIDER_MAP[name];
    if (provider) usedProviders.push(provider);
    const detailText = detail ? ` (${JSON.stringify(detail)})` : "";
    mcpSkipLogs.push(`${name}: skipped - ${reason}${detailText}`);
    mcpSkipQueue.push({ tool: name, reason, args, detail });
    setTracking({
      lastMcpFunction: name,
      lastMcpStatus: "skipped",
      lastMcpError: reason,
      lastMcpCount: null,
    });
    pipelineState.mcpSkipLogs = mcpSkipLogs;
    pipelineState.mcpSkipQueue = mcpSkipQueue;
    pipelineState.usedProviders = usedProviders;
  };

  const flushMcpSkipLogs = async () =>
    flushMcpSkipLogsWithAudit({
      mcpSkipQueue,
      insertEvent,
      context,
      sessionId,
      latestTurnId: getLatestTurnId(),
      resolvedIntent: getResolvedIntent(),
      policyEntity: getPolicyEntity(),
      allowedToolIdByName,
      allowedToolVersionByName,
      nowIso,
    });

  return { noteMcp, noteMcpSkip, flushMcpSkipLogs };
}

