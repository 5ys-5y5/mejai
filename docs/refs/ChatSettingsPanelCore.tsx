"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { ChevronDown, ChevronRight, CircleHelp, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import type { DebugTranscriptOptions } from "@/lib/debugTranscript";
import {
  getDefaultConversationPageFeatures,
  mergeConversationPageFeatures,
  resolveConversationSetupUi,
  type ConversationFeaturesProviderShape,
  type FeatureVisibilityMode,
  type ConversationPageFeatures,
  type ConversationPageKey,
  type ConversationSetupUi,
  type ExistingSetupFieldKey,
  type ExistingSetupLabelKey,
  type SetupFieldKey,
} from "@/lib/conversation/pageFeaturePolicy";
import {
  DEFAULT_CONVERSATION_DEBUG_OPTIONS,
  resolvePageConversationDebugOptions,
} from "@/lib/transcriptCopyPolicy";

const BASE_PAGE_KEYS: ConversationPageKey[] = ["/", "/app/laboratory", "/embed", "/demo", "/call"];
const SETTINGS_CARD_WIDTH = 400;
function normalizePages(pages: ConversationPageKey[]) {
  return Array.from(new Set([...BASE_PAGE_KEYS, ...pages.filter(Boolean)])).sort((a, b) => a.localeCompare(b));
}
function syncSetupUiOrderByHeader(
  pages: ConversationPageKey[],
  setupUiByPage: Record<ConversationPageKey, ConversationSetupUi>
) {
  const headerPage = pages.includes("/") ? "/" : pages[0];
  if (!headerPage) return setupUiByPage;
  const headerUi = setupUiByPage[headerPage];
  if (!headerUi) return setupUiByPage;
  const next: Record<ConversationPageKey, ConversationSetupUi> = { ...setupUiByPage };
  pages.forEach((page) => {
    const current = next[page];
    if (!current) return;
    next[page] = {
      ...current,
      order: [...headerUi.order],
      existingOrder: [...headerUi.existingOrder],
    };
  });
  return next;
}
const DEBUG_OUTPUT_MODE_OPTIONS: SelectOption[] = [
  { id: "full", label: "Full" },
  { id: "summary", label: "Summary (with issues)" },
  { id: "used_only", label: "Used only" },
];
const AUDIT_BOT_SCOPE_OPTIONS: SelectOption[] = [
  { id: "runtime_turns_only", label: "runtime_turns_only" },
  { id: "all_bot_messages", label: "all_bot_messages" },
];
const DEFAULT_LLM_OPTIONS: SelectOption[] = [
  { id: "chatgpt", label: "chatgpt" },
  { id: "gemini", label: "gemini" },
];



type DebugFieldTree = {
  key: string;
  label: string;
  children?: DebugFieldTree[];
};

const RESPONSE_SCHEMA_DETAIL_TREE: DebugFieldTree[] = [
  {
    key: "response_schema_detail_fields",
    label: "RESPONSE_SCHEMA_DETAIL fields",
    children: [
      { key: "message", label: "message" },
      {
        key: "ui_hints",
        label: "UI 힌트",
        children: [
          { key: "ui_hints.view", label: "view" },
          { key: "ui_hints.choice_mode", label: "choice mode" },
        ],
      },
      { key: "quick_replies", label: "quick replies" },
      { key: "cards", label: "cards" },
    ],
  },
];

const RENDER_PLAN_DETAIL_TREE: DebugFieldTree[] = [
  {
    key: "render_plan_detail_fields",
    label: "RENDER_PLAN_DETAIL fields",
    children: [
      { key: "view", label: "view" },
      { key: "enable_quick_replies", label: "quick replies 사용" },
      { key: "enable_cards", label: "cards 사용" },
      { key: "interaction_scope", label: "interaction scope" },
      { key: "selection_mode", label: "selection mode" },
      { key: "min_select", label: "min select" },
      { key: "max_select", label: "max select" },
      { key: "submit_format", label: "submit format" },
      { key: "prompt_kind", label: "prompt kind" },
      {
        key: "quick_reply_source",
        label: "quick reply source",
        children: [
          { key: "quick_reply_source.type", label: "type" },
          { key: "quick_reply_source.criteria", label: "criteria" },
          { key: "quick_reply_source.source_function", label: "source function" },
          { key: "quick_reply_source.source_module", label: "source module" },
        ],
      },
      {
        key: "grid_columns",
        label: "grid columns",
        children: [
          { key: "grid_columns.quick_replies", label: "quick replies" },
          { key: "grid_columns.cards", label: "cards" },
        ],
      },
      {
        key: "debug",
        label: "debug",
        children: [
          { key: "debug.policy_version", label: "policy version" },
          { key: "debug.quick_replies_count", label: "quick replies count" },
          { key: "debug.cards_count", label: "cards count" },
          { key: "debug.selection_mode_source", label: "selection mode source" },
          { key: "debug.min_select_source", label: "min select source" },
          { key: "debug.max_select_source", label: "max select source" },
          { key: "debug.submit_format_source", label: "submit format source" },
        ],
      },
    ],
  },
];

const PREFIX_JSON_SECTIONS_TREE: DebugFieldTree[] = [
  {
    key: "prefix_json_sections",
    label: "prefix_json",
    children: [
      { key: "requestMeta", label: "request_meta" },
      { key: "resolvedAgent", label: "resolved_agent" },
      { key: "kbResolution", label: "kb_resolution" },
      { key: "modelResolution", label: "model_resolution" },
      {
        key: "toolAllowlist",
        label: "tool_allowlist",
        children: [
          { key: "toolAllowlistResolvedToolIds", label: "resolved_tool_ids" },
          { key: "toolAllowlistAllowedToolNames", label: "allowed_tool_names" },
          { key: "toolAllowlistAllowedToolCount", label: "allowed_tool_count" },
          { key: "toolAllowlistMissingExpectedTools", label: "missing_tools_expected_by_intent" },
          { key: "toolAllowlistRequestedToolCount", label: "requested_tool_count" },
          { key: "toolAllowlistValidToolCount", label: "valid_tool_count" },
          { key: "toolAllowlistProviderSelectionCount", label: "provider_selection_count" },
          { key: "toolAllowlistProviderSelections", label: "provider_selections" },
          { key: "toolAllowlistToolsByIdCount", label: "tools_by_id_count" },
          { key: "toolAllowlistToolsByProviderCount", label: "tools_by_provider_count" },
          { key: "toolAllowlistResolvedToolCount", label: "resolved_tool_count" },
          {
            key: "toolAllowlistQueryError",
            label: "query_error",
            children: [
              { key: "toolAllowlistQueryErrorById", label: "by_id" },
              { key: "toolAllowlistQueryErrorByProvider", label: "by_provider" },
            ],
          },
        ],
      },
      { key: "slotFlow", label: "slot_flow" },
      { key: "intentScope", label: "intent_scope" },
      { key: "policyConflicts", label: "policy_conflicts" },
      { key: "conflictResolution", label: "conflict_resolution" },
    ],
  },
];

export type ChatSettingsPanelProps = {
  authToken: string;
};

type GovernanceConfig = {
  enabled: boolean;
  visibility_mode: "public" | "user" | "admin";
  source: "principles_default" | "event_override";
  updated_at: string | null;
  updated_by: string | null;
};

type FieldScope = "page" | "global";

type DebugFieldExamplesPayload = {
  sample_paths?: Record<string, unknown>;
  event_types?: string[];
  mcp_tools?: string[];
  error?: string;
};

type BooleanMap = Record<string, boolean>;

function updateBooleanMap(source: BooleanMap | undefined, keys: string[], next: boolean): BooleanMap {
  const base: BooleanMap = { ...(source || {}) };
  if (next) {
    keys.forEach((key) => {
      base[key] = true;
    });
    return base;
  }
  keys.forEach((key) => {
    delete base[key];
  });
  return base;
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getByPath(obj: unknown, path: string) {
  if (!obj || typeof obj !== "object" || !path) return undefined;
  return path.split(".").reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[segment];
  }, obj);
}

function cloneContainer(value: unknown) {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...(value as Record<string, unknown>) };
  return {};
}

function setByPath<T extends Record<string, unknown>>(source: T, path: string, value: unknown): T {
  if (!path) return source;
  const segments = path.split(".");
  const nextRoot = cloneContainer(source) as Record<string, unknown>;
  let cursor: Record<string, unknown> = nextRoot;
  let current: unknown = source;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }
    const currentValue =
      current && typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined;
    const nextValue = cloneContainer(currentValue) as Record<string, unknown>;
    cursor[segment] = nextValue;
    cursor = nextValue;
    current = currentValue;
  });
  return nextRoot as T;
}

async function parseJsonBody<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}



type ToggleDef = {
  path: string;
  label: string;
  headerLabel?: string;
  scope?: FieldScope;
  vpath?: string;
  dependsOn?: string[];
  labelKey?: "confirmed" | "confirming" | "next";
};

const ADMIN_PANEL_TOGGLES: ToggleDef[] = [
  { path: "adminPanel.enabled", label: "Admin Panel 활성화" },
  { path: "adminPanel.selectionToggle", label: "선택 토글", dependsOn: ["adminPanel.enabled"] },
  { path: "adminPanel.logsToggle", label: "로그 토글", dependsOn: ["adminPanel.enabled"] },
  { path: "adminPanel.messageMeta", label: "메시지 메타", dependsOn: ["adminPanel.enabled"] },
  { path: "adminPanel.copyConversation", label: "대화 복사", dependsOn: ["adminPanel.enabled"] },
];

const INTERACTION_TOGGLES: ToggleDef[] = [
  { path: "interaction.quickReplies", label: "Quick Replies" },
  { path: "interaction.productCards", label: "Product Cards" },
  { path: "interaction.prefill", label: "Prefill" },
  { path: "interaction.inputSubmit", label: "입력/전송" },
];

const WIDGET_PANEL_TOGGLES: ToggleDef[] = [
  { path: "widget.chatPanel", label: "대화 패널" },
  { path: "widget.historyPanel", label: "히스토리 패널" },
  { path: "widget.setupPanel", label: "설정 패널" },
];

const WIDGET_HEADER_TOGGLES: ToggleDef[] = [
  { path: "widget.header.logo", label: "Logo", dependsOn: ["widget.header.enabled"] },
  { path: "widget.header.status", label: "Status", dependsOn: ["widget.header.enabled"] },
  { path: "widget.header.agentAction", label: "상담원 연결", dependsOn: ["widget.header.enabled"] },
  { path: "widget.header.newConversation", label: "새 대화", dependsOn: ["widget.header.enabled"] },
  { path: "widget.header.close", label: "닫기 버튼", dependsOn: ["widget.header.enabled"] },
];

const WIDGET_TAB_TOGGLES: ToggleDef[] = [
  { path: "widget.tabBar.chat", label: "대화 탭", dependsOn: ["widget.tabBar.enabled"] },
  { path: "widget.tabBar.list", label: "리스트 탭", dependsOn: ["widget.tabBar.enabled"] },
  { path: "widget.tabBar.policy", label: "정책 탭", dependsOn: ["widget.tabBar.enabled"] },
];

const MCP_TOGGLES: ToggleDef[] = [
  { path: "mcp.providerSelector", label: "MCP Provider 선택" },
  { path: "mcp.actionSelector", label: "MCP Action 선택" },
];

const THREE_PHASE_TOGGLES: ToggleDef[] = [
  {
    path: "interaction.threePhasePromptShowConfirmed",
    label: "Confirmed",
    headerLabel: "interaction.threePhasePromptShowConfirmed",
    labelKey: "confirmed",
    dependsOn: ["interaction.threePhasePrompt"],
  },
  {
    path: "interaction.threePhasePromptShowConfirming",
    label: "Confirming",
    headerLabel: "interaction.threePhasePromptShowConfirming",
    labelKey: "confirming",
    dependsOn: ["interaction.threePhasePrompt"],
  },
  {
    path: "interaction.threePhasePromptShowNext",
    label: "Next",
    headerLabel: "interaction.threePhasePromptShowNext",
    labelKey: "next",
    dependsOn: ["interaction.threePhasePrompt"],
  },
  {
    path: "interaction.threePhasePromptHideLabels",
    label: "Hide Labels",
    headerLabel: "interaction.threePhasePromptHideLabels",
    dependsOn: ["interaction.threePhasePrompt"],
  },
];

