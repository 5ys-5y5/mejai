"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { Loader2, Send } from "lucide-react";
import { ConversationPageShell } from "@/components/conversation/ConversationPageShell";
import { ConversationSetupFields } from "@/components/conversation/ConversationSetupFields";
import { ConversationAdminMenu } from "@/components/conversation/ConversationAdminMenu";
import { ConversationThread } from "@/components/conversation/ConversationThread";
import { ConversationReplySelectors } from "@/components/conversation/ConversationReplySelectors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { renderBotContent, renderStructuredChoiceContent } from "@/lib/conversation/messageRenderUtils";
import type { ConversationPageFeatures } from "@/lib/conversation/pageFeaturePolicy";
import type { SelectOption } from "@/components/SelectPopover";

type HeroMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
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
  quickReplyConfig?: {
    selection_mode: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
};

type Props = {
  pageFeatures: ConversationPageFeatures;
  isAdminUser: boolean;
  selectedLlm: "chatgpt" | "gemini";
  llmOptions: SelectOption[];
  onSelectLlm: (value: "chatgpt" | "gemini") => void;
  userKb: string;
  onChangeUserKb: (value: string) => void;
  providerOptions: SelectOption[];
  selectedProviderKeys: string[];
  onChangeProviderKeys: (values: string[]) => void;
  actionOptions: SelectOption[];
  selectedMcpToolIds: string[];
  onChangeMcpToolIds: (values: string[]) => void;
  adminLogControlsOpen: boolean;
  onToggleAdminOpen: () => void;
  chatSelectionEnabled: boolean;
  onToggleSelectionEnabled: () => void;
  showAdminLogs: boolean;
  onToggleShowAdminLogs: () => void;
  onCopyTranscript: () => void;
  onCopyIssueTranscript: () => void;
  messages: HeroMessage[];
  selectedMessageIds: string[];
  onToggleMessageSelection: (messageId: string) => void;
  sessionId: string | null;
  sending: boolean;
  quickReplyDrafts: Record<string, string[]>;
  lockedReplySelections: Record<string, string[]>;
  setQuickReplyDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
  setLockedReplySelections: Dispatch<SetStateAction<Record<string, string[]>>>;
  onSendQuickReply: (text: string) => void;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  input: string;
  onInputChange: (value: string) => void;
  onSubmitInput: () => void;
  placeholder: string;
};

