type InputContractSnapshot = {
  expectedInputs: string[];
  expectedInput: string | null;
  source: string | null;
  stage: string | null;
};

export type InputContractBinding = InputContractSnapshot & {
  intent: string | null;
  stageGroup: string | null;
  flowId?: string | null;
  flowIndex?: number | null;
};

export type InputContractStore = Record<string, InputContractBinding>;
export type InputGateState = {
  type: string;
  resume_stage_key?: string | null;
  resume_expected_inputs?: string[] | null;
  resume_expected_input?: string | null;
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
  preferredExpectedInput?: string | null;
};

const SLOT_INPUT_KEYS = new Set(["order_id", "phone", "zipcode", "address"]);
const RENDER_PLAN_EXPECTED_INPUT: Record<string, string> = {
  lead_day: "restock_lead_days",
  intent_disambiguation: "choice",
  restock_product_choice: "choice",
  restock_subscribe_confirm: "confirm",
  restock_subscribe_phone: "phone",
  restock_post_subscribe: "choice",
  restock_alternative_confirm: "confirm",
};

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
const INTENT_STAGE_GROUP_MAP: Record<string, string> = {
  restock_inquiry: "restock",
  restock_subscribe: "restock",
  order_change: "order_change",
  refund_request: "refund",
  shipping_inquiry: "shipping",
  admin_login: "auth_gate",
};

function normalizeExpectedInputs(inputs: string[] | null | undefined) {
  return Array.from(new Set((inputs || []).map((item) => String(item || "").trim()).filter(Boolean)));
}

