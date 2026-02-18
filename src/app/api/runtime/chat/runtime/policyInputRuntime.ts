import { deriveExpectedInputFromAnswer } from "./intentRuntime";

export function reconcileIntentFromInputGate(input: {
  intentFromPolicy: string;
  resolvedIntent: string;
  detectedIntent: string;
  hasAddressSignal: boolean;
  lockIntentToRestockSubscribe: boolean;
}) {
  const { intentFromPolicy, resolvedIntent, detectedIntent, hasAddressSignal, lockIntentToRestockSubscribe } = input;
  if (intentFromPolicy === "general") return resolvedIntent;
  if (lockIntentToRestockSubscribe) return "restock_subscribe";
  if (intentFromPolicy === "faq" && (detectedIntent === "restock_inquiry" || detectedIntent === "restock_subscribe")) {
    return detectedIntent;
  }
  if (intentFromPolicy === "shipping_inquiry" && resolvedIntent === "order_change" && hasAddressSignal) {
    return "order_change";
  }
  return intentFromPolicy;
}

export async function emitPolicyStaticConflict(input: {
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  resolvedIntent: string;
  policyContext: Record<string, any>;
  activePolicyConflicts: unknown[];
}) {
  const { insertEvent, context, sessionId, latestTurnId, resolvedIntent, policyContext, activePolicyConflicts } = input;
  if (activePolicyConflicts.length <= 0) return;
  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "POLICY_STATIC_CONFLICT",
    {
      intent: resolvedIntent,
      conflicts: activePolicyConflicts,
      resolution: "tool_stage_force_response_precedence",
    },
    { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> }
  );
}

export async function emitSlotExtracted(input: {
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  resolvedIntent: string;
  expectedInput: string | null;
  effectiveMessageForIntent: string;
  message: string;
  derivedOrderId: string | null;
  derivedPhone: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  resolvedOrderId: string | null;
  policyContext: Record<string, any>;
  maskPhone: (value?: string | null) => string;
  resolvedSlots?: Record<string, any>;
  missingSlots?: string[];
}) {
  const {
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    expectedInput,
    effectiveMessageForIntent,
    message,
    derivedOrderId,
    derivedPhone,
    derivedZipcode,
    derivedAddress,
    resolvedOrderId,
    policyContext,
    maskPhone,
    resolvedSlots,
    missingSlots,
  } = input;
  const policyEntity = (policyContext.entity ?? {}) as Record<string, any>;
  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "SLOT_EXTRACTED",
    {
      expected_input: expectedInput || null,
      query_source:
        effectiveMessageForIntent !== message
          ? "intent_disambiguation_source_text"
          : "current_message",
      derived: {
        order_id: derivedOrderId || null,
        phone: derivedPhone || null,
        phone_masked: maskPhone(derivedPhone),
        zipcode: derivedZipcode || null,
        address: derivedAddress || null,
      },
      resolved: {
        intent: resolvedIntent,
        order_id: resolvedOrderId || null,
        phone: typeof policyEntity.phone === "string" ? policyEntity.phone : null,
        phone_masked:
          typeof policyEntity.phone === "string" ? maskPhone(policyEntity.phone) : "-",
        zipcode: typeof policyEntity.zipcode === "string" ? policyEntity.zipcode : null,
        address: typeof policyEntity.address === "string" ? policyEntity.address : null,
      },
      resolved_slots: resolvedSlots || {},
      missing_slots: Array.isArray(missingSlots) ? missingSlots : [],
    },
    { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> }
  );
}

export async function handleInputForcedResponse(input: {
  forcedResponse: string | null | undefined;
  normalizeOrderChangeAddressPrompt: (intent: string, text: string) => string;
  resolvedIntent: string;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, any>) => Promise<unknown>;
  sessionId: string;
  nextSeq: number;
  message: string;
  policyContext: Record<string, any>;
  resolvedOrderId: string | null;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  context: any;
  latestTurnId: string | null;
  respond: (payload: Record<string, any>, init?: ResponseInit) => Response;
}): Promise<Response | null> {
  const {
    forcedResponse,
    normalizeOrderChangeAddressPrompt,
    resolvedIntent,
    makeReply,
    insertTurn,
    sessionId,
    nextSeq,
    message,
    policyContext,
    resolvedOrderId,
    insertEvent,
    context,
    latestTurnId,
    respond,
  } = input;
  if (!forcedResponse) return null;
  const forcedText = normalizeOrderChangeAddressPrompt(resolvedIntent, forcedResponse);
  const inferredExpectedInput = deriveExpectedInputFromAnswer(forcedText);
  const reply = makeReply(forcedText);
  await insertTurn({
    session_id: sessionId,
    seq: nextSeq,
    transcript_text: message,
    answer_text: reply,
    final_answer: reply,
    bot_context: {
      intent_name: resolvedIntent,
      entity: policyContext.entity,
      selected_order_id: resolvedOrderId,
      expected_input: inferredExpectedInput || null,
    },
  });
  await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "input" }, { intent_name: resolvedIntent });
  return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
}


