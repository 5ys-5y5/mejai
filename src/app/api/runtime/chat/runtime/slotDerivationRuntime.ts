import type { RuntimeTimingStage } from "./runtimeSupport";

type SlotDerivationParams = {
  message: string;
  expectedInput: string | null;
  expectedInputs: string[];
  resolvedIntent: string;
  agentLlm: "chatgpt" | "gemini" | null;
  timingStages: RuntimeTimingStage[];
  pushRuntimeTimingStage: (
    stages: RuntimeTimingStage[],
    name: string,
    startedAt: number,
    meta?: Record<string, any>
  ) => void;
  derivedOrderId: string | null;
  derivedPhone: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  extractOrderId: (text: string) => string | null;
  extractPhone: (text: string) => string | null;
  extractZipcode: (text: string) => string | null;
  extractAddress: (
    text: string,
    orderId: string | null,
    phone: string | null,
    zipcode: string | null
  ) => string | null;
  extractAddressDetail: (text: string) => string | null;
  isLikelyAddressDetailOnly: (text: string) => boolean;
  extractEntitiesWithLlm: (
    text: string,
    llm: "chatgpt" | "gemini"
  ) => Promise<{ order_id?: string | null; phone?: string | null; address?: string | null; intent?: string | null } | null>;
  detectIntent: (text: string) => string;
};

type SlotDerivationResult = {
  derivedOrderId: string | null;
  derivedPhone: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  resolvedIntent: string;
};

export async function deriveSlotsForTurn(params: SlotDerivationParams): Promise<SlotDerivationResult> {
  const {
    message,
    expectedInput,
    expectedInputs,
    resolvedIntent,
    agentLlm,
    timingStages,
    pushRuntimeTimingStage,
    extractOrderId,
    extractPhone,
    extractZipcode,
    extractAddress,
    extractAddressDetail,
    isLikelyAddressDetailOnly,
    extractEntitiesWithLlm,
    detectIntent,
  } = params;
  let nextOrderId = params.derivedOrderId;
  let nextPhone = params.derivedPhone;
  let nextZipcode = params.derivedZipcode;
  let nextAddress = params.derivedAddress;
  let nextResolvedIntent = resolvedIntent;
  const expectedSet = new Set(expectedInputs.map((item) => String(item || "").trim()).filter(Boolean));
  const confirmationOnly =
    expectedSet.size > 0 &&
    Array.from(expectedSet).every((slot) => ["confirm", "choice", "reason"].includes(slot));
  const restricted = expectedInputs.length > 0 && !confirmationOnly;

  if (restricted) {
    if (expectedSet.has("otp_code")) {
      nextOrderId = null;
      nextPhone = null;
      nextZipcode = null;
      nextAddress = null;
    } else if (expectedSet.has("zipcode") || expectedInput === "zipcode") {
      nextOrderId = null;
      nextPhone = null;
      nextAddress = null;
      const rawDigits = message.replace(/[^\d]/g, "");
      const strictFive = /^\d{5}$/.test(rawDigits) ? rawDigits : null;
      nextZipcode = extractZipcode(message) || strictFive || null;
    } else if (expectedSet.has("phone") || expectedInput === "phone") {
      nextOrderId = null;
      nextZipcode = null;
      nextAddress = null;
      nextPhone = extractPhone(message);
    } else if (expectedSet.has("order_id") || expectedInput === "order_id") {
      nextPhone = null;
      nextZipcode = null;
      nextAddress = null;
      nextOrderId = extractOrderId(message);
    } else if (expectedSet.has("address") || expectedInput === "address") {
      nextOrderId = null;
      nextPhone = null;
      nextZipcode = extractZipcode(message);
      const cleaned = message.replace(/^(address|addr|shipping address)\s*[:\-]?\s*/i, "").trim();
      const extractedAddress = extractAddress(message, null, null, nextZipcode) || cleaned || null;
      if (extractedAddress && isLikelyAddressDetailOnly(extractedAddress)) {
        nextAddress = extractAddressDetail(extractedAddress) || extractedAddress;
      } else {
        nextAddress = extractedAddress;
      }
    } else if (expectedSet.has("order_id") && expectedSet.has("phone")) {
      nextZipcode = null;
      nextAddress = null;
      const phone = extractPhone(message);
      if (phone) {
        nextPhone = phone;
        nextOrderId = null;
      } else {
        nextOrderId = extractOrderId(message);
        nextPhone = null;
      }
    } else {
      nextOrderId = null;
      nextPhone = null;
      nextZipcode = null;
      nextAddress = null;
    }
  }
  if (!nextOrderId && !nextPhone && message.length > 8 && !expectedInput && agentLlm) {
    const extractEntityLlmStartedAt = Date.now();
    const llmExt = await extractEntitiesWithLlm(message, agentLlm);
    pushRuntimeTimingStage(timingStages, "llm_extract_entities", extractEntityLlmStartedAt, {
      extracted: Boolean(llmExt),
    });
    if (llmExt) {
      if (llmExt.order_id && !nextOrderId) nextOrderId = String(llmExt.order_id).trim();
      if (llmExt.phone && !nextPhone) nextPhone = String(llmExt.phone).trim();
      if (llmExt.address && !nextAddress) nextAddress = String(llmExt.address).trim();
      if (nextResolvedIntent === "general" && llmExt.intent) {
        const mappedIntent = detectIntent(llmExt.intent) === "general" ? llmExt.intent : detectIntent(llmExt.intent);
        if (["change", "order_lookup", "shipment", "refund", "restock_subscribe", "restock_inquiry"].includes(mappedIntent)) {
          nextResolvedIntent = mappedIntent;
        }
      }
    }
  }

  return {
    derivedOrderId: nextOrderId,
    derivedPhone: nextPhone,
    derivedZipcode: nextZipcode,
    derivedAddress: nextAddress,
    resolvedIntent: nextResolvedIntent,
  };
}


