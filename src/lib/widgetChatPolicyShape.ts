import {
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeaturesOverride,
  type ExistingSetupFieldKey,
  type ExistingSetupLabelKey,
  type SetupFieldKey,
  type ConversationSetupUiOverride,
  type WidgetChatPolicyConfig,
} from "@/lib/conversation/pageFeaturePolicy";
import type { DebugTranscriptOptions } from "@/lib/debugTranscript";

export type WidgetChatPolicyRecord = {
  page?: ConversationPageFeaturesOverride;
  settings_ui?: {
    setup_fields?: {
      order?: SetupFieldKey[];
      labels?: Partial<Record<SetupFieldKey, string>>;
      existing_order?: ExistingSetupFieldKey[];
      existing_labels?: Partial<Record<ExistingSetupLabelKey, string>>;
    };
  };
  widget?: WidgetChatPolicyConfig;
  features?: ConversationPageFeaturesOverride;
  debug?: DebugTranscriptOptions;
  setup_ui?: ConversationSetupUiOverride;
};

export type WidgetChatPolicyInput =
  | ConversationFeaturesProviderShape
  | WidgetChatPolicyRecord
  | ConversationPageFeaturesOverride
  | null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasPageKeyRecord(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return Object.keys(value).some((key) => key.startsWith("/"));
}

function isProviderShape(value: unknown): value is ConversationFeaturesProviderShape {
  if (!isPlainObject(value)) return false;
  if ("pages" in value || "debug_copy" in value || "page_registry" in value) return true;
  if ("settings_ui" in value && isPlainObject(value.settings_ui)) {
    const setupFields = value.settings_ui["setup_fields"];
    if (hasPageKeyRecord(setupFields)) return true;
  }
  return false;
}

function isPageOverrideCandidate(value: unknown): value is ConversationPageFeaturesOverride {
  if (!isPlainObject(value)) return false;
  return (
    "adminPanel" in value ||
    "interaction" in value ||
    "setup" in value ||
    "visibility" in value ||
    "mcp" in value
  );
}

function pickPageOverride(
  pages?: Partial<Record<string, ConversationPageFeaturesOverride>>
): ConversationPageFeaturesOverride | undefined {
  if (!pages) return undefined;
  if (pages[WIDGET_PAGE_KEY]) return pages[WIDGET_PAGE_KEY];
  if (pages["/"]) return pages["/"];
  const firstKey = Object.keys(pages)[0];
  return firstKey ? pages[firstKey] : undefined;
}

type SetupFieldsRecord = {
  order?: SetupFieldKey[];
  labels?: Partial<Record<SetupFieldKey, string>>;
  existing_order?: ExistingSetupFieldKey[];
  existing_labels?: Partial<Record<ExistingSetupLabelKey, string>>;
};

function pickSetupFields(
  setupFields?: Partial<Record<string, SetupFieldsRecord>>
): SetupFieldsRecord | undefined {
  if (!setupFields) return undefined;
  if (setupFields[WIDGET_PAGE_KEY]) return setupFields[WIDGET_PAGE_KEY];
  if (setupFields["/"]) return setupFields["/"];
  const firstKey = Object.keys(setupFields)[0];
  return firstKey ? setupFields[firstKey] : undefined;
}

function pickDebugCopy(
  debugCopy?: Partial<Record<string, Partial<DebugTranscriptOptions>>>
): DebugTranscriptOptions | undefined {
  if (!debugCopy) return undefined;
  if (debugCopy[WIDGET_PAGE_KEY]) return debugCopy[WIDGET_PAGE_KEY] as DebugTranscriptOptions;
  if (debugCopy["/"]) return debugCopy["/"] as DebugTranscriptOptions;
  const firstKey = Object.keys(debugCopy)[0];
  return firstKey ? (debugCopy[firstKey] as DebugTranscriptOptions) : undefined;
}

