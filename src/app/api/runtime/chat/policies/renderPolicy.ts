import type { RuntimeQuickReply, RuntimeQuickReplyConfig } from "../presentation/ui-responseDecorators";
import type { RuntimeCard } from "../presentation/runtimeResponseSchema";

export type QuickReplySourceType = "explicit" | "config" | "fallback" | "none";

export type RenderPlan = {
  view: "text" | "choice" | "cards";
  enable_quick_replies: boolean;
  enable_cards: boolean;
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
  prompt_kind:
    | "lead_day"
    | "intent_disambiguation"
    | "restock_product_choice"
    | "restock_subscribe_confirm"
    | "restock_subscribe_phone"
    | "restock_post_subscribe"
    | "restock_alternative_confirm"
    | null;
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
    lead_day_prompt_keyword: "예약 알림일을 선택해 주세요",
    intent_disambiguation_keywords: ["의도 확인", "복수 선택 가능"],
    min_select_regex: /최소\s*(\d+)/,
    criteria_map: {
      lead_day: ["ASK_RESTOCK_SUBSCRIBE_LEAD_DAYS", "restock_subscribe_lead_days"],
      intent_disambiguation: ["ASK_INTENT_DISAMBIGUATION", "intent_disambiguation"],
      restock_product_choice: ["ASK_RESTOCK_PRODUCT_CHOICE", "restock_product_choice", "not_in_target_fallback_choice"],
      restock_subscribe_confirm: ["ASK_RESTOCK_SUBSCRIBE_CONFIRM", "awaiting_subscribe_confirm"],
      restock_subscribe_phone: ["ASK_RESTOCK_SUBSCRIBE_PHONE", "awaiting_subscribe_phone"],
      restock_post_subscribe: ["post_subscribe_next_step"],
      restock_alternative_confirm: ["ASK_ALTERNATIVE_RESTOCK_TARGET_CONFIRM", "awaiting_non_target_alternative_confirm"],
    },
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseMinSelectFromText(text: string) {
  const match = String(text || "").match(RENDER_POLICY.prompt_rules.min_select_regex);
  const n = match ? Number(match[1]) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function looksLikeLeadDayPrompt(text: string, quickReplies: RuntimeQuickReply[]) {
  if (!text || quickReplies.length === 0) return false;
  if (text.includes(RENDER_POLICY.prompt_rules.lead_day_prompt_keyword)) return true;
  return quickReplies.every((item) => /^D-\d+$/i.test(String(item.label || "").trim()));
}

function looksLikeIntentDisambiguationPrompt(text: string, quickReplies: RuntimeQuickReply[]) {
  if (!text || quickReplies.length === 0) return false;
  const keywords = RENDER_POLICY.prompt_rules.intent_disambiguation_keywords;
  if (!keywords.every((keyword) => text.includes(keyword))) return false;
  return quickReplies.every((item) => /^\d{1,2}$/.test(String(item.value || "").trim()));
}

function resolvePromptKind(
  text: string,
  quickReplies: RuntimeQuickReply[],
  quickReplyConfig: RuntimeQuickReplyConfig | null
) {
  const criteria = String(quickReplyConfig?.criteria || "").trim();
  if (criteria) {
    const map = RENDER_POLICY.prompt_rules.criteria_map;
    if (map.lead_day.some((key) => criteria.includes(key))) return "lead_day" as const;
    if (map.intent_disambiguation.some((key) => criteria.includes(key))) return "intent_disambiguation" as const;
    if (map.restock_product_choice.some((key) => criteria.includes(key))) return "restock_product_choice" as const;
    if (map.restock_subscribe_confirm.some((key) => criteria.includes(key))) return "restock_subscribe_confirm" as const;
    if (map.restock_subscribe_phone.some((key) => criteria.includes(key))) return "restock_subscribe_phone" as const;
    if (map.restock_post_subscribe.some((key) => criteria.includes(key))) return "restock_post_subscribe" as const;
    if (map.restock_alternative_confirm.some((key) => criteria.includes(key))) return "restock_alternative_confirm" as const;
  }
  if (looksLikeLeadDayPrompt(text, quickReplies)) return "lead_day" as const;
  if (looksLikeIntentDisambiguationPrompt(text, quickReplies)) return "intent_disambiguation" as const;
  return null;
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
  const fallbackMulti = promptKind === "lead_day" || promptKind === "intent_disambiguation";
  const selectionMode =
    input.quickReplyConfig?.selection_mode || (fallbackMulti ? "multi" : "single");
  const selectionModeSource = input.quickReplyConfig?.selection_mode
    ? "config"
    : fallbackMulti
      ? "prompt"
      : "default";
  const minSelect = input.quickReplyConfig?.min_select ?? (fallbackMulti ? parseMinSelectFromText(message) : 1);
  const minSelectSource = input.quickReplyConfig?.min_select
    ? "config"
    : fallbackMulti
      ? "prompt"
      : "default";
  const maxSelect = input.quickReplyConfig?.max_select ?? (selectionMode === "multi" ? quickReplies.length : 1);
  const maxSelectSource = input.quickReplyConfig?.max_select ? "config" : "default";
  const submitFormat = input.quickReplyConfig?.submit_format ?? (selectionMode === "multi" ? "csv" : "single");
  const submitFormatSource = input.quickReplyConfig?.submit_format ? "config" : "default";

  const allowBySource =
    input.quickReplySource.type === "explicit"
      ? RENDER_POLICY.quick_reply_sources.explicit
      : input.quickReplySource.type === "config"
        ? RENDER_POLICY.quick_reply_sources.config
        : input.quickReplySource.type === "fallback"
          ? RENDER_POLICY.quick_reply_sources.fallback
          : false;

  const enableQuickReplies = quickReplies.length > 0 && allowBySource;
  const enableCards = cards.length > 0;
  const view: RenderPlan["view"] = enableCards ? "cards" : enableQuickReplies ? "choice" : "text";

  return {
    view,
    enable_quick_replies: enableQuickReplies,
    enable_cards: enableCards,
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
