import { getThreePhasePromptLabels, shouldRequireThreePhasePrompt } from "../policies/principles";
import {
  getIntentContract,
  getMutationIntentContract,
  getSlotLabel,
  resolveMutationReadyState,
} from "./intentContractRuntime";
import { resolveCompletionState } from "./intentCompletionRuntime";
import { resolveActionLabel } from "../policies/intentSlotPolicy";

type DerivedSlotMap = Partial<{

  order_id: string | null;
  phone: string | null;
  address: string | null;
  zipcode: string | null;
  product_query: string | null;
  product_name: string | null;
  channel: string | null;
  choice: string | null;
  confirm: string | null;
  restock_lead_days: string | null;
  otp_code: string | null;
}>;

const ACTION_TOKEN_PATTERN = /action:[a-z_]+/gi;
const ACTION_TOKEN_TEST = /action:[a-z_]+/i;

function replaceActionTokens(value: string) {
  if (!value || !ACTION_TOKEN_TEST.test(value)) return value;
  return value.replace(ACTION_TOKEN_PATTERN, (token) => resolveActionLabel(token) || token);
}

function hasActionToken(value: string) {
  return Boolean(value && ACTION_TOKEN_TEST.test(value));
}

type TemplateKey =
  | "confirm_yes_no_suffix"
  | "intent_disambiguation_title"
  | "intent_disambiguation_example"
  | "restock_lead_days_title"
  | "restock_lead_days_selectable"
  | "restock_lead_days_example"
  | "restock_lead_days_retry_title"
  | "restock_product_choice_title"
  | "order_choice_title"
  | "order_choice_header"
  | "numbered_choice_example";

const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  confirm_yes_no_suffix: "네/아니오로 답해주세요.",
  intent_disambiguation_title: "원하시는 문의 유형을 선택해주세요. (번호로 답변)",
  intent_disambiguation_example: "예) 1,2",
  restock_lead_days_title: "재입고 알림을 언제부터 받을까요? (최소 {min}일 전)",
  restock_lead_days_selectable: "선택 가능: {options}",
  restock_lead_days_example: "예) {example}",
  restock_lead_days_retry_title: "선택이 부족해요. 최소 {min}개를 골라주세요. (가능: {options})",
  restock_product_choice_title: "다음 중 어떤 상품의 재입고 알림을 원하시나요?",
  order_choice_title: "다음 주문 중 어떤 주문을 조회/변경하시나요?",
  order_choice_header: "주문 번호를 선택해주세요.",
  numbered_choice_example: "예) 1",
};

type ResolveTemplateInput = {
  key: TemplateKey;
  botContext?: Record<string, any> | null;
  entity?: Record<string, any> | null;
};

type ThreePhaseLabels = {
  confirmed: string;
  confirming: string;
  next: string;
};

type ThreePhaseConfig = {
  enabled?: boolean;
  labels?: ThreePhaseLabels | null;
};

type ThreePhaseContext = {
  confirmed?: string | null;
  next?: string | null;
  labels?: ThreePhaseLabels | null;
};

type ThreePhasePromptContext = {
  message: string;
  intent: string;
  expectedInput: string | null;
  expectedInputs?: string[] | null;
  expectedInputStage?: string | null;
  prevBotContext?: Record<string, any> | null;
  policyEntity?: Record<string, any> | null;
  derivedSlots?: DerivedSlotMap | null;
  lastUserMessage?: string | null;
  maskPhone?: (value?: string | null) => string;
  entityUpdates?: Array<{ field: string; prev: string; next: string }> | null;
  threePhaseConfig?: ThreePhaseConfig | null;
};

const THREE_PHASE_FALLBACK_CONFIRMED = "\uC694\uCCAD \uC811\uC218";
const THREE_PHASE_FALLBACK_NEXT = "\uB2E4\uC74C \uB2E8\uACC4\uB85C \uC774\uC5B4\uC11C \uC548\uB0B4\uD574 \uB4DC\uB9AC\uACA0\uC2B5\uB2C8\uB2E4.";

const THREE_PHASE_PREFIXES = [
  "\uD655\uC778\uD55C \uAC83:",
  "\uD655\uC778\uD560 \uAC83:",
  "\uADF8 \uB2E4\uC74C\uC73C\uB85C \uD655\uC778\uD560 \uAC83:",
];

