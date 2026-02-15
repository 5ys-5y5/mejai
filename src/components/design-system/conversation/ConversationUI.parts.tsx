"use client";

import type { CSSProperties, Dispatch, ReactNode, SetStateAction, WheelEvent } from "react";
import { Fragment, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bot, Check, Copy, ExternalLink, Info, Loader, Loader2, Minus, Plus, RefreshCw, Send, Settings2, Trash2, User, X } from "lucide-react";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { InlineKbSampleItem } from "@/lib/conversation/inlineKbSamples";
import { isToolEnabled } from "@/lib/conversation/pageFeaturePolicy";
import type { SetupFieldKey } from "@/lib/conversation/pageFeaturePolicy";
import { type RuntimeUiTypeId } from "@/components/design-system/conversation/runtimeUiCatalog";
import { ConversationSetupPanel, ConversationSplitLayout } from "@/components/design-system/conversation/panels";
import {
  ConversationConfirmButton,
  ConversationGrid,
  ConversationProductCard,
  ConversationQuickReplyButton,
} from "@/components/design-system/conversation/ui";
import { getDebugParts, renderBotContent } from "@/lib/conversation/messageRenderUtils";
import type { ConversationPageFeatures, ConversationSetupUi, ExistingSetupFieldKey, ExistingSetupLabelKey } from "@/lib/conversation/pageFeaturePolicy";
import type { ChatMessage, ModelState, SetupMode } from "@/lib/conversation/client/laboratoryPageState";
import { appendInlineKbSample, hasConflictingInlineKbSamples } from "@/lib/conversation/inlineKbSamples";

// ------------------------------------------------------------
// Unified conversation UI assembly file.
// Edit this file to affect conversation UI service-wide.
// ------------------------------------------------------------
export function ConversationSetupBox({
  children,
  className,
  contentClassName,
  contentStyle,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}) {
  return (
    <ConversationSetupPanel className={className} contentClassName={contentClassName} contentStyle={contentStyle}>
      {children}
    </ConversationSetupPanel>
  );
}

export function ConversationWorkbenchTopBar({
  wsStatusDot,
  wsStatus,
  onRefreshWs,
  onResetAll,
  onAddModel,
  addModelDisabled,
  leading,
  className,
}: {
  wsStatusDot: string;
  wsStatus: string;
  onRefreshWs: () => void;
  onResetAll: () => void;
  onAddModel: () => void;
  addModelDisabled: boolean;
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)} parts-lego="ConversationWorkbenchTopBar">
      {leading || null}
      <div className="flex items-center gap-2">
        <div className="max-w-full w-max flex items-center gap-2 bg-white rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
          <span className={cn("h-2 w-2 rounded-full", wsStatusDot)} />
          <span>WS {wsStatus}</span>
          <button
            type="button"
            onClick={onRefreshWs}
            title="새로 고침"
            aria-label="웹소켓 새로 고침"
            className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <Button type="button" variant="outline" onClick={onResetAll}>
          초기화
        </Button>
        <Button type="button" onClick={onAddModel} disabled={addModelDisabled}>
          <Plus className="mr-2 h-4 w-4" />
          모델 추가
        </Button>
      </div>
    </div>
  );
}

