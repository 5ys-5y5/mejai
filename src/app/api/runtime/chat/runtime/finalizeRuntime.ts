import type { ChatMessage } from "@/lib/llm_mk2";
import { YES_NO_QUICK_REPLIES, maybeBuildYesNoQuickReplyRule } from "./quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "./promptTemplateRuntime";
import { canOfferPhoneReusePrompt } from "./memoryReuseRuntime";

export function buildFinalLlmMessages(input: {
  message: string;
  resolvedIntent: string;
  derivedChannel: string | null;
  resolvedOrderId: string | null;
  policyEntity: Record<string, unknown>;
  productDecision: Record<string, unknown> | null;
  kb: { title: string; content: string | null };
  adminKbs: Array<{ title: string; content: string | null }>;
  mcpSummary: string;
  recentTurns: Array<{ transcript_text?: string | null; final_answer?: string | null; answer_text?: string | null }>;
}) {
  const productDecisionJson = input.productDecision ? JSON.stringify(input.productDecision) : "null";
  const systemPrompt = `당신은 고객 상담봇입니다.\n규칙:\n- KB에 있는 내용만 근거로 답합니다.\n- KB에 없는 내용은 추측하지 않습니다.\n- 상품 판정 JSON을 우선으로 따릅니다.`;
  const userPrompt = `고객 질문: ${input.message}\n의도: ${input.resolvedIntent}\n채널: ${input.derivedChannel || "없음"}\n확인된 정보:\n- 주문번호: ${input.resolvedOrderId || "없음"}\n- 휴대폰: ${String(input.policyEntity?.phone || "없음")}\n- 주소: ${String(input.policyEntity?.address || "없음")}\n출력 형식:\n요약: ...\n근거: ...\n상세: ...\n다음 액션: ...\n상품판정: ${productDecisionJson}\nKB 제목: ${input.kb.title}\nKB 내용:\n${input.kb.content || ""}\n관리자 공통 KB:\n${input.adminKbs.map((item) => `[ADMIN KB] ${item.title}\n${item.content || ""}`).join("\n\n") || "(없음)"}\n도구 결과:\n${input.mcpSummary || "(없음)"}`;

  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];
  [...input.recentTurns].reverse().forEach((turn) => {
    if (turn.transcript_text) messages.push({ role: "user", content: turn.transcript_text });
    if (turn.final_answer || turn.answer_text) {
      messages.push({ role: "assistant", content: turn.final_answer || turn.answer_text || "" });
    }
  });
  messages.push({ role: "user", content: userPrompt });

  return { systemPrompt, userPrompt, messages };
}


