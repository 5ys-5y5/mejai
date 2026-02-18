export type MutationIntentContract = {
  intent: string;
  mutationTool: string;
  requiredSlots: string[];
  userSuccessPrefix: string;
  userSuccessNextAction: string;
  debugReason: string;
  debugNextAction: string;
};

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
  const userLines = [
    contract.userSuccessPrefix,
    `\uC8FC\uBB38\uBC88\uD638 ${resolvedOrderId || "-"}\uC758 \uBC30\uC1A1\uC9C0\uAC00 \uC5C5\uB370\uC774\uD2B8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
    `\uBCC0\uACBD\uB41C \uBC30\uC1A1\uC9C0: ${appliedText}`,
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
