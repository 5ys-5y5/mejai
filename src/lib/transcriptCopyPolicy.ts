import {
  buildDebugTranscript,
  buildIssueTranscript,
  type DebugTranscriptOptions,
  type LogBundle,
  type TranscriptMessage,
} from "@/lib/debugTranscript";
import {
  PAGE_CONVERSATION_FEATURES,
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";

export type CopyPageKey = ConversationPageKey;
export type CopyKind = "conversation" | "issue";
export type CopyDestination = "clipboard";

type CopyRule = {
  enabled: boolean;
  disabledReason?: string;
  formatter: "debug_transcript_v1" | "issue_transcript_v1";
  useSelectedMessages: boolean;
  debugOptions?: DebugTranscriptOptions;
};

export type PageCopyPolicy = {
  page: CopyPageKey;
  destinations: CopyDestination[];
  conversation: CopyRule;
  issue: CopyRule;
  note: string;
};

export const DEFAULT_CONVERSATION_DEBUG_OPTIONS: DebugTranscriptOptions = {
  outputMode: "full",
  includePrincipleHeader: true,
  includeResponseSchema: true,
  includeRenderPlan: true,
  includeQuickReplyRule: true,
  includeTurnLogs: true,
  includeTokenUnused: true,
  includeTurnId: true,
  auditBotScope: "runtime_turns_only",
  sections: {
    header: {
      enabled: true,
      principle: true,
      expectedLists: true,
      runtimeModules: true,
      auditStatus: true,
    },
    turn: {
      enabled: true,
      turnId: true,
      tokenUsed: true,
      tokenUnused: true,
      responseSchemaSummary: true,
      responseSchemaDetail: true,
      responseSchemaDetailFields: {},
      renderPlanSummary: true,
      renderPlanDetail: true,
      renderPlanDetailFields: {},
      quickReplyRule: true,
    },
    logs: {
      enabled: true,
      issueSummary: true,
      debug: {
        enabled: true,
        prefixJson: true,
        prefixJsonSections: {
          requestMeta: true,
          resolvedAgent: true,
          kbResolution: true,
          modelResolution: true,
          toolAllowlist: true,
          toolAllowlistResolvedToolIds: true,
          toolAllowlistAllowedToolNames: true,
          toolAllowlistAllowedToolCount: true,
          toolAllowlistMissingExpectedTools: true,
          toolAllowlistRequestedToolCount: true,
          toolAllowlistValidToolCount: true,
          toolAllowlistProviderSelectionCount: true,
          toolAllowlistProviderSelections: true,
          toolAllowlistToolsByIdCount: true,
          toolAllowlistToolsByProviderCount: true,
          toolAllowlistResolvedToolCount: true,
          toolAllowlistQueryError: true,
          toolAllowlistQueryErrorById: true,
          toolAllowlistQueryErrorByProvider: true,
          slotFlow: true,
          intentScope: true,
          policyConflicts: true,
          conflictResolution: true,
        },
      },
      mcp: {
        enabled: true,
        request: true,
        response: true,
        includeSuccess: true,
        includeError: true,
      },
      event: {
        enabled: true,
        payload: true,
        allowlist: [],
      },
    },
  },
};

function normalizeConversationDebugOptions(input?: Partial<DebugTranscriptOptions> | null): DebugTranscriptOptions {
  const headerInput = input?.sections?.header;
  const turnInput = input?.sections?.turn;
  const logsInput = input?.sections?.logs;
  const logsDebugInput = logsInput?.debug;
  const logsMcpInput = logsInput?.mcp;
  const logsEventInput = logsInput?.event;
  const defaultHeader = DEFAULT_CONVERSATION_DEBUG_OPTIONS.sections?.header;
  const defaultTurn = DEFAULT_CONVERSATION_DEBUG_OPTIONS.sections?.turn;
  const defaultLogs = DEFAULT_CONVERSATION_DEBUG_OPTIONS.sections?.logs;
  const defaultLogsDebug = defaultLogs?.debug;
  const defaultLogsMcp = defaultLogs?.mcp;
  const defaultLogsEvent = defaultLogs?.event;

  return {
    outputMode: input?.outputMode === "summary" ? "summary" : "full",
    includePrincipleHeader: input?.includePrincipleHeader ?? DEFAULT_CONVERSATION_DEBUG_OPTIONS.includePrincipleHeader,
    includeResponseSchema: input?.includeResponseSchema ?? DEFAULT_CONVERSATION_DEBUG_OPTIONS.includeResponseSchema,
    includeRenderPlan: input?.includeRenderPlan ?? DEFAULT_CONVERSATION_DEBUG_OPTIONS.includeRenderPlan,
    includeQuickReplyRule: input?.includeQuickReplyRule ?? DEFAULT_CONVERSATION_DEBUG_OPTIONS.includeQuickReplyRule,
    includeTurnLogs: input?.includeTurnLogs ?? DEFAULT_CONVERSATION_DEBUG_OPTIONS.includeTurnLogs,
    includeTokenUnused: input?.includeTokenUnused ?? DEFAULT_CONVERSATION_DEBUG_OPTIONS.includeTokenUnused,
    includeTurnId: input?.includeTurnId ?? DEFAULT_CONVERSATION_DEBUG_OPTIONS.includeTurnId,
    auditBotScope:
      input?.auditBotScope === "all_bot_messages" || input?.auditBotScope === "runtime_turns_only"
        ? input.auditBotScope
        : DEFAULT_CONVERSATION_DEBUG_OPTIONS.auditBotScope,
    sections: {
      header: {
        enabled: headerInput?.enabled ?? defaultHeader?.enabled,
        principle: headerInput?.principle ?? defaultHeader?.principle,
        expectedLists: headerInput?.expectedLists ?? defaultHeader?.expectedLists,
        runtimeModules: headerInput?.runtimeModules ?? defaultHeader?.runtimeModules,
        auditStatus: headerInput?.auditStatus ?? defaultHeader?.auditStatus,
      },
      turn: {
        enabled: turnInput?.enabled ?? defaultTurn?.enabled,
        turnId: turnInput?.turnId ?? defaultTurn?.turnId,
        tokenUsed: turnInput?.tokenUsed ?? defaultTurn?.tokenUsed,
        tokenUnused: turnInput?.tokenUnused ?? defaultTurn?.tokenUnused,
        responseSchemaSummary: turnInput?.responseSchemaSummary ?? defaultTurn?.responseSchemaSummary,
        responseSchemaDetail: turnInput?.responseSchemaDetail ?? defaultTurn?.responseSchemaDetail,
        responseSchemaDetailFields: turnInput?.responseSchemaDetailFields ?? defaultTurn?.responseSchemaDetailFields ?? {},
        renderPlanSummary: turnInput?.renderPlanSummary ?? defaultTurn?.renderPlanSummary,
        renderPlanDetail: turnInput?.renderPlanDetail ?? defaultTurn?.renderPlanDetail,
        renderPlanDetailFields: turnInput?.renderPlanDetailFields ?? defaultTurn?.renderPlanDetailFields ?? {},
        quickReplyRule: turnInput?.quickReplyRule ?? defaultTurn?.quickReplyRule,
      },
      logs: {
        enabled: logsInput?.enabled ?? defaultLogs?.enabled,
        issueSummary: logsInput?.issueSummary ?? defaultLogs?.issueSummary,
      debug: {
        enabled: logsDebugInput?.enabled ?? defaultLogsDebug?.enabled,
        prefixJson: logsDebugInput?.prefixJson ?? defaultLogsDebug?.prefixJson,
        prefixJsonSections: {
          requestMeta: logsDebugInput?.prefixJsonSections?.requestMeta ?? defaultLogsDebug?.prefixJsonSections?.requestMeta,
          resolvedAgent: logsDebugInput?.prefixJsonSections?.resolvedAgent ?? defaultLogsDebug?.prefixJsonSections?.resolvedAgent,
          kbResolution: logsDebugInput?.prefixJsonSections?.kbResolution ?? defaultLogsDebug?.prefixJsonSections?.kbResolution,
          modelResolution: logsDebugInput?.prefixJsonSections?.modelResolution ?? defaultLogsDebug?.prefixJsonSections?.modelResolution,
          toolAllowlist: logsDebugInput?.prefixJsonSections?.toolAllowlist ?? defaultLogsDebug?.prefixJsonSections?.toolAllowlist,
          toolAllowlistResolvedToolIds:
            logsDebugInput?.prefixJsonSections?.toolAllowlistResolvedToolIds ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistResolvedToolIds,
          toolAllowlistAllowedToolNames:
            logsDebugInput?.prefixJsonSections?.toolAllowlistAllowedToolNames ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistAllowedToolNames,
          toolAllowlistAllowedToolCount:
            logsDebugInput?.prefixJsonSections?.toolAllowlistAllowedToolCount ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistAllowedToolCount,
          toolAllowlistMissingExpectedTools:
            logsDebugInput?.prefixJsonSections?.toolAllowlistMissingExpectedTools ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistMissingExpectedTools,
          toolAllowlistRequestedToolCount:
            logsDebugInput?.prefixJsonSections?.toolAllowlistRequestedToolCount ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistRequestedToolCount,
          toolAllowlistValidToolCount:
            logsDebugInput?.prefixJsonSections?.toolAllowlistValidToolCount ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistValidToolCount,
          toolAllowlistProviderSelectionCount:
            logsDebugInput?.prefixJsonSections?.toolAllowlistProviderSelectionCount ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistProviderSelectionCount,
          toolAllowlistProviderSelections:
            logsDebugInput?.prefixJsonSections?.toolAllowlistProviderSelections ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistProviderSelections,
          toolAllowlistToolsByIdCount:
            logsDebugInput?.prefixJsonSections?.toolAllowlistToolsByIdCount ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistToolsByIdCount,
          toolAllowlistToolsByProviderCount:
            logsDebugInput?.prefixJsonSections?.toolAllowlistToolsByProviderCount ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistToolsByProviderCount,
          toolAllowlistResolvedToolCount:
            logsDebugInput?.prefixJsonSections?.toolAllowlistResolvedToolCount ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistResolvedToolCount,
          toolAllowlistQueryError:
            logsDebugInput?.prefixJsonSections?.toolAllowlistQueryError ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistQueryError,
          toolAllowlistQueryErrorById:
            logsDebugInput?.prefixJsonSections?.toolAllowlistQueryErrorById ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistQueryErrorById,
          toolAllowlistQueryErrorByProvider:
            logsDebugInput?.prefixJsonSections?.toolAllowlistQueryErrorByProvider ??
            defaultLogsDebug?.prefixJsonSections?.toolAllowlistQueryErrorByProvider,
          slotFlow: logsDebugInput?.prefixJsonSections?.slotFlow ?? defaultLogsDebug?.prefixJsonSections?.slotFlow,
          intentScope: logsDebugInput?.prefixJsonSections?.intentScope ?? defaultLogsDebug?.prefixJsonSections?.intentScope,
          policyConflicts: logsDebugInput?.prefixJsonSections?.policyConflicts ?? defaultLogsDebug?.prefixJsonSections?.policyConflicts,
          conflictResolution: logsDebugInput?.prefixJsonSections?.conflictResolution ?? defaultLogsDebug?.prefixJsonSections?.conflictResolution,
        },
      },
        mcp: {
          enabled: logsMcpInput?.enabled ?? defaultLogsMcp?.enabled,
          request: logsMcpInput?.request ?? defaultLogsMcp?.request,
          response: logsMcpInput?.response ?? defaultLogsMcp?.response,
          includeSuccess: logsMcpInput?.includeSuccess ?? defaultLogsMcp?.includeSuccess,
          includeError: logsMcpInput?.includeError ?? defaultLogsMcp?.includeError,
        },
        event: {
          enabled: logsEventInput?.enabled ?? defaultLogsEvent?.enabled,
          payload: logsEventInput?.payload ?? defaultLogsEvent?.payload,
          allowlist: Array.isArray(logsEventInput?.allowlist)
            ? logsEventInput?.allowlist.map((item) => String(item || "").trim()).filter(Boolean)
            : defaultLogsEvent?.allowlist || [],
        },
      },
    },
  };
}

export function resolvePageConversationDebugOptions(
  page: CopyPageKey,
  providerValue?: ConversationFeaturesProviderShape | null
): DebugTranscriptOptions {
  const override = providerValue?.debug_copy?.[page];
  return normalizeConversationDebugOptions(override || null);
}

export const PAGE_COPY_POLICY: Record<CopyPageKey, PageCopyPolicy> = {
  "/": {
    page: "/",
    destinations: ["clipboard"],
    conversation: {
      enabled: PAGE_CONVERSATION_FEATURES["/"].adminPanel.copyConversation,
      formatter: "debug_transcript_v1",
      useSelectedMessages: true,
      debugOptions: DEFAULT_CONVERSATION_DEBUG_OPTIONS,
    },
    issue: {
      enabled: PAGE_CONVERSATION_FEATURES["/"].adminPanel.copyIssue,
      // disabledReason: "랜딩 페이지에서는 문제 로그 복사를 지원하지 않습니다.",
      formatter: "issue_transcript_v1",
      useSelectedMessages: false,
    },
    note: "랜딩/실험실 대화 복사 정책",
  },
  "/app/laboratory": {
    page: "/app/laboratory",
    destinations: ["clipboard"],
    conversation: {
      enabled: PAGE_CONVERSATION_FEATURES["/app/laboratory"].adminPanel.copyConversation,
      formatter: "debug_transcript_v1",
      useSelectedMessages: true,
      debugOptions: DEFAULT_CONVERSATION_DEBUG_OPTIONS,
    },
    issue: {
      enabled: PAGE_CONVERSATION_FEATURES["/app/laboratory"].adminPanel.copyIssue,
      formatter: "issue_transcript_v1",
      useSelectedMessages: false,
    },
    note: "랜딩/실험실 대화 복사 정책",
  },
  [WIDGET_PAGE_KEY]: {
    page: WIDGET_PAGE_KEY,
    destinations: ["clipboard"],
    conversation: {
      enabled: PAGE_CONVERSATION_FEATURES[WIDGET_PAGE_KEY].adminPanel.copyConversation,
      formatter: "debug_transcript_v1",
      useSelectedMessages: true,
      debugOptions: DEFAULT_CONVERSATION_DEBUG_OPTIONS,
    },
    issue: {
      enabled: PAGE_CONVERSATION_FEATURES[WIDGET_PAGE_KEY].adminPanel.copyIssue,
      formatter: "issue_transcript_v1",
      useSelectedMessages: false,
    },
    note: "위젯 대화 복사 정책",
  },
};

function pickMessages(messages: TranscriptMessage[], selectedMessageIds: string[], useSelectedMessages: boolean) {
  if (!useSelectedMessages) return messages;
  const selected = new Set(selectedMessageIds || []);
  if (selected.size === 0) return messages;
  return messages.filter((msg) => selected.has(msg.id));
}

export function buildCopyPayload(input: {
  page: CopyPageKey;
  kind: CopyKind;
  messages: TranscriptMessage[];
  selectedMessageIds?: string[];
  messageLogs?: Record<string, LogBundle>;
  enabledOverride?: boolean;
  conversationDebugOptionsOverride?: DebugTranscriptOptions;
}) {
  const policy = PAGE_COPY_POLICY[input.page];
  const selectedIds = input.selectedMessageIds || [];
  const logs = input.messageLogs || {};
  const rule = input.kind === "conversation" ? policy.conversation : policy.issue;
  const enabled = input.enabledOverride ?? rule.enabled;
  if (!enabled) {
    return {
      policy,
      destination: policy.destinations[0],
      allowed: false,
      reason: rule.disabledReason || "이 페이지에서는 해당 복사를 지원하지 않습니다.",
      text: "",
    };
  }
  const scopedMessages = pickMessages(input.messages, selectedIds, rule.useSelectedMessages);
  const effectiveDebugOptions = input.conversationDebugOptionsOverride || rule.debugOptions;
  const text =
    rule.formatter === "debug_transcript_v1"
      ? buildDebugTranscript({ messages: scopedMessages, messageLogs: logs, options: effectiveDebugOptions })
      : buildIssueTranscript({ messages: scopedMessages, messageLogs: logs });
  return {
    policy,
    destination: policy.destinations[0],
    allowed: true,
    reason: "",
    text,
  };
}