const MCP_GATE_DEPENDS = ["mcp.providerSelector", "mcp.actionSelector"];

const MCP_SETUP_KEYS: SetupFieldKey[] = ["mcpProviderSelector", "mcpActionSelector"];
const SETUP_FIELD_LABELS: Record<SetupFieldKey, string> = {
  inlineUserKbInput: "사용자 KB입력란",
  llmSelector: "LLM 선택",
  kbSelector: "KB 선택",
  adminKbSelector: "관리자 KB 선택",
  routeSelector: "Runtime 선택",
  mcpProviderSelector: "MCP 프로바이더 선택",
  mcpActionSelector: "MCP 액션 선택",
};
const EXISTING_SETUP_LABELS: Record<ExistingSetupLabelKey, string> = {
  modeExisting: "기존 모델",
  modeNew: "신규 모델",
  agentSelector: "에이전트 선택",
  versionSelector: "버전 선택",
  sessionSelector: "세션 선택",
  sessionIdSearch: "세션 ID 직접 조회",
  conversationMode: "모드 선택",
};
const isSetupUiConfigurableKey = (key: SetupFieldKey) => !MCP_SETUP_KEYS.includes(key);

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  visibility: FeatureVisibilityMode;
  onChange: (checked: boolean) => void;
  onChangeVisibility: (mode: FeatureVisibilityMode) => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  neutralStyle?: boolean;
  editableLabel?: boolean;
  onLabelChange?: (value: string) => void;
  showDragHandle?: boolean;
  disabled?: boolean;
};

function ToggleField({
  label,
  checked,
  visibility,
  onChange,
  onChangeVisibility,
  expandable = false,
  expanded = false,
  onToggleExpanded,
  neutralStyle = false,
  editableLabel = false,
  onLabelChange,
  showDragHandle = false,
  disabled = false,
}: ToggleFieldProps) {
  const displayLabel = (label || "").trim() || "setup.unknown";
  const isDisabled = Boolean(disabled);
  const nextVisibility =
    visibility === "public" ? "user" : visibility === "user" ? "admin" : "public";
  return (
    <div
      className={
        neutralStyle
          ? `flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs${isDisabled ? " opacity-60" : ""}`
          : checked
            ? `flex h-12 items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 text-xs ${isDisabled ? " opacity-60" : ""}`
            : `flex h-12 items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 text-xs ${isDisabled ? " opacity-60" : ""}`
      }
    >
      <button
        type="button"
        onClick={() => {
          if (isDisabled) return;
          if (expandable && onToggleExpanded) onToggleExpanded();
        }}
        aria-disabled={!expandable}
        className={
          neutralStyle
            ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-slate-800"
            : checked
              ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-emerald-900"
              : "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-rose-900"
        }
      >
        <span
          contentEditable={editableLabel && !isDisabled}
          suppressContentEditableWarning={editableLabel && !isDisabled}
          onBlur={(e) => {
            if (!editableLabel || isDisabled) return;
            onLabelChange?.((e.currentTarget.textContent || "").trim());
          }}
          onKeyDown={(e) => {
            if (!editableLabel || isDisabled) return;
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLSpanElement).blur();
            }
          }}
          onClick={(e) => {
            if (!editableLabel || isDisabled) return;
            e.stopPropagation();
          }}
          className={editableLabel ? "rounded px-1 outline-none" : undefined}
        >
          {displayLabel}
        </span>
      </button>
      {expandable ? (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onToggleExpanded?.()}
          className="inline-flex h-7 items-center justify-center px-1 text-[12px] font-bold text-slate-700"
          aria-label={`${displayLabel} 상세 토글`}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : null}
      {showDragHandle ? (
        <span className="inline-flex h-7 items-center justify-center px-1 text-slate-500">
          <GripVertical className="h-4 w-4" />
        </span>
      ) : null}
      <span className="state-controls flex items-center gap-1">
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onChange(!checked)}
          className={
            checked
              ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
              : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
          }
        >
          {checked ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onChangeVisibility(nextVisibility)}
          className={
            visibility === "admin"
              ? "inline-flex h-7 w-[60px] items-center justify-center rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
              : visibility === "public"
                ? "inline-flex h-7 w-[60px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                : "inline-flex h-7 w-[60px] items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
          }
        >
          {visibility === "admin" ? "ADMIN" : visibility === "public" ? "PUBLIC" : "USER"}
        </button>
      </span>
    </div>
  );
}

type GroupToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  visibility?: FeatureVisibilityMode;
  onChangeVisibility?: (mode: FeatureVisibilityMode) => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  neutralStyle?: boolean;
  hideToggle?: boolean;
  disabled?: boolean;
};

