"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { ChevronDown, ChevronRight, CircleHelp, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import type { DebugTranscriptOptions } from "@/lib/debugTranscript";
import {
  getDefaultConversationPageFeatures,
  mergeConversationPageFeatures,
  resolveConversationSetupUi,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeaturesOverride,
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
const SETTINGS_CARD_WIDTH = 300;
function normalizePages(
  pages: ConversationPageKey[],
  options: { includeBase?: boolean } = {}
) {
  const includeBase = options.includeBase !== false;
  const basePages = includeBase ? BASE_PAGE_KEYS : [];
  return Array.from(new Set([...basePages, ...pages.filter(Boolean)])).sort((a, b) => a.localeCompare(b));
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

type PolicyDataSource = {
  loadProvider: (authToken: string) => Promise<ConversationFeaturesProviderShape | null>;
  saveProvider: (
    authToken: string,
    values: {
      pages: Partial<Record<ConversationPageKey, ConversationPageFeatures>>;
      debug_copy: Partial<Record<ConversationPageKey, Partial<DebugTranscriptOptions>>>;
      page_registry: ConversationPageKey[];
      settings_ui: {
        setup_fields: Partial<
          Record<
            ConversationPageKey,
            {
              order: SetupFieldKey[];
              labels: Record<SetupFieldKey, string>;
              existing_order: ExistingSetupFieldKey[];
              existing_labels: Record<ExistingSetupLabelKey, string>;
            }
          >
        >;
      };
    }
  ) => Promise<void>;
};

type Props = {
  authToken: string;
  dataSource?: PolicyDataSource;
  title?: string;
  description?: string;
  visiblePages?: ConversationPageKey[];
  showRegisteredPages?: boolean;
};

type GovernanceConfig = {
  enabled: boolean;
  visibility_mode: "user" | "admin";
  source: "principles_default" | "event_override";
  updated_at: string | null;
  updated_by: string | null;
};

type DebugFieldExamplesPayload = {
  event_types?: string[];
  mcp_tools?: string[];
  sample_paths?: Record<string, unknown>;
  error?: string;
};

type BooleanMap = Record<string, boolean>;
type ReviewFlagMap = Record<string, boolean>;
type ReviewFlagsByPage = Record<ConversationPageKey, ReviewFlagMap>;
type ReviewTarget = { page: ConversationPageKey; key: string } | null;

function updateBooleanMap(current: BooleanMap | undefined, keys: string[], next: boolean): BooleanMap {
  const nextMap: BooleanMap = { ...(current ?? {}) };
  keys.forEach((key) => {
    nextMap[key] = next;
  });
  return nextMap;
}

const SETUP_FIELD_OPTIONS: Array<{ key: SetupFieldKey; defaultLabel: string }> = [
  { key: "inlineUserKbInput", defaultLabel: "사용자 KB입력란" },
  { key: "llmSelector", defaultLabel: "LLM 선택" },
  { key: "kbSelector", defaultLabel: "KB 선택" },
  { key: "adminKbSelector", defaultLabel: "관리자 KB 선택" },
  { key: "routeSelector", defaultLabel: "Runtime 선택" },
  { key: "mcpProviderSelector", defaultLabel: "MCP 프로바이더 선택" },
  { key: "mcpActionSelector", defaultLabel: "MCP 액션 선택" },
];
const SETUP_CODE_LABELS: Record<SetupFieldKey, string> = {
  inlineUserKbInput: "setup.inlineUserKbInput",
  llmSelector: "setup.llmSelector",
  kbSelector: "setup.kbSelector",
  adminKbSelector: "setup.adminKbSelector",
  routeSelector: "setup.routeSelector",
  mcpProviderSelector: "mcp.providerSelector",
  mcpActionSelector: "mcp.actionSelector",
};
const SETUP_UI_CONFIGURABLE_KEYS: SetupFieldKey[] = [...SETUP_FIELD_OPTIONS.map((item) => item.key)];
function isSetupUiConfigurableKey(key: SetupFieldKey): key is (typeof SETUP_UI_CONFIGURABLE_KEYS)[number] {
  return SETUP_UI_CONFIGURABLE_KEYS.includes(key);
}
const EXISTING_SETUP_FIELDS: Array<{ key: ExistingSetupFieldKey; codeLabel: string; defaultLabel: string }> = [
  { key: "agentSelector", codeLabel: "setup.agentSelector", defaultLabel: "에이전트 선택" },
  { key: "versionSelector", codeLabel: "setup.versionSelector", defaultLabel: "버전 선택" },
  { key: "sessionSelector", codeLabel: "setup.sessionSelector", defaultLabel: "세션 선택" },
  { key: "sessionIdSearch", codeLabel: "setup.sessionIdSearch", defaultLabel: "세션 ID 직접 조회" },
  { key: "conversationMode", codeLabel: "setup.conversationMode", defaultLabel: "모드 선택" },
];

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toEventCsv(values?: string[]) {
  return (values || []).join(", ");
}

const REVIEWABLE_FIELDS: Array<{ key: string; paths: string[][] }> = [
  { key: "adminPanel.enabled", paths: [["adminPanel", "enabled"], ["visibility", "adminPanel", "enabled"]] },
  { key: "adminPanel.logsToggle", paths: [["adminPanel", "logsToggle"], ["visibility", "adminPanel", "logsToggle"]] },
  {
    key: "adminPanel.copyConversation",
    paths: [["adminPanel", "copyConversation"], ["visibility", "adminPanel", "copyConversation"]],
  },
  { key: "interaction.quickReplies", paths: [["interaction", "quickReplies"], ["visibility", "interaction", "quickReplies"]] },
  {
    key: "interaction.productCards",
    paths: [["interaction", "productCards"], ["visibility", "interaction", "productCards"]],
  },
  { key: "interaction.prefill", paths: [["interaction", "prefill"], ["visibility", "interaction", "prefill"]] },
  { key: "interaction.prefillMessages", paths: [["interaction", "prefillMessages"]] },
  { key: "interaction.inputPlaceholder", paths: [["interaction", "inputPlaceholder"]] },
  {
    key: "interaction.widgetHeaderAgentAction",
    paths: [["interaction", "widgetHeaderAgentAction"], ["visibility", "interaction", "widgetHeaderAgentAction"]],
  },
  {
    key: "interaction.widgetHeaderNewConversation",
    paths: [["interaction", "widgetHeaderNewConversation"], ["visibility", "interaction", "widgetHeaderNewConversation"]],
  },
  {
    key: "interaction.widgetHeaderClose",
    paths: [["interaction", "widgetHeaderClose"], ["visibility", "interaction", "widgetHeaderClose"]],
  },
  {
    key: "interaction.threePhasePrompt",
    paths: [["interaction", "threePhasePrompt"], ["visibility", "interaction", "threePhasePrompt"]],
  },
  {
    key: "interaction.threePhasePromptShowConfirmed",
    paths: [
      ["interaction", "threePhasePromptShowConfirmed"],
      ["visibility", "interaction", "threePhasePromptShowConfirmed"],
      ["interaction", "threePhasePromptLabels", "confirmed"],
    ],
  },
  {
    key: "interaction.threePhasePromptShowConfirming",
    paths: [
      ["interaction", "threePhasePromptShowConfirming"],
      ["visibility", "interaction", "threePhasePromptShowConfirming"],
      ["interaction", "threePhasePromptLabels", "confirming"],
    ],
  },
  {
    key: "interaction.threePhasePromptShowNext",
    paths: [
      ["interaction", "threePhasePromptShowNext"],
      ["visibility", "interaction", "threePhasePromptShowNext"],
      ["interaction", "threePhasePromptLabels", "next"],
    ],
  },
  {
    key: "interaction.threePhasePromptHideLabels",
    paths: [["interaction", "threePhasePromptHideLabels"], ["visibility", "interaction", "threePhasePromptHideLabels"]],
  },
  { key: "interaction.inputSubmit", paths: [["interaction", "inputSubmit"], ["visibility", "interaction", "inputSubmit"]] },
  { key: "setup.modeExisting", paths: [["setup", "modeExisting"], ["visibility", "setup", "modeExisting"]] },
  { key: "setup.sessionIdSearch", paths: [["setup", "sessionIdSearch"], ["visibility", "setup", "sessionIdSearch"]] },
  { key: "setup.agentSelector", paths: [["setup", "agentSelector"], ["visibility", "setup", "agentSelector"]] },
  { key: "setup.modeNew", paths: [["setup", "modeNew"], ["visibility", "setup", "modeNew"]] },
  { key: "setup.modelSelector", paths: [["setup", "modelSelector"], ["visibility", "setup", "modelSelector"]] },
  { key: "setup.llmSelector", paths: [["setup", "llmSelector"], ["visibility", "setup", "llmSelector"]] },
  { key: "setup.defaultLlm", paths: [["setup", "defaultLlm"]] },
  { key: "setup.defaultSetupMode", paths: [["setup", "defaultSetupMode"]] },
  { key: "setup.kbSelector", paths: [["setup", "kbSelector"], ["visibility", "setup", "kbSelector"]] },
  { key: "setup.adminKbSelector", paths: [["setup", "adminKbSelector"], ["visibility", "setup", "adminKbSelector"]] },
  { key: "setup.routeSelector", paths: [["setup", "routeSelector"], ["visibility", "setup", "routeSelector"]] },
  { key: "setup.inlineUserKbInput", paths: [["setup", "inlineUserKbInput"], ["visibility", "setup", "inlineUserKbInput"]] },
  { key: "mcp.providerSelector", paths: [["mcp", "providerSelector"], ["visibility", "mcp", "providerSelector"]] },
  { key: "mcp.actionSelector", paths: [["mcp", "actionSelector"], ["visibility", "mcp", "actionSelector"]] },
];

const REVIEW_LABELS: Record<string, string> = {
  "adminPanel.enabled": "Admin Panel 활성화",
  "adminPanel.logsToggle": "로그 OFF",
  "adminPanel.copyConversation": "대화 복사",
  "interaction.quickReplies": "Quick Replies",
  "interaction.productCards": "Product Cards",
  "interaction.prefill": "Prefill",
  "interaction.prefillMessages": "Prefill Messages",
  "interaction.inputPlaceholder": "Input Placeholder",
  "interaction.widgetHeaderAgentAction": "Agent Action",
  "interaction.widgetHeaderNewConversation": "New Conversation",
  "interaction.widgetHeaderClose": "Close Button",
  "interaction.threePhasePrompt": "3-Phase Prompt",
  "interaction.threePhasePromptShowConfirmed": "Show Confirmed",
  "interaction.threePhasePromptShowConfirming": "Show Confirming",
  "interaction.threePhasePromptShowNext": "Show Next",
  "interaction.threePhasePromptHideLabels": "Hide Labels",
  "interaction.inputSubmit": "입력/전송",
  "setup.modeExisting": "기존 모델",
  "setup.sessionIdSearch": "세션 ID 직접 조회",
  "setup.agentSelector": "에이전트 선택",
  "setup.modeNew": "신규 모델",
  "setup.modelSelector": "모델 선택 UI",
  "setup.llmSelector": "LLM 선택",
  "setup.defaultLlm": "기본 LLM",
  "setup.defaultSetupMode": "기본 모드",
  "setup.kbSelector": "KB 선택",
  "setup.adminKbSelector": "관리자 KB 선택",
  "setup.routeSelector": "Runtime 선택",
  "setup.inlineUserKbInput": "사용자 KB입력란",
  "mcp.providerSelector": "MCP 프로바이더 선택",
  "mcp.actionSelector": "MCP 액션 선택",
};

function hasOwnPath(target: unknown, path: string[]) {
  let cursor = target as Record<string, unknown> | undefined;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object" || !(key in cursor)) return false;
    cursor = cursor[key] as Record<string, unknown> | undefined;
  }
  return true;
}

function hasNullPath(target: unknown, path: string[]) {
  let cursor = target as Record<string, unknown> | undefined;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object" || !(key in cursor)) return false;
    const value = cursor[key];
    if (value === null) return true;
    cursor = value as Record<string, unknown> | undefined;
  }
  return false;
}

