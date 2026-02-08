"use client";

import { useCallback, useMemo, useState } from "react";
import type { CopyPageKey } from "@/lib/transcriptCopyPolicy";
import type { LogBundle, TranscriptMessage } from "@/lib/debugTranscript";
import { mapRuntimeResponseToTranscriptFields } from "@/lib/runtimeResponseTranscript";
import { fetchSessionLogs, runConversation } from "@/lib/conversation/client/runtimeClient";
import { executeTranscriptCopy } from "@/lib/conversation/client/copyExecutor";

export type ConversationUiMessage = TranscriptMessage & {
  richHtml?: string;
  isLoading?: boolean;
  quickReplies?: Array<{ label: string; value: string }>;
  productCards?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    value: string;
  }>;
};

type LogBundleWithState = LogBundle & {
  logsError: string | null;
  logsLoading: boolean;
};

type InitialMessage = {
  role: "user" | "bot";
  content: string;
  richHtml?: string;
};

type ControllerOptions = {
  page: CopyPageKey;
  runEndpoint?: string;
  traceIdPrefix?: string;
  initialMessages?: InitialMessage[];
  makeRunBody: (args: { text: string; sessionId: string | null }) => Record<string, unknown>;
  mapErrorMessage?: (error: unknown) => string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeTraceId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useConversationController(options: ControllerOptions) {
  const [messages, setMessages] = useState<ConversationUiMessage[]>(
    () =>
      (options.initialMessages || []).map((item) => ({
        id: makeId(),
        role: item.role,
        content: item.content,
        richHtml: item.richHtml,
      })) as ConversationUiMessage[]
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [messageLogs, setMessageLogs] = useState<Record<string, LogBundleWithState>>({});

  const runEndpoint = options.runEndpoint || "/api/laboratory/run";
  const traceIdPrefix = options.traceIdPrefix || "conv";

  const loadTurnLogs = useCallback(async (messageId: string, targetSessionId?: string | null, turnId?: string | null) => {
    if (!targetSessionId || !turnId) return;
    setMessageLogs((prev) => ({
      ...prev,
      [messageId]: {
        mcp_logs: prev[messageId]?.mcp_logs || [],
        event_logs: prev[messageId]?.event_logs || [],
        debug_logs: prev[messageId]?.debug_logs || [],
        logsError: null,
        logsLoading: true,
      },
    }));
    try {
      const data = await fetchSessionLogs(targetSessionId, 30);
      const mcpLogs = (data.mcp_logs || []).filter((log) => log.turn_id === turnId);
      const eventLogs = (data.event_logs || []).filter((log) => log.turn_id === turnId);
      const debugLogs = (data.debug_logs || []).filter((log) => log.turn_id === turnId);
      setMessageLogs((prev) => ({
        ...prev,
        [messageId]: {
          mcp_logs: mcpLogs,
          event_logs: eventLogs,
          debug_logs: debugLogs,
          logsError: null,
          logsLoading: false,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그를 불러오지 못했습니다.";
      setMessageLogs((prev) => ({
        ...prev,
        [messageId]: {
          mcp_logs: prev[messageId]?.mcp_logs || [],
          event_logs: prev[messageId]?.event_logs || [],
          debug_logs: prev[messageId]?.debug_logs || [],
          logsError: message,
          logsLoading: false,
        },
      }));
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = String(text || "").trim();
      if (!trimmed || sending) return;
      setSending(true);
      const userId = makeId();
      const loadingId = makeId();
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content: trimmed },
        { id: loadingId, role: "bot", content: "답변 생성 중...", isLoading: true },
      ]);
      try {
        const res = await runConversation(
          runEndpoint,
          options.makeRunBody({ text: trimmed, sessionId }),
          makeTraceId(traceIdPrefix)
        );
        const mapped = mapRuntimeResponseToTranscriptFields(res);
        const nextSessionId = res.session_id || sessionId;
        setSessionId(nextSessionId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingId
              ? {
                  ...msg,
                  content: res.message || "응답을 받지 못했습니다. 다시 시도해 주세요.",
                  richHtml: res.rich_message_html || undefined,
                  turnId: mapped.turnId,
                  responseSchema: mapped.responseSchema,
                  responseSchemaIssues: mapped.responseSchemaIssues,
                  quickReplyConfig: mapped.quickReplyConfig,
                  renderPlan: mapped.renderPlan,
                  quickReplies: mapped.quickReplies.length > 0 ? mapped.quickReplies : undefined,
                  productCards: mapped.productCards.length > 0 ? mapped.productCards : undefined,
                  isLoading: false,
                }
              : msg
          )
        );
        void loadTurnLogs(loadingId, nextSessionId, mapped.turnId);
      } catch (error) {
        const fallback = "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        const message = options.mapErrorMessage ? options.mapErrorMessage(error) : fallback;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingId
              ? {
                  ...msg,
                  content: message,
                  isLoading: false,
                }
              : msg
          )
        );
      } finally {
        setSending(false);
      }
    },
    [loadTurnLogs, options, runEndpoint, sending, sessionId, traceIdPrefix]
  );

  const copyByKind = useCallback(
    async (kind: "conversation" | "issue", enabledOverride?: boolean) => {
      return executeTranscriptCopy({
        page: options.page,
        kind,
        messages,
        selectedMessageIds,
        messageLogs,
        enabledOverride,
      });
    },
    [messageLogs, messages, options.page, selectedMessageIds]
  );

  const copyConversation = useCallback(async (enabledOverride?: boolean) => copyByKind("conversation", enabledOverride), [copyByKind]);
  const copyIssue = useCallback(async (enabledOverride?: boolean) => copyByKind("issue", enabledOverride), [copyByKind]);

  const toggleMessageSelection = useCallback((id: string) => {
    setSelectedMessageIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  return useMemo(
    () => ({
      messages,
      setMessages,
      sending,
      sessionId,
      setSessionId,
      selectedMessageIds,
      setSelectedMessageIds,
      toggleMessageSelection,
      messageLogs,
      send,
      copyConversation,
      copyIssue,
      loadTurnLogs,
    }),
    [
      copyConversation,
      copyIssue,
      loadTurnLogs,
      messageLogs,
      messages,
      selectedMessageIds,
      sending,
      send,
      sessionId,
      toggleMessageSelection,
    ]
  );
}
