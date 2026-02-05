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
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  resolvedIntent: string;
  policyContext: any;
  activePolicyConflicts: any[];
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
    { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
  );
}

export async function emitSlotExtracted(input: {
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
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
  policyContext: any;
  maskPhone: (value?: string | null) => string;
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
  } = input;
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
        phone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
        phone_masked:
          typeof policyContext.entity?.phone === "string" ? maskPhone(policyContext.entity.phone) : "-",
        zipcode: typeof policyContext.entity?.zipcode === "string" ? policyContext.entity.zipcode : null,
        address: typeof policyContext.entity?.address === "string" ? policyContext.entity.address : null,
      },
    },
    { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
  );
}

export async function handleInputForcedResponse(input: {
  forcedResponse: string | null | undefined;
  normalizeOrderChangeAddressPrompt: (intent: string, text: string) => string;
  resolvedIntent: string;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  sessionId: string;
  nextSeq: number;
  message: string;
  policyContext: any;
  resolvedOrderId: string | null;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  context: any;
  latestTurnId: string | null;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => Response;
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
    },
  });
  await insertEvent(context, sessionId, latestTurnId, "POLICY_DECISION", { stage: "input" }, { intent_name: resolvedIntent });
  return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
}
