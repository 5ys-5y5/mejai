import { resolvePhoneWithReuse } from "./memoryReuseRuntime";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizePhoneDigits } from "../shared/slotUtils";
import { requiresOtpForIntent, shouldForceOtpBeforeSensitiveIntentFlow, shouldForceOtpOnPhoneInput } from "../policies/principles";

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

function isPhoneInputRequested(input: {
  lastTurn: unknown;
  expectedInput?: string | null;
  expectedInputs?: string[] | null;
}) {
  const expectedInput = String(input.expectedInput || "").trim();
  if (expectedInput === "phone") return true;
  const expectedInputs = Array.isArray(input.expectedInputs)
    ? input.expectedInputs.map((value) => String(value || "").trim())
    : [];
  if (expectedInputs.includes("phone")) return true;
  const lastTurnRecord = (input.lastTurn ?? {}) as Record<string, any>;
  const botContext = (lastTurnRecord.bot_context ?? {}) as Record<string, any>;
  return String(botContext.expected_input || "").trim() === "phone";
}

function readOtpVerifiedPhones(source: Record<string, any> | null | undefined) {
  const set = new Set<string>();
  const list = Array.isArray(source?.otp_verified_phones) ? source!.otp_verified_phones : [];
  list.forEach((value) => {
    const text = String(value || "").trim();
    if (text) set.add(text);
  });
  const single = String(source?.otp_verified_phone || "").trim();
  if (single) set.add(single);
  return set;
}

function normalizePhone(value: string | null | undefined) {
  const digits = normalizePhoneDigits(value);
  return digits ? digits : null;
}

function buildOtpBotContextBase(input: {
  prevBotContext?: Record<string, any> | null;
  intentName: string;
  entity: Record<string, any>;
  selectedOrderId: string | null;
}) {
  const base =
    input.prevBotContext && typeof input.prevBotContext === "object"
      ? ({ ...(input.prevBotContext as Record<string, any>) } as Record<string, any>)
      : {};
  return {
    ...base,
    intent_name: input.intentName,
    entity: input.entity,
    selected_order_id: input.selectedOrderId,
  };
}

function buildVerifiedPhoneSet(input: {
  prevBotContext?: Record<string, any> | null;
  lastTurn?: unknown;
  customerVerificationToken?: string | null;
}) {
  const set = new Set<string>();
  const prevBotContext = input.prevBotContext || {};
  readOtpVerifiedPhones(prevBotContext).forEach((value) => set.add(value));
  const lastTurnRecord = (input.lastTurn ?? {}) as Record<string, any>;
  const lastTurnBotContext =
    lastTurnRecord.bot_context && typeof lastTurnRecord.bot_context === "object"
      ? (lastTurnRecord.bot_context as Record<string, any>)
      : {};
  readOtpVerifiedPhones(lastTurnBotContext).forEach((value) => set.add(value));
  const tokenPhone = normalizePhone(
    String(prevBotContext.otp_destination || lastTurnBotContext.otp_destination || "")
  );
  if (input.customerVerificationToken && tokenPhone) set.add(tokenPhone);
  return set;
}

function resolvePhoneAuthorization(input: { candidatePhone: string | null; verifiedPhones: Set<string> }) {
  const normalized = normalizePhone(input.candidatePhone);
  return {
    phone: normalized,
    authorized: normalized ? input.verifiedPhones.has(normalized) : false,
  };
}

async function queryEndUserPhone(input: {
  supabase: any;
  agentId: string | null;
  phone: string;
}) {
  const { supabase, agentId, phone } = input;
  let query = supabase.from("A_end_users").select("id").eq("phone", phone);
  if (agentId) {
    query = query.eq("agent_id", agentId);
  } else {
    query = query.is("agent_id", null);
  }
  const { data, error } = await query.maybeSingle();
  if (error) return { found: false, error: error.message };
  return { found: Boolean(data?.id), error: null as string | null };
}

