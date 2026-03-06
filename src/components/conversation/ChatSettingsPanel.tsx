"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { CollapsibleSection } from "@/components/conversation/CollapsibleSection";
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
// debug transcript policy UI removed

export type ChatSettingsAgent = {
  id: string;
  name?: string | null;
  version?: string | null;
  is_active?: boolean | null;
  llm?: string | null;
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
  hiddenLabels?: string[];
  variant?: "policy" | "base";
  preserveNulls?: boolean;
  widgetActiveValue?: boolean | null;
  onWidgetActiveChange?: (next: boolean) => void;
  widgetActiveLabel?: string;
  widgetNameValue?: string | null;
  onWidgetNameChange?: (next: string) => void;
  widgetNameLabel?: string;
};

const PanelVariantContext = createContext<"policy" | "base">("policy");

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
  onLabelClick?: () => void;
  ariaExpanded?: boolean;
  right?: ReactNode;
  alignTop?: boolean;
  variant?: "policy" | "base";
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

const KB_MODE_OPTIONS: SelectOption[] = [
  { id: "inline", label: "inline" },
  { id: "select", label: "select" },
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
  hiddenLabels,
  variant = "policy",
  preserveNulls = false,
  widgetActiveValue,
  onWidgetActiveChange,
  widgetActiveLabel,
  widgetNameValue,
  onWidgetNameChange,
  widgetNameLabel,
}: ChatSettingsPanelProps) {
  const isBaseVariant = variant === "base";
  const pageKey = pageScope?.[0] || WIDGET_PAGE_KEY;
  const providerValue = useMemo(
    () => normalizeConversationFeatureProvider(value ?? null) ?? null,
    [value]
  );

  const buildDraft = useCallback(
    (provider: ConversationFeaturesProviderShape | null): DraftState => {
      const baseFeatures = getDefaultConversationPageFeatures(pageKey);
      const rawPageFeatures = provider?.pages?.[pageKey] ?? provider?.features ?? {};
      const features = preserveNulls
        ? (fillWithNulls(baseFeatures, rawPageFeatures) as ConversationPageFeatures)
        : mergeConversationPageFeatures(
            mergeConversationPageFeatures(baseFeatures, provider?.features),
            provider?.pages?.[pageKey]
          );
      const widget = normalizeWidgetChatPolicyConfig(provider?.widget ?? null);
      const debug = provider?.debug ?? {};
      const setupUi = resolveConversationSetupUi(pageKey, provider || null);
      return { widget, features, debug, setupUi };
    },
    [pageKey, preserveNulls]
  );

  const [draft, setDraft] = useState<DraftState>(() => buildDraft(providerValue));
  const draftRef = useRef<DraftState>(draft);
  const providerRef = useRef<ConversationFeaturesProviderShape | null>(providerValue);

  useEffect(() => {
    providerRef.current = providerValue;
    setDraft(buildDraft(providerValue));
  }, [buildDraft, providerValue]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const commitDraft = useCallback(
    (nextDraft: DraftState) => {
      const base = providerRef.current || {};
      const nextProvider: ConversationFeaturesProviderShape = {
        ...base,
        widget: nextDraft.widget,
        features: nextDraft.features,
        pages: {
          ...(base.pages || {}),
          [pageKey]: nextDraft.features,
        },
        debug: nextDraft.debug,
        debug_copy: {
          ...(base.debug_copy || {}),
          [pageKey]: nextDraft.debug,
        },
        setup_ui: {
          order: nextDraft.setupUi.order,
          labels: nextDraft.setupUi.labels,
          existing_order: nextDraft.setupUi.existingOrder,
          existing_labels: nextDraft.setupUi.existingLabels,
        },
        settings_ui: {
          ...(base.settings_ui || {}),
          setup_fields: {
            ...(base.settings_ui?.setup_fields || {}),
            [pageKey]: {
              order: nextDraft.setupUi.order,
              labels: nextDraft.setupUi.labels,
              existing_order: nextDraft.setupUi.existingOrder,
              existing_labels: nextDraft.setupUi.existingLabels,
            },
          },
        },
      };
      const normalized = normalizeConversationFeatureProvider(nextProvider) || {};
      onChange?.(normalized);
    },
    [onChange, pageKey]
  );

  const updateDraft = useCallback(
    (updater: (current: DraftState) => DraftState) => {
      setDraft((current) => {
        const next = updater(current);
        draftRef.current = next;
        return next;
      });
      Promise.resolve().then(() => {
        commitDraft(draftRef.current);
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

  const widget = draft.widget;
  const features = draft.features;
  const visibility = draft.features.visibility;
  const setupUi = draft.setupUi;
  const setupConfig = isObject(widget.setup_config) ? widget.setup_config : {};
  const kbConfig = isObject(setupConfig.kb) ? setupConfig.kb : {};
  const mcpConfig = isObject(setupConfig.mcp) ? setupConfig.mcp : {};
  const llmConfig = isObject(setupConfig.llm) ? setupConfig.llm : {};
  const hiddenLabelSet = useMemo(() => new Set(hiddenLabels || []), [hiddenLabels]);
  const isHidden = useCallback((label: string) => hiddenLabelSet.has(label), [hiddenLabelSet]);
  const showWidgetBasics =
    !isHidden("widget.agent_id") ||
    !isHidden("widget.entry_mode") ||
    !isHidden("widget.embed_view");
  const showThemeBasics = !isHidden("theme.greeting") || !isHidden("theme.input_placeholder");
  const widgetActiveChecked = widgetActiveValue ?? true;
  const handleWidgetActiveToggle = onWidgetActiveChange || (() => {});

  const agentOptions = useMemo<SelectOption[]>(() => {
    const base = (agents || []).map((agent) => {
      const versionLabel = agent.version ? `v${agent.version}` : "v-";
      const llmLabel = (agent as { llm?: string | null }).llm ? (agent as { llm?: string | null }).llm : "llm-";
      const activeLabel = agent.is_active ? "active" : "inactive";
      return {
        id: agent.id,
        label: `${agent.name || agent.id} ${versionLabel} ${llmLabel}`,
        description: activeLabel,
      };
    });
    return base;
  }, [agents, widget.agent_id]);

  const updateWidget = (path: string[], value: unknown) =>
    updateDraft((current) => ({ ...current, widget: setIn(current.widget as any, path, value) }));
  const updateFeatures = (path: string[], value: unknown) =>
    updateDraft((current) => ({ ...current, features: setIn(current.features as any, path, value) }));
  const updateVisibility = (path: string[], value: FeatureVisibilityMode) =>
    updateDraft((current) => ({
      ...current,
      features: setIn(current.features as any, ["visibility", ...path], value),
    }));
  const updateSetupUi = (path: string[], value: unknown) =>
    updateDraft((current) => ({ ...current, setupUi: setIn(current.setupUi as any, path, value) }));

  const tabBarChatEnabled = features.widget.tabBar.chat || features.widget.chatPanel;
  const tabBarListEnabled = features.widget.tabBar.list || features.widget.historyPanel;
  const tabBarPolicyEnabled = features.widget.tabBar.policy || features.widget.setupPanel;

  const setTabBarPanelEnabled = (key: "chat" | "list" | "policy", next: boolean) =>
    updateDraft((current) => {
      const panelKey = key === "chat" ? "chatPanel" : key === "list" ? "historyPanel" : "setupPanel";
      const withTab = setIn(current.features as any, ["widget", "tabBar", key], next);
      const withPanel = setIn(withTab as any, ["widget", panelKey], next);
      return { ...current, features: withPanel };
    });

  const setTabBarPanelVisibility = (key: "chat" | "list" | "policy", mode: FeatureVisibilityMode) =>
    updateDraft((current) => {
      const panelKey = key === "chat" ? "chatPanel" : key === "list" ? "historyPanel" : "setupPanel";
      const withTab = setIn(current.features as any, ["visibility", "widget", "tabBar", key], mode);
      const withPanel = setIn(withTab as any, ["visibility", "widget", panelKey], mode);
      return { ...current, features: withPanel };
    });

  const renderAllowDenyBlock = (
    label: string,
    value: { allowlist?: string[]; denylist?: string[] },
    onChange: (next: { allowlist?: string[]; denylist?: string[] }) => void
  ) => (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="text-[11px] font-semibold text-slate-700">{label}</div>
      <div className="mt-2 grid grid-cols-1 gap-2">
        <label className="block">
          <div className="mb-1 text-[11px] text-slate-500">Allowlist (줄바꿈)</div>
          <textarea
            value={formatLines(value.allowlist)}
            onChange={(e) => {
              const list = parseLinesAndComma(e.target.value);
              onChange({ ...value, allowlist: list.length ? list : undefined });
            }}
            className="min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            placeholder="예: item_a"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-[11px] text-slate-500">Denylist (줄바꿈)</div>
          <textarea
            value={formatLines(value.denylist)}
            onChange={(e) => {
              const list = parseLinesAndComma(e.target.value);
              onChange({ ...value, denylist: list.length ? list : undefined });
            }}
            className="min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            placeholder="예: item_b"
          />
        </label>
      </div>
    </div>
  );

  const pageLabel = pageLabelOverride || pageKey;

  return (
    <PanelVariantContext.Provider value={variant}>
      <div className="space-y-4">
        <ToggleRowGroup
          label={widgetActiveLabel || "B_chat_widgets.is_active"}
          checked={widgetActiveChecked}
          onToggle={handleWidgetActiveToggle}
          visibility={visibility.widget.launcher}
          onVisibilityChange={(mode) => updateVisibility(["widget", "launcher"], mode)}
          variant={variant}
        >
          <div className="text-[11px] text-slate-600">false면 런처/임베드 모두 완전 숨김</div>
          {showWidgetBasics ? (
            <RowGroup label="기본 세팅">
              {onWidgetNameChange ? (
                <Row
                  label={widgetNameLabel || "B_chat_widgets.name"}
                  variant={variant}
                  right={
                    <Input
                      value={widgetNameValue || ""}
                      onChange={(event) => onWidgetNameChange(event.target.value)}
                      className="h-7 w-[200px] text-[11px]"
                    />
                  }
                />
              ) : null}
              {isHidden("widget.agent_id") ? null : (
            <Row
              label="widget.agent_id"
              variant={variant}
              right={
                    <SelectPopover
                      value={widget.agent_id || ""}
                      options={agentOptions}
                      onChange={(value) => updateWidget(["agent_id"], value)}
                      buttonClassName="h-7 text-[11px]"
                      className="w-[200px]"
                      searchable
                      renderOption={(option, active) => (
                        <div className="flex items-center w-full gap-2">
                          {option.description ? (
                            <span
                              className={`inline-block h-[5px] w-[5px] rounded-full ${
                                option.description === "active" ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                          ) : null}
                          <div className="min-w-0 text-left">
                            <div className="truncate text-slate-900">{option.label}</div>
                          </div>
                        </div>
                      )}
                    />
                  }
                />
              )}
              {isHidden("widget.entry_mode") ? null : (
            <Row
              label="widget.entry_mode"
              variant={variant}
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
              )}
              {isHidden("widget.embed_view") ? null : (
            <Row
              label="widget.embed_view"
              variant={variant}
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
              )}
            </RowGroup>
          ) : null}

          <RowGroup label="구성">
            {isHidden("setup_config.kb.mode") ? null : (
              <Row
                label="setup_config.kb.mode"
                variant={variant}
                right={
                  <SelectPopover
                    value={typeof kbConfig.mode === "string" ? kbConfig.mode : "inline"}
                    options={KB_MODE_OPTIONS}
                    onChange={(value) => updateWidget(["setup_config", "kb", "mode"], value)}
                    buttonClassName="h-7 text-[11px]"
                    className="w-[140px]"
                  />
                }
              />
            )}
            {isHidden("setup_config.kb.kb_id") ? null : (
              <Row
                label="setup_config.kb.kb_id"
                variant={variant}
                right={
                  <Input
                    value={typeof kbConfig.kb_id === "string" ? kbConfig.kb_id : ""}
                    onChange={(event) => updateWidget(["setup_config", "kb", "kb_id"], event.target.value)}
                    className="h-7 w-[220px] text-[11px]"
                  />
                }
              />
            )}
            {isHidden("setup_config.kb.admin_kb_ids") ? null : (
              <Row
                label="setup_config.kb.admin_kb_ids"
                alignTop
                variant={variant}
                right={
                  <textarea
                    value={formatLines(Array.isArray(kbConfig.admin_kb_ids) ? kbConfig.admin_kb_ids : undefined)}
                    onChange={(event) =>
                      updateWidget(
                        ["setup_config", "kb", "admin_kb_ids"],
                        parseLinesAndComma(event.target.value)
                      )
                    }
                    className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  />
                }
              />
            )}
            {isHidden("setup_config.mcp.provider_keys") ? null : (
              <Row
                label="setup_config.mcp.provider_keys"
                alignTop
                variant={variant}
                right={
                  <textarea
                    value={formatLines(Array.isArray(mcpConfig.provider_keys) ? mcpConfig.provider_keys : undefined)}
                    onChange={(event) =>
                      updateWidget(
                        ["setup_config", "mcp", "provider_keys"],
                        parseLinesAndComma(event.target.value)
                      )
                    }
                    className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  />
                }
              />
            )}
            {isHidden("setup_config.mcp.tool_ids") ? null : (
              <Row
                label="setup_config.mcp.tool_ids"
                alignTop
                variant={variant}
                right={
                  <textarea
                    value={formatLines(Array.isArray(mcpConfig.tool_ids) ? mcpConfig.tool_ids : undefined)}
                    onChange={(event) =>
                      updateWidget(["setup_config", "mcp", "tool_ids"], parseLinesAndComma(event.target.value))
                    }
                    className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                  />
                }
              />
            )}
            {isHidden("setup_config.llm.default") ? null : (
              <Row
                label="setup_config.llm.default"
                variant={variant}
                right={
                  <Input
                    value={typeof llmConfig.default === "string" ? llmConfig.default : ""}
                    onChange={(event) => updateWidget(["setup_config", "llm", "default"], event.target.value)}
                    className="h-7 w-[200px] text-[11px]"
                  />
                }
              />
            )}
          </RowGroup>

          {showThemeBasics ? (
            <RowGroup label="대화 기본값">
              {isHidden("theme.greeting") ? null : (
            <Row
              label="theme.greeting"
              variant={variant}
              right={
                    <Input
                      value={typeof widget.theme?.greeting === "string" ? widget.theme.greeting : ""}
                      onChange={(event) => updateWidget(["theme", "greeting"], event.target.value)}
                      className="h-7 w-[260px] text-[11px]"
                    />
                  }
                />
              )}
              {isHidden("theme.input_placeholder") ? null : (
            <Row
              label="theme.input_placeholder"
              variant={variant}
              right={
                    <Input
                      value={typeof widget.theme?.input_placeholder === "string" ? widget.theme.input_placeholder : ""}
                      onChange={(event) => updateWidget(["theme", "input_placeholder"], event.target.value)}
                      className="h-7 w-[260px] text-[11px]"
                    />
                  }
                />
              )}
            </RowGroup>
          ) : null}

          <RowGroup label="런처 디자인">
            <Row
              label="cfg.launcherLabel"
              variant={variant}
              right={
                <Input
                  value={typeof widget.cfg?.launcherLabel === "string" ? widget.cfg.launcherLabel : ""}
                  onChange={(event) => updateWidget(["cfg", "launcherLabel"], event.target.value)}
                  className="h-7 w-[200px] text-[11px]"
                />
              }
            />
            <Row
              label="cfg.position"
              variant={variant}
              right={
                <SelectPopover
                  value={typeof widget.cfg?.position === "string" ? widget.cfg.position : "bottom-right"}
                  options={POSITION_OPTIONS}
                  onChange={(value) => updateWidget(["cfg", "position"], value)}
                  buttonClassName="h-7 text-[11px]"
                  className="w-[150px]"
                />
              }
            />
            <Row
              label="theme.launcher_logo_id"
              variant={variant}
              right={
                <Input
                  value={typeof widget.theme?.launcher_logo_id === "string" ? widget.theme.launcher_logo_id : ""}
                  onChange={(event) => updateWidget(["theme", "launcher_logo_id"], event.target.value)}
                  className="h-7 w-[200px] text-[11px]"
                />
              }
            />
            <Row
              label="theme.primary_color | launcher_bg"
              variant={variant}
              right={
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={typeof widget.theme?.primary_color === "string" ? widget.theme.primary_color : "#4f46e5"}
                    onChange={(event) => updateWidget(["theme", "primary_color"], event.target.value)}
                    className="h-7 w-9 cursor-pointer rounded border border-slate-200"
                  />
                  <Input
                    value={typeof widget.theme?.primary_color === "string" ? widget.theme.primary_color : ""}
                    onChange={(event) => updateWidget(["theme", "primary_color"], event.target.value)}
                    className="h-7 w-[120px] text-[11px]"
                    placeholder="#4f46e5"
                  />
                  <Input
                    value={typeof widget.theme?.launcher_bg === "string" ? widget.theme.launcher_bg : ""}
                    onChange={(event) => updateWidget(["theme", "launcher_bg"], event.target.value)}
                    className="h-7 w-[120px] text-[11px]"
                    placeholder="#0f172a"
                  />
                </div>
              }
            />
            <Row
              label="launcher.container.bottom"
              variant={variant}
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
              variant={variant}
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
              variant={variant}
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
              variant={variant}
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
              variant={variant}
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
              variant={variant}
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
          </RowGroup>

          <RowGroup label="위젯 디자인">
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
                  ]}
                  onChange={(value) => updateWidget(["iframe", "layout"], value)}
                  buttonClassName="h-7 text-[11px]"
                  className="w-[120px]"
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
          </RowGroup>

          <RowGroup label="노출/권한">
            {isHidden("widget.allowed_domains") ? null : (
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
            )}
            {isHidden("widget.allowed_paths") ? null : (
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
            )}
            <Row
              label="theme.allowed_accounts"
              alignTop
              right={
                <textarea
                  value={
                    formatLines(
                      Array.isArray(widget.theme?.allowed_accounts)
                        ? (widget.theme?.allowed_accounts as string[])
                        : undefined
                    )
                  }
                  onChange={(event) => updateWidget(["theme", "allowed_accounts"], parseLinesAndComma(event.target.value))}
                  className="min-h-[70px] w-[260px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                />
              }
            />
          </RowGroup>
        </ToggleRowGroup>

        <ToggleRowGroup
          label="widget.header.enabled"
          checked={features.widget.header.enabled}
          visibility={visibility.widget.header.enabled}
          onToggle={(next) => updateFeatures(["widget", "header", "enabled"], next)}
          onVisibilityChange={(mode) => updateVisibility(["widget", "header", "enabled"], mode)}
        >
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
        </ToggleRowGroup>

        <ToggleRowGroup
          label="widget.tabBar.enabled"
          checked={features.widget.tabBar.enabled}
          visibility={visibility.widget.tabBar.enabled}
          onToggle={(next) => updateFeatures(["widget", "tabBar", "enabled"], next)}
          onVisibilityChange={(mode) => updateVisibility(["widget", "tabBar", "enabled"], mode)}
        >
          <ToggleRow
            label="widget.tabBar.chat"
            checked={tabBarChatEnabled}
            visibility={visibility.widget.tabBar.chat}
            onToggle={(next) => setTabBarPanelEnabled("chat", next)}
            onVisibilityChange={(mode) => setTabBarPanelVisibility("chat", mode)}
          />
          <ToggleRow
            label="widget.tabBar.list"
            checked={tabBarListEnabled}
            visibility={visibility.widget.tabBar.list}
            onToggle={(next) => setTabBarPanelEnabled("list", next)}
            onVisibilityChange={(mode) => setTabBarPanelVisibility("list", mode)}
          />
          <ToggleRowGroup
            label="widget.tabBar.policy"
            checked={tabBarPolicyEnabled}
            visibility={visibility.widget.tabBar.policy}
            onToggle={(next) => setTabBarPanelEnabled("policy", next)}
            onVisibilityChange={(mode) => setTabBarPanelVisibility("policy", mode)}
          >
            {tabBarPolicyEnabled ? (
              <RowGroup label="Setup">
                <ToggleRow
                  label="setup.modelSelector"
                  checked={features.setup.modelSelector}
                  visibility={visibility.setup.modelSelector}
                  onToggle={(next) => updateFeatures(["setup", "modelSelector"], next)}
                  onVisibilityChange={(mode) => updateVisibility(["setup", "modelSelector"], mode)}
                />
                <ToggleRowGroup
                  label={setupUi.existingLabels.modeExisting || "setup.modeExisting"}
                  checked={features.setup.modeExisting}
                  visibility={visibility.setup.modeExisting}
                  onToggle={(next) => updateFeatures(["setup", "modeExisting"], next)}
                  onVisibilityChange={(mode) => updateVisibility(["setup", "modeExisting"], mode)}
                  editableLabel
                  onLabelChange={(value) => updateSetupUi(["existingLabels", "modeExisting"], value)}
                >
                  <ToggleRow
                    label={setupUi.existingLabels.agentSelector || "setup.agentSelector"}
                    checked={features.setup.agentSelector}
                    visibility={visibility.setup.agentSelector}
                    onToggle={(next) => updateFeatures(["setup", "agentSelector"], next)}
                    onVisibilityChange={(mode) => updateVisibility(["setup", "agentSelector"], mode)}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["existingLabels", "agentSelector"], value)}
                  />
                  <ToggleRow
                    label={setupUi.existingLabels.sessionIdSearch || "setup.sessionIdSearch"}
                    checked={features.setup.sessionIdSearch}
                    visibility={visibility.setup.sessionIdSearch}
                    onToggle={(next) => updateFeatures(["setup", "sessionIdSearch"], next)}
                    onVisibilityChange={(mode) => updateVisibility(["setup", "sessionIdSearch"], mode)}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["existingLabels", "sessionIdSearch"], value)}
                  />
                  <Row
                    label={setupUi.existingLabels.versionSelector || "setup.existingLabels.versionSelector"}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["existingLabels", "versionSelector"], value)}
                  />
                  <Row
                    label={setupUi.existingLabels.sessionSelector || "setup.existingLabels.sessionSelector"}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["existingLabels", "sessionSelector"], value)}
                  />
                  <Row
                    label={setupUi.existingLabels.conversationMode || "setup.existingLabels.conversationMode"}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["existingLabels", "conversationMode"], value)}
                  />
                </ToggleRowGroup>

                <ToggleRowGroup
                  label="setup.modeNew"
                  checked={features.setup.modeNew}
                  visibility={visibility.setup.modeNew}
                  onToggle={(next) => updateFeatures(["setup", "modeNew"], next)}
                  onVisibilityChange={(mode) => updateVisibility(["setup", "modeNew"], mode)}
                >
                  <ToggleRow
                    label={setupUi.labels.inlineUserKbInput || "setup.inlineUserKbInput"}
                    checked={features.setup.inlineUserKbInput}
                    visibility={visibility.setup.inlineUserKbInput}
                    onToggle={(next) => updateFeatures(["setup", "inlineUserKbInput"], next)}
                    onVisibilityChange={(mode) => updateVisibility(["setup", "inlineUserKbInput"], mode)}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["labels", "inlineUserKbInput"], value)}
                  />
                  <ToggleRow
                    label={setupUi.labels.llmSelector || "setup.llmSelector"}
                    checked={features.setup.llmSelector}
                    visibility={visibility.setup.llmSelector}
                    onToggle={(next) => updateFeatures(["setup", "llmSelector"], next)}
                    onVisibilityChange={(mode) => updateVisibility(["setup", "llmSelector"], mode)}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["labels", "llmSelector"], value)}
                  />
                  <ToggleRow
                    label={setupUi.labels.kbSelector || "setup.kbSelector"}
                    checked={features.setup.kbSelector}
                    visibility={visibility.setup.kbSelector}
                    onToggle={(next) => updateFeatures(["setup", "kbSelector"], next)}
                    onVisibilityChange={(mode) => updateVisibility(["setup", "kbSelector"], mode)}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["labels", "kbSelector"], value)}
                  />
                  <ToggleRow
                    label={setupUi.labels.adminKbSelector || "setup.adminKbSelector"}
                    checked={features.setup.adminKbSelector}
                    visibility={visibility.setup.adminKbSelector}
                    onToggle={(next) => updateFeatures(["setup", "adminKbSelector"], next)}
                    onVisibilityChange={(mode) => updateVisibility(["setup", "adminKbSelector"], mode)}
                    editableLabel
                    onLabelChange={(value) => updateSetupUi(["labels", "adminKbSelector"], value)}
                  />
                </ToggleRowGroup>

                <ToggleRow
                  label={setupUi.labels.routeSelector || "setup.routeSelector"}
                  checked={features.setup.routeSelector}
                  visibility={visibility.setup.routeSelector}
                  onToggle={(next) => updateFeatures(["setup", "routeSelector"], next)}
                  onVisibilityChange={(mode) => updateVisibility(["setup", "routeSelector"], mode)}
                  editableLabel
                  onLabelChange={(value) => updateSetupUi(["labels", "routeSelector"], value)}
                />

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
                  right={
                    <Input
                      value={formatCsv(features.setup.llms.allowlist)}
                      onChange={(event) =>
                        updateFeatures(["setup", "llms", "allowlist"], parseCsv(event.target.value))
                      }
                      className="h-7 w-[260px] text-[11px]"
                      placeholder="gpt-4o, gpt-4o-mini"
                    />
                  }
                />
                <Row
                  label="setup.kbIds"
                  right={
                    <Input
                      value={formatCsv(features.setup.kbIds.allowlist)}
                      onChange={(event) =>
                        updateFeatures(["setup", "kbIds", "allowlist"], parseCsv(event.target.value))
                      }
                      className="h-7 w-[260px] text-[11px]"
                      placeholder="kb_1, kb_2"
                    />
                  }
                />
                <Row
                  label="setup.adminKbIds"
                  right={
                    <Input
                      value={formatCsv(features.setup.adminKbIds.allowlist)}
                      onChange={(event) =>
                        updateFeatures(["setup", "adminKbIds", "allowlist"], parseCsv(event.target.value))
                      }
                      className="h-7 w-[260px] text-[11px]"
                      placeholder="kb_admin_1"
                    />
                  }
                />
                <Row
                  label="setup.routes"
                  right={
                    <Input
                      value={formatCsv(features.setup.routes.allowlist)}
                      onChange={(event) =>
                        updateFeatures(["setup", "routes", "allowlist"], parseCsv(event.target.value))
                      }
                      className="h-7 w-[260px] text-[11px]"
                      placeholder="route_a, route_b"
                    />
                  }
                />
              </RowGroup>
            ) : null}
          </ToggleRowGroup>
        <RowGroup label="Admin Panel">
          <ToggleRow
            label="adminPanel.enabled"
            checked={features.adminPanel.enabled}
            visibility={visibility.adminPanel.enabled}
            onToggle={(next) => updateFeatures(["adminPanel", "enabled"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "enabled"], mode)}
          />
          <ToggleRow
            label="adminPanel.logsToggle"
            checked={features.adminPanel.logsToggle}
            visibility={visibility.adminPanel.logsToggle}
            onToggle={(next) => updateFeatures(["adminPanel", "logsToggle"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "logsToggle"], mode)}
          />
          <ToggleRow
            label="adminPanel.copyConversation"
            checked={features.adminPanel.copyConversation}
            visibility={visibility.adminPanel.copyConversation}
            onToggle={(next) => updateFeatures(["adminPanel", "copyConversation"], next)}
            onVisibilityChange={(mode) => updateVisibility(["adminPanel", "copyConversation"], mode)}
          />
        </RowGroup>

        <RowGroup label="Interaction">
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
            label="interaction.inputSubmit"
            checked={features.interaction.inputSubmit}
            visibility={visibility.interaction.inputSubmit}
            onToggle={(next) => updateFeatures(["interaction", "inputSubmit"], next)}
            onVisibilityChange={(mode) => updateVisibility(["interaction", "inputSubmit"], mode)}
          />
          <ToggleRowGroup
            label="interaction.threePhasePrompt"
            checked={features.interaction.threePhasePrompt}
            visibility={visibility.interaction.threePhasePrompt}
            onToggle={(next) => updateFeatures(["interaction", "threePhasePrompt"], next)}
            onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePrompt"], mode)}
          >
            <ToggleRow
              label={
                features.interaction.threePhasePromptLabels.confirmed ||
                "interaction.threePhasePromptShowConfirmed"
              }
              checked={features.interaction.threePhasePromptShowConfirmed}
              visibility={visibility.interaction.threePhasePromptShowConfirmed}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptShowConfirmed"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptShowConfirmed"], mode)}
              editableLabel
              onLabelChange={(value) => updateFeatures(["interaction", "threePhasePromptLabels", "confirmed"], value)}
            />
            <ToggleRow
              label={
                features.interaction.threePhasePromptLabels.confirming ||
                "interaction.threePhasePromptShowConfirming"
              }
              checked={features.interaction.threePhasePromptShowConfirming}
              visibility={visibility.interaction.threePhasePromptShowConfirming}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptShowConfirming"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptShowConfirming"], mode)}
              editableLabel
              onLabelChange={(value) => updateFeatures(["interaction", "threePhasePromptLabels", "confirming"], value)}
            />
            <ToggleRow
              label={features.interaction.threePhasePromptLabels.next || "interaction.threePhasePromptShowNext"}
              checked={features.interaction.threePhasePromptShowNext}
              visibility={visibility.interaction.threePhasePromptShowNext}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptShowNext"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptShowNext"], mode)}
              editableLabel
              onLabelChange={(value) => updateFeatures(["interaction", "threePhasePromptLabels", "next"], value)}
            />
            <ToggleRow
              label="interaction.threePhasePromptHideLabels"
              checked={features.interaction.threePhasePromptHideLabels}
              visibility={visibility.interaction.threePhasePromptHideLabels}
              onToggle={(next) => updateFeatures(["interaction", "threePhasePromptHideLabels"], next)}
              onVisibilityChange={(mode) => updateVisibility(["interaction", "threePhasePromptHideLabels"], mode)}
            />
          </ToggleRowGroup>
        </RowGroup>

        <RowGroup label="Allow/Deny">
          {renderAllowDenyBlock(
            "MCP Providers",
            features.mcp.providers,
            (next) => updateFeatures(["mcp", "providers"], next)
          )}
          {renderAllowDenyBlock(
            "MCP Tools",
            features.mcp.tools,
            (next) => updateFeatures(["mcp", "tools"], next)
          )}
          {renderAllowDenyBlock(
            "LLM IDs",
            features.setup.llms,
            (next) => updateFeatures(["setup", "llms"], next)
          )}
          {renderAllowDenyBlock(
            "KB IDs",
            features.setup.kbIds,
            (next) => updateFeatures(["setup", "kbIds"], next)
          )}
          {renderAllowDenyBlock(
            "Admin KB IDs",
            features.setup.adminKbIds,
            (next) => updateFeatures(["setup", "adminKbIds"], next)
          )}
          {renderAllowDenyBlock(
            "Runtime Routes",
            features.setup.routes,
            (next) => updateFeatures(["setup", "routes"], next)
          )}
        </RowGroup>

        <RowGroup label="MCP">
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
        </RowGroup>

        <RowGroup label="Runtime">
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
                visibility_mode: mode === "public" ? "user" : mode,
              })
            }
          />
          {governanceSaving ? <div className="text-[11px] text-slate-500">저장 중...</div> : null}
        </RowGroup>

        </ToggleRowGroup>

      </div>
    </PanelVariantContext.Provider>
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

function fillWithNulls<T extends Record<string, any>>(template: T, target: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  Object.keys(template).forEach((key) => {
    const templateValue = template[key];
    const hasKey = Object.prototype.hasOwnProperty.call(target, key);
    const targetValue = hasKey ? target[key] : undefined;
    if (isObject(templateValue)) {
      result[key] = fillWithNulls(templateValue, isObject(targetValue) ? (targetValue as Record<string, unknown>) : {});
    } else if (hasKey) {
      result[key] = targetValue as unknown;
    } else {
      result[key] = null;
    }
  });
  return result as T;
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

function rowToneClass(tone: FieldTone, isBaseVariant: boolean) {
  if (isBaseVariant) {
    return "border-slate-200 bg-white text-slate-700";
  }
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
  onLabelClick,
  ariaExpanded,
  right,
  alignTop = false,
  variant,
}: RowProps) {
  const contextVariant = useContext(PanelVariantContext);
  const resolvedVariant = variant ?? contextVariant;
  const isBaseVariant = resolvedVariant === "base";
  return (
    <div
      className={`flex ${alignTop ? "items-start" : "items-center"} justify-between gap-3 rounded-lg border px-3 ${
        alignTop ? "py-2" : "h-12"
      } text-xs ${rowToneClass(tone, isBaseVariant)}`}
    >
      <button
        type="button"
        className="inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold"
        aria-disabled={!onLabelClick}
        aria-expanded={onLabelClick ? ariaExpanded : undefined}
        onClick={() => {
          onLabelClick?.();
        }}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {onLabelClick ? (
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                ariaExpanded ? "rotate-180" : ""
              }`}
            />
          ) : null}
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
  onLabelClick,
  expanded,
  variant,
}: {
  label: string;
  checked: boolean | null | undefined;
  onToggle: (next: boolean) => void;
  visibility?: FeatureVisibilityMode | null;
  onVisibilityChange?: (next: FeatureVisibilityMode) => void;
  editableLabel?: boolean;
  onLabelChange?: (value: string) => void;
  onLabelClick?: () => void;
  expanded?: boolean;
  variant?: "policy" | "base";
}) {
  const isNull = checked === null || checked === undefined;
  const resolvedChecked = checked === true;
  const tone: FieldTone = isNull ? "neutral" : resolvedChecked ? "enabled" : "disabled";
  const nextVisibility =
    visibility === "admin" ? "public" : visibility === "public" ? "user" : "admin";
  return (
    <Row
      label={label}
      tone={tone}
      variant={variant}
      editableLabel={editableLabel}
      onLabelChange={onLabelChange}
      onLabelClick={onLabelClick}
      ariaExpanded={expanded}
      right={
        <span className="state-controls flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggle(isNull ? true : !resolvedChecked)}
            className={
              isNull
                ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-slate-400 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                : resolvedChecked
                ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-rose-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
            }
          >
            {isNull ? "NULL" : resolvedChecked ? "ON" : "OFF"}
          </button>
          {visibility !== undefined ? (
            <button
              type="button"
              onClick={() => onVisibilityChange?.(nextVisibility)}
              className={
                visibility === "admin"
                  ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                  : visibility === "public"
                    ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-sky-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                    : visibility === "user"
                      ? "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-slate-700 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                      : "inline-flex h-7 w-[55px] items-center justify-center rounded-md bg-slate-400 px-2 py-1 text-[11px] font-bold text-white shadow-sm"
              }
            >
              {visibility === "admin" ? "ADMIN" : visibility === "public" ? "PUBLIC" : visibility === "user" ? "USER" : "NULL"}
            </button>
          ) : null}
        </span>
      }
    />
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <CollapsibleSection
      title={title}
      defaultOpen={defaultOpen}
      className="space-y-2"
      summaryClassName="text-xs font-semibold text-slate-700"
      contentClassName="px-3 py-2"
    >
      <div className="space-y-2">{children}</div>
    </CollapsibleSection>
  );
}

function ToggleRowGroup({
  label,
  checked,
  onToggle,
  visibility,
  onVisibilityChange,
  editableLabel,
  onLabelChange,
  defaultOpen = false,
  variant,
  children,
}: {
  label: string;
  checked: boolean | null | undefined;
  onToggle: (next: boolean) => void;
  visibility?: FeatureVisibilityMode | null;
  onVisibilityChange?: (next: FeatureVisibilityMode) => void;
  editableLabel?: boolean;
  onLabelChange?: (value: string) => void;
  defaultOpen?: boolean;
  variant?: "policy" | "base";
  children: ReactNode;
}) {
  const contextVariant = useContext(PanelVariantContext);
  const resolvedVariant = variant ?? contextVariant;
  const isBaseVariant = resolvedVariant === "base";
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = isBaseVariant ? true : open;

  return (
    <div className="space-y-2">
      <ToggleRow
        label={label}
        checked={checked}
        onToggle={onToggle}
        visibility={visibility}
        onVisibilityChange={onVisibilityChange}
        variant={resolvedVariant}
        editableLabel={editableLabel}
        onLabelChange={onLabelChange}
        onLabelClick={isBaseVariant ? undefined : () => setOpen((prev) => !prev)}
        expanded={isOpen}
      />
      {isOpen ? <DetailBlock variant={resolvedVariant}>{children}</DetailBlock> : null}
    </div>
  );
}

function RowGroup({
  label,
  defaultOpen = false,
  variant,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  variant?: "policy" | "base";
  children: ReactNode;
}) {
  const contextVariant = useContext(PanelVariantContext);
  const resolvedVariant = variant ?? contextVariant;
  const isBaseVariant = resolvedVariant === "base";
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = isBaseVariant ? true : open;

  return (
    <div className="space-y-2">
      <Row
        label={label}
        tone="neutral"
        variant={resolvedVariant}
        onLabelClick={isBaseVariant ? undefined : () => setOpen((prev) => !prev)}
        ariaExpanded={isOpen}
      />
      {isOpen ? <DetailBlock variant={resolvedVariant}>{children}</DetailBlock> : null}
    </div>
  );
}

function DetailBlock({
  variant,
  children,
}: {
  variant?: "policy" | "base";
  children: ReactNode;
}) {
  const contextVariant = useContext(PanelVariantContext);
  const resolvedVariant = variant ?? contextVariant;
  return (
    <div
      className={
        resolvedVariant === "base"
          ? "detail-block mt-2 space-y-2"
          : "detail-block mt-2 space-y-2 border-l-2 border-slate-200 pl-3"
      }
    >
      {children}
    </div>
  );
}
