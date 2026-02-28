"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { Input } from "@/components/ui/Input";
import type { DebugTranscriptOptions } from "@/lib/debugTranscript";
import {
  WIDGET_PAGE_KEY,
  getDefaultConversationPageFeatures,
  mergeConversationPageFeatures,
  normalizeConversationFeatureProvider,
  normalizeWidgetChatPolicyConfig,
  resolveConversationSetupUi,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeatures,
  type ConversationPageKey,
  type FeatureVisibilityMode,
  type WidgetChatPolicyConfig,
} from "@/lib/conversation/pageFeaturePolicy";
import {
  PREFIX_JSON_SECTIONS_TREE,
  RENDER_PLAN_DETAIL_TREE,
  RESPONSE_SCHEMA_DETAIL_TREE,
  type DebugFieldTree,
} from "@/lib/debugTranscriptToggle";

export type ChatSettingsAgent = {
  id: string;
  name?: string | null;
  version?: string | null;
  is_active?: boolean | null;
};

type GovernanceConfig = {
  enabled: boolean;
  visibility_mode: "user" | "admin";
  source: "principles_default" | "event_override";
  updated_at: string | null;
  updated_by: string | null;
};

type ChatSettingsPanelProps = {
  authToken?: string;
  value?: ConversationFeaturesProviderShape | null;
  onChange?: (next: ConversationFeaturesProviderShape) => void;
  pageScope?: ConversationPageKey[];
  pageLabelOverride?: string;
  showHeader?: boolean;
  showRegistryPanel?: boolean;
  includeHeaderColumn?: boolean;
  agents?: ChatSettingsAgent[];
};

type DraftState = {
  widget: WidgetChatPolicyConfig;
  features: ConversationPageFeatures;
  debug: DebugTranscriptOptions;
  setupUi: ReturnType<typeof resolveConversationSetupUi>;
};

type BooleanMap = Record<string, boolean>;

type FieldTone = "neutral" | "enabled" | "disabled";

type RowProps = {
  label: string;
  tone?: FieldTone;
  editableLabel?: boolean;
  onLabelChange?: (value: string) => void;
  right?: ReactNode;
  alignTop?: boolean;
};

const ENTRY_MODE_OPTIONS: SelectOption[] = [
  { id: "launcher", label: "launcher" },
  { id: "embed", label: "embed" },
];

const EMBED_VIEW_OPTIONS: SelectOption[] = [
  { id: "chat", label: "chat" },
  { id: "setup", label: "setup" },
  { id: "both", label: "both" },
  { id: "list", label: "list (legacy)" },
];

const POSITION_OPTIONS: SelectOption[] = [
  { id: "bottom-left", label: "bottom-left" },
  { id: "bottom-right", label: "bottom-right" },
];

const OUTPUT_MODE_OPTIONS: SelectOption[] = [
  { id: "full", label: "full" },
  { id: "summary", label: "summary" },
  { id: "used_only", label: "used_only" },
];

const AUDIT_SCOPE_OPTIONS: SelectOption[] = [
  { id: "runtime_turns_only", label: "runtime_turns_only" },
  { id: "all_bot_messages", label: "all_bot_messages" },
];

const DEFAULT_SETUP_MODE_OPTIONS: SelectOption[] = [
  { id: "existing", label: "existing" },
  { id: "new", label: "new" },
];

