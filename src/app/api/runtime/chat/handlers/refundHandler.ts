import { YES_NO_QUICK_REPLIES, resolveSingleChoiceQuickReplyConfig } from "../runtime/quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "../runtime/promptTemplateRuntime";
import { resolveSubstitutionPrompt } from "../runtime/intentContractRuntime";
import { getSubstitutionPlan } from "../policies/principles";

type RefundToolResult = { name: string; ok: boolean; data?: Record<string, any>; error?: unknown };

type HandleRefundRequestInput = {
  resolvedIntent: string;
  resolvedOrderId: string | null;
  refundConfirmAcceptedThisTurn: boolean;
  createTicketSuccess: RefundToolResult | undefined;
  createTicketFailure: RefundToolResult | undefined;
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
  respond: (payload: Record<string, any>, init?: ResponseInit) => Response;
  context: any;
  sessionId: string;
  nextSeq: number;
  message: string;
  latestTurnId: string | null;
  policyContextEntity: Record<string, any>;
  customerVerificationToken: string | null;
  mcpActions: string[];
};

export async function handleRefundRequest(input: HandleRefundRequestInput): Promise<Response | null> {
  const {
    resolvedIntent,
    resolvedOrderId,
    refundConfirmAcceptedThisTurn,
    createTicketSuccess,
    createTicketFailure,
    makeReply,
    insertTurn,
    insertEvent,
    respond,
    context,
    sessionId,
    nextSeq,
    message,
    latestTurnId,
    policyContextEntity,
    customerVerificationToken,
    mcpActions,
  } = input;

  if (resolvedIntent !== "refund_request") return null;

  if (!resolvedOrderId) {
    const plan = getSubstitutionPlan("order_id");
    const substitution = resolveSubstitutionPrompt({
      targetSlot: "order_id",
      intent: resolvedIntent,
      plan,
      entity: policyContextEntity,
    });
    const prompt = substitution?.prompt || "환불/반품/취소를 위해 연락처를 알려주세요.";
    const expectedInput = substitution?.askSlot || "phone";
    const reply = makeReply(prompt);
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContextEntity,
        selected_order_id: null,
        customer_verification_token: customerVerificationToken,
        mcp_actions: mcpActions,
        expected_input: expectedInput,
      },
    });
    return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
  }

  if (!refundConfirmAcceptedThisTurn && !createTicketSuccess && !createTicketFailure) {
    const reply = makeReply(
      buildYesNoConfirmationPrompt(`주문번호 ${resolvedOrderId} 건에 대해 환불/반품/취소를 접수할까요?`, {
        entity: policyContextEntity,
      })
    );
    const quickReplyConfig = resolveSingleChoiceQuickReplyConfig({
      optionsCount: YES_NO_QUICK_REPLIES.length,
      criteria: "policy:ASK_REFUND_CONFIRM",
      sourceFunction: "handleRefundRequest",
      sourceModule: "src/app/api/runtime/chat/handlers/refundHandler.ts",
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
        entity: policyContextEntity,
        selected_order_id: resolvedOrderId,
        refund_pending: true,
        refund_stage: "awaiting_refund_confirm",
        pending_order_id: resolvedOrderId,
        customer_verification_token: customerVerificationToken || null,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_DECISION",
      { stage: "tool", action: "ASK_REFUND_CONFIRM", order_id: resolvedOrderId, quick_reply_config: quickReplyConfig },
      { intent_name: resolvedIntent }
    );
    return respond({
      session_id: sessionId,
      step: "confirm",
      message: reply,
      mcp_actions: mcpActions,
      quick_replies: YES_NO_QUICK_REPLIES,
      quick_reply_config: quickReplyConfig,
    });
  }

  if (createTicketSuccess) {
    const ticketData = (createTicketSuccess.data ?? {}) as Record<string, any>;
    const ticketId = String(ticketData.ticket_id ?? ticketData.id ?? "").trim() || "-";
    const reply = makeReply(
      `접수 완료: 환불/반품/취소 요청이 접수되었습니다.\n주문번호 ${resolvedOrderId} 건으로 처리 중이며, 티켓 번호는 ${ticketId}입니다.\n추가 문의가 있으면 알려주세요.`
    );
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContextEntity,
        selected_order_id: resolvedOrderId,
        customer_verification_token: customerVerificationToken || null,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "FINAL_ANSWER_READY",
      { answer: reply, model: "deterministic_refund_ticket_success" },
      { intent_name: resolvedIntent }
    );
    return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
  }

  if (createTicketFailure) {
    const errorText = String(createTicketFailure.error || "CREATE_TICKET_FAILED");
    const reply = makeReply(
      `요청을 처리하는 중 오류가 발생했어요.\n오류: ${errorText}\n잠시 후 다시 시도하시거나 다른 문의가 있으면 알려주세요.`
    );
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        intent_name: resolvedIntent,
        entity: policyContextEntity,
        selected_order_id: resolvedOrderId,
        customer_verification_token: customerVerificationToken || null,
        mcp_actions: mcpActions,
      },
    });
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "FINAL_ANSWER_READY",
      { answer: reply, model: "deterministic_refund_ticket_error", error: errorText },
      { intent_name: resolvedIntent }
    );
    return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
  }

  return null;
}