function resolveThreePhaseEnabled(config?: ThreePhaseConfig | null) {
  if (typeof config?.enabled === "boolean") return config.enabled;
  return shouldRequireThreePhasePrompt();
}

function resolveThreePhaseLabels(config?: ThreePhaseConfig | null) {
  return config?.labels && typeof config.labels === "object" ? config.labels : getThreePhasePromptLabels();
}

function isThreePhasePrompt(text: string) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return THREE_PHASE_PREFIXES.every((prefix) => normalized.includes(prefix));
}

function isMissingPhaseValue(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return !normalized || normalized === "-";
}

function parseThreePhasePrompt(text: string, labels: ThreePhaseLabels) {
  const lines = String(text || "").split("\n");
  const confirmedPrefix = `${labels.confirmed}:`;
  const confirmingPrefix = `${labels.confirming}:`;
  const nextPrefix = `${labels.next}:`;
  const sections: Record<"confirmed" | "confirming" | "next", string> = {
    confirmed: "",
    confirming: "",
    next: "",
  };
  let current: keyof typeof sections | null = null;
  lines.forEach((raw) => {
    const line = String(raw || "");
    if (line.startsWith(confirmedPrefix)) {
      current = "confirmed";
      sections.confirmed = line.slice(confirmedPrefix.length).trim();
      return;
    }
    if (line.startsWith(confirmingPrefix)) {
      current = "confirming";
      sections.confirming = line.slice(confirmingPrefix.length).trim();
      return;
    }
    if (line.startsWith(nextPrefix)) {
      current = "next";
      sections.next = line.slice(nextPrefix.length).trim();
      return;
    }
    if (current) {
      sections[current] = sections[current] ? `${sections[current]}\n${line}` : line;
    }
  });
  return sections;
}

function readSlotValue(slot: string, entity: Record<string, any>, derived: DerivedSlotMap) {
  const safeSlot = String(slot || "").trim();
  if (!safeSlot) return "";
  const derivedValue = derived && typeof derived[safeSlot as keyof DerivedSlotMap] === "string"
    ? String(derived[safeSlot as keyof DerivedSlotMap] || "").trim()
    : "";
  if (derivedValue) return derivedValue;
  const fromEntity = entity && typeof entity[safeSlot] === "string" ? String(entity[safeSlot] || "").trim() : "";
  if (fromEntity) return fromEntity;
  if (safeSlot === "product") {
    const productName = String(entity?.product_name || entity?.product || entity?.product_query || "").trim();
    return productName;
  }
  if (safeSlot === "order_id") {
    return String(entity?.order_id || "").trim();
  }
  if (safeSlot === "phone") {
    return String(entity?.phone || "").trim();
  }
  if (safeSlot === "address") {
    return String(entity?.address || "").trim();
  }
  if (safeSlot === "zipcode") {
    return String(entity?.zipcode || "").trim();
  }
  if (safeSlot === "channel") {
    return String(entity?.channel || "").trim();
  }
  return "";
}

function buildConfirmedSummary(input: {
  intent: string;
  entity: Record<string, any>;
  derivedSlots: DerivedSlotMap;
  prevBotContext: Record<string, any>;
  lastUserMessage: string;
  updateNotice?: string | null;
  maskPhone?: (value?: string | null) => string;
}) {
  const { intent, entity, derivedSlots, prevBotContext, lastUserMessage, updateNotice, maskPhone } = input;
  const normalizeDisplayValue = (value: string) => resolveActionLabel(value) || value;
  const rawOverride = String(prevBotContext?.three_phase_confirmed || "").trim();
  const override = rawOverride ? normalizeDisplayValue(rawOverride) : "";
  if (override) {
    return updateNotice ? `${updateNotice}\n${override}` : override;
  }
  const pendingZipcode = String(prevBotContext?.pending_zipcode || "").trim();
  const pendingRoad = String(prevBotContext?.pending_road_addr || "").trim();
  const pendingJibun = String(prevBotContext?.pending_jibun_addr || "").trim();
  const pendingAddress = String(prevBotContext?.pending_address || "").trim();
  if (pendingZipcode || pendingRoad || pendingJibun || pendingAddress) {
    const parts = [
      pendingRoad || pendingJibun || pendingAddress,
      pendingZipcode ? `(${pendingZipcode})` : null,
    ].filter(Boolean);
    const base = `\uC8FC\uC18C ${parts.join(" ")}`.trim();
    return updateNotice ? `${updateNotice}\n${base}` : base;
  }
  const contract = getIntentContract(intent);
  const slots = Array.isArray(contract?.reuseSlots) ? contract!.reuseSlots : [];
  const parts: string[] = [];
  slots.forEach((slot) => {
    const label = getSlotLabel(slot, intent);
    let value = readSlotValue(slot, entity, derivedSlots);
    if (slot === "phone" && value && maskPhone) {
      value = maskPhone(value);
    }
    value = normalizeDisplayValue(value);
    if (value) parts.push(`${label} ${value}`);
  });
  if (parts.length > 0) {
    const base = parts.join(", ");
    return updateNotice ? `${updateNotice}\n${base}` : base;
  }
  const fallback = normalizeDisplayValue(String(lastUserMessage || "").trim());
  if (fallback) return updateNotice ? `${updateNotice}\n${fallback}` : fallback;
  const base = THREE_PHASE_FALLBACK_CONFIRMED;
  return updateNotice ? `${updateNotice}\n${base}` : base;
}

