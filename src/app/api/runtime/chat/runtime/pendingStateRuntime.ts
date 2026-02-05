import { YES_NO_QUICK_REPLIES, resolveSingleChoiceQuickReplyConfig } from "./quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "./promptTemplateRuntime";

type PendingStateParams = {
  context: any;
  prevBotContext: Record<string, unknown>;
  resolvedIntent: string;
  prevEntity: Record<string, unknown>;
  prevSelectedOrderId: string | null;
  message: string;
  sessionId: string;
  nextSeq: number;
  latestTurnId: string | null;
  derivedOrderId: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  updateConfirmAcceptedThisTurn: boolean;
  refundConfirmAcceptedThisTurn: boolean;
  callAddressSearchWithAudit: (
    context: any,
    rawKeyword: string,
    sessionId: string,
    turnId: string | null,
    botContext: Record<string, unknown>
  ) => Promise<{ status: string; data?: unknown; error?: string }>;
  extractZipcode: (text: string) => string | null;
  extractAddress: (
    text: string,
    orderId: string | null,
    phone: string | null,
    zipcode: string | null
  ) => string | null;
  extractAddressDetail: (text: string) => string | null;
  isLikelyAddressDetailOnly: (text: string) => boolean;
  isLikelyOrderId: (value?: string | null) => boolean;
  isLikelyZipcode: (value?: string | null) => boolean;
  isYesText: (text: string) => boolean;
  isNoText: (text: string) => boolean;
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

type PendingStateResult = {
  response: unknown | null;
  derivedOrderId: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  updateConfirmAcceptedThisTurn: boolean;
  refundConfirmAcceptedThisTurn: boolean;
};

export async function handleAddressChangeRefundPending(params: PendingStateParams): Promise<PendingStateResult> {
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
    callAddressSearchWithAudit,
    extractZipcode,
    extractAddress,
    extractAddressDetail,
    isLikelyAddressDetailOnly,
    isLikelyOrderId,
    isLikelyZipcode,
    isYesText,
    isNoText,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
  } = params;

  let nextDerivedOrderId = params.derivedOrderId;
  let nextDerivedZipcode = params.derivedZipcode;
  let nextDerivedAddress = params.derivedAddress;
  let nextUpdateConfirmAccepted = params.updateConfirmAcceptedThisTurn;
  let nextRefundConfirmAccepted = params.refundConfirmAcceptedThisTurn;

  if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode_confirm") {
    const pendingAddress = String(prevBotContext.pending_address || "").trim();
    const pendingZipcode = String(prevBotContext.pending_zipcode || "").trim();
    const candidateRoad = String(prevBotContext.pending_road_addr || "").trim();
    const candidateJibun = String(prevBotContext.pending_jibun_addr || "").trim();
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    if (isYesText(message) && pendingZipcode) {
      nextDerivedZipcode = pendingZipcode;
      nextDerivedAddress = pendingAddress || nextDerivedAddress;
      if (isLikelyOrderId(pendingOrderId)) {
        nextDerivedOrderId = pendingOrderId;
      }
    } else if (isNoText(message)) {
      const prompt = "주소를 다시 입력해 주세요. 입력하신 주소로 우편번호를 다시 찾아볼게요.";
      const reply = makeReply(prompt);
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
          address_pending: true,
          address_stage: "awaiting_address",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    } else {
      const prompt = buildYesNoConfirmationPrompt(
        `검색된 주소가 맞는지 확인해 주세요.\n- 지번주소: ${candidateJibun || pendingAddress || "-"}\n- 도로명주소: ${candidateRoad || "-"}\n- 우편번호: ${pendingZipcode || "-"}`,
        { botContext: prevBotContext, entity: prevEntity }
      );
      const reply = makeReply(prompt);
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_zipcode_confirm",
        sourceFunction: "handlePendingStateStage",
        sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
          address_pending: true,
          address_stage: "awaiting_zipcode_confirm",
          pending_address: pendingAddress || null,
          pending_zipcode: pendingZipcode || null,
          pending_road_addr: candidateRoad || null,
          pending_jibun_addr: candidateJibun || null,
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
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
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
  }

  if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_zipcode") {
    const pendingAddress = String(prevBotContext.pending_address || "").trim();
    const pendingDigits = message.replace(/[^\d]/g, "");
    const pendingStrictFive = /^\d{5}$/.test(pendingDigits) ? pendingDigits : "";
    const pendingZip = extractZipcode(message) || pendingStrictFive;
    if (!pendingZip) {
      if (pendingAddress) {
        const search = await callAddressSearchWithAudit(
          context,
          pendingAddress,
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: prevEntity as Record<string, unknown> }
        );
        if (search.status === "success") {
          const rows = Array.isArray((search.data as any)?.results) ? (search.data as any).results : [];
          const first = rows[0];
          const candidateZip = String(first?.zipNo || "").trim();
          const roadAddr = String(first?.roadAddr || first?.roadAddrPart1 || "").trim();
          const jibunAddr = String(first?.jibunAddr || "").trim();
          if (candidateZip) {
            const prompt = buildYesNoConfirmationPrompt(
              `입력하신 주소로 우편번호를 찾았습니다.\n- 지번주소: ${jibunAddr || pendingAddress}\n- 도로명주소: ${roadAddr || "-"}\n- 우편번호: ${candidateZip}\n위 정보가 맞는지 확인해 주세요.`,
              { botContext: prevBotContext, entity: prevEntity }
            );
            const reply = makeReply(prompt);
            const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
              optionsCount: YES_NO_QUICK_REPLIES.length,
              criteria: "state:awaiting_zipcode_confirm_from_search",
              sourceFunction: "handlePendingStateStage",
              sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
                address_pending: true,
                address_stage: "awaiting_zipcode_confirm",
                pending_address: pendingAddress || null,
                pending_zipcode: candidateZip,
                pending_road_addr: roadAddr || null,
                pending_jibun_addr: jibunAddr || null,
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
              derivedOrderId: nextDerivedOrderId,
              derivedZipcode: nextDerivedZipcode,
              derivedAddress: nextDerivedAddress,
              updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
              refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
            };
          }
        } else {
          await insertEvent(
            context,
            sessionId,
            latestTurnId,
            "MCP_TOOL_FAILED",
            { tool: "search_address", error: (search as any).error || "ADDRESS_SEARCH_FAILED" },
            { intent_name: resolvedIntent }
          );
        }
      }
      const prompt = "입력하신 주소를 확인할 수 없습니다. 도로명/지번 포함 주소를 다시 입력해 주세요.";
      const reply = makeReply(prompt);
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
          address_pending: true,
          address_stage: "awaiting_address",
          pending_order_id: isLikelyOrderId(prevSelectedOrderId) ? prevSelectedOrderId : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
    nextDerivedZipcode = pendingZip || null;
    nextDerivedAddress = pendingAddress || nextDerivedAddress;
  }

  if (prevBotContext.address_pending && prevBotContext.address_stage === "awaiting_address") {
    const nextAddress = extractAddress(message, null, null, extractZipcode(message)) || message.trim();
    if (!nextAddress) {
      const prompt = "변경할 주소를 다시 입력해 주세요.";
      const reply = makeReply(prompt);
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
          address_pending: true,
          address_stage: "awaiting_address",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
    if (isLikelyAddressDetailOnly(nextAddress)) {
      nextDerivedAddress = extractAddressDetail(nextAddress) || nextAddress;
    } else {
      nextDerivedAddress = nextAddress;
    }
  }

  if (prevBotContext.change_pending && prevBotContext.change_stage === "awaiting_update_confirm") {
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    const pendingAddress = String(prevBotContext.pending_address || "").trim();
    const pendingZipcode = String(prevBotContext.pending_zipcode || "").trim();
    const beforeAddress = String(prevBotContext.pending_before_address || "").trim();
    if (isYesText(message)) {
      nextUpdateConfirmAccepted = true;
      if (isLikelyOrderId(pendingOrderId)) nextDerivedOrderId = pendingOrderId;
      if (pendingAddress) nextDerivedAddress = pendingAddress;
      if (isLikelyZipcode(pendingZipcode)) nextDerivedZipcode = pendingZipcode;
    } else if (isNoText(message)) {
      const reply = makeReply("변경할 주소를 다시 입력해 주세요. (예: 서울시 ...)");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          address_pending: true,
          address_stage: "awaiting_address",
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    } else {
      const reply = makeReply(
        buildYesNoConfirmationPrompt(
          `아래 내용으로 변경할까요?\n- 주문번호: ${pendingOrderId || "-"}\n- 현재 배송지: ${beforeAddress || "-"}\n- 변경 배송지: ${pendingAddress || "-"}`,
          { botContext: prevBotContext, entity: prevEntity }
        )
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_update_confirm",
        sourceFunction: "handlePendingStateStage",
        sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          change_pending: true,
          change_stage: "awaiting_update_confirm",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
          pending_address: pendingAddress || null,
          pending_zipcode: isLikelyZipcode(pendingZipcode) ? pendingZipcode : null,
          pending_before_address: beforeAddress || null,
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
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
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
  }

  if (prevBotContext.refund_pending && prevBotContext.refund_stage === "awaiting_refund_confirm") {
    const pendingOrderId = String(prevBotContext.pending_order_id || "").trim();
    if (isYesText(message)) {
      nextRefundConfirmAccepted = true;
      if (isLikelyOrderId(pendingOrderId)) nextDerivedOrderId = pendingOrderId;
    } else if (isNoText(message)) {
      const reply = makeReply("취소/환불 요청을 진행하지 않았습니다. 다른 도움이 필요하면 말씀해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          intent_name: resolvedIntent,
          entity: prevEntity,
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    } else {
      const reply = makeReply(
        buildYesNoConfirmationPrompt(`주문번호 ${pendingOrderId || "-"}에 대해 취소/환불 요청을 접수할까요?`, {
          botContext: prevBotContext,
          entity: prevEntity,
        })
      );
      const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
        optionsCount: YES_NO_QUICK_REPLIES.length,
        criteria: "state:awaiting_refund_confirm",
        sourceFunction: "handlePendingStateStage",
        sourceModule: "src/app/api/runtime/chat/runtime/pendingStateRuntime.ts",
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
          selected_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : prevSelectedOrderId,
          refund_pending: true,
          refund_stage: "awaiting_refund_confirm",
          pending_order_id: isLikelyOrderId(pendingOrderId) ? pendingOrderId : null,
          customer_verification_token:
            typeof prevBotContext.customer_verification_token === "string"
              ? prevBotContext.customer_verification_token
              : null,
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
        derivedOrderId: nextDerivedOrderId,
        derivedZipcode: nextDerivedZipcode,
        derivedAddress: nextDerivedAddress,
        updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
        refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
      };
    }
  }

  return {
    response: null,
    derivedOrderId: nextDerivedOrderId,
    derivedZipcode: nextDerivedZipcode,
    derivedAddress: nextDerivedAddress,
    updateConfirmAcceptedThisTurn: nextUpdateConfirmAccepted,
    refundConfirmAcceptedThisTurn: nextRefundConfirmAccepted,
  };
}
