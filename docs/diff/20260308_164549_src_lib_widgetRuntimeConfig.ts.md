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
  mergeTheme,
  normalizeStringArray,
} from "@/lib/widgetTemplateMeta";
import {
  getPolicyWidgetAccess,
  getPolicyWidgetSetupConfig,
  getPolicyWidgetTheme,
  mergeWidgetPolicies,
  setPolicyWidgetAccess,
  setPolicyWidgetSetupConfig,
  setPolicyWidgetTheme,
} from "@/lib/widgetPolicyUtils";

export type WidgetTemplateRow = {
  id: string;
  name?: string | null;
  chat_policy?: WidgetChatPolicyInput | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  created_by?: string | null;
};

export type WidgetInstanceRow = {
  id: string;
  template_id: string;
  public_key: string;
  name?: string | null;
  is_active?: boolean | null;
  chat_policy?: WidgetChatPolicyInput | null;
  is_public?: boolean | null;
  editable_id?: string[] | null;
  usable_id?: string[] | null;
  created_by?: string | null;
};

export type ResolvedWidgetConfig = {
  template: WidgetTemplateRow;
  instance: WidgetInstanceRow;
  name: string;
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
  template: WidgetTemplateRow,
  instance: WidgetInstanceRow
): ConversationFeaturesProviderShape | null {
  const templatePolicy = normalizeWidgetChatPolicyProvider(template.chat_policy || null);
  const instancePolicy = normalizeWidgetChatPolicyProvider(instance.chat_policy || null);
  return mergeWidgetPolicies(templatePolicy, instancePolicy);
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
  template: WidgetTemplateRow,
  instance: WidgetInstanceRow,
  overrides?: WidgetOverrides | null
): ResolvedWidgetConfig {
  const templatePolicy = normalizeWidgetChatPolicyProvider(template.chat_policy || null);
  const instancePolicy = normalizeWidgetChatPolicyProvider(instance.chat_policy || null);
  const basePolicy = mergeWidgetPolicies(templatePolicy, instancePolicy);
  const overridePolicy = normalizeWidgetChatPolicyProvider(overrides?.chat_policy || null);
  const resolvedPolicy = mergeWidgetPolicies(basePolicy, overridePolicy);

  const baseTheme = getPolicyWidgetTheme(basePolicy);
  const overrideTheme =
    overrides?.theme && typeof overrides.theme === "object" && !Array.isArray(overrides.theme)
      ? mergeTheme(baseTheme, overrides.theme as Record<string, unknown>)
      : baseTheme;

  const resolvedName = template.name || "Web Widget";

  const baseAccess = getPolicyWidgetAccess(basePolicy);
  const resolvedDomains =
    normalizeStringArray(overrides?.allowed_domains).length > 0
      ? normalizeStringArray(overrides?.allowed_domains)
      : normalizeStringArray(baseAccess.allowed_domains);
  const resolvedPaths =
    normalizeStringArray(overrides?.allowed_paths).length > 0
      ? normalizeStringArray(overrides?.allowed_paths)
      : normalizeStringArray(baseAccess.allowed_paths);

  const baseSetup = getPolicyWidgetSetupConfig(basePolicy) || null;
  const overrideSetup = overrides?.setup_config || null;
  const mergedSetup = mergeSetupConfig(baseSetup, overrideSetup);

  const resolvedPolicyWithTheme = setPolicyWidgetTheme(resolvedPolicy, overrideTheme);
  const resolvedPolicyWithSetup = setPolicyWidgetSetupConfig(resolvedPolicyWithTheme, mergedSetup);
  const resolvedPolicyWithAccess = setPolicyWidgetAccess(resolvedPolicyWithSetup, {
    allowed_domains: resolvedDomains,
    allowed_paths: resolvedPaths,
  });

  return {
    template,
    instance,
    name: resolvedName,
    allowed_domains: resolvedDomains,
    allowed_paths: resolvedPaths,
    theme: overrideTheme,
    setup_config: mergedSetup,
    chat_policy: resolvedPolicyWithAccess,
  };
}