function buildNextSummary(input: {
  intent: string;
  expectedInput: string | null;
  expectedInputStage: string | null;
  entity: Record<string, any>;
  derivedSlots: DerivedSlotMap;
  prevBotContext: Record<string, any>;
  currentMessage: string;
}) {
  const { intent, expectedInput, expectedInputStage, entity, derivedSlots, prevBotContext, currentMessage } = input;
  const override = String(prevBotContext?.three_phase_next || "").trim();
  if (override) return override;

  const completion = resolveCompletionState({
    intent,
    message: currentMessage,
    botContext: prevBotContext,
  });
  if (completion.completed) {
    return completion.nextText || "\uCD94\uAC00 \uB3C4\uC6C0 \uC694\uCCAD \uD655\uC778";
  }

  const otpPending = Boolean(prevBotContext?.otp_pending);
  const otpStage = String(prevBotContext?.otp_stage || "").trim();
  if (otpPending) {
    if (otpStage === "awaiting_phone") return "\uC778\uC99D\uBC88\uD638 \uD655\uC778";
    if (otpStage === "awaiting_code") return "\uC8FC\uBB38 \uD655\uC778";
  }

  const restockPending = Boolean(prevBotContext?.restock_pending);
  const restockStage = String(prevBotContext?.restock_stage || "").trim();
  if (restockPending) {
    if (["awaiting_product", "awaiting_product_choice"].includes(restockStage)) {
      return "\uC785\uACE0 \uC77C\uC815 \uC548\uB0B4 \uBC0F \uC54C\uB9BC \uC2E0\uCCAD \uC5EC\uBD80 \uD655\uC778";
    }
    if (["awaiting_subscribe_confirm", "awaiting_subscribe_suggestion", "awaiting_non_target_alternative_confirm"].includes(restockStage)) {
      return "\uC54C\uB9BC \uC2DC\uC791\uC77C \uC120\uD0DD";
    }
    if (restockStage === "awaiting_subscribe_lead_days") {
      return "\uC54C\uB9BC \uC218\uC2E0 \uBC88\uD638 \uD655\uC778";
    }
    if (restockStage === "awaiting_subscribe_phone") {
      return "\uC54C\uB9BC \uC2E0\uCCAD \uC644\uB8CC";
    }
  }

  const addressPending = Boolean(prevBotContext?.address_pending);
  const addressStage = String(prevBotContext?.address_stage || "").trim();
  if (addressPending) {
    if (["awaiting_address", "awaiting_address_retry"].includes(addressStage)) {
      return "\uC6B0\uD3B8\uBC88\uD638 \uD655\uC778";
    }
    if (["awaiting_zipcode", "awaiting_zipcode_choice", "awaiting_zipcode_confirm"].includes(addressStage)) {
      return "\uBC30\uC1A1\uC9C0 \uBCC0\uACBD \uC801\uC6A9";
    }
  }

  const mutationContract = getMutationIntentContract(intent);
  if (mutationContract) {
    const readyState = resolveMutationReadyState({
      contract: mutationContract,
      entity,
      resolvedOrderId: String(entity?.order_id || "").trim() || null,
    });
    const missingSlots = Object.entries(readyState.missing)
      .filter(([slot, missing]) => missing && slot !== String(expectedInput || "").trim());
    if (missingSlots.length > 0) {
      const nextSlot = missingSlots[0][0];
      const label = getSlotLabel(nextSlot, intent);
      return `${label} \uD655\uC778`;
    }
    return "\uC694\uCCAD \uCC98\uB9AC \uC9C4\uD589";
  }

  if (expectedInput) {
    const label = getSlotLabel(expectedInput, intent);
    return `${label} \uD655\uC778`;
  }

  if (expectedInputStage && expectedInputStage.includes("post_action")) {
    return "\uB9CC\uC871\uB3C4/\uCD94\uAC00 \uBB38\uC758 \uD655\uC778";
  }

  return THREE_PHASE_FALLBACK_NEXT;
}

