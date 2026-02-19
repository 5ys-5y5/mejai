import type { PolicyEvalContext } from "@/lib/policyEngine";
import { resolveAddressWithReuse, resolvePhoneWithReuse } from "./memoryReuseRuntime";
import { getExpectedSlotKeys } from "./inputContractRuntime";
import { requiresOtpForIntent } from "../policies/principles";
import { getSlotLabel } from "./intentContractRuntime";
import { normalizeConfirmedEntity } from "../shared/confirmedEntity";

type ContextResolutionParams = {
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  message: string;
  expectedInput: string | null;
  expectedInputs: string[];
  forcedIntentQueue: string[];
  lockIntentToRestockSubscribe: boolean;
  prevIntent: string | null;
  prevEntity: Record<string, any>;
  prevBotContext: Record<string, any>;
  prevSelectedOrderId: string | null;
  prevOrderIdFromTranscript: string | null;
  prevPhoneFromTranscript: string | null;
  prevAddressFromTranscript: string | null;
  prevZipFromTranscript: string | null;
  recentEntity: Record<string, string | null> | null;
  prevChoices: Array<{ order_id?: string }>;
  derivedChannel: string | null;
  derivedOrderId: string | null;
  derivedPhone: string | null;
  derivedAddress: string | null;
  derivedZipcode: string | null;
  detectIntent: (text: string) => string;
  extractChoiceIndex: (text: string, max: number) => number | null;
  isLikelyOrderId: (value?: string | null) => boolean;
  isLikelyZipcode: (value?: string | null) => boolean;
  isAddressChangeUtterance: (text: string) => boolean;
  isYesText: (text: string) => boolean;
  isNoText: (text: string) => boolean;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  resolvedIntent: string;
};

type ContextResolutionResult = {
  resolvedIntent: string;
  detectedIntent: string;
  hasAddressSignal: boolean;
  resolvedOrderId: string | null;
  policyContext: PolicyEvalContext;
  contaminationSummaries: string[];
};

function shouldPreserveEntityAuditKey(key: string) {
  const normalized = String(key || "").trim();
  if (!normalized) return false;
  if (normalized.startsWith("shipping_before_")) return true;
  if (normalized.startsWith("shipping_request_")) return true;
  if (normalized.startsWith("resolved_")) return true;
  if (normalized.startsWith("original_")) return true;
  if (normalized.startsWith("mutation_")) return true;
  if (normalized.endsWith("_before")) return true;
  if (normalized.includes("_before_")) return true;
  return false;
}

const CONVERSATION_ENTITY_KEYS = new Set([
  "order_id",
  "phone",
  "address",
  "zipcode",
  "channel",
  "product_query",
  "product_name",
  "product_id",
  "member_id",
  "resolved_road_address",
  "resolved_jibun_address",
]);

const ENTITY_UPDATE_NOTICE_KEYS = new Set([
  "order_id",
  "phone",
  "address",
  "zipcode",
  "channel",
  "product_query",
  "product_name",
  "product_id",
]);

function isConversationEntityKey(key: string) {
  const normalized = String(key || "").trim();
  if (!normalized) return false;
  if (CONVERSATION_ENTITY_KEYS.has(normalized)) return true;
  return shouldPreserveEntityAuditKey(normalized);
}

function pickConversationEntityBase(entity: Record<string, any>) {
  const entries = Object.entries(entity || {}).filter(([key, value]) => {
    if (!isConversationEntityKey(key)) return false;
    return value !== undefined;
  });
  return Object.fromEntries(entries);
}

function normalizeEntityValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function buildEntityUpdateNotice(updates: Array<{ field: string; prev: string; next: string }>, intent: string) {
  if (!updates.length) return "";
  const lines = updates.map((update) => {
    const label = getSlotLabel(update.field, intent);
    return `${label} ${update.prev} -> ${update.next}`;
  });
  return `\uC815\uBCF4 \uC5C5\uB370\uC774\uD2B8: ${lines.join(", ")}. \uC774\uD6C4 \uC548\uB0B4\uB294 \uBCC0\uACBD\uB41C \uC815\uBCF4 \uAE30\uC900\uC73C\uB85C \uC9C4\uD589\uD569\uB2C8\uB2E4.`;
}

