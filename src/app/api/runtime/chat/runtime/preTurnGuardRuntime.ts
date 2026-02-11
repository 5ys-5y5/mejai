import { YES_NO_QUICK_REPLIES, resolveSingleChoiceQuickReplyConfig } from "./quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "./promptTemplateRuntime";
import { readPendingPhoneReuse } from "./memoryReuseRuntime";

type PreTurnGuardParams = {
  context: unknown;
  prevBotContext: Record<string, any>;
  resolvedIntent: string;
  prevEntity: Record<string, any>;
  prevSelectedOrderId: string | null;
  message: string;
  sessionId: string;
  nextSeq: number;
  latestTurnId: string | null;
  derivedPhone: string | null;
  expectedInput: string | null;
  normalizePhoneDigits: (value?: string | null) => string | null;
  isYesText: (text: string) => boolean;
  isNoText: (text: string) => boolean;
  maskPhone: (value?: string | null) => string;
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, any>) => Promise<unknown>;
  insertEvent: (
    context: unknown,
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
    expectedInput,
    normalizePhoneDigits,
    isYesText,
    isNoText,
    maskPhone,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
  } = params;

  let nextDerivedPhone = derivedPhone;
  let nextExpectedInput = expectedInput;

  if (prevBotContext.conversation_closed === true) {
    const reply = makeReply("이미 종료된 대화입니다. 새 문의는 새 대화에서 시작해 주세요.");
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
      expectedInput: nextExpectedInput,
    };
  }

  const phoneReuseState = readPendingPhoneReuse(prevBotContext);
  if (phoneReuseState.pending) {
    const pendingPhone = normalizePhoneDigits(phoneReuseState.pendingPhone || "");
    if (isYesText(message) && pendingPhone) {
      nextDerivedPhone = pendingPhone;
      nextExpectedInput = "phone";
    } else if (isNoText(message)) {
      const reply = makeReply("새로 조회할 휴대폰 번호를 알려주세요.");
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
          phone_reuse_pending: false,
          pending_phone: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedPhone: nextDerivedPhone,
        expectedInput: nextExpectedInput,
      };
    } else {
      const masked = pendingPhone ? maskPhone(pendingPhone) : "-";
      const reply = makeReply(
        buildYesNoConfirmationPrompt(`이전에 제공한 번호(${masked})를 그대로 사용해 조회할까요?`, {
          botContext: prevBotContext,
          entity: prevEntity,
        })
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:phone_reuse_pending_confirm",
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
          phone_reuse_pending: true,
          pending_phone: pendingPhone || null,
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
        expectedInput: nextExpectedInput,
      };
    }
  }

  return {
    response: null,
    derivedPhone: nextDerivedPhone,
    expectedInput: nextExpectedInput,
  };
}

