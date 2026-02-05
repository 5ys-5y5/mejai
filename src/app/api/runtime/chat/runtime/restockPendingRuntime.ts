type RestockPendingParams = {
  context: any;
  prevBotContext: Record<string, unknown>;
  resolvedIntent: string;
  prevEntity: Record<string, unknown>;
  prevSelectedOrderId: string | null;
  message: string;
  sessionId: string;
  nextSeq: number;
  latestTurnId: string | null;
  restockSubscribeAcceptedThisTurn: boolean;
  lockIntentToRestockSubscribe: boolean;
  parseLeadDaysSelection: (text: string, available: number[]) => number[];
  normalizePhoneDigits: (value?: string | null) => string | null;
  extractPhone: (text: string) => string | null;
  maskPhone: (value?: string | null) => string;
  isEndConversationText: (text: string) => boolean;
  isNoText: (text: string) => boolean;
  isYesText: (text: string) => boolean;
  isExecutionAffirmativeText: (text: string) => boolean;
  isRestockSubscribe: (text: string) => boolean;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => unknown;
};

type RestockPendingResult = {
  response: unknown | null;
  resolvedIntent: string;
  restockSubscribeAcceptedThisTurn: boolean;
  lockIntentToRestockSubscribe: boolean;
};

export async function handleRestockPendingStage(params: RestockPendingParams): Promise<RestockPendingResult> {
  const {
    context,
    prevBotContext,
    prevEntity,
    prevSelectedOrderId,
    message,
    sessionId,
    nextSeq,
    latestTurnId,
    parseLeadDaysSelection,
    normalizePhoneDigits,
    extractPhone,
    maskPhone,
    isEndConversationText,
    isNoText,
    isYesText,
    isExecutionAffirmativeText,
    isRestockSubscribe,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
  } = params;
  let nextResolvedIntent = params.resolvedIntent;
  let nextAccepted = params.restockSubscribeAcceptedThisTurn;
  let nextLocked = params.lockIntentToRestockSubscribe;

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_suggestion") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim();
    if (isEndConversationText(message)) {
      const reply = makeReply("대화를 종료합니다. 이용해 주셔서 감사합니다.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: nextResolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          conversation_closed: true,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "END_CONVERSATION_FROM_RESTOCK_SUGGESTION" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_conversation_end" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
      return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    }
    if (isNoText(message)) {
      const reply = makeReply("재입고 알림 신청을 진행하지 않았습니다. 필요하면 상품명을 다시 알려주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: nextResolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          pending_channel: pendingChannel || null,
        },
      });
      return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    }
    if (isYesText(message) || isExecutionAffirmativeText(message) || isRestockSubscribe(message)) {
      nextAccepted = true;
      nextResolvedIntent = "restock_subscribe";
      nextLocked = true;
    } else {
      const reply = makeReply(
        `상품(${pendingProductName || pendingProductId || "-"})에 ${pendingChannel || "sms"} 채널로 재입고 알림을 신청할까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
      );
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: "restock_subscribe",
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          restock_pending: true,
          restock_stage: "awaiting_subscribe_confirm",
          pending_product_id: pendingProductId || null,
          pending_product_name: pendingProductName || null,
          pending_channel: pendingChannel || null,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    }
  }

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_phone") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim() || "sms";
    const pendingLeadDays = Array.isArray((prevBotContext as any).pending_lead_days)
      ? ((prevBotContext as any).pending_lead_days as number[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : [];
    const extractedPhone = normalizePhoneDigits(extractPhone(message));
    if (!extractedPhone) {
      const reply = makeReply("재입고 알림 신청을 위해 휴대폰 번호를 알려주세요. (예: 01012345678)");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: "restock_subscribe",
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          restock_pending: true,
          restock_stage: "awaiting_subscribe_phone",
          pending_product_id: pendingProductId || null,
          pending_product_name: pendingProductName || null,
          pending_channel: pendingChannel,
          pending_lead_days: pendingLeadDays,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    }
    const reply = makeReply(
      `휴대폰 번호(${maskPhone(extractedPhone)})로 ${pendingChannel} 재입고 알림을 신청할까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
    );
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: "restock_subscribe",
        entity: { ...prevEntity, phone: extractedPhone },
        selected_order_id: prevSelectedOrderId,
        restock_pending: true,
        restock_stage: "awaiting_subscribe_confirm",
        pending_product_id: pendingProductId || null,
        pending_product_name: pendingProductName || null,
        pending_channel: pendingChannel,
        pending_lead_days: pendingLeadDays,
      },
    });
    return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
  }

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_lead_days") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim() || "sms";
    const availableLeadDays = Array.isArray((prevBotContext as any).available_lead_days)
      ? ((prevBotContext as any).available_lead_days as number[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : [];
    const minLeadDays =
      Number.isFinite(Number((prevBotContext as any).min_lead_days || 0))
        ? Math.max(1, Number((prevBotContext as any).min_lead_days || 1))
        : 1;
    const selectedLeadDays = parseLeadDaysSelection(message, availableLeadDays);
    if (selectedLeadDays.length < minLeadDays) {
      const optionLine = availableLeadDays.length > 0 ? availableLeadDays.map((v) => `D-${v}`).join(", ") : "-";
      const reply = makeReply(
        `알림일을 선택해 주세요. 현재 선택 가능한 값은 ${optionLine} 입니다.\n쉼표(,)로 ${minLeadDays}개 이상 입력해 주세요. 예: ${availableLeadDays.slice(0, Math.max(minLeadDays, 3)).join(",")}`
      );
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: "restock_subscribe",
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          restock_pending: true,
          restock_stage: "awaiting_subscribe_lead_days",
          pending_product_id: pendingProductId || null,
          pending_product_name: pendingProductName || null,
          pending_channel: pendingChannel,
          available_lead_days: availableLeadDays,
          min_lead_days: minLeadDays,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    }
    const reply = makeReply(
      `선택하신 알림일(D-${selectedLeadDays.join(", D-")}) 기준으로 ${pendingChannel} 예약 알림을 신청할까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
    );
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: "restock_subscribe",
        entity: prevEntity,
        selected_order_id: prevSelectedOrderId,
        restock_pending: true,
        restock_stage: "awaiting_subscribe_confirm",
        pending_product_id: pendingProductId || null,
        pending_product_name: pendingProductName || null,
        pending_channel: pendingChannel,
        pending_lead_days: selectedLeadDays,
      },
    });
    return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
  }

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_confirm") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim();
    const pendingLeadDays = Array.isArray((prevBotContext as any).pending_lead_days)
      ? ((prevBotContext as any).pending_lead_days as number[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : [];
    if (isEndConversationText(message)) {
      const reply = makeReply("대화를 종료합니다. 이용해 주셔서 감사합니다.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: nextResolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          conversation_closed: true,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "END_CONVERSATION_FROM_RESTOCK_CONFIRM" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_conversation_end" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, unknown> }
      );
      return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    }
    if (isYesText(message) || isExecutionAffirmativeText(message)) {
      nextAccepted = true;
      nextLocked = true;
    } else if (isNoText(message)) {
      const reply = makeReply("재입고 알림 신청을 진행하지 않았습니다. 필요하면 상품명을 다시 알려주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: nextResolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          pending_channel: pendingChannel || null,
        },
      });
      return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    } else {
      const reply = makeReply(
        `상품(${pendingProductName || pendingProductId || "-"})에 ${pendingChannel || "sms"} 채널로 재입고 알림을 신청할까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
      );
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: nextResolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          restock_pending: true,
          restock_stage: "awaiting_subscribe_confirm",
          pending_product_id: pendingProductId || null,
          pending_product_name: pendingProductName || null,
          pending_channel: pendingChannel || null,
          pending_lead_days: pendingLeadDays,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), resolvedIntent: nextResolvedIntent, restockSubscribeAcceptedThisTurn: nextAccepted, lockIntentToRestockSubscribe: nextLocked };
    }
  }

  return {
    response: null,
    resolvedIntent: nextResolvedIntent,
    restockSubscribeAcceptedThisTurn: nextAccepted,
    lockIntentToRestockSubscribe: nextLocked,
  };
}
