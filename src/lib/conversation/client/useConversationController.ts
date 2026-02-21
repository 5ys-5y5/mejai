"use client";

import { useCallback, useMemo, useState } from "react";
import type { CopyPageKey } from "@/lib/transcriptCopyPolicy";
import type { DebugTranscriptOptions, LogBundle, TranscriptMessage } from "@/lib/debugTranscript";
import { buildRuntimeBotMessageFields } from "@/lib/conversation/client/runtimeMessageMapping";
import {
  fetchConversationDebugOptions,
  fetchSessionLogs,
  fetchTranscriptCopy,
  runConversation,
  saveTranscriptSnapshot,
} from "@/lib/conversation/client/runtimeClient";
import { executeTranscriptCopy } from "@/lib/conversation/client/copyExecutor";
import { resolveServiceEndUserPayload } from "@/lib/conversation/client/endUserContext";
import { resolveRuntimeFlags } from "@/lib/runtimeFlags";

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

function resolveSnapshotTurnId(messages: ConversationUiMessage[], selectedMessageIds: string[]) {
  const selected = new Set((selectedMessageIds || []).filter(Boolean));
  const fromSelected = [...messages]
    .reverse()
    .find((msg) => msg.role === "bot" && selected.has(msg.id) && String(msg.turnId || "").trim().length > 0);
  if (fromSelected?.turnId) return String(fromSelected.turnId).trim();
  const fromAll = [...messages]
    .reverse()
    .find((msg) => msg.role === "bot" && String(msg.turnId || "").trim().length > 0);
  return fromAll?.turnId ? String(fromAll.turnId).trim() : null;
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
        const baseBody = options.makeRunBody({ text: trimmed, sessionId });
        const endUserPayload = await resolveServiceEndUserPayload();
        const shouldApplyEndUser =
          Boolean(endUserPayload) &&
          !Object.prototype.hasOwnProperty.call(baseBody, "end_user") &&
          !Object.prototype.hasOwnProperty.call(baseBody, "visitor");
        const shouldApplyRuntimeFlags = !Object.prototype.hasOwnProperty.call(baseBody, "runtime_flags");
        const finalBody = {
          ...baseBody,
          ...(shouldApplyEndUser ? endUserPayload : {}),
          ...(shouldApplyRuntimeFlags ? { runtime_flags: resolveRuntimeFlags() } : {}),
        };
        const res = await runConversation(
          runEndpoint,
          finalBody,
          makeTraceId(traceIdPrefix)
        );
        const botFields = buildRuntimeBotMessageFields(res);
        const nextSessionId = res.session_id || sessionId;
        const inlineLogs = res.log_bundle && typeof res.log_bundle === "object" ? res.log_bundle : null;
        setSessionId(nextSessionId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingId
              ? {
                  ...msg,
                  ...botFields,
                  content:
                    botFields.content ||
                    "응답을 생성하지 못했습니다. 다시 시도해 주세요.",
                  isLoading: false,
                }
              : msg
          )
        );
        if (inlineLogs) {
          setMessageLogs((prev) => ({
            ...prev,
            [loadingId]: {
              mcp_logs: inlineLogs.mcp_logs || [],
              event_logs: inlineLogs.event_logs || [],
              debug_logs: inlineLogs.debug_logs || [],
              logsError: null,
              logsLoading: false,
            },
          }));
        } else {
          void loadTurnLogs(loadingId, nextSessionId, botFields.turnId || null);
        }
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
    async (kind: "conversation" | "issue", enabledOverride?: boolean, conversationDebugOptionsOverride?: DebugTranscriptOptions) => {
      const latestDebugOptions =
        kind === "conversation" ? await fetchConversationDebugOptions(options.page).catch(() => null) : null;
      const effectiveDebugOptions = latestDebugOptions || conversationDebugOptionsOverride;
      let prebuiltTextOverride: string | null = null;
      const hasSelection = selectedMessageIds.length > 0;
      const hasUnpersisted = messages.some((msg) => msg.role === "bot" && !msg.turnId);
      if (sessionId && !hasSelection && !hasUnpersisted) {
        try {
          const serverCopy = await fetchTranscriptCopy({
            sessionId,
            page: options.page,
            kind,
            limit: 500,
          });
          if (typeof serverCopy?.transcript_text === "string") {
            prebuiltTextOverride = serverCopy.transcript_text;
          }
        } catch {
          // ignore; fall back to local builder
        }
      }
      return executeTranscriptCopy({
        page: options.page,
        kind,
        messages,
        selectedMessageIds,
        messageLogs,
        enabledOverride,
        conversationDebugOptionsOverride: effectiveDebugOptions || undefined,
        prebuiltTextOverride,
        onCopiedText: async (text) => {
          if (!sessionId) return;
          const turnId = resolveSnapshotTurnId(messages, selectedMessageIds);
          await saveTranscriptSnapshot({
            sessionId,
            page: options.page,
            kind,
            transcriptText: text,
            turnId,
          }).catch(() => null);
        },
      });
    },
    [messageLogs, messages, options.page, selectedMessageIds, sessionId]
  );

  const copyConversation = useCallback(
    async (enabledOverride?: boolean, conversationDebugOptionsOverride?: DebugTranscriptOptions) =>
      copyByKind("conversation", enabledOverride, conversationDebugOptionsOverride),
    [copyByKind]
  );
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
