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

const BASE_PAGE_KEYS: ConversationPageKey[] = ["/", "/app/laboratory", "/embed"];
const SETTINGS_CARD_WIDTH_BY_PAGE: Record<ConversationPageKey, number> = {
  "/": 360,
  "/app/laboratory": 380,
  "/embed": 360,
};
function normalizePages(pages: ConversationPageKey[]) {
  return Array.from(new Set([...BASE_PAGE_KEYS, ...pages.filter(Boolean)])).sort((a, b) => a.localeCompare(b));
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

type Props = {
  authToken: string;
};

type GovernanceConfig = {
  enabled: boolean;
  visibility_mode: "user" | "admin";
  source: "principles_default" | "event_override";
  updated_at: string | null;
  updated_by: string | null;
};

type SettingFileItem = {
  key: string;
  label: string;
  files: string[];
  notes: string;
  usedByPages: ConversationPageKey[] | "common";
};

type DebugFieldExamplesPayload = {
  event_types?: string[];
  mcp_tools?: string[];
  sample_paths?: Record<string, unknown>;
  error?: string;
};

type BooleanMap = Record<string, boolean>;

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
      className={
        neutralStyle
          ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs"
          : checked
            ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 text-xs ring-1 ring-emerald-200"
            : "flex h-12 items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 text-xs ring-1 ring-rose-200"
      }
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
  expandable = false,
  expanded = false,
  onToggleExpanded,
  neutralStyle = false,
  hideToggle = false,
}: GroupToggleFieldProps) {
  const displayLabel = (label || "").trim() || "group.unknown";
  return (
    <div
      className={
        neutralStyle
          ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs"
          : checked
            ? "flex h-12 items-center justify-between gap-3 rounded-lg border border-emerald-500 bg-emerald-100 px-3 text-xs ring-1 ring-emerald-200"
            : "flex h-12 items-center justify-between gap-3 rounded-lg border border-rose-400 bg-rose-100 px-3 text-xs ring-1 ring-rose-200"
      }
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

const SETTING_FILE_GUIDE: SettingFileItem[] = [
  {
    key: "mcp.providerSelector",
    label: "MCP > Provider 선택",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "Provider 선택 UI 노출과 요청 payload 포함 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "mcp.actionSelector",
    label: "MCP > Action 선택",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "Action 선택 UI 노출과 요청 payload 포함 여부를 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "mcp.providers.allowDeny",
    label: "MCP > Provider Allowlist/Denylist",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
    ],
    notes: "페이지별 provider 허용/차단 필터를 적용합니다. 예: cafe24 차단.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "mcp.tools.allowDeny",
    label: "MCP > Tool Allowlist/Denylist",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
    ],
    notes: "페이지별 tool 허용/차단 필터를 적용합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "adminPanel",
    label: "Admin Panel (enabled/selection/logs/messageMeta)",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "관리자 메뉴 표시, 선택/로그 토글, 메시지 메타 노출을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "adminPanel.copy",
    label: "Admin Panel > 대화/문제 로그 복사",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/lib/transcriptCopyPolicy.ts",
      "src/lib/conversation/client/useConversationController.ts",
      "src/lib/conversation/client/useLaboratoryConversationActions.ts",
    ],
    notes: "복사 버튼 노출과 복사 허용 정책(실제 payload 생성)까지 함께 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "adminPanel.copy.debug",
    label: "Admin Panel > 대화 복사 디버그 항목",
    files: [
      "src/components/settings/ChatSettingsPanel.tsx",
      "src/lib/transcriptCopyPolicy.ts",
      "src/lib/conversation/client/useHeroPageController.ts",
      "src/lib/conversation/client/useLaboratoryPageController.ts",
    ],
    notes: "페이지별 대화 복사 시 포함할 디버그 항목(debugOptions)을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.quickReplies",
    label: "Interaction > Quick Replies",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "퀵리플라이 렌더/선택/확정 UI를 활성/비활성합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.productCards",
    label: "Interaction > Product Cards",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "카드 렌더/선택/확정 UI를 활성/비활성합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "interaction.inputSubmit",
    label: "Interaction > 입력/전송",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "입력창/전송 버튼 자체 노출을 제어합니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "setup",
    label: "Setup (model/llm/kb/adminKb/mode/route/inlineUserKb/defaults)",
    files: [
      "src/lib/conversation/pageFeaturePolicy.ts",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
      "src/components/design-system/conversation/ConversationUI.tsx",
    ],
    notes: "페이지별 설정 영역 구성요소(모델/LLM/저장KB/임시KB/AdminKB/모드/Route) 노출과 기본값을 제어하며, 임시KB 샘플 선택 UI에도 공통 반영됩니다.",
    usedByPages: ["/", "/app/laboratory"],
  },
  {
    key: "runtimeLoader",
    label: "런타임 반영 로더",
    files: [
      "src/lib/conversation/client/useConversationPageFeatures.ts",
      "src/app/api/auth-settings/providers/route.ts",
      "src/components/settings/ChatSettingsPanel.tsx",
    ],
    notes: "설정 페이지 저장값(chat_policy)을 읽어 각 페이지 정책에 병합합니다.",
    usedByPages: "common",
  },
];

