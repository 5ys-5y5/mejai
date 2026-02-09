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

export async function fetchTranscriptSnapshot(
  sessionId: string,
  page: "/" | "/app/laboratory",
  kind: "conversation" | "issue"
) {
  return apiFetch<{
    found: boolean;
    transcript_text: string | null;
    created_at: string | null;
  }>(
    `/api/laboratory/transcript-snapshot?session_id=${encodeURIComponent(sessionId)}&page=${encodeURIComponent(page)}&kind=${encodeURIComponent(kind)}`
  );
}

export async function saveTranscriptSnapshot(input: {
  sessionId: string;
  page: "/" | "/app/laboratory";
  kind: "conversation" | "issue";
  transcriptText: string;
  turnId?: string | null;
}) {
  return apiFetch<{ ok: boolean }>("/api/laboratory/transcript-snapshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: input.sessionId,
      page: input.page,
      kind: input.kind,
      transcript_text: input.transcriptText,
      turn_id: input.turnId || null,
    }),
  });
}
