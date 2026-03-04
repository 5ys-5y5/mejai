import {
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeaturesOverride,
  type ExistingSetupFieldKey,
  type ExistingSetupLabelKey,
  type SetupFieldKey,
} from "@/lib/conversation/pageFeaturePolicy";

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

function pickSetupFields(
  setupFields?: Partial<
    Record<
      string,
      {
        order?: SetupFieldKey[];
        labels?: Partial<Record<SetupFieldKey, string>>;
        existing_order?: ExistingSetupFieldKey[];
        existing_labels?: Partial<Record<ExistingSetupLabelKey, string>>;
      }
    >
  >
): WidgetChatPolicyRecord["settings_ui"] extends { setup_fields?: infer T } ? T : undefined {
  if (!setupFields) return undefined;
  if (setupFields[WIDGET_PAGE_KEY]) return setupFields[WIDGET_PAGE_KEY];
  if (setupFields["/"]) return setupFields["/"];
  const firstKey = Object.keys(setupFields)[0];
  return firstKey ? setupFields[firstKey] : undefined;
}

export function normalizeWidgetChatPolicyRecord(input: unknown): WidgetChatPolicyRecord | null {
  if (!input) return null;
  if (isProviderShape(input)) {
    const provider = input as ConversationFeaturesProviderShape;
    const page = pickPageOverride(provider.pages);
    const setupFields = pickSetupFields(provider.settings_ui?.setup_fields);
    return {
      ...(page ? { page } : {}),
      ...(setupFields ? { settings_ui: { setup_fields: setupFields } } : {}),
    };
  }
  if (isPlainObject(input) && ("page" in input || "settings_ui" in input)) {
    const page = isPlainObject((input as WidgetChatPolicyRecord).page) ? (input as WidgetChatPolicyRecord).page : undefined;
    const setupFields = isPlainObject((input as WidgetChatPolicyRecord).settings_ui)
      ? (input as WidgetChatPolicyRecord).settings_ui?.setup_fields
      : undefined;
    return {
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
  const pages = record.page ? { [WIDGET_PAGE_KEY]: record.page } : undefined;
  const setupFields = record.settings_ui?.setup_fields
    ? { [WIDGET_PAGE_KEY]: record.settings_ui.setup_fields }
    : undefined;
  return {
    ...(pages ? { pages } : {}),
    ...(setupFields ? { settings_ui: { setup_fields: setupFields } } : {}),
  };
}

export function normalizeWidgetChatPolicyRecordFromProvider(input: unknown): WidgetChatPolicyRecord | null {
  const record = normalizeWidgetChatPolicyRecord(input);
  if (!record) return null;
  return {
    ...(record.page ? { page: record.page } : {}),
    ...(record.settings_ui?.setup_fields ? { settings_ui: { setup_fields: record.settings_ui.setup_fields } } : {}),
  };
}
