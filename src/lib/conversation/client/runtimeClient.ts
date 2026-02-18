import { apiFetch } from "@/lib/apiClient";
import type { LogBundle, DebugTranscriptOptions } from "@/lib/debugTranscript";
import type { RuntimeRunResponseLike } from "@/lib/runtimeResponseTranscript";
import { resolvePageConversationDebugOptions, type CopyPageKey } from "@/lib/transcriptCopyPolicy";
import type { ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";

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

export async function fetchWidgetSessionLogs(sessionId: string, widgetToken: string, limit = 30) {
  const res = await fetch(
    `/api/widget/logs?session_id=${encodeURIComponent(sessionId)}&limit=${Math.max(1, limit)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${widgetToken}`,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text || res.statusText || "REQUEST_FAILED";
    throw new Error(message);
  }
  return res.json() as Promise<{
    mcp_logs: NonNullable<LogBundle["mcp_logs"]>;
    event_logs: NonNullable<LogBundle["event_logs"]>;
    debug_logs: NonNullable<LogBundle["debug_logs"]>;
  }>;
}

export async function fetchTranscriptSnapshot(
  sessionId: string,
  page: CopyPageKey,
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

export async function fetchTranscriptCopy(input: {
  sessionId: string;
  page: CopyPageKey;
  kind: "conversation" | "issue";
  limit?: number;
}) {
  return apiFetch<{
    ok: boolean;
    transcript_text: string | null;
  }>("/api/transcript/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: input.sessionId,
      page: input.page,
      kind: input.kind,
      limit: input.limit,
    }),
  });
}

export async function fetchConversationDebugOptions(page: CopyPageKey): Promise<DebugTranscriptOptions | null> {
  const path = "/api/auth-settings/providers?provider=chat_policy";
  try {
    const payload = await apiFetch<{ provider?: ConversationFeaturesProviderShape }>(path, { cache: "no-store" });
    return resolvePageConversationDebugOptions(page, payload.provider || null);
  } catch {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      const payload = (await res.json()) as { provider?: ConversationFeaturesProviderShape };
      return resolvePageConversationDebugOptions(page, payload.provider || null);
    } catch {
      return null;
    }
  }
}

export async function fetchWidgetTranscriptCopy(input: {
  sessionId: string;
  widgetToken: string;
  page: CopyPageKey;
  kind: "conversation" | "issue";
  limit?: number;
}) {
  const res = await fetch("/api/transcript/copy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.widgetToken}`,
    },
    body: JSON.stringify({
      session_id: input.sessionId,
      page: input.page,
      kind: input.kind,
      limit: input.limit,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || "REQUEST_FAILED");
  }
  return res.json() as Promise<{ ok: boolean; transcript_text: string | null }>;
}

export async function saveTranscriptSnapshot(input: {
  sessionId: string;
  page: CopyPageKey;
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
