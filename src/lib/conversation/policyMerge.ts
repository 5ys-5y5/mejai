import {
  normalizeConversationFeatureProvider,
  type ConversationFeaturesProviderShape,
  type WidgetChatPolicyConfig,
} from "@/lib/conversation/pageFeaturePolicy";

type PlainRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!(key in b)) return false;
      if (!isDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

function deepMerge<T extends PlainRecord>(base: T, override: PlainRecord): T {
  const next: PlainRecord = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    const current = next[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      next[key] = deepMerge(current, value);
      return;
    }
    next[key] = value;
  });
  return next as T;
}

function diffPlainObject(base: PlainRecord | undefined, next: PlainRecord): PlainRecord {
  const result: PlainRecord = {};
  Object.entries(next).forEach(([key, value]) => {
    if (value === undefined) return;
    const baseValue = base ? base[key] : undefined;
    if (isPlainObject(value) && isPlainObject(baseValue)) {
      const diff = diffPlainObject(baseValue, value);
      if (Object.keys(diff).length > 0) result[key] = diff;
      return;
    }
    if (!isDeepEqual(value, baseValue)) {
      result[key] = value;
    }
  });
  return result;
}

export function mergeWidgetChatPolicy(
  base: WidgetChatPolicyConfig,
  override?: WidgetChatPolicyConfig | null
): WidgetChatPolicyConfig {
  if (!override) return { ...base };
  return {
    ...base,
    ...override,
    launcher: {
      ...base.launcher,
      ...(override.launcher || {}),
      container: {
        ...(base.launcher?.container || {}),
        ...(override.launcher?.container || {}),
      },
    },
    iframe: {
      ...base.iframe,
      ...(override.iframe || {}),
    },
    theme: {
      ...base.theme,
      ...(override.theme || {}),
    },
  };
}

export function mergeConversationFeatureProviders(
  base?: ConversationFeaturesProviderShape | null,
  override?: ConversationFeaturesProviderShape | null
): ConversationFeaturesProviderShape | null {
  if (!base && !override) return null;
  if (!base) return override ? { ...override } : null;
  if (!override) return { ...base };

  const next: ConversationFeaturesProviderShape = { ...base };

  if (override.widget) {
    next.widget = mergeWidgetChatPolicy(base.widget || {}, override.widget);
  }

  if (override.features) {
    next.features = deepMerge({ ...(base.features || {}) }, override.features as PlainRecord);
  }

  if (override.debug) {
    next.debug = deepMerge({ ...(base.debug || {}) }, override.debug as PlainRecord);
  }

  if (override.setup_ui) {
    next.setup_ui = deepMerge({ ...(base.setup_ui || {}) }, override.setup_ui as PlainRecord);
  }

  return next;
}

export function diffConversationFeatureProviders(
  base?: ConversationFeaturesProviderShape | null,
  next?: ConversationFeaturesProviderShape | null
): ConversationFeaturesProviderShape | null {
  if (!next) return null;
  if (!base) return { ...next };

  const diff: ConversationFeaturesProviderShape = {};

  if (next.widget) {
    const widgetDiff = diffPlainObject((base.widget || {}) as PlainRecord, next.widget as PlainRecord);
    if (Object.keys(widgetDiff).length > 0) {
      diff.widget = widgetDiff as ConversationFeaturesProviderShape["widget"];
    }
  }

  if (next.features) {
    const featuresDiff = diffPlainObject((base.features || {}) as PlainRecord, next.features as PlainRecord);
    if (Object.keys(featuresDiff).length > 0) diff.features = featuresDiff as ConversationFeaturesProviderShape["features"];
  }

  if (next.debug) {
    const debugDiff = diffPlainObject((base.debug || {}) as PlainRecord, next.debug as PlainRecord);
    if (Object.keys(debugDiff).length > 0) diff.debug = debugDiff as ConversationFeaturesProviderShape["debug"];
  }

  if (next.setup_ui) {
    const setupDiff = diffPlainObject((base.setup_ui || {}) as PlainRecord, next.setup_ui as PlainRecord);
    if (Object.keys(setupDiff).length > 0) diff.setup_ui = setupDiff as ConversationFeaturesProviderShape["setup_ui"];
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

export function readConversationFeatureProvider(input: unknown): ConversationFeaturesProviderShape | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return normalizeConversationFeatureProvider(input as ConversationFeaturesProviderShape);
}