export function decorateWithThreePhasePrompt(input: ThreePhasePromptContext) {
  const baseText = replaceActionTokens(String(input.message || "").trim());
  if (!resolveThreePhaseEnabled(input.threePhaseConfig)) {
    const updates = Array.isArray(input.entityUpdates) ? input.entityUpdates : [];
    if (updates.length === 0) return baseText;
    const intent = String(input.intent || "").trim();
    const lines = updates.map((update) => {
      const label = getSlotLabel(update.field, intent);
      const prevValue =
        update.field === "phone" && input.maskPhone
          ? input.maskPhone(update.prev)
          : update.prev;
      const nextValue =
        update.field === "phone" && input.maskPhone
          ? input.maskPhone(update.next)
          : update.next;
      return `${label} ${prevValue} -> ${nextValue}`;
    });
    const notice = `\uC815\uBCF4 \uC5C5\uB370\uC774\uD2B8: ${lines.join(", ")}. \uC774\uD6C4 \uC548\uB0B4\uB294 \uBCC0\uACBD\uB41C \uC815\uBCF4 \uAE30\uC900\uC73C\uB85C \uC9C4\uD589\uD569\uB2C8\uB2E4.`;
    return baseText ? `${notice}\n${baseText}` : notice;
  }
  if (!baseText) return baseText;
  const intent = String(input.intent || "").trim();
  const prevBotContext = input.prevBotContext && typeof input.prevBotContext === "object" ? input.prevBotContext : {};
  const entity = input.policyEntity && typeof input.policyEntity === "object" ? input.policyEntity : {};
  const derivedSlots = input.derivedSlots && typeof input.derivedSlots === "object" ? input.derivedSlots : {};
  const labels = resolveThreePhaseLabels(input.threePhaseConfig);
  const updateNotice = (() => {
    const updates = Array.isArray(input.entityUpdates) ? input.entityUpdates : [];
    if (updates.length === 0) return "";
    const lines = updates.map((update) => {
      const label = getSlotLabel(update.field, intent);
      const prevValue =
        update.field === "phone" && input.maskPhone
          ? input.maskPhone(update.prev)
          : update.prev;
      const nextValue =
        update.field === "phone" && input.maskPhone
          ? input.maskPhone(update.next)
          : update.next;
      return `${label} ${prevValue} -> ${nextValue}`;
    });
    return `\uC815\uBCF4 \uC5C5\uB370\uC774\uD2B8: ${lines.join(", ")}. \uC774\uD6C4 \uC548\uB0B4\uB294 \uBCC0\uACBD\uB41C \uC815\uBCF4 \uAE30\uC900\uC73C\uB85C \uC9C4\uD589\uD569\uB2C8\uB2E4.`;
  })();
  const completion = resolveCompletionState({
    intent,
    message: baseText,
    botContext: prevBotContext,
  });

  let confirmingText = baseText;
  let hasThreePhase = isThreePhasePrompt(baseText);
  let parsed: { confirmed: string; confirming: string; next: string } | null = null;
  if (hasThreePhase) {
    parsed = parseThreePhasePrompt(baseText, labels);
    confirmingText = parsed.confirming || "";
  }
  const shouldRebuild =
    !hasThreePhase ||
    (parsed && (isMissingPhaseValue(parsed.confirmed) || isMissingPhaseValue(parsed.next) || hasActionToken(parsed.confirmed) || hasActionToken(parsed.next))) ||
    (completion.completed && parsed && !String(parsed.next || "").includes(String(completion.nextText || "")));

  if (!shouldRebuild) return baseText;

  const confirmed = replaceActionTokens(
    buildConfirmedSummary({
    intent,
    entity,
    derivedSlots,
    prevBotContext,
    lastUserMessage: String(input.lastUserMessage || "").trim(),
    updateNotice: updateNotice || null,
    maskPhone: input.maskPhone,
  })
  );
  const next = replaceActionTokens(
    buildNextSummary({
    intent,
    expectedInput: input.expectedInput ?? null,
    expectedInputStage: input.expectedInputStage ?? null,
    entity,
    derivedSlots,
    prevBotContext,
    currentMessage: baseText,
  })
  );
  const confirming =
    confirmingText && confirmingText.trim()
      ? confirmingText.trim()
      : baseText;
  return buildThreePhasePrompt({
    confirmed,
    confirming,
    next,
    labels,
  });
}

