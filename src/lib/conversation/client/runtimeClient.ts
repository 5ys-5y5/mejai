import { apiFetch } from "@/lib/apiClient";
import type { LogBundle } from "@/lib/debugTranscript";
import type { RuntimeRunResponseLike } from "@/lib/runtimeResponseTranscript";

export type RuntimeRunResponse = RuntimeRunResponseLike & {
  session_id: string;
  message?: string;
  rich_message_html?: string;
};

export async function runConversation(
  endpoint: string,
  body: Record<string, unknown>,
  traceId?: string
) {
  return apiFetch<RuntimeRunResponse>(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(traceId ? { "x-runtime-trace-id": traceId } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function fetchSessionLogs(sessionId: string, limit = 30) {
  return apiFetch<{
    mcp_logs: NonNullable<LogBundle["mcp_logs"]>;
    event_logs: NonNullable<LogBundle["event_logs"]>;
    debug_logs: NonNullable<LogBundle["debug_logs"]>;
  }>(`/api/laboratory/logs?session_id=${encodeURIComponent(sessionId)}&limit=${Math.max(1, limit)}`);
}
