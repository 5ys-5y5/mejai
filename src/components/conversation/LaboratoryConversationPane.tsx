"use client";

import type { Dispatch, SetStateAction } from "react";
import { Loader2, Minus, Plus, Send } from "lucide-react";
import { ConversationAdminMenu } from "@/components/conversation/ConversationAdminMenu";
import { ConversationReplySelectors } from "@/components/conversation/ConversationReplySelectors";
import { ConversationThread } from "@/components/conversation/ConversationThread";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getDebugParts, renderBotContent, renderStructuredChoiceContent } from "@/lib/conversation/messageRenderUtils";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
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
  quickReplyConfig?: {
    selection_mode: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
  renderPlan?: {
    view: "text" | "choice" | "cards";
    enable_quick_replies: boolean;
    enable_cards: boolean;
    quick_reply_source: {
      type: "explicit" | "config" | "fallback" | "none";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    };
    selection_mode: "single" | "multi";
    min_select: number;
    max_select: number;
    submit_format: "single" | "csv";
    grid_columns: { quick_replies: number; cards: number };
  };
};

type ConversationMode = "history" | "edit" | "new";
type SetupMode = "existing" | "new";

type ModelShape = {
  id: string;
  input: string;
  sending: boolean;
  setupMode: SetupMode;
  conversationMode: ConversationMode;
  selectedAgentId: string;
  selectedSessionId: string | null;
  layoutExpanded: boolean;
  adminLogControlsOpen: boolean;
  showAdminLogs: boolean;
  chatSelectionEnabled: boolean;
  selectedMessageIds: string[];
  config: { kbId: string };
};

type Props = {
  model: ModelShape;
  visibleMessages: ChatMessage[];
  isAdminUser: boolean;
  matchedPaneHeight: number;
  expandedPanelHeight: number;
  quickReplyDrafts: Record<string, string[]>;
  lockedReplySelections: Record<string, string[]>;
  setQuickReplyDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
  setLockedReplySelections: Dispatch<SetStateAction<Record<string, string[]>>>;
  adminFeatures: {
    enabled: boolean;
    selectionToggle: boolean;
    logsToggle: boolean;
    messageSelection: boolean;
    copyConversation: boolean;
    copyIssue: boolean;
  };
  interactionFeatures: {
    quickReplies: boolean;
    productCards: boolean;
    inputSubmit: boolean;
  };
  onToggleAdminOpen: () => void;
  onToggleSelectionMode: () => void;
  onToggleLogs: () => void;
  onCopyConversation: () => void;
  onCopyIssue: () => void;
  onToggleMessageSelection: (messageId: string) => void;
  onSubmitMessage: (text: string) => void;
  onExpand: () => void;
  onCollapse: () => void;
  onInputChange: (value: string) => void;
  setChatScrollRef: (el: HTMLDivElement | null) => void;
};

