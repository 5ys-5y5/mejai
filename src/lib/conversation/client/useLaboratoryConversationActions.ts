"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { mapRuntimeResponseToTranscriptFields } from "@/lib/runtimeResponseTranscript";
import { loadLaboratoryLogs, sendLaboratoryMessage, type LaboratoryRunConfig } from "@/lib/conversation/client/laboratoryTransport";
import { executeTranscriptCopy } from "@/lib/conversation/client/copyExecutor";
import { fetchTranscriptCopy, saveTranscriptSnapshot } from "@/lib/conversation/client/runtimeClient";
import type { DebugTranscriptOptions } from "@/lib/debugTranscript";
import type { TranscriptMessage, LogBundle } from "@/lib/debugTranscript";
import type { ConversationPageKey } from "@/lib/conversation/pageFeaturePolicy";

type ConversationMode = "history" | "edit" | "new";
type SetupMode = "existing" | "new";

type BaseMessage = TranscriptMessage & {
  richHtml?: string;
  isLoading?: boolean;
  loadingLogs?: string[];
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

type BaseLogBundle = LogBundle & {
  logsError: string | null;
  logsLoading: boolean;
};

type BaseModel<TMessage extends BaseMessage> = {
  id: string;
  config: LaboratoryRunConfig;
  sessionId: string | null;
  messages: TMessage[];
  selectedMessageIds: string[];
  messageLogs: Record<string, BaseLogBundle>;
  lastLogAt: string | null;
  input: string;
  sending: boolean;
  selectedAgentId: string;
  selectedSessionId: string | null;
  conversationMode: ConversationMode;
  editSessionId: string | null;
  setupMode: SetupMode;
  historyMessages: TMessage[];
  conversationSnapshotText?: string | null;
  issueSnapshotText?: string | null;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function visibleMessages<TMessage extends BaseMessage, TModel extends BaseModel<TMessage>>(target: TModel) {
  return target.conversationMode === "history"
    ? target.historyMessages
    : target.conversationMode === "edit"
      ? [...target.historyMessages, ...target.messages]
      : target.messages;
}

function resolveActiveSessionId<TMessage extends BaseMessage, TModel extends BaseModel<TMessage>>(target: TModel) {
  if (target.conversationMode === "history") return target.selectedSessionId || null;
  if (target.conversationMode === "edit") return target.editSessionId || target.sessionId || null;
  return target.sessionId || null;
}

function resolveSnapshotTurnId<TMessage extends BaseMessage>(
  messages: TMessage[],
  selectedMessageIds: string[]
) {
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

export function useLaboratoryConversationActions<TMessage extends BaseMessage, TModel extends BaseModel<TMessage>>(params: {
  models: TModel[];
  updateModel: (id: string, updater: (model: TModel) => TModel) => void;
  ensureEditableSession: (target: TModel) => Promise<string | null>;
  isAdminUser: boolean;
  pageKey?: ConversationPageKey;
}) {
  const { models, updateModel, ensureEditableSession, isAdminUser, pageKey = "/app/laboratory" } = params;

  const loadLogs = useCallback(
    async (id: string, messageId: string, sessionIdOverride?: string | null, turnIdOverride?: string | null) => {
      const target = models.find((model) => model.id === id);
      const sessionId = sessionIdOverride ?? target?.sessionId;
      if (!sessionId) return;
      const turnId = (turnIdOverride || "").trim();
      updateModel(id, (model) => ({
        ...model,
        messageLogs: {
          ...model.messageLogs,
          [messageId]: {
            mcp_logs: model.messageLogs[messageId]?.mcp_logs || [],
            event_logs: model.messageLogs[messageId]?.event_logs || [],
            debug_logs: model.messageLogs[messageId]?.debug_logs || [],
            logsError: null,
            logsLoading: true,
          },
        },
      }));
      try {
        const loaded = await loadLaboratoryLogs(sessionId, target?.lastLogAt, 30);
        const mcpLogs =
          turnId.length > 0
            ? loaded.mcpLogs.filter((log) => String(log.turn_id || "") === turnId)
            : loaded.mcpLogs;
        const eventLogs =
          turnId.length > 0
            ? loaded.eventLogs.filter((log) => String(log.turn_id || "") === turnId)
            : loaded.eventLogs;
        const debugLogs =
          turnId.length > 0
            ? loaded.debugLogs.filter((log) => String(log.turn_id || "") === turnId)
            : loaded.debugLogs;
        updateModel(id, (model) => ({
          ...model,
          messageLogs: {
            ...model.messageLogs,
            [messageId]: {
              mcp_logs: mcpLogs,
              event_logs: eventLogs,
              debug_logs: debugLogs,
              logsError: null,
              logsLoading: false,
            },
          },
          lastLogAt: loaded.newestIso || model.lastLogAt,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "로그를 불러오지 못했습니다.";
        updateModel(id, (model) => ({
          ...model,
          messageLogs: {
            ...model.messageLogs,
            [messageId]: {
              mcp_logs: [],
              event_logs: [],
              debug_logs: [],
              logsError: message,
              logsLoading: false,
            },
          },
        }));
      }
    },
    [models, updateModel]
  );

  const submitMessage = useCallback(
    async (modelId: string, text: string) => {
      const target = models.find((model) => model.id === modelId);
      if (!target) return false;
      if (!text) return;
      if (target.setupMode === "existing" && !target.selectedAgentId) {
        toast.error("에이전트를 선택하세요.");
        return;
      }
      if (target.setupMode === "existing" && target.conversationMode !== "new" && !target.selectedSessionId) {
        toast.error("세션을 선택하세요.");
        return;
      }
      if (target.conversationMode === "history") return;
      if (target.setupMode === "existing" && !target.config.kbId) {
        toast.error("KB를 선택하세요.");
        return;
      }
      updateModel(modelId, (model) => ({
        ...model,
        input: "",
        sending: true,
      }));

      const userMessage = { id: makeId(), role: "user" as const, content: text } as unknown as TMessage;
      const loadingMessageId = makeId();
      const loadingStartedAt = Date.now();
      const appendLoadingLog = (line: string) => {
        if (!isAdminUser) return;
        const safe = String(line || "").trim();
        if (!safe) return;
        updateModel(modelId, (model) => ({
          ...model,
          messages: model.messages.map((msg) => {
            if (msg.id !== loadingMessageId || msg.role !== "bot" || !msg.isLoading) return msg;
            const nextLogs = [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} ${safe}`].slice(-12);
            return { ...msg, loadingLogs: nextLogs };
          }),
        }));
      };
      updateModel(modelId, (model) => ({
        ...model,
        messages: [
          ...model.messages,
          userMessage,
          {
            id: loadingMessageId,
            role: "bot",
            content: "답변 생성 중...",
            isLoading: true,
            loadingLogs: isAdminUser ? ["요청 준비 중..."] : undefined,
          } as unknown as TMessage,
        ],
      }));
      appendLoadingLog("요청 페이로드 구성 완료");

      const loadingTicker = isAdminUser
        ? window.setInterval(() => {
            const elapsedSec = Math.max(1, Math.floor((Date.now() - loadingStartedAt) / 1000));
            appendLoadingLog(`응답 대기 중... ${elapsedSec}s`);
          }, 2500)
        : null;

      try {
        const activeSessionId = target.conversationMode === "new" ? target.sessionId : await ensureEditableSession(target);
        appendLoadingLog(activeSessionId ? `기존 세션 사용: ${activeSessionId}` : "신규 세션으로 요청");

        const result = await sendLaboratoryMessage(target.config, activeSessionId, text, target.selectedAgentId, {
          onProgress: appendLoadingLog,
        }, pageKey).then(
          (value) => ({ status: "fulfilled" as const, value }),
          (reason) => ({ status: "rejected" as const, reason })
        );

        if (result.status === "fulfilled") {
          const res = result.value;
          const botMessageId = res.message ? loadingMessageId : null;
          const transcriptFields = mapRuntimeResponseToTranscriptFields(res);
          const inlineLogs = res.log_bundle && typeof res.log_bundle === "object" ? res.log_bundle : null;
          const quickReplies = transcriptFields.quickReplies;
          const productCards = transcriptFields.productCards;
          const responseSchema = transcriptFields.responseSchema;
          const responseSchemaIssues = transcriptFields.responseSchemaIssues;
          const renderPlan = transcriptFields.renderPlan;
          updateModel(modelId, (model) => ({
            ...model,
            sessionId: res.session_id || model.sessionId,
            messages: model.messages
              .map((msg): TMessage => {
                if (msg.id !== loadingMessageId || msg.role !== "bot") return msg;
                if (!res.message) {
                  return { ...msg, role: "bot", isLoading: false, content: "" };
                }
                const persistedLogs = isAdminUser
                  ? [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} 답변 생성 완료`].slice(-20)
                  : undefined;
                return {
                  id: loadingMessageId,
                  role: "bot",
                  content: res.message || "",
                  richHtml: typeof res.rich_message_html === "string" ? res.rich_message_html : undefined,
                  turnId: transcriptFields.turnId,
                  isLoading: false,
                  loadingLogs: persistedLogs,
                  quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
                  productCards: productCards.length > 0 ? productCards : undefined,
                  responseSchema,
                  responseSchemaIssues:
                    responseSchemaIssues && responseSchemaIssues.length > 0 ? responseSchemaIssues : undefined,
                  renderPlan,
                } as unknown as TMessage;
              })
              .filter((msg) => !(msg.id === loadingMessageId && msg.role === "bot" && !msg.content)),
            sending: false,
          }));
          if (botMessageId && inlineLogs) {
            updateModel(modelId, (model) => ({
              ...model,
              messageLogs: {
                ...model.messageLogs,
                [botMessageId]: {
                  mcp_logs: inlineLogs.mcp_logs || [],
                  event_logs: inlineLogs.event_logs || [],
                  debug_logs: inlineLogs.debug_logs || [],
                  logsError: null,
                  logsLoading: false,
                },
              },
            }));
          }
          if (botMessageId && !inlineLogs) {
            await loadLogs(modelId, botMessageId, res.session_id || target.sessionId, transcriptFields.turnId);
          }
        } else {
          updateModel(modelId, (model) => ({
            ...model,
            messages: model.messages.map((msg) =>
              msg.id === loadingMessageId && msg.role === "bot"
                ? {
                    ...msg,
                    isLoading: false,
                    content: "응답 실패",
                    loadingLogs: isAdminUser
                      ? [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} 응답 실패`].slice(-20)
                      : undefined,
                  }
                : msg
            ),
            sending: false,
          }));
          toast.error("응답에 실패했습니다.");
        }
      } catch (err) {
        updateModel(modelId, (model) => ({
          ...model,
          messages: model.messages.map((msg) =>
            msg.id === loadingMessageId && msg.role === "bot"
              ? {
                  ...msg,
                  isLoading: false,
                  content: err instanceof Error ? `응답 실패: ${err.message}` : "응답 실패",
                  loadingLogs: isAdminUser
                    ? [...(msg.loadingLogs || []), `${new Date().toLocaleTimeString("ko-KR")} 예외 발생`].slice(-20)
                    : undefined,
                }
              : msg
          ),
          sending: false,
        }));
        toast.error("응답에 실패했습니다.");
      } finally {
        if (loadingTicker) {
          window.clearInterval(loadingTicker);
        }
      }
    },
    [ensureEditableSession, isAdminUser, loadLogs, models, pageKey, updateModel]
  );

  const copyConversation = useCallback(
    async (id: string, enabledOverride?: boolean, conversationDebugOptionsOverride?: DebugTranscriptOptions) => {
      const target = models.find((model) => model.id === id);
      if (!target) return false;
      const activeSessionId = resolveActiveSessionId(target);
      const viewMessages = visibleMessages(target);
      let prebuiltTextOverride: string | null = null;
      if (activeSessionId) {
        try {
          const serverCopy = await fetchTranscriptCopy({
            sessionId: activeSessionId,
            page: pageKey,
            kind: "conversation",
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
        page: pageKey,
        kind: "conversation",
        messages: viewMessages,
        selectedMessageIds: target.selectedMessageIds || [],
        messageLogs: target.messageLogs || {},
        enabledOverride,
        conversationDebugOptionsOverride,
        prebuiltTextOverride,
        blockedMessage: "이 페이지에서는 대화 복사를 지원하지 않습니다.",
        onCopiedText: async (text) => {
          const turnId = resolveSnapshotTurnId(viewMessages, target.selectedMessageIds || []);
          updateModel(id, (model) => ({ ...model, conversationSnapshotText: text }));
          if (!activeSessionId) return;
          await saveTranscriptSnapshot({
            sessionId: activeSessionId,
            page: pageKey,
            kind: "conversation",
            transcriptText: text,
            turnId,
          }).catch(() => null);
        },
      });
    },
    [models, pageKey, updateModel]
  );

  const copyIssue = useCallback(
    async (id: string, enabledOverride?: boolean) => {
      const target = models.find((model) => model.id === id);
      if (!target) return false;
      const activeSessionId = resolveActiveSessionId(target);
      const viewMessages = visibleMessages(target);
      let prebuiltTextOverride: string | null = null;
      if (activeSessionId) {
        try {
          const serverCopy = await fetchTranscriptCopy({
            sessionId: activeSessionId,
            page: pageKey,
            kind: "issue",
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
        page: pageKey,
        kind: "issue",
        messages: viewMessages,
        selectedMessageIds: target.selectedMessageIds || [],
        messageLogs: target.messageLogs || {},
        enabledOverride,
        prebuiltTextOverride,
        blockedMessage: "이 페이지에서는 문제 로그 복사를 지원하지 않습니다.",
        onCopiedText: async (text) => {
          const turnId = resolveSnapshotTurnId(viewMessages, target.selectedMessageIds || []);
          updateModel(id, (model) => ({ ...model, issueSnapshotText: text }));
          if (!activeSessionId) return;
          await saveTranscriptSnapshot({
            sessionId: activeSessionId,
            page: pageKey,
            kind: "issue",
            transcriptText: text,
            turnId,
          }).catch(() => null);
        },
      });
    },
    [models, pageKey, updateModel]
  );

  return {
    submitMessage,
    copyConversation,
    copyIssue,
    loadLogs,
  };
}
