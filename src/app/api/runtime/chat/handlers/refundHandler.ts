type RefundToolResult = { name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown };

type HandleRefundRequestInput = {
  resolvedIntent: string;
  resolvedOrderId: string | null;
  refundConfirmAcceptedThisTurn: boolean;
  createTicketSuccess: RefundToolResult | undefined;
  createTicketFailure: RefundToolResult | undefined;
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
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => Response;
  context: any;
  sessionId: string;
  nextSeq: number;
  message: string;
  latestTurnId: string | null;
  policyContextEntity: Record<string, unknown>;
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
    const reply = makeReply("환불/취소/반품은 주문 확인이 필요합니다. 주문번호 또는 휴대폰번호를 알려주세요.");
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
      },
    });
    return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
  }

  if (!refundConfirmAcceptedThisTurn && !createTicketSuccess && !createTicketFailure) {
    const reply = makeReply(
      `주문번호 ${resolvedOrderId}건으로 취소/환불 요청을 접수할까요?\n맞으면 '네', 아니면 '아니오'를 입력해 주세요.`
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
      { stage: "tool", action: "ASK_REFUND_CONFIRM", order_id: resolvedOrderId },
      { intent_name: resolvedIntent }
    );
    return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
  }

  if (createTicketSuccess) {
    const ticketId =
      String((createTicketSuccess.data as any)?.ticket_id || (createTicketSuccess.data as any)?.id || "").trim() || "-";
    const reply = makeReply(
      `요약: 취소/환불 요청이 접수되었습니다.\n상세: 주문번호 ${resolvedOrderId} 기준으로 요청이 등록되었습니다. (접수번호: ${ticketId})\n다음 액션: 처리 결과를 확인해드릴까요?`
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
      `요청 접수 중 오류가 발생했습니다.\n원인: ${errorText}\n다음 액션: 잠시 후 다시 시도하거나 관리자에게 취소 요청을 전달해 주세요.`
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