export function ConversationSessionHeader({
  modelIndex,
  canRemove,
  onRemove,
  activeSessionId,
  onCopySessionId,
  onOpenSessionInNewTab,
  onDeleteSession,
  disableDelete,
}: {
  modelIndex: number;
  canRemove: boolean;
  onRemove: () => void;
  activeSessionId: string | null;
  onCopySessionId: (sessionId: string | null) => void;
  onOpenSessionInNewTab: (sessionId: string | null) => void;
  onDeleteSession: () => void;
  disableDelete: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Model ${modelIndex} Remove`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="text-sm font-semibold text-slate-900">Model {modelIndex}</div>
        <div className=" flex items-center gap-2 text-xs text-slate-500">설정을 변경하면 해당 모델의 대화가 초기화됩니다.</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          className="mr-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-left text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onCopySessionId(activeSessionId)}
          disabled={!activeSessionId}
          aria-label="세션 ID 복사"
        >
          <Copy className="h-3.5 w-3.5 shrink-0" />
          {activeSessionId || "-"}
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => onOpenSessionInNewTab(activeSessionId)}
          disabled={!activeSessionId}
          aria-label="새탭 열기"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          onClick={onDeleteSession}
          disabled={disableDelete}
          aria-label="세션 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type AdminMenuProps = {
  open: boolean;
  onToggleOpen: () => void;
  selectionEnabled: boolean;
  onToggleSelection: () => void;
  showLogs: boolean;
  onToggleLogs: () => void;
  onCopyConversation: () => void;
  onCopyIssue: () => void;
  showSelectionToggle?: boolean;
  showLogsToggle?: boolean;
  showConversationCopy?: boolean;
  showIssueCopy?: boolean;
  disableCopy?: boolean;
  className?: string;
};

export function ConversationAdminMenu({
  open,
  onToggleOpen,
  selectionEnabled,
  onToggleSelection,
  showLogs,
  onToggleLogs,
  onCopyConversation,
  onCopyIssue,
  showSelectionToggle = true,
  showLogsToggle = true,
  showConversationCopy = true,
  showIssueCopy = true,
  disableCopy = false,
  className,
}: AdminMenuProps) {
  return (
    <div className={cn("z-20", className)}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="로그 설정"
        title="로그 설정"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-1 w-36 rounded-md border border-slate-200 bg-white p-1.5">
          {showSelectionToggle ? (
            <button
              type="button"
              onClick={onToggleSelection}
              className={cn(
                "mb-1 w-full rounded-md border px-2 py-1 text-[11px] font-semibold",
                selectionEnabled ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"
              )}
            >
              선택 {selectionEnabled ? "ON" : "OFF"}
            </button>
          ) : null}
          {showLogsToggle ? (
            <button
              type="button"
              onClick={onToggleLogs}
              className={cn(
                "w-full rounded-md border px-2 py-1 text-[11px] font-semibold",
                showLogs ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"
              )}
            >
              로그 {showLogs ? "ON" : "OFF"}
            </button>
          ) : null}
          {showConversationCopy || showIssueCopy ? <div className="my-1 border-t border-slate-100" /> : null}
          {showConversationCopy ? (
            <button
              type="button"
              onClick={onCopyConversation}
              disabled={disableCopy}
              className="mb-1 inline-flex w-full items-center justify-between rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <span>대화 복사</span>
              <Copy className="h-3 w-3" />
            </button>
          ) : null}
          {showIssueCopy ? (
            <button
              type="button"
              onClick={onCopyIssue}
              disabled={disableCopy}
              className="inline-flex w-full items-center justify-between rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              <span>문제 로그 복사</span>
              <AlertTriangle className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type BaseMessage = { id: string; role: "user" | "bot" };

type AvatarSelectionStyle = "none" | "bot" | "both";

type ThreadProps<T extends BaseMessage> = {
  messages: T[];
  selectedMessageIds: string[];
  selectionEnabled: boolean;
  onToggleSelection: (messageId: string) => void;
  renderContent: (msg: T, ctx: { isLatest: boolean; isSelected: boolean }) => ReactNode;
  renderAfterBubble?: (msg: T, ctx: { isLatest: boolean; isSelected: boolean }) => ReactNode;
  renderMeta?: (msg: T) => ReactNode;
  className?: string;
  rowSelectedClassName?: string;
  bubbleBaseClassName?: string;
  userBubbleClassName?: string;
  botBubbleClassName?: string;
  avatarSelectionStyle?: AvatarSelectionStyle;
};

export function ConversationThread<T extends BaseMessage>({
  messages,
  selectedMessageIds,
  selectionEnabled,
  onToggleSelection,
  renderContent,
  renderAfterBubble,
  renderMeta,
  className,
  rowSelectedClassName = "rounded-xl bg-amber-200 px-1 py-1",
  bubbleBaseClassName = "relative whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm transition",
  userBubbleClassName = "bg-slate-900 text-white",
  botBubbleClassName = "bg-slate-100 text-slate-700 border border-slate-200",
  avatarSelectionStyle = "none",
}: ThreadProps<T>) {
  const selectedMessageIdSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);
  const latestVisibleMessageId = messages[messages.length - 1]?.id || "";
  const showBotCheck = avatarSelectionStyle === "bot" || avatarSelectionStyle === "both";
  const showUserCheck = avatarSelectionStyle === "both";
  return (
    <>
      {messages.map((msg, index) => {
        const prev = messages[index - 1];
        const isGrouped = prev?.role === msg.role;
        const rowSpacing = index === 0 ? "" : isGrouped ? "mt-1" : "mt-3";
        const showAvatar = !isGrouped;
        const isLatest = msg.id === latestVisibleMessageId;
        const isSelected = selectedMessageIdSet.has(msg.id);
        return (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              rowSpacing,
              msg.role === "user" ? "justify-end" : "justify-start",
              selectionEnabled && isSelected && rowSelectedClassName,
              className
            )}
          >
            {msg.role === "bot" && showAvatar ? (
              <div className={cn("h-8 w-8 rounded-full border flex items-center justify-center", isSelected && showBotCheck ? "border-slate-900 bg-slate-900" : "border-slate-200 bg-white")}>
                {isSelected && showBotCheck ? <Check className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-slate-500" />}
              </div>
            ) : msg.role === "bot" ? (
              <div className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0" aria-hidden="true" />
            ) : null}

            <div className="relative max-w-[75%]">
              <div
                onClick={() => {
                  if (selectionEnabled) onToggleSelection(msg.id);
                }}
                className={cn(
                  bubbleBaseClassName,
                  selectionEnabled ? "cursor-pointer" : "cursor-default",
                  msg.role === "user" ? userBubbleClassName : botBubbleClassName
                )}
              >
                {renderContent(msg, { isLatest, isSelected })}
              </div>
              {renderAfterBubble ? renderAfterBubble(msg, { isLatest, isSelected }) : null}
              {renderMeta ? renderMeta(msg) : null}
            </div>

            {msg.role === "user" && showAvatar ? (
              <div className={cn("h-8 w-8 rounded-full border flex items-center justify-center", isSelected && showUserCheck ? "border-slate-900 bg-slate-900" : "border-slate-200 bg-white")}>
                {isSelected && showUserCheck ? <Check className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-slate-500" />}
              </div>
            ) : msg.role === "user" ? (
              <div className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0" aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

type SetupFieldsProps = {
  showInlineUserKbInput: boolean;
  inlineKbValue: string;
  onInlineKbChange: (value: string) => void;
  inlineKbLabel?: string;
  inlineKbPlaceholder?: string;
  inlineKbTextareaClassName?: string;
  inlineKbLabelClassName?: string;
  inlineKbAdminOnly?: boolean;
  inlineKbSamples?: InlineKbSampleItem[];
  inlineKbSampleSelectionOrder?: string[];
  onInlineKbSampleApply?: (sampleIds: string[]) => void;
  inlineKbSampleConflict?: boolean;
  setupFieldOrder?: SetupFieldKey[];

  showLlmSelector: boolean;
  llmLabel?: string;
  llmValue: string;
  onLlmChange: (value: string) => void;
  llmOptions: SelectOption[];
  showLlmInfoButton?: boolean;
  onToggleLlmInfo?: () => void;
  llmInfoOpen?: boolean;
  llmInfoText?: string;
  llmAdminOnly?: boolean;

  middleContent?: ReactNode;

  showMcpProviderSelector: boolean;
  mcpProviderLabel?: string;
  providerValues: string[];
  onProviderChange: (values: string[]) => void;
  providerOptions: SelectOption[];
  providerPlaceholder?: string;
  showMcpInfoButton?: boolean;
  onToggleMcpInfo?: () => void;
  mcpInfoOpen?: boolean;
  mcpInfoText?: string;
  mcpProviderAdminOnly?: boolean;

  showMcpActionSelector: boolean;
  mcpActionLabel?: string;
  actionValues: string[];
  onActionChange: (values: string[]) => void;
  actionOptions: SelectOption[];
  actionPlaceholder?: string;
  actionSearchable?: boolean;
  mcpActionAdminOnly?: boolean;
};

function AdminBadge() {
  return (
    <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
      ADMIN
    </span>
  );
}

export function ConversationSetupFields({
  showInlineUserKbInput,
  inlineKbValue,
  onInlineKbChange,
  inlineKbLabel = "사용자 KB입력란",
  inlineKbPlaceholder = "예) 고객 정책, FAQ, 톤 가이드",
  inlineKbTextareaClassName = "h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700",
  inlineKbLabelClassName = "mb-1 text-[11px] font-semibold text-slate-600",
  inlineKbAdminOnly = false,
  inlineKbSamples = [],
  inlineKbSampleSelectionOrder = [],
  onInlineKbSampleApply,
  inlineKbSampleConflict = false,
  setupFieldOrder,
  showLlmSelector,
  llmLabel = "LLM 선택",
  llmValue,
  onLlmChange,
  llmOptions,
  showLlmInfoButton = false,
  onToggleLlmInfo,
  llmInfoOpen = false,
  llmInfoText = "",
  llmAdminOnly = false,
  middleContent,
  showMcpProviderSelector,
  mcpProviderLabel = "MCP 프로바이더 선택",
  providerValues,
  onProviderChange,
  providerOptions,
  providerPlaceholder = "선택",
  showMcpInfoButton = false,
  onToggleMcpInfo,
  mcpInfoOpen = false,
  mcpInfoText = "",
  mcpProviderAdminOnly = false,
  showMcpActionSelector,
  mcpActionLabel = "MCP 액션 선택",
  actionValues,
  onActionChange,
  actionOptions,
  actionPlaceholder = "선택",
  actionSearchable = false,
  mcpActionAdminOnly = false,
}: SetupFieldsProps) {
  const [sampleOpen, setSampleOpen] = useState(false);
  const [pendingSampleIds, setPendingSampleIds] = useState<string[]>([]);
  const sampleById = useMemo(() => {
    const map = new Map<string, InlineKbSampleItem>();
    inlineKbSamples.forEach((item) => map.set(item.id, item));
    return map;
  }, [inlineKbSamples]);
  const pendingOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    pendingSampleIds.forEach((id, idx) => map.set(id, idx + 1));
    return map;
  }, [pendingSampleIds]);
  const selectedSampleTitles = useMemo(
    () =>
      inlineKbSampleSelectionOrder
        .map((id, idx) => {
          const sample = sampleById.get(id);
          if (!sample) return null;
          return `${idx + 1}. ${sample.title}`;
        })
        .filter(Boolean),
    [inlineKbSampleSelectionOrder, sampleById]
  );
  const sampleOptions = useMemo<SelectOption[]>(
    () =>
      inlineKbSamples.map((sample) => ({
        id: sample.id,
        label: pendingOrderMap.has(sample.id) ? `${pendingOrderMap.get(sample.id)}. ${sample.title}` : sample.title,
        description: sample.content,
      })),
    [inlineKbSamples, pendingOrderMap]
  );

  const renderInlineKb = () =>
    showInlineUserKbInput ? (
      <div key="inlineUserKbInput">
        <div className={`${inlineKbLabelClassName} flex items-center gap-1`}>
          <span>{inlineKbLabel}</span>
          {inlineKbAdminOnly ? <AdminBadge /> : null}
        </div>
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <MultiSelectPopover
              values={pendingSampleIds}
              onChange={setPendingSampleIds}
              options={sampleOptions}
              placeholder="KB 입력(예시) 샘플 선택"
              displayMode="count"
              searchable={false}
              showBulkActions={false}
              open={sampleOpen}
              onOpenChange={setSampleOpen}
              className="relative flex-1 min-w-0"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!onInlineKbSampleApply || pendingSampleIds.length === 0) return;
              onInlineKbSampleApply(pendingSampleIds);
              setPendingSampleIds([]);
              setSampleOpen(false);
            }}
            disabled={!onInlineKbSampleApply || pendingSampleIds.length === 0}
            className="h-9 px-3 text-xs"
          >
            적용
          </Button>
        </div>
        <textarea value={inlineKbValue} onChange={(event) => onInlineKbChange(event.target.value)} placeholder={inlineKbPlaceholder} className={inlineKbTextareaClassName} />
        {selectedSampleTitles.length > 0 ? <div className="mt-2 text-[11px] text-slate-500">{selectedSampleTitles.join(" > ")}</div> : null}
        {inlineKbSampleConflict ? <div className="mt-2 text-[11px] font-medium text-amber-700">선택된 샘플 간 상충 가능성이 있어 응답 일관성이 떨어질 수 있습니다.</div> : null}
      </div>
    ) : null;

  const renderLlm = () =>
    showLlmSelector ? (
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <span>{llmLabel}</span>
          {llmAdminOnly ? <AdminBadge /> : null}
        </div>
        <div className="flex items-center gap-2">
          <SelectPopover value={llmValue} onChange={onLlmChange} options={llmOptions} className="flex-1 min-w-0" />
          {showLlmInfoButton ? (
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={onToggleLlmInfo} aria-label="LLM 정보">
              <Info className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {showLlmInfoButton && llmInfoOpen ? <textarea readOnly value={llmInfoText} className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words" /> : null}
      </div>
    ) : null;

  const renderMcpProvider = () =>
    showMcpProviderSelector ? (
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <span>{mcpProviderLabel}</span>
          {mcpProviderAdminOnly ? <AdminBadge /> : null}
        </div>
        <div className="flex items-center gap-2">
          <MultiSelectPopover values={providerValues} onChange={onProviderChange} options={providerOptions} placeholder={providerPlaceholder} displayMode="count" showBulkActions className="flex-1 min-w-0" />
          {showMcpInfoButton ? (
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={onToggleMcpInfo} aria-label="MCP 정보">
              <Info className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    ) : null;

  const renderMcpAction = () =>
    showMcpActionSelector ? (
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <span>{mcpActionLabel}</span>
          {mcpActionAdminOnly ? <AdminBadge /> : null}
        </div>
        <div className="flex items-center gap-2">
          <MultiSelectPopover values={actionValues} onChange={onActionChange} options={actionOptions} placeholder={actionPlaceholder} displayMode="count" showBulkActions searchable={actionSearchable} className="flex-1 min-w-0" />
        </div>
        {showMcpInfoButton && mcpInfoOpen ? <textarea readOnly value={mcpInfoText} className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words" /> : null}
      </div>
    ) : null;

  const setupOrder = setupFieldOrder || ["inlineUserKbInput", "llmSelector", "kbSelector", "adminKbSelector", "routeSelector", "mcpProviderSelector", "mcpActionSelector"];
  const orderedNodes: ReactNode[] = [];
  let middleInserted = false;
  setupOrder.forEach((key) => {
    if ((key === "kbSelector" || key === "adminKbSelector" || key === "routeSelector") && middleContent && !middleInserted) {
      orderedNodes.push(<Fragment key="middleContent">{middleContent}</Fragment>);
      middleInserted = true;
      return;
    }
    if (key === "inlineUserKbInput") orderedNodes.push(<Fragment key="inlineUserKbInput">{renderInlineKb()}</Fragment>);
    if (key === "llmSelector") orderedNodes.push(<Fragment key="llmSelector">{renderLlm()}</Fragment>);
    if (key === "mcpProviderSelector") orderedNodes.push(<Fragment key="mcpProviderSelector">{renderMcpProvider()}</Fragment>);
    if (key === "mcpActionSelector") orderedNodes.push(<Fragment key="mcpActionSelector">{renderMcpAction()}</Fragment>);
  });
  if (middleContent && !middleInserted) orderedNodes.push(<Fragment key="middleContentTail">{middleContent}</Fragment>);

  return <div className="space-y-3">{orderedNodes.filter(Boolean)}</div>;
}

type QuickReply = { label: string; value: string };
type ProductCard = { id: string; title: string; subtitle?: string; imageUrl?: string; value: string };
type RenderPlan = {
  ui_type_id?: RuntimeUiTypeId;
  view?: "text" | "choice" | "cards";
  enable_quick_replies?: boolean;
  enable_cards?: boolean;
  interaction_scope?: "latest_only" | "any";
  selection_mode?: "single" | "multi";
  min_select?: number;
  max_select?: number;
  submit_format?: "single" | "csv";
  grid_columns?: { quick_replies?: number; cards?: number };
};

type ReplyMessageShape = {
  id: string;
  role: "user" | "bot";
  quickReplies?: QuickReply[];
  productCards?: ProductCard[];
  renderPlan?: RenderPlan;
};

type ReplyProps<TMessage extends ReplyMessageShape> = {
  modelId: string;
  message: TMessage;
  isLatest: boolean;
  sending: boolean;
  quickReplyDrafts: Record<string, string[]>;
  lockedReplySelections: Record<string, string[]>;
  setQuickReplyDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
  setLockedReplySelections: Dispatch<SetStateAction<Record<string, string[]>>>;
  enableQuickReplies?: boolean;
  enableProductCards?: boolean;
  onSubmit: (text: string) => void;
};

function parseLeadDayValue(value: string) {
  const m = String(value || "").match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ConversationReplySelectors<TMessage extends ReplyMessageShape>({
  modelId,
  message,
  isLatest,
  sending,
  quickReplyDrafts,
  lockedReplySelections,
  setQuickReplyDrafts,
  setLockedReplySelections,
  enableQuickReplies = true,
  enableProductCards = true,
  onSubmit,
}: ReplyProps<TMessage>) {
  if (message.role !== "bot") return null;

  const quickReplies = message.quickReplies || [];
  const productCards = message.productCards || [];
  const renderPlan = message.renderPlan;
  if (!renderPlan) return null;

  const selectionMode = renderPlan?.selection_mode || "single";
  const isMultiSelectPrompt = selectionMode === "multi";
  const shouldRenderQuickByType = renderPlan.view === "choice" && Boolean(renderPlan.enable_quick_replies);
  const shouldRenderCardsByType = renderPlan.view === "cards" && Boolean(renderPlan.enable_cards);
  const canInteractWithMessage = renderPlan.interaction_scope === "any" ? true : isLatest;

  const quickDraftKey = `${modelId}:${message.id}:quick`;
  const quickSelected = quickReplyDrafts[quickDraftKey] || [];
  const quickLocked = lockedReplySelections[quickDraftKey] || [];
  const effectiveQuickSelection = quickLocked.length > 0 ? quickLocked : quickSelected;
  const quickIsLocked = quickLocked.length > 0;

  const minRequired = Number.isFinite(Number(renderPlan?.min_select || 0)) && Number(renderPlan?.min_select || 0) > 0
    ? Number(renderPlan?.min_select)
    : 1;
  const canConfirmQuick = !quickIsLocked && quickSelected.length >= minRequired;

  const cardDraftKey = `${modelId}:${message.id}:card`;
  const selectedCard = (quickReplyDrafts[cardDraftKey] || [])[0] || "";
  const lockedCard = (lockedReplySelections[cardDraftKey] || [])[0] || "";
  const effectiveSelectedCard = lockedCard || selectedCard;
  const cardIsLocked = Boolean(lockedCard);
  const canConfirmCard = !cardIsLocked && Boolean(selectedCard);

  return (
    <>
      {enableQuickReplies && quickReplies.length > 0 && shouldRenderQuickByType ? (
        <>
          <div className="mt-[5px]">
            <ConversationGrid columns={Math.min(Math.max(1, renderPlan?.grid_columns?.quick_replies || 1), Math.max(1, quickReplies.length))}>
              {quickReplies.map((item, idx) => {
                const num = parseLeadDayValue(item.value);
                const normalized = num ? String(num) : String(item.value);
                const picked = effectiveQuickSelection.includes(normalized);
                return (
                  <ConversationQuickReplyButton
                    key={`${message.id}-quick-${idx}-${item.value}`}
                    label={item.label}
                    picked={picked}
                    disabled={sending || quickIsLocked || !canInteractWithMessage}
                    onClick={() => {
                      if (quickIsLocked || !canInteractWithMessage) return;
                      setQuickReplyDrafts((prev) => {
                        const now = prev[quickDraftKey] || [];
                        const next = isMultiSelectPrompt
                          ? now.includes(normalized)
                            ? now.filter((v) => v !== normalized)
                            : [...now, normalized]
                          : now[0] === normalized
                            ? []
                            : [normalized];
                        return { ...prev, [quickDraftKey]: next };
                      });
                    }}
                  />
                );
              })}
            </ConversationGrid>
          </div>
          {canInteractWithMessage && !quickIsLocked ? (
            <div className="mt-[5px] flex justify-end">
              <ConversationConfirmButton
                enabled={canConfirmQuick}
                disabled={sending || !canConfirmQuick}
                onClick={() => {
                  const picked = isMultiSelectPrompt ? quickSelected.filter((v) => String(v).trim() !== "") : quickSelected.slice(0, 1);
                  if (picked.length < minRequired) return;
                  const maxAllowed = Number.isFinite(Number(renderPlan?.max_select || 0)) && Number(renderPlan?.max_select || 0) > 0
                    ? Number(renderPlan?.max_select)
                    : null;
                  const normalizedPicked = maxAllowed && maxAllowed > 0 ? picked.slice(0, maxAllowed) : picked;
                  setLockedReplySelections((prev) => ({ ...prev, [quickDraftKey]: normalizedPicked }));
                  setQuickReplyDrafts((prev) => {
                    const next = { ...prev };
                    delete next[quickDraftKey];
                    return next;
                  });
                  onSubmit(isMultiSelectPrompt || renderPlan?.submit_format === "csv" ? normalizedPicked.join(",") : normalizedPicked[0]);
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {enableProductCards && productCards.length > 0 && shouldRenderCardsByType ? (
        <>
          <div className="mt-[5px]">
            <ConversationGrid columns={Math.min(Math.max(1, renderPlan?.grid_columns?.cards || 1), Math.max(1, productCards.length))}>
              {productCards.map((card, idx) => {
                const picked = effectiveSelectedCard === String(card.value);
                return (
                  <ConversationProductCard
                    key={`${message.id}-card-${card.id}-${idx}`}
                    item={card}
                    picked={picked}
                    disabled={sending || cardIsLocked || !canInteractWithMessage}
                    onClick={() => {
                      if (cardIsLocked || !canInteractWithMessage) return;
                      setQuickReplyDrafts((prev) => ({ ...prev, [cardDraftKey]: picked ? [] : [String(card.value)] }));
                    }}
                  />
                );
              })}
            </ConversationGrid>
          </div>
          {canInteractWithMessage && !cardIsLocked ? (
            <div className="mt-[5px] flex justify-end">
              <ConversationConfirmButton
                enabled={canConfirmCard}
                disabled={sending || !canConfirmCard}
                onClick={() => {
                  if (!selectedCard) return;
                  setLockedReplySelections((prev) => ({ ...prev, [cardDraftKey]: [selectedCard] }));
                  setQuickReplyDrafts((prev) => {
                    const next = { ...prev };
                    delete next[cardDraftKey];
                    return next;
                  });
                  onSubmit(selectedCard);
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

// ---- migrated: ConversationExistingSetup ----
type ConversationExistingMode = "history" | "edit" | "new";
type ConversationSetupMode = "existing" | "new";

type ConversationExistingSetupProps = {
  showModelSelector: boolean;
  modelSelectorAdminOnly?: boolean;
  showAgentSelector?: boolean;
  showModeExisting: boolean;
  modeExistingAdminOnly?: boolean;
  showSessionIdSearch?: boolean;
  showModeNew: boolean;
  modeNewAdminOnly?: boolean;
  setupMode: ConversationSetupMode;
  onSelectExisting: () => void;
  onSelectNew: () => void;

  selectedAgentGroupId: string;
  selectedAgentId: string;
  selectedSessionId: string | null;
  sessionsLength: number;
  sessionsLoading: boolean;
  sessionsError: string | null;
  conversationMode: ConversationExistingMode;

  agentGroupOptions: SelectOption[];
  versionOptions: SelectOption[];
  sessionOptions: SelectOption[];

  onSelectAgentGroup: (value: string) => void;
  onSelectAgentVersion: (value: string) => void;
  onSelectSession: (value: string) => void;
  onSearchSessionById: (value: string) => void;
  onChangeConversationMode: (mode: ConversationExistingMode) => void;
  existingFieldOrder?: ExistingSetupFieldKey[];
  existingLabels?: Partial<Record<ExistingSetupLabelKey, string>>;
};

export function ConversationExistingSetup({
  showModelSelector,
  modelSelectorAdminOnly = false,
  showAgentSelector = true,
  showModeExisting,
  modeExistingAdminOnly = false,
  showSessionIdSearch = true,
  showModeNew,
  modeNewAdminOnly = false,
  setupMode,
  onSelectExisting,
  onSelectNew,
  selectedAgentGroupId,
  selectedAgentId,
  selectedSessionId,
  sessionsLength,
  sessionsLoading,
  sessionsError,
  conversationMode,
  agentGroupOptions,
  versionOptions,
  sessionOptions,
  onSelectAgentGroup,
  onSelectAgentVersion,
  onSelectSession,
  onSearchSessionById,
  onChangeConversationMode,
  existingFieldOrder,
  existingLabels,
}: ConversationExistingSetupProps) {
  const [sessionSearchId, setSessionSearchId] = useState("");
  const orderedKeys: ExistingSetupFieldKey[] =
    existingFieldOrder || ["agentSelector", "versionSelector", "sessionSelector", "sessionIdSearch", "conversationMode"];
  const labelOf = (key: ExistingSetupFieldKey, fallback: string) => existingLabels?.[key] || fallback;

  return (
    <>
      {showModelSelector ? (
        <div className="border-b border-slate-200 bg-white pb-3">
          {modelSelectorAdminOnly ? (
            <div className="mb-2">
              <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                ADMIN
              </span>
            </div>
          ) : null}
          <div className={cn("grid gap-2 w-full", showModeExisting && showModeNew ? "grid-cols-2" : "grid-cols-1")}>
            {showModeExisting ? (
              <button
                type="button"
                onClick={onSelectExisting}
                className={cn(
                  "w-full rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  setupMode === "existing"
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {existingLabels?.modeExisting || "기존 모델"}
                {modeExistingAdminOnly ? (
                  <span className="ml-2 rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                    ADMIN
                  </span>
                ) : null}
              </button>
            ) : null}
            {showModeNew ? (
              <button
                type="button"
                onClick={onSelectNew}
                className={cn(
                  "w-full rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  setupMode === "new"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {existingLabels?.modeNew || "신규 모델"}
                {modeNewAdminOnly ? (
                  <span className="ml-2 rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                    ADMIN
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {setupMode === "existing" ? (
        <div className="space-y-3">
          {orderedKeys.map((key) => {
            if (key === "agentSelector") {
              if (!showAgentSelector) return null;
              return (
                <div key={key}>
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">{labelOf(key, "에이전트 선택")}</div>
                  <SelectPopover
                    value={selectedAgentGroupId}
                    onChange={onSelectAgentGroup}
                    options={agentGroupOptions}
                    searchable
                    className="flex-1 min-w-0"
                  />
                </div>
              );
            }
            if (key === "versionSelector") {
              if (!showAgentSelector || !selectedAgentGroupId) return null;
              return (
                <div key={key}>
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">{labelOf(key, "버전 선택")}</div>
                  <SelectPopover
                    value={selectedAgentId}
                    onChange={onSelectAgentVersion}
                    options={versionOptions}
                    searchable
                    className="flex-1 min-w-0"
                  />
                </div>
              );
            }
            if (key === "sessionSelector") {
              if (!showAgentSelector || !selectedAgentId) return null;
              return (
                <div key={key}>
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">{labelOf(key, "세션 선택")}</div>
                  <SelectPopover
                    value={selectedSessionId || ""}
                    onChange={onSelectSession}
                    options={sessionOptions}
                    searchable
                    className="flex-1 min-w-0"
                  />
                </div>
              );
            }
            if (key === "sessionIdSearch") {
              if (!showAgentSelector || !showSessionIdSearch) return null;
              return (
                <div key={key}>
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">{labelOf(key, "세션 ID 직접 조회")}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={sessionSearchId}
                      onChange={(e) => setSessionSearchId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        onSearchSessionById(sessionSearchId);
                      }}
                      placeholder="세션 ID로 조회 (예: 9eecff5d-...)"
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => onSearchSessionById(sessionSearchId)}
                      disabled={sessionsLoading}
                      className={cn(
                        "h-9 shrink-0 rounded-md border px-3 text-xs font-semibold",
                        sessionsLoading
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      조회
                    </button>
                  </div>
                  {sessionsLoading ? <div className="mt-1 text-[11px] text-slate-500">세션 불러오는 중...</div> : null}
                  {sessionsError ? <div className="mt-1 text-[11px] text-rose-600">{sessionsError}</div> : null}
                </div>
              );
            }
            if (key === "conversationMode") {
              if (!showAgentSelector || !(selectedAgentId && (selectedSessionId || sessionsLength === 0))) return null;
              return (
                <div key={key} className="space-y-1">
                  <div className="mb-1 text-[11px] font-semibold text-slate-600">{labelOf(key, "모드 선택")}</div>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => onChangeConversationMode("history")}
                      disabled={sessionsLength === 0}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                        sessionsLength === 0 && "cursor-not-allowed opacity-50",
                        conversationMode === "history"
                          ? "border-slate-300 bg-slate-100 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      히스토리 모드
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeConversationMode("new")}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                        conversationMode === "new"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      신규 대화
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeConversationMode("edit")}
                      disabled={sessionsLength === 0}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                        sessionsLength === 0 && "cursor-not-allowed opacity-50",
                        conversationMode === "edit"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      수정 모드
                    </button>
                  </div>
                  {sessionsLength === 0 ? (
                    <div className="text-[11px] text-slate-500">선택된 에이전트/버전에 세션이 없어 신규 대화만 가능합니다.</div>
                  ) : null}
                  {conversationMode === "edit" ? (
                    <div className="text-[11px] text-amber-700">수정 모드 첫 전송 시 기존 세션을 복제해 새 세션으로 이어집니다.</div>
                  ) : null}
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : null}
    </>
  );
}

// ---- migrated: ConversationNewModelControls ----
type ConversationNewModelControlsProps = {
  showKbSelector: boolean;
  kbLabel?: string;
  kbAdminOnly?: boolean;
  kbValue: string;
  kbOptions: SelectOption[];
  onKbChange: (value: string) => void;
  kbInfoOpen: boolean;
  onToggleKbInfo: () => void;
  kbInfoText: string;

  showAdminKbSelector: boolean;
  adminKbLabel?: string;
  adminKbAdminOnly?: boolean;
  adminKbValues: string[];
  adminKbOptions: SelectOption[];
  onAdminKbChange: (values: string[]) => void;
  adminKbInfoOpen: boolean;
  onToggleAdminKbInfo: () => void;
  adminKbInfoText: string;

  showRouteSelector: boolean;
  routeLabel?: string;
  routeAdminOnly?: boolean;
  routeValue: string;
  routeOptions: SelectOption[];
  onRouteChange: (value: string) => void;
  routeInfoOpen: boolean;
  onToggleRouteInfo: () => void;
  routeInfoText: string;
  setupFieldOrder?: Array<"kbSelector" | "adminKbSelector" | "routeSelector">;
};

export function ConversationNewModelControls({
  showKbSelector,
  kbLabel = "KB 선택",
  kbAdminOnly = false,
  kbValue,
  kbOptions,
  onKbChange,
  kbInfoOpen,
  onToggleKbInfo,
  kbInfoText,
  showAdminKbSelector,
  adminKbLabel = "관리자 KB 선택",
  adminKbAdminOnly = true,
  adminKbValues,
  adminKbOptions,
  onAdminKbChange,
  adminKbInfoOpen,
  onToggleAdminKbInfo,
  adminKbInfoText,
  showRouteSelector,
  routeLabel = "Runtime 선택",
  routeAdminOnly = false,
  routeValue,
  routeOptions,
  onRouteChange,
  routeInfoOpen,
  onToggleRouteInfo,
  routeInfoText,
  setupFieldOrder = ["kbSelector", "adminKbSelector", "routeSelector"],
}: ConversationNewModelControlsProps) {
  const sections: Record<"kbSelector" | "adminKbSelector" | "routeSelector", ReactNode> = {
    kbSelector: showKbSelector ? (
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <span>{kbLabel}</span>
          {kbAdminOnly ? (
            <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
              ADMIN
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <SelectPopover
            value={kbValue}
            onChange={onKbChange}
            options={kbOptions}
            searchable
            className="flex-1 min-w-0"
          />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onToggleKbInfo}
            aria-label="KB 정보"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        {kbInfoOpen ? (
          <textarea
            readOnly
            value={kbInfoText}
            className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
          />
        ) : null}
      </div>
    ) : null,
    adminKbSelector: showAdminKbSelector ? (
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <span>{adminKbLabel}</span>
          {adminKbAdminOnly ? (
            <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
              ADMIN
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <MultiSelectPopover
            values={adminKbValues}
            onChange={onAdminKbChange}
            options={adminKbOptions}
            placeholder="관리자 KB 선택"
            displayMode="count"
            showBulkActions
            className="flex-1 min-w-0"
          />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onToggleAdminKbInfo}
            aria-label="관리자 KB 정보"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        {adminKbInfoOpen ? (
          <textarea
            readOnly
            value={adminKbInfoText}
            className="mt-2 min-h-[80px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
          />
        ) : null}
      </div>
    ) : null,
    routeSelector: showRouteSelector ? (
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <span>{routeLabel}</span>
          {routeAdminOnly ? (
            <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
              ADMIN
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <SelectPopover value={routeValue} onChange={onRouteChange} options={routeOptions} className="flex-1 min-w-0" />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onToggleRouteInfo}
            aria-label="Route 정보"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        {routeInfoOpen ? (
          <textarea
            readOnly
            value={routeInfoText}
            className="mt-2 min-h-[50px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
          />
        ) : null}
      </div>
    ) : null,
  };

  return (
    <>
      {setupFieldOrder.map((key) => {
        const section = sections[key];
        if (!section) return null;
        return <Fragment key={key}>{section}</Fragment>;
      })}
    </>
  );
}

function ConversationModelChatColumnCore({
  model,
  visibleMessages,
  isAdminUser,
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
  onCollapse,
  onInputChange,
  onSetChatScrollRef,
}: ConversationModelChatColumnLegoProps) {
  const shouldRenderPrefillMessages = interactionFeatures.prefill && visibleMessages.length === 0;
  const effectiveVisibleMessages: ChatMessage[] = shouldRenderPrefillMessages
    ? [
      {
        id: `${model.id}-prefill-line-1`,
        role: "bot",
        content: "기록한대로 응대하는 AI 상담사를",
      },
      {
        id: `${model.id}-prefill-line-2`,
        role: "bot",
        content: "압도적으로 저렴하게 사용해보세요",
      },
    ]
    : visibleMessages;

  const chatScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const handleSetChatScrollRef = (el: HTMLDivElement | null) => {
    chatScrollAreaRef.current = el;
    onSetChatScrollRef(el);
  };
  const handlePaneWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = chatScrollAreaRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) return;
    const goingDown = event.deltaY > 0;
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((goingDown && atBottom) || (!goingDown && atTop)) return;
    event.preventDefault();
    el.scrollTop += event.deltaY;
  };

  const submitDisabled =
    (model.setupMode === "existing" && model.conversationMode === "history") ||
    !model.input.trim() ||
    model.sending ||
    (model.setupMode === "existing" && !model.config.kbId) ||
    (model.setupMode === "existing" && (!model.selectedAgentId || (model.conversationMode !== "new" && !model.selectedSessionId)));

  return (
    <div panel-lego="ConversationModelChatColumnLego.Panel" className="relative h-full min-h-0 flex flex-col overflow-hidden bg-white p-4" style={{ height: "100%" }} onWheel={handlePaneWheel}>
      {isAdminUser && adminFeatures.enabled ? (
        <ConversationAdminMenu
          className="absolute right-6 top-6"
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
          disableCopy={effectiveVisibleMessages.length === 0}
        />
      ) : null}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          ref={handleSetChatScrollRef}
          className={`relative z-0 h-full overflow-auto pr-2 pl-2 pb-4 scrollbar-hide bg-slate-50 rounded-xl ${isAdminUser ? "pt-10" : "pt-2"}`}
        >
          <ConversationThread
            messages={effectiveVisibleMessages}
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
                        <span>응답 생성 중...</span>
                      </div>
                    </div>
                  ) : msg.role === "bot" ? (
                    msg.richHtml ? (
                      <div style={{ margin: 0, padding: 0, lineHeight: "inherit", whiteSpace: "normal" }} dangerouslySetInnerHTML={{ __html: msg.richHtml }} />
                    ) : (
                      renderBotContent(msg.content)
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
                  ? "수정할 내용을 입력하세요 (새 메시지로 복제되어 이어집니다.)"
                  : "새로운 대화 질문을 입력하세요."
            }
            className="flex-1"
          />
          <Button type="submit" disabled={submitDisabled} aria-label={model.sending ? "전송 중" : "전송"}>
            {model.sending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      ) : null}
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
      ) : null}
    </div>
  );
}

// ---- migrated: ConversationModelCard ----
type ConversationModelMode = "history" | "edit" | "new";
type ConversationModelKbItem = {
  id: string;
  title: string;
  content?: string | null;
  is_admin?: boolean | string | null;
  is_sample?: boolean | null;
  applies_to_user?: boolean | null;
};

type ConversationModelToolShape = {
  id: string;
  provider?: string;
  name: string;
  description?: string | null;
};

type ConversationModelStateLike = {
  id: string;
  config: {
    llm: string;
    kbId: string;
    inlineKb: string;
    inlineKbSampleSelectionOrder: string[];
    adminKbIds: string[];
    mcpProviderKeys: string[];
    mcpToolIds: string[];
    route: string;
  };
  detailsOpen: {
    llm: boolean;
    kb: boolean;
    adminKb: boolean;
    mcp: boolean;
    route: boolean;
  };
  setupMode: SetupMode;
  selectedAgentGroupId: string;
  selectedAgentId: string;
  sessions: Array<{ id: string; session_code: string | null; started_at: string | null }>;
  sessionsLoading: boolean;
  sessionsError: string | null;
  selectedSessionId: string | null;
  historyMessages: ChatMessage[];
  messages: ChatMessage[];
  conversationMode: ConversationModelMode;
  editSessionId: string | null;
  sessionId: string | null;
  layoutExpanded: boolean;
  adminLogControlsOpen: boolean;
  showAdminLogs: boolean;
  chatSelectionEnabled: boolean;
  selectedMessageIds: string[];
  input: string;
  sending: boolean;
};

type ConversationModelAgentVersionItem = {
  id: string;
  version?: string | null;
  name: string;
  is_active?: boolean | null;
};

type ConversationModelCardProps = {
  index: number;
  modelCount: number;
  model: ConversationModelStateLike;
  pageFeatures: ConversationPageFeatures;
  setupUi: ConversationSetupUi;
  isAdminUser: boolean;
  latestAdminKbId: string;

  tools: ConversationModelToolShape[];
  toolOptions: SelectOption[];
  toolById: Map<string, ConversationModelToolShape>;
  providerByKey: Map<string, { title: string }>;
  agentVersionsByGroup: Map<string, ConversationModelAgentVersionItem[]>;
  formatKstDateTime: (value?: string | null) => string;

  agentGroupOptions: SelectOption[];
  llmOptions: SelectOption[];
  kbOptions: SelectOption[];
  adminKbOptions: SelectOption[];
  providerOptions: SelectOption[];
  routeOptions: SelectOption[];
  kbItems: ConversationModelKbItem[];
  inlineKbSamples: InlineKbSampleItem[];

  quickReplyDrafts: Record<string, string[]>;
  lockedReplySelections: Record<string, string[]>;
  setQuickReplyDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
  setLockedReplySelections: Dispatch<SetStateAction<Record<string, string[]>>>;

  onRemoveModel: (id: string) => void;
  onCopySessionId: (sessionId: string | null) => void;
  onOpenSessionInNewTab: (sessionId: string | null) => void;
  onDeleteSession: (id: string) => void;
  onUpdateModel: (id: string, updater: (m: ModelState) => ModelState) => void;
  onResetModel: (id: string) => void;
  onSelectAgentGroup: (id: string, groupId: string) => void;
  onSelectAgentVersion: (id: string, agentId: string) => Promise<void> | void;
  onSelectSession: (id: string, sessionId: string) => Promise<void> | void;
  onSearchSessionById: (id: string, sessionId: string) => Promise<void> | void;
  onChangeConversationMode: (id: string, mode: ConversationModelMode) => void;
  onCopyConversation: (id: string) => Promise<void> | void;
  onCopyIssue: (id: string) => Promise<void> | void;
  onToggleMessageSelection: (id: string, messageId: string) => void;
  onSubmitMessage: (id: string, text: string) => Promise<void> | void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onInputChange: (id: string, value: string) => void;
  setLeftPaneRef: (id: string, el: HTMLDivElement | null) => void;
  setChatScrollRef: (id: string, el: HTMLDivElement | null) => void;
  describeLlm: (llm: string) => string;
  describeRoute: (route: string) => string;
  layoutMode?: "full" | "columnsOnly" | "separateBoxes";
};

export type ConversationModelSetupColumnLegoProps = {
  model: ConversationModelStateLike;
  pageFeatures: ConversationPageFeatures;
  setupUi: ConversationSetupUi;
  isAdminUser: boolean;
  agentGroupOptions: SelectOption[];
  versionOptions: SelectOption[];
  sessionOptions: SelectOption[];
  inlineKbSamples: InlineKbSampleItem[];
  inlineKbSampleConflict: boolean;
  llmOptions: SelectOption[];
  kbOptions: SelectOption[];
  adminKbOptions: SelectOption[];
  providerOptions: SelectOption[];
  routeOptions: SelectOption[];
  filteredToolOptions: SelectOption[];
  kbInfoText: string;
  adminKbInfoText: string;
  mcpInfoText: string;
  newModelControlOrder: Array<"kbSelector" | "adminKbSelector" | "routeSelector">;
  onSetLeftPaneRef: (el: HTMLDivElement | null) => void;
  onSelectExisting: () => void;
  onSelectNew: () => void;
  onSelectAgentGroup: (value: string) => void;
  onSelectAgentVersion: (value: string) => void;
  onSelectSession: (value: string) => void;
  onSearchSessionById: (value: string) => void;
  onChangeConversationMode: (mode: ConversationModelMode) => void;
  onInlineKbChange: (value: string) => void;
  onInlineKbSampleApply: (sampleIds: string[]) => void;
  onLlmChange: (value: string) => void;
  onToggleLlmInfo: () => void;
  onKbChange: (value: string) => void;
  onToggleKbInfo: () => void;
  onAdminKbChange: (values: string[]) => void;
  onToggleAdminKbInfo: () => void;
  onRouteChange: (value: string) => void;
  onToggleRouteInfo: () => void;
  onProviderChange: (values: string[]) => void;
  onToggleMcpInfo: () => void;
  onActionChange: (values: string[]) => void;
  describeLlm: (llm: string) => string;
  describeRoute: (route: string) => string;
};

export function ConversationModelSetupColumnLego({
  model,
  pageFeatures,
  setupUi,
  isAdminUser,
  agentGroupOptions,
  versionOptions,
  sessionOptions,
  inlineKbSamples,
  inlineKbSampleConflict,
  llmOptions,
  kbOptions,
  adminKbOptions,
  providerOptions,
  routeOptions,
  filteredToolOptions,
  kbInfoText,
  adminKbInfoText,
  mcpInfoText,
  newModelControlOrder,
  onSetLeftPaneRef,
  onSelectExisting,
  onSelectNew,
  onSelectAgentGroup,
  onSelectAgentVersion,
  onSelectSession,
  onSearchSessionById,
  onChangeConversationMode,
  onInlineKbChange,
  onInlineKbSampleApply,
  onLlmChange,
  onToggleLlmInfo,
  onKbChange,
  onToggleKbInfo,
  onAdminKbChange,
  onToggleAdminKbInfo,
  onRouteChange,
  onToggleRouteInfo,
  onProviderChange,
  onToggleMcpInfo,
  onActionChange,
  describeLlm,
  describeRoute,
}: ConversationModelSetupColumnLegoProps) {
  const showModeSelector = pageFeatures.setup.modeExisting && pageFeatures.setup.modeNew;
  const forceExistingSetupControls = pageFeatures.setup.modeExisting && !pageFeatures.setup.modeNew;
  return (
    <div className="h-full min-h-0 overflow-hidden" parts-lego="ConversationModelSetupColumnLego">
      <ConversationSetupBox
        className="h-full rounded-none border-0"
        contentClassName="h-full min-h-0 overflow-auto p-4"
      >
        <div ref={onSetLeftPaneRef} className="space-y-3">
          <ConversationExistingSetup
            showModelSelector={showModeSelector}
            modelSelectorAdminOnly={pageFeatures.visibility.setup.modelSelector === "admin"}
            showAgentSelector={pageFeatures.setup.agentSelector || forceExistingSetupControls}
            showModeExisting={pageFeatures.setup.modeExisting}
            modeExistingAdminOnly={pageFeatures.visibility.setup.modeExisting === "admin"}
            showSessionIdSearch={pageFeatures.setup.sessionIdSearch || forceExistingSetupControls}
            showModeNew={pageFeatures.setup.modeNew}
            modeNewAdminOnly={pageFeatures.visibility.setup.modeNew === "admin"}
            setupMode={model.setupMode}
            onSelectExisting={onSelectExisting}
            onSelectNew={onSelectNew}
            selectedAgentGroupId={model.selectedAgentGroupId}
            selectedAgentId={model.selectedAgentId}
            selectedSessionId={model.selectedSessionId}
            sessionsLength={model.sessions.length}
            sessionsLoading={model.sessionsLoading}
            sessionsError={model.sessionsError}
            conversationMode={model.conversationMode}
            agentGroupOptions={agentGroupOptions}
            versionOptions={versionOptions}
            sessionOptions={sessionOptions}
            onSelectAgentGroup={onSelectAgentGroup}
            onSelectAgentVersion={(value) => {
              void onSelectAgentVersion(value);
            }}
            onSelectSession={(value) => {
              void onSelectSession(value);
            }}
            onSearchSessionById={(value) => {
              void onSearchSessionById(value);
            }}
            onChangeConversationMode={onChangeConversationMode}
            existingFieldOrder={setupUi.existingOrder}
            existingLabels={setupUi.existingLabels}
          />
          {model.setupMode === "new" ? (
            <div className="space-y-3">
              <ConversationSetupFields
                showInlineUserKbInput={pageFeatures.setup.inlineUserKbInput}
                inlineKbAdminOnly={pageFeatures.visibility.setup.inlineUserKbInput === "admin"}
                inlineKbValue={model.config.inlineKb}
                inlineKbLabel={setupUi.labels.inlineUserKbInput}
                onInlineKbChange={onInlineKbChange}
                inlineKbSamples={inlineKbSamples}
                inlineKbSampleSelectionOrder={model.config.inlineKbSampleSelectionOrder}
                onInlineKbSampleApply={onInlineKbSampleApply}
                inlineKbSampleConflict={inlineKbSampleConflict}
                showLlmSelector={pageFeatures.setup.llmSelector}
                llmLabel={setupUi.labels.llmSelector}
                llmAdminOnly={pageFeatures.visibility.setup.llmSelector === "admin"}
                llmValue={model.config.llm}
                onLlmChange={onLlmChange}
                llmOptions={llmOptions}
                showLlmInfoButton
                onToggleLlmInfo={onToggleLlmInfo}
                llmInfoOpen={model.detailsOpen.llm}
                llmInfoText={describeLlm(model.config.llm)}
                middleContent={
                  <ConversationNewModelControls
                    showKbSelector={pageFeatures.setup.kbSelector}
                    kbLabel={setupUi.labels.kbSelector}
                    kbAdminOnly={pageFeatures.visibility.setup.kbSelector === "admin"}
                    kbValue={model.config.kbId}
                    kbOptions={kbOptions}
                    onKbChange={onKbChange}
                    kbInfoOpen={model.detailsOpen.kb}
                    onToggleKbInfo={onToggleKbInfo}
                    kbInfoText={kbInfoText}
                    showAdminKbSelector={isAdminUser && pageFeatures.setup.adminKbSelector}
                    adminKbLabel={setupUi.labels.adminKbSelector}
                    adminKbAdminOnly={pageFeatures.visibility.setup.adminKbSelector === "admin"}
                    adminKbValues={model.config.adminKbIds}
                    adminKbOptions={adminKbOptions}
                    onAdminKbChange={onAdminKbChange}
                    adminKbInfoOpen={model.detailsOpen.adminKb}
                    onToggleAdminKbInfo={onToggleAdminKbInfo}
                    adminKbInfoText={adminKbInfoText}
                    showRouteSelector={pageFeatures.setup.routeSelector}
                    routeLabel={setupUi.labels.routeSelector}
                    routeAdminOnly={pageFeatures.visibility.setup.routeSelector === "admin"}
                    routeValue={model.config.route}
                    routeOptions={routeOptions}
                    onRouteChange={onRouteChange}
                    routeInfoOpen={model.detailsOpen.route}
                    onToggleRouteInfo={onToggleRouteInfo}
                    routeInfoText={describeRoute(model.config.route)}
                    setupFieldOrder={newModelControlOrder}
                  />
                }
                showMcpProviderSelector={pageFeatures.mcp.providerSelector}
                mcpProviderLabel={setupUi.labels.mcpProviderSelector}
                mcpProviderAdminOnly={pageFeatures.visibility.mcp.providerSelector === "admin"}
                providerValues={model.config.mcpProviderKeys}
                onProviderChange={onProviderChange}
                providerOptions={providerOptions}
                providerPlaceholder="MCP 프로바이더 선택"
                showMcpInfoButton
                onToggleMcpInfo={onToggleMcpInfo}
                mcpInfoOpen={model.detailsOpen.mcp}
                mcpInfoText={mcpInfoText}
                showMcpActionSelector={pageFeatures.mcp.actionSelector}
                mcpActionLabel={setupUi.labels.mcpActionSelector}
                mcpActionAdminOnly={pageFeatures.visibility.mcp.actionSelector === "admin"}
                actionValues={model.config.mcpToolIds}
                onActionChange={onActionChange}
                actionOptions={filteredToolOptions}
                actionPlaceholder="MCP 액션 선택"
                setupFieldOrder={setupUi.order}
              />
            </div>
          ) : null}
        </div>
      </ConversationSetupBox>
    </div>
  );
}

export type ConversationModelChatColumnLegoProps = {
  model: ConversationModelStateLike;
  visibleMessages: ChatMessage[];
  isAdminUser: boolean;
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
    prefill: boolean;
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
  onSetChatScrollRef: (el: HTMLDivElement | null) => void;
};

export function ConversationModelChatColumnLego({
  model,
  visibleMessages,
  isAdminUser,
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
  onSetChatScrollRef,
}: ConversationModelChatColumnLegoProps) {
  return (
    <div className="h-full overflow-hidden" parts-lego="ConversationModelChatColumnLego">
      <ConversationModelChatColumnCore
        model={model}
        visibleMessages={visibleMessages}
        isAdminUser={isAdminUser}
        quickReplyDrafts={quickReplyDrafts}
        lockedReplySelections={lockedReplySelections}
        setQuickReplyDrafts={setQuickReplyDrafts}
        setLockedReplySelections={setLockedReplySelections}
        adminFeatures={adminFeatures}
        interactionFeatures={interactionFeatures}
        onToggleAdminOpen={onToggleAdminOpen}
        onToggleSelectionMode={onToggleSelectionMode}
        onToggleLogs={onToggleLogs}
        onCopyConversation={onCopyConversation}
        onCopyIssue={onCopyIssue}
        onToggleMessageSelection={onToggleMessageSelection}
        onSubmitMessage={onSubmitMessage}
        onExpand={onExpand}
        onCollapse={onCollapse}
        onInputChange={onInputChange}
        onSetChatScrollRef={onSetChatScrollRef}
      />
    </div>
  );
}

export function ConversationModelComposedLego({
  leftLego,
  rightLego,
  className,
}: {
  leftLego: ReactNode;
  rightLego: ReactNode;
  className?: string;
}) {
  return (
    <div className="h-full min-h-0" parts-lego="ConversationModelComposedLego">
      <ConversationSplitLayout className={className || "h-full min-h-0 bg-slate-200 lg:grid-cols-[0.5fr_1fr] lg:gap-px"} leftPanel={leftLego} rightPanel={rightLego} />
    </div>
  );
}

export type ConversationModelLegoAssembly = {
  setupLegoProps: ConversationModelSetupColumnLegoProps;
  chatLegoProps: ConversationModelChatColumnLegoProps;
  visibleMessages: ChatMessage[];
  activeSessionId: string | null;
};

export function createConversationModelLegos(props: ConversationModelCardProps): ConversationModelLegoAssembly {
  const {
    model,
    pageFeatures,
    setupUi,
    isAdminUser,
    latestAdminKbId,
    tools,
    toolOptions,
    toolById,
    providerByKey,
    agentVersionsByGroup,
    formatKstDateTime,
    agentGroupOptions,
    llmOptions,
    kbOptions,
    adminKbOptions,
    providerOptions,
    routeOptions,
    kbItems,
    inlineKbSamples,
    quickReplyDrafts,
    lockedReplySelections,
    setQuickReplyDrafts,
    setLockedReplySelections,
    onUpdateModel,
    onResetModel,
    onSelectAgentGroup,
    onSelectAgentVersion,
    onSelectSession,
    onSearchSessionById,
    onChangeConversationMode,
    onCopyConversation,
    onCopyIssue,
    onToggleMessageSelection,
    onSubmitMessage,
    onExpand,
    onCollapse,
    onInputChange,
    setLeftPaneRef,
    setChatScrollRef,
    describeLlm,
    describeRoute,
  } = props;

  const inlineKbSampleById = new Map<string, InlineKbSampleItem>();
  inlineKbSamples.forEach((sample) => inlineKbSampleById.set(sample.id, sample));
  const inlineKbSampleIdSet = new Set(inlineKbSamples.map((sample) => sample.id));
  const kbItemById = new Map<string, ConversationModelKbItem>();
  kbItems.forEach((kb) => kbItemById.set(kb.id, kb));
  const filteredToolOptions = toolOptions.filter((option) => {
    if (model.config.mcpProviderKeys.length === 0) return false;
    const providerKey = toolById.get(option.id)?.provider;
    return providerKey ? model.config.mcpProviderKeys.includes(providerKey) : false;
  });
  const sessionOptions: SelectOption[] = model.sessions.map((session) => ({
    id: session.id,
    label: session.session_code || session.id,
    description: formatKstDateTime(session.started_at),
  }));
  const versionOptions: SelectOption[] = (agentVersionsByGroup.get(model.selectedAgentGroupId) || []).map((item) => ({
    id: item.id,
    label: `${item.is_active ? "🟢 " : "⚪ "}${item.version || "-"} (${item.name || item.id})`,
    description: item.is_active ? "현재 활성 버전" : "비활성 버전",
  }));
  const visibleMessages =
    model.conversationMode === "history"
      ? model.historyMessages
      : model.conversationMode === "edit"
        ? [...model.historyMessages, ...model.messages]
        : model.messages;
  const inlineKbSampleConflict =
    model.config.inlineKbSampleSelectionOrder.length >= 2 &&
    hasConflictingInlineKbSamples(
      model.config.inlineKbSampleSelectionOrder
        .map((id) => inlineKbSampleById.get(id)?.content || "")
        .filter((value) => value.trim().length > 0)
    );
  const activeSessionId =
    model.conversationMode === "history"
      ? model.selectedSessionId
      : model.conversationMode === "edit"
        ? model.editSessionId || model.sessionId
        : model.sessionId;
  const newModelControlOrder = setupUi.order.filter(
    (key): key is "kbSelector" | "adminKbSelector" | "routeSelector" =>
      key === "kbSelector" || key === "adminKbSelector" || key === "routeSelector"
  );
  const adminKbInfoText =
    model.config.adminKbIds.length === 0
      ? "선택된 관리자 KB 없음"
      : model.config.adminKbIds
        .map((id) => {
          const kb = kbItemById.get(id);
          if (!kb) return null;
          const status = kb.applies_to_user ? "적용됨" : "미적용";
          return `• ${kb.title} (${status})\n${kb.content || "내용 없음"}`;
        })
        .filter(Boolean)
        .join("\n\n");
  const mcpInfoText = [
    `선택된 프로바이더: ${model.config.mcpProviderKeys.length === 0
      ? "없음"
      : model.config.mcpProviderKeys.map((key) => providerByKey.get(key)?.title || key).join(", ")
    }`,
    "",
    model.config.mcpToolIds.length === 0
      ? "선택된 액션 없음"
      : model.config.mcpToolIds
        .map((id) => {
          const tool = toolById.get(id);
          if (!tool) return null;
          const desc = tool.description ? tool.description : "설명 없음";
          return `• ${tool.name}: ${desc}`;
        })
        .filter(Boolean)
        .join("\n"),
  ].join("\n");
  const updateModel = (updater: (m: ModelState) => ModelState) => onUpdateModel(model.id, updater);
  const setConfigValue = <K extends keyof ModelState["config"]>(key: K, value: ModelState["config"][K], reset = false) => {
    updateModel((m) => ({
      ...m,
      config: { ...m.config, [key]: value },
    }));
    if (reset) onResetModel(model.id);
  };
  const toggleDetail = (key: keyof ModelState["detailsOpen"]) =>
    updateModel((m) => ({
      ...m,
      detailsOpen: { ...m.detailsOpen, [key]: !m.detailsOpen[key] },
    }));
  const handleSelectExisting = () =>
    updateModel((m) => ({
      ...m,
      setupMode: "existing",
      conversationMode: "history",
    }));
  const handleSelectNew = () =>
    updateModel((m) => ({
      ...m,
      setupMode: "new",
      conversationMode: "new",
      selectedAgentGroupId: "",
      selectedAgentId: "",
      sessions: [],
      selectedSessionId: null,
      historyMessages: [],
      editSessionId: null,
      sessionId: null,
      config: {
        ...m.config,
        adminKbIds: isAdminUser && latestAdminKbId ? [latestAdminKbId] : [],
      },
    }));
  const handleApplyInlineKbSamples = (sampleIds: string[]) =>
    updateModel((m) => {
      const validIds = sampleIds.filter((id) => inlineKbSampleIdSet.has(id));
      if (validIds.length === 0) return m;
      let nextInlineKb = m.config.inlineKb;
      validIds.forEach((id) => {
        const sample = inlineKbSampleById.get(id);
        if (!sample) return;
        nextInlineKb = appendInlineKbSample(nextInlineKb, sample.content);
      });
      return {
        ...m,
        config: {
          ...m.config,
          inlineKb: nextInlineKb,
          inlineKbSampleSelectionOrder: [...m.config.inlineKbSampleSelectionOrder, ...validIds],
        },
      };
    });
  const handleProviderChange = (values: string[]) => {
    const allowedToolIds = new Set(
      tools
        .filter((tool) => (tool.provider ? values.includes(tool.provider) : false))
        .map((tool) => tool.id)
    );
    if (values.includes("runtime") && isToolEnabled("restock_lite", pageFeatures)) {
      allowedToolIds.add("restock_lite");
    }
    updateModel((m) => ({
      ...m,
      config: {
        ...m.config,
        mcpProviderKeys: values,
        mcpToolIds: m.config.mcpToolIds.filter((id) => allowedToolIds.has(id)),
      },
    }));
    onResetModel(model.id);
  };
  const adminFeaturesForPane = {
    enabled: pageFeatures.adminPanel.enabled,
    selectionToggle: pageFeatures.adminPanel.selectionToggle,
    logsToggle: pageFeatures.adminPanel.logsToggle,
    messageSelection: pageFeatures.adminPanel.messageSelection,
    copyConversation: pageFeatures.adminPanel.copyConversation,
    copyIssue: pageFeatures.adminPanel.copyIssue,
  };
  const interactionFeaturesForPane = {
    quickReplies: pageFeatures.interaction.quickReplies,
    productCards: pageFeatures.interaction.productCards,
    prefill: pageFeatures.interaction.prefill,
    inputSubmit: pageFeatures.interaction.inputSubmit,
  };

  const setupLegoProps: ConversationModelSetupColumnLegoProps = {
    model,
    pageFeatures,
    setupUi,
    isAdminUser,
    agentGroupOptions,
    versionOptions,
    sessionOptions,
    inlineKbSamples,
    inlineKbSampleConflict,
    llmOptions,
    kbOptions,
    adminKbOptions,
    providerOptions,
    routeOptions,
    filteredToolOptions,
    kbInfoText: kbItemById.get(model.config.kbId)?.content || "내용 없음",
    adminKbInfoText,
    mcpInfoText,
    newModelControlOrder,
    onSetLeftPaneRef: (el) => setLeftPaneRef(model.id, el),
    onSelectExisting: handleSelectExisting,
    onSelectNew: handleSelectNew,
    onSelectAgentGroup: (value) => onSelectAgentGroup(model.id, value),
    onSelectAgentVersion: (value) => void onSelectAgentVersion(model.id, value),
    onSelectSession: (value) => void onSelectSession(model.id, value),
    onSearchSessionById: (value) => void onSearchSessionById(model.id, value),
    onChangeConversationMode: (mode) => onChangeConversationMode(model.id, mode),
    onInlineKbChange: (value) => setConfigValue("inlineKb", value),
    onInlineKbSampleApply: handleApplyInlineKbSamples,
    onLlmChange: (value) => setConfigValue("llm", value, true),
    onToggleLlmInfo: () => toggleDetail("llm"),
    onKbChange: (value) => setConfigValue("kbId", value, true),
    onToggleKbInfo: () => toggleDetail("kb"),
    onAdminKbChange: (values) => setConfigValue("adminKbIds", values, true),
    onToggleAdminKbInfo: () => toggleDetail("adminKb"),
    onRouteChange: (value) => setConfigValue("route", value, true),
    onToggleRouteInfo: () => toggleDetail("route"),
    onProviderChange: handleProviderChange,
    onToggleMcpInfo: () => toggleDetail("mcp"),
    onActionChange: (values) => setConfigValue("mcpToolIds", values, true),
    describeLlm,
    describeRoute,
  };

  const chatLegoProps: ConversationModelChatColumnLegoProps = {
    model,
    visibleMessages,
    isAdminUser,
    quickReplyDrafts,
    lockedReplySelections,
    setQuickReplyDrafts,
    setLockedReplySelections,
    adminFeatures: adminFeaturesForPane,
    interactionFeatures: interactionFeaturesForPane,
    onToggleAdminOpen: () =>
      updateModel((m) => ({
        ...m,
        adminLogControlsOpen: !m.adminLogControlsOpen,
      })),
    onToggleSelectionMode: () =>
      updateModel((m) => ({
        ...m,
        chatSelectionEnabled: !m.chatSelectionEnabled,
        selectedMessageIds: !m.chatSelectionEnabled ? m.selectedMessageIds : [],
      })),
    onToggleLogs: () =>
      updateModel((m) => ({
        ...m,
        showAdminLogs: !m.showAdminLogs,
      })),
    onCopyConversation: () => void onCopyConversation(model.id),
    onCopyIssue: () => void onCopyIssue(model.id),
    onToggleMessageSelection: (messageId) => onToggleMessageSelection(model.id, messageId),
    onSubmitMessage: (text) => void onSubmitMessage(model.id, text),
    onExpand: () => onExpand(model.id),
    onCollapse: () => onCollapse(model.id),
    onInputChange: (value) => onInputChange(model.id, value),
    onSetChatScrollRef: (el) => setChatScrollRef(model.id, el),
  };

  return { setupLegoProps, chatLegoProps, visibleMessages, activeSessionId };
}