function normalizeStageKey(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function getStageGroupFromKey(stageKey: string | null | undefined) {
  const normalized = String(stageKey || "").trim();
  if (!normalized) return null;
  const [group] = normalized.split(".").filter(Boolean);
  return group || null;
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

function buildStageCatalog(rules: InputContractRule[]) {
  const groupCounters = new Map<string, number>();
  return rules.map((rule, index) => {
    const stageGroup = getStageGroupFromKey(rule.stageKey);
    const groupIndex = stageGroup ? (groupCounters.get(stageGroup) || 0) + 1 : index + 1;
    if (stageGroup) groupCounters.set(stageGroup, groupIndex);
    return {
      rule,
      stageGroup,
      stageOrder: index + 1,
      groupOrder: stageGroup ? groupIndex : null,
    };
  });
}

function resolveStageForExpectedInput(input: {
  botContext: Record<string, any>;
  rules: InputContractRule[];
  expectedInput: string | null;
}) {
  if (!input.expectedInput) return null;
  const candidates = input.rules.filter((rule) => matchesRule(input.botContext, rule));
  if (candidates.length === 0) return null;
  const expected = String(input.expectedInput || "").trim();
  const match = candidates.find((rule) => normalizeExpectedInputs(rule.expectedInputs).includes(expected));
  return match || null;
}

function resolveExpectedInputFromRenderPlan(botContext: Record<string, any>) {
  const renderPlan =
    botContext && typeof botContext === "object" && (botContext as Record<string, any>).render_plan
      ? ((botContext as Record<string, any>).render_plan as Record<string, any>)
      : null;
  const promptKind = String(renderPlan?.prompt_kind || "").trim();
  if (!promptKind) return null;
  return RENDER_PLAN_EXPECTED_INPUT[promptKind] || null;
}

function readGateState(botContext: Record<string, any>): InputGateState | null {
  const raw = botContext && typeof botContext === "object" ? (botContext as Record<string, any>).gate_state : null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const type = String((raw as Record<string, any>).type || "").trim();
  if (!type) return null;
  const resumeStageKey = normalizeStageKey((raw as Record<string, any>).resume_stage_key);
  const resumeExpectedInputs = normalizeExpectedInputs(
    Array.isArray((raw as Record<string, any>).resume_expected_inputs)
      ? (raw as Record<string, any>).resume_expected_inputs
      : []
  );
  const resumeExpectedInput = String((raw as Record<string, any>).resume_expected_input || "").trim() || null;
  return {
    type,
    resume_stage_key: resumeStageKey,
    resume_expected_inputs: resumeExpectedInputs.length > 0 ? resumeExpectedInputs : null,
    resume_expected_input: resumeExpectedInput,
  };
}

function resolveGateBinding(input: {
  botContext: Record<string, any>;
  contractConfig?: InputContractConfig | null;
  intent?: string | null;
}) {
  const botContext = input.botContext || {};
  const gateState = readGateState(botContext);
  const otpPending = Boolean(botContext.otp_pending);
  if (!gateState && !otpPending) return null;
  if (otpPending) {
    const stage = String(botContext.otp_stage || "awaiting_code").trim() || "awaiting_code";
    const expectedInput = stage === "awaiting_phone" ? "phone" : "otp_code";
    const stageKey = `auth_gate.otp.${stage === "awaiting_phone" ? "awaiting_phone" : "awaiting_code"}`;
    return {
      expectedInputs: [expectedInput],
      expectedInput,
      source: "gate_state",
      stage: stageKey,
      intent: String(input.intent || botContext.intent_name || "").trim() || null,
      stageGroup: getStageGroupFromKey(stageKey),
      flowId: typeof botContext.flow_id === "string" ? String(botContext.flow_id).trim() : null,
      flowIndex: Number.isFinite(Number(botContext.flow_index)) ? Number(botContext.flow_index) : null,
    } as InputContractBinding;
  }
  if (gateState?.resume_stage_key) {
    const resumeInputs =
      gateState.resume_expected_inputs && gateState.resume_expected_inputs.length > 0
        ? gateState.resume_expected_inputs
        : gateState.resume_expected_input
          ? [gateState.resume_expected_input]
          : [];
    return {
      expectedInputs: normalizeExpectedInputs(resumeInputs),
      expectedInput: gateState.resume_expected_input || resumeInputs[0] || null,
      source: "gate_resume",
      stage: gateState.resume_stage_key,
      intent: String(input.intent || botContext.intent_name || "").trim() || null,
      stageGroup: getStageGroupFromKey(gateState.resume_stage_key),
      flowId: typeof botContext.flow_id === "string" ? String(botContext.flow_id).trim() : null,
      flowIndex: Number.isFinite(Number(botContext.flow_index)) ? Number(botContext.flow_index) : null,
    } as InputContractBinding;
  }
  return null;
}

export function resolveInputContractSnapshot(input: InputContractContext): InputContractSnapshot {
  const { botContext, derivedExpectedInput, contractConfig, preferredExpectedInput } = input;
  const resolvedRules = mergeInputContractRules(contractConfig?.rules);
  const preferredRule = resolveStageForExpectedInput({
    botContext,
    rules: resolvedRules,
    expectedInput: preferredExpectedInput || null,
  });
  const stageRule = preferredRule || resolvedRules.find((rule) => matchesRule(botContext, rule));
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

export function resolveInputContractBinding(input: {
  botContext: Record<string, any>;
  derivedExpectedInput: string | null;
  contractConfig?: InputContractConfig | null;
  intent?: string | null;
}): InputContractBinding {
  const botContext = input.botContext || {};
  const resolvedRules = mergeInputContractRules(input.contractConfig?.rules);
  const gateBinding = resolveGateBinding({
    botContext,
    contractConfig: input.contractConfig,
    intent: input.intent,
  });
  if (gateBinding) return gateBinding;
  const authStageRule = resolvedRules.find((rule) => {
    if (!rule.stageKey || !rule.stageKey.startsWith("auth_gate.")) return false;
    return matchesRule(botContext, rule);
  });
  if (authStageRule) {
    const normalized = normalizeExpectedInputs(authStageRule.expectedInputs);
    return {
      expectedInputs: normalized,
      expectedInput: normalized[0] || null,
      source: "contract_stage",
      stage: authStageRule.stageKey,
      intent: String(input.intent || botContext.intent_name || "").trim() || null,
      stageGroup: getStageGroupFromKey(authStageRule.stageKey),
      flowId: typeof botContext.flow_id === "string" ? String(botContext.flow_id).trim() : null,
      flowIndex: Number.isFinite(Number(botContext.flow_index)) ? Number(botContext.flow_index) : null,
    };
  }
  const explicitExpectedInput =
    typeof botContext.expected_input === "string" ? String(botContext.expected_input).trim() : null;
  const explicitExpectedInputs = Array.isArray(botContext.expected_inputs)
    ? botContext.expected_inputs.map((item: unknown) => String(item || "").trim()).filter(Boolean)
    : [];
  const renderPlanExpectedInput = resolveExpectedInputFromRenderPlan(botContext);
  if (renderPlanExpectedInput) {
    const intentName = String(input.intent || botContext.intent_name || "").trim() || null;
    const stageGroup =
      resolveStageGroupForIntent(intentName) ||
      getStageGroupFromKey(normalizeStageKey(botContext.expected_input_stage));
    const stageKey = resolveStageKeyForExpectedInput({
      stageGroup,
      expectedInput: renderPlanExpectedInput,
      contractConfig: input.contractConfig,
    });
    return {
      expectedInputs: [renderPlanExpectedInput],
      expectedInput: renderPlanExpectedInput,
      source: "render_plan",
      stage: stageKey || normalizeStageKey(botContext.expected_input_stage),
      intent: intentName,
      stageGroup: getStageGroupFromKey(stageKey) || stageGroup,
      flowId: typeof botContext.flow_id === "string" ? String(botContext.flow_id).trim() : null,
      flowIndex: Number.isFinite(Number(botContext.flow_index)) ? Number(botContext.flow_index) : null,
    };
  }
  if (explicitExpectedInput || explicitExpectedInputs.length > 0) {
    const intentName = String(input.intent || botContext.intent_name || "").trim() || null;
    const stageGroup =
      resolveStageGroupForIntent(intentName) ||
      getStageGroupFromKey(normalizeStageKey(botContext.expected_input_stage));
    const expectedInput = explicitExpectedInput || explicitExpectedInputs[0] || null;
    const stageKey = resolveStageKeyForExpectedInput({
      stageGroup,
      expectedInput,
      contractConfig: input.contractConfig,
    });
    return {
      expectedInputs: normalizeExpectedInputs(explicitExpectedInputs.length > 0 ? explicitExpectedInputs : expectedInput ? [expectedInput] : []),
      expectedInput,
      source: "bot_context",
      stage: stageKey || normalizeStageKey(botContext.expected_input_stage),
      intent: intentName,
      stageGroup: getStageGroupFromKey(stageKey) || stageGroup,
      flowId: typeof botContext.flow_id === "string" ? String(botContext.flow_id).trim() : null,
      flowIndex: Number.isFinite(Number(botContext.flow_index)) ? Number(botContext.flow_index) : null,
    };
  }
  const stored = botContext.expected_input_contract;
  if (stored && typeof stored === "object") {
    const normalized = normalizeInputContractBinding(stored);
    if (normalized) {
      return normalized;
    }
  }
  const explicitStage = normalizeStageKey(botContext.expected_input_stage);
  const preferredExpectedInput = explicitExpectedInput || input.derivedExpectedInput || null;
  const stageRuleFromStage = explicitStage
    ? resolvedRules.find((rule) => rule.stageKey === explicitStage)
    : null;
  const derivedExpectedInputs =
    explicitExpectedInputs.length > 0
      ? explicitExpectedInputs
      : stageRuleFromStage?.expectedInputs || (preferredExpectedInput ? [preferredExpectedInput] : []);
  const snapshot =
    explicitExpectedInputs.length > 0 || explicitExpectedInput || explicitStage
      ? {
          expectedInputs: normalizeExpectedInputs(derivedExpectedInputs),
          expectedInput: preferredExpectedInput || null,
          source: "bot_context",
          stage: explicitStage,
        }
      : resolveInputContractSnapshot({
          botContext,
          derivedExpectedInput: input.derivedExpectedInput,
          contractConfig: input.contractConfig,
          preferredExpectedInput,
        });
  const stageKey = snapshot.stage || resolveInputContractSnapshot({
    botContext,
    derivedExpectedInput: input.derivedExpectedInput,
    contractConfig: input.contractConfig,
    preferredExpectedInput,
  }).stage;
  const stageGroup = getStageGroupFromKey(stageKey);
  return {
    ...snapshot,
    stage: stageKey,
    intent: String(input.intent || botContext.intent_name || "").trim() || null,
    stageGroup,
    flowId: typeof botContext.flow_id === "string" ? String(botContext.flow_id).trim() : null,
    flowIndex: Number.isFinite(Number(botContext.flow_index)) ? Number(botContext.flow_index) : null,
  };
}

export function normalizeInputContractBinding(input: unknown): InputContractBinding | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, any>;
  const expectedInputs = normalizeExpectedInputs(Array.isArray(raw.expectedInputs) ? raw.expectedInputs : raw.expected_inputs);
  const expectedInput =
    typeof raw.expectedInput === "string"
      ? raw.expectedInput
      : typeof raw.expected_input === "string"
        ? raw.expected_input
        : null;
  const stage = normalizeStageKey(raw.stage ?? raw.expected_input_stage);
  const stageGroup = getStageGroupFromKey(stage);
  return {
    expectedInputs,
    expectedInput: expectedInput ? String(expectedInput).trim() || null : null,
    source: typeof raw.source === "string" ? raw.source : null,
    stage,
    intent: typeof raw.intent === "string" ? String(raw.intent).trim() || null : null,
    stageGroup,
    flowId: typeof raw.flowId === "string" ? raw.flowId : typeof raw.flow_id === "string" ? raw.flow_id : null,
    flowIndex: Number.isFinite(Number(raw.flowIndex)) ? Number(raw.flowIndex) : Number.isFinite(Number(raw.flow_index)) ? Number(raw.flow_index) : null,
  };
}

export function readInputContractStore(botContext: Record<string, any>): InputContractStore {
  const raw = botContext && typeof botContext === "object" ? (botContext as Record<string, any>).expected_input_contracts : null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const store: InputContractStore = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    const normalized = normalizeInputContractBinding(value);
    if (!normalized) return;
    store[String(key || "")] = normalized;
  });
  return store;
}