async function isKnownEndUserPhone(input: { context: any; agentId: string | null; phone: string }) {
  const { context, agentId, phone } = input;
  const primary = await queryEndUserPhone({ supabase: context.supabase, agentId, phone });
  if (!primary.error) return primary.found;
  try {
    const adminSupabase = createAdminSupabaseClient();
    const fallback = await queryEndUserPhone({ supabase: adminSupabase, agentId, phone });
    if (!fallback.error) return fallback.found;
  } catch {
    // ignore admin fallback errors
  }
  return false;
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

  const lastTurnRecord = (lastTurn ?? {}) as Record<string, any>;
  const lastTurnBotContext =
    lastTurnRecord.bot_context && typeof lastTurnRecord.bot_context === "object"
      ? (lastTurnRecord.bot_context as Record<string, any>)
      : null;
  const otpBaseContext = buildOtpBotContextBase({
    prevBotContext: lastTurnBotContext,
    intentName: resolvedIntent,
    entity: policyContext.entity as Record<string, any>,
    selectedOrderId: resolvedOrderId,
  });

  const verifiedPhones = buildVerifiedPhoneSet({
    lastTurn,
    customerVerificationToken,
  });
  const candidatePhoneForAuth =
    resolvePhoneWithReuse({
      derivedPhone,
      prevEntityPhone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
      prevPhoneFromTranscript,
      recentEntityPhone: String(lastTurn?.bot_context?.otp_destination || ""),
      resolvedIntent,
    }) || null;
  const phoneAuthorization = resolvePhoneAuthorization({
    candidatePhone: candidatePhoneForAuth,
    verifiedPhones,
  });
  const hasPhoneAuthorization = phoneAuthorization.authorized;

  const hasSensitivePlannedCall = finalCalls.some((call: { name?: string }) => isOtpRequiredTool(call.name));
  const shouldForceOtpGate =
    shouldForceOtpBeforeSensitiveIntentFlow() &&
    requiresOtpForIntent(resolvedIntent) &&
    !hasPhoneAuthorization &&
    !otpVerifiedThisTurn &&
    !otpPending;
  if (
    requiresOtpForIntent(resolvedIntent) &&
    (hasSensitivePlannedCall || shouldForceOtpGate) &&
    !hasPhoneAuthorization &&
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
        resolvedIntent,
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
    const prompt = "\uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638\uB97C \uC704\uD574 \uBCF8\uC778 \uD655\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uD734\uB300\uD3F0 \uBC88\uD638\uB97C \uC54C\uB824\uC8FC\uC138\uC694.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: true,
          otp_stage: "awaiting_phone",
          expected_input: "phone",
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
    const reply = makeReply("\uBCF8\uC778 \uC778\uC99D\uC744 \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
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
    const reply = makeReply("\uC778\uC99D\uBC88\uD638 \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] });
    }
    const sendData = (sendResult.data ?? {}) as Record<string, any>;
    const otpRefValue = String(sendData.otp_ref || "").trim();
    const prompt = "\uBB38\uC790\uB85C \uC804\uC1A1\uB41C \uC778\uC99D\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
    const reply = makeReply(prompt);
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        ...otpBaseContext,
        otp_pending: true,
        otp_stage: "awaiting_code",
        otp_destination: otpDestination,
        otp_ref: otpRefValue || null,
        expected_input: "otp_code",
      },
    });
    return respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: ["send_otp"] });
  }

  return null;
}