function GroupToggleField({
  label,
  checked,
  onChange,
  visibility,
  onChangeVisibility,
  expandable = false,
  expanded = false,
  onToggleExpanded,
  neutralStyle = false,
  hideToggle = false,
  disabled = false,
}: GroupToggleFieldProps) {
  const displayLabel = (label || "").trim() || "group.unknown";
  const isDisabled = Boolean(disabled);
  const nextVisibility =
    visibility === "public" ? "user" : visibility === "user" ? "admin" : "public";
  return (
    <div
      className={
        neutralStyle
          ? `flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs${isDisabled ? " opacity-60" : ""}`
          : checked
            ? `flex h-12 items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 text-xs ${isDisabled ? " opacity-60" : ""}`
            : `flex h-12 items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 text-xs ${isDisabled ? " opacity-60" : ""}`
      }
    >
      <button
        type="button"
        onClick={() => {
          if (isDisabled) return;
          if (expandable && onToggleExpanded) onToggleExpanded();
        }}
        aria-disabled={!expandable}
        className={
          neutralStyle
            ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-slate-800"
            : checked
              ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-emerald-900"
              : "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-rose-900"
        }
      >
        <span>{displayLabel}</span>
      </button>
      {expandable ? (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onToggleExpanded?.()}
          className="inline-flex h-7 items-center justify-center px-1 text-[12px] font-bold text-slate-700"
          aria-label={`${displayLabel} 상세 토글`}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : null}
      {!hideToggle ? (
        <span className="state-controls flex items-center gap-1">
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(!checked)}
            className={
              checked
                ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white"
                : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 px-2 py-1 text-[11px] font-bold text-white"
            }
          >
            {checked ? "ON" : "OFF"}
          </button>
          {visibility ? (
            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onChangeVisibility?.(nextVisibility)}
              className={
                visibility === "admin"
                  ? "inline-flex h-7 w-[60px] items-center justify-center rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white"
                  : visibility === "public"
                    ? "inline-flex h-7 w-[60px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white"
                    : "inline-flex h-7 w-[60px] items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-bold text-white"
              }
            >
              {visibility === "admin" ? "ADMIN" : visibility === "public" ? "PUBLIC" : "USER"}
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

type InlineHelpPopupProps = {
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

function InlineHelpPopup({ className, ariaLabel = "도움말", children }: InlineHelpPopupProps) {
  const [open, setOpen] = useState(false);
  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className="inline-flex items-center text-slate-500 hover:text-slate-700"
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[65vh] overflow-auto text-[11px] leading-5 text-slate-600">{children}</div>
          </div>
        </div>
      ) : null}
    </span>
  );
}

type DebugFieldTreeProps = {
  tree: DebugFieldTree[];
  isHeader: boolean;
  disabled: boolean;
  stateMap: Record<string, boolean> | undefined;
  onToggle: (node: DebugFieldTree, next: boolean) => void;
  collapsedMap?: Record<string, boolean>;
  onToggleCollapse?: (key: string, next: boolean) => void;
  isChild?: boolean;
  parentEnabled?: boolean;
};

function DebugFieldTreeRenderer({
  tree,
  isHeader,
  disabled,
  stateMap,
  onToggle,
  collapsedMap,
  onToggleCollapse,
  isChild = false,
  parentEnabled = true,
}: DebugFieldTreeProps) {
  return (
    <div className={isChild ? "detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3" : ""}>
      {tree.map((node) => {
        const isOn = stateMap?.[node.key] ?? true;
        const isCollapsed = collapsedMap?.[node.key] ?? false;
        const effectiveDisabled = disabled || !parentEnabled;
        const rowClass = isHeader
          ? "mt-2 flex h-10 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-[11px]"
          : "mt-2 flex h-10 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-[11px] [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100";
        const isParent = Boolean(node.children && node.children.length > 0);
        return (
          <div key={node.key}>
            {isParent ? (
              <GroupToggleField
                neutralStyle={isHeader}
                label={node.label}
                checked={isOn}
                onChange={(next) => onToggle(node, next)}
                expandable={isHeader}
                expanded={!isCollapsed}
                onToggleExpanded={() => onToggleCollapse?.(node.key, !isCollapsed)}
                hideToggle={isHeader}
              />
            ) : (
              <div className={rowClass}>
                <span>{node.label}</span>
                {!isHeader ? (
                  <button
                    type="button"
                    disabled={effectiveDisabled}
                    onClick={() => onToggle(node, !isOn)}
                    className={!effectiveDisabled && isOn ? "inline-flex h-6 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[10px] font-bold text-white" : "inline-flex h-6 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[10px] font-bold text-white disabled:bg-slate-300"}
                  >
                    {!effectiveDisabled ? (isOn ? "ON" : "OFF") : "OFF"}
                  </button>
                ) : null}
              </div>
            )}
            {isParent && (!isHeader || !isCollapsed) ? (
              <DebugFieldTreeRenderer
                tree={node.children ?? []}
                isHeader={isHeader}
                disabled={disabled}
                stateMap={stateMap}
                onToggle={onToggle}
                collapsedMap={collapsedMap}
                onToggleCollapse={onToggleCollapse}
                isChild={true}
                parentEnabled={isOn && parentEnabled}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function collectTreeKeys(node: DebugFieldTree): string[] {
  const keys = [node.key];
  if (node.children) {
    node.children.forEach((child) => {
      keys.push(...collectTreeKeys(child));
    });
  }
  return keys;
}

function toCsv(values?: string[]) {
  return (values || []).join(", ");
}

export function ChatSettingsPanelCore({ authToken }: ChatSettingsPanelProps) {
  const mode: "chat" = "chat";
  const initialPages = useMemo(() => normalizePages([]), []);
  const buildInitialDraftByPage = useCallback(
    (pages: ConversationPageKey[]) =>
      pages.reduce<Record<ConversationPageKey, ConversationPageFeatures>>((acc, page) => {
        acc[page] = getDefaultConversationPageFeatures(page);
        return acc;
      }, {}),
    []
  );
  const buildInitialDebugByPage = useCallback(
    (pages: ConversationPageKey[]) =>
      pages.reduce<Record<ConversationPageKey, DebugTranscriptOptions>>((acc, page) => {
        acc[page] = { ...DEFAULT_CONVERSATION_DEBUG_OPTIONS };
        return acc;
      }, {}),
    []
  );
  const buildInitialSetupUiByPage = useCallback(
    (pages: ConversationPageKey[], provider: ConversationFeaturesProviderShape | null = null) =>
      syncSetupUiOrderByHeader(
        pages,
        pages.reduce<Record<ConversationPageKey, ConversationSetupUi>>((acc, page) => {
          acc[page] = resolveConversationSetupUi(page, provider);
          return acc;
        }, {})
      ),
    []
  );
  const buildOpenStateByPage = useCallback(
    (pages: ConversationPageKey[]) =>
      pages.reduce<Record<ConversationPageKey, boolean>>((acc, page) => {
        acc[page] = false;
        return acc;
      }, {}),
    []
  );
  const buildOpenStateByPageWithValue = useCallback(
    (pages: ConversationPageKey[], value: boolean) =>
      pages.reduce<Record<ConversationPageKey, boolean>>((acc, page) => {
        acc[page] = value;
        return acc;
      }, {}),
    []
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [governanceSaving, setGovernanceSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [governanceConfig, setGovernanceConfig] = useState<GovernanceConfig | null>(null);
  const [draftByPage, setDraftByPage] = useState<Record<ConversationPageKey, ConversationPageFeatures>>(
    buildInitialDraftByPage(initialPages)
  );
  const [debugCopyDraftByPage, setDebugCopyDraftByPage] =
    useState<Record<ConversationPageKey, DebugTranscriptOptions>>(buildInitialDebugByPage(initialPages));
  const [setupUiByPage, setSetupUiByPage] =
    useState<Record<ConversationPageKey, ConversationSetupUi>>(buildInitialSetupUiByPage(initialPages));
  const [registeredPages, setRegisteredPages] = useState<ConversationPageKey[]>(initialPages);
  const [widgetChatPanelDetailsOpenByPage, setWidgetChatPanelDetailsOpenByPage] =
    useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPageWithValue(initialPages, true));
  const [widgetSetupPanelDetailsOpenByPage, setWidgetSetupPanelDetailsOpenByPage] =
    useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPageWithValue(initialPages, true));
  const [setupExistingDetailsOpenByPage, setSetupExistingDetailsOpenByPage] = useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPage(initialPages));
  const [setupNewDetailsOpenByPage, setSetupNewDetailsOpenByPage] = useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPage(initialPages));
  const [debugHeaderDetailsOpenByPage, setDebugHeaderDetailsOpenByPage] = useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPage(initialPages));
  const [debugTurnDetailsOpenByPage, setDebugTurnDetailsOpenByPage] = useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPage(initialPages));
  const [debugLogsDetailsOpenByPage, setDebugLogsDetailsOpenByPage] = useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPage(initialPages));
  const [debugEventDetailsOpenByPage, setDebugEventDetailsOpenByPage] = useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPage(initialPages));
  const [threePhaseDetailsOpenByPage, setThreePhaseDetailsOpenByPage] = useState<Record<ConversationPageKey, boolean>>(buildOpenStateByPage(initialPages));
  const [debugDetailTreeCollapsedByPage, setDebugDetailTreeCollapsedByPage] = useState<Record<ConversationPageKey, Record<string, boolean>>>(() =>
    initialPages.reduce<Record<ConversationPageKey, Record<string, boolean>>>((acc, page) => {
      acc[page] = {};
      return acc;
    }, {} as Record<ConversationPageKey, Record<string, boolean>>)
  );
  const [debugFieldExamples, setDebugFieldExamples] = useState<Record<string, unknown>>({});
  const [debugFieldEventTypes, setDebugFieldEventTypes] = useState<string[]>([]);
  const [debugFieldMcpTools, setDebugFieldMcpTools] = useState<string[]>([]);
  const [draggingSetupFieldByPage, setDraggingSetupFieldByPage] = useState<
    Partial<Record<ConversationPageKey, SetupFieldKey | null>>
  >({});
  const [draggingExistingSetupFieldByPage, setDraggingExistingSetupFieldByPage] = useState<
    Partial<Record<ConversationPageKey, ExistingSetupFieldKey | null>>
  >({});
  const setExpandAll = useCallback(
    (setter: (value: Record<ConversationPageKey, boolean>) => void, next: boolean) => {
      setter(
        registeredPages.reduce<Record<ConversationPageKey, boolean>>((acc, page) => {
          acc[page] = next;
          return acc;
        }, {})
      );
    },
    [registeredPages]
  );

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) next.Authorization = `Bearer ${authToken}`;
    return next;
  }, [authToken]);

  const loadDebugFieldExamples = useCallback(async () => {
    try {
      const res = await fetch("/api/runtime/debug-fields", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        cache: "no-store",
      });
      const payload = await parseJsonBody<DebugFieldExamplesPayload>(res);
      if (!res.ok) return;
      setDebugFieldExamples((payload?.sample_paths || {}) as Record<string, unknown>);
      setDebugFieldEventTypes(Array.isArray(payload?.event_types) ? payload!.event_types! : []);
      setDebugFieldMcpTools(Array.isArray(payload?.mcp_tools) ? payload!.mcp_tools! : []);
    } catch {
      // optional data for UI hint
    }
  }, [authToken]);

  const pickExample = useCallback(
    (paths: string[]) => {
      for (const path of paths) {
        if (!(path in debugFieldExamples)) continue;
        const value = debugFieldExamples[path];
        if (value === null || value === undefined) return `${path}: null`;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          return `${path}: ${String(value)}`;
        }
        try {
          return `${path}: ${JSON.stringify(value)}`;
        } catch {
          return `${path}: [unserializable]`;
        }
      }
      return "";
    },
    [debugFieldExamples]
  );

  const applyProviderToDraft = useCallback((providerValue?: ConversationFeaturesProviderShape | null) => {
    const discoveredPages = normalizePages(
      [
        ...Object.keys(providerValue?.pages || {}),
        ...Object.keys(providerValue?.settings_ui?.setup_fields || {}),
        ...((providerValue?.page_registry || []).map((p) => String(p || "").trim()).filter(Boolean) as string[]),
      ].filter(Boolean)
    );
    const next = discoveredPages.reduce<Record<ConversationPageKey, ConversationPageFeatures>>((acc, page) => {
      acc[page] = mergeConversationPageFeatures(
        getDefaultConversationPageFeatures(page),
        providerValue?.pages?.[page]
      );
      return acc;
    }, {});
    const nextDebug = discoveredPages.reduce<Record<ConversationPageKey, DebugTranscriptOptions>>((acc, page) => {
      acc[page] = resolvePageConversationDebugOptions(page, providerValue);
      return acc;
    }, {});
    const nextSetupUi = syncSetupUiOrderByHeader(
      discoveredPages,
      discoveredPages.reduce<Record<ConversationPageKey, ConversationSetupUi>>((acc, page) => {
        acc[page] = resolveConversationSetupUi(page, providerValue);
        return acc;
      }, {})
    );
    setRegisteredPages(discoveredPages);
    setDraftByPage(next);
    setDebugCopyDraftByPage(nextDebug);
    setSetupUiByPage(nextSetupUi);
    setWidgetChatPanelDetailsOpenByPage(buildOpenStateByPageWithValue(discoveredPages, true));
    setWidgetSetupPanelDetailsOpenByPage(buildOpenStateByPageWithValue(discoveredPages, true));
    setSetupExistingDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setSetupNewDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setDebugHeaderDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setDebugTurnDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setDebugLogsDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setDebugEventDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setThreePhaseDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setDebugDetailTreeCollapsedByPage(
      discoveredPages.reduce<Record<ConversationPageKey, Record<string, boolean>>>((acc, page) => {
        acc[page] = {};
        return acc;
      }, {} as Record<ConversationPageKey, Record<string, boolean>>)
    );
  }, [buildOpenStateByPage, buildOpenStateByPageWithValue]);

  const updatePage = useCallback(
    (page: ConversationPageKey, updater: (prev: ConversationPageFeatures) => ConversationPageFeatures) => {
      setDraftByPage((prev) => ({ ...prev, [page]: updater(prev[page]) }));
    },
    []
  );

  const updateAllPages = useCallback(
    (updater: (prev: ConversationPageFeatures) => ConversationPageFeatures) => {
      setDraftByPage((prev) => {
        const pages = normalizePages(registeredPages);
        const next: Record<ConversationPageKey, ConversationPageFeatures> = { ...prev };
        pages.forEach((page) => {
          const current = prev[page] || getDefaultConversationPageFeatures(page);
          next[page] = updater(current);
        });
        return next;
      });
    },
    [registeredPages]
  );

  const updateDebugCopyOptions = useCallback(
    (page: ConversationPageKey, updater: (prev: DebugTranscriptOptions) => DebugTranscriptOptions) => {
      setDebugCopyDraftByPage((prev) => ({ ...prev, [page]: updater(prev[page]) }));
    },
    []
  );

  const applyPageUpdate = useCallback(
    (
      page: ConversationPageKey,
      scope: FieldScope | undefined,
      updater: (prev: ConversationPageFeatures) => ConversationPageFeatures
    ) => {
      if (scope === "global") {
        updateAllPages(updater);
        return;
      }
      updatePage(page, updater);
    },
    [updateAllPages, updatePage]
  );

  const updateFeatureByPath = useCallback(
    (page: ConversationPageKey, path: string, value: unknown, scope?: FieldScope) => {
      applyPageUpdate(page, scope, (prev) => setByPath(prev, path, value));
    },
    [applyPageUpdate]
  );

  const updateVisibilityByPath = useCallback(
    (page: ConversationPageKey, path: string, mode: FeatureVisibilityMode, scope?: FieldScope) => {
      applyPageUpdate(page, scope, (prev) => setByPath(prev, path, mode));
    },
    [applyPageUpdate]
  );

  const updateSetupField = useCallback(
    (page: ConversationPageKey, key: SetupFieldKey, value: boolean) => {
      updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, [key]: value } }));
    },
    [updatePage]
  );

  const updateSetupVisibility = useCallback(
    (page: ConversationPageKey, key: SetupFieldKey, mode: FeatureVisibilityMode) => {
      updatePage(page, (prev) => ({
        ...prev,
        visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, [key]: mode } },
      }));
    },
    [updatePage]
  );

  const moveSetupField = useCallback(
    (_page: ConversationPageKey, from: SetupFieldKey, to: SetupFieldKey) => {
      if (from === to) return;
      setSetupUiByPage((prev) => {
        const applyOrder = (source: ConversationSetupUi) => {
          const baseOrder = [...source.order];
          const fromIdx = baseOrder.indexOf(from);
          const toIdx = baseOrder.indexOf(to);
          if (fromIdx < 0 || toIdx < 0) return source;
          const [moved] = baseOrder.splice(fromIdx, 1);
          baseOrder.splice(toIdx, 0, moved);
          return { ...source, order: baseOrder, labels: { ...source.labels } };
        };
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const source = next[key as ConversationPageKey];
          if (!source) return;
          next[key as ConversationPageKey] = applyOrder(source);
        });
        return next;
      });
    },
    []
  );

  const moveExistingSetupField = useCallback(
    (_page: ConversationPageKey, from: ExistingSetupFieldKey, to: ExistingSetupFieldKey) => {
      if (from === to) return;
      setSetupUiByPage((prev) => {
        const applyOrder = (source: ConversationSetupUi) => {
          const baseOrder = [...source.existingOrder];
          const fromIdx = baseOrder.indexOf(from);
          const toIdx = baseOrder.indexOf(to);
          if (fromIdx < 0 || toIdx < 0) return source;
          const [moved] = baseOrder.splice(fromIdx, 1);
          baseOrder.splice(toIdx, 0, moved);
          return { ...source, existingOrder: baseOrder, existingLabels: { ...source.existingLabels } };
        };
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const source = next[key as ConversationPageKey];
          if (!source) return;
          next[key as ConversationPageKey] = applyOrder(source);
        });
        return next;
      });
    },
    []
  );

  const handleSetupDragStart = useCallback(
    (page: ConversationPageKey, key: SetupFieldKey) => (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", key);
      setDraggingSetupFieldByPage((prev) => ({ ...prev, [page]: key }));
    },
    []
  );

  const handleSetupDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleSetupDrop = useCallback(
    (page: ConversationPageKey, targetKey: SetupFieldKey) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromData = e.dataTransfer.getData("text/plain") as SetupFieldKey | "";
      const dragged = (fromData || draggingSetupFieldByPage[page] || null) as SetupFieldKey | null;
      setDraggingSetupFieldByPage((prev) => ({ ...prev, [page]: null }));
      if (!dragged) return;
      moveSetupField(page, dragged, targetKey);
    },
    [draggingSetupFieldByPage, moveSetupField]
  );

  const handleSetupDragEnd = useCallback(
    (page: ConversationPageKey) => () => {
      setDraggingSetupFieldByPage((prev) => ({ ...prev, [page]: null }));
    },
    []
  );

  const handleExistingSetupDragStart = useCallback(
    (page: ConversationPageKey, key: ExistingSetupFieldKey) => (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", key);
      setDraggingExistingSetupFieldByPage((prev) => ({ ...prev, [page]: key }));
    },
    []
  );

  const handleExistingSetupDrop = useCallback(
    (page: ConversationPageKey, targetKey: ExistingSetupFieldKey) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromData = e.dataTransfer.getData("text/plain") as ExistingSetupFieldKey | "";
      const dragged = (fromData || draggingExistingSetupFieldByPage[page] || null) as ExistingSetupFieldKey | null;
      setDraggingExistingSetupFieldByPage((prev) => ({ ...prev, [page]: null }));
      if (!dragged) return;
      moveExistingSetupField(page, dragged, targetKey);
    },
    [draggingExistingSetupFieldByPage, moveExistingSetupField]
  );

  const handleExistingSetupDragEnd = useCallback(
    (page: ConversationPageKey) => () => {
      setDraggingExistingSetupFieldByPage((prev) => ({ ...prev, [page]: null }));
    },
    []
  );

  const loadGovernanceConfig = useCallback(async () => {
    const governanceRes = await fetch("/api/runtime/governance/config", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      cache: "no-store",
    });
    if (!governanceRes.ok) return null;
    const governancePayload = await parseJsonBody<{ config?: GovernanceConfig }>(governanceRes);
    if (governancePayload?.config) {
      setGovernanceConfig(governancePayload.config);
      return governancePayload.config;
    }
    return null;
  }, [authToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth-settings/providers?provider=chat_policy", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      const payload = await parseJsonBody<{ provider?: ConversationFeaturesProviderShape; error?: string }>(res);
      if (!res.ok) {
        setError(payload?.error || "대화 설정을 불러오지 못했습니다.");
        return;
      }
      applyProviderToDraft(payload?.provider || null);
      try {
        await loadGovernanceConfig();
      } catch {
        // governance config is optional for this panel
      }
      try {
        await loadDebugFieldExamples();
      } catch {
        // debug field examples are optional for this panel
      }
    } catch {
      setError("대화 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [applyProviderToDraft, authToken, loadDebugFieldExamples, loadGovernanceConfig]);

  const saveGovernanceConfig = useCallback(
    async (next: { enabled: boolean; visibility_mode: "public" | "user" | "admin" }) => {
      setGovernanceSaving(true);
      const res = await fetch("/api/runtime/governance/config", {
        method: "POST",
        headers,
        body: JSON.stringify(next),
      });
      const payload = await parseJsonBody<{ config?: GovernanceConfig; error?: string }>(res);
      if (!res.ok || payload?.error) {
        throw new Error(payload?.error || "self update 설정 저장에 실패했습니다.");
      }
      if (payload?.config) {
        setGovernanceConfig(payload.config);
      } else {
        await loadGovernanceConfig();
      }
      setError(null);
      setSavedAt(new Date().toLocaleString("ko-KR"));
      setGovernanceSaving(false);
    },
    [headers, loadGovernanceConfig]
  );

  const handleGovernanceChange = useCallback(
    async (next: { enabled: boolean; visibility_mode: "public" | "user" | "admin" }) => {
      try {
        await saveGovernanceConfig(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "self update 설정 저장에 실패했습니다.");
      } finally {
        setGovernanceSaving(false);
      }
    },
    [saveGovernanceConfig]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const columnKeys = useMemo<Array<"__header" | ConversationPageKey>>(
    () => ["__header", ...registeredPages],
    [registeredPages]
  );

  const handleResetToDefaults = () => {
    applyProviderToDraft(null);
    const pages = normalizePages(registeredPages);
    setDebugCopyDraftByPage(buildInitialDebugByPage(pages));
    setSetupUiByPage(buildInitialSetupUiByPage(pages, null));
    setWidgetChatPanelDetailsOpenByPage(buildOpenStateByPageWithValue(pages, true));
    setWidgetSetupPanelDetailsOpenByPage(buildOpenStateByPageWithValue(pages, true));
    setSetupExistingDetailsOpenByPage(buildOpenStateByPage(pages));
    setSetupNewDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugHeaderDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugTurnDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugLogsDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugEventDetailsOpenByPage(buildOpenStateByPage(pages));
    setThreePhaseDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugDetailTreeCollapsedByPage(
      pages.reduce<Record<ConversationPageKey, Record<string, boolean>>>((acc, page) => {
        acc[page] = {};
        return acc;
      }, {} as Record<ConversationPageKey, Record<string, boolean>>)
    );
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const pagesList = normalizePages(registeredPages);
      const pages = pagesList.reduce<Partial<Record<ConversationPageKey, ConversationPageFeatures>>>((acc, page) => {
        if (draftByPage[page]) acc[page] = draftByPage[page];
        return acc;
      }, {});
      const debug_copy = pagesList.reduce<Partial<Record<ConversationPageKey, Partial<DebugTranscriptOptions>>>>(
        (acc, page) => {
          if (debugCopyDraftByPage[page]) acc[page] = debugCopyDraftByPage[page];
          return acc;
        },
        {}
      );
      const setup_fields = pagesList.reduce<
        Partial<
          Record<
            ConversationPageKey,
            {
              order: SetupFieldKey[];
              labels: Record<SetupFieldKey, string>;
              existing_order: ExistingSetupFieldKey[];
              existing_labels: Record<ExistingSetupLabelKey, string>;
            }
          >
        >
      >((acc, page) => {
        const ui = setupUiByPage[page];
        if (!ui) return acc;
        acc[page] = {
          order: ui.order,
          labels: ui.labels,
          existing_order: ui.existingOrder,
          existing_labels: ui.existingLabels,
        };
        return acc;
      }, {});

      const res = await fetch("/api/auth-settings/providers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider: "chat_policy",
          values: {
            pages,
            debug_copy,
            page_registry: registeredPages,
            settings_ui: {
              setup_fields,
            },
          },
          commit: true,
        }),
      });
      const payload = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || payload?.error || !payload?.ok) {
        throw new Error(payload?.error || "대화 설정 저장에 실패했습니다.");
      }
      setSavedAt(new Date().toLocaleString("ko-KR"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "대화 설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {mode === "chat" ? (
        <>
          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">대화 설정 관리</div>
            <div className="mt-2 text-sm text-slate-600">
              서비스 전역 대화 정책을 폼으로 수정합니다. 저장 시 <code>B_chat_settings.chat_policy</code> (org 공통 값)에
              반영됩니다.
            </div>
            {loading ? <div className="mt-2 text-xs text-slate-500">불러오는 중...</div> : null}
            {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}
            {savedAt ? <div className="mt-2 text-xs text-slate-500">저장됨: {savedAt}</div> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || saving}>
                새로고침
              </Button>
              <Button type="button" variant="outline" onClick={handleResetToDefaults} disabled={loading || saving}>
                기본값으로 채우기
              </Button>
              <Button type="button" onClick={handleSave} disabled={loading || saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </Card>

          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-full gap-4">
              {columnKeys.map((column) => {
                const isHeader = column === "__header";
                const page: ConversationPageKey = isHeader ? "/" : column;
                const pageLabel = page === "/embed" ? "위젯 (/embed)" : page;
                const draft = draftByPage[page];
                const setupUiDraft = setupUiByPage[page];
                const chatPanelEnabled = Boolean(draft.widget.chatPanel);
                const setupPanelEnabled = Boolean(draft.widget.setupPanel);
                const adminPanelEnabled = Boolean(draft.adminPanel.enabled);
                const widgetChatPanelExpanded = widgetChatPanelDetailsOpenByPage[page] ?? true;
                const widgetSetupPanelExpanded = widgetSetupPanelDetailsOpenByPage[page] ?? true;
                const chatSectionDisabled = !isHeader && !chatPanelEnabled;
                const setupSectionDisabled = !isHeader && !setupPanelEnabled;
                const mcpSectionDisabled = !isHeader && !setupPanelEnabled;
                const mcpGateEnabled = MCP_GATE_DEPENDS.every((path) => Boolean(getByPath(draft, path)));
                const showMcpGates = isHeader || mcpGateEnabled;
                const effectiveModelSelector = isHeader || Boolean(draft.setup.modelSelector);
                const setupDetailsOpen = effectiveModelSelector;
                const showSetupExistingDetails = Boolean(setupExistingDetailsOpenByPage[page]);
                const showSetupNewDetails = Boolean(setupNewDetailsOpenByPage[page]);
                const debugCopyDraft = debugCopyDraftByPage[page];
                const debugHeader = debugCopyDraft.sections?.header;
                const debugTurn = debugCopyDraft.sections?.turn;
                const debugLogs = debugCopyDraft.sections?.logs;
                const debugLogMcp = debugLogs?.mcp;
                const debugLogEvent = debugLogs?.event;
                const debugLogDebug = debugLogs?.debug;
                const debugOutputMode =
                  debugCopyDraft.outputMode === "summary"
                    ? "summary"
                    : debugLogDebug?.usedOnly
                      ? "used_only"
                      : "full";
                const debugPrefixSections = debugLogDebug?.prefixJsonSections;
                const responseSchemaDetailFields = debugTurn?.responseSchemaDetailFields;
                const renderPlanDetailFields = debugTurn?.renderPlanDetailFields;
                const debugTreeCollapsed = debugDetailTreeCollapsedByPage[page] || {};
                const showDebugHeaderDetails = Boolean(debugHeaderDetailsOpenByPage[page]);
                const showDebugTurnDetails = Boolean(debugTurnDetailsOpenByPage[page]);
                const showDebugLogsDetails = Boolean(debugLogsDetailsOpenByPage[page]);
                const showDebugEventDetails = Boolean(debugEventDetailsOpenByPage[page]);
                const showThreePhaseDetails = Boolean(threePhaseDetailsOpenByPage[page]);
                const showDebugSection =
                  isHeader || (adminPanelEnabled && draft.adminPanel.copyConversation);
                const debugSectionDisabled = !showDebugSection;
                const renderSelectField = (
                  label: string,
                  value: string,
                  options: SelectOption[],
                  onChange: (value: string) => void,
                  disabled = isHeader
                ) => (
                  <label className="block">
                    <div className="mb-1 text-[11px] font-semibold text-slate-600">{label}</div>
                    <SelectPopover
                      value={value}
                      disabled={disabled}
                      options={options}
                      onChange={onChange}
                      className="w-full"
                      buttonClassName="h-9 text-xs"
                    />
                  </label>
                );

                const resolveToggleLabel = (def: ToggleDef) => {
                  if (isHeader) return def.headerLabel || def.path;
                  if (def.labelKey) {
                    const custom = getByPath(
                      draft,
                      `interaction.threePhasePromptLabels.${def.labelKey}`
                    ) as string | undefined;
                    return (custom || "").trim() || def.label;
                  }
                  return def.label;
                };

                const renderToggle = (def: ToggleDef, overrides: Partial<ToggleFieldProps> = {}) => {
                  const { disabled: overrideDisabled, ...restOverrides } = overrides;
                  const depsMet = (def.dependsOn || []).every((path) => Boolean(getByPath(draft, path)));
                  const disabled = !isHeader && !!def.dependsOn?.length && !depsMet;
                  const effectiveDisabled = Boolean(overrideDisabled) || disabled;
                  const visibilityPath = def.vpath ?? `visibility.${def.path}`;
                  const checked = Boolean(getByPath(draft, def.path));
                  const visibility =
                    (getByPath(draft, visibilityPath) as FeatureVisibilityMode | undefined) || "user";
                  const editableLabel = !isHeader && Boolean(def.labelKey);
                  const onLabelChange =
                    def.labelKey && !isHeader
                      ? (value: string) =>
                        updateFeatureByPath(
                          page,
                          `interaction.threePhasePromptLabels.${def.labelKey}`,
                          value
                        )
                      : undefined;
                  return (
                    <ToggleField
                      neutralStyle={isHeader}
                      label={resolveToggleLabel(def)}
                      checked={checked}
                      visibility={visibility}
                      onChange={(v: boolean) => updateFeatureByPath(page, def.path, v, def.scope)}
                      onChangeVisibility={(mode: FeatureVisibilityMode) =>
                        updateVisibilityByPath(page, visibilityPath, mode, def.scope)
                      }
                      editableLabel={editableLabel}
                      onLabelChange={onLabelChange}
                      disabled={effectiveDisabled}
                      {...restOverrides}
                    />
                  );
                };

                const renderWidgetPanelToggle = (
                  def: ToggleDef,
                  options: {
                    expandable?: boolean;
                    expanded?: boolean;
                    onToggleExpanded?: () => void;
                  } = {}
                ) => {
                  const depsMet = (def.dependsOn || []).every((path) => Boolean(getByPath(draft, path)));
                  const disabled = !isHeader && !!def.dependsOn?.length && !depsMet;
                  const visibilityPath = def.vpath ?? `visibility.${def.path}`;
                  const checked = Boolean(getByPath(draft, def.path));
                  const visibility =
                    (getByPath(draft, visibilityPath) as FeatureVisibilityMode | undefined) || "user";
                  return (
                    <GroupToggleField
                      neutralStyle={isHeader}
                      label={resolveToggleLabel(def)}
                      checked={checked}
                      visibility={visibility}
                      onChange={(v) => updateFeatureByPath(page, def.path, v, def.scope)}
                      onChangeVisibility={(mode) => updateVisibilityByPath(page, visibilityPath, mode, def.scope)}
                      expandable={Boolean(options.expandable)}
                      expanded={Boolean(options.expanded)}
                      onToggleExpanded={options.onToggleExpanded}
                      disabled={disabled}
                    />
                  );
                };

                const renderGateInputs = (
                  title: string,
                  gateKey: "providers" | "tools",
                  placeholder: string
                ) => {
                  const gate = draft.mcp[gateKey];
                  const disabled = isHeader || !mcpGateEnabled;
                  const updateGate = (field: "allowlist" | "denylist", value: string[]) =>
                    updatePage(page, (prev) => ({
                      ...prev,
                      mcp: { ...prev.mcp, [gateKey]: { ...prev.mcp[gateKey], [field]: value } },
                    }));
                  return (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-semibold text-slate-600">Allowlist</div>
                        <Input
                          disabled={disabled}
                          value={toCsv(gate.allowlist)}
                          onChange={(e) => updateGate("allowlist", parseCsv(e.target.value))}
                          className="config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder={placeholder}
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-semibold text-slate-600">Denylist</div>
                        <Input
                          disabled={disabled}
                          value={toCsv(gate.denylist)}
                          onChange={(e) => updateGate("denylist", parseCsv(e.target.value))}
                          className="config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder={placeholder}
                        />
                      </label>
                    </div>
                  );
                };

                const renderSetupGateInputs = (
                  title: string,
                  gateKey: "llms" | "kbIds" | "adminKbIds" | "routes",
                  placeholder: string
                ) => {
                  const gate = (draft.setup[gateKey] || {}) as { allowlist?: string[]; denylist?: string[] };
                  const disabled = isHeader;
                  const updateGate = (field: "allowlist" | "denylist", value: string[]) =>
                    updatePage(page, (prev) => ({
                      ...prev,
                      setup: {
                        ...prev.setup,
                        [gateKey]: { ...(prev.setup[gateKey] as any), [field]: value },
                      },
                    }));
                  return (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-semibold text-slate-600">Allowlist</div>
                        <Input
                          disabled={disabled}
                          value={toCsv(gate.allowlist)}
                          onChange={(e) => updateGate("allowlist", parseCsv(e.target.value))}
                          className="config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder={placeholder}
                        />
                      </label>
                      <label className="block">
                        <div className="mb-1 text-[11px] font-semibold text-slate-600">Denylist</div>
                        <Input
                          disabled={disabled}
                          value={toCsv(gate.denylist)}
                          onChange={(e) => updateGate("denylist", parseCsv(e.target.value))}
                          className="config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder={placeholder}
                        />
                      </label>
                    </div>
                  );
                };

                const renderDetailBlock = (show: boolean, children: ReactNode, disabled = false) =>
                  show ? (
                    <fieldset
                      disabled={disabled}
                      aria-disabled={disabled}
                      className={`detail-block mt-2 space-y-2 border-0 border-l-2 border-slate-200 pl-3 m-0 p-0${disabled ? " pointer-events-none opacity-60" : ""
                        }`}
                    >
                      {children}
                    </fieldset>
                  ) : null;

                const [adminPanelEnabledToggle, ...adminPanelChildToggles] = ADMIN_PANEL_TOGGLES;
                const adminPanelCopyToggle = adminPanelChildToggles.find(
                  (def) => def.path === "adminPanel.copyConversation"
                );
                const adminPanelBaseToggles = adminPanelChildToggles.filter(
                  (def) => def.path !== "adminPanel.copyConversation"
                );
                const [quickRepliesToggle, productCardsToggle, prefillToggle, inputSubmitToggle] =
                  INTERACTION_TOGGLES;
                const widgetChatPanelToggle = WIDGET_PANEL_TOGGLES.find((def) => def.path === "widget.chatPanel");
                const widgetHistoryPanelToggle = WIDGET_PANEL_TOGGLES.find(
                  (def) => def.path === "widget.historyPanel"
                );
                const widgetSetupPanelToggle = WIDGET_PANEL_TOGGLES.find((def) => def.path === "widget.setupPanel");
                const showAdminPanelChildren = isHeader || adminPanelEnabled;
                const showPrefillDetails = isHeader || Boolean(draft.interaction.prefill);

                const renderDebugSection = () => (
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Debug Transcript (대화 복사)</div>
                    {renderSelectField(
                      "출력 모드",
                      debugOutputMode,
                      DEBUG_OUTPUT_MODE_OPTIONS,
                      (value) =>
                        updateDebugCopyOptions(page, (prev) => ({
                          ...prev,
                          outputMode:
                            value === "summary" ? "summary" : value === "used_only" ? "used_only" : "full",
                          sections: {
                            ...prev.sections,
                            logs: {
                              ...prev.sections?.logs,
                              debug: {
                                ...prev.sections?.logs?.debug,
                                usedOnly: value === "used_only",
                              },
                            },
                          },
                        }))
                    )}
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <GroupToggleField
                        neutralStyle={isHeader}
                        label={isHeader ? "debug.sections.header" : "Header 그룹"}
                        checked={debugHeader?.enabled ?? true}
                        onChange={(checked) =>
                          updateDebugCopyOptions(page, (prev) => ({
                            ...prev,
                            sections: {
                              ...prev.sections,
                              header: { ...prev.sections?.header, enabled: checked },
                            },
                          }))
                        }
                        expandable={isHeader}
                        expanded={showDebugHeaderDetails}
                        onToggleExpanded={() => {
                          if (!isHeader) return;
                          setExpandAll(setDebugHeaderDetailsOpenByPage, !debugHeaderDetailsOpenByPage["/"]);
                        }}
                        hideToggle={isHeader}
                      />
                      {showDebugHeaderDetails ? (
                        <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>대원칙</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugHeader?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      header: { ...prev.sections?.header, principle: !(debugHeader?.principle ?? true) },
                                    },
                                  }))
                                }
                                className={(debugHeader?.enabled ?? true) && (debugHeader?.principle ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugHeader?.enabled ?? true) ? ((debugHeader?.principle ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>기대 목록</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugHeader?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      header: { ...prev.sections?.header, expectedLists: !(debugHeader?.expectedLists ?? true) },
                                    },
                                  }))
                                }
                                className={(debugHeader?.enabled ?? true) && (debugHeader?.expectedLists ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugHeader?.enabled ?? true) ? ((debugHeader?.expectedLists ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span className="inline-flex items-center">
                              사용 모듈
                              <InlineHelpPopup className="ml-[10px]" ariaLabel="사용 모듈 예시">
                                debug.prefix_json.execution.call_chain[0].module_path: {pickExample(["debug.prefix_json.execution.call_chain[0].module_path"]) || "-"}
                              </InlineHelpPopup>
                            </span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugHeader?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      header: { ...prev.sections?.header, runtimeModules: !(debugHeader?.runtimeModules ?? true) },
                                    },
                                  }))
                                }
                                className={(debugHeader?.enabled ?? true) && (debugHeader?.runtimeModules ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugHeader?.enabled ?? true) ? ((debugHeader?.runtimeModules ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span className="inline-flex items-center">
                              점검 상태
                              <InlineHelpPopup className="ml-[10px]" ariaLabel="점검 상태 예시">
                                MCP: {debugFieldMcpTools[0] || "-"} / Event: {debugFieldEventTypes[0] || "-"}
                              </InlineHelpPopup>
                            </span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugHeader?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      header: { ...prev.sections?.header, auditStatus: !(debugHeader?.auditStatus ?? true) },
                                    },
                                  }))
                                }
                                className={(debugHeader?.enabled ?? true) && (debugHeader?.auditStatus ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugHeader?.enabled ?? true) ? ((debugHeader?.auditStatus ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <GroupToggleField
                        neutralStyle={isHeader}
                        label={isHeader ? "debug.sections.turn" : "Turn 그룹"}
                        checked={debugTurn?.enabled ?? true}
                        onChange={(checked) =>
                          updateDebugCopyOptions(page, (prev) => ({
                            ...prev,
                            sections: { ...prev.sections, turn: { ...prev.sections?.turn, enabled: checked } },
                          }))
                        }
                        expandable={isHeader}
                        expanded={showDebugTurnDetails}
                        onToggleExpanded={() => {
                          if (!isHeader) return;
                          setExpandAll(setDebugTurnDetailsOpenByPage, !debugTurnDetailsOpenByPage["/"]);
                        }}
                        hideToggle={isHeader}
                      />
                      {showDebugTurnDetails ? (
                        <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>TURN_ID</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, turn: { ...prev.sections?.turn, turnId: !(debugTurn?.turnId ?? true) } },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.turnId ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.turnId ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>TOKEN_USED</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, turn: { ...prev.sections?.turn, tokenUsed: !(debugTurn?.tokenUsed ?? true) } },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.tokenUsed ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.tokenUsed ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>TOKEN_UNUSED</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, turn: { ...prev.sections?.turn, tokenUnused: !(debugTurn?.tokenUnused ?? true) } },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.tokenUnused ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.tokenUnused ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>RESPONSE_SCHEMA(요약)</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      turn: { ...prev.sections?.turn, responseSchemaSummary: !(debugTurn?.responseSchemaSummary ?? true) },
                                    },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.responseSchemaSummary ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.responseSchemaSummary ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>RESPONSE_SCHEMA(상세)</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      turn: { ...prev.sections?.turn, responseSchemaDetail: !(debugTurn?.responseSchemaDetail ?? true) },
                                    },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.responseSchemaDetail ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.responseSchemaDetail ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-2">
                            <DebugFieldTreeRenderer
                              tree={RESPONSE_SCHEMA_DETAIL_TREE}
                              isHeader={isHeader}
                              disabled={!(debugTurn?.enabled ?? true) || !(debugTurn?.responseSchemaDetail ?? true)}
                              stateMap={responseSchemaDetailFields as Record<string, boolean> | undefined}
                              collapsedMap={debugTreeCollapsed}
                              onToggleCollapse={(key, next) =>
                                setDebugDetailTreeCollapsedByPage((prev) => ({
                                  ...prev,
                                  [page]: { ...(prev[page] || {}), [key]: next },
                                }))
                              }
                              onToggle={(node, next) => {
                                const keysToUpdate = next ? [node.key] : collectTreeKeys(node);
                                updateDebugCopyOptions(page, (prev) => {
                                  const nextMap = updateBooleanMap(prev.sections?.turn?.responseSchemaDetailFields, keysToUpdate, next);
                                  return {
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      turn: {
                                        ...prev.sections?.turn,
                                        responseSchemaDetailFields: nextMap,
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>RENDER_PLAN(요약)</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, turn: { ...prev.sections?.turn, renderPlanSummary: !(debugTurn?.renderPlanSummary ?? true) } },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.renderPlanSummary ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.renderPlanSummary ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>RENDER_PLAN(상세)</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, turn: { ...prev.sections?.turn, renderPlanDetail: !(debugTurn?.renderPlanDetail ?? true) } },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.renderPlanDetail ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.renderPlanDetail ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-2">
                            <DebugFieldTreeRenderer
                              tree={RENDER_PLAN_DETAIL_TREE}
                              isHeader={isHeader}
                              disabled={!(debugTurn?.enabled ?? true) || !(debugTurn?.renderPlanDetail ?? true)}
                              stateMap={renderPlanDetailFields as Record<string, boolean> | undefined}
                              collapsedMap={debugTreeCollapsed}
                              onToggleCollapse={(key, next) =>
                                setDebugDetailTreeCollapsedByPage((prev) => ({
                                  ...prev,
                                  [page]: { ...(prev[page] || {}), [key]: next },
                                }))
                              }
                              onToggle={(node, next) => {
                                const keysToUpdate = next ? [node.key] : collectTreeKeys(node);
                                updateDebugCopyOptions(page, (prev) => {
                                  const nextMap = updateBooleanMap(prev.sections?.turn?.renderPlanDetailFields, keysToUpdate, next);
                                  return {
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      turn: {
                                        ...prev.sections?.turn,
                                        renderPlanDetailFields: nextMap,
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>QUICK_REPLY_RULE</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugTurn?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, turn: { ...prev.sections?.turn, quickReplyRule: !(debugTurn?.quickReplyRule ?? true) } },
                                  }))
                                }
                                className={(debugTurn?.enabled ?? true) && (debugTurn?.quickReplyRule ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugTurn?.enabled ?? true) ? ((debugTurn?.quickReplyRule ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <GroupToggleField
                        neutralStyle={isHeader}
                        label={isHeader ? "debug.sections.logs" : "Logs 그룹"}
                        checked={debugLogs?.enabled ?? true}
                        onChange={(checked) =>
                          updateDebugCopyOptions(page, (prev) => ({
                            ...prev,
                            sections: { ...prev.sections, logs: { ...prev.sections?.logs, enabled: checked } },
                          }))
                        }
                        expandable={isHeader}
                        expanded={showDebugLogsDetails}
                        onToggleExpanded={() => {
                          if (!isHeader) return;
                          setExpandAll(setDebugLogsDetailsOpenByPage, !debugLogsDetailsOpenByPage["/"]);
                        }}
                        hideToggle={isHeader}
                      />
                      {showDebugLogsDetails ? (
                        <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>문제 요약</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, logs: { ...prev.sections?.logs, issueSummary: !(debugLogs?.issueSummary ?? true) } },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogs?.issueSummary ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) ? ((debugLogs?.issueSummary ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-2">
                            <DebugFieldTreeRenderer
                              tree={PREFIX_JSON_SECTIONS_TREE}
                              isHeader={isHeader}
                              disabled={!(debugLogs?.enabled ?? true) || !(debugLogDebug?.enabled ?? true) || !(debugLogDebug?.prefixJson ?? true)}
                              stateMap={debugPrefixSections as Record<string, boolean> | undefined}
                              collapsedMap={debugTreeCollapsed}
                              onToggleCollapse={(key, next) =>
                                setDebugDetailTreeCollapsedByPage((prev) => ({
                                  ...prev,
                                  [page]: { ...(prev[page] || {}), [key]: next },
                                }))
                              }
                              onToggle={(node, next) => {
                                const keysToUpdate = next ? [node.key] : collectTreeKeys(node);
                                updateDebugCopyOptions(page, (prev) => {
                                  const current = prev.sections?.logs?.debug?.prefixJsonSections as BooleanMap | undefined;
                                  const nextMap = updateBooleanMap(current, keysToUpdate, next);
                                  return {
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      logs: {
                                        ...prev.sections?.logs,
                                        debug: {
                                          ...prev.sections?.logs?.debug,
                                          prefixJsonSections: nextMap,
                                        },
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>DEBUG 로그</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, logs: { ...prev.sections?.logs, debug: { ...prev.sections?.logs?.debug, enabled: !(debugLogDebug?.enabled ?? true) } } },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogDebug?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) ? ((debugLogDebug?.enabled ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span className="inline-flex items-center">
                              DEBUG prefix_json
                              <InlineHelpPopup className="ml-[10px]" ariaLabel="DEBUG prefix_json 예시">
                                {pickExample(["debug.prefix_json.mcp.last.function", "debug.prefix_json.decision.function_name"]) || "-"}
                              </InlineHelpPopup>
                            </span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, logs: { ...prev.sections?.logs, debug: { ...prev.sections?.logs?.debug, prefixJson: !(debugLogDebug?.prefixJson ?? true) } } },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogDebug?.prefixJson ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) ? ((debugLogDebug?.prefixJson ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>MCP 로그</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, enabled: !(debugLogMcp?.enabled ?? true) } } },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) ? ((debugLogMcp?.enabled ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span className="inline-flex items-center">
                              MCP request
                              <InlineHelpPopup className="ml-[10px]" ariaLabel="MCP request 예시">
                                {pickExample(["mcp.request_payload.path", "mcp.request_payload.method"]) || "-"}
                              </InlineHelpPopup>
                            </span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, request: !(debugLogMcp?.request ?? true) } },
                                    },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.request ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.request ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span className="inline-flex items-center">
                              MCP response
                              <InlineHelpPopup className="ml-[10px]" ariaLabel="MCP response 예시">
                                {pickExample(["mcp.response_payload.error.code", "mcp.response_payload.verified"]) || "-"}
                              </InlineHelpPopup>
                            </span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: {
                                      ...prev.sections,
                                      logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, response: !(debugLogMcp?.response ?? true) } },
                                    },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.response ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.response ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>MCP success 포함</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, includeSuccess: !(debugLogMcp?.includeSuccess ?? true) } } },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.includeSuccess ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.includeSuccess ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>MCP error 포함</span>
                            {!isHeader ? (
                              <button
                                type="button"
                                disabled={!(debugLogs?.enabled ?? true) || !(debugLogMcp?.enabled ?? true)}
                                onClick={() =>
                                  updateDebugCopyOptions(page, (prev) => ({
                                    ...prev,
                                    sections: { ...prev.sections, logs: { ...prev.sections?.logs, mcp: { ...prev.sections?.logs?.mcp, includeError: !(debugLogMcp?.includeError ?? true) } } },
                                  }))
                                }
                                className={(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) && (debugLogMcp?.includeError ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                              >
                                {(debugLogs?.enabled ?? true) && (debugLogMcp?.enabled ?? true) ? ((debugLogMcp?.includeError ?? true) ? "ON" : "OFF") : "OFF"}
                              </button>
                            ) : null}
                          </div>
                          <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                            <span>Event 로그</span>
                            <span className="flex items-center gap-1">
                              {!isHeader ? (
                                <span className="inline-flex h-7 items-center justify-center px-1 text-[12px] font-bold text-slate-700">
                                  {showDebugEventDetails ? "▼" : "▶"}
                                </span>
                              ) : null}
                              {isHeader ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandAll(setDebugEventDetailsOpenByPage, !debugEventDetailsOpenByPage["/"])}
                                  className="inline-flex h-7 items-center justify-center px-1 text-[12px] font-bold text-slate-700"
                                  aria-label="debug.sections.logs.event 하위 토글"
                                >
                                  {showDebugEventDetails ? "▼" : "▶"}
                                </button>
                              ) : null}
                              {!isHeader ? (
                                <button
                                  type="button"
                                  disabled={!(debugLogs?.enabled ?? true)}
                                  onClick={() =>
                                    updateDebugCopyOptions(page, (prev) => ({
                                      ...prev,
                                      sections: { ...prev.sections, logs: { ...prev.sections?.logs, event: { ...prev.sections?.logs?.event, enabled: !(debugLogEvent?.enabled ?? true) } } },
                                    }))
                                  }
                                  className={(debugLogs?.enabled ?? true) && (debugLogEvent?.enabled ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                                >
                                  {(debugLogs?.enabled ?? true) ? ((debugLogEvent?.enabled ?? true) ? "ON" : "OFF") : "OFF"}
                                </button>
                              ) : null}
                            </span>
                          </div>
                          {showDebugEventDetails ? (
                            <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                              <div className={isHeader ? "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs" : "mt-2 flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs [&:has(button.bg-emerald-700)]:border-emerald-500 [&:has(button.bg-emerald-700)]:bg-emerald-100 [&:has(button.bg-rose-700)]:border-rose-400 [&:has(button.bg-rose-700)]:bg-rose-100"}>
                                <span className="inline-flex items-center">
                                  Event payload
                                  <InlineHelpPopup className="ml-[10px]" ariaLabel="Event payload 예시">
                                    {pickExample(["event.payload.intent", "event.payload.error", "event.payload.tool"]) || "-"}
                                  </InlineHelpPopup>
                                </span>
                                {!isHeader ? (
                                  <button
                                    type="button"
                                    disabled={!(debugLogs?.enabled ?? true) || !(debugLogEvent?.enabled ?? true)}
                                    onClick={() =>
                                      updateDebugCopyOptions(page, (prev) => ({
                                        ...prev,
                                        sections: {
                                          ...prev.sections,
                                          logs: { ...prev.sections?.logs, event: { ...prev.sections?.logs?.event, payload: !(debugLogEvent?.payload ?? true) } },
                                        },
                                      }))
                                    }
                                    className={(debugLogs?.enabled ?? true) && (debugLogEvent?.enabled ?? true) && (debugLogEvent?.payload ?? true) ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 text-[11px] font-bold text-white" : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 text-[11px] font-bold text-white disabled:bg-slate-300"}
                                  >
                                    {(debugLogs?.enabled ?? true) && (debugLogEvent?.enabled ?? true) ? ((debugLogEvent?.payload ?? true) ? "ON" : "OFF") : "OFF"}
                                  </button>
                                ) : null}
                              </div>
                              <label className="mt-2 block">
                                <div className="mb-1 text-[11px] font-semibold text-slate-600">Event allowlist (CSV)</div>
                                <input
                                  type="text"
                                  value={toCsv(debugLogEvent?.allowlist)}
                                  disabled={isHeader}
                                  onChange={(e) =>
                                    updateDebugCopyOptions(page, (prev) => ({
                                      ...prev,
                                      sections: {
                                        ...prev.sections,
                                        logs: {
                                          ...prev.sections?.logs,
                                          event: {
                                            ...prev.sections?.logs?.event,
                                            allowlist: parseCsv(e.target.value).map((item) => item.toUpperCase()),
                                          },
                                        },
                                      },
                                    }))
                                  }
                                  className="config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                  placeholder="예: PRE_MCP_DECISION, MCP_TOOL_FAILED"
                                />
                              </label>
                              <div className="mt-1 text-[10px] text-slate-500">감지된 타입: {debugFieldEventTypes.join(", ") || "-"}</div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {renderSelectField(
                      "Audit 대상 BOT 범위",
                      debugCopyDraft.auditBotScope || "runtime_turns_only",
                      AUDIT_BOT_SCOPE_OPTIONS,
                      (value) =>
                        updateDebugCopyOptions(page, (prev) => ({
                          ...prev,
                          auditBotScope: value === "all_bot_messages" ? "all_bot_messages" : "runtime_turns_only",
                        }))
                    )}
                  </div>
                );

                const renderAdminPanelSection = () => (
                  <fieldset
                    disabled={chatSectionDisabled}
                    aria-disabled={chatSectionDisabled}
                    className={`space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 m-0${chatSectionDisabled ? " pointer-events-none opacity-60" : ""
                      }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Admin Panel</div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      {renderToggle(adminPanelEnabledToggle)}
                      {renderDetailBlock(
                        true,
                        <>
                          {adminPanelBaseToggles.map((def) => (
                            <Fragment key={def.path}>{renderToggle(def)}</Fragment>
                          ))}
                          {adminPanelCopyToggle ? (
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                              {renderToggle(adminPanelCopyToggle)}
                              {renderDetailBlock(true, renderDebugSection(), debugSectionDisabled)}
                            </div>
                          ) : null}
                        </>,
                        !showAdminPanelChildren
                      )}
                    </div>
                  </fieldset>
                );

                const renderInteractionSection = () => (
                  <fieldset
                    disabled={chatSectionDisabled}
                    aria-disabled={chatSectionDisabled}
                    className={`space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 m-0${chatSectionDisabled ? " pointer-events-none opacity-60" : ""
                      }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Interaction</div>
                    {renderToggle(quickRepliesToggle)}
                    {renderToggle(productCardsToggle)}
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      {renderToggle(prefillToggle)}
                      {renderDetailBlock(
                        true,
                        <label className="block">
                          <div className="mb-1 text-[11px] font-semibold text-slate-600">
                            {isHeader ? "interaction.prefillMessages" : "Prefill Messages (줄바꿈)"}
                          </div>
                          <textarea
                            value={(draft.interaction.prefillMessages || []).join("\n")}
                            disabled={isHeader}
                            onChange={(e) =>
                              updateFeatureByPath(page, "interaction.prefillMessages", parseLines(e.target.value))
                            }
                            className="config-input min-h-[70px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                            placeholder="예: 기록한대로 응대하는 AI 상담사를"
                          />
                          {/* {!isHeader ? <div className="mt-1 text-[10px] text-slate-500">줄바꿈으로 여러 줄 입력</div> : null} */}
                        </label>,
                        !showPrefillDetails
                      )}
                    </div>
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">
                        {isHeader ? "interaction.inputPlaceholder" : "Input Placeholder"}
                      </div>
                      <input
                        value={draft.interaction.inputPlaceholder || ""}
                        disabled={isHeader}
                        onChange={(e) =>
                          updateFeatureByPath(page, "interaction.inputPlaceholder", e.target.value)
                        }
                        className="config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                        placeholder="예: 문의 내용을 입력해주세요"
                      />
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <GroupToggleField
                        neutralStyle={isHeader}
                        label={isHeader ? "interaction.threePhasePrompt" : "3-Phase Prompt"}
                        checked={draft.interaction.threePhasePrompt}
                        visibility={draft.visibility.interaction.threePhasePrompt}
                        onChange={(v) => updateFeatureByPath(page, "interaction.threePhasePrompt", v)}
                        onChangeVisibility={(mode) =>
                          updateVisibilityByPath(page, "visibility.interaction.threePhasePrompt", mode)
                        }
                        expandable={isHeader}
                        expanded={showThreePhaseDetails}
                        onToggleExpanded={() => {
                          if (!isHeader) return;
                          setExpandAll(setThreePhaseDetailsOpenByPage, !threePhaseDetailsOpenByPage["/"]);
                        }}
                        hideToggle={isHeader}
                      />
                      {showThreePhaseDetails ? (
                        <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                          <div className="space-y-2">
                            <div className="text-[11px] font-semibold text-slate-600">
                              {isHeader ? "interaction.threePhasePromptDisplay" : "3-Phase Display"}
                            </div>
                            {THREE_PHASE_TOGGLES.map((def) => (
                              <Fragment key={def.path}>{renderToggle(def)}</Fragment>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {renderToggle(inputSubmitToggle)}
                  </fieldset>
                );

                const renderSetupSection = () => (
                  <fieldset
                    disabled={setupSectionDisabled}
                    aria-disabled={setupSectionDisabled}
                    className={`space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 m-0${setupSectionDisabled ? " pointer-events-none opacity-60" : ""
                      }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Setup</div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <GroupToggleField
                        neutralStyle={isHeader}
                        label={isHeader ? "setup.modelSelector" : "Model Selector"}
                        checked={draft.setup.modelSelector}
                        visibility={draft.visibility.setup.modelSelector}
                        onChange={(v) => updateFeatureByPath(page, "setup.modelSelector", v)}
                        onChangeVisibility={(mode) =>
                          updateVisibilityByPath(page, "visibility.setup.modelSelector", mode)
                        }
                      />
                      {renderDetailBlock(
                        true,
                        <div className="space-y-2">
                          <div className="rounded-lg border border-slate-200 bg-white p-2">
                            <ToggleField
                              neutralStyle={isHeader}
                              label={
                                isHeader
                                  ? "setup.modeExisting"
                                  : setupUiByPage[page].existingLabels.modeExisting ||
                                  EXISTING_SETUP_LABELS.modeExisting
                              }
                              editableLabel={!isHeader}
                              onLabelChange={(value) =>
                                setSetupUiByPage((prev) => ({
                                  ...prev,
                                  [page]: {
                                    ...prev[page],
                                    existingLabels: { ...prev[page].existingLabels, modeExisting: value },
                                  },
                                }))
                              }
                              checked={draft.setup.modeExisting}
                              visibility={draft.visibility.setup.modeExisting}
                              onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeExisting: v } }))}
                              onChangeVisibility={(mode) =>
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modeExisting: mode } },
                                }))
                              }
                              expandable={isHeader}
                              expanded={showSetupExistingDetails}
                              onToggleExpanded={() => {
                                if (!isHeader) return;
                                setExpandAll(setSetupExistingDetailsOpenByPage, !setupExistingDetailsOpenByPage["/"]);
                              }}
                            />
                            {showSetupExistingDetails ? (
                              <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                                {setupUiDraft.existingOrder.map((existingKey) => {
                                  const codeLabel = `setup.${existingKey}`;
                                  const defaultLabel =
                                    EXISTING_SETUP_LABELS[existingKey] || existingKey;
                                  const customLabel = (setupUiByPage[page].existingLabels[existingKey] || "").trim();
                                  const label = isHeader ? codeLabel : customLabel || defaultLabel;
                                  const onLabelChange = (value: string) =>
                                    setSetupUiByPage((prev) => ({
                                      ...prev,
                                      [page]: {
                                        ...prev[page],
                                        existingLabels: { ...prev[page].existingLabels, [existingKey]: value },
                                      },
                                    }));
                                  const keyProps = {
                                    neutralStyle: isHeader,
                                    label,
                                    showDragHandle: isHeader,
                                    editableLabel: !isHeader,
                                    onLabelChange,
                                  };
                                  const node =
                                    existingKey === "sessionIdSearch" ? (
                                      <ToggleField
                                        {...keyProps}
                                        checked={draft.setup.sessionIdSearch}
                                        visibility={draft.visibility.setup.sessionIdSearch}
                                        onChange={(v) =>
                                          updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, sessionIdSearch: v } }))
                                        }
                                        onChangeVisibility={(mode) =>
                                          updatePage(page, (prev) => ({
                                            ...prev,
                                            visibility: {
                                              ...prev.visibility,
                                              setup: { ...prev.visibility.setup, sessionIdSearch: mode },
                                            },
                                          }))
                                        }
                                      />
                                    ) : existingKey === "agentSelector" ? (
                                      <ToggleField
                                        {...keyProps}
                                        checked={draft.setup.agentSelector}
                                        visibility={draft.visibility.setup.agentSelector}
                                        onChange={(v) =>
                                          updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, agentSelector: v } }))
                                        }
                                        onChangeVisibility={(mode) =>
                                          updatePage(page, (prev) => ({
                                            ...prev,
                                            visibility: {
                                              ...prev.visibility,
                                              setup: { ...prev.visibility.setup, agentSelector: mode },
                                            },
                                          }))
                                        }
                                      />
                                    ) : (
                                      <div className="flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs">
                                        <button type="button" className="inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-slate-800">
                                          <span
                                            contentEditable={!isHeader}
                                            suppressContentEditableWarning={!isHeader}
                                            onBlur={(e) => {
                                              if (isHeader) return;
                                              onLabelChange((e.currentTarget.textContent || "").trim());
                                            }}
                                            onKeyDown={(e) => {
                                              if (isHeader) return;
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                (e.currentTarget as HTMLSpanElement).blur();
                                              }
                                            }}
                                            onClick={(e) => {
                                              if (isHeader) return;
                                              e.stopPropagation();
                                            }}
                                            className={!isHeader ? "rounded px-1 outline-none" : undefined}
                                          >
                                            {label}
                                          </span>
                                        </button>
                                        {isHeader ? (
                                          <span className="inline-flex h-7 items-center justify-center px-1 text-slate-500">
                                            <GripVertical className="h-4 w-4" />
                                          </span>
                                        ) : null}
                                      </div>
                                    );
                                  return (
                                    <div
                                      key={`${column}-existing-${existingKey}`}
                                      draggable={isHeader}
                                      onDragStart={isHeader ? handleExistingSetupDragStart("/", existingKey) : undefined}
                                      onDragOver={isHeader ? handleSetupDragOver : undefined}
                                      onDrop={isHeader ? handleExistingSetupDrop("/", existingKey) : undefined}
                                      onDragEnd={isHeader ? handleExistingSetupDragEnd("/") : undefined}
                                      className="space-y-1"
                                    >
                                      {node}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-2">
                            <ToggleField
                              neutralStyle={isHeader}
                              label={
                                isHeader
                                  ? "setup.modeNew"
                                  : setupUiByPage[page].existingLabels.modeNew || EXISTING_SETUP_LABELS.modeNew
                              }
                              editableLabel={!isHeader}
                              onLabelChange={(value) =>
                                setSetupUiByPage((prev) => ({
                                  ...prev,
                                  [page]: {
                                    ...prev[page],
                                    existingLabels: { ...prev[page].existingLabels, modeNew: value },
                                  },
                                }))
                              }
                              checked={draft.setup.modeNew}
                              visibility={draft.visibility.setup.modeNew}
                              onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeNew: v } }))}
                              onChangeVisibility={(mode) =>
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modeNew: mode } },
                                }))
                              }
                              expandable={isHeader}
                              expanded={showSetupNewDetails}
                              onToggleExpanded={() => {
                                if (!isHeader) return;
                                setExpandAll(setSetupNewDetailsOpenByPage, !setupNewDetailsOpenByPage["/"]);
                              }}
                            />
                            {showSetupNewDetails ? (
                              <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">
                                {setupUiDraft.order.filter(isSetupUiConfigurableKey).map((setupKey) => {
                                  const codeLabel = `setup.${setupKey}`;
                                  const customLabel = (setupUiByPage[page].labels[setupKey] || "").trim();
                                  const defaultLabel = (SETUP_FIELD_LABELS[setupKey] || setupKey).trim();
                                  const label = isHeader ? codeLabel : customLabel || defaultLabel;
                                  const makeToggle = () => {
                                    const setupToggleMap = {
                                      kbSelector: { kind: "setup", key: "kbSelector" },
                                      adminKbSelector: { kind: "setup", key: "adminKbSelector" },
                                      routeSelector: { kind: "setup", key: "routeSelector" },
                                      inlineUserKbInput: { kind: "setup", key: "inlineUserKbInput" },
                                      mcpProviderSelector: { kind: "mcp", key: "providerSelector", labelKey: "mcpProviderSelector" },
                                      mcpActionSelector: { kind: "mcp", key: "actionSelector", labelKey: "mcpActionSelector" },
                                    } as const;

                                    const renderSetupToggle = (
                                      checked: boolean,
                                      visibility: FeatureVisibilityMode,
                                      onChange: (v: boolean) => void,
                                      onChangeVisibility: (mode: FeatureVisibilityMode) => void,
                                      labelKey: string
                                    ) => (
                                      <ToggleField
                                        neutralStyle={isHeader}
                                        label={label}
                                        showDragHandle={isHeader}
                                        editableLabel={!isHeader}
                                        onLabelChange={(value) =>
                                          setSetupUiByPage((prev) => ({
                                            ...prev,
                                            [page]: {
                                              ...prev[page],
                                              labels: { ...prev[page].labels, [labelKey as SetupFieldKey]: value },
                                            },
                                          }))
                                        }
                                        checked={checked}
                                        visibility={visibility}
                                        onChange={onChange}
                                        onChangeVisibility={onChangeVisibility}
                                      />
                                    );
                                    const setupConfig = setupToggleMap[setupKey as keyof typeof setupToggleMap];
                                    if (setupConfig) {
                                      if (setupConfig.kind === "setup") {
                                        const key = setupConfig.key as keyof ConversationPageFeatures["setup"];
                                        return renderSetupToggle(
                                          draft.setup[key] as boolean,
                                          (draft.visibility.setup as any)[key],
                                          (v: boolean) => updateSetupField(page, key as any, v),
                                          (mode: FeatureVisibilityMode) => updateSetupVisibility(page, key as any, mode),
                                          key
                                        );
                                      }
                                      const mcpKey = setupConfig.key as keyof ConversationPageFeatures["mcp"];
                                      return renderSetupToggle(
                                        draft.mcp[mcpKey] as boolean,
                                        (draft.visibility.mcp as any)[mcpKey],
                                        (v: boolean) => updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, [mcpKey]: v } })),
                                        (mode: FeatureVisibilityMode) =>
                                          updatePage(page, (prev) => ({
                                            ...prev,
                                            visibility: {
                                              ...prev.visibility,
                                              mcp: { ...prev.visibility.mcp, [mcpKey]: mode },
                                            },
                                          })),
                                        setupConfig.labelKey
                                      );
                                    }



                                    const safeKey = setupKey as keyof ConversationPageFeatures["setup"];
                                    return renderSetupToggle(
                                      draft.setup[safeKey] as boolean,
                                      (draft.visibility.setup as any)[safeKey],
                                      (v: boolean) => updateSetupField(page, setupKey, v),
                                      (mode: FeatureVisibilityMode) => updateSetupVisibility(page, setupKey, mode),
                                      setupKey
                                    );
                                  };
                                  return (
                                    <div
                                      key={`${column}-${setupKey}`}
                                      draggable={isHeader}
                                      onDragStart={isHeader ? handleSetupDragStart("/", setupKey) : undefined}
                                      onDragOver={isHeader ? handleSetupDragOver : undefined}
                                      onDrop={isHeader ? handleSetupDrop("/", setupKey) : undefined}
                                      onDragEnd={isHeader ? handleSetupDragEnd("/") : undefined}
                                      className="space-y-1"
                                    >
                                      {makeToggle()}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          <div className="rounded-lg border border-slate-200 bg-white p-2">
                            <div className="text-[11px] font-semibold text-slate-600">Setup Defaults</div>
                            {renderSelectField(
                              isHeader ? "setup.defaultSetupMode" : "Default Mode",
                              draft.setup.defaultSetupMode,
                              [
                                { id: "existing", label: "Existing" },
                                { id: "new", label: "New" },
                              ],
                              (value) =>
                                updateFeatureByPath(page, "setup.defaultSetupMode", value as "existing" | "new"),
                              isHeader
                            )}
                            {renderSelectField(
                              isHeader ? "setup.defaultLlm" : "Default LLM",
                              draft.setup.defaultLlm,
                              [
                                { id: "chatgpt", label: "ChatGPT" },
                                { id: "gemini", label: "Gemini" },
                              ],
                              (value) =>
                                updateFeatureByPath(page, "setup.defaultLlm", value as "chatgpt" | "gemini"),
                              isHeader
                            )}
                          </div>
                          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                            <div className="text-[11px] font-semibold text-slate-600">Setup Gates</div>
                            {renderSetupGateInputs("LLM Gate", "llms", "chatgpt, gemini")}
                            {renderSetupGateInputs("KB Gate", "kbIds", "kb_id_1, kb_id_2")}
                            {renderSetupGateInputs("Admin KB Gate", "adminKbIds", "kb_id_1, kb_id_2")}
                            {renderSetupGateInputs("Route Gate", "routes", "route_1, route_2")}
                          </div>
                          </div>
                        </div>,
                        !setupDetailsOpen
                      )}
                    </div>
                  </fieldset>
                );

                const renderMcpSection = () => (
                  <fieldset
                    disabled={mcpSectionDisabled}
                    aria-disabled={mcpSectionDisabled}
                    className={`space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 m-0${mcpSectionDisabled ? " pointer-events-none opacity-60" : ""
                      }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">MCP</div>
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                      {MCP_TOGGLES.map((def) => (
                        <Fragment key={def.path}>{renderToggle(def)}</Fragment>
                      ))}
                      {renderDetailBlock(
                        true,
                        <div className="space-y-2">
                          {renderGateInputs("Providers Gate", "providers", "예: openai, anthropic")}
                          {renderGateInputs("Tools Gate", "tools", "예: tool_id_1, tool_id_2")}
                        </div>,
                        !showMcpGates
                      )}
                    </div>
                  </fieldset>
                );

                const renderRuntimeSection = () => (
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Runtime / 자동 업데이트</div>
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                      <div className="flex items-center text-xs font-semibold text-slate-900">
                        <span>{isHeader ? "runtime.selfUpdate" : "Runtime Self Update"}</span>
                        <InlineHelpPopup className="ml-[10px]" ariaLabel="Runtime Self Update 설명">
                          <div>
                            기능 설명:
                            <ul className="list-disc space-y-1 pl-4">
                              <li>원칙 기준선(<code>C:\dev\1227\mejai\src\app\api\runtime\chat\policies\principles.ts</code>)과 최근 대화/이벤트를 비교</li>
                              <li>위배 항목을 감지하고, 패치 제안(proposal)을 생성하는 거버넌스 기능</li>
                            </ul>
                          </div>
                          <div className="mt-3">
                            참고:
                            <ul className="list-disc space-y-1 pl-4">
                              <li>위배 감지는 대화 중 실시간 자동 실행이 아니라, <code>POST /api/runtime/governance/review</code> 호출</li>
                              <li>(또는 <code>/runtime/principles</code>의 &quot;문제 감지 실행&quot; 버튼) 시 실행</li>
                            </ul>
                          </div>
                        </InlineHelpPopup>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        기준: <code>src/app/api/runtime/chat/policies/principles.ts</code>
                      </div>
                      <ToggleField
                        neutralStyle={isHeader}
                        label={isHeader ? "runtime.selfUpdate.enabled" : "Self Update 활성화"}
                        checked={Boolean(governanceConfig?.enabled)}
                        visibility={governanceConfig?.visibility_mode || "admin"}
                        onChange={(v) =>
                          void handleGovernanceChange({
                            enabled: v,
                            visibility_mode: governanceConfig?.visibility_mode || "admin",
                          })
                        }
                        onChangeVisibility={(mode) =>
                          void handleGovernanceChange({
                            enabled: governanceConfig?.enabled ?? true,
                            visibility_mode: mode,
                          })
                        }
                      />
                      {governanceSaving ? (
                        <div className="text-[11px] text-slate-500">Self Update 저장 중...</div>
                      ) : null}
                    </div>
                  </div>
                );

                const toggleWidgetChatPanelExpanded = () => {
                  if (isHeader) {
                    setExpandAll(setWidgetChatPanelDetailsOpenByPage, !widgetChatPanelExpanded);
                    return;
                  }
                  setWidgetChatPanelDetailsOpenByPage((prev) => ({ ...prev, [page]: !widgetChatPanelExpanded }));
                };

                const toggleWidgetSetupPanelExpanded = () => {
                  if (isHeader) {
                    setExpandAll(setWidgetSetupPanelDetailsOpenByPage, !widgetSetupPanelExpanded);
                    return;
                  }
                  setWidgetSetupPanelDetailsOpenByPage((prev) => ({ ...prev, [page]: !widgetSetupPanelExpanded }));
                };



                return (
                  <Card
                    key={column}
                    className={
                      isHeader
                        ? "shrink-0 p-4 [&_.state-controls]:hidden [&_.config-input]:pointer-events-none [&_.config-input]:opacity-70"
                        : "shrink-0 p-4"
                    }
                    style={{ width: `${SETTINGS_CARD_WIDTH}px` }}
                  >
                    <div className="text-sm font-semibold text-slate-900">{isHeader ? "헤더" : pageLabel}</div>
                    <div className="mt-1 text-xs text-slate-500">{isHeader ? "코드 정의명/펼침 제어" : "해당 페이지에서 실제 적용될 대화 기능 설정"}</div>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                          {widgetChatPanelToggle ? (
                            <>
                              {renderWidgetPanelToggle(widgetChatPanelToggle, {
                                expandable: true,
                                expanded: widgetChatPanelExpanded,
                                onToggleExpanded: toggleWidgetChatPanelExpanded,
                              })}
                              {renderDetailBlock(
                                widgetChatPanelExpanded,
                                <>
                                  {renderAdminPanelSection()}
                                  {renderInteractionSection()}
                                </>,
                                chatSectionDisabled
                              )}
                            </>
                          ) : null}
                          {widgetHistoryPanelToggle ? renderWidgetPanelToggle(widgetHistoryPanelToggle) : null}
                          {widgetSetupPanelToggle ? (
                            <>
                              {renderWidgetPanelToggle(widgetSetupPanelToggle, {
                                expandable: true,
                                expanded: widgetSetupPanelExpanded,
                                onToggleExpanded: toggleWidgetSetupPanelExpanded,
                              })}
                              {renderDetailBlock(
                                widgetSetupPanelExpanded,
                                <>
                                  {renderSetupSection()}
                                  {renderMcpSection()}
                                  {renderRuntimeSection()}
                                </>,
                                setupSectionDisabled
                              )}
                            </>
                          ) : null}
                        </div>
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                          <GroupToggleField
                            neutralStyle={isHeader}
                            label={isHeader ? "widget.header.enabled" : "Header"}
                            checked={draft.widget.header.enabled}
                            visibility={draft.visibility.widget.header.enabled}
                            onChange={(v) => updateFeatureByPath(page, "widget.header.enabled", v)}
                            onChangeVisibility={(mode) =>
                              updateVisibilityByPath(page, "visibility.widget.header.enabled", mode)
                            }
                          />
                          {renderDetailBlock(
                            true,
                            <div className="space-y-2">
                              {WIDGET_HEADER_TOGGLES.map((def) => (
                                <Fragment key={def.path}>{renderToggle(def)}</Fragment>
                              ))}
                            </div>,
                            !isHeader && !draft.widget.header.enabled
                          )}
                        </div>
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                          <GroupToggleField
                            neutralStyle={isHeader}
                            label={isHeader ? "widget.tabBar.enabled" : "Tab Bar"}
                            checked={draft.widget.tabBar.enabled}
                            visibility={draft.visibility.widget.tabBar.enabled}
                            onChange={(v) => updateFeatureByPath(page, "widget.tabBar.enabled", v)}
                            onChangeVisibility={(mode) =>
                              updateVisibilityByPath(page, "visibility.widget.tabBar.enabled", mode)
                            }
                          />
                          {renderDetailBlock(
                            true,
                            <div className="space-y-2">
                              {WIDGET_TAB_TOGGLES.map((def) => (
                                <Fragment key={def.path}>{renderToggle(def)}</Fragment>
                              ))}
                            </div>,
                            !isHeader && !draft.widget.tabBar.enabled
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>


        </>
      ) : null}


    </div>
  );
}










