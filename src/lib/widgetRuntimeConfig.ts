import {
  applyConversationFeatureVisibility,
  resolveConversationPageFeatures,
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
} from "@/lib/conversation/pageFeaturePolicy";
import { normalizeWidgetChatPolicyProvider, type WidgetChatPolicyInput } from "@/lib/widgetChatPolicyShape";
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
  chat_policy?: WidgetChatPolicyInput | null;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

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

export function resolveWidgetBasePolicy(
  widget: WidgetRow,
  template: WidgetRow | null
): ConversationFeaturesProviderShape | null {
  const widgetMeta = readWidgetMeta(widget.theme);
  const templateMeta = template ? readWidgetMeta(template.theme) : {};
  const templatePolicy = normalizeWidgetChatPolicyProvider(template?.chat_policy || templateMeta.chat_policy || null);
  if (templatePolicy) return templatePolicy;
  const widgetPolicy = normalizeWidgetChatPolicyProvider(widget.chat_policy || widgetMeta.chat_policy || null);
  return widgetPolicy || null;
}

export function filterWidgetOverridesByPolicy(
  overrides: WidgetOverrides | null | undefined,
  policy: ConversationFeaturesProviderShape | null
): WidgetOverrides | null {
  if (!overrides || !isPlainObject(overrides)) return overrides || null;
  const features = applyConversationFeatureVisibility(resolveConversationPageFeatures(WIDGET_PAGE_KEY, policy), false);
  const allowAgentOverride = Boolean(features.setup.agentSelector || features.setup.modelSelector);
  const allowLlmOverride = Boolean(features.setup.llmSelector);
  const allowKbOverride = Boolean(
    features.setup.kbSelector || features.setup.inlineUserKbInput || features.setup.adminKbSelector
  );
  const allowMcpOverride = Boolean(features.mcp.providerSelector || features.mcp.actionSelector);

  let nextSetup: WidgetSetupConfig | null = overrides.setup_config || null;
  if (nextSetup && typeof nextSetup === "object") {
    const mutable = { ...nextSetup };
    if (!allowAgentOverride) delete (mutable as WidgetSetupConfig).agent_id;
    if (!allowKbOverride) delete (mutable as WidgetSetupConfig).kb;
    if (!allowMcpOverride) delete (mutable as WidgetSetupConfig).mcp;
    if (!allowLlmOverride) delete (mutable as WidgetSetupConfig).llm;
    nextSetup = Object.keys(mutable).length > 0 ? mutable : null;
  }

  return {
    ...overrides,
    agent_id: allowAgentOverride ? overrides.agent_id : null,
    setup_config: nextSetup,
  };
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

  const basePolicy = normalizeWidgetChatPolicyProvider(template?.chat_policy || templateMeta.chat_policy || null);
  const widgetPolicy = normalizeWidgetChatPolicyProvider(widget.chat_policy || widgetMeta.chat_policy || null);
  const overridePolicy = normalizeWidgetChatPolicyProvider(overrides?.chat_policy || null);
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
