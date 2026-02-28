export type WidgetVisibilityOverrides = {
  showHeader?: boolean;
  showLogo?: boolean;
  showStatus?: boolean;
  showTabBar?: boolean;
  showChatTab?: boolean;
  showListTab?: boolean;
  showPolicyTab?: boolean;
  showChatPanel?: boolean;
  showHistoryPanel?: boolean;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

export function readBooleanOverride(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === 0) return value === 1;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

type OverrideKeyMap = {
  prop: keyof WidgetVisibilityOverrides;
  query: string;
  datasetKeys: string[];
};

const OVERRIDE_KEYS: OverrideKeyMap[] = [
  { prop: "showHeader", query: "show_header", datasetKeys: ["showHeader", "show_header"] },
  { prop: "showLogo", query: "show_logo", datasetKeys: ["showLogo", "show_logo"] },
  { prop: "showStatus", query: "show_status", datasetKeys: ["showStatus", "show_status"] },
  { prop: "showTabBar", query: "show_tabbar", datasetKeys: ["showTabBar", "show_tabbar"] },
  { prop: "showChatTab", query: "show_chat_tab", datasetKeys: ["showChatTab", "show_chat_tab"] },
  { prop: "showListTab", query: "show_list_tab", datasetKeys: ["showListTab", "show_list_tab"] },
  { prop: "showPolicyTab", query: "show_policy_tab", datasetKeys: ["showPolicyTab", "show_policy_tab"] },
  { prop: "showChatPanel", query: "show_chat_panel", datasetKeys: ["showChatPanel", "show_chat_panel"] },
  { prop: "showHistoryPanel", query: "show_history_panel", datasetKeys: ["showHistoryPanel", "show_history_panel"] },
];

export function readWidgetVisibilityOverridesFromDataset(
  dataset: Record<string, string | undefined>
): WidgetVisibilityOverrides {
  const overrides: WidgetVisibilityOverrides = {};
  for (const entry of OVERRIDE_KEYS) {
    for (const key of entry.datasetKeys) {
      if (dataset[key] === undefined) continue;
      const parsed = readBooleanOverride(dataset[key]);
      if (parsed === undefined) continue;
      overrides[entry.prop] = parsed;
      break;
    }
  }
  return overrides;
}

export function readWidgetVisibilityOverridesFromSearchParams(
  params: URLSearchParams | null | undefined
): WidgetVisibilityOverrides {
  const overrides: WidgetVisibilityOverrides = {};
  if (!params) return overrides;
  for (const entry of OVERRIDE_KEYS) {
    const value = params.get(entry.query) ?? params.get(entry.query.replace(/_/g, "-")) ?? params.get(entry.prop);
    if (value === null) continue;
    const parsed = readBooleanOverride(value);
    if (parsed === undefined) continue;
    overrides[entry.prop] = parsed;
  }
  return overrides;
}

export function applyVisibilityOverride(base: boolean, override?: boolean): boolean {
  if (override === false) return false;
  if (override === true) return true;
  return base;
}

export function buildWidgetVisibilityQuery(overrides: WidgetVisibilityOverrides): string {
  const params = new URLSearchParams();
  for (const entry of OVERRIDE_KEYS) {
    const value = overrides[entry.prop];
    if (value === undefined) continue;
    params.set(entry.query, value ? "1" : "0");
  }
  return params.toString();
}
