import {
  YES_NO_QUICK_REPLIES,
  resolveQuickReplyConfig,
  resolveSingleChoiceQuickReplyConfig,
} from "./quickReplyConfigRuntime";
import { toLeadDayQuickReplies } from "../policies/intentSlotPolicy";
import { generateAlternativeRestockConsentQuestion } from "../policies/restockResponsePolicy";
import { buildNumberedChoicePrompt, buildRestockLeadDaysPrompt, buildYesNoConfirmationPrompt } from "./promptTemplateRuntime";

type RestockPendingParams = {
  context: any;
  prevBotContext: Record<string, any>;
  resolvedIntent: string;
  prevEntity: Record<string, any>;
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

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_non_target_alternative_confirm") {
    const pendingCandidates = Array.isArray((prevBotContext as Record<string, any>).restock_candidates)
      ? ((prevBotContext as Record<string, any>).restock_candidates as Array<Record<string, any>>)
      : [];
    const disableProductCards = Boolean(
      (prevBotContext as Record<string, any>).restock_kb_only ||
        (prevBotContext as Record<string, any>).restock_new_product
    );
    const lines = pendingCandidates.map(
      (candidate, idx) => `- ${idx + 1}번 | ${String(candidate.product_name || "-")} | ${String(candidate.raw_date || "-")}`
    );
    if (isYesText(message) || isExecutionAffirmativeText(message)) {
      const reply = makeReply(
        buildNumberedChoicePrompt({
          titleKey: "restock_product_choice_title",
          lines,
          botContext: prevBotContext,
          entity: prevEntity,
        })
      );
      const quickReplyConfig = resolveQuickReplyConfig({
        optionsCount: pendingCandidates.length,
        minSelectHint: 1,
        maxSelectHint: 1,
        explicitMode: "single",
        criteria: "state:awaiting_non_target_alternative_choice",
        sourceFunction: "handleRestockPendingStage",
        sourceModule: "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        contextText: reply,
      });
      const productCards = disableProductCards
        ? []
        : pendingCandidates
            .filter((candidate) => Boolean((candidate as Record<string, any>).thumbnail_url))
            .map((candidate, idx) => ({
              id: `restock-${idx + 1}`,
              title: String((candidate as Record<string, any>).product_name || "-"),
              subtitle: `${String((candidate as Record<string, any>).raw_date || "-")} 입고 예정`,
              description: "",
              image_url: String((candidate as Record<string, any>).thumbnail_url || ""),
              value: String(idx + 1),
            }));
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
          restock_stage: "awaiting_product_choice",
          restock_candidates: pendingCandidates,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "ASK_RESTOCK_PRODUCT_CHOICE", candidate_count: pendingCandidates.length },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_restock_kb", quick_reply_config: quickReplyConfig },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: pendingCandidates.map((_, idx) => ({ label: String(idx + 1), value: String(idx + 1) })),
          quick_reply_config: quickReplyConfig,
          product_cards: productCards,
        }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
    if (isNoText(message)) {
      const reply = makeReply("알겠습니다. 재입고를 확인할 상품명을 알려주세요.");
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
          restock_stage: "awaiting_product",
          expected_input: "product_query",
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        { stage: "tool", action: "ASK_PRODUCT_NAME_FOR_RESTOCK" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_restock_kb" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
    const consentQuestion = await generateAlternativeRestockConsentQuestion({
      intent: String(nextResolvedIntent || "restock_inquiry"),
      alternativesCount: pendingCandidates.length,
      userQuery: String(message || ""),
      model: "chatgpt",
    });
    const reply = makeReply(
      buildYesNoConfirmationPrompt(consentQuestion, {
        botContext: prevBotContext,
        entity: prevEntity,
      })
    );
    const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
      optionsCount: YES_NO_QUICK_REPLIES.length,
      criteria: "state:awaiting_non_target_alternative_confirm_repeat",
      sourceFunction: "handleRestockPendingStage",
      sourceModule: "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
      contextText: reply,
    });
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
        restock_stage: "awaiting_non_target_alternative_confirm",
        restock_candidates: pendingCandidates,
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
      resolvedIntent: nextResolvedIntent,
      restockSubscribeAcceptedThisTurn: nextAccepted,
      lockIntentToRestockSubscribe: nextLocked,
    };
  }

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_suggestion") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim();
    if (isEndConversationText(message)) {
      const reply = makeReply("대화를 종료할게요. 다른 문의가 있으면 알려주세요.");
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
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_conversation_end" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
    if (isNoText(message)) {
      const reply = makeReply("재입고 알림 신청은 진행하지 않을게요. 다른 상품의 재입고도 필요하면 알려주세요.");
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
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
    if (isYesText(message) || isExecutionAffirmativeText(message) || isRestockSubscribe(message)) {
      nextAccepted = true;
      nextResolvedIntent = "restock_subscribe";
      nextLocked = true;
    } else {
      const reply = makeReply(
        buildYesNoConfirmationPrompt(
          `상품(${pendingProductName || pendingProductId || "-"})을(를) ${pendingChannel || "sms"}로 재입고 알림 신청할까요?`,
          { botContext: prevBotContext, entity: prevEntity }
        )
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_subscribe_confirm_missing_product",
        sourceFunction: "handleRestockPendingStage",
        sourceModule: "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        contextText: reply,
      });
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
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: YES_NO_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
  }

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_phone") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim() || "sms";
    const pendingLeadDays = Array.isArray((prevBotContext as Record<string, any>).pending_lead_days)
      ? ((prevBotContext as Record<string, any>).pending_lead_days as number[])
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
      : [];
    const extractedPhone = normalizePhoneDigits(extractPhone(message));
    if (!extractedPhone) {
      const reply = makeReply("재입고 알림을 받을 휴대폰 번호를 알려주세요. (예: 01012345678)");
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
          expected_input: "phone",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
    const reply = makeReply(
      buildYesNoConfirmationPrompt(`휴대폰 번호(${maskPhone(extractedPhone)})로 ${pendingChannel} 재입고 알림을 받을까요?`, {
        botContext: prevBotContext,
        entity: prevEntity,
      })
    );
    const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
      optionsCount: YES_NO_QUICK_REPLIES.length,
      criteria: "state:awaiting_subscribe_phone_confirm",
      sourceFunction: "handleRestockPendingStage",
      sourceModule: "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
      contextText: reply,
    });
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
    return {
      response: respond({
        session_id: sessionId,
        step: "confirm",
        message: reply,
        mcp_actions: [],
        quick_replies: YES_NO_QUICK_REPLIES,
        quick_reply_config: quickReplyConfig,
      }),
      resolvedIntent: nextResolvedIntent,
      restockSubscribeAcceptedThisTurn: nextAccepted,
      lockIntentToRestockSubscribe: nextLocked,
    };
  }

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_lead_days") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim() || "sms";
    const availableLeadDays = Array.isArray((prevBotContext as Record<string, any>).available_lead_days)
      ? ((prevBotContext as Record<string, any>).available_lead_days as number[])
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
      : [];
    const minLeadDays =
      Number.isFinite(Number((prevBotContext as Record<string, any>).min_lead_days || 0))
        ? Math.max(1, Number((prevBotContext as Record<string, any>).min_lead_days || 1))
        : 1;
    const selectedLeadDays = parseLeadDaysSelection(message, availableLeadDays);
    if (selectedLeadDays.length < minLeadDays) {
      const quickReplies = toLeadDayQuickReplies(availableLeadDays, 7);
      const exampleValues = availableLeadDays.slice(0, Math.max(minLeadDays, 3));
      const reply = makeReply(
        buildRestockLeadDaysPrompt({
          minRequired: minLeadDays,
          options: availableLeadDays,
          exampleValues,
          botContext: prevBotContext,
          entity: prevEntity,
          retryMode: true,
        })
      );
      const quickReplyConfig = resolveQuickReplyConfig({
        optionsCount: availableLeadDays.length,
        minSelectHint: minLeadDays,
        maxSelectHint: availableLeadDays.length,
        explicitMode: "multi",
        criteria: "state:awaiting_subscribe_lead_days",
        sourceFunction: "handleRestockPendingStage",
        sourceModule: "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        contextText: reply,
      });
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
          expected_input: "restock_lead_days",
        },
      });
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: quickReplies,
          quick_reply_config: quickReplyConfig,
        }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
    const reply = makeReply(
      buildYesNoConfirmationPrompt(
        `선택하신 D-${selectedLeadDays.join(", D-")}부터 ${pendingChannel}로 알림을 받을까요?`,
        { botContext: prevBotContext, entity: prevEntity }
      )
    );
    const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
      optionsCount: YES_NO_QUICK_REPLIES.length,
      criteria: "state:awaiting_subscribe_confirm",
      sourceFunction: "handleRestockPendingStage",
      sourceModule: "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
      contextText: reply,
    });
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
    return {
      response: respond({
        session_id: sessionId,
        step: "confirm",
        message: reply,
        mcp_actions: [],
        quick_replies: YES_NO_QUICK_REPLIES,
        quick_reply_config: quickReplyConfig,
      }),
      resolvedIntent: nextResolvedIntent,
      restockSubscribeAcceptedThisTurn: nextAccepted,
      lockIntentToRestockSubscribe: nextLocked,
    };
  }

  if (prevBotContext.restock_pending && prevBotContext.restock_stage === "awaiting_subscribe_confirm") {
    const pendingProductId = String(prevBotContext.pending_product_id || "").trim();
    const pendingProductName = String(prevBotContext.pending_product_name || "").trim();
    const pendingChannel = String(prevBotContext.pending_channel || "").trim();
    const pendingLeadDays = Array.isArray((prevBotContext as Record<string, any>).pending_lead_days)
      ? ((prevBotContext as Record<string, any>).pending_lead_days as number[])
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
      : [];
    if (isEndConversationText(message)) {
      const reply = makeReply("대화를 종료할게요. 다른 문의가 있으면 알려주세요.");
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
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_conversation_end" },
        { intent_name: nextResolvedIntent, entity: prevEntity as Record<string, any> }
      );
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
    if (isYesText(message) || isExecutionAffirmativeText(message)) {
      nextAccepted = true;
      nextLocked = true;
    } else if (isNoText(message)) {
      const reply = makeReply("재입고 알림 신청은 진행하지 않을게요. 다른 상품의 재입고도 필요하면 알려주세요.");
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
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    } else {
      const reply = makeReply(
        buildYesNoConfirmationPrompt(
          `상품(${pendingProductName || pendingProductId || "-"})을(를) ${pendingChannel || "sms"}로 재입고 알림 신청할까요?`,
          { botContext: prevBotContext, entity: prevEntity }
        )
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_subscribe_confirm_repeat",
        sourceFunction: "handleRestockPendingStage",
        sourceModule: "src/app/api/runtime/chat/runtime/restockPendingRuntime.ts",
        contextText: reply,
      });
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
      return {
        response: respond({
          session_id: sessionId,
          step: "confirm",
          message: reply,
          mcp_actions: [],
          quick_replies: YES_NO_QUICK_REPLIES,
          quick_reply_config: quickReplyConfig,
        }),
        resolvedIntent: nextResolvedIntent,
        restockSubscribeAcceptedThisTurn: nextAccepted,
        lockIntentToRestockSubscribe: nextLocked,
      };
    }
  }

  return {
    response: null,
    resolvedIntent: nextResolvedIntent,
    restockSubscribeAcceptedThisTurn: nextAccepted,
    lockIntentToRestockSubscribe: nextLocked,
  };
}
