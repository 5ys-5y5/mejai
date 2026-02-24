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
  successConversationMessage?: string;
  failedMessage?: string;
  prebuiltTextOverride?: string | null;
  onCopiedText?: (text: string) => Promise<void> | void;
}) {
  const hasOverride = typeof input.prebuiltTextOverride === "string" && input.prebuiltTextOverride.trim().length > 0;
  const payload = hasOverride
    ? {
        allowed: true,
        reason: null,
        text: input.prebuiltTextOverride || "",
      }
    : buildCopyPayload({
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
    toast.error(input.emptyConversationMessage || "\uBCF5\uC0AC\uD560 \uB300\uD654\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return false;
  }
  try {
    await navigator.clipboard.writeText(payload.text);
    if (input.onCopiedText) {
      await input.onCopiedText(payload.text);
    }
    toast.success(input.successConversationMessage || "\uB300\uD654\uB97C \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.");
    return true;
  } catch {
    toast.error(input.failedMessage || "복사에 실패했습니다.");
    return false;
  }
}
