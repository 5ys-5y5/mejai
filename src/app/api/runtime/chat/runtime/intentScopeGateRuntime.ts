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
  const genericTokens = new Set([
    "재입고",
    "문의",
    "재입고 문의",
    "입고",
    "일정",
    "알림",
    "재입고 일정",
    "재입고 알림",
    "확인",
    "문의해",
    "문의요",
  ]);
  if (genericTokens.has(normalized)) return true;
  const stripped = normalized
    .replace(/재입고/g, "")
    .replace(/문의/g, "")
    .replace(/일정/g, "")
    .replace(/알림/g, "")
    .replace(/확인/g, "")
    .trim();
  return stripped.length < 2;
}

function parseIndexedChoice(text: string): number | null {
  const normalized = String(text || "").trim();
  if (!normalized) return null;
  const m = normalized.match(/^(\d+)\s*(?:번)?$/);
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
  // When choice is expected from previous candidate list, consume numeric input as product query.
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
    return "확인할 상품명을 먼저 알려주세요. (예: 아드헬린 린넨 플레어 원피스)";
  }
  if (spec.slot_prompt_template_key === "faq_need_question_scope") {
    return "어떤 내용을 도와드릴까요? 질문 내용을 조금 더 구체적으로 알려주세요.";
  }
  return "필수 정보를 먼저 알려주세요.";
}