export function LaboratoryConversationPane({
  model,
  visibleMessages,
  isAdminUser,
  matchedPaneHeight,
  expandedPanelHeight,
  quickReplyDrafts,
  lockedReplySelections,
  setQuickReplyDrafts,
  setLockedReplySelections,
  adminFeatures,
  interactionFeatures,
  onToggleAdminOpen,
  onToggleSelectionMode,
  onToggleLogs,
  onCopyConversation,
  onCopyIssue,
  onToggleMessageSelection,
  onSubmitMessage,
  onExpand,
  onCollapse,
  onInputChange,
  setChatScrollRef,
}: Props) {
  const submitDisabled =
    (model.setupMode === "existing" && model.conversationMode === "history") ||
    !model.input.trim() ||
    model.sending ||
    (model.setupMode === "existing" && !model.config.kbId) ||
    (model.setupMode === "existing" && (!model.selectedAgentId || (model.conversationMode !== "new" && !model.selectedSessionId)));

  return (
    <div
      className={cn("relative h-full border-t border-slate-200 p-4 lg:border-l lg:border-t-0 flex flex-col overflow-visible")}
      style={matchedPaneHeight > 0 ? { height: matchedPaneHeight } : model.layoutExpanded ? { minHeight: expandedPanelHeight } : undefined}
    >
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {isAdminUser && adminFeatures.enabled ? (
          <ConversationAdminMenu
            className="right-2 top-2"
            open={model.adminLogControlsOpen}
            onToggleOpen={onToggleAdminOpen}
            selectionEnabled={adminFeatures.selectionToggle && model.chatSelectionEnabled}
            onToggleSelection={() => {
              if (!adminFeatures.selectionToggle) return;
              onToggleSelectionMode();
            }}
            showLogs={adminFeatures.logsToggle && model.showAdminLogs}
            onToggleLogs={() => {
              if (!adminFeatures.logsToggle) return;
              onToggleLogs();
            }}
            onCopyConversation={onCopyConversation}
            onCopyIssue={onCopyIssue}
            showSelectionToggle={adminFeatures.selectionToggle}
            showLogsToggle={adminFeatures.logsToggle}
            showConversationCopy={adminFeatures.copyConversation}
            showIssueCopy={adminFeatures.copyIssue}
            disableCopy={visibleMessages.length === 0}
          />
        ) : null}
        <div
          ref={setChatScrollRef}
          className={cn(
            "relative z-0 h-full overflow-auto pr-2 pl-2 pb-4 scrollbar-hide bg-slate-50 rounded-t-xl rounded-b-none",
            isAdminUser ? "pt-10" : "pt-2"
          )}
        >
          <ConversationThread
            messages={visibleMessages}
            selectedMessageIds={model.selectedMessageIds}
            selectionEnabled={adminFeatures.messageSelection && model.chatSelectionEnabled}
            onToggleSelection={(messageId) => {
              if (!adminFeatures.messageSelection) return;
              onToggleMessageSelection(messageId);
            }}
            avatarSelectionStyle="both"
            renderContent={(msg) => {
              const hasDebug = msg.role === "bot" && msg.content.includes("debug_prefix");
              const debugParts = hasDebug ? getDebugParts(msg.content) : null;
              return (
                <>
                  {hasDebug && debugParts ? (
                    debugParts.answerHtml ? (
                      <div style={{ margin: 0, padding: 0, lineHeight: "inherit", whiteSpace: "normal" }} dangerouslySetInnerHTML={{ __html: debugParts.answerHtml }} />
                    ) : (
                      debugParts.answerText || ""
                    )
                  ) : msg.role === "bot" && msg.isLoading ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>답변 생성 중...</span>
                      </div>
                    </div>
                  ) : msg.role === "bot" ? (
                    msg.richHtml ? (
                      <div style={{ margin: 0, padding: 0, lineHeight: "inherit", whiteSpace: "normal" }} dangerouslySetInnerHTML={{ __html: msg.richHtml }} />
                    ) : (
                      renderStructuredChoiceContent(msg.content) || renderBotContent(msg.content)
                    )
                  ) : (
                    msg.content
                  )}
                  {msg.role === "bot" &&
                  isAdminUser &&
                  adminFeatures.logsToggle &&
                  model.showAdminLogs &&
                  msg.loadingLogs &&
                  msg.loadingLogs.length > 0 ? (
                    <div className="mt-2 rounded-md border border-slate-200 bg-white/70 px-2 py-1.5">
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <span>진행 로그</span>
                        <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">ADMIN</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-600">
                        {msg.loadingLogs.map((line, idx) => (
                          <div key={`${msg.id}-loading-log-${idx}`}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              );
            }}
            renderAfterBubble={(msg, { isLatest }) => (
              <ConversationReplySelectors
                modelId={model.id}
                message={msg}
                isLatest={isLatest}
                sending={model.sending}
                quickReplyDrafts={quickReplyDrafts}
                lockedReplySelections={lockedReplySelections}
                setQuickReplyDrafts={setQuickReplyDrafts}
                setLockedReplySelections={setLockedReplySelections}
                enableQuickReplies={interactionFeatures.quickReplies}
                enableProductCards={interactionFeatures.productCards}
                onSubmit={onSubmitMessage}
              />
            )}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-white to-transparent" />
      </div>
      {model.layoutExpanded ? (
        <div className="pointer-events-none absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
          <button
            type="button"
            onClick={onCollapse}
            className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="채팅 높이 줄이기"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>
      ) : matchedPaneHeight < expandedPanelHeight ? (
        <div className="pointer-events-none absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
          <button
            type="button"
            onClick={onExpand}
            className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="채팅 높이 늘리기"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      ) : null}
      {interactionFeatures.inputSubmit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitMessage(model.input.trim());
          }}
          className="relative z-20 flex gap-2 bg-white"
        >
          <Input
            value={model.input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={
              model.setupMode === "existing" && model.conversationMode === "history"
                ? "히스토리 모드에서는 전송할 수 없습니다."
                : model.setupMode === "existing" && model.conversationMode === "edit"
                  ? "수정할 내용을 입력하세요 (새 세션으로 복제 후 이어집니다)"
                  : "신규 대화 질문을 입력하세요"
            }
            className="flex-1"
          />
          <Button type="submit" disabled={submitDisabled}>
            <Send className="mr-2 h-4 w-4" />
            {model.sending ? "전송 중" : "전송"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
