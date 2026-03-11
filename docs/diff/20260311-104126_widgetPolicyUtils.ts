import {
  WIDGET_PAGE_KEY,
  getDefaultConversationPageFeatures,
  type ConversationFeaturesProviderShape,
  type ConversationPageKey,
} from "@/lib/conversation/pageFeaturePolicy";
import type { WidgetSetupConfig } from "@/lib/widgetTemplateMeta";

type WidgetAccess = {
  allowed_domains?: string[] | null;
  allowed_paths?: string[] | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function fillWithNulls<T extends Record<string, any>>(template: T, target: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  Object.keys(template).forEach((key) => {
    const templateValue = template[key];
    const hasKey = Object.prototype.hasOwnProperty.call(target, key);
    const targetValue = hasKey ? target[key] : undefined;
    if (isPlainObject(templateValue)) {
      result[key] = fillWithNulls(templateValue, isPlainObject(targetValue) ? (targetValue as Record<string, unknown>) : {});
    } else if (hasKey) {
      result[key] = targetValue as unknown;
    } else {
      result[key] = null;
    }
  });
  Object.keys(target).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(template, key)) return;
    const targetValue = target[key];
    if (isPlainObject(targetValue)) {
      result[key] = fillWithNulls({}, targetValue as Record<string, unknown>);
    } else {
      result[key] = targetValue as unknown;
    }
  });
  return result as T;
}

export function withNullFeatureDefaults(
  policy: ConversationFeaturesProviderShape | null | undefined,
  pageKey: ConversationPageKey = WIDGET_PAGE_KEY
): ConversationFeaturesProviderShape {
  const base = isPlainObject(policy) ? { ...(policy as Record<string, unknown>) } : {};
  const template = getDefaultConversationPageFeatures(pageKey);
  const rawPage =
    isPlainObject((base as ConversationFeaturesProviderShape).pages?.[pageKey])
      ? ((base as ConversationFeaturesProviderShape).pages?.[pageKey] as Record<string, unknown>)
      : isPlainObject((base as ConversationFeaturesProviderShape).features)
        ? ((base as ConversationFeaturesProviderShape).features as Record<string, unknown>)
        : {};
  const filled = fillWithNulls(template, rawPage);
  return {
    ...(base as ConversationFeaturesProviderShape),
    features: filled,
    pages: {
      ...((base as ConversationFeaturesProviderShape).pages || {}),
      [pageKey]: filled,
    },
  };
}

function readPolicyWidget(policy: ConversationFeaturesProviderShape | null | undefined) {
  if (!policy || !isPlainObject(policy)) return {};
  const widget = (policy as Record<string, unknown>).widget;
  return isPlainObject(widget) ? widget : {};
}

export function getPolicyWidgetTheme(
  policy: ConversationFeaturesProviderShape | null | undefined
): Record<string, unknown> {
  const widget = readPolicyWidget(policy);
  const theme = widget.theme;
  return isPlainObject(theme) ? (theme as Record<string, unknown>) : {};
}

export function setPolicyWidgetTheme(
  policy: ConversationFeaturesProviderShape | null | undefined,
  theme: Record<string, unknown> | null
): ConversationFeaturesProviderShape {
  const base = isPlainObject(policy) ? { ...(policy as Record<string, unknown>) } : {};
  const widget = readPolicyWidget(policy);
  return {
    ...(base as ConversationFeaturesProviderShape),
    widget: {
      ...widget,
      theme: theme && isPlainObject(theme) ? theme : {},
    },
  };
}

export function getPolicyWidgetSetupConfig(
  policy: ConversationFeaturesProviderShape | null | undefined
): WidgetSetupConfig | null {
  const widget = readPolicyWidget(policy);
  const setupConfig = widget.setup_config;
  return isPlainObject(setupConfig) ? (setupConfig as WidgetSetupConfig) : null;
}

export function setPolicyWidgetSetupConfig(
  policy: ConversationFeaturesProviderShape | null | undefined,
  setupConfig: WidgetSetupConfig | null
): ConversationFeaturesProviderShape {
  const base = isPlainObject(policy) ? { ...(policy as Record<string, unknown>) } : {};
  const widget = readPolicyWidget(policy);
  return {
    ...(base as ConversationFeaturesProviderShape),
    widget: {
      ...widget,
      setup_config: setupConfig && isPlainObject(setupConfig) ? setupConfig : null,
    },
  };
}

export function getPolicyWidgetAccess(
  policy: ConversationFeaturesProviderShape | null | undefined
): WidgetAccess {
  const widget = readPolicyWidget(policy);
  const access = widget.access;
  return isPlainObject(access) ? (access as WidgetAccess) : {};
}

export function setPolicyWidgetAccess(
  policy: ConversationFeaturesProviderShape | null | undefined,
  access: WidgetAccess | null
): ConversationFeaturesProviderShape {
  const base = isPlainObject(policy) ? { ...(policy as Record<string, unknown>) } : {};
  const widget = readPolicyWidget(policy);
  return {
    ...(base as ConversationFeaturesProviderShape),
    widget: {
      ...widget,
      access: access && isPlainObject(access) ? access : {},
    },
  };
}

export function mergeWidgetPolicies(
  base: ConversationFeaturesProviderShape | null,
  override: ConversationFeaturesProviderShape | null
): ConversationFeaturesProviderShape | null {
  if (!base && !override) return null;
  if (!base) return override;
  if (!override) return base;

  const mergeObjects = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    const next: Record<string, unknown> = { ...a };
    Object.entries(b).forEach(([key, value]) => {
      if (isPlainObject(value) && isPlainObject(next[key])) {
        next[key] = mergeObjects(next[key] as Record<string, unknown>, value as Record<string, unknown>);
      } else {
        next[key] = value;
      }
    });
    return next;
  };

  return mergeObjects(base as Record<string, unknown>, override as Record<string, unknown>) as ConversationFeaturesProviderShape;
}
