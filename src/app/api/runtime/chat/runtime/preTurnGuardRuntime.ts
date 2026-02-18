import { YES_NO_QUICK_REPLIES, resolveSingleChoiceQuickReplyConfig } from "./quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "./promptTemplateRuntime";
import { getPreferredPromptSlot, getReuseSlotLabel, readPendingReuse } from "./memoryReuseRuntime";

type PreTurnGuardParams = {
  context: any;
  prevBotContext: Record<string, any>;
  resolvedIntent: string;
  prevEntity: Record<string, any>;
  prevSelectedOrderId: string | null;
  message: string;
  sessionId: string;
  nextSeq: number;
  latestTurnId: string | null;
  derivedPhone: string | null;
  derivedOrderId: string | null;
  derivedAddress: string | null;
  derivedZipcode: string | null;
  expectedInput: string | null;
  normalizePhoneDigits: (value?: string | null) => string | null;
  isYesText: (text: string) => boolean;
  isNoText: (text: string) => boolean;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, any>) => Promise<unknown>;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, any>,
    botContext: Record<string, any>
  ) => Promise<unknown>;
  respond: (payload: Record<string, any>, init?: ResponseInit) => unknown;
};

type PreTurnGuardResult = {
  response: unknown | null;
  derivedPhone: string | null;
  derivedOrderId: string | null;
  derivedAddress: string | null;
  derivedZipcode: string | null;
  expectedInput: string | null;
};

export async function handlePreTurnGuards(params: PreTurnGuardParams): Promise<PreTurnGuardResult> {
  const {
    context,
    prevBotContext,
    resolvedIntent,
    prevEntity,
    prevSelectedOrderId,
    message,
    sessionId,
    nextSeq,
    latestTurnId,
    derivedPhone,
    derivedOrderId,
    derivedAddress,
    derivedZipcode,
    expectedInput,
    normalizePhoneDigits,
    isYesText,
    isNoText,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
  } = params;

  let nextDerivedPhone = derivedPhone;
  let nextDerivedOrderId = derivedOrderId;
  let nextDerivedAddress = derivedAddress;
  let nextDerivedZipcode = derivedZipcode;
  let nextExpectedInput = expectedInput;

  if (prevBotContext.conversation_closed === true) {
    const reply = makeReply("이전 문의가 종료되었습니다. 새 문의가 있다면 알려주세요.");
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: prevEntity,
        conversation_closed: true,
      },
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_DECISION",
      { stage: "input", action: "CONVERSATION_ALREADY_CLOSED" },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "FINAL_ANSWER_READY",
      { answer: reply, model: "deterministic_conversation_closed_guard" },
      { intent_name: resolvedIntent, entity: prevEntity as Record<string, any> }
    );
    return {
      response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
      derivedPhone: nextDerivedPhone,
      derivedOrderId: nextDerivedOrderId,
      derivedAddress: nextDerivedAddress,
      derivedZipcode: nextDerivedZipcode,
      expectedInput: nextExpectedInput,
    };
  }

  const reuseState = readPendingReuse(prevBotContext);
  if (reuseState.pending && reuseState.slotKey) {
    const slotKey = String(reuseState.slotKey || "").trim();
    const pendingValue = String(reuseState.value || "").trim();
    const clearedReuseFlags = {
      reuse_pending: false,
      pending_reuse_slot: null,
      pending_reuse_value: null,
      phone_reuse_pending: false,
      pending_phone: null,
      order_id_reuse_pending: false,
      pending_order_id: null,
      address_reuse_pending: false,
      pending_address: null,
      zipcode_reuse_pending: false,
      pending_zipcode: null,
    };
    if (isYesText(message) && pendingValue) {
      if (slotKey === "phone") nextDerivedPhone = normalizePhoneDigits(pendingValue);
      if (slotKey === "order_id") nextDerivedOrderId = pendingValue;
      if (slotKey === "address") nextDerivedAddress = pendingValue;
      if (slotKey === "zipcode") nextDerivedZipcode = pendingValue;
      if (!["phone", "order_id", "address", "zipcode"].includes(slotKey)) {
        (prevEntity as Record<string, any>)[slotKey] = pendingValue;
      }
      nextExpectedInput = null;
    } else if (isNoText(message)) {
      const nextSlot = getPreferredPromptSlot(slotKey);
      const label = getReuseSlotLabel(nextSlot, resolvedIntent);
      const reply = makeReply(`아래 정보를 알려주세요. (${label})`);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          expected_input: nextSlot,
          ...clearedReuseFlags,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedPhone: nextDerivedPhone,
        derivedOrderId: nextDerivedOrderId,
        derivedAddress: nextDerivedAddress,
        derivedZipcode: nextDerivedZipcode,
        expectedInput: nextExpectedInput || nextSlot,
      };
    } else {
      const label = getReuseSlotLabel(slotKey, resolvedIntent);
      const reply = makeReply(
        buildYesNoConfirmationPrompt(`이전에 알려주신 ${label}(${pendingValue || "-"})로 진행할까요?`, {
          botContext: prevBotContext,
          entity: prevEntity,
        })
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:reuse_pending_confirm",
        sourceFunction: "handlePreTurnGuards",
        sourceModule: "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
        contextText: reply,
      });
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: prevSelectedOrderId,
          reuse_pending: true,
          pending_reuse_slot: slotKey || null,
          pending_reuse_value: pendingValue || null,
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: YES_NO_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
        derivedPhone: nextDerivedPhone,
        derivedOrderId: nextDerivedOrderId,
        derivedAddress: nextDerivedAddress,
        derivedZipcode: nextDerivedZipcode,
        expectedInput: nextExpectedInput,
      };
    }
  }
  return {
    response: null,
    derivedPhone: nextDerivedPhone,
    derivedOrderId: nextDerivedOrderId,
    derivedAddress: nextDerivedAddress,
    derivedZipcode: nextDerivedZipcode,
    expectedInput: nextExpectedInput,
  };
}