function readOverride(target: Record<string, any> | null | undefined, key: TemplateKey) {
  if (!target || typeof target !== "object") return null;
  const map = (target as Record<string, any>).template_overrides;
  if (map && typeof map === "object") {
    const fromMap = String((map as Record<string, any>)[key] || "").trim();
    if (fromMap) return fromMap;
  }
  const direct = String((target as Record<string, any>)[`template_${key}`] || "").trim();
  return direct || null;
}

export function resolveRuntimeTemplate(input: ResolveTemplateInput) {
  const fromContext = readOverride(input.botContext || null, input.key);
  if (fromContext) return fromContext;
  const fromEntity = readOverride(input.entity || null, input.key);
  if (fromEntity) return fromEntity;
  return DEFAULT_TEMPLATES[input.key];
}

function normalizePhaseValue(value: unknown) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || "-";
}

export function buildThreePhasePrompt(input: {
  confirmed?: string | null;
  confirming: string;
  next?: string | null;
  labels?: ThreePhaseLabels | null;
  threePhaseConfig?: ThreePhaseConfig | null;
}) {
  const labels = input.labels && typeof input.labels === "object" ? input.labels : resolveThreePhaseLabels(input.threePhaseConfig);
  const confirmed = normalizePhaseValue(input.confirmed);
  const confirming = String(input.confirming || "").trim();
  const next = normalizePhaseValue(input.next);
  return [
    `${labels.confirmed}: ${confirmed}`,
    `${labels.confirming}: ${confirming}`,
    `${labels.next}: ${next}`,
  ].join("\n");
}

export function buildYesNoConfirmationPrompt(
  question: string,
  input?: {
    botContext?: Record<string, any> | null;
    entity?: Record<string, any> | null;
    phase?: ThreePhaseContext | null;
    threePhaseConfig?: ThreePhaseConfig | null;
  }
) {
  const suffix = resolveRuntimeTemplate({
    key: "confirm_yes_no_suffix",
    botContext: input?.botContext || null,
    entity: input?.entity || null,
  });
  const confirming = `${String(question || "").trim()}\n${suffix}`.trim();
  if (!resolveThreePhaseEnabled(input?.threePhaseConfig)) return confirming;
  const phase = input?.phase || null;
  const confirmed =
    phase?.confirmed ??
    (input?.botContext && typeof input.botContext === "object"
      ? (input.botContext as Record<string, any>).three_phase_confirmed
      : null);
  const next =
    phase?.next ??
    (input?.botContext && typeof input.botContext === "object"
      ? (input.botContext as Record<string, any>).three_phase_next
      : null);
  const labels = phase?.labels || resolveThreePhaseLabels(input?.threePhaseConfig);
  return buildThreePhasePrompt({ confirmed, confirming, next, labels });
}

