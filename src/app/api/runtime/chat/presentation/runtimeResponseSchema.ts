import type { RuntimeChoiceItem, RuntimeQuickReply, RuntimeQuickReplyConfig } from "./ui-responseDecorators";
import type { RuntimeUiTypeId } from "@/components/design-system/conversation/runtimeUiCatalog";

export type RuntimeUiHints = {
  view?: "text" | "choice" | "cards";
  choice_mode?: "single" | "multi";
  ui_type_id?: RuntimeUiTypeId;
};

export type RuntimeCard = {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image_url?: string | null;
  value?: string;
};

export type RuntimeResponseSchema = {
  message: string | null;
  ui_hints: RuntimeUiHints;
  quick_replies: RuntimeQuickReply[];
  quick_reply_config: RuntimeQuickReplyConfig | null;
  cards: RuntimeCard[];
  choice_items?: RuntimeChoiceItem[];
};

export type RuntimeResponderPayload = Record<string, any> & {
  message?: unknown;
  quick_replies?: RuntimeQuickReply[];
  quick_reply_config?: RuntimeQuickReplyConfig | null;
  product_cards?: RuntimeCard[];
  choice_items?: RuntimeChoiceItem[];
};

export function extractRuntimeCards(payload: Record<string, any>) {
  const productCardsRaw = payload["product_cards"];
  const productCards = Array.isArray(productCardsRaw) ? (productCardsRaw as RuntimeCard[]) : [];
  return productCards;
}

export function extractRuntimeChoiceItems(payload: Record<string, any>) {
  const raw = payload["choice_items"];
  return Array.isArray(raw) ? (raw as RuntimeChoiceItem[]) : [];
}

export function buildRuntimeResponseSchema(input: {
  message: unknown;
  quickReplies: RuntimeQuickReply[];
  quickReplyConfig: RuntimeQuickReplyConfig | null;
  cards: RuntimeCard[];
  choiceItems: RuntimeChoiceItem[];
  decidedView: "text" | "choice" | "cards";
  decidedChoiceMode: "single" | "multi";
  decidedUiTypeId: RuntimeUiTypeId;
}): RuntimeResponseSchema {
  const message = typeof input.message === "string" ? input.message : null;
  const cards = Array.isArray(input.cards) ? input.cards : [];
  const quickReplies = Array.isArray(input.quickReplies) ? input.quickReplies : [];
  const quickReplyConfig = input.quickReplyConfig || null;
  const uiHints: RuntimeUiHints = {
    view: input.decidedView,
    choice_mode: input.decidedChoiceMode,
    ui_type_id: input.decidedUiTypeId,
  };
  return {
    message,
    ui_hints: uiHints,
    quick_replies: quickReplies,
    quick_reply_config: quickReplyConfig,
    cards,
    choice_items: input.choiceItems.length > 0 ? input.choiceItems : undefined,
  };
}

export function validateRuntimeResponseSchema(schema: RuntimeResponseSchema) {
  const issues: string[] = [];
  if (!schema || typeof schema !== "object") {
    return { ok: false, issues: ["schema_not_object"] };
  }
  if (!["text", "choice", "cards"].includes(String(schema.ui_hints?.view || ""))) {
    issues.push("invalid_ui_hints_view");
  }
  if (schema.ui_hints?.view === "cards" && (!Array.isArray(schema.cards) || schema.cards.length === 0)) {
    issues.push("cards_view_without_cards");
  }
  if (schema.quick_reply_config && (!Array.isArray(schema.quick_replies) || schema.quick_replies.length === 0)) {
    issues.push("quick_reply_config_without_quick_replies");
  }
  return { ok: issues.length === 0, issues };
}