function mergeConversationEntity(input: {
  base: Record<string, any>;
  nextValues: Record<string, string | null | undefined>;
  noticeKeys: Set<string>;
}) {
  const merged = { ...(input.base || {}) } as Record<string, any>;
  const updates: Array<{ field: string; prev: string; next: string }> = [];
  const noticeUpdates: Array<{ field: string; prev: string; next: string }> = [];
  Object.entries(input.nextValues || {}).forEach(([field, nextRaw]) => {
    const next = normalizeEntityValue(nextRaw);
    if (!next) return;
    const prev = normalizeEntityValue(merged[field]);
    if (!prev) {
      merged[field] = nextRaw;
      return;
    }
    if (prev === next) return;
    merged[field] = nextRaw;
    const update = { field, prev, next };
    updates.push(update);
    if (input.noticeKeys.has(field)) {
      noticeUpdates.push(update);
    }
  });
  return { merged, updates, noticeUpdates };
}

export async function resolveIntentAndPolicyContext(params: ContextResolutionParams): Promise<ContextResolutionResult> {
  const {
    context,
    sessionId,
    latestTurnId,
    message,
  expectedInput,
  expectedInputs,
    forcedIntentQueue,
    lockIntentToRestockSubscribe,
    prevIntent,
    prevEntity,
    prevBotContext,
    prevSelectedOrderId,
    prevOrderIdFromTranscript,
    prevPhoneFromTranscript,
    prevAddressFromTranscript,
    prevZipFromTranscript,
    recentEntity,
    prevChoices,
    derivedChannel,
    derivedOrderId,
    derivedPhone,
    derivedAddress,
    derivedZipcode,
    detectIntent,
    extractChoiceIndex,
    isLikelyOrderId,
    isLikelyZipcode,
    isAddressChangeUtterance,
    isYesText,
    isNoText,
    insertEvent,
    resolvedIntent,
  } = params;

  const contaminationSummaries: string[] = [];
  const noteContamination = (info: {
    slot: string;
    reason: string;
    action: string;
    candidate?: string | null;
  }) => {
    const candidate = String(info.candidate || "").trim();
    const summary = [info.slot, info.reason, info.action, candidate ? `candidate=${candidate}` : null]
      .filter(Boolean)
      .join(" | ");
    contaminationSummaries.push(summary);
    if (contaminationSummaries.length > 10) {
      contaminationSummaries.splice(0, contaminationSummaries.length - 10);
    }
  };

  const expectedSlotKeys = new Set(getExpectedSlotKeys(expectedInputs || []));
  const hasExpectedInputs = Array.isArray(expectedInputs) && expectedInputs.length > 0;
  const allowOrderIdReuse =
    !hasExpectedInputs ||
    expectedSlotKeys.has("order_id") ||
    requiresOtpForIntent(resolvedIntent);
  const orderChoiceIndex =
    !derivedOrderId && prevChoices.length > 0 ? extractChoiceIndex(message, prevChoices.length) : null;
  const orderIdFromChoice =
    orderChoiceIndex && prevChoices[orderChoiceIndex - 1]?.order_id
      ? String(prevChoices[orderChoiceIndex - 1]?.order_id)
      : null;
  const safePrevEntityOrderId =
    typeof prevEntity.order_id === "string" && isLikelyOrderId(prevEntity.order_id)
      ? prevEntity.order_id
      : null;
  const safePrevOrderIdFromTranscript =
    prevOrderIdFromTranscript && isLikelyOrderId(prevOrderIdFromTranscript)
      ? prevOrderIdFromTranscript
      : null;
  const safePrevSelectedOrderId =
    prevSelectedOrderId && isLikelyOrderId(prevSelectedOrderId) ? prevSelectedOrderId : null;
  const safeRecentOrderId =
    recentEntity?.order_id && isLikelyOrderId(recentEntity.order_id) ? recentEntity.order_id : null;
  let resolvedOrderId =
    derivedOrderId ??
    orderIdFromChoice ??
    safePrevSelectedOrderId ??
    safePrevEntityOrderId ??
    safePrevOrderIdFromTranscript ??
    (safeRecentOrderId || null);

  if (resolvedOrderId && !isLikelyOrderId(resolvedOrderId)) {
    noteContamination({
      slot: "order_id",
      candidate: resolvedOrderId,
      reason: "ORDER_ID_FAILED_LIKELIHOOD_CHECK",
      action: "CLEARED",
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "CONTEXT_CONTAMINATION_DETECTED",
      {
        slot: "order_id",
        candidate: resolvedOrderId,
        reason: "ORDER_ID_FAILED_LIKELIHOOD_CHECK",
        action: "CLEARED",
      },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
    resolvedOrderId = null;
  }

  if (resolvedOrderId && !allowOrderIdReuse) {
    noteContamination({
      slot: "order_id",
      candidate: resolvedOrderId,
      reason: "ORDER_ID_CARRYOVER_BLOCKED_BY_EXPECTED_INPUTS",
      action: "CLEARED",
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "CONTEXT_CONTAMINATION_DETECTED",
      {
        slot: "order_id",
        candidate: resolvedOrderId,
        reason: "ORDER_ID_CARRYOVER_BLOCKED_BY_EXPECTED_INPUTS",
        action: "CLEARED",
        expected_inputs: expectedInputs || [],
      },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
    resolvedOrderId = null;
  }

  if (resolvedOrderId && prevChoices.length > 0) {
    const listedOrderIds = new Set(
      prevChoices
        .map((choice) => String(choice.order_id || "").trim())
        .filter((value) => isLikelyOrderId(value))
    );
    if (listedOrderIds.size > 0 && !listedOrderIds.has(resolvedOrderId)) {
      noteContamination({
        slot: "order_id",
        candidate: resolvedOrderId,
        reason: "ORDER_ID_NOT_IN_ACTIVE_CHOICES",
        action: listedOrderIds.size === 1 ? "REPLACED_WITH_SINGLE_CHOICE" : "CLEARED",
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "CONTEXT_CONTAMINATION_DETECTED",
        {
          slot: "order_id",
          candidate: resolvedOrderId,
          reason: "ORDER_ID_NOT_IN_ACTIVE_CHOICES",
          action: listedOrderIds.size === 1 ? "REPLACED_WITH_SINGLE_CHOICE" : "CLEARED",
        },
        { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
      );
      resolvedOrderId = listedOrderIds.size === 1 ? Array.from(listedOrderIds)[0] : null;
    }
  }

  const allowAddressReuse = !hasExpectedInputs || expectedSlotKeys.has("address") || expectedSlotKeys.has("zipcode");
  const allowZipHistoryFallback = !hasExpectedInputs || expectedSlotKeys.has("address") || expectedSlotKeys.has("zipcode");

  const safePrevEntityZipcode =
    typeof prevEntity.zipcode === "string" && isLikelyZipcode(prevEntity.zipcode)
      ? String(prevEntity.zipcode).trim()
      : null;
  const safePrevZipFromTranscript =
    prevZipFromTranscript && isLikelyZipcode(prevZipFromTranscript)
      ? prevZipFromTranscript
      : null;
  const safeRecentZipcode =
    recentEntity?.zipcode && isLikelyZipcode(recentEntity.zipcode)
      ? String(recentEntity.zipcode).trim()
      : null;
  const addressStage = String(prevBotContext.address_stage || "").trim();
  const hasActiveAddressPending =
    Boolean(prevBotContext.address_pending) &&
    ["awaiting_address", "awaiting_zipcode", "awaiting_zipcode_confirm"].includes(addressStage);
  const pendingZipFromContextRaw =
    prevBotContext.address_pending && isLikelyZipcode(String(prevBotContext.pending_zipcode || ""))
      ? String(prevBotContext.pending_zipcode || "").trim()
      : null;
  const allowPendingZipCarry =
    hasActiveAddressPending &&
    (allowZipHistoryFallback || (addressStage === "awaiting_zipcode_confirm" && (isYesText(message) || isNoText(message))));
  const pendingZipFromContext = allowPendingZipCarry ? pendingZipFromContextRaw : null;
  if (pendingZipFromContextRaw && !pendingZipFromContext) {
    noteContamination({
      slot: "zipcode",
      candidate: pendingZipFromContextRaw,
      reason: "ZIPCODE_PENDING_CONTEXT_BLOCKED_BY_EXPECTED_INPUT",
      action: "CLEARED",
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "CONTEXT_CONTAMINATION_DETECTED",
      {
        slot: "zipcode",
        candidate: pendingZipFromContextRaw,
        reason: "ZIPCODE_PENDING_CONTEXT_BLOCKED_BY_EXPECTED_INPUT",
        action: "CLEARED",
        expected_input: expectedInput,
        address_stage: addressStage || null,
      },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
  }
  const blockedZipFallback =
    !allowZipHistoryFallback && !derivedZipcode
      ? safePrevEntityZipcode || safePrevZipFromTranscript || safeRecentZipcode
      : null;
  if (blockedZipFallback) {
    noteContamination({
      slot: "zipcode",
      candidate: blockedZipFallback,
      reason: "ZIPCODE_CARRYOVER_BLOCKED_BY_EXPECTED_INPUT",
      action: "CLEARED",
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "CONTEXT_CONTAMINATION_DETECTED",
      {
        slot: "zipcode",
        candidate: blockedZipFallback,
        reason: "ZIPCODE_CARRYOVER_BLOCKED_BY_EXPECTED_INPUT",
        action: "CLEARED",
        expected_input: expectedInput,
      },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
  }
  let resolvedZipcode =
    derivedZipcode ??
    pendingZipFromContext ??
    (allowZipHistoryFallback
      ? safePrevEntityZipcode ?? safePrevZipFromTranscript ?? (safeRecentZipcode || null)
      : null);
  if (resolvedZipcode && !isLikelyZipcode(resolvedZipcode)) {
    noteContamination({
      slot: "zipcode",
      candidate: resolvedZipcode,
      reason: "ZIPCODE_FAILED_LIKELIHOOD_CHECK",
      action: "CLEARED",
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "CONTEXT_CONTAMINATION_DETECTED",
      {
        slot: "zipcode",
        candidate: resolvedZipcode,
        reason: "ZIPCODE_FAILED_LIKELIHOOD_CHECK",
        action: "CLEARED",
      },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
    resolvedZipcode = null;
  }
  const confirmedRoadAddress =
    addressStage === "awaiting_zipcode_confirm" && isYesText(message)
      ? String(prevBotContext.pending_road_addr || "").trim() || null
      : null;
  const confirmedJibunAddress =
    addressStage === "awaiting_zipcode_confirm" && isYesText(message)
      ? String(prevBotContext.pending_jibun_addr || "").trim() || null
      : null;
  const carriedRoadAddress =
    confirmedRoadAddress ||
    (typeof prevEntity.resolved_road_address === "string" ? String(prevEntity.resolved_road_address).trim() : "") ||
    null;
  const carriedJibunAddress =
    confirmedJibunAddress ||
    (typeof prevEntity.resolved_jibun_address === "string" ? String(prevEntity.resolved_jibun_address).trim() : "") ||
    null;

  const explicitUserConfirmed = isYesText(message);
  const detectedIntent = detectIntent(message);
  const hasAddressSignal =
    Boolean(derivedAddress) ||
    (typeof prevEntity.address === "string" && Boolean(prevEntity.address.trim())) ||
    Boolean(prevBotContext.address_pending);
  let seededIntent =
    forcedIntentQueue.length > 0
      ? forcedIntentQueue[0]
      : detectedIntent === "general"
        ? (prevIntent || "general")
        : detectedIntent;
  if (lockIntentToRestockSubscribe) seededIntent = "restock_subscribe";
  if (seededIntent === "shipping_inquiry" && hasAddressSignal && isAddressChangeUtterance(message)) {
    seededIntent = "order_change";
  }
  const nextResolvedIntent = seededIntent;
  const prevIntentName = String(prevBotContext.intent_name || prevIntent || "").trim();
  const allowFlowCarryover = Boolean(prevIntentName) && prevIntentName === nextResolvedIntent && hasExpectedInputs;
  const forceReusePhone =
    allowFlowCarryover &&
    !expectedSlotKeys.has("phone") &&
    typeof prevEntity.phone === "string" &&
    Boolean(prevEntity.phone.trim());
  const forceReuseAddress =
    allowFlowCarryover &&
    !expectedSlotKeys.has("address") &&
    !expectedSlotKeys.has("zipcode") &&
    typeof prevEntity.address === "string" &&
    Boolean(prevEntity.address.trim());
  const resolvedPhone = resolvePhoneWithReuse({
    derivedPhone,
    prevEntityPhone: typeof prevEntity.phone === "string" ? prevEntity.phone : null,
    prevPhoneFromTranscript,
    recentEntityPhone: recentEntity?.phone || null,
    resolvedIntent: nextResolvedIntent,
    forceReuse: forceReusePhone,
  });
  const blockedAddressFallback =
    !allowAddressReuse && !forceReuseAddress && !derivedAddress
      ? typeof prevEntity.address === "string"
        ? prevEntity.address
        : prevAddressFromTranscript || recentEntity?.address || null
      : null;
  if (blockedAddressFallback) {
    noteContamination({
      slot: "address",
      candidate: blockedAddressFallback,
      reason: "ADDRESS_CARRYOVER_BLOCKED_BY_EXPECTED_INPUTS",
      action: "CLEARED",
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "CONTEXT_CONTAMINATION_DETECTED",
      {
        slot: "address",
        candidate: blockedAddressFallback,
        reason: "ADDRESS_CARRYOVER_BLOCKED_BY_EXPECTED_INPUTS",
        action: "CLEARED",
        expected_inputs: expectedInputs,
      },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
  }
  const resolvedAddress = resolveAddressWithReuse({
    derivedAddress,
    prevEntityAddress:
      (allowAddressReuse || forceReuseAddress) && typeof prevEntity.address === "string" ? prevEntity.address : null,
    prevAddressFromTranscript: allowAddressReuse || forceReuseAddress ? prevAddressFromTranscript : null,
    recentEntityAddress: allowAddressReuse || forceReuseAddress ? recentEntity?.address || null : null,
    resolvedIntent: nextResolvedIntent,
    forceReuse: forceReuseAddress,
  });
  const confirmedEntity = normalizeConfirmedEntity(prevBotContext?.confirmed_entity);
  const baseEntity = pickConversationEntityBase(prevEntity);
  const { merged, updates, noticeUpdates } = mergeConversationEntity({
    base: baseEntity,
    nextValues: {
      channel: derivedChannel ?? null,
      order_id: resolvedOrderId,
      phone: resolvedPhone,
      address: resolvedAddress,
      zipcode: resolvedZipcode,
      resolved_road_address: carriedRoadAddress,
      resolved_jibun_address: carriedJibunAddress,
    },
    noticeKeys: ENTITY_UPDATE_NOTICE_KEYS,
  });
  const updateNotice = buildEntityUpdateNotice(noticeUpdates, nextResolvedIntent);
  const mergedEntity = { ...confirmedEntity, ...merged };
  const policyContext: PolicyEvalContext = {
    input: { text: message },
    intent: { name: nextResolvedIntent },
    entity: {
      ...mergedEntity,
    },
    user: { confirmed: explicitUserConfirmed },
    conversation: {
      repeat_count: 0,
      flags: {
        entity_updates: noticeUpdates,
        entity_update_notice: updateNotice || null,
      },
    },
  };
  if (updates.length > 0) {
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "ENTITY_FIELD_UPDATED",
      {
        intent: nextResolvedIntent,
        updates,
        update_notice: updateNotice || null,
      },
      { intent_name: nextResolvedIntent, entity: policyContext.entity as Record<string, any> }
    );
  }

  return {
    resolvedIntent: nextResolvedIntent,
    detectedIntent,
    hasAddressSignal,
    resolvedOrderId,
    policyContext,
    contaminationSummaries,
  };
}