export function resolveRuntimeTemplateOverridesFromPolicy(templates: Record<string, any> | null | undefined) {
  const source = templates && typeof templates === "object" ? templates : {};
  const keysByPriority: Record<TemplateKey, string[]> = {
    confirm_yes_no_suffix: ["confirm_yes_no_suffix", "yes_no_suffix", "confirmation_yes_no_suffix"],
    intent_disambiguation_title: [
      "intent_disambiguation_title",
      "intent_disambiguation_prompt_title",
      "ask_intent_disambiguation_title",
    ],
    intent_disambiguation_example: [
      "intent_disambiguation_example",
      "intent_disambiguation_prompt_example",
      "ask_intent_disambiguation_example",
    ],
    restock_lead_days_title: ["restock_lead_days_title", "ask_restock_lead_days_title"],
    restock_lead_days_selectable: ["restock_lead_days_selectable", "ask_restock_lead_days_selectable"],
    restock_lead_days_example: ["restock_lead_days_example", "ask_restock_lead_days_example"],
    restock_lead_days_retry_title: ["restock_lead_days_retry_title", "ask_restock_lead_days_retry_title"],
    restock_product_choice_title: ["restock_product_choice_title", "ask_restock_product_choice_title"],
    order_choice_title: ["order_choice_title", "order_choices_prompt", "ask_order_choice_title"],
    order_choice_header: ["order_choice_header", "order_choices_header", "ask_order_choice_header"],
    numbered_choice_example: ["numbered_choice_example", "choice_example"],
  };
  const out: Partial<Record<TemplateKey, string>> = {};
  (Object.keys(keysByPriority) as TemplateKey[]).forEach((key) => {
    const aliases = keysByPriority[key];
    for (const alias of aliases) {
      const value = String((source as Record<string, any>)[alias] || "").trim();
      if (value) {
        out[key] = value;
        break;
      }
    }
  });
  return out;
}

export function mergeRuntimeTemplateOverrides(
  botContext: Record<string, any> | null | undefined,
  overrides: Partial<Record<TemplateKey, string>>
) {
  const base = botContext && typeof botContext === "object" ? botContext : {};
  const existing = (base as Record<string, any>).template_overrides;
  const existingMap =
    existing && typeof existing === "object"
      ? (Object.fromEntries(
          Object.entries(existing as Record<string, any>).map(([k, v]) => [k, String(v ?? "").trim()])
        ) as Record<string, string>)
      : {};
  const normalizedOverrides = Object.fromEntries(
    Object.entries(overrides || {})
      .map(([k, v]) => [k, String(v || "").trim()])
      .filter(([, v]) => Boolean(v))
  ) as Record<string, string>;
  return {
    ...base,
    template_overrides: {
      ...existingMap,
      ...normalizedOverrides,
    },
  } as Record<string, any>;
}

export function buildRestockLeadDaysPrompt(input: {
  minRequired: number;
  options: number[];
  exampleValues: number[];
  botContext?: Record<string, any> | null;
  entity?: Record<string, any> | null;
  retryMode?: boolean;
}) {
  const optionText = (input.options || []).map((v) => `D-${v}`).join(", ") || "-";
  const exampleText = (input.exampleValues || []).join(",") || "-";
  const titleTemplate = resolveRuntimeTemplate({
    key: input.retryMode ? "restock_lead_days_retry_title" : "restock_lead_days_title",
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const selectableTemplate = resolveRuntimeTemplate({
    key: "restock_lead_days_selectable",
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const exampleTemplate = resolveRuntimeTemplate({
    key: "restock_lead_days_example",
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const replaceVars = (raw: string) =>
    String(raw || "")
      .replaceAll("{min}", String(Math.max(1, Number(input.minRequired || 1))))
      .replaceAll("{options}", optionText)
      .replaceAll("{example}", exampleText);
  const lines = [replaceVars(titleTemplate)];
  if (!input.retryMode) lines.push(replaceVars(selectableTemplate));
  lines.push(replaceVars(exampleTemplate));
  return lines.join("\n");
}

export function buildNumberedChoicePrompt(input: {
  titleKey: "restock_product_choice_title" | "order_choice_title";
  lines: string[];
  botContext?: Record<string, any> | null;
  entity?: Record<string, any> | null;
  headerKey?: "order_choice_header";
  includeExample?: boolean;
}) {
  const title = resolveRuntimeTemplate({
    key: input.titleKey,
    botContext: input.botContext || null,
    entity: input.entity || null,
  });
  const output = [title, ...(Array.isArray(input.lines) ? input.lines : [])];
  if (input.headerKey) {
    const header = resolveRuntimeTemplate({
      key: input.headerKey,
      botContext: input.botContext || null,
      entity: input.entity || null,
    });
    output.splice(1, 0, header);
  }
  if (input.includeExample) {
    const example = resolveRuntimeTemplate({
      key: "numbered_choice_example",
      botContext: input.botContext || null,
      entity: input.entity || null,
    });
    output.push(example);
  }
  return output.filter(Boolean).join("\n");
}
