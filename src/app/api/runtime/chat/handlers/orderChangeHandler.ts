type OrderChangeToolResult = { name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown };

type HandleOrderChangePostToolsInput = {
  toolResults: OrderChangeToolResult[];
  resolvedIntent: string;
  callAddressSearchWithAudit: (
    context: any,
    keyword: string,
    sessionId: string,
    turnId: string | null,
    botContext: Record<string, unknown>
  ) => Promise<any>;
  context: any;
  currentAddress: string;
  sessionId: string;
  latestTurnId: string | null;
  policyContextEntity: Record<string, unknown>;
  resolvedOrderId: string | null;
  customerVerificationToken: string | null;
  mcpActions: string[];
  makeReply: (text: string) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  nextSeq: number;
  message: string;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => Response;
  executionGuardRules: {
    updateAddress: {
      missingZipcodeCode: string;
      fallbackTicketMessage: string;
      fallbackRetryMessage: string;
    };
  };
};

export async function handleOrderChangePostTools(input: HandleOrderChangePostToolsInput): Promise<Response | null> {
  const {
    toolResults,
    resolvedIntent,
    callAddressSearchWithAudit,
    context,
    currentAddress,
    sessionId,
    latestTurnId,
    policyContextEntity,
    resolvedOrderId,
    customerVerificationToken,
    mcpActions,
    makeReply,
    insertTurn,
    nextSeq,
    message,
    insertEvent,
    respond,
    executionGuardRules,
  } = input;

    const updateFailures = toolResults.filter(
      (tool) => tool.name === "update_order_shipping_address" && !tool.ok
    );
    if (resolvedIntent === "order_change" && updateFailures.length > 0) {
      const firstUpdateError = String(updateFailures[0].error || "UPDATE_ORDER_SHIPPING_ADDRESS_FAILED");
      const missingZipcode = firstUpdateError.includes(executionGuardRules.updateAddress.missingZipcodeCode);
      if (missingZipcode) {
        const search = await callAddressSearchWithAudit(
          context,
          currentAddress || "",
          sessionId,
          latestTurnId,
          { intent_name: resolvedIntent, entity: policyContextEntity as Record<string, unknown> }
        );
        if (search.status === "success") {
          const rows = Array.isArray((search.data as any)?.results) ? (search.data as any).results : [];
          const first = rows[0];
          const candidateZip = String(first?.zipNo || "").trim();
          const roadAddr = String(first?.roadAddr || first?.roadAddrPart1 || "").trim();
          const jibunAddr = String(first?.jibunAddr || "").trim();
          if (candidateZip) {
            const prompt = `입력하신 주소를 확인했습니다.\n- 지번주소: ${jibunAddr || currentAddress}\n- 도로명주소: ${roadAddr || "-"}\n- 우편번호: ${candidateZip}\n위 정보가 맞으면 '네', 아니면 '아니오'를 입력해 주세요.`;
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
                selected_order_id: resolvedOrderId,
                address_pending: true,
                address_stage: "awaiting_zipcode_confirm",
                pending_address: currentAddress || null,
                pending_zipcode: candidateZip || null,
                pending_road_addr: roadAddr || null,
                pending_jibun_addr: jibunAddr || null,
                customer_verification_token: customerVerificationToken,
                mcp_actions: mcpActions,
              },
            });
            await insertEvent(
              context,
              sessionId,
              latestTurnId,
              "EXECUTION_GUARD_TRIGGERED",
              { reason: "MISSING_ZIPCODE", tool: "update_order_shipping_address", error: firstUpdateError },
              { intent_name: resolvedIntent }
            );
            return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
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
            entity: policyContextEntity,
            selected_order_id: resolvedOrderId,
            address_pending: true,
            address_stage: "awaiting_address",
            customer_verification_token: customerVerificationToken,
            mcp_actions: mcpActions,
          },
        });
        await insertEvent(
          context,
          sessionId,
          latestTurnId,
          "EXECUTION_GUARD_TRIGGERED",
          { reason: "MISSING_ZIPCODE", tool: "update_order_shipping_address", error: firstUpdateError },
          { intent_name: resolvedIntent }
        );
        return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: mcpActions });
      }

      const ticketSuccess = toolResults.some((tool) => tool.name === "create_ticket" && tool.ok);
      const fallbackReply = ticketSuccess
        ? executionGuardRules.updateAddress.fallbackTicketMessage
        : executionGuardRules.updateAddress.fallbackRetryMessage;
      const reply = makeReply(fallbackReply);
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
          customer_verification_token: customerVerificationToken,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "EXECUTION_GUARD_TRIGGERED",
        { reason: "UPDATE_FAILED", tool: "update_order_shipping_address", error: firstUpdateError, ticket_success: ticketSuccess },
        { intent_name: resolvedIntent }
      );
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
    }

    const updateSuccess = toolResults.find(
      (tool) => tool.name === "update_order_shipping_address" && tool.ok
    );
    if (resolvedIntent === "order_change" && updateSuccess) {
      const finalAddress =
        typeof policyContextEntity?.address === "string" ? String(policyContextEntity.address).trim() : "";
      const finalZip =
        typeof policyContextEntity?.zipcode === "string" ? String(policyContextEntity.zipcode).trim() : "";
      const lines = [
        "요약: 배송지 변경이 완료되었습니다.",
        `상세: 주문번호 ${resolvedOrderId || "-"}의 배송지 변경 요청이 정상 처리되었습니다.${finalAddress ? ` (${finalAddress}${finalZip ? `, ${finalZip}` : ""})` : ""}`,
        "다음 액션: 추가 변경이 필요하면 주소를 다시 알려주세요.",
      ];
      const reply = makeReply(lines.join("\n"));
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
          customer_verification_token: customerVerificationToken,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "FINAL_ANSWER_READY",
        { answer: reply, model: "deterministic_order_change_success" },
        { intent_name: resolvedIntent }
      );
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: mcpActions });
    }


  return null;
}