export function ChatSettingsPanel({ authToken }: Props) {
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
      pages.reduce<Record<ConversationPageKey, ConversationSetupUi>>((acc, page) => {
        acc[page] = resolveConversationSetupUi(page, provider);
        return acc;
      }, {}),
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
    const nextSetupUi = discoveredPages.reduce<Record<ConversationPageKey, ConversationSetupUi>>((acc, page) => {
      acc[page] = resolveConversationSetupUi(page, providerValue);
      return acc;
    }, {});
    setRegisteredPages(discoveredPages);
    setDraftByPage(next);
    setDebugCopyDraftByPage(nextDebug);
    setSetupUiByPage(nextSetupUi);
    setSetupExistingDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
    setSetupNewDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
      setDebugHeaderDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
      setDebugTurnDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
      setDebugLogsDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
      setDebugEventDetailsOpenByPage(buildOpenStateByPage(discoveredPages));
      setDebugDetailTreeCollapsedByPage(
        discoveredPages.reduce<Record<ConversationPageKey, Record<string, boolean>>>((acc, page) => {
          acc[page] = {};
          return acc;
        }, {} as Record<ConversationPageKey, Record<string, boolean>>)
      );
    }, [buildOpenStateByPage]);

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

  const moveSetupField = useCallback(
    (page: ConversationPageKey, from: SetupFieldKey, to: SetupFieldKey) => {
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

        if (page === "/") {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            const source = next[key as ConversationPageKey];
            if (!source) return;
            next[key as ConversationPageKey] = applyOrder(source);
          });
          return next;
        }

        const source = prev[page];
        if (!source) return prev;
        return { ...prev, [page]: applyOrder(source) };
      });
    },
    []
  );

  const moveExistingSetupField = useCallback(
    (page: ConversationPageKey, from: ExistingSetupFieldKey, to: ExistingSetupFieldKey) => {
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

        if (page === "/") {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            const source = next[key as ConversationPageKey];
            if (!source) return;
            next[key as ConversationPageKey] = applyOrder(source);
          });
          return next;
        }

        const source = prev[page];
        if (!source) return prev;
        return { ...prev, [page]: applyOrder(source) };
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

  const columnKeys = useMemo<Array<"__header" | ConversationPageKey>>(
    () => ["__header", ...registeredPages],
    [registeredPages]
  );

  const handleResetToDefaults = () => {
    applyProviderToDraft(null);
    const pages = normalizePages(registeredPages);
    setDebugCopyDraftByPage(buildInitialDebugByPage(pages));
    setSetupUiByPage(buildInitialSetupUiByPage(pages, null));
    setSetupExistingDetailsOpenByPage(buildOpenStateByPage(pages));
    setSetupNewDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugHeaderDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugTurnDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugLogsDetailsOpenByPage(buildOpenStateByPage(pages));
    setDebugEventDetailsOpenByPage(buildOpenStateByPage(pages));
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
      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">대화 설정 관리</div>
        <div className="mt-2 text-sm text-slate-600">
          서비스 전역 대화 정책을 폼으로 수정합니다. 저장 시 <code>A_iam_auth_settings.providers.chat_policy</code> (org 최신 값)에
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

      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-full gap-4">
          {columnKeys.map((column) => {
            const isHeader = column === "__header";
            const page: ConversationPageKey = isHeader ? "/" : column;
            const pageLabel = page === "/embed" ? "위젯 (/embed)" : page;
            const draft = draftByPage[page];
            const setupUiDraft = setupUiByPage[page];
            const effectiveModelSelector = true;
            const setupDetailsOpen = true;
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
            return (
              <Card
                key={column}
                className={
                  isHeader
                    ? "shrink-0 p-4 [&_.state-controls]:hidden [&_.config-input]:pointer-events-none [&_.config-input]:opacity-70"
                    : "shrink-0 p-4"
                }
                style={{ width: `${isHeader ? SETTINGS_CARD_WIDTH_BY_PAGE["/"] : SETTINGS_CARD_WIDTH_BY_PAGE[page] || 380}px` }}
              >
                <div className="text-sm font-semibold text-slate-900">{isHeader ? "헤더" : pageLabel}</div>
                <div className="mt-1 text-xs text-slate-500">{isHeader ? "코드 정의명/펼침 제어" : "해당 페이지에서 실제 적용될 대화 기능 설정"}</div>

                <div className="mt-4 space-y-4">

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Admin Panel</div>
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.enabled" : "패널 활성화"}
                      checked={draft.adminPanel.enabled}
                      visibility={draft.visibility.adminPanel.enabled}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, enabled: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, enabled: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.selectionToggle" : "선택 토글"}
                      checked={draft.adminPanel.selectionToggle}
                      visibility={draft.visibility.adminPanel.selectionToggle}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, selectionToggle: v } }))
                      }
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            adminPanel: { ...prev.visibility.adminPanel, selectionToggle: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.logsToggle" : "로그 토글"}
                      checked={draft.adminPanel.logsToggle}
                      visibility={draft.visibility.adminPanel.logsToggle}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, logsToggle: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, logsToggle: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.messageSelection" : "메시지 선택"}
                      checked={draft.adminPanel.messageSelection}
                      visibility={draft.visibility.adminPanel.messageSelection}
                      onChange={(v) =>
                        updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, messageSelection: v } }))
                      }
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            adminPanel: { ...prev.visibility.adminPanel, messageSelection: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.messageMeta" : "메시지 메타"}
                      checked={draft.adminPanel.messageMeta}
                      visibility={draft.visibility.adminPanel.messageMeta}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, messageMeta: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, messageMeta: mode } },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.copyConversation" : "대화 복사"}
                      checked={draft.adminPanel.copyConversation}
                      visibility={draft.visibility.adminPanel.copyConversation}
                      onChange={(v) =>
                        updateAllPages((prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, copyConversation: v } }))
                      }
                      onChangeVisibility={(mode) =>
                        updateAllPages((prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            adminPanel: { ...prev.visibility.adminPanel, copyConversation: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "adminPanel.copyIssue" : "문제 로그 복사"}
                      checked={draft.adminPanel.copyIssue}
                      visibility={draft.visibility.adminPanel.copyIssue}
                      onChange={(v) => updateAllPages((prev) => ({ ...prev, adminPanel: { ...prev.adminPanel, copyIssue: v } }))}
                      onChangeVisibility={(mode) =>
                        updateAllPages((prev) => ({
                          ...prev,
                          visibility: { ...prev.visibility, adminPanel: { ...prev.visibility.adminPanel, copyIssue: mode } },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Debug Transcript (대화 복사)</div>
                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">출력 모드</div>
                      <SelectPopover
                        value={debugOutputMode}
                        disabled={isHeader}
                        options={DEBUG_OUTPUT_MODE_OPTIONS}
                        onChange={(value) =>
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
                        }
                        className="w-full"
                        buttonClassName="h-9 text-xs"
                      />
                    </label>

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
                                  value={toEventCsv(debugLogEvent?.allowlist)}
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

                    <label className="block">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">Audit 대상 BOT 범위</div>
                      <SelectPopover
                        value={debugCopyDraft.auditBotScope || "runtime_turns_only"}
                        disabled={isHeader}
                        options={AUDIT_BOT_SCOPE_OPTIONS}
                        onChange={(value) =>
                          updateDebugCopyOptions(page, (prev) => ({
                            ...prev,
                            auditBotScope:
                              value === "all_bot_messages" ? "all_bot_messages" : "runtime_turns_only",
                          }))
                        }
                        className="w-full"
                        buttonClassName="h-9 text-xs"
                      />
                    </label>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Interaction</div>
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "interaction.quickReplies" : "Quick Replies"}
                      checked={draft.interaction.quickReplies}
                      visibility={draft.visibility.interaction.quickReplies}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, quickReplies: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, quickReplies: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "interaction.productCards" : "Product Cards"}
                      checked={draft.interaction.productCards}
                      visibility={draft.visibility.interaction.productCards}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, productCards: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, productCards: mode },
                          },
                        }))
                      }
                    />
                    <ToggleField
                      neutralStyle={isHeader}
                      label={isHeader ? "interaction.inputSubmit" : "입력/전송"}
                      checked={draft.interaction.inputSubmit}
                      visibility={draft.visibility.interaction.inputSubmit}
                      onChange={(v) => updatePage(page, (prev) => ({ ...prev, interaction: { ...prev.interaction, inputSubmit: v } }))}
                      onChangeVisibility={(mode) =>
                        updatePage(page, (prev) => ({
                          ...prev,
                          visibility: {
                            ...prev.visibility,
                            interaction: { ...prev.visibility.interaction, inputSubmit: mode },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Setup</div>
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
                                                  onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, llmSelector: v } }))}
                                                  onChangeVisibility={(mode) =>
                                                    updatePage(page, (prev) => ({
                                                      ...prev,
                                                      visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, llmSelector: mode } },
                                                    }))
                                                  }
                                                />
                                                <div className="border-l-2 border-slate-200 pl-3">
                                                  <label className="block">
                                                    <div className="mb-1 text-[11px] font-semibold text-slate-600">기본 LLM</div>
                                                    <SelectPopover
                                                      value={draft.setup.defaultLlm}
                                                      disabled={isHeader}
                                                      options={DEFAULT_LLM_OPTIONS}
                                                      onChange={(value) =>
                                                        updatePage(page, (prev) => ({
                                                          ...prev,
                                                          setup: { ...prev.setup, defaultLlm: value as "chatgpt" | "gemini" },
                                                        }))
                                                      }
                                                      className="w-full"
                                                      buttonClassName="h-9 text-xs"
                                                    />
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
                                                onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, kbSelector: v } }))}
                                                onChangeVisibility={(mode) =>
                                                  updatePage(page, (prev) => ({
                                                    ...prev,
                                                    visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, kbSelector: mode } },
                                                  }))
                                                }
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
                                                onChange={(v) =>
                                                  updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, adminKbSelector: v } }))
                                                }
                                                onChangeVisibility={(mode) =>
                                                  updatePage(page, (prev) => ({
                                                    ...prev,
                                                    visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, adminKbSelector: mode } },
                                                  }))
                                                }
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
                                                onChange={(v) => updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, routeSelector: v } }))}
                                                onChangeVisibility={(mode) =>
                                                  updatePage(page, (prev) => ({
                                                    ...prev,
                                                    visibility: { ...prev.visibility, setup: { ...prev.visibility.setup, routeSelector: mode } },
                                                  }))
                                                }
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
                                                onChange={(v) =>
                                                  updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, providerSelector: v } }))
                                                }
                                                onChangeVisibility={(mode) =>
                                                  updatePage(page, (prev) => ({
                                                    ...prev,
                                                    visibility: {
                                                      ...prev.visibility,
                                                      mcp: { ...prev.visibility.mcp, providerSelector: mode },
                                                    },
                                                  }))
                                                }
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
                                                onChange={(v) =>
                                                  updatePage(page, (prev) => ({ ...prev, mcp: { ...prev.mcp, actionSelector: v } }))
                                                }
                                                onChangeVisibility={(mode) =>
                                                  updatePage(page, (prev) => ({
                                                    ...prev,
                                                    visibility: {
                                                      ...prev.visibility,
                                                      mcp: { ...prev.visibility.mcp, actionSelector: mode },
                                                    },
                                                  }))
                                                }
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
                                              onChange={(v) =>
                                                updatePage(page, (prev) => ({ ...prev, setup: { ...prev.setup, inlineUserKbInput: v } }))
                                              }
                                              onChangeVisibility={(mode) =>
                                                updatePage(page, (prev) => ({
                                                  ...prev,
                                                  visibility: {
                                                    ...prev.visibility,
                                                    setup: { ...prev.visibility.setup, inlineUserKbInput: mode },
                                                  },
                                                }))
                                              }
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
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">설정-파일 매핑 (공통 상세)</div>
        <div className="mt-1 text-xs text-slate-500">중앙화 구조 기준으로 공통 1회만 출력됩니다.</div>
        <div className="mt-3 space-y-2">
          {SETTING_FILE_GUIDE.map((item) => (
            <details key={`common-${item.key}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-slate-800">{item.label}</summary>
              <div className="mt-2 text-[11px] text-slate-600">{item.notes}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                사용 페이지:{" "}
                {item.usedByPages === "common" ? "공통" : item.usedByPages.join(", ")}
              </div>
              <div className="mt-2 space-y-1">
                {item.files.map((file, idx) => (
                  <div key={`common-${item.key}-${idx}-${file}`} className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">
                    {file}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}















