import { DEFAULT_TOOL_PROVIDER_MAP } from "./mcpToolRegistry";
import { flushMcpSkipLogsWithAudit, updateMcpTracking } from "./toolRuntime";
import type { RuntimePipelineState } from "./runtimePipelineState";

export function createRuntimeMcpOps(input: {
  usedProviders: string[];
  mcpSkipLogs: string[];
  mcpSkipQueue: Array<{ tool: string; reason: string; args?: Record<string, any>; detail?: Record<string, any> }>;
  pipelineState: RuntimePipelineState;
  getResolvedIntent: () => string;
  getPolicyEntity: () => Record<string, any>;
  setTracking: (next: {
    lastMcpFunction: string | null;
    lastMcpStatus: string | null;
    lastMcpError: string | null;
    lastMcpCount: number | null;
  }) => void;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  context: any;
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

  const noteMcp = (name: string, result: { ok: boolean; error?: string; data?: Record<string, any> }) => {
    const tracking = updateMcpTracking({ name, result, toolProviderMap: DEFAULT_TOOL_PROVIDER_MAP, usedProviders });
    setTracking(tracking);
    pipelineState.usedProviders = usedProviders;
  };

  const noteMcpSkip = (
    name: string,
    reason: string,
    detail?: Record<string, any>,
    args?: Record<string, any>
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



