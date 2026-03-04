import { normalizeWidgetChatPolicyProvider, type WidgetChatPolicyInput } from "@/lib/widgetChatPolicyShape";

export type WidgetKbConfig = {
  mode?: "inline" | "select";
  kb_id?: string | null;
  admin_kb_ids?: string[] | null;
};

export type WidgetMcpConfig = {
  provider_keys?: string[] | null;
  tool_ids?: string[] | null;
};

export type WidgetSetupConfig = {
  agent_id?: string | null;
  kb?: WidgetKbConfig | null;
  mcp?: WidgetMcpConfig | null;
  llm?: { default?: string | null } | null;
};

export type WidgetOverrides = {
  name?: string | null;
  agent_id?: string | null;
  allowed_domains?: string[] | null;
  allowed_paths?: string[] | null;
  theme?: Record<string, unknown> | null;
  setup_config?: WidgetSetupConfig | null;
  chat_policy?: WidgetChatPolicyInput | null;
};

export type WidgetTemplateMeta = {
  type?: "template" | "instance";
  template_id?: string | null;
  setup_config?: WidgetSetupConfig | null;
  chat_policy?: WidgetChatPolicyInput | null;
};

const META_KEY = "__widget_meta";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function readWidgetMeta(theme: unknown): WidgetTemplateMeta {
  if (!isPlainObject(theme)) return {};
  const meta = theme[META_KEY];
  if (!isPlainObject(meta)) return {};
  return meta as WidgetTemplateMeta;
}

export function stripWidgetMeta(theme: unknown): Record<string, unknown> {
  if (!isPlainObject(theme)) return {};
  const next = { ...theme };
  delete next[META_KEY];
  return next;
}

export function applyWidgetMeta(theme: unknown, meta: WidgetTemplateMeta): Record<string, unknown> {
  const base = isPlainObject(theme) ? { ...theme } : {};
  base[META_KEY] = meta;
  return base;
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function normalizeWidgetOverrides(value: unknown): WidgetOverrides {
  if (!isPlainObject(value)) return {};
  const theme = isPlainObject(value.theme) ? (value.theme as Record<string, unknown>) : null;
  const setupConfig = isPlainObject(value.setup_config) ? (value.setup_config as WidgetSetupConfig) : null;
  const chatPolicy = normalizeWidgetChatPolicyProvider(value.chat_policy ?? null);
  return {
    name: typeof value.name === "string" ? value.name : null,
    agent_id: typeof value.agent_id === "string" ? value.agent_id : null,
    allowed_domains: normalizeStringArray(value.allowed_domains),
    allowed_paths: normalizeStringArray(value.allowed_paths),
    theme,
    setup_config: setupConfig,
    chat_policy: chatPolicy,
  };
}

export function mergeTheme(base: Record<string, unknown>, override?: Record<string, unknown> | null) {
  if (!override) return { ...base };
  return { ...base, ...override };
}
