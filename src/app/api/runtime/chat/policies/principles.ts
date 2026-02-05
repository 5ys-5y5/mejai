export const CHAT_PRINCIPLES = {
  // Non-negotiable privacy gate for high-risk operations.
  safety: {
    otpRequiredIntents: ["order_change", "shipping_inquiry", "refund_request"] as const,
    otpRequiredTools: [
      "find_customer_by_phone",
      "list_orders",
      "lookup_order",
      "track_shipment",
      "update_order_shipping_address",
    ] as const,
  },
  // Deterministic answer-shape policy used by choice flows.
  response: {
    uniqueAnswerCount: 1,
    choiceAnswerMinCount: 2,
    orderLookupPreviewMax: 3,
    choicePreviewMax: 5,
    quickReplyMax: 9,
  },
} as const;

export function requiresOtpForIntent(intent: string) {
  return (CHAT_PRINCIPLES.safety.otpRequiredIntents as readonly string[]).includes(String(intent || ""));
}

export function isOtpRequiredTool(toolName: string) {
  return (CHAT_PRINCIPLES.safety.otpRequiredTools as readonly string[]).includes(String(toolName || ""));
}

export function hasUniqueAnswerCandidate(count: number) {
  return Number(count) === CHAT_PRINCIPLES.response.uniqueAnswerCount;
}

export function hasChoiceAnswerCandidates(count: number) {
  return Number(count) >= CHAT_PRINCIPLES.response.choiceAnswerMinCount;
}

