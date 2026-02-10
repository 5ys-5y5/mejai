import type { RuntimeQuickReply, RuntimeQuickReplyConfig } from "../presentation/ui-responseDecorators";
import type { RuntimeCard } from "../presentation/runtimeResponseSchema";
import { RUNTIME_UI_PROMPT_RULES, type RuntimeUiTypeId } from "@/components/design-system/conversation/runtimeUiCatalog";

export type QuickReplySourceType = "explicit" | "config" | "fallback" | "none";

export type PromptKind =
  | "lead_day"
  | "intent_disambiguation"
  | "restock_product_choice"
  | "restock_subscribe_confirm"
  | "restock_subscribe_phone"
  | "restock_post_subscribe"
  | "restock_alternative_confirm"
  | null;

export type RenderPlan = {
  view: "text" | "choice" | "cards";
  ui_type_id: RuntimeUiTypeId;
  enable_quick_replies: boolean;
  enable_cards: boolean;
  interaction_scope: "latest_only" | "any";
  quick_reply_source: {
    type: QuickReplySourceType;
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
  selection_mode: "single" | "multi";
  min_select: number;
  max_select: number;
  submit_format: "single" | "csv";
  grid_columns: {
    quick_replies: number;
    cards: number;
  };
  prompt_kind: PromptKind;
  debug?: {
    policy_version: string;
    quick_replies_count: number;
    cards_count: number;
    selection_mode_source: "config" | "prompt" | "default";
    min_select_source: "config" | "prompt" | "default";
    max_select_source: "config" | "default";
    submit_format_source: "config" | "default";
  };
};

export const RENDER_POLICY = {
  version: "v1",
  interaction_scope: "latest_only",
  quick_reply_sources: {
    explicit: true,
    config: true,
    fallback: true,
  },
  grid_max_columns: {
    quick_replies: 3,
    cards: 3,
  },
  prompt_rules: {
    lead_day_prompt_keyword: RUNTIME_UI_PROMPT_RULES.leadDayPromptKeyword,
    intent_disambiguation_keywords: [...RUNTIME_UI_PROMPT_RULES.intentDisambiguationKeywords],
    min_select_regex: RUNTIME_UI_PROMPT_RULES.minSelectRegex,
    criteria_map: RUNTIME_UI_PROMPT_RULES.criteriaMap,
  },
} as const;

type UiTypeResolve = {
  uiTypeId: RuntimeUiTypeId;
  fallbackReason: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseMinSelectFromText(text: string) {
  const match = String(text || "").match(RENDER_POLICY.prompt_rules.min_select_regex);
  const n = match ? Number(match[1]) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function hasLeadDayShape(text: string, quickReplies: RuntimeQuickReply[]) {
  if (!text || quickReplies.length === 0) return false;
  if (text.includes(RENDER_POLICY.prompt_rules.lead_day_prompt_keyword)) return true;
  return quickReplies.every((item) => /^D-\d+$/i.test(String(item.label || "").trim()));
}

function hasIntentDisambiguationShape(text: string, quickReplies: RuntimeQuickReply[]) {
  if (!text || quickReplies.length === 0) return false;
  const keywords = RENDER_POLICY.prompt_rules.intent_disambiguation_keywords;
  if (!keywords.every((keyword) => text.includes(keyword))) return false;
  return quickReplies.every((item) => /^\d{1,2}$/.test(String(item.value || "").trim()));
}

function resolvePromptKindByCriteria(criteria: string): PromptKind {
  if (!criteria) return null;
  const map = RENDER_POLICY.prompt_rules.criteria_map;
  const rules: Array<{ kind: PromptKind; keys: readonly string[] }> = [
    { kind: "lead_day", keys: map.lead_day },
    { kind: "intent_disambiguation", keys: map.intent_disambiguation },
    { kind: "restock_product_choice", keys: map.restock_product_choice },
    { kind: "restock_subscribe_confirm", keys: map.restock_subscribe_confirm },
    { kind: "restock_subscribe_phone", keys: map.restock_subscribe_phone },
    { kind: "restock_post_subscribe", keys: map.restock_post_subscribe },
    { kind: "restock_alternative_confirm", keys: map.restock_alternative_confirm },
  ];
  for (const rule of rules) {
    if (rule.keys.some((key) => criteria.includes(key))) return rule.kind;
  }
  return null;
}

function resolvePromptKind(
  text: string,
  quickReplies: RuntimeQuickReply[],
  quickReplyConfig: RuntimeQuickReplyConfig | null
): PromptKind {
  const criteria = String(quickReplyConfig?.criteria || "").trim();
  const byCriteria = resolvePromptKindByCriteria(criteria);
  if (byCriteria) return byCriteria;
  if (hasLeadDayShape(text, quickReplies)) return "lead_day";
  if (hasIntentDisambiguationShape(text, quickReplies)) return "intent_disambiguation";
  return null;
}

function resolveUiType(view: RenderPlan["view"], promptKind: PromptKind): UiTypeResolve {
  if (view === "cards") {
    if (promptKind === "restock_product_choice") {
      return { uiTypeId: "cards.restock_product_choice", fallbackReason: null };
    }
    return { uiTypeId: "cards.generic", fallbackReason: `cards:${String(promptKind || "unknown")}` };
  }

  if (view === "choice") {
    if (promptKind === "lead_day") return { uiTypeId: "choice.lead_day", fallbackReason: null };
    if (promptKind === "intent_disambiguation") {
      return { uiTypeId: "choice.intent_disambiguation", fallbackReason: null };
    }
    return { uiTypeId: "choice.generic", fallbackReason: `choice:${String(promptKind || "unknown")}` };
  }

  return { uiTypeId: "text.default", fallbackReason: "text:default" };
}

function warnRenderFallback(input: {
  fallbackReason: string | null;
  view: RenderPlan["view"];
  promptKind: PromptKind;
  quickRepliesCount: number;
  cardsCount: number;
}) {
  if (!input.fallbackReason) return;
  console.warn(
    `[renderPolicy:fallback] reason=${input.fallbackReason} view=${input.view} promptKind=${String(
      input.promptKind
    )} quickReplies=${input.quickRepliesCount} cards=${input.cardsCount}`
  );
}

function isQuickReplySourceAllowed(type: QuickReplySourceType) {
  if (type === "explicit") return RENDER_POLICY.quick_reply_sources.explicit;
  if (type === "config") return RENDER_POLICY.quick_reply_sources.config;
  if (type === "fallback") return RENDER_POLICY.quick_reply_sources.fallback;
  return false;
}

function decideView(input: {
  quickReplies: RuntimeQuickReply[];
  cards: RuntimeCard[];
  quickReplySourceType: QuickReplySourceType;
}): Pick<RenderPlan, "view" | "enable_cards" | "enable_quick_replies"> {
  const hasImageCards = input.cards.some((card) => String(card?.image_url || "").trim() !== "");
  const enableCards = hasImageCards;
  const allowQuickReplies = isQuickReplySourceAllowed(input.quickReplySourceType);
  const enableQuickReplies = input.quickReplies.length > 0 && allowQuickReplies && !enableCards;
  const view: RenderPlan["view"] = enableCards ? "cards" : enableQuickReplies ? "choice" : "text";
  return { view, enable_cards: enableCards, enable_quick_replies: enableQuickReplies };
}

export function buildRenderPlan(input: {
  message: string | null;
  quickReplies: RuntimeQuickReply[];
  quickReplyConfig: RuntimeQuickReplyConfig | null;
  cards: RuntimeCard[];
  quickReplySource: RenderPlan["quick_reply_source"];
}): RenderPlan {
  const message = String(input.message || "");
  const quickReplies = Array.isArray(input.quickReplies) ? input.quickReplies : [];
  const cards = Array.isArray(input.cards) ? input.cards : [];

  const promptKind = resolvePromptKind(message, quickReplies, input.quickReplyConfig);
  const promptSuggestsMulti = promptKind === "lead_day" || promptKind === "intent_disambiguation";

  const selectionMode = input.quickReplyConfig?.selection_mode || (promptSuggestsMulti ? "multi" : "single");
  const minSelect = input.quickReplyConfig?.min_select ?? (promptSuggestsMulti ? parseMinSelectFromText(message) : 1);
  const maxSelect = input.quickReplyConfig?.max_select ?? (selectionMode === "multi" ? quickReplies.length : 1);
  const submitFormat = input.quickReplyConfig?.submit_format ?? (selectionMode === "multi" ? "csv" : "single");

  const selectionModeSource = input.quickReplyConfig?.selection_mode ? "config" : promptSuggestsMulti ? "prompt" : "default";
  const minSelectSource = input.quickReplyConfig?.min_select ? "config" : promptSuggestsMulti ? "prompt" : "default";
  const maxSelectSource = input.quickReplyConfig?.max_select ? "config" : "default";
  const submitFormatSource = input.quickReplyConfig?.submit_format ? "config" : "default";

  const viewDecision = decideView({
    quickReplies,
    cards,
    quickReplySourceType: input.quickReplySource.type,
  });

  const resolvedUi = resolveUiType(viewDecision.view, promptKind);
  warnRenderFallback({
    fallbackReason: resolvedUi.fallbackReason,
    view: viewDecision.view,
    promptKind,
    quickRepliesCount: quickReplies.length,
    cardsCount: cards.length,
  });

  return {
    view: viewDecision.view,
    ui_type_id: resolvedUi.uiTypeId,
    enable_quick_replies: viewDecision.enable_quick_replies,
    enable_cards: viewDecision.enable_cards,
    interaction_scope: RENDER_POLICY.interaction_scope,
    quick_reply_source: input.quickReplySource,
    selection_mode: selectionMode === "multi" ? "multi" : "single",
    min_select: clamp(minSelect, 1, Math.max(1, maxSelect)),
    max_select: clamp(maxSelect, 1, Math.max(1, quickReplies.length || maxSelect || 1)),
    submit_format: submitFormat === "csv" ? "csv" : "single",
    grid_columns: {
      quick_replies: clamp(quickReplies.length || 1, 1, RENDER_POLICY.grid_max_columns.quick_replies),
      cards: clamp(cards.length || 1, 1, RENDER_POLICY.grid_max_columns.cards),
    },
    prompt_kind: promptKind,
    debug: {
      policy_version: RENDER_POLICY.version,
      quick_replies_count: quickReplies.length,
      cards_count: cards.length,
      selection_mode_source: selectionModeSource,
      min_select_source: minSelectSource,
      max_select_source: maxSelectSource,
      submit_format_source: submitFormatSource,
    },
  };
}
