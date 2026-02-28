type IntentScopeSpec = {
  intent: string;
  required_slots: string[];
  slot_prompt_template_key: "restock_need_product" | "faq_need_question_scope";
  ask_action: string;
  expected_input: string;
};

const INTENT_SCOPE_SPEC: Record<string, IntentScopeSpec> = {
  restock_inquiry: {
    intent: "restock_inquiry",
    required_slots: ["product_query"],
    slot_prompt_template_key: "restock_need_product",
    ask_action: "ASK_PRODUCT_NAME_FOR_RESTOCK",
    expected_input: "product_query",
  },
  faq: {
    intent: "faq",
    required_slots: ["question_scope"],
    slot_prompt_template_key: "faq_need_question_scope",
    ask_action: "ASK_FAQ_QUESTION_SCOPE",
    expected_input: "question_scope",
  },
};

type GateInput = {
  resolvedIntent: string;
  message: string;
  effectiveMessageForIntent: string;
  policyEntity: Record<string, any>;
  prevBotContext: Record<string, any>;
  expectedInput: string | null;
};

type GateResult = {
  enabled: boolean;
  spec: IntentScopeSpec | null;
  resolved_slots: Record<string, string | null>;
  missing_slots: string[];
};

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isTooGenericRestockQuery(value: string) {
  const normalized = normalizeText(value).replace(/[^\p{L}\p{N}\s]/gu, "");
  if (!normalized) return true;
  const compact = normalized.replace(/\s+/g, "");
  const genericTokens = new Set([
    "??????,
    "?ш퀬",
    "?낃퀬",
    "?덉젅",
    "????????,
    "?낃퀬?뚮┝",
    "restock",
    "stock",
  ]);
  if (genericTokens.has(compact)) return true;
  const stripped = compact
    .replace(/??????g, "")
    .replace(/?ш퀬/g, "")
    .replace(/?낃퀬/g, "")
    .replace(/?덉젅/g, "")
    .replace(/?뚮┝/g, "")
    .replace(/restock/g, "")
    .replace(/stock/g, "")
    .trim();
  return stripped.length < 2;
}

function parseIndexedChoice(text: string): number | null {
  const normalized = String(text || "").trim();
  if (!normalized) return null;
  const m = normalized.match(/^(\d+)\s*(?:???$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function resolveRestockChoiceToProductQuery(prevBotContext: Record<string, any>, message: string): string {
  const stage = String(prevBotContext.restock_stage || "").trim();
  if (stage !== "awaiting_product_choice") return "";
  if (!prevBotContext.restock_pending) return "";
  const pickedIndex = parseIndexedChoice(message);
  if (!pickedIndex) return "";
  const candidates = Array.isArray((prevBotContext as Record<string, any>).restock_candidates)
    ? ((prevBotContext as Record<string, any>).restock_candidates as Array<Record<string, any>>)
    : [];
  if (candidates.length < pickedIndex) return "";
  const picked = candidates[pickedIndex - 1] || {};
  const pickedRecord = picked as Record<string, any>;
  const productName = firstNonEmptyString(pickedRecord.product_name);
  if (productName) return productName;
  const productId = firstNonEmptyString(pickedRecord.product_id);
  return productId;
}

function resolveRestockProductQuery(input: GateInput) {
  const fromPendingChoice = resolveRestockChoiceToProductQuery(input.prevBotContext, input.message);
  if (fromPendingChoice) return fromPendingChoice;
  const source = firstNonEmptyString(
    input.policyEntity.product_query,
    input.prevBotContext.pending_product_name,
    input.prevBotContext.pending_product_id
  );
  if (source) return source;
  const queryFromCurrent = firstNonEmptyString(input.message);
  if (queryFromCurrent && !isTooGenericRestockQuery(queryFromCurrent)) return queryFromCurrent;
  const queryFromDisambiguation = firstNonEmptyString(input.effectiveMessageForIntent);
  if (queryFromDisambiguation && !isTooGenericRestockQuery(queryFromDisambiguation)) return queryFromDisambiguation;
  return "";
}

function resolveFaqScope(input: GateInput) {
  const existing = firstNonEmptyString(input.policyEntity.question_scope);
  if (existing) return existing;
  const current = firstNonEmptyString(input.message);
  if (current.length >= 3 && !/^\d+(,\d+)*$/.test(current)) return current;
  const source = firstNonEmptyString(input.effectiveMessageForIntent);
  if (source.length >= 3 && !/^\d+(,\d+)*$/.test(source)) return source;
  return "";
}

export function evaluateIntentScopeGate(input: GateInput): GateResult {
  const spec = INTENT_SCOPE_SPEC[String(input.resolvedIntent || "").trim()] || null;
  if (!spec) {
    return { enabled: false, spec: null, resolved_slots: {}, missing_slots: [] };
  }
  const resolved_slots: Record<string, string | null> = {};
  if (spec.intent === "restock_inquiry") {
    resolved_slots.product_query = resolveRestockProductQuery(input) || null;
  } else if (spec.intent === "faq") {
    resolved_slots.question_scope = resolveFaqScope(input) || null;
  }
  const missing_slots = spec.required_slots.filter((slot) => !String(resolved_slots[slot] || "").trim());
  return { enabled: true, spec, resolved_slots, missing_slots };
}

export function buildIntentScopePrompt(input: {
  spec: IntentScopeSpec;
}) {
  const { spec } = input;
  if (spec.slot_prompt_template_key === "restock_need_product") {
    return "?ъ엯怨좊? ?뺤씤???곹뭹紐낆쓣 ?뚮젮二쇱꽭?? (?? ?곹뭹紐??먮뒗 紐⑤뜽紐?";
  }
  if (spec.slot_prompt_template_key === "faq_need_question_scope") {
    return "?대뼡 ?댁슜???꾩??쒕┫源뚯슂? (?? 諛곗넚, ?섎텋, 援먰솚 ??";
  }
  return "?꾩슂???뺣낫瑜??뚮젮二쇱꽭??";
}