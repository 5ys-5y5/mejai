type InputContractSnapshot = {
  expectedInputs: string[];
  expectedInput: string | null;
  source: string | null;
  stage: string | null;
};

export type InputContractCondition = {
  field: string;
  equals?: string | boolean | null;
  equalsAny?: Array<string | boolean | null>;
  truthy?: boolean;
};

export type InputContractRule = {
  stageKey: string;
  when?: InputContractCondition[];
  expectedInputs: string[];
};

export type InputContractConfig = {
  rules?: InputContractRule[];
};

type InputContractContext = {
  botContext: Record<string, any>;
  derivedExpectedInput: string | null;
  contractConfig?: InputContractConfig | null;
};

const SLOT_INPUT_KEYS = new Set(["order_id", "phone", "zipcode", "address"]);

const DEFAULT_INPUT_CONTRACT_RULES: InputContractRule[] = [
  {
    stageKey: "auth_gate.otp.awaiting_phone",
    when: [
      { field: "otp_pending", truthy: true },
      { field: "otp_stage", equalsAny: ["awaiting_phone"] },
    ],
    expectedInputs: ["phone"],
  },
  {
    stageKey: "auth_gate.otp.awaiting_code",
    when: [
      { field: "otp_pending", truthy: true },
      { field: "otp_stage", equalsAny: ["awaiting_code"] },
    ],
    expectedInputs: ["otp_code"],
  },
  {
    stageKey: "order_change.address.awaiting_address",
    when: [
      { field: "address_pending", truthy: true },
      { field: "address_stage", equalsAny: ["awaiting_address", "awaiting_address_retry"] },
    ],
    expectedInputs: ["address"],
  },
  {
    stageKey: "order_change.address.awaiting_zipcode",
    when: [
      { field: "address_pending", truthy: true },
      { field: "address_stage", equalsAny: ["awaiting_zipcode"] },
    ],
    expectedInputs: ["address"],
  },
  {
    stageKey: "order_change.address.awaiting_zipcode_choice",
    when: [
      { field: "address_pending", truthy: true },
      { field: "address_stage", equalsAny: ["awaiting_zipcode_choice"] },
    ],
    expectedInputs: ["choice"],
  },
  {
    stageKey: "order_change.address.awaiting_zipcode_confirm",
    when: [
      { field: "address_pending", truthy: true },
      { field: "address_stage", equalsAny: ["awaiting_zipcode_confirm"] },
    ],
    expectedInputs: ["confirm"],
  },
  {
    stageKey: "order_change.order.awaiting_confirm",
    when: [
      { field: "order_confirm_pending", truthy: true },
      { field: "order_confirm_stage", equalsAny: ["awaiting_order_confirm"] },
    ],
    expectedInputs: ["confirm"],
  },
  {
    stageKey: "target.awaiting_confirm",
    when: [
      { field: "target_confirm_pending", truthy: true },
      { field: "target_confirm_stage", equalsAny: ["awaiting_target_confirm"] },
    ],
    expectedInputs: ["confirm"],
  },
  {
    stageKey: "refund.awaiting_confirm",
    when: [
      { field: "refund_pending", truthy: true },
      { field: "refund_stage", equalsAny: ["awaiting_refund_confirm"] },
    ],
    expectedInputs: ["confirm"],
  },
  {
    stageKey: "restock.awaiting_product",
    when: [
      { field: "restock_pending", truthy: true },
      { field: "restock_stage", equalsAny: ["awaiting_product", "awaiting_product_choice"] },
    ],
    expectedInputs: ["product_query"],
  },
  {
    stageKey: "restock.awaiting_subscribe_phone",
    when: [
      { field: "restock_pending", truthy: true },
      { field: "restock_stage", equalsAny: ["awaiting_subscribe_phone"] },
    ],
    expectedInputs: ["phone"],
  },
  {
    stageKey: "restock.awaiting_subscribe_lead_days",
    when: [
      { field: "restock_pending", truthy: true },
      { field: "restock_stage", equalsAny: ["awaiting_subscribe_lead_days"] },
    ],
    expectedInputs: ["restock_lead_days"],
  },
  {
    stageKey: "restock.awaiting_confirm",
    when: [
      { field: "restock_pending", truthy: true },
      {
        field: "restock_stage",
        equalsAny: ["awaiting_subscribe_confirm", "awaiting_subscribe_suggestion", "awaiting_non_target_alternative_confirm"],
      },
    ],
    expectedInputs: ["confirm"],
  },
  {
    stageKey: "post_action.awaiting_choice",
    when: [
      { field: "post_action_stage", equalsAny: ["awaiting_choice", "awaiting_satisfaction"] },
    ],
    expectedInputs: ["choice"],
  },
  {
    stageKey: "post_action.awaiting_reason",
    when: [
      { field: "post_action_stage", equalsAny: ["awaiting_satisfaction_reason"] },
    ],
    expectedInputs: ["reason"],
  },
  {
    stageKey: "change.awaiting_confirm",
    when: [
      { field: "change_pending", truthy: true },
      { field: "change_stage", equalsAny: ["awaiting_update_confirm"] },
    ],
    expectedInputs: ["confirm"],
  },
];

const ASK_RESET_REGEX = /\b(address|addr|zipcode|zip|postal|post code)\b/i;