const DEFAULT_LLM_OPTIONS: SelectOption[] = [
  { id: "chatgpt", label: "chatgpt" },
  { id: "gemini", label: "gemini" },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function ChatSettingsPanel({
  authToken,
  value,
  onChange,
  pageScope,
  pageLabelOverride,
  agents,
}: ChatSettingsPanelProps) {
  const pageKey = pageScope?.[0] || WIDGET_PAGE_KEY;
  const providerValue = useMemo(
    () => normalizeConversationFeatureProvider(value ?? null) ?? null,
    [value]
  );

  const buildDraft = useCallback(
    (provider: ConversationFeaturesProviderShape | null): DraftState => {
      const features = mergeConversationPageFeatures(
        getDefaultConversationPageFeatures(pageKey),
        provider?.features || provider?.pages?.[pageKey]
      );
      const widget = normalizeWidgetChatPolicyConfig(provider?.widget ?? null);
      const debug = provider?.debug ?? {};
      const setupUi = resolveConversationSetupUi(pageKey, provider || null);
      return { widget, features, debug, setupUi };
    },
    [pageKey]
  );

  const [draft, setDraft] = useState<DraftState>(() => buildDraft(providerValue));
  const providerRef = useRef<ConversationFeaturesProviderShape | null>(providerValue);

  useEffect(() => {
    providerRef.current = providerValue;
    setDraft(buildDraft(providerValue));
  }, [buildDraft, providerValue]);

  const commitDraft = useCallback(
    (nextDraft: DraftState) => {
      const base = providerRef.current || {};
      const nextProvider: ConversationFeaturesProviderShape = {
        ...base,
        widget: nextDraft.widget,
        features: nextDraft.features,
        debug: nextDraft.debug,
        setup_ui: {
          order: nextDraft.setupUi.order,
          labels: nextDraft.setupUi.labels,
          existing_order: nextDraft.setupUi.existingOrder,
          existing_labels: nextDraft.setupUi.existingLabels,
        },
      };
      const normalized = normalizeConversationFeatureProvider(nextProvider) || {};
      onChange?.(normalized);
    },
    [onChange]
  );

  const updateDraft = useCallback(
    (updater: (current: DraftState) => DraftState) => {
      setDraft((current) => {
        const next = updater(current);
        commitDraft(next);
        return next;
      });
    },
    [commitDraft]
  );

  const [governanceConfig, setGovernanceConfig] = useState<GovernanceConfig | null>(null);
  const [governanceSaving, setGovernanceSaving] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const headers: Record<string, string> = {};
        if (authToken) headers.Authorization = `Bearer ${authToken}`;
        const res = await fetch("/api/runtime/governance/config", { headers, cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => null)) as { config?: GovernanceConfig } | null;
        if (!payload?.config || !active) return;
        setGovernanceConfig(payload.config);
      } catch {
        // optional
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [authToken]);

  const handleGovernanceChange = useCallback(
    async (next: { enabled: boolean; visibility_mode: "user" | "admin" }) => {
      setGovernanceSaving(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) headers.Authorization = `Bearer ${authToken}`;
        const res = await fetch("/api/runtime/governance/config", {
          method: "POST",
          headers,
          body: JSON.stringify(next),
        });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => null)) as { config?: GovernanceConfig } | null;
        if (payload?.config) setGovernanceConfig(payload.config);
      } finally {
        setGovernanceSaving(false);
      }
    },
    [authToken]
  );

  const agentOptions = useMemo<SelectOption[]>(
    () =>
      (agents || []).map((agent) => ({
        id: agent.id,
        label: `${agent.name || agent.id}${agent.is_active ? "" : " (inactive)"}`,
        description: agent.version ? `v${agent.version}` : undefined,
      })),
    [agents]
  );

  const widget = draft.widget;
  const features = draft.features;
  const visibility = draft.features.visibility;
  const debug = draft.debug;
  const setupUi = draft.setupUi;

  const updateWidget = (path: string[], value: unknown) =>
    updateDraft((current) => ({ ...current, widget: setIn(current.widget as any, path, value) }));
  const updateFeatures = (path: string[], value: unknown) =>
    updateDraft((current) => ({ ...current, features: setIn(current.features as any, path, value) }));
  const updateVisibility = (path: string[], value: FeatureVisibilityMode) =>
    updateDraft((current) => ({
      ...current,
      features: setIn(current.features as any, ["visibility", ...path], value),
    }));
  const updateDebug = (path: string[], value: unknown) =>
    updateDraft((current) => ({ ...current, debug: setIn(current.debug as any, path, value) }));
  const updateSetupUi = (path: string[], value: unknown) =>
    updateDraft((current) => ({ ...current, setupUi: setIn(current.setupUi as any, path, value) }));

  const pageLabel = pageLabelOverride || pageKey;

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold text-slate-700">Widget Policy: {pageLabel}</div>

      <Section title="런처">
        <ToggleRow
          label="widget.is_active"
          checked={widget.is_active !== false}
          onToggle={(next) => updateWidget(["is_active"], next)}
        />
        <Row
          label="widget.entry_mode"
          right={
            <SelectPopover
              value={widget.entry_mode || "launcher"}
              options={ENTRY_MODE_OPTIONS}
              onChange={(value) => updateWidget(["entry_mode"], value)}
              buttonClassName="h-7 text-[11px]"
              className="w-[140px]"
            />
          }
        />
        <Row
          label="widget.embed_view"
          right={
            <SelectPopover
              value={widget.embed_view || "both"}
              options={EMBED_VIEW_OPTIONS}
              onChange={(value) => updateWidget(["embed_view"], value)}
              buttonClassName="h-7 text-[11px]"
              className="w-[140px]"
            />
          }
        />
        <Row
          label="widget.name"
          right={
            <Input
              value={widget.name || ""}
              onChange={(event) => updateWidget(["name"], event.target.value)}
              className="h-7 w-[200px] text-[11px]"
            />
          }
        />
        {agentOptions.length > 0 ? (
          <Row
            label="widget.agent_id"
            right={
              <SelectPopover
                value={widget.agent_id || ""}
                options={agentOptions}
                onChange={(value) => updateWidget(["agent_id"], value)}
                buttonClassName="h-7 text-[11px]"
                className="w-[200px]"
              />
            }
          />
        ) : (
          <Row
            label="widget.agent_id"
            right={
              <Input
                value={widget.agent_id || ""}
                onChange={(event) => updateWidget(["agent_id"], event.target.value)}
                className="h-7 w-[200px] text-[11px]"
              />
            }
          />
        )}
        <Row
          label="theme.launcher_logo_id"
          right={
            <Input
              value={widget.theme?.launcher_logo_id || ""}
              onChange={(event) => updateWidget(["theme", "launcher_logo_id"], event.target.value)}
              className="h-7 w-[200px] text-[11px]"
            />
          }
        />
        <Row
          label="theme.primary_color | launcher_bg"
          right={
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={widget.theme?.primary_color || "#4f46e5"}
                onChange={(event) => updateWidget(["theme", "primary_color"], event.target.value)}
                className="h-7 w-9 cursor-pointer rounded border border-slate-200"
              />
              <Input
                value={widget.theme?.primary_color || ""}
                onChange={(event) => updateWidget(["theme", "primary_color"], event.target.value)}
                className="h-7 w-[120px] text-[11px]"
                placeholder="#4f46e5"
              />
              <Input
                value={widget.theme?.launcher_bg || ""}
                onChange={(event) => updateWidget(["theme", "launcher_bg"], event.target.value)}
                className="h-7 w-[120px] text-[11px]"
                placeholder="#0f172a"
              />
            </div>
          }
        />
        <Row
          label="cfg.launcherLabel"
          right={
            <Input
              value={widget.cfg?.launcherLabel || ""}
              onChange={(event) => updateWidget(["cfg", "launcherLabel"], event.target.value)}
              className="h-7 w-[200px] text-[11px]"
            />
          }
        />
        <Row
          label="cfg.position"
          right={
            <SelectPopover
              value={widget.cfg?.position || "bottom-right"}
              options={POSITION_OPTIONS}
              onChange={(value) => updateWidget(["cfg", "position"], value)}
              buttonClassName="h-7 text-[11px]"
              className="w-[150px]"
            />
          }
        />
        <Row
          label="launcher.container.bottom"
          right={
            <Input
              value={widget.launcher?.container?.bottom || ""}
              onChange={(event) => updateWidget(["launcher", "container", "bottom"], event.target.value)}
              className="h-7 w-[120px] text-[11px]"
              placeholder="16px"
            />
          }
        />
        <Row
          label="launcher.container.left"
          right={
            <Input
              value={widget.launcher?.container?.left || ""}
              onChange={(event) => updateWidget(["launcher", "container", "left"], event.target.value)}
              className="h-7 w-[120px] text-[11px]"
              placeholder="auto"
            />
          }
        />
        <Row
          label="launcher.container.right"
          right={
            <Input
              value={widget.launcher?.container?.right || ""}
              onChange={(event) => updateWidget(["launcher", "container", "right"], event.target.value)}
              className="h-7 w-[120px] text-[11px]"
              placeholder="16px"
            />
          }
        />
        <Row
          label="launcher.container.gap"
          right={
            <Input
              value={widget.launcher?.container?.gap || ""}
              onChange={(event) => updateWidget(["launcher", "container", "gap"], event.target.value)}
              className="h-7 w-[120px] text-[11px]"
              placeholder="12px"
            />
          }
        />
        <Row
          label="launcher.container.zIndex"
          right={
            <Input
              value={widget.launcher?.container?.zIndex?.toString() || ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              updateWidget(["launcher", "container", "zIndex"], raw ? Number(raw) : undefined);
            }}
              className="h-7 w-[120px] text-[11px]"
              placeholder="999"
            />
          }
        />
        <Row
          label="launcher.size"
          right={
            <Input
              value={widget.launcher?.size?.toString() || ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              updateWidget(["launcher", "size"], raw ? Number(raw) : undefined);
            }}
              className="h-7 w-[120px] text-[11px]"
              placeholder="56"
            />
          }
        />
      </Section>

      <Section title="위젯 헤더">
        <ToggleRow
          label="widget.header.enabled"
          checked={features.widget.header.enabled}
          visibility={visibility.widget.header.enabled}
          onToggle={(next) => updateFeatures(["widget", "header", "enabled"], next)}
          onVisibilityChange={(mode) => updateVisibility(["widget", "header", "enabled"], mode)}
        />
        <DetailBlock>
          <ToggleRow
            label="widget.header.logo"
            checked={features.widget.header.logo}
            visibility={visibility.widget.header.logo}
            onToggle={(next) => updateFeatures(["widget", "header", "logo"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "header", "logo"], mode)}
          />
          <ToggleRow
            label="widget.header.status"
            checked={features.widget.header.status}
            visibility={visibility.widget.header.status}
            onToggle={(next) => updateFeatures(["widget", "header", "status"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "header", "status"], mode)}
          />
          <ToggleRow
            label="widget.header.agentAction"
            checked={features.widget.header.agentAction}
            visibility={visibility.widget.header.agentAction}
            onToggle={(next) => updateFeatures(["widget", "header", "agentAction"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "header", "agentAction"], mode)}
          />
          <ToggleRow
            label="widget.header.newConversation"
            checked={features.widget.header.newConversation}
            visibility={visibility.widget.header.newConversation}
            onToggle={(next) => updateFeatures(["widget", "header", "newConversation"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "header", "newConversation"], mode)}
          />
          <ToggleRow
            label="widget.header.close"
            checked={features.widget.header.close}
            visibility={visibility.widget.header.close}
            onToggle={(next) => updateFeatures(["widget", "header", "close"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "header", "close"], mode)}
          />
        </DetailBlock>
        <ToggleRow
          label="interaction.widgetHeaderAgentAction"
          checked={features.interaction.widgetHeaderAgentAction}
          visibility={visibility.interaction.widgetHeaderAgentAction}
          onToggle={(next) => updateFeatures(["interaction", "widgetHeaderAgentAction"], next)}
          onVisibilityChange={(mode) => updateVisibility(["interaction", "widgetHeaderAgentAction"], mode)}
        />
        <ToggleRow
          label="interaction.widgetHeaderNewConversation"
          checked={features.interaction.widgetHeaderNewConversation}
          visibility={visibility.interaction.widgetHeaderNewConversation}
          onToggle={(next) => updateFeatures(["interaction", "widgetHeaderNewConversation"], next)}
          onVisibilityChange={(mode) => updateVisibility(["interaction", "widgetHeaderNewConversation"], mode)}
        />
        <ToggleRow
          label="interaction.widgetHeaderClose"
          checked={features.interaction.widgetHeaderClose}
          visibility={visibility.interaction.widgetHeaderClose}
          onToggle={(next) => updateFeatures(["interaction", "widgetHeaderClose"], next)}
          onVisibilityChange={(mode) => updateVisibility(["interaction", "widgetHeaderClose"], mode)}
        />
      </Section>

      <Section title="위젯 대화">
        <ToggleRow
          label="widget.chatPanel"
          checked={features.widget.chatPanel}
          visibility={visibility.widget.chatPanel}
          onToggle={(next) => updateFeatures(["widget", "chatPanel"], next)}
          onVisibilityChange={(mode) => updateVisibility(["widget", "chatPanel"], mode)}
        />
        <ToggleRow
          label="widget.historyPanel"
          checked={features.widget.historyPanel}
          visibility={visibility.widget.historyPanel}
          onToggle={(next) => updateFeatures(["widget", "historyPanel"], next)}
          onVisibilityChange={(mode) => updateVisibility(["widget", "historyPanel"], mode)}
        />

        <DetailBlock>
          <div className="text-[11px] font-semibold text-slate-600">대화 기본값</div>
          <Row
            label="theme.greeting"
            right={
              <Input
                value={widget.theme?.greeting || ""}
                onChange={(event) => updateWidget(["theme", "greeting"], event.target.value)}
                className="h-7 w-[260px] text-[11px]"
              />
            }
          />
          <Row
            label="theme.input_placeholder"
            right={
              <Input
                value={widget.theme?.input_placeholder || ""}
                onChange={(event) => updateWidget(["theme", "input_placeholder"], event.target.value)}
                className="h-7 w-[260px] text-[11px]"
              />
            }
          />

          <div className="text-[11px] font-semibold text-slate-600">위젯 프레임/사이즈</div>
          <Row
            label="iframe.width"
            right={
              <Input
                value={widget.iframe?.width || ""}
                onChange={(event) => updateWidget(["iframe", "width"], event.target.value)}
                className="h-7 w-[120px] text-[11px]"
                placeholder="360px"
              />
            }
          />
          <Row
            label="iframe.height"
            right={
              <Input
                value={widget.iframe?.height || ""}
                onChange={(event) => updateWidget(["iframe", "height"], event.target.value)}
                className="h-7 w-[120px] text-[11px]"
                placeholder="560px"
              />
            }
          />
          <Row
            label="iframe.bottomOffset"
            right={
              <Input
                value={widget.iframe?.bottomOffset || ""}
                onChange={(event) => updateWidget(["iframe", "bottomOffset"], event.target.value)}
                className="h-7 w-[120px] text-[11px]"
              />
            }
          />
          <Row
            label="iframe.sideOffset"
            right={
              <Input
                value={widget.iframe?.sideOffset || ""}
                onChange={(event) => updateWidget(["iframe", "sideOffset"], event.target.value)}
                className="h-7 w-[120px] text-[11px]"
              />
            }
          />
          <Row
            label="iframe.borderRadius"
            right={
              <Input
                value={widget.iframe?.borderRadius || ""}
                onChange={(event) => updateWidget(["iframe", "borderRadius"], event.target.value)}
                className="h-7 w-[120px] text-[11px]"
              />
            }
          />
          <Row
            label="iframe.boxShadow"
            right={
              <Input
                value={widget.iframe?.boxShadow || ""}
                onChange={(event) => updateWidget(["iframe", "boxShadow"], event.target.value)}
                className="h-7 w-[200px] text-[11px]"
              />
            }
          />
          <Row
            label="iframe.background"
            right={
              <Input
                value={widget.iframe?.background || ""}
                onChange={(event) => updateWidget(["iframe", "background"], event.target.value)}
                className="h-7 w-[200px] text-[11px]"
              />
            }
          />
          <Row
            label="iframe.layout"
            right={
              <SelectPopover
                value={widget.iframe?.layout || "fixed"}
                options={[
                  { id: "fixed", label: "fixed" },
                  { id: "absolute", label: "absolute" },
                  { id: "static", label: "static" },
                ]}
                onChange={(value) => updateWidget(["iframe", "layout"], value)}
                buttonClassName="h-7 text-[11px]"
                className="w-[120px]"
              />
            }
          />

          <div className="text-[11px] font-semibold text-slate-600">Admin Panel</div>
          <ToggleRow
            label="adminPanel.enabled"
            checked={features.adminPanel.enabled}
            visibility={visibility.adminPanel.enabled}
            onToggle={(next) => updateFeatures(["adminPanel", "enabled"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "enabled"], mode)}
          />
          <ToggleRow
            label="adminPanel.selectionToggle"
            checked={features.adminPanel.selectionToggle}
            visibility={visibility.adminPanel.selectionToggle}
            onToggle={(next) => updateFeatures(["adminPanel", "selectionToggle"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "selectionToggle"], mode)}
          />
          <ToggleRow
            label="adminPanel.logsToggle"
            checked={features.adminPanel.logsToggle}
            visibility={visibility.adminPanel.logsToggle}
            onToggle={(next) => updateFeatures(["adminPanel", "logsToggle"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "logsToggle"], mode)}
          />
          <ToggleRow
            label="adminPanel.messageSelection"
            checked={features.adminPanel.messageSelection}
            visibility={visibility.adminPanel.messageSelection}
            onToggle={(next) => updateFeatures(["adminPanel", "messageSelection"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "messageSelection"], mode)}
          />
          <ToggleRow
            label="adminPanel.messageMeta"
            checked={features.adminPanel.messageMeta}
            visibility={visibility.adminPanel.messageMeta}
            onToggle={(next) => updateFeatures(["adminPanel", "messageMeta"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "messageMeta"], mode)}
          />
          <ToggleRow
            label="adminPanel.copyConversation"
            checked={features.adminPanel.copyConversation}
            visibility={visibility.adminPanel.copyConversation}
            onToggle={(next) => updateFeatures(["adminPanel", "copyConversation"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "copyConversation"], mode)}
          />
          <ToggleRow
            label="adminPanel.copyIssue"
            checked={features.adminPanel.copyIssue}
            visibility={visibility.adminPanel.copyIssue}
            onToggle={(next) => updateFeatures(["adminPanel", "copyIssue"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "copyIssue"], mode)}
          />

          <div className="text-[11px] font-semibold text-slate-600">Debug Transcript</div>
          <Row
            label="debug.outputMode"
            right={
              <SelectPopover
                value={debug.outputMode || "full"}
                options={OUTPUT_MODE_OPTIONS}
                onChange={(value) => updateDebug(["outputMode"], value)}
                buttonClassName="h-7 text-[11px]"
                className="w-[160px]"
              />
            }
          />
          <ToggleRow
            label="debug.sections.header"
            checked={getIn(debug, ["sections", "header", "enabled"], true) !== false}
            onToggle={(next) => updateDebug(["sections", "header", "enabled"], next)}
          />
          <DetailBlock>
            <ToggleRow
              label="header.principle"
              checked={getIn(debug, ["sections", "header", "principle"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "header", "principle"], next)}
            />
            <ToggleRow
              label="header.expectedLists"
              checked={getIn(debug, ["sections", "header", "expectedLists"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "header", "expectedLists"], next)}
            />
            <ToggleRow
              label="header.runtimeModules"
              checked={getIn(debug, ["sections", "header", "runtimeModules"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "header", "runtimeModules"], next)}
            />
            <ToggleRow
              label="header.auditStatus"
              checked={getIn(debug, ["sections", "header", "auditStatus"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "header", "auditStatus"], next)}
            />
          </DetailBlock>
          <ToggleRow
            label="debug.sections.turn"
            checked={getIn(debug, ["sections", "turn", "enabled"], true) !== false}
            onToggle={(next) => updateDebug(["sections", "turn", "enabled"], next)}
          />
          <DetailBlock>
            <ToggleRow
              label="turn.turnId"
              checked={getIn(debug, ["sections", "turn", "turnId"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "turnId"], next)}
            />
            <ToggleRow
              label="turn.tokenUsed"
              checked={getIn(debug, ["sections", "turn", "tokenUsed"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "tokenUsed"], next)}
            />
            <ToggleRow
              label="turn.tokenUnused"
              checked={getIn(debug, ["sections", "turn", "tokenUnused"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "tokenUnused"], next)}
            />
            <ToggleRow
              label="turn.responseSchemaSummary"
              checked={getIn(debug, ["sections", "turn", "responseSchemaSummary"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "responseSchemaSummary"], next)}
            />
            <ToggleRow
              label="turn.responseSchemaDetail"
              checked={getIn(debug, ["sections", "turn", "responseSchemaDetail"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "responseSchemaDetail"], next)}
            />
            <DetailBlock>
              {renderDebugTree(
                RESPONSE_SCHEMA_DETAIL_TREE,
                (getIn(debug, ["sections", "turn", "responseSchemaDetailFields"], {}) || {}) as BooleanMap,
                (key, next) =>
                  updateDebug(
                    ["sections", "turn", "responseSchemaDetailFields"],
                    setBooleanMap(
                      (getIn(debug, ["sections", "turn", "responseSchemaDetailFields"], {}) || {}) as BooleanMap,
                      key,
                      next
                    )
                  )
              )}
            </DetailBlock>
            <ToggleRow
              label="turn.renderPlanSummary"
              checked={getIn(debug, ["sections", "turn", "renderPlanSummary"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "renderPlanSummary"], next)}
            />
            <ToggleRow
              label="turn.renderPlanDetail"
              checked={getIn(debug, ["sections", "turn", "renderPlanDetail"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "renderPlanDetail"], next)}
            />
            <DetailBlock>
              {renderDebugTree(
                RENDER_PLAN_DETAIL_TREE,
                (getIn(debug, ["sections", "turn", "renderPlanDetailFields"], {}) || {}) as BooleanMap,
                (key, next) =>
                  updateDebug(
                    ["sections", "turn", "renderPlanDetailFields"],
                    setBooleanMap(
                      (getIn(debug, ["sections", "turn", "renderPlanDetailFields"], {}) || {}) as BooleanMap,
                      key,
                      next
                    )
                  )
              )}
            </DetailBlock>
            <ToggleRow
              label="turn.quickReplyRule"
              checked={getIn(debug, ["sections", "turn", "quickReplyRule"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "turn", "quickReplyRule"], next)}
            />
          </DetailBlock>
          <ToggleRow
            label="debug.sections.logs"
            checked={getIn(debug, ["sections", "logs", "enabled"], true) !== false}
            onToggle={(next) => updateDebug(["sections", "logs", "enabled"], next)}
          />
          <DetailBlock>
            <ToggleRow
              label="logs.issueSummary"
              checked={getIn(debug, ["sections", "logs", "issueSummary"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "logs", "issueSummary"], next)}
            />
            <ToggleRow
              label="logs.debug.enabled"
              checked={getIn(debug, ["sections", "logs", "debug", "enabled"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "logs", "debug", "enabled"], next)}
            />
            <ToggleRow
              label="logs.debug.prefixJson"
              checked={getIn(debug, ["sections", "logs", "debug", "prefixJson"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "logs", "debug", "prefixJson"], next)}
            />
            <DetailBlock>
              {renderDebugTree(
                PREFIX_JSON_SECTIONS_TREE,
                (getIn(debug, ["sections", "logs", "debug", "prefixJsonSections"], {}) || {}) as BooleanMap,
                (key, next) =>
                  updateDebug(
                    ["sections", "logs", "debug", "prefixJsonSections"],
                    setBooleanMap(
                      (getIn(debug, ["sections", "logs", "debug", "prefixJsonSections"], {}) || {}) as BooleanMap,
                      key,
                      next
                    )
                  )
              )}
            </DetailBlock>
            <ToggleRow
              label="logs.mcp.enabled"
              checked={getIn(debug, ["sections", "logs", "mcp", "enabled"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "logs", "mcp", "enabled"], next)}
            />
            <DetailBlock>
              <ToggleRow
                label="logs.mcp.request"
                checked={getIn(debug, ["sections", "logs", "mcp", "request"], true) !== false}
                onToggle={(next) => updateDebug(["sections", "logs", "mcp", "request"], next)}
              />
              <ToggleRow
                label="logs.mcp.response"
                checked={getIn(debug, ["sections", "logs", "mcp", "response"], true) !== false}
                onToggle={(next) => updateDebug(["sections", "logs", "mcp", "response"], next)}
              />
              <ToggleRow
                label="logs.mcp.includeSuccess"
                checked={getIn(debug, ["sections", "logs", "mcp", "includeSuccess"], true) !== false}
                onToggle={(next) => updateDebug(["sections", "logs", "mcp", "includeSuccess"], next)}
              />
              <ToggleRow
                label="logs.mcp.includeError"
                checked={getIn(debug, ["sections", "logs", "mcp", "includeError"], true) !== false}
                onToggle={(next) => updateDebug(["sections", "logs", "mcp", "includeError"], next)}
              />
            </DetailBlock>
            <ToggleRow
              label="logs.event.enabled"
              checked={getIn(debug, ["sections", "logs", "event", "enabled"], true) !== false}
              onToggle={(next) => updateDebug(["sections", "logs", "event", "enabled"], next)}
            />
            <DetailBlock>
              <ToggleRow
                label="logs.event.payload"
                checked={getIn(debug, ["sections", "logs", "event", "payload"], true) !== false}
                onToggle={(next) => updateDebug(["sections", "logs", "event", "payload"], next)}
              />
              <Row
                label="logs.event.allowlist"
                alignTop
                right={
                  <textarea
                    value={formatCsv(getIn(debug, ["sections", "logs", "event", "allowlist"], []) as string[])}
                    onChange={(event) =>
                      updateDebug(["sections", "logs", "event", "allowlist"], parseCsv(event.target.value))
                    }
                    className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  />
                }
              />
            </DetailBlock>
          </DetailBlock>
          <Row
            label="debug.auditBotScope"
            right={
              <SelectPopover
                value={debug.auditBotScope || "runtime_turns_only"}
                options={AUDIT_SCOPE_OPTIONS}
                onChange={(value) => updateDebug(["auditBotScope"], value)}
                buttonClassName="h-7 text-[11px]"
                className="w-[180px]"
              />
            }
          />

          <div className="text-[11px] font-semibold text-slate-600">Interaction</div>
          <ToggleRow
            label="interaction.quickReplies"
            checked={features.interaction.quickReplies}
            visibility={visibility.interaction.quickReplies}
            onToggle={(next) => updateFeatures(["interaction", "quickReplies"], next)}
            onVisibilityChange={(mode) => updateVisibility(["interaction", "quickReplies"], mode)}
          />
          <ToggleRow
            label="interaction.productCards"
            checked={features.interaction.productCards}
            visibility={visibility.interaction.productCards}
            onToggle={(next) => updateFeatures(["interaction", "productCards"], next)}
            onVisibilityChange={(mode) => updateVisibility(["interaction", "productCards"], mode)}
          />
          <ToggleRow
            label="interaction.prefill"
            checked={features.interaction.prefill}
            visibility={visibility.interaction.prefill}
            onToggle={(next) => updateFeatures(["interaction", "prefill"], next)}
            onVisibilityChange={(mode) => updateVisibility(["interaction", "prefill"], mode)}
          />
          <Row
            label="interaction.prefillMessages"
            alignTop
            right={
              <textarea
                value={formatLines(features.interaction.prefillMessages)}
                onChange={(event) =>
                  updateFeatures(["interaction", "prefillMessages"], parseLines(event.target.value))
                }
                className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />
          <Row
            label="interaction.inputPlaceholder"
            right={
              <Input
                value={features.interaction.inputPlaceholder || ""}
                onChange={(event) => updateFeatures(["interaction", "inputPlaceholder"], event.target.value)}
                className="h-7 w-[260px] text-[11px]"
              />
            }
          />
          <ToggleRow
            label="interaction.inputSubmit"
            checked={features.interaction.inputSubmit}
            visibility={visibility.interaction.inputSubmit}
            onToggle={(next) => updateFeatures(["interaction", "inputSubmit"], next)}
            onVisibilityChange={(mode) => updateVisibility(["interaction", "inputSubmit"], mode)}
          />
          <ToggleRow
            label="interaction.threePhasePrompt"
            checked={features.interaction.threePhasePrompt}
            visibility={visibility.interaction.threePhasePrompt}
            onToggle={(next) => updateFeatures(["interaction", "threePhasePrompt"], next)}
            onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePrompt"], mode)}
          />
          <DetailBlock>
            <ToggleRow
              label="interaction.threePhasePromptShowConfirmed"
              checked={features.interaction.threePhasePromptShowConfirmed}
              visibility={visibility.interaction.threePhasePromptShowConfirmed}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptShowConfirmed"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptShowConfirmed"], mode)}
            />
            <ToggleRow
              label="interaction.threePhasePromptShowConfirming"
              checked={features.interaction.threePhasePromptShowConfirming}
              visibility={visibility.interaction.threePhasePromptShowConfirming}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptShowConfirming"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptShowConfirming"], mode)}
            />
            <ToggleRow
              label="interaction.threePhasePromptShowNext"
              checked={features.interaction.threePhasePromptShowNext}
              visibility={visibility.interaction.threePhasePromptShowNext}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptShowNext"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptShowNext"], mode)}
            />
            <ToggleRow
              label="interaction.threePhasePromptHideLabels"
              checked={features.interaction.threePhasePromptHideLabels}
              visibility={visibility.interaction.threePhasePromptHideLabels}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptHideLabels"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptHideLabels"], mode)}
            />
            <Row
              label="interaction.threePhasePromptLabels.confirmed"
              right={
                <Input
                  value={features.interaction.threePhasePromptLabels.confirmed || ""}
                  onChange={(event) =>
                    updateFeatures(["interaction", "threePhasePromptLabels", "confirmed"], event.target.value)
                  }
                  className="h-7 w-[200px] text-[11px]"
                />
              }
            />
            <Row
              label="interaction.threePhasePromptLabels.confirming"
              right={
                <Input
                  value={features.interaction.threePhasePromptLabels.confirming || ""}
                  onChange={(event) =>
                    updateFeatures(["interaction", "threePhasePromptLabels", "confirming"], event.target.value)
                  }
                  className="h-7 w-[200px] text-[11px]"
                />
              }
            />
            <Row
              label="interaction.threePhasePromptLabels.next"
              right={
                <Input
                  value={features.interaction.threePhasePromptLabels.next || ""}
                  onChange={(event) =>
                    updateFeatures(["interaction", "threePhasePromptLabels", "next"], event.target.value)
                  }
                  className="h-7 w-[200px] text-[11px]"
                />
              }
            />
          </DetailBlock>

          <div className="text-[11px] font-semibold text-slate-600">MCP</div>
          <ToggleRow
            label="mcp.providerSelector"
            checked={features.mcp.providerSelector}
            visibility={visibility.mcp.providerSelector}
            onToggle={(next) => updateFeatures(["mcp", "providerSelector"], next)}
            onVisibilityChange={(mode) => updateVisibility(["mcp", "providerSelector"], mode)}
          />
          <ToggleRow
            label="mcp.actionSelector"
            checked={features.mcp.actionSelector}
            visibility={visibility.mcp.actionSelector}
            onToggle={(next) => updateFeatures(["mcp", "actionSelector"], next)}
            onVisibilityChange={(mode) => updateVisibility(["mcp", "actionSelector"], mode)}
          />

          <div className="text-[11px] font-semibold text-slate-600">Runtime</div>
          <ToggleRow
            label="runtime.selfUpdate.enabled"
            checked={Boolean(governanceConfig?.enabled)}
            visibility={governanceConfig?.visibility_mode || "admin"}
            onToggle={(next) =>
              void handleGovernanceChange({
                enabled: next,
                visibility_mode: governanceConfig?.visibility_mode || "admin",
              })
            }
            onVisibilityChange={(mode) =>
              void handleGovernanceChange({
                enabled: governanceConfig?.enabled ?? true,
                visibility_mode: mode,
              })
            }
          />
          {governanceSaving ? <div className="text-[11px] text-slate-500">저장 중...</div> : null}
        </DetailBlock>
      </Section>

      <Section title="위젯 탭바">
        <ToggleRow
          label="widget.tabBar.enabled"
          checked={features.widget.tabBar.enabled}
          visibility={visibility.widget.tabBar.enabled}
          onToggle={(next) => updateFeatures(["widget", "tabBar", "enabled"], next)}
          onVisibilityChange={(mode) => updateVisibility(["widget", "tabBar", "enabled"], mode)}
        />
        <DetailBlock>
          <ToggleRow
            label="widget.tabBar.chat"
            checked={features.widget.tabBar.chat}
            visibility={visibility.widget.tabBar.chat}
            onToggle={(next) => updateFeatures(["widget", "tabBar", "chat"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "tabBar", "chat"], mode)}
          />
          <ToggleRow
            label="widget.tabBar.list"
            checked={features.widget.tabBar.list}
            visibility={visibility.widget.tabBar.list}
            onToggle={(next) => updateFeatures(["widget", "tabBar", "list"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "tabBar", "list"], mode)}
          />
          <ToggleRow
            label="widget.tabBar.policy"
            checked={features.widget.tabBar.policy}
            visibility={visibility.widget.tabBar.policy}
            onToggle={(next) => updateFeatures(["widget", "tabBar", "policy"], next)}
            onVisibilityChange={(mode) => updateVisibility(["widget", "tabBar", "policy"], mode)}
          />
        </DetailBlock>
        <ToggleRow
          label="widget.setupPanel"
          checked={features.widget.setupPanel}
          visibility={visibility.widget.setupPanel}
          onToggle={(next) => updateFeatures(["widget", "setupPanel"], next)}
          onVisibilityChange={(mode) => updateVisibility(["widget", "setupPanel"], mode)}
        />

        <DetailBlock>
          <div className="text-[11px] font-semibold text-slate-600">노출/권한</div>
          <Row
            label="widget.allowed_domains"
            alignTop
            right={
              <textarea
                value={formatLines(widget.allowed_domains)}
                onChange={(event) => updateWidget(["allowed_domains"], parseLinesAndComma(event.target.value))}
                className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />
          <Row
            label="widget.allowed_paths"
            alignTop
            right={
              <textarea
                value={formatLines(widget.allowed_paths)}
                onChange={(event) => updateWidget(["allowed_paths"], parseLinesAndComma(event.target.value))}
                className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />
          <Row
            label="theme.allowed_accounts"
            alignTop
            right={
              <textarea
                value={formatLines(widget.theme?.allowed_accounts)}
                onChange={(event) => updateWidget(["theme", "allowed_accounts"], parseLinesAndComma(event.target.value))}
                className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />

          <div className="text-[11px] font-semibold text-slate-600">Setup</div>
          <ToggleRow
            label="setup.modelSelector"
            checked={features.setup.modelSelector}
            visibility={visibility.setup.modelSelector}
            onToggle={(next) => updateFeatures(["setup", "modelSelector"], next)}
            onVisibilityChange={(mode) => updateVisibility(["setup", "modelSelector"], mode)}
          />
          <ToggleRow
            label="setup.modeExisting"
            checked={features.setup.modeExisting}
            visibility={visibility.setup.modeExisting}
            onToggle={(next) => updateFeatures(["setup", "modeExisting"], next)}
            onVisibilityChange={(mode) => updateVisibility(["setup", "modeExisting"], mode)}
          />
          <DetailBlock>
            <ToggleRow
              label="setup.agentSelector"
              checked={features.setup.agentSelector}
              visibility={visibility.setup.agentSelector}
              onToggle={(next) => updateFeatures(["setup", "agentSelector"], next)}
              onVisibilityChange={(mode) => updateVisibility(["setup", "agentSelector"], mode)}
            />
            <ToggleRow
              label="setup.sessionIdSearch"
              checked={features.setup.sessionIdSearch}
              visibility={visibility.setup.sessionIdSearch}
              onToggle={(next) => updateFeatures(["setup", "sessionIdSearch"], next)}
              onVisibilityChange={(mode) => updateVisibility(["setup", "sessionIdSearch"], mode)}
            />
            <Row
              label="setup.existingLabels.agentSelector"
              right={
                <Input
                  value={setupUi.existingLabels.agentSelector || ""}
                  onChange={(event) => updateSetupUi(["existingLabels", "agentSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.existingLabels.versionSelector"
              right={
                <Input
                  value={setupUi.existingLabels.versionSelector || ""}
                  onChange={(event) => updateSetupUi(["existingLabels", "versionSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.existingLabels.sessionSelector"
              right={
                <Input
                  value={setupUi.existingLabels.sessionSelector || ""}
                  onChange={(event) => updateSetupUi(["existingLabels", "sessionSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.existingLabels.sessionIdSearch"
              right={
                <Input
                  value={setupUi.existingLabels.sessionIdSearch || ""}
                  onChange={(event) => updateSetupUi(["existingLabels", "sessionIdSearch"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.existingLabels.conversationMode"
              right={
                <Input
                  value={setupUi.existingLabels.conversationMode || ""}
                  onChange={(event) => updateSetupUi(["existingLabels", "conversationMode"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.existingLabels.modeExisting"
              right={
                <Input
                  value={setupUi.existingLabels.modeExisting || ""}
                  onChange={(event) => updateSetupUi(["existingLabels", "modeExisting"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
          </DetailBlock>

          <ToggleRow
            label="setup.modeNew"
            checked={features.setup.modeNew}
            visibility={visibility.setup.modeNew}
            onToggle={(next) => updateFeatures(["setup", "modeNew"], next)}
            onVisibilityChange={(mode) => updateVisibility(["setup", "modeNew"], mode)}
          />
          <DetailBlock>
            <ToggleRow
              label="setup.inlineUserKbInput"
              checked={features.setup.inlineUserKbInput}
              visibility={visibility.setup.inlineUserKbInput}
              onToggle={(next) => updateFeatures(["setup", "inlineUserKbInput"], next)}
              onVisibilityChange={(mode) => updateVisibility(["setup", "inlineUserKbInput"], mode)}
            />
            <ToggleRow
              label="setup.llmSelector"
              checked={features.setup.llmSelector}
              visibility={visibility.setup.llmSelector}
              onToggle={(next) => updateFeatures(["setup", "llmSelector"], next)}
              onVisibilityChange={(mode) => updateVisibility(["setup", "llmSelector"], mode)}
            />
            <ToggleRow
              label="setup.kbSelector"
              checked={features.setup.kbSelector}
              visibility={visibility.setup.kbSelector}
              onToggle={(next) => updateFeatures(["setup", "kbSelector"], next)}
              onVisibilityChange={(mode) => updateVisibility(["setup", "kbSelector"], mode)}
            />
            <ToggleRow
              label="setup.adminKbSelector"
              checked={features.setup.adminKbSelector}
              visibility={visibility.setup.adminKbSelector}
              onToggle={(next) => updateFeatures(["setup", "adminKbSelector"], next)}
              onVisibilityChange={(mode) => updateVisibility(["setup", "adminKbSelector"], mode)}
            />
          </DetailBlock>

          <ToggleRow
            label="setup.routeSelector"
            checked={features.setup.routeSelector}
            visibility={visibility.setup.routeSelector}
            onToggle={(next) => updateFeatures(["setup", "routeSelector"], next)}
            onVisibilityChange={(mode) => updateVisibility(["setup", "routeSelector"], mode)}
          />
          <DetailBlock>
            <ToggleRow
              label="setup.mcpProviderSelector"
              checked={features.mcp.providerSelector}
              visibility={visibility.mcp.providerSelector}
              onToggle={(next) => updateFeatures(["mcp", "providerSelector"], next)}
              onVisibilityChange={(mode) => updateVisibility(["mcp", "providerSelector"], mode)}
            />
            <ToggleRow
              label="setup.mcpActionSelector"
              checked={features.mcp.actionSelector}
              visibility={visibility.mcp.actionSelector}
              onToggle={(next) => updateFeatures(["mcp", "actionSelector"], next)}
              onVisibilityChange={(mode) => updateVisibility(["mcp", "actionSelector"], mode)}
            />
            <Row
              label="setup.labels.inlineUserKbInput"
              right={
                <Input
                  value={setupUi.labels.inlineUserKbInput || ""}
                  onChange={(event) => updateSetupUi(["labels", "inlineUserKbInput"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.labels.llmSelector"
              right={
                <Input
                  value={setupUi.labels.llmSelector || ""}
                  onChange={(event) => updateSetupUi(["labels", "llmSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.labels.kbSelector"
              right={
                <Input
                  value={setupUi.labels.kbSelector || ""}
                  onChange={(event) => updateSetupUi(["labels", "kbSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.labels.adminKbSelector"
              right={
                <Input
                  value={setupUi.labels.adminKbSelector || ""}
                  onChange={(event) => updateSetupUi(["labels", "adminKbSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.labels.routeSelector"
              right={
                <Input
                  value={setupUi.labels.routeSelector || ""}
                  onChange={(event) => updateSetupUi(["labels", "routeSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.labels.mcpProviderSelector"
              right={
                <Input
                  value={setupUi.labels.mcpProviderSelector || ""}
                  onChange={(event) => updateSetupUi(["labels", "mcpProviderSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
            <Row
              label="setup.labels.mcpActionSelector"
              right={
                <Input
                  value={setupUi.labels.mcpActionSelector || ""}
                  onChange={(event) => updateSetupUi(["labels", "mcpActionSelector"], event.target.value)}
                  className="h-7 w-[220px] text-[11px]"
                />
              }
            />
          </DetailBlock>

          <Row
            label="setup.defaultSetupMode"
            right={
              <SelectPopover
                value={features.setup.defaultSetupMode || "existing"}
                options={DEFAULT_SETUP_MODE_OPTIONS}
                onChange={(value) => updateFeatures(["setup", "defaultSetupMode"], value)}
                buttonClassName="h-7 text-[11px]"
                className="w-[140px]"
              />
            }
          />
          <Row
            label="setup.defaultLlm"
            right={
              <SelectPopover
                value={features.setup.defaultLlm || "chatgpt"}
                options={DEFAULT_LLM_OPTIONS}
                onChange={(value) => updateFeatures(["setup", "defaultLlm"], value)}
                buttonClassName="h-7 text-[11px]"
                className="w-[140px]"
              />
            }
          />
          <Row
            label="setup.llms"
            alignTop
            right={
              <textarea
                value={formatCsv(features.setup.llms.allowlist)}
                onChange={(event) => updateFeatures(["setup", "llms", "allowlist"], parseCsv(event.target.value))}
                className="min-h-[60px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />
          <Row
            label="setup.kbIds"
            alignTop
            right={
              <textarea
                value={formatCsv(features.setup.kbIds.allowlist)}
                onChange={(event) => updateFeatures(["setup", "kbIds", "allowlist"], parseCsv(event.target.value))}
                className="min-h-[60px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />
          <Row
            label="setup.adminKbIds"
            alignTop
            right={
              <textarea
                value={formatCsv(features.setup.adminKbIds.allowlist)}
                onChange={(event) => updateFeatures(["setup", "adminKbIds", "allowlist"], parseCsv(event.target.value))}
                className="min-h-[60px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />
          <Row
            label="setup.routes"
            alignTop
            right={
              <textarea
                value={formatCsv(features.setup.routes.allowlist)}
                onChange={(event) => updateFeatures(["setup", "routes", "allowlist"], parseCsv(event.target.value))}
                className="min-h-[60px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
              />
            }
          />
        </DetailBlock>
      </Section>
    </div>
  );
}

function getIn<T>(source: T, path: string[], fallback: unknown = undefined): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (!isObject(current)) return fallback;
    current = current[key];
  }
  return current === undefined ? fallback : current;
}

function setIn<T extends Record<string, any>>(source: T, path: string[], value: unknown): T {
  if (path.length === 0) return source;
  const [head, ...rest] = path;
  const next: Record<string, any> = Array.isArray(source) ? [...source] : { ...source };
  if (rest.length === 0) {
    next[head] = value;
    return next as T;
  }
  const child = isObject(source[head]) ? source[head] : {};
  next[head] = setIn(child, rest, value);
  return next as T;
}

function readBooleanMap(map: BooleanMap | undefined, key: string) {
  if (!map) return true;
  return map[key] !== false;
}

function setBooleanMap(current: BooleanMap | undefined, key: string, next: boolean): BooleanMap {
  const map: BooleanMap = { ...(current ?? {}) };
  map[key] = next;
  return map;
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLinesAndComma(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLines(values: string[] | undefined) {
  return (values || []).join("\n");
}

function formatCsv(values: string[] | undefined) {
  return (values || []).join(", ");
}

function rowToneClass(tone: FieldTone) {
  if (tone === "enabled") {
    return "border-emerald-500 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200";
  }
  if (tone === "disabled") {
    return "border-rose-400 bg-rose-100 text-rose-900 ring-1 ring-rose-200";
  }
  return "border-slate-300 bg-slate-100 text-slate-800";
}

function Row({
  label,
  tone = "neutral",
  editableLabel,
  onLabelChange,
  right,
  alignTop = false,
}: RowProps) {
  return (
    <div
      className={`flex ${alignTop ? "items-start" : "items-center"} justify-between gap-3 rounded-lg border px-3 ${
        alignTop ? "py-2" : "h-12"
      } text-xs ${rowToneClass(tone)}`}
    >
      <button
        type="button"
        className="inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold"
        aria-disabled
      >
        <span
          contentEditable={editableLabel}
          suppressContentEditableWarning={editableLabel}
          onBlur={(event) => {
            if (!editableLabel) return;
            onLabelChange?.((event.currentTarget.textContent || "").trim());
          }}
          onKeyDown={(event) => {
            if (!editableLabel) return;
            if (event.key === "Enter") {
              event.preventDefault();
              (event.currentTarget as HTMLSpanElement).blur();
            }
          }}
          onClick={(event) => {
            if (!editableLabel) return;
            event.stopPropagation();
          }}
          className={editableLabel ? "rounded px-1 outline-none focus:ring-1 focus:ring-slate-300" : undefined}
        >
          {label}
        </span>
      </button>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onToggle,
  visibility,
  onVisibilityChange,
  editableLabel,
  onLabelChange,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
  visibility?: FeatureVisibilityMode;
  onVisibilityChange?: (next: FeatureVisibilityMode) => void;
  editableLabel?: boolean;
  onLabelChange?: (value: string) => void;
}) {
  return (
    <Row
      label={label}
      tone={checked ? "enabled" : "disabled"}
      editableLabel={editableLabel}
      onLabelChange={onLabelChange}
      right={
        <span className="state-controls flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggle(!checked)}
            className={
              checked
                ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
            }
          >
            {checked ? "ON" : "OFF"}
          </button>
          {visibility ? (
            <button
              type="button"
              onClick={() => onVisibilityChange?.(visibility === "user" ? "admin" : "user")}
              className={
                visibility === "admin"
                  ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                  : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
              }
            >
              {visibility === "admin" ? "ADMIN" : "USER"}
            </button>
          ) : null}
        </span>
      }
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-700">{title}</div>
      <div className="rounded-lg border border-slate-200 bg-white p-2">
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

function DetailBlock({ children }: { children: ReactNode }) {
  return <div className="detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3">{children}</div>;
}

function renderDebugTree(
  tree: DebugFieldTree[],
  map: BooleanMap | undefined,
  onToggle: (key: string, next: boolean) => void
) {
  return tree.map((node) => {
    const checked = readBooleanMap(map, node.key);
    return (
      <div key={node.key} className="space-y-1">
        <ToggleRow label={node.key} checked={checked} onToggle={(next) => onToggle(node.key, next)} />
        {node.children && node.children.length > 0 ? (
          <DetailBlock>{renderDebugTree(node.children, map, (key, next) => onToggle(key, next))}</DetailBlock>
        ) : null}
      </div>
    );
  });
}





