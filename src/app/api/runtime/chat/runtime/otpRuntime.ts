export function readOtpState(lastTurn: any) {
  const pending = Boolean(lastTurn?.bot_context?.otp_pending);
  return {
    pending,
    stage: String(lastTurn?.bot_context?.otp_stage || "awaiting_code"),
    destination: String(lastTurn?.bot_context?.otp_destination || "").trim(),
    otpRef: String(lastTurn?.bot_context?.otp_ref || "").trim(),
  };
}


export async function handlePreSensitiveOtpGuard(input: Record<string, any>): Promise<Response | null> {
  const {
    finalCalls,
    isOtpRequiredTool,
    requiresOtpForIntent,
    resolvedIntent,
    customerVerificationToken,
    otpVerifiedThisTurn,
    otpPending,
    derivedPhone,
    policyContext,
    prevPhoneFromTranscript,
    lastTurn,
    extractPhone,
    hasAllowedToolName,
    mcpCandidateCalls,
    noteMcpSkip,
    allowedToolNames,
    flushMcpSkipLogs,
    makeReply,
    insertTurn,
    sessionId,
    nextSeq,
    message,
    resolvedOrderId,
    callMcpTool,
    context,
    latestTurnId,
    allowedTools,
    noteMcp,
    mcpActions,
    respond,
  } = input;

  const hasSensitivePlannedCall = finalCalls.some((call: any) => isOtpRequiredTool(call.name));
  if (
    requiresOtpForIntent(resolvedIntent) &&
    hasSensitivePlannedCall &&
    !customerVerificationToken &&
    !otpVerifiedThisTurn &&
    !otpPending
  ) {
    const otpDestination =
      derivedPhone ||
      (typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null) ||
      prevPhoneFromTranscript ||
      String(lastTurn?.bot_context?.otp_destination || "");
    if (!otpDestination) {
      const prompt = "개인정보 보호를 위해 먼저 본인확인이 필요합니다. 휴대폰 번호를 알려주세요.";
      const reply = makeReply(prompt);
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
          otp_pending: true,
          otp_stage: "awaiting_phone",
        },
      });
      return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] });
    }
    if (!hasAllowedToolName("send_otp")) {
      mcpCandidateCalls.splice(0, mcpCandidateCalls.length, ...Array.from(new Set([...mcpCandidateCalls, "send_otp"])));
      noteMcpSkip(
        "send_otp",
        "TOOL_NOT_ALLOWED_FOR_AGENT",
        {
          intent: resolvedIntent,
          stage: "otp.pre_sensitive_call",
          planned_calls: finalCalls.map((call: any) => call.name),
          allowed_tool_names: Array.from(allowedToolNames),
        },
        { destination: otpDestination }
      );
      await flushMcpSkipLogs();
      const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
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
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }
    const sendResult = await callMcpTool(
      context,
      "send_otp",
      { destination: otpDestination },
      sessionId,
      latestTurnId,
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
      allowedTools
    );
    noteMcp("send_otp", sendResult);
    mcpActions.push("send_otp");
    if (!sendResult.ok) {
      const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }
    const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
    const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
    const reply = makeReply(prompt);
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
        otp_pending: true,
        otp_stage: "awaiting_code",
        otp_destination: otpDestination,
        otp_ref: otpRefValue || null,
      },
    });
    return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: ["send_otp"] });
  }

  return null;
}


