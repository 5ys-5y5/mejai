import type { TranscriptMessage } from "@/lib/debugTranscript";

export type RuntimeRunResponseLike = {
  turn_id?: string | null;
  quick_replies?: Array<{ label?: string; value?: string }>;
  quick_reply_config?: {
    selection_mode?: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
  product_cards?: Array<{
    id?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    image_url?: string | null;
    value?: string;
  }>;
  response_schema?: {
    message?: string | null;
    ui_hints?: { view?: "text" | "choice" | "cards"; choice_mode?: "single" | "multi" };
    quick_replies?: Array<{ label?: string; value?: string }>;
    quick_reply_config?: {
      selection_mode?: "single" | "multi";
      min_select?: number;
      max_select?: number;
      submit_format?: "single" | "csv";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    } | null;
    cards?: Array<Record<string, unknown>>;
  };
  response_schema_issues?: string[];
  render_plan?: {
    view?: "text" | "choice" | "cards";
    enable_quick_replies?: boolean;
    enable_cards?: boolean;
    quick_reply_source?: {
      type?: "explicit" | "config" | "fallback" | "none";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    };
    selection_mode?: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    grid_columns?: { quick_replies?: number; cards?: number };
    prompt_kind?:
      | "lead_day"
      | "intent_disambiguation"
      | "restock_product_choice"
      | "restock_subscribe_confirm"
      | "restock_subscribe_phone"
      | "restock_post_subscribe"
      | "restock_alternative_confirm"
      | null;
    debug?: {
      policy_version?: string;
      quick_replies_count?: number;
      cards_count?: number;
      selection_mode_source?: "config" | "prompt" | "default";
      min_select_source?: "config" | "prompt" | "default";
      max_select_source?: "config" | "default";
      submit_format_source?: "config" | "default";
    };
  };
};

export function mapRuntimeResponseToTranscriptFields(res: RuntimeRunResponseLike) {
  const responseSchema: TranscriptMessage["responseSchema"] =
    res.response_schema && typeof res.response_schema === "object"
      ? {
          message:
            typeof res.response_schema.message === "string" || res.response_schema.message === null
              ? res.response_schema.message
              : null,
          ui_hints:
            res.response_schema.ui_hints && typeof res.response_schema.ui_hints === "object"
              ? {
                  view:
                    res.response_schema.ui_hints.view === "choice" || res.response_schema.ui_hints.view === "cards"
                      ? res.response_schema.ui_hints.view
                      : "text",
                  choice_mode: res.response_schema.ui_hints.choice_mode === "multi" ? "multi" : "single",
                }
              : { view: "text", choice_mode: "single" },
          quick_replies: Array.isArray(res.response_schema.quick_replies)
            ? res.response_schema.quick_replies
                .map((item) => ({
                  label: String(item?.label || item?.value || "").trim(),
                  value: String(item?.value || item?.label || "").trim(),
                }))
                .filter((item) => item.label && item.value)
            : [],
          cards: Array.isArray(res.response_schema.cards) ? (res.response_schema.cards as Array<Record<string, unknown>>) : [],
        }
      : undefined;

  const quickReplyConfig: TranscriptMessage["quickReplyConfig"] =
    res.response_schema?.quick_reply_config && typeof res.response_schema.quick_reply_config === "object"
      ? {
          selection_mode: res.response_schema.quick_reply_config.selection_mode === "multi" ? "multi" : "single",
          min_select: Number.isFinite(Number(res.response_schema.quick_reply_config.min_select))
            ? Number(res.response_schema.quick_reply_config.min_select)
            : undefined,
          max_select: Number.isFinite(Number(res.response_schema.quick_reply_config.max_select))
            ? Number(res.response_schema.quick_reply_config.max_select)
            : undefined,
          submit_format: res.response_schema.quick_reply_config.submit_format === "csv" ? "csv" : "single",
          criteria: String(res.response_schema.quick_reply_config.criteria || "").trim() || undefined,
          source_function: String(res.response_schema.quick_reply_config.source_function || "").trim() || undefined,
          source_module: String(res.response_schema.quick_reply_config.source_module || "").trim() || undefined,
        }
      : undefined;

  const responseSchemaIssues = Array.isArray(res.response_schema_issues)
    ? res.response_schema_issues.map((item) => String(item || "").trim()).filter(Boolean)
    : undefined;

  const renderPlan: TranscriptMessage["renderPlan"] =
    res.render_plan && typeof res.render_plan === "object"
      ? {
          view: res.render_plan.view === "choice" || res.render_plan.view === "cards" ? res.render_plan.view : "text",
          enable_quick_replies: Boolean(res.render_plan.enable_quick_replies),
          enable_cards: Boolean(res.render_plan.enable_cards),
          quick_reply_source:
            res.render_plan.quick_reply_source && typeof res.render_plan.quick_reply_source === "object"
              ? {
                  type:
                    res.render_plan.quick_reply_source.type === "explicit" ||
                    res.render_plan.quick_reply_source.type === "config" ||
                    res.render_plan.quick_reply_source.type === "fallback"
                      ? res.render_plan.quick_reply_source.type
                      : "none",
                  criteria: String(res.render_plan.quick_reply_source.criteria || "").trim() || undefined,
                  source_function: String(res.render_plan.quick_reply_source.source_function || "").trim() || undefined,
                  source_module: String(res.render_plan.quick_reply_source.source_module || "").trim() || undefined,
                }
              : { type: "none" },
          selection_mode: res.render_plan.selection_mode === "multi" ? "multi" : "single",
          min_select: Number.isFinite(Number(res.render_plan.min_select)) ? Number(res.render_plan.min_select) : 1,
          max_select: Number.isFinite(Number(res.render_plan.max_select)) ? Number(res.render_plan.max_select) : 1,
          submit_format: res.render_plan.submit_format === "csv" ? "csv" : "single",
          grid_columns: {
            quick_replies: Number.isFinite(Number(res.render_plan.grid_columns?.quick_replies))
              ? Number(res.render_plan.grid_columns?.quick_replies)
              : 1,
            cards: Number.isFinite(Number(res.render_plan.grid_columns?.cards))
              ? Number(res.render_plan.grid_columns?.cards)
              : 1,
          },
          prompt_kind:
            res.render_plan.prompt_kind === "lead_day" ||
            res.render_plan.prompt_kind === "intent_disambiguation" ||
            res.render_plan.prompt_kind === "restock_product_choice" ||
            res.render_plan.prompt_kind === "restock_subscribe_confirm" ||
            res.render_plan.prompt_kind === "restock_subscribe_phone" ||
            res.render_plan.prompt_kind === "restock_post_subscribe" ||
            res.render_plan.prompt_kind === "restock_alternative_confirm"
              ? res.render_plan.prompt_kind
              : null,
          debug:
            res.render_plan.debug && typeof res.render_plan.debug === "object"
              ? {
                  policy_version: String(res.render_plan.debug.policy_version || "").trim() || "unknown",
                  quick_replies_count: Number(res.render_plan.debug.quick_replies_count || 0),
                  cards_count: Number(res.render_plan.debug.cards_count || 0),
                  selection_mode_source:
                    res.render_plan.debug.selection_mode_source === "config" ||
                    res.render_plan.debug.selection_mode_source === "prompt"
                      ? res.render_plan.debug.selection_mode_source
                      : "default",
                  min_select_source:
                    res.render_plan.debug.min_select_source === "config" ||
                    res.render_plan.debug.min_select_source === "prompt"
                      ? res.render_plan.debug.min_select_source
                      : "default",
                  max_select_source: res.render_plan.debug.max_select_source === "config" ? "config" : "default",
                  submit_format_source: res.render_plan.debug.submit_format_source === "config" ? "config" : "default",
                }
              : undefined,
        }
      : undefined;

  const quickReplies = Array.isArray(res.quick_replies)
    ? res.quick_replies
        .map((item) => ({
          label: String(item?.label || item?.value || "").trim(),
          value: String(item?.value || item?.label || "").trim(),
        }))
        .filter((item) => item.label && item.value)
    : [];

  const fallbackQuickReplyConfig: TranscriptMessage["quickReplyConfig"] =
    res.quick_reply_config && typeof res.quick_reply_config === "object"
      ? {
          selection_mode: res.quick_reply_config.selection_mode === "multi" ? "multi" : "single",
          min_select: Number.isFinite(Number(res.quick_reply_config.min_select))
            ? Number(res.quick_reply_config.min_select)
            : undefined,
          max_select: Number.isFinite(Number(res.quick_reply_config.max_select))
            ? Number(res.quick_reply_config.max_select)
            : undefined,
          submit_format: res.quick_reply_config.submit_format === "csv" ? "csv" : "single",
          criteria: String(res.quick_reply_config.criteria || "").trim() || undefined,
          source_function: String(res.quick_reply_config.source_function || "").trim() || undefined,
          source_module: String(res.quick_reply_config.source_module || "").trim() || undefined,
        }
      : undefined;

  const productCards = Array.isArray(res.product_cards)
    ? res.product_cards
        .map((item, idx) => ({
          id: String(item?.id || `card-${idx}`).trim(),
          title: String(item?.title || "").trim(),
          subtitle: String(item?.subtitle || "").trim(),
          description: String(item?.description || "").trim(),
          imageUrl: String(item?.image_url || "").trim(),
          value: String(item?.value || "").trim(),
        }))
        .filter((item) => item.title && item.value)
    : [];

  return {
    turnId: res.turn_id || null,
    responseSchema,
    responseSchemaIssues,
    quickReplyConfig: quickReplyConfig || fallbackQuickReplyConfig,
    renderPlan,
    quickReplies,
    productCards,
  };
}