export async function handleOtpLifecycleAndOrderGate(input: Record<string, any>) {
  let { customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls } = input;

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
    expectedInput,
    expectedInputs,
    expectedInputStage,
    reuseConfirmedSlot,
  } = input;

  const prevBotContextRecord =
    prevBotContext && typeof prevBotContext === "object" ? (prevBotContext as Record<string, any>) : {};
  const verifiedPhones = buildVerifiedPhoneSet({
    prevBotContext: prevBotContextRecord,
    lastTurn,
    customerVerificationToken,
  });
  const otpBaseContext = buildOtpBotContextBase({
    prevBotContext: prevBotContextRecord,
    intentName: resolvedIntent,
    entity: policyContext.entity as Record<string, any>,
    selectedOrderId: resolvedOrderId,
  });

  const currentPhoneRaw = extractPhone(message);
  const currentPhone = normalizePhone(currentPhoneRaw);
  const derivedPhoneNormalized = normalizePhone(derivedPhone);
  const policyPhoneRaw =
    typeof policyContext?.entity?.phone === "string" ? String(policyContext.entity.phone) : null;
  const candidatePhoneRaw = currentPhoneRaw || derivedPhone || policyPhoneRaw || null;
  const phoneAuthorization = resolvePhoneAuthorization({
    candidatePhone: candidatePhoneRaw,
    verifiedPhones,
  });
  if (phoneAuthorization.phone && !phoneAuthorization.authorized) {
    customerVerificationToken = null;
  }

  let otpVerifiedThisTurn = false;
  const otpState = readOtpState(lastTurn);
  let otpPending = otpState.pending;
  let otpStage = otpState.stage;
  let otpDestination = otpState.destination;
  let otpRef = otpState.otpRef;
  const contractGateStage = String(expectedInputStage || "").trim();
  if (!otpPending && contractGateStage.startsWith("auth_gate.")) {
    otpPending = true;
    otpStage = contractGateStage.endsWith("awaiting_phone") ? "awaiting_phone" : "awaiting_code";
    if (!otpDestination) {
      const prevDestination =
        typeof prevBotContextRecord.otp_destination === "string"
          ? prevBotContextRecord.otp_destination
          : "";
      otpDestination = String(prevDestination || policyPhoneRaw || derivedPhone || "").trim();
    }
    if (!otpRef) {
      otpRef = typeof prevBotContextRecord.otp_ref === "string" ? prevBotContextRecord.otp_ref : "";
    }
  }
  if (otpPending) {
    const otpCode = extractOtpCode(message);
    if (otpStage === "awaiting_phone") {
      const phone = extractPhone(message);
      if (!phone) {
    const prompt = "\uC8FC\uBB38 \uC870\uD68C/\uBCC0\uACBD\uC744 \uC704\uD574 \uBCF8\uC778 \uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uD734\uB300\uD3F0 \uBC88\uD638\uB97C \uC54C\uB824\uC8FC\uC138\uC694.";
        const reply = makeReply(prompt);
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            ...otpBaseContext,
            otp_pending: true,
            otp_stage: "awaiting_phone",
            expected_input: "phone",
          },
        });
        return {
          response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
          otpVerifiedThisTurn,
          otpPending,
          customerVerificationToken,
          policyContext,
          auditEntity,
          mcpCandidateCalls,
        };
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
    const reply = makeReply("\uBCF8\uC778 \uC778\uC99D\uC744 \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            ...otpBaseContext,
            otp_pending: false,
            otp_stage: null,
            expected_input: null,
          },
        });
        return {
          response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
          otpVerifiedThisTurn,
          otpPending,
          customerVerificationToken,
          policyContext,
          auditEntity,
          mcpCandidateCalls,
        };
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
    const reply = makeReply("\uC778\uC99D\uBC88\uD638 \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
        await insertTurn({
          session_id: sessionId,
          seq: nextSeq,
          transcript_text: message,
          answer_text: reply,
          final_answer: reply,
          bot_context: {
            ...otpBaseContext,
            otp_pending: false,
            otp_stage: null,
            expected_input: null,
          },
        });
        return {
          response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
          otpVerifiedThisTurn,
          otpPending,
          customerVerificationToken,
          policyContext,
          auditEntity,
          mcpCandidateCalls,
        };
      }
      const sendData = (sendResult.data ?? {}) as Record<string, any>;
      const otpRefValue = String(sendData.otp_ref || "").trim();
    const prompt = "\uBB38\uC790\uB85C \uC804\uC1A1\uB41C \uC778\uC99D\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: phone,
          otp_ref: otpRefValue || null,
          expected_input: "otp_code",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
    }
    if (!otpCode) {
    const prompt = "\uC778\uC99D\uBC88\uD638\uB97C \uB2E4\uC2DC \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: otpDestination || null,
          otp_ref: otpRef || null,
          expected_input: "otp_code",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
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
    const reply = makeReply("\uBCF8\uC778 \uC778\uC99D\uC744 \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
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
    const prompt = "\uC778\uC99D\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694. \uB2E4\uC2DC \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: true,
          otp_stage: "awaiting_code",
          otp_destination: otpDestination || null,
          otp_ref: otpRef || null,
          expected_input: "otp_code",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
    }
    const verifyData = (verifyResult.data ?? {}) as Record<string, any>;
    const tokenValue = String(verifyData.customer_verification_token || "").trim();
    customerVerificationToken = tokenValue || null;
    const normalizedVerifiedPhone = normalizePhone(otpDestination || currentPhone || "");
    const nextVerifiedPhones = new Set<string>(verifiedPhones);
    if (normalizedVerifiedPhone) nextVerifiedPhones.add(normalizedVerifiedPhone);
    if (normalizedVerifiedPhone && prevBotContext && typeof prevBotContext === "object") {
      (prevBotContext as Record<string, any>).otp_verified_phone = normalizedVerifiedPhone;
      (prevBotContext as Record<string, any>).otp_verified_phones = Array.from(nextVerifiedPhones);
    }
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
          phone_auth_status: normalizedVerifiedPhone ? "authorized" : null,
          phone_auth_phone: normalizedVerifiedPhone || null,
          ...(normalizedVerifiedPhone
            ? {
                otp_verified_phone: normalizedVerifiedPhone,
                otp_verified_phones: Array.from(nextVerifiedPhones),
              }
            : {}),
          expected_input: null,
        },
      })
      .eq("id", lastTurn.id);
    otpVerifiedThisTurn = true;
  }

  if (phoneAuthorization.phone && !phoneAuthorization.authorized && !otpPending && !otpVerifiedThisTurn) {
    const otpDestination = candidatePhoneRaw || "";
    if (!otpDestination) {
      return {
        response: null,
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
    }
    if (!hasAllowedToolName("send_otp")) {
      mcpCandidateCalls = Array.from(new Set([...mcpCandidateCalls, "send_otp"]));
      noteMcpSkip(
        "send_otp",
        "TOOL_NOT_ALLOWED_FOR_AGENT",
        {
          intent: resolvedIntent,
          stage: "otp.phone_confirmed",
          allowed_tool_names: Array.from(allowedToolNames),
        },
        { destination: otpDestination }
      );
      await flushMcpSkipLogs();
      const reply = makeReply("본인 인증을 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
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
      const reply = makeReply("인증번호 전송에 실패했어요. 잠시 후 다시 시도해 주세요.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
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
        ...otpBaseContext,
        otp_pending: true,
        otp_stage: "awaiting_code",
        otp_destination: otpDestination,
        otp_ref: otpRefValue || null,
        expected_input: "otp_code",
      },
    });
    return {
      response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
      otpVerifiedThisTurn,
      otpPending,
      customerVerificationToken,
      policyContext,
      auditEntity,
      mcpCandidateCalls,
    };
  }

  if (requiresOtpForIntent(resolvedIntent) && resolvedOrderId && !otpVerifiedThisTurn && !otpPending) {
    const otpDestination =
      resolvePhoneWithReuse({
        derivedPhone,
        prevEntityPhone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
        prevPhoneFromTranscript,
        recentEntityPhone: String(lastTurn?.bot_context?.otp_destination || ""),
        resolvedIntent,
      }) || "";
    const destinationAuthorized = Boolean(
      resolvePhoneAuthorization({ candidatePhone: otpDestination, verifiedPhones }).authorized
    );
    if (destinationAuthorized) {
      return { response: null, otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    if (!otpDestination) {
      const prompt = "\uC8FC\uBB38 \uC870\uD68C/\uBCC0\uACBD\uC744 \uC704\uD574 \uBCF8\uC778 \uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uD734\uB300\uD3F0 \uBC88\uD638\uB97C \uC54C\uB824\uC8FC\uC138\uC694.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: true,
          otp_stage: "awaiting_phone",
          expected_input: "phone",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
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
    const reply = makeReply("\uBCF8\uC778 \uC778\uC99D\uC744 \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
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
    const reply = makeReply("\uC778\uC99D\uBC88\uD638 \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
    }
    const sendData = (sendResult.data ?? {}) as Record<string, any>;
    const otpRefValue = String(sendData.otp_ref || "").trim();
    const prompt = "\uBB38\uC790\uB85C \uC804\uC1A1\uB41C \uC778\uC99D\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
    const reply = makeReply(prompt);
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        ...otpBaseContext,
        otp_pending: true,
        otp_stage: "awaiting_code",
        otp_destination: otpDestination,
        otp_ref: otpRefValue || null,
        expected_input: "otp_code",
      },
    });
    return {
      response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
      otpVerifiedThisTurn,
      otpPending,
      customerVerificationToken,
      policyContext,
      auditEntity,
      mcpCandidateCalls,
    };
  }

  if (shouldForceOtpOnPhoneInput() && !phoneAuthorization.authorized && !otpVerifiedThisTurn && !otpPending) {
    const phoneInputRequested = isPhoneInputRequested({ lastTurn, expectedInput, expectedInputs });
    const reuseConfirmedPhone =
      reuseConfirmedSlot === "phone"
        ? normalizePhone(
            String(derivedPhone || (policyContext.entity as Record<string, any>)?.phone || "").trim()
          )
        : null;
    const candidatePhone = currentPhone || reuseConfirmedPhone;
    const shouldTriggerPhoneOtp = Boolean(candidatePhone) && !verifiedPhones.has(candidatePhone || "");
    if (phoneInputRequested && !candidatePhone) {
      const prompt = "\uBCF8\uC778 \uD655\uC778\uC744 \uC704\uD574 \uD734\uB300\uD3F0 \uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
      const reply = makeReply(prompt);
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: true,
          otp_stage: "awaiting_phone",
          expected_input: "phone",
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
    }
    if (!shouldTriggerPhoneOtp) {
      return { response: null, otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
    }
    const otpDestination = candidatePhone || "";
    if (!hasAllowedToolName("send_otp")) {
      mcpCandidateCalls = Array.from(new Set([...mcpCandidateCalls, "send_otp"]));
      noteMcpSkip(
        "send_otp",
        "TOOL_NOT_ALLOWED_FOR_AGENT",
        {
          intent: resolvedIntent,
          stage: "otp.phone_input",
          allowed_tool_names: Array.from(allowedToolNames),
        },
        { destination: otpDestination }
      );
      await flushMcpSkipLogs();
    const reply = makeReply("\uBCF8\uC778 \uC778\uC99D\uC744 \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
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
    const reply = makeReply("\uC778\uC99D\uBC88\uD638 \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      await insertTurn({
        session_id: sessionId,
        seq: nextSeq,
        transcript_text: message,
        answer_text: reply,
        final_answer: reply,
        bot_context: {
          ...otpBaseContext,
          otp_pending: false,
          otp_stage: null,
          expected_input: null,
        },
      });
      return {
        response: respond({ session_id: sessionId, step: "final", message: reply, mcp_actions: [] }),
        otpVerifiedThisTurn,
        otpPending,
        customerVerificationToken,
        policyContext,
        auditEntity,
        mcpCandidateCalls,
      };
    }
    const sendData = (sendResult.data ?? {}) as Record<string, any>;
    const otpRefValue = String(sendData.otp_ref || "").trim();
    const prompt = "\uBB38\uC790\uB85C \uBC1B\uC740 \uC778\uC99D\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
    const reply = makeReply(prompt);
    await insertTurn({
      session_id: sessionId,
      seq: nextSeq,
      transcript_text: message,
      answer_text: reply,
      final_answer: reply,
      bot_context: {
        ...otpBaseContext,
        otp_pending: true,
        otp_stage: "awaiting_code",
        otp_destination: otpDestination,
        otp_ref: otpRefValue || null,
        expected_input: "otp_code",
      },
    });
    return {
      response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
      otpVerifiedThisTurn,
      otpPending,
      customerVerificationToken,
      policyContext,
      auditEntity,
      mcpCandidateCalls,
    };
  }
  return { response: null, otpVerifiedThisTurn, otpPending, customerVerificationToken, policyContext, auditEntity, mcpCandidateCalls };
}