export async function handleOtpLifecycleAndOrderGate(input: Record<string, any>) {
  let {
    customerVerificationToken,
    policyContext,
    auditEntity,
    mcpCandidateCalls,
  } = input;

  const {
    lastTurn,
    resolvedIntent,
    extractOtpCode,
    message,
    extractPhone,
    makeReply,
    insertTurn,
    sessionId,
    nextSeq,
    resolvedOrderId,
    respond,
    hasAllowedToolName,
    noteMcpSkip,
    allowedToolNames,
    flushMcpSkipLogs,
    callMcpTool,
    context,
    latestTurnId,
    allowedTools,
    noteMcp,
    mcpActions,
    prevBotContext,
    derivedPhone,
    prevPhoneFromTranscript,
  } = input;

  let otpVerifiedThisTurn = false;
  const otpState = readOtpState(lastTurn);
  const otpPending = otpState.pending;
  if (otpPending) {
    const otpStage = otpState.stage;
    const otpDestination = otpState.destination;
    const otpRef = otpState.otpRef;
    const otpCode = extractOtpCode(message);
    if (otpStage === "awaiting_phone") {
      const phone = extractPhone(message);
      if (!phone) {
        const prompt = "주문 조회/변경을 위해 본인인증이 필요합니다. 휴대폰 번호를 알려주세요.";
        const reply = makeReply(prompt);
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
            otp_pending: true,
            otp_stage: "awaiting_phone",
          },
        });
        return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
      }
      if (!hasAllowedToolName("send_otp")) {
        mcpCandidateCalls = Array.from(new Set([...mcpCandidateCalls, "send_otp"]));
        noteMcpSkip(
          "send_otp",
          "TOOL_NOT_ALLOWED_FOR_AGENT",
          {
            intent: resolvedIntent,
            stage: "otp.awaiting_phone",
            allowed_tool_names: Array.from(allowedToolNames),
          },
          { destination: phone }
        );
        await flushMcpSkipLogs();
        const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
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
        return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
      }
      const sendResult = await callMcpTool(
        context,
        "send_otp",
        { destination: phone },
        sessionId,
        latestTurnId,
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
        allowedTools
      );
      noteMcp("send_otp", sendResult);
      mcpActions.push("send_otp");
      if (!sendResult.ok) {
        const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
        return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
      }
      const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
      const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
      const reply = makeReply(prompt);
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
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: phone,
          otp_ref: otpRefValue || null,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    if (!otpCode) {
      const prompt = "인증번호를 다시 입력해 주세요.";
      const reply = makeReply(prompt);
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
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: otpDestination || null,
          otp_ref: otpRef || null,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    if (!hasAllowedToolName("verify_otp")) {
      mcpCandidateCalls = Array.from(new Set([...mcpCandidateCalls, "verify_otp"]));
      noteMcpSkip(
        "verify_otp",
        "TOOL_NOT_ALLOWED_FOR_AGENT",
        {
          intent: resolvedIntent,
          stage: "otp.awaiting_code",
          allowed_tool_names: Array.from(allowedToolNames),
        },
        { code: otpCode ? "***" : null, otp_ref: otpRef || null }
      );
      await flushMcpSkipLogs();
      const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
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
      return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    const verifyResult = await callMcpTool(
      context,
      "verify_otp",
      { code: otpCode, otp_ref: otpRef || undefined },
      sessionId,
      latestTurnId,
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
      allowedTools
    );
    noteMcp("verify_otp", verifyResult);
    mcpActions.push("verify_otp");
    if (!verifyResult.ok) {
      const prompt = "인증번호가 올바르지 않습니다. 다시 입력해 주세요.";
      const reply = makeReply(prompt);
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
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: otpDestination || null,
          otp_ref: otpRef || null,
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    const tokenValue = String((verifyResult.data as any)?.customer_verification_token || "").trim();
    customerVerificationToken = tokenValue || null;
    policyContext = {
      ...policyContext,
      user: { ...(policyContext.user || {}), confirmed: true },
    };
    auditEntity = (policyContext.entity || {}) as Record<string, unknown>;
    await context.supabase
      .from("D_conv_turns")
      .update({
        confirmation_response: message,
        user_confirmed: true,
        correction_text: message,
        bot_context: {
          ...prevBotContext,
          intent_name: resolvedIntent,
          entity: policyContext.entity,
          selected_order_id: resolvedOrderId,
          otp_pending: false,
          otp_stage: null,
          customer_verification_token: customerVerificationToken,
        },
      })
      .eq("id", lastTurn.id);
    otpVerifiedThisTurn = true;
  }

  if (resolvedOrderId && !customerVerificationToken && !otpVerifiedThisTurn && !otpPending) {
    const otpDestination =
      derivedPhone ||
      (typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null) ||
      prevPhoneFromTranscript ||
      String(lastTurn?.bot_context?.otp_destination || "");
    if (!otpDestination) {
      const prompt = "주문 조회/변경을 위해 본인인증이 필요합니다. 휴대폰 번호를 알려주세요.";
      const reply = makeReply(prompt);
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
          otp_pending: true,
          otp_stage: "awaiting_phone",
        },
      });
      return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    if (!hasAllowedToolName("send_otp")) {
      mcpCandidateCalls = Array.from(new Set([...mcpCandidateCalls, "send_otp"]));
      noteMcpSkip(
        "send_otp",
        "TOOL_NOT_ALLOWED_FOR_AGENT",
        {
          intent: resolvedIntent,
          stage: "otp.pre_lookup_order",
          allowed_tool_names: Array.from(allowedToolNames),
        },
        { destination: otpDestination }
      );
      await flushMcpSkipLogs();
      const reply = makeReply("본인인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
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
      return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    const sendResult = await callMcpTool(
      context,
      "send_otp",
      { destination: otpDestination },
      sessionId,
      latestTurnId,
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> },
      allowedTools
    );
    noteMcp("send_otp", sendResult);
    mcpActions.push("send_otp");
    if (!sendResult.ok) {
      const reply = makeReply("인증번호 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
      return { response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    const otpRefValue = String((sendResult.data as any)?.otp_ref || "").trim();
    const prompt = "문자로 전송된 인증번호를 입력해 주세요.";
    const reply = makeReply(prompt);
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
        otp_pending: true,
        otp_stage: "awaiting_code",
        otp_destination: otpDestination,
        otp_ref: otpRefValue || null,
      },
    });
    return { response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }), otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
  }

  return { response: null, otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
}
