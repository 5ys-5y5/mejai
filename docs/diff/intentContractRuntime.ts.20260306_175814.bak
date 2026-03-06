import { shouldRequireBeforeAfterSummaryForMutations } from "../policies/principles";

export type MutationIntentContract = {
  intent: string;
  mutationTool: string;
  requiredSlots: string[];
  userSuccessPrefix: string;
  userSuccessNextAction: string;
  debugReason: string;
  debugNextAction: string;
};

export type IntentContract = {
  intent: string;
  reuseSlots?: string[];
  preventEscalation?: boolean;
  slotLabels?: Record<string, string>;
  completionCues?: string[];
};

export type SlotContract = {
  key: string;
  label: string;
};

export type SubstitutionPlan = {
  target: string;
  ask: readonly string[];
  tools: readonly string[];
  requires: readonly string[];
};

const SLOT_CONTRACTS: SlotContract[] = [
  { key: "order_id", label: "\uC8FC\uBB38\uBC88\uD638" },
  { key: "phone", label: "\uC5F0\uB77D\uCC98" },
  { key: "address", label: "\uBC30\uC1A1\uC9C0" },
  { key: "zipcode", label: "\uC6B0\uD3B8\uBC88\uD638" },
  { key: "email", label: "\uC774\uBA54\uC77C" },
  { key: "name", label: "\uC218\uB839\uC778" },
  { key: "channel", label: "\uC5F0\uB77D \uCC44\uB110" },
  { key: "product", label: "\uC0C1\uD488" },
];

const INTENT_CONTRACTS: IntentContract[] = [
  {
    intent: "order_change",
    reuseSlots: ["order_id", "phone", "address", "zipcode"],
    preventEscalation: true,
    completionCues: ["\uBC30\uC1A1\uC9C0 \uBCC0\uACBD\uC774 \uC644\uB8CC", "\uBCC0\uACBD\uC774 \uC644\uB8CC"],
  },
  {
    intent: "refund_request",
    reuseSlots: ["order_id", "phone"],
    preventEscalation: true,
  },
  {
    intent: "shipping_inquiry",
    reuseSlots: ["order_id", "phone"],
  },
  {
    intent: "restock_inquiry",
    reuseSlots: ["product", "channel"],
    completionCues: ["\uC785\uACE0 \uC608\uC815\uC77C", "\uC694\uC57D:"],
  },
  {
    intent: "restock_subscribe",
    reuseSlots: ["product", "channel", "phone"],
    completionCues: ["\uC7AC\uC785\uACE0 \uC54C\uB9BC \uC2E0\uCCAD\uC774 \uC644\uB8CC", "\uC694\uC57D:"],
  },
  {
    intent: "faq",
    reuseSlots: [],
  },
  {
    intent: "general",
    reuseSlots: [],
  },
];

const MUTATION_INTENT_CONTRACTS: MutationIntentContract[] = [
  {
    intent: "order_change",
    mutationTool: "update_order_shipping_address",
    requiredSlots: ["order_id", "address", "zipcode"],
    userSuccessPrefix: "\uBC30\uC1A1\uC9C0 \uBCC0\uACBD\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
    userSuccessNextAction: "\uCD94\uAC00\uB85C \uBCC0\uACBD\uD560 \uB0B4\uC6A9\uC774 \uC788\uC73C\uBA74 \uC54C\uB824\uC8FC\uC138\uC694.",
    debugReason: "\uC8FC\uBB38 \uC815\uBCF4 \uBCC0\uACBD \uC815\uCC45\uC5D0 \uB530\uB77C \uCC98\uB9AC\uD588\uC2B5\uB2C8\uB2E4.",
    debugNextAction: "\uCD94\uAC00 \uBCC0\uACBD \uC0AC\uD56D\uC774 \uC788\uC73C\uBA74 \uC54C\uB824\uC8FC\uC138\uC694.",
  },
];

export function getIntentContract(intent: string | null | undefined) {
  const safeIntent = String(intent || "").trim();
  if (!safeIntent) return null;
  return INTENT_CONTRACTS.find((contract) => contract.intent === safeIntent) || null;
}

export function getSlotContract(slotKey: string | null | undefined) {
  const key = String(slotKey || "").trim();
  if (!key) return null;
  return SLOT_CONTRACTS.find((contract) => contract.key === key) || null;
}

export function getSlotLabel(slotKey: string | null | undefined, intent?: string | null) {
  const intentContract = intent ? getIntentContract(intent) : null;
  if (intentContract?.slotLabels && intentContract.slotLabels[slotKey || ""]) {
    return intentContract.slotLabels[slotKey || ""];
  }
  const slotContract = getSlotContract(slotKey);
  if (slotContract?.label) return slotContract.label;
  const key = String(slotKey || "").trim();
  if (!key) return "\uC815\uBCF4";
  return key.replace(/_/g, " ");
}

const SUPPORTED_SUBSTITUTION_ASK_SLOTS = new Set(["phone", "address"]);

function pickSubstitutionAskSlot(plan: SubstitutionPlan, entity?: Record<string, any> | null) {
  const askList = Array.isArray(plan.ask) ? plan.ask.map((slot) => String(slot || "").trim()).filter(Boolean) : [];
  if (askList.length === 0) return null;
  for (const slot of askList) {
    if (!SUPPORTED_SUBSTITUTION_ASK_SLOTS.has(slot)) continue;
    if (!entity || !String(entity[slot] || "").trim()) return slot;
  }
  const firstSupported = askList.find((slot) => SUPPORTED_SUBSTITUTION_ASK_SLOTS.has(slot));
  return firstSupported || null;
}