function normalizeExpectedInputs(inputs: string[] | null | undefined) {
  return Array.from(new Set((inputs || []).map((item) => String(item || "").trim()).filter(Boolean)));
}

function readContextField(context: Record<string, any>, fieldPath: string) {
  if (!fieldPath) return undefined;
  return fieldPath.split(".").reduce((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, any>)[key];
  }, context as any);
}

function matchesCondition(context: Record<string, any>, condition: InputContractCondition) {
  const value = readContextField(context, condition.field);
  if (condition.equalsAny && condition.equalsAny.length > 0) {
    return condition.equalsAny.some((candidate) => String(candidate ?? "") === String(value ?? ""));
  }
  if (Object.prototype.hasOwnProperty.call(condition, "equals")) {
    return String(condition.equals ?? "") === String(value ?? "");
  }
  if (typeof condition.truthy === "boolean") {
    return condition.truthy ? Boolean(value) : !value;
  }
  return Boolean(value);
}

function matchesRule(context: Record<string, any>, rule: InputContractRule) {
  if (!rule.when || rule.when.length === 0) return false;
  return rule.when.every((condition) => matchesCondition(context, condition));
}

function mergeInputContractRules(overrides?: InputContractRule[] | null) {
  if (!overrides || overrides.length === 0) return DEFAULT_INPUT_CONTRACT_RULES;
  const byStage = new Map<string, InputContractRule>();
  DEFAULT_INPUT_CONTRACT_RULES.forEach((rule) => byStage.set(rule.stageKey, rule));
  overrides.forEach((rule) => {
    if (!rule.stageKey) return;
    byStage.set(rule.stageKey, rule);
  });
  return Array.from(byStage.values());
}

export function resolveInputContractSnapshot(input: InputContractContext): InputContractSnapshot {
  const { botContext, derivedExpectedInput, contractConfig } = input;
  const resolvedRules = mergeInputContractRules(contractConfig?.rules);
  const stageRule = resolvedRules.find((rule) => matchesRule(botContext, rule));
  if (stageRule) {
    const normalized = normalizeExpectedInputs(stageRule.expectedInputs);
    return {
      expectedInputs: normalized,
      expectedInput: normalized[0] || null,
      source: "contract_stage",
      stage: stageRule.stageKey,
    };
  }
  const legacyExpectedInput =
    typeof botContext.expected_input === "string" ? String(botContext.expected_input).trim() : null;
  const normalizedLegacy = normalizeExpectedInputs(legacyExpectedInput ? [legacyExpectedInput] : []);
  if (normalizedLegacy.length > 0) {
    return {
      expectedInputs: normalizedLegacy,
      expectedInput: normalizedLegacy[0] || null,
      source: "bot_context",
      stage: "legacy.expected_input",
    };
  }
  const normalizedDerived = normalizeExpectedInputs(derivedExpectedInput ? [derivedExpectedInput] : []);
  return {
    expectedInputs: normalizedDerived,
    expectedInput: normalizedDerived[0] || null,
    source: normalizedDerived.length > 0 ? "derived_from_last_answer" : null,
    stage: null,
  };
}

export function resetInputContractOnMessage(input: {
  message: string;
  snapshot: InputContractSnapshot;
  reason: string;
}): InputContractSnapshot {
  const { message, snapshot, reason } = input;
  if (!snapshot.expectedInput) return snapshot;
  if (snapshot.expectedInput === "address" && ASK_RESET_REGEX.test(message)) {
    return {
      expectedInputs: [],
      expectedInput: null,
      source: reason,
      stage: snapshot.stage,
    };
  }
  return snapshot;
}

export function buildInputContractMismatch(input: {
  expectedInputs: string[];
  derivedSlots: Record<string, string | null>;
}) {
  const normalized = normalizeExpectedInputs(input.expectedInputs);
  if (normalized.length === 0) return null;
  const expectedSlotKeys = normalized.filter((key) => SLOT_INPUT_KEYS.has(key));
  if (expectedSlotKeys.length === 0) return null;
  const hasExpected = expectedSlotKeys.some((key) => Boolean(input.derivedSlots[key]));
  if (hasExpected) return null;
  const firstActual = Object.entries(input.derivedSlots).find(([, value]) => Boolean(value));
  if (!firstActual) return null;
  return `expected_input=${expectedSlotKeys.join("|")} but derived_${firstActual[0]}=${String(firstActual[1] || "")}`;
}

export function pickSlotDerivationMode(expectedInputs: string[]) {
  const normalized = normalizeExpectedInputs(expectedInputs);
  if (normalized.includes("otp_code")) return "otp_code";
  if (normalized.includes("phone") && normalized.includes("order_id")) return "order_id_or_phone";
  if (normalized.includes("phone")) return "phone";
  if (normalized.includes("order_id")) return "order_id";
  if (normalized.includes("zipcode")) return "zipcode";
  if (normalized.includes("address")) return "address";
  return null;
}

export function shouldRestrictSlotDerivation(expectedInputs: string[]) {
  const normalized = normalizeExpectedInputs(expectedInputs);
  return normalized.length > 0;
}

export function getExpectedSlotKeys(expectedInputs: string[]) {
  return normalizeExpectedInputs(expectedInputs).filter((key) => SLOT_INPUT_KEYS.has(key));
}

