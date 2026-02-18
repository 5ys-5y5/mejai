import type { ChatMessage } from "@/lib/llm_mk2";
import { YES_NO_QUICK_REPLIES, maybeBuildYesNoQuickReplyRule } from "./quickReplyConfigRuntime";
import { buildYesNoConfirmationPrompt } from "./promptTemplateRuntime";
import { getReuseSlotLabel, pickReuseCandidate } from "./memoryReuseRuntime";
import { getIntentContract } from "./intentContractRuntime";
import type { CompiledPolicy } from "../shared/runtimeTypes";

function extractUserFacingFromDebug(text: string) {
  const sections: Record<string, string> = { summary: "", reason: "", detail: "", next: "" };
  let current: keyof typeof sections | null = null;
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("\uC694\uC57D:")) {
      current = "summary";
      sections.summary = line.replace(/^\uC694\uC57D:\s*/, "");
      continue;
    }
    if (line.startsWith("\uADFC\uAC70:")) {
      current = "reason";
      sections.reason = line.replace(/^\uADFC\uAC70:\s*/, "");
      continue;
    }
    if (line.startsWith("\uC0C1\uC138:")) {
      current = "detail";
      sections.detail = line.replace(/^\uC0C1\uC138:\s*/, "");
      continue;
    }
    if (line.startsWith("\uB2E4\uC74C \uC561\uC158:")) {
      current = "next";
      sections.next = line.replace(/^\uB2E4\uC74C \uC561\uC158:\s*/, "");
      continue;
    }
    if (current) {
      sections[current] = sections[current] ? `${sections[current]}\n${line}` : line;
    }
  }
  const parts = [sections.summary, sections.next].filter(Boolean);
  return parts.join("\n").trim();
}

function sanitizeUserFacingMessage(text: string, resolvedIntent: string) {
  const normalized = String(text || "").trim();
  if (!normalized) return "";
  const hasStructured = /\uC694\uC57D:|\uADFC\uAC70:|\uC0C1\uC138:|\uB2E4\uC74C \uC561\uC158:/.test(normalized);
  let candidate = hasStructured ? extractUserFacingFromDebug(normalized) : normalized;
  if (!candidate && hasStructured) {
    candidate = normalized
      .replace(/\uC694\uC57D:\s*/g, "")
      .replace(/\uADFC\uAC70:\s*/g, "")
      .replace(/\uC0C1\uC138:\s*/g, "")
      .replace(/\uB2E4\uC74C \uC561\uC158:\s*/g, "")
      .trim();
  }
  const intentContract = getIntentContract(resolvedIntent);
  if (intentContract?.preventEscalation) {
    const blocklist = [
      "\uBB38\uC758 \uD2F0\uCF13",
      "\uD2F0\uCF13",
      "\uB2F4\uB2F9\uC790",
      "\uC804\uB2EC",
      "\uC811\uC218",
      "\uC548\uB0B4\uD574 \uB4DC\uB9AC\uACA0\uC2B5\uB2C8\uB2E4",
    ];
    blocklist.forEach((phrase) => {
      candidate = candidate.replace(new RegExp(phrase, "gi"), "");
    });
    candidate = candidate.replace(/\s{2,}/g, " ").trim();
  }
  return candidate.trim();
}

