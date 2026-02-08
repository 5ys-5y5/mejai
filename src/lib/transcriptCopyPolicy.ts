import {
  buildDebugTranscript,
  buildIssueTranscript,
  type DebugTranscriptOptions,
  type LogBundle,
  type TranscriptMessage,
} from "@/lib/debugTranscript";
import { PAGE_CONVERSATION_FEATURES, type ConversationPageKey } from "@/lib/conversation/pageFeaturePolicy";

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

const DEFAULT_CONVERSATION_DEBUG_OPTIONS: DebugTranscriptOptions = {
  includePrincipleHeader: true,
  includeResponseSchema: true,
  includeRenderPlan: true,
  includeQuickReplyRule: true,
  includeTurnLogs: true,
  includeTokenUnused: true,
  includeTurnId: true,
  auditBotScope: "runtime_turns_only",
};

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
  const text =
    rule.formatter === "debug_transcript_v1"
      ? buildDebugTranscript({ messages: scopedMessages, messageLogs: logs, options: rule.debugOptions })
      : buildIssueTranscript({ messages: scopedMessages, messageLogs: logs });
  return {
    policy,
    destination: policy.destinations[0],
    allowed: true,
    reason: "",
    text,
  };
}