export function HeroModelCard({
  pageFeatures,
  isAdminUser,
  selectedLlm,
  llmOptions,
  onSelectLlm,
  userKb,
  onChangeUserKb,
  providerOptions,
  selectedProviderKeys,
  onChangeProviderKeys,
  actionOptions,
  selectedMcpToolIds,
  onChangeMcpToolIds,
  adminLogControlsOpen,
  onToggleAdminOpen,
  chatSelectionEnabled,
  onToggleSelectionEnabled,
  showAdminLogs,
  onToggleShowAdminLogs,
  onCopyTranscript,
  onCopyIssueTranscript,
  messages,
  selectedMessageIds,
  onToggleMessageSelection,
  sessionId,
  sending,
  quickReplyDrafts,
  lockedReplySelections,
  setQuickReplyDrafts,
  setLockedReplySelections,
  onSendQuickReply,
  chatScrollRef,
  input,
  onInputChange,
  onSubmitInput,
  placeholder,
}: Props) {
  return (
    <ConversationPageShell
      className="gap-10 lg:grid-cols-[1fr_1fr] lg:items-stretch"
      leftClassName="rounded-xl border border-zinc-200 bg-white"
      rightClassName=""
      leftPanel={
        <div className="hero-left-pane p-4">
          <ConversationSetupFields
            showInlineUserKbInput={pageFeatures.setup.inlineUserKbInput}
            inlineKbAdminOnly={pageFeatures.visibility.setup.inlineUserKbInput === "admin"}
            inlineKbValue={userKb}
            onInlineKbChange={onChangeUserKb}
            inlineKbLabelClassName="mb-1 text-[11px] font-semibold text-slate-600"
            inlineKbPlaceholder="예) 고객 정책, 자주 묻는 질문, 톤 가이드 등을 입력하세요."
            inlineKbTextareaClassName="hero-input h-36 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
            showLlmSelector={pageFeatures.setup.llmSelector}
            llmAdminOnly={pageFeatures.visibility.setup.llmSelector === "admin"}
            llmValue={selectedLlm}
            onLlmChange={(value) => onSelectLlm(value as "chatgpt" | "gemini")}
            llmOptions={llmOptions}
            showMcpProviderSelector={pageFeatures.mcp.providerSelector}
            mcpProviderAdminOnly={pageFeatures.visibility.mcp.providerSelector === "admin"}
            providerValues={selectedProviderKeys}
            onProviderChange={onChangeProviderKeys}
            providerOptions={providerOptions}
            providerPlaceholder="선택"
            showMcpActionSelector={pageFeatures.mcp.actionSelector}
            mcpActionAdminOnly={pageFeatures.visibility.mcp.actionSelector === "admin"}
            actionValues={selectedMcpToolIds}
            onActionChange={onChangeMcpToolIds}
            actionOptions={actionOptions}
            actionPlaceholder="선택"
            actionSearchable
          />
        </div>
      }
      rightPanel={
        <div className="hero-chat relative h-full border border-slate-200 bg-white/90 p-4 flex flex-col overflow-visible rounded-xl backdrop-blur">
          {isAdminUser && pageFeatures.adminPanel.enabled ? (
            <ConversationAdminMenu
              className="right-6 top-6"
              open={adminLogControlsOpen}
              onToggleOpen={onToggleAdminOpen}
              selectionEnabled={pageFeatures.adminPanel.selectionToggle && chatSelectionEnabled}
              onToggleSelection={() => {
                if (!pageFeatures.adminPanel.selectionToggle) return;
                onToggleSelectionEnabled();
              }}
              showLogs={pageFeatures.adminPanel.logsToggle && showAdminLogs}
              onToggleLogs={() => {
                if (!pageFeatures.adminPanel.logsToggle) return;
                onToggleShowAdminLogs();
              }}
              onCopyConversation={onCopyTranscript}
              onCopyIssue={onCopyIssueTranscript}
              showSelectionToggle={pageFeatures.adminPanel.selectionToggle}
              showLogsToggle={pageFeatures.adminPanel.logsToggle}
              showConversationCopy={pageFeatures.adminPanel.copyConversation}
              showIssueCopy={pageFeatures.adminPanel.copyIssue}
              disableCopy={messages.length === 0}
            />
          ) : null}
          <div
            ref={chatScrollRef}
            className="hero-thread relative z-0 max-h-[420px] flex-1 overflow-auto pr-2 pl-2 pb-4 scrollbar-hide bg-slate-50 rounded-t-xl rounded-b-none pt-2"
          >
            <ConversationThread
              messages={messages}
              selectedMessageIds={selectedMessageIds}
              selectionEnabled={pageFeatures.adminPanel.messageSelection && chatSelectionEnabled}
              onToggleSelection={onToggleMessageSelection}
              avatarSelectionStyle="none"
              rowSelectedClassName="ring-2 ring-slate-900 ring-offset-2 ring-offset-slate-50"
              renderContent={(msg) => (
                <>
                  {msg.richHtml ? (
                    <span dangerouslySetInnerHTML={{ __html: msg.richHtml }} />
                  ) : msg.role === "bot" ? (
                    renderStructuredChoiceContent(msg.content) || renderBotContent(msg.content)
                  ) : (
                    msg.content
                  )}
                  {msg.isLoading ? (
                    <span className="hero-muted ml-2 inline-flex items-center text-xs text-slate-500">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    </span>
                  ) : null}
                </>
              )}
              renderMeta={(msg) =>
                pageFeatures.adminPanel.messageMeta && showAdminLogs && isAdminUser ? (
                  <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                    role={msg.role} id={msg.id.slice(0, 8)} session={sessionId ?? "-"}
                  </div>
                ) : null
              }
              renderAfterBubble={(msg, { isLatest }) => (
                <ConversationReplySelectors
                  modelId="hero"
                  message={msg}
                  isLatest={isLatest}
                  sending={sending}
                  quickReplyDrafts={quickReplyDrafts}
                  lockedReplySelections={lockedReplySelections}
                  setQuickReplyDrafts={setQuickReplyDrafts}
                  setLockedReplySelections={setLockedReplySelections}
                  enableQuickReplies={pageFeatures.interaction.quickReplies}
                  enableProductCards={pageFeatures.interaction.productCards}
                  onSubmit={onSendQuickReply}
                />
              )}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[3.25rem] z-10 h-4 bg-gradient-to-t from-white to-transparent" />
          {pageFeatures.interaction.inputSubmit ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitInput();
              }}
              className="hero-input-row relative flex gap-2 bg-white z-20"
            >
              <Input value={input} onChange={(event) => onInputChange(event.target.value)} placeholder={placeholder} className="hero-input flex-1 bg-white" />
              <Button type="submit" disabled={sending || !input.trim()}>
                <Send className="mr-2 h-4 w-4" />
                {sending ? "전송 중" : "전송"}
              </Button>
            </form>
          ) : null}
        </div>
      }
    />
  );
}