export function buildFinalLlmMessages(input: {
  message: string;
  resolvedIntent: string;
  derivedChannel: string | null;
  resolvedOrderId: string | null;
  policyEntity: Record<string, any>;
  productDecision: Record<string, any> | null;
  kb: { title: string; content: string | null };
  adminKbs: Array<{ title: string; content: string | null }>;
  mcpSummary: string;
  recentTurns: Array<{ transcript_text?: string | null; final_answer?: string | null; answer_text?: string | null }>;
}) {
  const productDecisionJson = input.productDecision ? JSON.stringify(input.productDecision) : "null";
  const intentContract = getIntentContract(input.resolvedIntent);
  const intentContractSummary = intentContract
    ? `reuse_slots=${(intentContract.reuseSlots || []).join(",") || "none"}; prevent_escalation=${intentContract.preventEscalation ? "true" : "false"}`
    : "none";
  const systemPrompt = [
    "You are a customer support assistant.",
    "Return only a concise, conversational response for the end user.",
    "Do not use labels like '\uC694\uC57D:', '\uADFC\uAC70:', '\uC0C1\uC138:', or '\uB2E4\uC74C \uC561\uC158:'.",
    "Do not mention handoff, tickets, or human escalation unless explicitly required by policy or tools.",
    "Use the same language as the user.",
  ].join("\n");
  const userPrompt = [
    `User message: ${input.message}`,
    `Intent: ${input.resolvedIntent}`,
    `Intent contract: ${intentContractSummary}`,
    `Channel: ${input.derivedChannel || "none"}`,
    "Known info:",
    `- order_id: ${input.resolvedOrderId || "none"}`,
    `- phone: ${String(input.policyEntity?.phone || "none")}`,
    `- address: ${String(input.policyEntity?.address || "none")}`,
    `- zipcode: ${String(input.policyEntity?.zipcode || "none")}`,
    `Product decision: ${productDecisionJson}`,
    `KB title: ${input.kb.title}`,
    "KB content:",
    input.kb.content || "",
    "Admin KBs:",
    input.adminKbs.map((item) => `[ADMIN KB] ${item.title}\n${item.content || ""}`).join("\n") || "(none)",
    "Tool results:",
    input.mcpSummary || "(none)",
  ].join("\n");

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


export async function handleGeneralNoPathGuard(input: Record<string, any> & { compiledPolicy?: CompiledPolicy }): Promise<Response | null> {
  const {
    resolvedIntent,
    finalCalls,
    allowed,
    kbId,
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

  if (kbId === "__INLINE_KB__") {
    return null;
  }

  if (!(resolvedIntent === "general" && finalCalls.length === 0 && allowed.size === 0)) {
    return null;
  }
  const reply = makeReply(
    "죄송해요. 해당 요청은 현재 경로로 처리할 수 없어요. 다른 문의가 있으면 알려주세요."
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

  const outputGate = runPolicyStage(compiledPolicy as CompiledPolicy, "output", policyContext);
  const matchedRules = outputGate.matched as Array<{ id?: string }>;
  usedRuleIds.push(...matchedRules.map((rule) => rule.id).filter((id): id is string => Boolean(id)));
  usedTemplateIds.push(
    ...extractTemplateIds(outputGate.matched as Array<Record<string, any>>)
  );

  let reusePending = false;
  let reusePendingSlot: string | null = null;
  let reusePendingValue: string | null = null;
  let forcedTemplateApplied: string | null = null;
  let forcedTemplateSkippedReason: string | null = null;
  if (outputGate.actions.forcedResponse) {
    const forcedTemplate = normalizeOrderChangeAddressPrompt(resolvedIntent, outputGate.actions.forcedResponse);
    const resolvedAddress =
      typeof policyContext.entity?.address === "string" ? String(policyContext.entity.address).trim() : "";
    const conversationFlags =
      policyContext.conversation && typeof policyContext.conversation === "object"
        ? ((policyContext.conversation as Record<string, any>).flags as Record<string, any>) || {}
        : {};
    const deferredForceReason = String(conversationFlags.deferred_force_response_reason || "").trim();
    const missingSlots = Array.isArray(conversationFlags.intent_scope_missing_slots)
      ? conversationFlags.intent_scope_missing_slots
      : [];
    const reuseCandidate = pickReuseCandidate({
      missingSlots,
      entity: (policyContext.entity || {}) as Record<string, any>,
      listOrdersCalled,
      resolvedIntent,
    });
    const isAddressPromptTemplate =
      forcedTemplate === (compiledPolicy.templates?.order_change_need_address || "") ||
      forcedTemplate === (compiledPolicy.templates?.order_change_need_zipcode || "") ||
      usedTemplateIds.includes("order_change_need_address") ||
      usedTemplateIds.includes("order_change_need_zipcode");

    if (reuseCandidate) {
      reusePending = true;
      reusePendingSlot = reuseCandidate.slotKey;
      reusePendingValue = reuseCandidate.value;
      const label = getReuseSlotLabel(reuseCandidate.slotKey, resolvedIntent);
      finalAnswer = buildYesNoConfirmationPrompt(
        `\uC774\uC804\uC5D0 \uC54C\uB824\uC8FC\uC2E0 ${label}(${reuseCandidate.value || "-"})\uB85C \uC9C4\uD589\uD560\uAE4C\uC694?`,
        { entity: policyContext.entity }
      );
    } else if (resolvedIntent === "order_change" && isAddressPromptTemplate && resolvedAddress) {
      forcedTemplateSkippedReason = deferredForceReason || "ADDRESS_ALREADY_RESOLVED";
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        {
          stage: "final",
          action: "SKIP_FORCE_RESPONSE_TEMPLATE",
          reason: forcedTemplateSkippedReason,
          forced_template: forcedTemplate,
          output_force_reason: outputGate.actions.forceReason || null,
          resolved_address: resolvedAddress,
        },
        { intent_name: resolvedIntent }
      );
      if (debugEnabled) {
        console.log("[runtime/chat/mk2] skipping forced template", {
          reason: forcedTemplateSkippedReason,
          forced_template: forcedTemplate,
        });
      }
    } else {
      finalAnswer = forcedTemplate;
      forcedTemplateApplied = forcedTemplate;
      if (debugEnabled) {
        console.log("[runtime/chat/mk2] forcing template", { reason: outputGate.actions.forceReason });
      }
    }
  }


  const debugAnswer = formatOutputDefault(finalAnswer);
  let userAnswer = sanitizeUserFacingMessage(finalAnswer, resolvedIntent);
  if (!userAnswer) {
    userAnswer = extractUserFacingFromDebug(debugAnswer) || finalAnswer;
  }

  const reply = makeReply(userAnswer, answerRes.model, mcpActions);
  const finalPersistStartedAt = Date.now();
  await insertTurn({
    session_id: sessionId,
    seq: nextSeq,
    transcript_text: message,
    answer_text: debugAnswer,
    final_answer: reply,
    kb_references: [
      { kb_id: kb.id, title: kb.title, version: kb.version },
      ...adminKbs.map((adminKb: { id?: string; title?: string; version?: string }) => ({
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
      user_facing_message: userAnswer,
      debug_answer: debugAnswer,
      final_response_debug: {
        forced_template_applied: forcedTemplateApplied,
        forced_template_skipped_reason: forcedTemplateSkippedReason,
        output_force_reason: outputGate.actions.forceReason || null,
        resolved_address:
          typeof policyContext.entity?.address === "string" ? String(policyContext.entity.address).trim() || null : null,
      },
      ...(reusePending
        ? {
            reuse_pending: true,
            pending_reuse_slot: reusePendingSlot,
            pending_reuse_value: reusePendingValue,
          }
        : {
            reuse_pending: false,
            pending_reuse_slot: null,
            pending_reuse_value: null,
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
      debug_answer: debugAnswer,
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