export async function handleGeneralNoPathGuard(input: Record<string, any>): Promise<Response | null> {
  const {
    resolvedIntent,
    finalCalls,
    allowed,
    kbKind,
    makeReply,
    insertTurn,
    sessionId,
    nextSeq,
    message,
    buildFailedPayload,
    policyContext,
    resolvedOrderId,
    customerVerificationToken,
    mcpActions,
    insertEvent,
    context,
    latestTurnId,
    respond,
  } = input;

  if (kbKind === "inline") {
    return null;
  }

  if (!(resolvedIntent === "general" && finalCalls.length === 0 && allowed.size === 0)) {
    return null;
  }

  const reply = makeReply(
    "현재 정책/지식 범위에서 바로 처리할 수 없는 요청입니다. 상담사 연결로 이어서 도와드릴게요."
  );
  await insertTurn({
    session_id: sessionId,
    seq: nextSeq,
    transcript_text: message,
    answer_text: reply,
    final_answer: reply,
    failed: buildFailedPayload({
      code: "POLICY_NOT_COVERED",
      summary: "No policy/tool path for this request; escalated to human support",
      intent: resolvedIntent,
      stage: "pre_llm",
      retryable: false,
    }),
    bot_context: {
      intent_name: resolvedIntent,
      entity: policyContext.entity,
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
    {
      answer: reply,
      model: "deterministic_escalation_guard",
      quick_reply_config: maybeBuildYesNoQuickReplyRule({
        message: reply,
        criteria: "guard:general_no_path",
        sourceFunction: "handleGeneralNoPathGuard",
        sourceModule: "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
      }),
    },
    { intent_name: resolvedIntent }
  );
  const quickReplyConfig = maybeBuildYesNoQuickReplyRule({
    message: reply,
    criteria: "guard:general_no_path",
    sourceFunction: "handleGeneralNoPathGuard",
    sourceModule: "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
  });
  return respond({
    session_id: sessionId,
    step: "final",
    message: reply,
    mcp_actions: mcpActions,
    ...(quickReplyConfig ? { quick_replies: YES_NO_QUICK_REPLIES, quick_reply_config: quickReplyConfig } : {}),
  });
}

export async function runFinalResponseFlow(input: Record<string, any>) {
  const {
    runLlm,
    agentLlm,
    messages,
    pushRuntimeTimingStage,
    timingStages,
    runPolicyStage,
    compiledPolicy,
    policyContext,
    usedRuleIds,
    extractTemplateIds,
    usedTemplateIds,
    formatOutputDefault,
    normalizeOrderChangeAddressPrompt,
    resolvedIntent,
    normalizePhoneDigits,
    maskPhone,
    listOrdersCalled,
    debugEnabled,
    makeReply,
    mcpActions,
    insertTurn,
    sessionId,
    nextSeq,
    message,
    kb,
    adminKbs,
    resolvedOrderId,
    customerVerificationToken,
    productDecisionRes,
    insertEvent,
    context,
    latestTurnId,
    respond,
  } = input;

  const finalLlmStartedAt = Date.now();
  const answerRes = await runLlm(agentLlm, messages);
  pushRuntimeTimingStage(timingStages, "llm_generate_final_answer", finalLlmStartedAt, {
    model: answerRes.model,
    prompt_message_count: messages.length,
  });
  let finalAnswer = answerRes.text.trim();

  const outputGate = runPolicyStage(compiledPolicy, "output", policyContext);
  usedRuleIds.push(...outputGate.matched.map((rule: any) => rule.id));
  usedTemplateIds.push(...extractTemplateIds(outputGate.matched as any[]));
  if (outputGate.actions.outputFormat) {
    finalAnswer = formatOutputDefault(finalAnswer);
  }

  let phoneReusePending = false;
  if (outputGate.actions.forcedResponse) {
    const forcedTemplate = normalizeOrderChangeAddressPrompt(resolvedIntent, outputGate.actions.forcedResponse);
    const rawPhone = typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : "";
    const normalizedPhone = normalizePhoneDigits(rawPhone);
    const isNeedOrderIdTemplate =
      forcedTemplate === (compiledPolicy.templates?.order_change_need_order_id || "") ||
      usedTemplateIds.includes("order_change_need_order_id");
    if (
      canOfferPhoneReusePrompt({
        resolvedIntent,
        isNeedOrderIdTemplate,
        normalizedPhone,
        listOrdersCalled,
      })
    ) {
      phoneReusePending = true;
      finalAnswer = buildYesNoConfirmationPrompt(`이미 제공해주신 휴대폰 번호(${maskPhone(normalizedPhone)})로 주문을 조회할까요?`, {
        entity: policyContext.entity,
      });
    } else {
      finalAnswer = forcedTemplate;
    }
    if (debugEnabled) {
      console.log("[runtime/chat/mk2] forcing template", { reason: outputGate.actions.forceReason });
    }
  }

  const reply = makeReply(finalAnswer, answerRes.model, mcpActions);
  const finalPersistStartedAt = Date.now();
  await insertTurn({
    session_id: sessionId,
    seq: nextSeq,
    transcript_text: message,
    answer_text: reply,
    final_answer: reply,
    kb_references: [
      { kb_id: kb.id, title: kb.title, version: kb.version },
      ...adminKbs.map((adminKb: any) => ({
        kb_id: adminKb.id,
        title: adminKb.title,
        version: adminKb.version,
      })),
    ],
    bot_context: {
      intent_name: resolvedIntent,
      entity: policyContext.entity,
      selected_order_id: resolvedOrderId,
      customer_verification_token: customerVerificationToken,
      product_decision: productDecisionRes.decision || null,
      product_alias: productDecisionRes.alias
        ? {
            product_id: productDecisionRes.alias.product_id,
            alias: productDecisionRes.alias.alias,
            match_type: productDecisionRes.alias.match_type,
          }
        : null,
      mcp_actions: mcpActions,
      ...(phoneReusePending
        ? {
            phone_reuse_pending: true,
            pending_phone:
              typeof policyContext.entity?.phone === "string" ? normalizePhoneDigits(policyContext.entity.phone) || null : null,
          }
        : {
            phone_reuse_pending: false,
            pending_phone: null,
          }),
    },
  });

  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "FINAL_ANSWER_READY",
    {
      answer: reply,
      model: answerRes.model,
      quick_reply_config: maybeBuildYesNoQuickReplyRule({
        message: reply,
        criteria: "output:final_answer_yes_no_prompt",
        sourceFunction: "runFinalResponseFlow",
        sourceModule: "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
      }),
    },
    { intent_name: resolvedIntent }
  );
  pushRuntimeTimingStage(timingStages, "persist_turn_and_final_event", finalPersistStartedAt, {
    mcp_action_count: mcpActions.length,
    final_answer_length: reply.length,
  });

  const quickReplyConfig = maybeBuildYesNoQuickReplyRule({
    message: reply,
    criteria: "output:final_answer_yes_no_prompt",
    sourceFunction: "runFinalResponseFlow",
    sourceModule: "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
  });
  return respond({
    session_id: sessionId,
    step: "final",
    message: reply,
    mcp_actions: mcpActions,
    ...(quickReplyConfig ? { quick_replies: YES_NO_QUICK_REPLIES, quick_reply_config: quickReplyConfig } : {}),
  });
}
