"use client";

import { toast } from "sonner";
import { buildCopyPayload, type CopyKind, type CopyPageKey } from "@/lib/transcriptCopyPolicy";
import type { DebugTranscriptOptions, LogBundle, TranscriptMessage } from "@/lib/debugTranscript";

export async function executeTranscriptCopy(input: {
  page: CopyPageKey;
  kind: CopyKind;
  messages: TranscriptMessage[];
  selectedMessageIds?: string[];
  messageLogs?: Record<string, LogBundle>;
  enabledOverride?: boolean;
  conversationDebugOptionsOverride?: DebugTranscriptOptions;
  blockedMessage?: string;
  emptyConversationMessage?: string;
  emptyIssueMessage?: string;
  successConversationMessage?: string;
  successIssueMessage?: string;
  failedMessage?: string;
}) {
  const payload = buildCopyPayload({
    page: input.page,
    kind: input.kind,
    messages: input.messages,
    selectedMessageIds: input.selectedMessageIds || [],
    messageLogs: input.messageLogs || {},
    enabledOverride: input.enabledOverride,
    conversationDebugOptionsOverride: input.conversationDebugOptionsOverride,
  });
  if (!payload.allowed) {
    toast.error(input.blockedMessage || payload.reason || "이 페이지에서는 해당 복사를 지원하지 않습니다.");
    return false;
  }
  if (!payload.text.trim()) {
    toast.error(
      input.kind === "conversation"
        ? input.emptyConversationMessage || "복사할 대화가 없습니다."
        : input.emptyIssueMessage || "복사할 오류 로그가 없습니다."
    );
    return false;
  }
  try {
    await navigator.clipboard.writeText(payload.text);
    toast.success(
      input.kind === "conversation"
        ? input.successConversationMessage || "대화를 복사했습니다."
        : input.successIssueMessage || "문제 로그를 복사했습니다."
    );
    return true;
  } catch {
    toast.error(input.failedMessage || "복사에 실패했습니다.");
    return false;
  }
}
