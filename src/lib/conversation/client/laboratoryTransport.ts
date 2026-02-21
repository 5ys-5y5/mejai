import { fetchSessionLogs, runConversation, type RuntimeRunResponse } from "@/lib/conversation/client/runtimeClient";
import { resolveServiceEndUserPayload } from "@/lib/conversation/client/endUserContext";
import { resolveRuntimeFlags } from "@/lib/runtimeFlags";

export type LaboratoryRunConfig = {
  route: string;
  llm: string;
  kbId: string;
  adminKbIds: string[];
  mcpProviderKeys: string[];
  mcpToolIds: string[];
  inlineKb?: string;
};

function makeTraceId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export async function sendLaboratoryMessage(
  config: LaboratoryRunConfig,
  sessionId: string | null,
  message: string,
  selectedAgentId?: string,
  hooks?: { onProgress?: (line: string) => void },
  pageKey: string = "/app/laboratory"
): Promise<RuntimeRunResponse> {
  const traceId = makeTraceId("labc");
  const startedAt = performance.now();
  hooks?.onProgress?.(`\uC694\uCCAD \uC2DC\uC791 (trace=${traceId})`);
  console.info("[laboratory/client][timing]", {
    trace_id: traceId,
    phase: "request_start",
    is_first_turn: !sessionId,
    has_agent_id: Boolean(selectedAgentId),
    message_len: message.length,
  });
  try {
    const endUserPayload = await resolveServiceEndUserPayload();
    const runtimeFlags = resolveRuntimeFlags();
    const res = await runConversation(
      "/api/laboratory/run",
      {
        page_key: pageKey,
        route: config.route,
        llm: config.llm,
        kb_id: config.kbId,
        inline_kb: config.inlineKb?.trim() || undefined,
        admin_kb_ids: config.adminKbIds,
        mcp_tool_ids: config.mcpToolIds,
        mcp_provider_keys: config.mcpProviderKeys,
        message,
        session_id: sessionId || undefined,
        agent_id: selectedAgentId || undefined,
        runtime_flags: runtimeFlags,
        ...(endUserPayload || {}),
      },
      traceId
    );
    console.info("[laboratory/client][timing]", {
      trace_id: traceId,
      phase: "request_done",
      total_ms: Number((performance.now() - startedAt).toFixed(1)),
      session_id: res.session_id || null,
      turn_id: res.turn_id || null,
    });
    hooks?.onProgress?.(
      `\uC751\uB2F5 \uC644\uB8CC (${Number((performance.now() - startedAt).toFixed(1))}ms, session=${res.session_id || "-"})`
    );
    return res;
  } catch (error) {
    console.info("[laboratory/client][timing]", {
      trace_id: traceId,
      phase: "request_failed",
      total_ms: Number((performance.now() - startedAt).toFixed(1)),
      error: error instanceof Error ? error.message : String(error),
    });
    hooks?.onProgress?.(`\uC694\uCCAD \uC2E4\uD328: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function loadLaboratoryLogs(
  sessionId: string,
  sinceIso?: string | null,
  limit = 30
) {
  const data = await fetchSessionLogs(sessionId, limit);
  const sinceTs = sinceIso ? toTimestamp(sinceIso) : 0;
  const mcpLogs = (data.mcp_logs || []).filter((log) => toTimestamp(log.created_at) > sinceTs);
  const eventLogs = (data.event_logs || []).filter((log) => toTimestamp(log.created_at) > sinceTs);
  const debugLogs = (data.debug_logs || []).filter((log) => toTimestamp(log.created_at) > sinceTs);
  const newestTs = Math.max(
    ...[...data.mcp_logs, ...data.event_logs, ...(data.debug_logs || [])].map((log) => toTimestamp(log.created_at)),
    sinceTs
  );
  return {
    mcpLogs,
    eventLogs,
    debugLogs,
    newestIso: newestTs > 0 ? new Date(newestTs).toISOString() : sinceIso || null,
  };
}