export function normalizeWidgetChatPolicyRecord(input: unknown): WidgetChatPolicyRecord | null {
  if (!input) return null;
  if (isProviderShape(input)) {
    const provider = input as ConversationFeaturesProviderShape;
    const page = pickPageOverride(provider.pages);
    const setupFields = pickSetupFields(provider.settings_ui?.setup_fields);
    const debugCopy = pickDebugCopy(provider.debug_copy);
    const setupUiFromSettings = setupFields
      ? {
          order: setupFields.order,
          labels: setupFields.labels,
          existing_order: setupFields.existing_order,
          existing_labels: setupFields.existing_labels,
        }
      : undefined;
    return {
      ...(provider.widget ? { widget: provider.widget } : {}),
      ...(provider.features ? { features: provider.features } : {}),
      ...(provider.debug ? { debug: provider.debug } : debugCopy ? { debug: debugCopy } : {}),
      ...(provider.setup_ui ? { setup_ui: provider.setup_ui } : setupUiFromSettings ? { setup_ui: setupUiFromSettings } : {}),
      ...(page ? { page } : {}),
      ...(setupFields ? { settings_ui: { setup_fields: setupFields } } : {}),
    };
  }
  if (isPlainObject(input) && ("page" in input || "settings_ui" in input || "widget" in input || "features" in input || "debug" in input || "setup_ui" in input)) {
    const page = isPlainObject((input as WidgetChatPolicyRecord).page) ? (input as WidgetChatPolicyRecord).page : undefined;
    const setupFields = isPlainObject((input as WidgetChatPolicyRecord).settings_ui)
      ? (input as WidgetChatPolicyRecord).settings_ui?.setup_fields
      : undefined;
    return {
      ...(isPlainObject((input as WidgetChatPolicyRecord).widget) ? { widget: (input as WidgetChatPolicyRecord).widget } : {}),
      ...(isPlainObject((input as WidgetChatPolicyRecord).features) ? { features: (input as WidgetChatPolicyRecord).features } : {}),
      ...(isPlainObject((input as WidgetChatPolicyRecord).debug) ? { debug: (input as WidgetChatPolicyRecord).debug } : {}),
      ...(isPlainObject((input as WidgetChatPolicyRecord).setup_ui) ? { setup_ui: (input as WidgetChatPolicyRecord).setup_ui } : {}),
      ...(page ? { page } : {}),
      ...(setupFields ? { settings_ui: { setup_fields: setupFields } } : {}),
    };
  }
  if (isPageOverrideCandidate(input)) {
    return { page: input as ConversationPageFeaturesOverride };
  }
  return null;
}

export function normalizeWidgetChatPolicyProvider(input: unknown): ConversationFeaturesProviderShape | null {
  if (!input) return null;
  if (isProviderShape(input)) return input as ConversationFeaturesProviderShape;
  const record = normalizeWidgetChatPolicyRecord(input);
  if (!record) return null;
  const pageOverride = record.features ?? record.page;
  const pages = pageOverride ? { [WIDGET_PAGE_KEY]: pageOverride } : undefined;
  const setupFields = record.settings_ui?.setup_fields
    ? { [WIDGET_PAGE_KEY]: record.settings_ui.setup_fields }
    : record.setup_ui
      ? {
          [WIDGET_PAGE_KEY]: {
            order: record.setup_ui.order,
            labels: record.setup_ui.labels,
            existing_order: record.setup_ui.existing_order,
            existing_labels: record.setup_ui.existing_labels,
          },
        }
      : undefined;
  const debugCopy = record.debug ? { [WIDGET_PAGE_KEY]: record.debug } : undefined;
  return {
    ...(record.widget ? { widget: record.widget } : {}),
    ...(record.features ? { features: record.features } : {}),
    ...(record.debug ? { debug: record.debug } : {}),
    ...(record.setup_ui ? { setup_ui: record.setup_ui } : {}),
    ...(pages ? { pages } : {}),
    ...(debugCopy ? { debug_copy: debugCopy } : {}),
    ...(setupFields ? { settings_ui: { setup_fields: setupFields } } : {}),
  };
}

export function normalizeWidgetChatPolicyRecordFromProvider(input: unknown): WidgetChatPolicyRecord | null {
  const record = normalizeWidgetChatPolicyRecord(input);
  if (!record) return null;
  return {
    ...(record.widget ? { widget: record.widget } : {}),
    ...(record.features ? { features: record.features } : {}),
    ...(record.debug ? { debug: record.debug } : {}),
    ...(record.setup_ui ? { setup_ui: record.setup_ui } : {}),
    ...(record.page ? { page: record.page } : {}),
    ...(record.settings_ui?.setup_fields ? { settings_ui: { setup_fields: record.settings_ui.setup_fields } } : {}),
  };
}