export function updateInputContractStore(store: InputContractStore, binding: InputContractBinding | null) {
  if (!binding) return store;
  const expectedInputs = normalizeExpectedInputs(binding.expectedInputs);
  if (expectedInputs.length === 0 && !binding.expectedInput) return store;
  const key = binding.stageGroup || binding.intent || "default";
  return {
    ...store,
    [key]: binding,
  };
}

export function selectInputContractFromStore(input: {
  store: InputContractStore;
  stageGroup?: string | null;
  intent?: string | null;
}) {
  const store = input.store || {};
  const stageGroup = String(input.stageGroup || "").trim();
  if (stageGroup && store[stageGroup]) return store[stageGroup];
  const intent = String(input.intent || "").trim();
  if (intent && store[intent]) return store[intent];
  return null;
}

export function resolveStageGroupForIntent(intent: string | null | undefined) {
  const key = String(intent || "").trim();
  if (!key) return null;
  return INTENT_STAGE_GROUP_MAP[key] || null;
}

export function resolveStageKeyForExpectedInput(input: {
  stageGroup: string | null;
  expectedInput: string | null;
  contractConfig?: InputContractConfig | null;
}) {
  const stageGroup = String(input.stageGroup || "").trim();
  const expectedInput = String(input.expectedInput || "").trim();
  if (!stageGroup || !expectedInput) return null;
  const resolvedRules = mergeInputContractRules(input.contractConfig?.rules);
  const catalog = buildStageCatalog(resolvedRules);
  const match = catalog.find((item) => {
    if (item.stageGroup !== stageGroup) return false;
    return normalizeExpectedInputs(item.rule.expectedInputs).includes(expectedInput);
  });
  return match?.rule.stageKey || null;
}

export function resolveStageOrderIndex(input: {
  stageKey: string | null | undefined;
  contractConfig?: InputContractConfig | null;
}) {
  const stageKey = String(input.stageKey || "").trim();
  if (!stageKey) return null;
  const resolvedRules = mergeInputContractRules(input.contractConfig?.rules);
  const catalog = buildStageCatalog(resolvedRules);
  const match = catalog.find((item) => item.rule.stageKey === stageKey);
  return match?.groupOrder ?? null;
}

export function resolveStageGroup(input: { stageKey: string | null | undefined }) {
  return getStageGroupFromKey(String(input.stageKey || "").trim());
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

