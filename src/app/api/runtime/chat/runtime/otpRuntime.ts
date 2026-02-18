import { resolvePhoneWithReuse } from "./memoryReuseRuntime";
import { shouldForceOtpBeforeSensitiveIntentFlow } from "../policies/principles";

export function readOtpState(lastTurn: unknown) {
  const lastTurnRecord = (lastTurn ?? {}) as Record<string, any>;
  const botContext = (lastTurnRecord.bot_context ?? {}) as Record<string, any>;
  const pending = Boolean(botContext.otp_pending);
  return {
    pending,
    stage: String(botContext.otp_stage || "awaiting_code"),
    destination: String(botContext.otp_destination || "").trim(),
    otpRef: String(botContext.otp_ref || "").trim(),
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
    insertEvent,
  } = input;

  const hasSensitivePlannedCall = finalCalls.some((call: { name?: string }) => isOtpRequiredTool(call.name));
  const shouldForceOtpGate =
    shouldForceOtpBeforeSensitiveIntentFlow() &&
    requiresOtpForIntent(resolvedIntent) &&
    !customerVerificationToken &&
    !otpVerifiedThisTurn &&
    !otpPending;
  if (
    requiresOtpForIntent(resolvedIntent) &&
    (hasSensitivePlannedCall || shouldForceOtpGate) &&
    !customerVerificationToken &&
    !otpVerifiedThisTurn &&
    !otpPending
  ) {
    await insertEvent?.(
      context,
      sessionId,
      latestTurnId,
      "AUTH_GATE_PRECHECK",
      {
        intent: resolvedIntent,
        has_sensitive_planned_call: hasSensitivePlannedCall,
        force_otp_gate: shouldForceOtpGate,
        otp_pending: otpPending,
        otp_verified: otpVerifiedThisTurn,
        customer_verification_token_present: Boolean(customerVerificationToken),
        planned_calls: finalCalls.map((call: { name?: string }) => call.name).filter(Boolean),
        allowed_tool_names_count: Array.from(allowedToolNames || []).length,
      },
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> }
    );
    const otpDestination =
      resolvePhoneWithReuse({
        derivedPhone,
        prevEntityPhone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
        prevPhoneFromTranscript,
        recentEntityPhone: String(lastTurn?.bot_context?.otp_destination || ""),
      }) || "";
    if (!otpDestination) {
      await insertEvent?.(
        context,
        sessionId,
        latestTurnId,
        "AUTH_GATE_TRIGGERED",
        {
          reason: "SENSITIVE_INTENT_PRE_TOOL",
          action: "ASK_PHONE_FOR_OTP",
          intent: resolvedIntent,
          force_otp_gate: shouldForceOtpGate,
          has_sensitive_planned_call: hasSensitivePlannedCall,
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> }
      );
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
      await insertEvent?.(
        context,
        sessionId,
        latestTurnId,
        "AUTH_GATE_TRIGGERED",
        {
          reason: "OTP_TOOL_NOT_ALLOWED",
          action: "ABORT_OTP",
          intent: resolvedIntent,
          force_otp_gate: shouldForceOtpGate,
          has_sensitive_planned_call: hasSensitivePlannedCall,
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> }
      );
      mcpCandidateCalls.splice(0, mcpCandidateCalls.length, ...Array.from(new Set([...mcpCandidateCalls, "send_otp"])));
      noteMcpSkip(
        "send_otp",
        "TOOL_NOT_ALLOWED_FOR_AGENT",
        {
          intent: resolvedIntent,
          stage: "otp.pre_sensitive_call",
          planned_calls: finalCalls.map((call: { name?: string }) => call.name),
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
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> },
      allowedTools
    );
    await insertEvent?.(
      context,
      sessionId,
      latestTurnId,
      "AUTH_GATE_TRIGGERED",
      {
        reason: sendResult.ok ? "OTP_SENT" : "OTP_SEND_FAILED",
        action: sendResult.ok ? "ASK_OTP_CODE" : "ABORT_OTP",
        intent: resolvedIntent,
        force_otp_gate: shouldForceOtpGate,
        has_sensitive_planned_call: hasSensitivePlannedCall,
      },
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> }
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
    const sendData = (sendResult.data ?? {}) as Record<string, any>;
    const otpRefValue = String(sendData.otp_ref || "").trim();
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
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> },
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
      const sendData = (sendResult.data ?? {}) as Record<string, any>;
      const otpRefValue = String(sendData.otp_ref || "").trim();
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
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> },
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
    const verifyData = (verifyResult.data ?? {}) as Record<string, any>;
    const tokenValue = String(verifyData.customer_verification_token || "").trim();
    customerVerificationToken = tokenValue || null;
    policyContext = {
      ...policyContext,
      user: { ...(policyContext.user || {}), confirmed: true },
    };
    auditEntity = (policyContext.entity || {}) as Record<string, any>;
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
      resolvePhoneWithReuse({
        derivedPhone,
        prevEntityPhone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
        prevPhoneFromTranscript,
        recentEntityPhone: String(lastTurn?.bot_context?.otp_destination || ""),
      }) || "";
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
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> },
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
    const sendData = (sendResult.data ?? {}) as Record<string, any>;
    const otpRefValue = String(sendData.otp_ref || "").trim();
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


