import type { ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";
import {
  type WidgetOverrides,
  type WidgetSetupConfig,
  readWidgetMeta,
  stripWidgetMeta,
  mergeTheme,
  normalizeStringArray,
} from "@/lib/widgetTemplateMeta";

export type WidgetRow = {
  id: string;
  org_id: string;
  name?: string | null;
  agent_id?: string | null;
  public_key?: string | null;
  allowed_domains?: string[] | null;
  allowed_paths?: string[] | null;
  theme?: Record<string, unknown> | null;
  is_active?: boolean | null;
};

export type ResolvedWidgetConfig = {
  baseWidget: WidgetRow;
  templateWidget?: WidgetRow | null;
  name: string;
  agent_id: string | null;
  allowed_domains: string[];
  allowed_paths: string[];
  theme: Record<string, unknown>;
  setup_config: WidgetSetupConfig | null;
  chat_policy: ConversationFeaturesProviderShape | null;
};

function mergeSetupConfig(base?: WidgetSetupConfig | null, override?: WidgetSetupConfig | null) {
  if (!base && !override) return null;
  return {
    ...(base || {}),
    ...(override || {}),
    kb: { ...(base?.kb || {}), ...(override?.kb || {}) },
    mcp: { ...(base?.mcp || {}), ...(override?.mcp || {}) },
    llm: { ...(base?.llm || {}), ...(override?.llm || {}) },
  } satisfies WidgetSetupConfig;
}

export function resolveWidgetRuntimeConfig(
  widget: WidgetRow,
  template: WidgetRow | null,
  overrides?: WidgetOverrides | null
): ResolvedWidgetConfig {
  const baseWidget = template ?? widget;
  const templateMeta = readWidgetMeta(baseWidget.theme);
  const widgetMeta = readWidgetMeta(widget.theme);
  const baseTheme = stripWidgetMeta(baseWidget.theme);
  const widgetTheme = template ? stripWidgetMeta(widget.theme) : {};
  const mergedTheme = mergeTheme(baseTheme, widgetTheme);
  const overrideTheme =
    overrides?.theme && typeof overrides.theme === "object" && !Array.isArray(overrides.theme)
      ? mergeTheme(mergedTheme, overrides.theme as Record<string, unknown>)
      : mergedTheme;

  const resolvedName =
    (typeof overrides?.name === "string" && overrides.name.trim()) ||
    (template ? widget.name : null) ||
    baseWidget.name ||
    "Web Widget";

  const resolvedAgent =
    (typeof overrides?.agent_id === "string" && overrides.agent_id.trim()) ||
    (template ? widget.agent_id : null) ||
    baseWidget.agent_id ||
    null;

  const baseDomains = normalizeStringArray(baseWidget.allowed_domains);
  const widgetDomains = template ? normalizeStringArray(widget.allowed_domains) : [];
  const overrideDomains = normalizeStringArray(overrides?.allowed_domains);
  const resolvedDomains =
    overrideDomains.length > 0 ? overrideDomains : widgetDomains.length > 0 ? widgetDomains : baseDomains;

  const basePaths = normalizeStringArray(baseWidget.allowed_paths);
  const widgetPaths = template ? normalizeStringArray(widget.allowed_paths) : [];
  const overridePaths = normalizeStringArray(overrides?.allowed_paths);
  const resolvedPaths = overridePaths.length > 0 ? overridePaths : widgetPaths.length > 0 ? widgetPaths : basePaths;

  const baseSetup = templateMeta.setup_config || null;
  const widgetSetup = widgetMeta.setup_config || null;
  const overrideSetup = overrides?.setup_config || null;
  const mergedSetup = mergeSetupConfig(mergeSetupConfig(baseSetup, widgetSetup), overrideSetup);

  const basePolicy = (templateMeta.chat_policy || null) as ConversationFeaturesProviderShape | null;
  const widgetPolicy = (widgetMeta.chat_policy || null) as ConversationFeaturesProviderShape | null;
  const overridePolicy = (overrides?.chat_policy || null) as ConversationFeaturesProviderShape | null;
  const resolvedPolicy = overridePolicy || widgetPolicy || basePolicy;

  return {
    baseWidget,
    templateWidget: template,
    name: resolvedName,
    agent_id: resolvedAgent ? String(resolvedAgent) : null,
    allowed_domains: resolvedDomains,
    allowed_paths: resolvedPaths,
    theme: overrideTheme,
    setup_config: mergedSetup,
    chat_policy: resolvedPolicy,
  };
}