export function resolveSubstitutionPrompt(input: {
  targetSlot: string;
  intent?: string | null;
  plan: SubstitutionPlan | null;
  entity?: Record<string, any> | null;
}) {
  if (!input.plan) return null;
  const askSlot = pickSubstitutionAskSlot(input.plan, input.entity || null);
  if (!askSlot) return null;
  const askLabel = getSlotLabel(askSlot, input.intent);
  const targetLabel = getSlotLabel(input.targetSlot, input.intent);
  if (input.targetSlot === "zipcode") {
    return {
      askSlot,
      prompt: "우편번호를 몰라도 괜찮아요. 도로명/지번 주소를 알려주세요.",
    };
  }
  if (input.targetSlot === "order_id") {
    return {
      askSlot,
      prompt: `주문번호를 몰라도 괜찮아요. ${askLabel}를 알려주세요.`,
    };
  }
  return {
    askSlot,
    prompt: `${targetLabel} 대신 ${askLabel}를 알려주세요.`,
  };
}

export function shouldReuseSlotForIntent(intent: string | null | undefined, slotKey: string | null | undefined) {
  const contract = getIntentContract(intent);
  if (!contract) return true;
  if (!Array.isArray(contract.reuseSlots)) return true;
  return contract.reuseSlots.includes(String(slotKey || "").trim());
}

export function getMutationIntentContract(intent: string | null | undefined) {
  const safeIntent = String(intent || "").trim();
  if (!safeIntent) return null;
  return MUTATION_INTENT_CONTRACTS.find((contract) => contract.intent === safeIntent) || null;
}

function readEntityValue(entity: Record<string, any>, key: string) {
  const raw = entity && typeof entity[key] === "string" ? String(entity[key]) : "";
  return raw.trim();
}

export function resolveMutationReadyState(input: {
  contract: MutationIntentContract;
  entity: Record<string, any>;
  resolvedOrderId?: string | null;
}) {
  const { contract, entity, resolvedOrderId } = input;
  const resolved: Record<string, string> = {};
  const missing: Record<string, boolean> = {};
  contract.requiredSlots.forEach((slot) => {
    let value = readEntityValue(entity, slot);
    if (slot === "order_id" && resolvedOrderId) {
      value = String(resolvedOrderId).trim() || value;
    }
    resolved[slot] = value;
    missing[slot] = !value;
  });
  const ready = Object.values(missing).every((flag) => !flag);
  return { ready, resolved, missing };
}

export function buildMutationToolCall(input: {
  contract: MutationIntentContract;
  entity: Record<string, any>;
  resolvedOrderId?: string | null;
}) {
  const { contract, entity, resolvedOrderId } = input;
  const orderId =
    String(resolvedOrderId || "").trim() ||
    readEntityValue(entity, "order_id");
  const zipcode = readEntityValue(entity, "zipcode");
  return {
    name: contract.mutationTool,
    args: {
      order_id: orderId || undefined,
      zipcode: zipcode || undefined,
    },
  };
}

export function buildMutationSuccessMessages(input: {
  contract: MutationIntentContract;
  resolvedOrderId: string | null;
  appliedText: string;
  beforeText: string;
  requestText: string;
  hasSemanticMismatch: boolean;
}) {
  const {
    contract,
    resolvedOrderId,
    appliedText,
    beforeText,
    requestText,
    hasSemanticMismatch,
  } = input;
  const requireBeforeAfter = shouldRequireBeforeAfterSummaryForMutations();
  const userLines = [
    contract.userSuccessPrefix,
    `\uC8FC\uBB38\uBC88\uD638 ${resolvedOrderId || "-"}\uC758 \uBC30\uC1A1\uC9C0\uAC00 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
    requireBeforeAfter ? `\uBCC0\uACBD \uC804: ${beforeText}` : null,
    requireBeforeAfter ? `\uBCC0\uACBD \uD6C4: ${appliedText}` : `\uBCC0\uACBD\uB41C \uBC30\uC1A1\uC9C0: ${appliedText}`,
    hasSemanticMismatch
      ? "\uC694\uCCAD\uD558\uC2E0 \uC8FC\uC18C\uC640 \uC801\uC6A9\uB41C \uC8FC\uC18C\uAC00 \uB2EC\uB77C \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uB2E4\uC2DC \uC54C\uB824\uC8FC\uC138\uC694."
      : null,
    contract.userSuccessNextAction,
  ].filter(Boolean) as string[];

  const debugLines = [
    `\uC694\uC57D: ${contract.userSuccessPrefix}`,
    `\uADFC\uAC70: ${contract.debugReason}`,
    `\uC0C1\uC138: \uC8FC\uBB38\uBC88\uD638 ${resolvedOrderId || "-"}\uC758 \uBC30\uC1A1\uC9C0\uB97C \uBCC0\uACBD\uD588\uC2B5\uB2C8\uB2E4.`,
    `- \uBCC0\uACBD \uC804: ${beforeText}`,
    `- \uC694\uCCAD: ${requestText}`,
    `- \uC801\uC6A9: ${appliedText}`,
    hasSemanticMismatch
      ? "- \uC8FC\uC758: \uC694\uCCAD\uACFC \uC801\uC6A9 \uACB0\uACFC\uAC00 \uB2EC\uB77C \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
      : null,
    `\uB2E4\uC74C \uC561\uC158: ${contract.debugNextAction}`,
  ].filter(Boolean) as string[];

  return {
    userMessage: userLines.join("\n"),
    debugMessage: debugLines.join("\n"),
  };
}