function buildReviewFlagsForPage(
  providerPage?: ConversationPageFeaturesOverride,
  resolvedPage?: ConversationPageFeatures
): ReviewFlagMap {
  const flags: ReviewFlagMap = {};
  const target = providerPage ?? resolvedPage;
  if (!target) return flags;
  REVIEWABLE_FIELDS.forEach(({ key, paths }) => {
    const hasNull = paths.some((path) => hasNullPath(target, path));
    if (hasNull) flags[key] = true;
  });
  return flags;
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

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  visibility: FeatureVisibilityMode;
  onChange: (checked: boolean) => void;
  onChangeVisibility: (mode: FeatureVisibilityMode) => void;
  needsReview?: boolean;
  activeReview?: boolean;
  reviewKey?: string;
  reviewPage?: ConversationPageKey;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  neutralStyle?: boolean;
  editableLabel?: boolean;
  onLabelChange?: (value: string) => void;
  showDragHandle?: boolean;
};

function ToggleField({
  label,
  checked,
  visibility,
  onChange,
  onChangeVisibility,
  needsReview = false,
  activeReview = false,
  reviewKey,
  reviewPage,
  expandable = false,
  expanded = false,
  onToggleExpanded,
  neutralStyle = false,
  editableLabel = false,
  onLabelChange,
  showDragHandle = false,
}: ToggleFieldProps) {
  const displayLabel = (label || "").trim() || "setup.unknown";
  return (
    <div
      className={`${neutralStyle
          ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs"
          : checked
            ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 text-xs ring-1 ring-emerald-200"
            : "flex h-12 items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 text-xs ring-1 ring-rose-200"
        }${needsReview ? " ring-2 ring-amber-400 border-amber-400" : ""}${activeReview ? " ring-4 ring-amber-500" : ""}`}
      data-review-key={reviewKey}
      data-review-page={reviewPage}
    >
      <button
        type="button"
        onClick={() => {
          if (expandable && onToggleExpanded) onToggleExpanded();
        }}
        aria-disabled={!expandable}
        className={neutralStyle ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-slate-800" : checked ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-emerald-900" : "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-rose-900"}
      >
        <span
          contentEditable={editableLabel}
          suppressContentEditableWarning={editableLabel}
          onBlur={(e) => {
            if (!editableLabel) return;
            onLabelChange?.((e.currentTarget.textContent || "").trim());
          }}
          onKeyDown={(e) => {
            if (!editableLabel) return;
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLSpanElement).blur();
            }
          }}
          onClick={(e) => {
            if (!editableLabel) return;
            e.stopPropagation();
          }}
          className={editableLabel ? "rounded px-1 outline-none focus:ring-1 focus:ring-slate-300" : undefined}
        >
          {displayLabel}
        </span>
      </button>
      {expandable ? (
        <button
          type="button"
          onClick={() => onToggleExpanded?.()}
          className="inline-flex h-7 items-center justify-center px-1 text-[12px] font-bold text-slate-700"
          aria-label={`${displayLabel} 하위 토글`}
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
          onClick={() => onChangeVisibility(visibility === "user" ? "admin" : "user")}
          className={
            visibility === "admin"
              ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
              : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
          }
        >
          {visibility === "admin" ? "ADMIN" : "USER"}
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
  needsReview?: boolean;
  activeReview?: boolean;
  reviewKey?: string;
  reviewPage?: ConversationPageKey;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  neutralStyle?: boolean;
  hideToggle?: boolean;
};

function GroupToggleField({
  label,
  checked,
  onChange,
  visibility,
  onChangeVisibility,
  needsReview = false,
  activeReview = false,
  reviewKey,
  reviewPage,
  expandable = false,
  expanded = false,
  onToggleExpanded,
  neutralStyle = false,
  hideToggle = false,
}: GroupToggleFieldProps) {
  const displayLabel = (label || "").trim() || "group.unknown";
  return (
    <div
      className={`${neutralStyle
          ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs"
          : checked
            ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 text-xs ring-1 ring-emerald-200"
            : "flex h-12 items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 text-xs ring-1 ring-rose-200"
        }${needsReview ? " ring-2 ring-amber-400 border-amber-400" : ""}${activeReview ? " ring-4 ring-amber-500" : ""}`}
      data-review-key={reviewKey}
      data-review-page={reviewPage}
    >
      <button
        type="button"
        onClick={() => {
          if (expandable && onToggleExpanded) onToggleExpanded();
        }}
        aria-disabled={!expandable}
        className={neutralStyle ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-slate-800" : checked ? "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-emerald-900" : "inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold text-rose-900"}
      >
        <span>{displayLabel}</span>
      </button>
      {expandable ? (
        <button
          type="button"
          onClick={() => onToggleExpanded?.()}
          className="inline-flex h-7 items-center justify-center px-1 text-[12px] font-bold text-slate-700"
          aria-label={`${displayLabel} 하위 토글`}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : null}
      {!hideToggle ? (
        <span className="state-controls flex items-center gap-1">
          <button
            type="button"
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
              onClick={() => onChangeVisibility?.(visibility === "user" ? "admin" : "user")}
              className={
                visibility === "admin"
                  ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white"
                  : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-bold text-white"
              }
            >
              {visibility === "admin" ? "ADMIN" : "USER"}
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
  children: React.ReactNode;
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


export function ChatSettingsPanel({
  authToken,
  dataSource,
  title,
  description,
  visiblePages,
  showRegisteredPages = true,
}: Props) {
  const includeBasePages = !(visiblePages && visiblePages.length > 0);
  const normalizePagesWithBase = useCallback(
    (pages: ConversationPageKey[]) => normalizePages(pages, { includeBase: includeBasePages }),
    [includeBasePages]
  );
  const initialPages = useMemo(
    () => normalizePagesWithBase(visiblePages && visiblePages.length > 0 ? visiblePages : []),
    [normalizePagesWithBase, visiblePages]
  );
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [governanceSaving, setGovernanceSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [governanceConfig, setGovernanceConfig] = useState<GovernanceConfig | null>(null);
  const [draftByPage, setDraftByPage] = useState<Record<ConversationPageKey, ConversationPageFeatures>>(
    buildInitialDraftByPage(initialPages)
  );
  const [reviewFlagsByPage, setReviewFlagsByPage] = useState<ReviewFlagsByPage>({});
  const [activeReview, setActiveReview] = useState<ReviewTarget>(null);
  const [debugCopyDraftByPage, setDebugCopyDraftByPage] =
    useState<Record<ConversationPageKey, DebugTranscriptOptions>>(buildInitialDebugByPage(initialPages));
  const [setupUiByPage, setSetupUiByPage] =
    useState<Record<ConversationPageKey, ConversationSetupUi>>(buildInitialSetupUiByPage(initialPages));
  const [registeredPages, setRegisteredPages] = useState<ConversationPageKey[]>(initialPages);
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
  const reviewTargetPages = useMemo(
    () => (visiblePages && visiblePages.length > 0 ? visiblePages : registeredPages),
    [registeredPages, visiblePages]
  );
  const hasPendingReview = useMemo(
    () => Object.values(reviewFlagsByPage).some((pageFlags) => Object.values(pageFlags).some(Boolean)),
    [reviewFlagsByPage]
  );
  const activeReviewLabel = useMemo(() => {
    if (!activeReview) return null;
    return REVIEW_LABELS[activeReview.key] || activeReview.key;
  }, [activeReview]);
  const pickFirstPendingReview = useCallback(() => {
    for (const page of reviewTargetPages) {
      if (page === "/") continue;
      const flags = reviewFlagsByPage[page];
      if (!flags) continue;
      for (const field of REVIEWABLE_FIELDS) {
        if (flags[field.key]) return { page, key: field.key };
      }
    }
    return null;
  }, [reviewFlagsByPage, reviewTargetPages]);
  const ensureReviewSectionVisible = useCallback((page: ConversationPageKey, key: string) => {
    if (
      key === "setup.modeExisting" ||
      key === "setup.sessionIdSearch" ||
      key === "setup.agentSelector"
    ) {
      setSetupExistingDetailsOpenByPage((prev) => ({ ...prev, [page]: true }));
    }
    if (
      key === "setup.modeNew" ||
      key.startsWith("setup.") ||
      key.startsWith("mcp.")
    ) {
      setSetupNewDetailsOpenByPage((prev) => ({ ...prev, [page]: true }));
    }
    if (key.startsWith("interaction.threePhasePrompt")) {
      setThreePhaseDetailsOpenByPage((prev) => ({ ...prev, [page]: true }));
    }
  }, []);
  const scrollToFirstPendingReview = useCallback(() => {
    const target = pickFirstPendingReview();
    if (!target || typeof document === "undefined") return;
    ensureReviewSectionVisible(target.page, target.key);
    setActiveReview(target);
    setTimeout(() => {
      const selector = `[data-review-key="${target.key}"][data-review-page="${target.page}"]`;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el && "scrollIntoView" in el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        if ("focus" in el) {
          try {
            (el as HTMLElement).focus();
          } catch {
            // ignore focus errors
          }
        }
      }
    }, 0);
    window.setTimeout(() => {
      setActiveReview(null);
    }, 2500);
  }, [ensureReviewSectionVisible, pickFirstPendingReview]);
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
    const discoveredPages = normalizePagesWithBase(
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
    setReviewFlagsByPage(
      discoveredPages.reduce<ReviewFlagsByPage>((acc, page) => {
        acc[page] = buildReviewFlagsForPage(providerValue?.pages?.[page], next[page]);
        return acc;
      }, {})
    );
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
  }, [buildOpenStateByPage, normalizePagesWithBase]);

  const updatePage = useCallback(
    (page: ConversationPageKey, updater: (prev: ConversationPageFeatures) => ConversationPageFeatures) => {
      setDraftByPage((prev) => ({ ...prev, [page]: updater(prev[page]) }));
    },
    []
  );

  const clearReviewFlag = useCallback((page: ConversationPageKey, key: string) => {
    setReviewFlagsByPage((prev) => {
      const pageFlags = prev[page];
      if (!pageFlags || !pageFlags[key]) return prev;
      const nextPageFlags = { ...pageFlags };
      delete nextPageFlags[key];
      if (Object.keys(nextPageFlags).length === 0) {
        const next = { ...prev };
        delete next[page];
        return next;
      }
      return { ...prev, [page]: nextPageFlags };
    });
  }, []);

  const clearReviewFlagAllPages = useCallback((key: string) => {
    setReviewFlagsByPage((prev) => {
      const next: ReviewFlagsByPage = {};
      Object.keys(prev).forEach((page) => {
        const pageFlags = { ...prev[page as ConversationPageKey] };
        if (!pageFlags[key]) {
          next[page as ConversationPageKey] = pageFlags;
          return;
        }
        delete pageFlags[key];
        if (Object.keys(pageFlags).length > 0) {
          next[page as ConversationPageKey] = pageFlags;
        }
      });
      return next;
    });
  }, []);

  const renderAllowDenyBlock = useCallback(
    (
      opts: {
        page: ConversationPageKey;
        isHeader: boolean;
        key: string;
        label: string;
        value: { allowlist?: string[]; denylist?: string[] };
        onChange: (next: { allowlist?: string[]; denylist?: string[] }) => void;
      }
    ) => (
      <div
        className="rounded-lg border border-slate-200 bg-white p-2"
        data-review-key={!opts.isHeader ? opts.key : undefined}
        data-review-page={!opts.isHeader ? opts.page : undefined}
      >
        <div className="text-[11px] font-semibold text-slate-700">{opts.isHeader ? opts.key : opts.label}</div>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <label className="block">
            <div className="mb-1 text-[11px] text-slate-500">Allowlist (줄바꿈)</div>
            <textarea
              disabled={opts.isHeader}
              value={(opts.value.allowlist || []).join("\n")}
              onChange={(e) => {
                const list = parseCsv(e.target.value.replace(/\r?\n/g, ","));
                opts.onChange({ ...opts.value, allowlist: list.length ? list : undefined });
              }}
              className="min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="예: item_a"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-[11px] text-slate-500">Denylist (줄바꿈)</div>
            <textarea
              disabled={opts.isHeader}
              value={(opts.value.denylist || []).join("\n")}
              onChange={(e) => {
                const list = parseCsv(e.target.value.replace(/\r?\n/g, ","));
                opts.onChange({ ...opts.value, denylist: list.length ? list : undefined });
              }}
              className="min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
              placeholder="예: item_b"
            />
          </label>
        </div>
      </div>
    ),
    [clearReviewFlag]
  );

  const updateAllPages = useCallback(
    (updater: (prev: ConversationPageFeatures) => ConversationPageFeatures) => {
      setDraftByPage((prev) => {
        const pages = normalizePagesWithBase(registeredPages);
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
      const provider = dataSource
        ? await dataSource.loadProvider(authToken)
        : await (async () => {
            const res = await fetch("/api/auth-settings/providers?provider=chat_policy", {
              headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
            });
            const payload = await parseJsonBody<{ provider?: ConversationFeaturesProviderShape; error?: string }>(res);
            if (!res.ok) {
              throw new Error(payload?.error || "대화 설정을 불러오지 못했습니다.");
            }
            return payload?.provider || null;
          })();
      applyProviderToDraft(provider || null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "대화 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [applyProviderToDraft, authToken, dataSource, loadDebugFieldExamples, loadGovernanceConfig]);

  const saveGovernanceConfig = useCallback(
    async (next: { enabled: boolean; visibility_mode: "user" | "admin" }) => {
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
    async (next: { enabled: boolean; visibility_mode: "user" | "admin" }) => {
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

  const columnKeys = useMemo<Array<"__header" | ConversationPageKey>>(() => {
    const filtered = visiblePages && visiblePages.length > 0 ? visiblePages : registeredPages;
    return ["__header", ...filtered];
  }, [registeredPages, visiblePages]);

  const handleResetToDefaults = () => {
    applyProviderToDraft(null);
    const pages = normalizePagesWithBase(registeredPages);
    setDebugCopyDraftByPage(buildInitialDebugByPage(pages));
    setSetupUiByPage(buildInitialSetupUiByPage(pages, null));
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
    setReviewFlagsByPage({});
    setError(null);
  };

  const handleSave = async () => {
    if (hasPendingReview) {
      setError("기본값으로 채워진 항목이 있습니다. 강조 표시된 항목을 확인/변경한 뒤 저장하세요.");
      scrollToFirstPendingReview();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const pagesList = normalizePagesWithBase(registeredPages);
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

      if (dataSource) {
        await dataSource.saveProvider(authToken, {
          pages,
          debug_copy,
          page_registry: registeredPages,
          settings_ui: { setup_fields },
        });
      } else {
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
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">{title || "대화 설정 관리"}</div>
        <div className="mt-2 text-sm text-slate-600">
          {description ||
            "서비스 전역 대화 정책을 폼으로 수정합니다. 저장 시 A_iam_auth_settings.providers.chat_policy (org 최신 값)에 반영됩니다."}
        </div>
        {hasPendingReview ? (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            기본값으로 채워진 항목이 있습니다. 노란색으로 강조된 항목을 확인/변경해야 저장할 수 있습니다.
            {activeReviewLabel ? <div className="mt-1 font-semibold">현재 미입력: {activeReviewLabel}</div> : null}
          </div>
        ) : null}
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
          {hasPendingReview ? (
            <Button
              type="button"
              onClick={scrollToFirstPendingReview}
              disabled={loading || saving}
              className="border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
            >
              미입력 항목 보기
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={loading || saving || hasPendingReview}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </Card>

      {showRegisteredPages ? (
        <Card className="p-4">
          <div className="text-sm font-semibold text-slate-900">자동 등록된 대화 페이지</div>
          <div className="mt-1 text-xs text-slate-500">
            대화 UI(설정 박스/대화 박스)가 로드되면 경로가 자동 등록됩니다.
          </div>
          <div className="mt-2 space-y-1">
            {registeredPages.map((page) => (
              <div
                key={`registered-page-${page}`}
                className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700"
              >
                {page}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-full gap-4">
          {columnKeys.map((column) => {
            const isHeader = column === "__header";
            const page: ConversationPageKey = isHeader ? "/" : column;
            const pageLabel = page === "/embed" ? "위젯 (/embed)" : page;
            const draft = draftByPage[page] ?? getDefaultConversationPageFeatures(page);
            const setupUiDraft = setupUiByPage[page] ?? resolveConversationSetupUi(page, null);
            const effectiveModelSelector = true;
            const setupDetailsOpen = true;
            const showSetupExistingDetails = Boolean(setupExistingDetailsOpenByPage[page]);
            const showSetupNewDetails = Boolean(setupNewDetailsOpenByPage[page]);
            const debugCopyDraft =
              debugCopyDraftByPage[page] ?? resolvePageConversationDebugOptions(page, null);
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
            const reviewFlags = reviewFlagsByPage[page] || {};
            const isReviewing = (key: string) => !isHeader && Boolean(reviewFlags[key]);
            const isActiveReview = (key: string) => !isHeader && activeReview?.page === page && activeReview?.key === key;
            const showDebugHeaderDetails = Boolean(debugHeaderDetailsOpenByPage[page]);
            const showDebugTurnDetails = Boolean(debugTurnDetailsOpenByPage[page]);
            const showDebugLogsDetails = Boolean(debugLogsDetailsOpenByPage[page]);
            const showDebugEventDetails = Boolean(debugEventDetailsOpenByPage[page]);
            const showThreePhaseDetails = Boolean(threePhaseDetailsOpenByPage[page]);
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

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Admin Panel</div>
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.enabled" : "Admin Panel 활성화"}
                      checked={draft.adminPanel.enabled}
                      visibility={draft.visibility.adminPanel.enabled}
                      needsReview={isReviewing("adminPanel.enabled")}
                      activeReview={isActiveReview("adminPanel.enabled")}
                      reviewKey={!isHeader ? "adminPanel.enabled" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, enabled: v } }));
                        if (!isHeader) clearReviewFlag(page, "adminPanel.enabled");
                      }}
                      onChangeVisibility={(mode) => {
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, enabled: mode } },
                        }));
                        if (!isHeader) clearReviewFlag(page, "adminPanel.enabled");
                      }}
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.logsToggle" : "로그 OFF"}
                      checked={draft.adminPanel.logsToggle}
                      visibility={draft.visibility.adminPanel.logsToggle}
                      needsReview={isReviewing("adminPanel.logsToggle")}
                      activeReview={isActiveReview("adminPanel.logsToggle")}
                      reviewKey={!isHeader ? "adminPanel.logsToggle" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, logsToggle: v } }));
                        if (!isHeader) clearReviewFlag(page, "adminPanel.logsToggle");
                      }}
                      onChangeVisibility={(mode) => {
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, logsToggle: mode } },
                        }));
                        if (!isHeader) clearReviewFlag(page, "adminPanel.logsToggle");
                      }}
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.copyConversation" : "대화 복사"}
                      checked={draft.adminPanel.copyConversation}
                      visibility={draft.visibility.adminPanel.copyConversation}
                      needsReview={isReviewing("adminPanel.copyConversation")}
                      activeReview={isActiveReview("adminPanel.copyConversation")}
                      reviewKey={!isHeader ? "adminPanel.copyConversation" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updateAllPages((prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, copyConversation: v } }));
                        if (!isHeader) clearReviewFlagAllPages("adminPanel.copyConversation");
                      }}
                      onChangeVisibility={(mode) => {
                        updateAllPages((prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            adminPanel: { ...prev.visibility.adminPanel, copyConversation: mode },
                          },
                        }));
                        if (!isHeader) clearReviewFlagAllPages("adminPanel.copyConversation");
                      }}
                    />
                  </div>

                  

                  
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Interaction</div>
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "interaction.quickReplies" : "Quick Replies"}
                      checked={draft.interaction.quickReplies}
                      visibility={draft.visibility.interaction.quickReplies}
                      needsReview={isReviewing("interaction.quickReplies")}
                      activeReview={isActiveReview("interaction.quickReplies")}
                      reviewKey={!isHeader ? "interaction.quickReplies" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, quickReplies: v } }));
                        if (!isHeader) clearReviewFlag(page, "interaction.quickReplies");
                      }}
                      onChangeVisibility={(mode) => {
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, quickReplies: mode },
                          },
                        }));
                        if (!isHeader) clearReviewFlag(page, "interaction.quickReplies");
                      }}
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "interaction.productCards" : "Product Cards"}
                      checked={draft.interaction.productCards}
                      visibility={draft.visibility.interaction.productCards}
                      needsReview={isReviewing("interaction.productCards")}
                      activeReview={isActiveReview("interaction.productCards")}
                      reviewKey={!isHeader ? "interaction.productCards" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, productCards: v } }));
                        if (!isHeader) clearReviewFlag(page, "interaction.productCards");
                      }}
                      onChangeVisibility={(mode) => {
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, productCards: mode },
                          },
                        }));
                        if (!isHeader) clearReviewFlag(page, "interaction.productCards");
                      }}
                    />

                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "interaction.prefill" : "Prefill"}
                      checked={draft.interaction.prefill}
                      visibility={draft.visibility.interaction.prefill}
                      needsReview={isReviewing("interaction.prefill")}
                      activeReview={isActiveReview("interaction.prefill")}
                      reviewKey={!isHeader ? "interaction.prefill" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, prefill: v } }));
                        if (!isHeader) clearReviewFlag(page, "interaction.prefill");
                      }}
                      onChangeVisibility={(mode) => {
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, prefill: mode },
                          },
                        }));
                        if (!isHeader) clearReviewFlag(page, "interaction.prefill");
                      }}
                    />
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">
                        {isHeader ? "interaction.prefillMessages" : "Prefill Messages (줄바꿈)"}
                      </div>
                      <textarea
                        data-review-key={!isHeader ? "interaction.prefillMessages" : undefined}
                        data-review-page={!isHeader ? page : undefined}
                        value={(draft.interaction.prefillMessages || []).join("\n")}
                        disabled={isHeader}
                        onChange={(e) => {
                          updatePage(page, (prev) => ({
                            ...prev,
                            interaction: {
                              ...prev.interaction,
                              prefillMessages: e.target.value
                                .split(/\r?\n/)
                                .map((item) => item.trim())
                                .filter(Boolean),
                            },
                          }));
                          if (!isHeader) clearReviewFlag(page, "interaction.prefillMessages");
                        }}
                        className={`config-input min-h-[70px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500${
                          isReviewing("interaction.prefillMessages") ? " border-amber-400 ring-1 ring-amber-200" : ""
                        }${isActiveReview("interaction.prefillMessages") ? " ring-4 ring-amber-500" : ""}`}
                        placeholder="예: 기록한대로 응대하는 AI 상담사를"
                      />
                      {/* {!isHeader ? <div className="mt-1 text-[10px] text-slate-500">줄바꿈으로 여러 줄 입력</div> : null} */}
                    </label>
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">
                        {isHeader ? "interaction.inputPlaceholder" : "Input Placeholder"}
                      </div>
                      <input
                        data-review-key={!isHeader ? "interaction.inputPlaceholder" : undefined}
                        data-review-page={!isHeader ? page : undefined}
                        value={draft.interaction.inputPlaceholder || ""}
                        disabled={isHeader}
                        onChange={(e) => {
                          updatePage(page, (prev) => ({
                            ...prev,
                            interaction: { ...prev.interaction, inputPlaceholder: e.target.value },
                          }));
                          if (!isHeader) clearReviewFlag(page, "interaction.inputPlaceholder");
                        }}
                        className={`config-input h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-500${
                          isReviewing("interaction.inputPlaceholder") ? " border-amber-400 ring-1 ring-amber-200" : ""
                        }${isActiveReview("interaction.inputPlaceholder") ? " ring-4 ring-amber-500" : ""}`}
                        placeholder="예: 문의 내용을 입력해주세요"
                      />
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="text-[11px] font-semibold text-slate-600">
                        {isHeader ? "interaction.widgetHeader" : "Widget Header"}
                      </div>
                      <div className="mt-2 space-y-2">
                        <ToggleField
                          neutralStyle={isHeader}
                          label={isHeader ? "interaction.widgetHeaderAgentAction" : "Agent Action"}
                          checked={draft.interaction.widgetHeaderAgentAction}
                          visibility={draft.visibility.interaction.widgetHeaderAgentAction}
                          needsReview={isReviewing("interaction.widgetHeaderAgentAction")}
                          activeReview={isActiveReview("interaction.widgetHeaderAgentAction")}
                          reviewKey={!isHeader ? "interaction.widgetHeaderAgentAction" : undefined}
                          reviewPage={!isHeader ? page : undefined}
                          onChange={(v) => {
                            updatePage(page, (prev) => ({
                              ...prev,
                              interaction: { ...prev.interaction, widgetHeaderAgentAction: v },
                            }));
                            if (!isHeader) clearReviewFlag(page, "interaction.widgetHeaderAgentAction");
                          }}
                          onChangeVisibility={(mode) => {
                            updatePage(page, (prev) => ({
                              ...prev,
                              visibility: {
                                ...prev.visibility,
                                interaction: { ...prev.visibility.interaction, widgetHeaderAgentAction: mode },
                              },
                            }));
                            if (!isHeader) clearReviewFlag(page, "interaction.widgetHeaderAgentAction");
                          }}
                        />
                        <ToggleField
                          neutralStyle={isHeader}
                          label={isHeader ? "interaction.widgetHeaderNewConversation" : "New Conversation"}
                          checked={draft.interaction.widgetHeaderNewConversation}
                          visibility={draft.visibility.interaction.widgetHeaderNewConversation}
                          needsReview={isReviewing("interaction.widgetHeaderNewConversation")}
                          activeReview={isActiveReview("interaction.widgetHeaderNewConversation")}
                          reviewKey={!isHeader ? "interaction.widgetHeaderNewConversation" : undefined}
                          reviewPage={!isHeader ? page : undefined}
                          onChange={(v) => {
                            updatePage(page, (prev) => ({
                              ...prev,
                              interaction: { ...prev.interaction, widgetHeaderNewConversation: v },
                            }));
                            if (!isHeader) clearReviewFlag(page, "interaction.widgetHeaderNewConversation");
                          }}
                          onChangeVisibility={(mode) => {
                            updatePage(page, (prev) => ({
                              ...prev,
                              visibility: {
                                ...prev.visibility,
                                interaction: { ...prev.visibility.interaction, widgetHeaderNewConversation: mode },
                              },
                            }));
                            if (!isHeader) clearReviewFlag(page, "interaction.widgetHeaderNewConversation");
                          }}
                        />
                        <ToggleField
                          neutralStyle={isHeader}
                          label={isHeader ? "interaction.widgetHeaderClose" : "Close Button"}
                          checked={draft.interaction.widgetHeaderClose}
                          visibility={draft.visibility.interaction.widgetHeaderClose}
                          needsReview={isReviewing("interaction.widgetHeaderClose")}
                          activeReview={isActiveReview("interaction.widgetHeaderClose")}
                          reviewKey={!isHeader ? "interaction.widgetHeaderClose" : undefined}
                          reviewPage={!isHeader ? page : undefined}
                          onChange={(v) => {
                            updatePage(page, (prev) => ({
                              ...prev,
                              interaction: { ...prev.interaction, widgetHeaderClose: v },
                            }));
                            if (!isHeader) clearReviewFlag(page, "interaction.widgetHeaderClose");
                          }}
                          onChangeVisibility={(mode) => {
                            updatePage(page, (prev) => ({
                              ...prev,
                              visibility: {
                                ...prev.visibility,
                                interaction: { ...prev.visibility.interaction, widgetHeaderClose: mode },
                              },
                            }));
                            if (!isHeader) clearReviewFlag(page, "interaction.widgetHeaderClose");
                          }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <GroupToggleField
                        neutralStyle={isHeader}
                        label={isHeader ? "interaction.threePhasePrompt" : "3-Phase Prompt"}
                        checked={draft.interaction.threePhasePrompt}
                        visibility={draft.visibility.interaction.threePhasePrompt}
                        needsReview={isReviewing("interaction.threePhasePrompt")}
                        activeReview={isActiveReview("interaction.threePhasePrompt")}
                        reviewKey={!isHeader ? "interaction.threePhasePrompt" : undefined}
                        reviewPage={!isHeader ? page : undefined}
                        onChange={(v) => {
                          updatePage(page, (prev) => ({
                            ...prev,
                            interaction: { ...prev.interaction, threePhasePrompt: v },
                          }));
                          if (!isHeader) clearReviewFlag(page, "interaction.threePhasePrompt");
                        }}
                        onChangeVisibility={(mode) => {
                          updatePage(page, (prev) => ({
                            ...prev,
                            visibility: {
                              ...prev.visibility,
                              interaction: { ...prev.visibility.interaction, threePhasePrompt: mode },
                            },
                          }));
                          if (!isHeader) clearReviewFlag(page, "interaction.threePhasePrompt");
                        }}
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
                            <ToggleField
                              neutralStyle={isHeader}
                              label={
                                isHeader
                                  ? "interaction.threePhasePromptShowConfirmed"
                                  : draft.interaction.threePhasePromptLabels?.confirmed || "Show Confirmed"
                              }
                              checked={draft.interaction.threePhasePromptShowConfirmed}
                              visibility={draft.visibility.interaction.threePhasePromptShowConfirmed}
                              editableLabel={!isHeader}
                              needsReview={isReviewing("interaction.threePhasePromptShowConfirmed")}
                              activeReview={isActiveReview("interaction.threePhasePromptShowConfirmed")}
                              reviewKey={!isHeader ? "interaction.threePhasePromptShowConfirmed" : undefined}
                              reviewPage={!isHeader ? page : undefined}
                              onLabelChange={(value) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  interaction: {
                                    ...prev.interaction,
                                    threePhasePromptLabels: {
                                      ...prev.interaction.threePhasePromptLabels,
                                      confirmed: value,
                                    },
                                  },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowConfirmed");
                              }}
                              onChange={(v) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  interaction: { ...prev.interaction, threePhasePromptShowConfirmed: v },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowConfirmed");
                              }}
                              onChangeVisibility={(mode) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  visibility: {
                                    ...prev.visibility,
                                    interaction: { ...prev.visibility.interaction, threePhasePromptShowConfirmed: mode },
                                  },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowConfirmed");
                              }}
                            />
                            <ToggleField
                              neutralStyle={isHeader}
                              label={
                                isHeader
                                  ? "interaction.threePhasePromptShowConfirming"
                                  : draft.interaction.threePhasePromptLabels?.confirming || "Show Confirming"
                              }
                              checked={draft.interaction.threePhasePromptShowConfirming}
                              visibility={draft.visibility.interaction.threePhasePromptShowConfirming}
                              editableLabel={!isHeader}
                              needsReview={isReviewing("interaction.threePhasePromptShowConfirming")}
                              activeReview={isActiveReview("interaction.threePhasePromptShowConfirming")}
                              reviewKey={!isHeader ? "interaction.threePhasePromptShowConfirming" : undefined}
                              reviewPage={!isHeader ? page : undefined}
                              onLabelChange={(value) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  interaction: {
                                    ...prev.interaction,
                                    threePhasePromptLabels: {
                                      ...prev.interaction.threePhasePromptLabels,
                                      confirming: value,
                                    },
                                  },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowConfirming");
                              }}
                              onChange={(v) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  interaction: { ...prev.interaction, threePhasePromptShowConfirming: v },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowConfirming");
                              }}
                              onChangeVisibility={(mode) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  visibility: {
                                    ...prev.visibility,
                                    interaction: { ...prev.visibility.interaction, threePhasePromptShowConfirming: mode },
                                  },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowConfirming");
                              }}
                            />
                            <ToggleField
                              neutralStyle={isHeader}
                              label={
                                isHeader
                                  ? "interaction.threePhasePromptShowNext"
                                  : draft.interaction.threePhasePromptLabels?.next || "Show Next"
                              }
                              checked={draft.interaction.threePhasePromptShowNext}
                              visibility={draft.visibility.interaction.threePhasePromptShowNext}
                              editableLabel={!isHeader}
                              needsReview={isReviewing("interaction.threePhasePromptShowNext")}
                              activeReview={isActiveReview("interaction.threePhasePromptShowNext")}
                              reviewKey={!isHeader ? "interaction.threePhasePromptShowNext" : undefined}
                              reviewPage={!isHeader ? page : undefined}
                              onLabelChange={(value) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  interaction: {
                                    ...prev.interaction,
                                    threePhasePromptLabels: {
                                      ...prev.interaction.threePhasePromptLabels,
                                      next: value,
                                    },
                                  },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowNext");
                              }}
                              onChange={(v) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  interaction: { ...prev.interaction, threePhasePromptShowNext: v },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowNext");
                              }}
                              onChangeVisibility={(mode) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  visibility: {
                                    ...prev.visibility,
                                    interaction: { ...prev.visibility.interaction, threePhasePromptShowNext: mode },
                                  },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptShowNext");
                              }}
                            />
                            <ToggleField
                              neutralStyle={isHeader}
                              label={isHeader ? "interaction.threePhasePromptHideLabels" : "Hide Labels"}
                              checked={draft.interaction.threePhasePromptHideLabels}
                              visibility={draft.visibility.interaction.threePhasePromptHideLabels}
                              needsReview={isReviewing("interaction.threePhasePromptHideLabels")}
                              activeReview={isActiveReview("interaction.threePhasePromptHideLabels")}
                              reviewKey={!isHeader ? "interaction.threePhasePromptHideLabels" : undefined}
                              reviewPage={!isHeader ? page : undefined}
                              onChange={(v) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  interaction: { ...prev.interaction, threePhasePromptHideLabels: v },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptHideLabels");
                              }}
                              onChangeVisibility={(mode) => {
                                updatePage(page, (prev) => ({
                                  ...prev,
                                  visibility: {
                                    ...prev.visibility,
                                    interaction: { ...prev.visibility.interaction, threePhasePromptHideLabels: mode },
                                  },
                                }));
                                if (!isHeader) clearReviewFlag(page, "interaction.threePhasePromptHideLabels");
                              }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "interaction.inputSubmit" : "입력/전송"}
                      checked={draft.interaction.inputSubmit}
                      visibility={draft.visibility.interaction.inputSubmit}
                      needsReview={isReviewing("interaction.inputSubmit")}
                      activeReview={isActiveReview("interaction.inputSubmit")}
                      reviewKey={!isHeader ? "interaction.inputSubmit" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, inputSubmit: v } }));
                        if (!isHeader) clearReviewFlag(page, "interaction.inputSubmit");
                      }}
                      onChangeVisibility={(mode) => {
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, inputSubmit: mode },
                          },
                        }));
                        if (!isHeader) clearReviewFlag(page, "interaction.inputSubmit");
                      }}
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Setup</div>
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "setup.modelSelector" : "모델 선택 UI"}
                      checked={draft.setup.modelSelector}
                      visibility={draft.visibility.setup.modelSelector}
                      needsReview={isReviewing("setup.modelSelector")}
                      activeReview={isActiveReview("setup.modelSelector")}
                      reviewKey={!isHeader ? "setup.modelSelector" : undefined}
                      reviewPage={!isHeader ? page : undefined}
                      onChange={(v) => {
                        updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modelSelector: v } }));
                        if (!isHeader) clearReviewFlag(page, "setup.modelSelector");
                      }}
                      onChangeVisibility={(mode) => {
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modelSelector: mode } },
                        }));
                        if (!isHeader) clearReviewFlag(page, "setup.modelSelector");
                      }}
                    />
                    <div
                      className={`rounded-lg border border-slate-200 bg-white p-2${
                        isReviewing("setup.defaultSetupMode") ? " border-amber-400 ring-1 ring-amber-200" : ""
                      }${isActiveReview("setup.defaultSetupMode") ? " ring-4 ring-amber-500" : ""}`}
                      data-review-key={!isHeader ? "setup.defaultSetupMode" : undefined}
                      data-review-page={!isHeader ? page : undefined}
                    >
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">
                        {isHeader ? "setup.defaultSetupMode" : "기본 모드"}
                      </div>
                      <SelectPopover
                        value={draft.setup.defaultSetupMode}
                        disabled={isHeader}
                        options={[
                          { id: "new", label: "신규 모델" },
                          { id: "existing", label: "기존 모델" },
                        ]}
                        onChange={(value) => {
                          updatePage(page, (prev) => ({
                            ...prev,
                            setup: { ...prev.setup, defaultSetupMode: value as "existing" | "new" },
                          }));
                          if (!isHeader) clearReviewFlag(page, "setup.defaultSetupMode");
                        }}
                        className="w-full"
                        buttonClassName="h-9 text-xs"
                      />
                    </div>
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
                      {governanceSaving ? <div className="text-[11px] text-slate-500">Self Update 저장 중...</div> : null}
                    </div>

                    {setupDetailsOpen ? (
                      <>
                        {effectiveModelSelector ? (
                          <div className="space-y-2">
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                              <ToggleField
                                neutralStyle={isHeader}
                                label={isHeader ? "setup.modeExisting" : (setupUiByPage[page].existingLabels.modeExisting || "기존 모델")}
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
                                needsReview={isReviewing("setup.modeExisting")}
                                activeReview={isActiveReview("setup.modeExisting")}
                                reviewKey={!isHeader ? "setup.modeExisting" : undefined}
                                reviewPage={!isHeader ? page : undefined}
                                onChange={(v) => {
                                  updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeExisting: v } }));
                                  if (!isHeader) clearReviewFlag(page, "setup.modeExisting");
                                }}
                                onChangeVisibility={(mode) => {
                                  updatePage(page, (prev) => ({
                                    ...prev,
                                    visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modeExisting: mode } },
                                  }));
                                  if (!isHeader) clearReviewFlag(page, "setup.modeExisting");
                                }}
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
                                    const meta = EXISTING_SETUP_FIELDS.find((item) => item.key === existingKey);
                                    const codeLabel = meta?.codeLabel || `setup.${existingKey}`;
                                    const defaultLabel = meta?.defaultLabel || existingKey;
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
                                          needsReview={isReviewing("setup.sessionIdSearch")}
                                          activeReview={isActiveReview("setup.sessionIdSearch")}
                                          reviewKey={!isHeader ? "setup.sessionIdSearch" : undefined}
                                          reviewPage={!isHeader ? page : undefined}
                                          onChange={(v) => {
                                            updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, sessionIdSearch: v } }));
                                            if (!isHeader) clearReviewFlag(page, "setup.sessionIdSearch");
                                          }}
                                          onChangeVisibility={(mode) => {
                                            updatePage(page, (prev) => ({
                                              ...prev,
                                              visibility: {
                                                ...prev.visibility,
                                                setup: { ...prev.visibility.setup, sessionIdSearch: mode },
                                              },
                                            }));
                                            if (!isHeader) clearReviewFlag(page, "setup.sessionIdSearch");
                                          }}
                                        />
                                      ) : existingKey === "agentSelector" ? (
                                        <ToggleField
                                          {...keyProps}
                                          checked={draft.setup.agentSelector}
                                          visibility={draft.visibility.setup.agentSelector}
                                          needsReview={isReviewing("setup.agentSelector")}
                                          activeReview={isActiveReview("setup.agentSelector")}
                                          reviewKey={!isHeader ? "setup.agentSelector" : undefined}
                                          reviewPage={!isHeader ? page : undefined}
                                          onChange={(v) => {
                                            updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, agentSelector: v } }));
                                            if (!isHeader) clearReviewFlag(page, "setup.agentSelector");
                                          }}
                                          onChangeVisibility={(mode) => {
                                            updatePage(page, (prev) => ({
                                              ...prev,
                                              visibility: {
                                                ...prev.visibility,
                                                setup: { ...prev.visibility.setup, agentSelector: mode },
                                              },
                                            }));
                                            if (!isHeader) clearReviewFlag(page, "setup.agentSelector");
                                          }}
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
                                              className={!isHeader ? "rounded px-1 outline-none focus:ring-1 focus:ring-slate-300" : undefined}
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
                                label={isHeader ? "setup.modeNew" : (setupUiByPage[page].existingLabels.modeNew || "신규 모델")}
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
                                needsReview={isReviewing("setup.modeNew")}
                                activeReview={isActiveReview("setup.modeNew")}
                                reviewKey={!isHeader ? "setup.modeNew" : undefined}
                                reviewPage={!isHeader ? page : undefined}
                                onChange={(v) => {
                                  updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, modeNew: v } }));
                                  if (!isHeader) clearReviewFlag(page, "setup.modeNew");
                                }}
                                onChangeVisibility={(mode) => {
                                  updatePage(page, (prev) => ({
                                    ...prev,
                                    visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, modeNew: mode } },
                                  }));
                                  if (!isHeader) clearReviewFlag(page, "setup.modeNew");
                                }}
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
                                    const codeLabel = (SETUP_CODE_LABELS[setupKey] || `setup.${setupKey}`).trim();
                                    const customLabel = (setupUiByPage[page].labels[setupKey] || "").trim();
                                    const defaultLabel = (SETUP_FIELD_OPTIONS.find((item) => item.key === setupKey)?.defaultLabel || setupKey).trim();
                                    const label = isHeader ? codeLabel : customLabel || defaultLabel;
                                    const makeToggle = () => {
                                      if (setupKey === "llmSelector") {
                                        return (
                                          <>
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
                                                    labels: { ...prev[page].labels, llmSelector: value },
                                                  },
                                                }))
                                              }
                                              checked={draft.setup.llmSelector}
                                              visibility={draft.visibility.setup.llmSelector}
                                              needsReview={isReviewing("setup.llmSelector")}
                                              activeReview={isActiveReview("setup.llmSelector")}
                                              reviewKey={!isHeader ? "setup.llmSelector" : undefined}
                                              reviewPage={!isHeader ? page : undefined}
                                              onChange={(v) => {
                                                updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, llmSelector: v } }));
                                                if (!isHeader) clearReviewFlag(page, "setup.llmSelector");
                                              }}
                                              onChangeVisibility={(mode) => {
                                                updatePage(page, (prev) => ({
                                                  ...prev,
                                                  visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, llmSelector: mode } },
                                                }));
                                                if (!isHeader) clearReviewFlag(page, "setup.llmSelector");
                                              }}
                                            />
                                            <div className="border-l-2 border-slate-200 pl-3">
                                              <label className="block">
                                                <div className="mb-1 text-[11px] font-semibold text-slate-600">기본 LLM</div>
                                                <div data-review-key={!isHeader ? "setup.defaultLlm" : undefined} data-review-page={!isHeader ? page : undefined}>
                                                  <SelectPopover
                                                    value={draft.setup.defaultLlm}
                                                    disabled={isHeader}
                                                    options={DEFAULT_LLM_OPTIONS}
                                                    onChange={(value) => {
                                                      updatePage(page, (prev) => ({
                                                        ...prev,
                                                        setup: { ...prev.setup, defaultLlm: value as "chatgpt" | "gemini" },
                                                      }));
                                                      if (!isHeader) clearReviewFlag(page, "setup.defaultLlm");
                                                    }}
                                                    className="w-full"
                                                    buttonClassName={`h-9 text-xs${isReviewing("setup.defaultLlm") ? " border-amber-400 ring-1 ring-amber-200" : ""}${isActiveReview("setup.defaultLlm") ? " ring-4 ring-amber-500" : ""}`}
                                                  />
                                                </div>
                                              </label>
                                            </div>
                                          </>
                                        );
                                      }
                                      if (setupKey === "kbSelector") {
                                        return (
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
                                                  labels: { ...prev[page].labels, kbSelector: value },
                                                },
                                              }))
                                            }
                                            checked={draft.setup.kbSelector}
                                            visibility={draft.visibility.setup.kbSelector}
                                            needsReview={isReviewing("setup.kbSelector")}
                                            activeReview={isActiveReview("setup.kbSelector")}
                                            reviewKey={!isHeader ? "setup.kbSelector" : undefined}
                                            reviewPage={!isHeader ? page : undefined}
                                            onChange={(v) => {
                                              updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, kbSelector: v } }));
                                              if (!isHeader) clearReviewFlag(page, "setup.kbSelector");
                                            }}
                                            onChangeVisibility={(mode) => {
                                              updatePage(page, (prev) => ({
                                                ...prev,
                                                visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, kbSelector: mode } },
                                              }));
                                              if (!isHeader) clearReviewFlag(page, "setup.kbSelector");
                                            }}
                                          />
                                        );
                                      }
                                      if (setupKey === "adminKbSelector") {
                                        return (
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
                                                  labels: { ...prev[page].labels, adminKbSelector: value },
                                                },
                                              }))
                                            }
                                            checked={draft.setup.adminKbSelector}
                                            visibility={draft.visibility.setup.adminKbSelector}
                                            needsReview={isReviewing("setup.adminKbSelector")}
                                            activeReview={isActiveReview("setup.adminKbSelector")}
                                            reviewKey={!isHeader ? "setup.adminKbSelector" : undefined}
                                            reviewPage={!isHeader ? page : undefined}
                                            onChange={(v) => {
                                              updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, adminKbSelector: v } }));
                                              if (!isHeader) clearReviewFlag(page, "setup.adminKbSelector");
                                            }}
                                            onChangeVisibility={(mode) => {
                                              updatePage(page, (prev) => ({
                                                ...prev,
                                                visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, adminKbSelector: mode } },
                                              }));
                                              if (!isHeader) clearReviewFlag(page, "setup.adminKbSelector");
                                            }}
                                          />
                                        );
                                      }
                                      if (setupKey === "routeSelector") {
                                        return (
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
                                                  labels: { ...prev[page].labels, routeSelector: value },
                                                },
                                              }))
                                            }
                                            checked={draft.setup.routeSelector}
                                            visibility={draft.visibility.setup.routeSelector}
                                            needsReview={isReviewing("setup.routeSelector")}
                                            activeReview={isActiveReview("setup.routeSelector")}
                                            reviewKey={!isHeader ? "setup.routeSelector" : undefined}
                                            reviewPage={!isHeader ? page : undefined}
                                            onChange={(v) => {
                                              updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, routeSelector: v } }));
                                              if (!isHeader) clearReviewFlag(page, "setup.routeSelector");
                                            }}
                                            onChangeVisibility={(mode) => {
                                              updatePage(page, (prev) => ({
                                                ...prev,
                                                visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, routeSelector: mode } },
                                              }));
                                              if (!isHeader) clearReviewFlag(page, "setup.routeSelector");
                                            }}
                                          />
                                        );
                                      }
                                      if (setupKey === "mcpProviderSelector") {
                                        return (
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
                                                  labels: { ...prev[page].labels, mcpProviderSelector: value },
                                                },
                                              }))
                                            }
                                            checked={draft.mcp.providerSelector}
                                            visibility={draft.visibility.mcp.providerSelector}
                                            needsReview={isReviewing("mcp.providerSelector")}
                                            activeReview={isActiveReview("mcp.providerSelector")}
                                            reviewKey={!isHeader ? "mcp.providerSelector" : undefined}
                                            reviewPage={!isHeader ? page : undefined}
                                            onChange={(v) => {
                                              updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, providerSelector: v } }));
                                              if (!isHeader) clearReviewFlag(page, "mcp.providerSelector");
                                            }}
                                            onChangeVisibility={(mode) => {
                                              updatePage(page, (prev) => ({
                                                ...prev,
                                                visibility: {
                                                  ...prev.visibility,
                                                  mcp: { ...prev.visibility.mcp, providerSelector: mode },
                                                },
                                              }));
                                              if (!isHeader) clearReviewFlag(page, "mcp.providerSelector");
                                            }}
                                          />
                                        );
                                      }
                                      if (setupKey === "mcpActionSelector") {
                                        return (
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
                                                  labels: { ...prev[page].labels, mcpActionSelector: value },
                                                },
                                              }))
                                            }
                                            checked={draft.mcp.actionSelector}
                                            visibility={draft.visibility.mcp.actionSelector}
                                            needsReview={isReviewing("mcp.actionSelector")}
                                            activeReview={isActiveReview("mcp.actionSelector")}
                                            reviewKey={!isHeader ? "mcp.actionSelector" : undefined}
                                            reviewPage={!isHeader ? page : undefined}
                                            onChange={(v) => {
                                              updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, actionSelector: v } }));
                                              if (!isHeader) clearReviewFlag(page, "mcp.actionSelector");
                                            }}
                                            onChangeVisibility={(mode) => {
                                              updatePage(page, (prev) => ({
                                                ...prev,
                                                visibility: {
                                                  ...prev.visibility,
                                                  mcp: { ...prev.visibility.mcp, actionSelector: mode },
                                                },
                                              }));
                                              if (!isHeader) clearReviewFlag(page, "mcp.actionSelector");
                                            }}
                                          />
                                        );
                                      }
                                      return (
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
                                                labels: { ...prev[page].labels, inlineUserKbInput: value },
                                              },
                                            }))
                                          }
                                          checked={draft.setup.inlineUserKbInput}
                                          visibility={draft.visibility.setup.inlineUserKbInput}
                                          needsReview={isReviewing("setup.inlineUserKbInput")}
                                          activeReview={isActiveReview("setup.inlineUserKbInput")}
                                          reviewKey={!isHeader ? "setup.inlineUserKbInput" : undefined}
                                          reviewPage={!isHeader ? page : undefined}
                                          onChange={(v) => {
                                            updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, inlineUserKbInput: v } }));
                                            if (!isHeader) clearReviewFlag(page, "setup.inlineUserKbInput");
                                          }}
                                          onChangeVisibility={(mode) => {
                                            updatePage(page, (prev) => ({
                                              ...prev,
                                              visibility: {
                                                ...prev.visibility,
                                                setup: { ...prev.visibility.setup, inlineUserKbInput: mode },
                                              },
                                            }));
                                            if (!isHeader) clearReviewFlag(page, "setup.inlineUserKbInput");
                                          }}
                                        />
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
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                      <div className="text-[11px] font-semibold text-slate-700">Allow/Deny</div>
                      {renderAllowDenyBlock({
                        page,
                        isHeader,
                        key: "mcp.providers.allowDeny",
                        label: "MCP Providers",
                        value: draft.mcp.providers,
                        onChange: (next) => updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, providers: next } })),
                      })}
                      {renderAllowDenyBlock({
                        page,
                        isHeader,
                        key: "mcp.tools.allowDeny",
                        label: "MCP Tools",
                        value: draft.mcp.tools,
                        onChange: (next) => updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, tools: next } })),
                      })}
                      {renderAllowDenyBlock({
                        page,
                        isHeader,
                        key: "setup.llms.allowDeny",
                        label: "LLM IDs",
                        value: draft.setup.llms,
                        onChange: (next) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, llms: next } })),
                      })}
                      {renderAllowDenyBlock({
                        page,
                        isHeader,
                        key: "setup.kbIds.allowDeny",
                        label: "KB IDs",
                        value: draft.setup.kbIds,
                        onChange: (next) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, kbIds: next } })),
                      })}
                      {renderAllowDenyBlock({
                        page,
                        isHeader,
                        key: "setup.adminKbIds.allowDeny",
                        label: "Admin KB IDs",
                        value: draft.setup.adminKbIds,
                        onChange: (next) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, adminKbIds: next } })),
                      })}
                      {renderAllowDenyBlock({
                        page,
                        isHeader,
                        key: "setup.routes.allowDeny",
                        label: "Runtime Routes",
                        value: draft.setup.routes,
                        onChange: (next) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, routes: next } })),
                      })}
                    </div>
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}










