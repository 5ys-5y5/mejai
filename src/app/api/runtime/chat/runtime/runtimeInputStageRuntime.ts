import { runPolicyStage, type PolicyEvalContext } from "@/lib/policyEngine";
import { extractTemplateIds } from "./runtimeSupport";
import {
  emitPolicyStaticConflict,
  emitSlotExtracted,
  handleInputForcedResponse,
  reconcileIntentFromInputGate,
} from "./policyInputRuntime";
import { buildIntentScopePrompt, evaluateIntentScopeGate } from "./intentScopeGateRuntime";

type ContextResolutionResult = {
  contaminationSummaries: string[];
  detectedIntent: string;
  hasAddressSignal: boolean;
  resolvedOrderId: string | null;
  resolvedIntent: string;
  policyContext: PolicyEvalContext;
};

export async function runInputStageRuntime(input: {
  compiledPolicy: any;
  resolvedContext: ContextResolutionResult;
  lockIntentToRestockSubscribe: boolean;
  expectedInput: string | null;
  effectiveMessageForIntent: string;
  message: string;
  derivedOrderId: string | null;
  derivedPhone: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  prevBotContext: Record<string, unknown>;
  context: any;
  sessionId: string;
  latestTurnId: string | null;
  nextSeq: number;
  maskPhone: (value?: string | null) => string;
  normalizeOrderChangeAddressPrompt: (intent: string, text: string) => string;
  insertEvent: (
    context: any,
    sessionId: string,
    turnId: string | null,
    eventType: string,
    payload: Record<string, unknown>,
    botContext: Record<string, unknown>
  ) => Promise<unknown>;
  makeReply: (text: string, llmModel?: string | null, tools?: string[]) => string;
  insertTurn: (payload: Record<string, unknown>) => Promise<unknown>;
  respond: (payload: Record<string, unknown>, init?: ResponseInit) => Response;
}) {
  const {
    compiledPolicy,
    resolvedContext,
    lockIntentToRestockSubscribe,
    expectedInput,
    effectiveMessageForIntent,
    message,
    derivedOrderId,
    derivedPhone,
    derivedZipcode,
    derivedAddress,
    prevBotContext,
    context,
    sessionId,
    latestTurnId,
    nextSeq,
    maskPhone,
    normalizeOrderChangeAddressPrompt,
    insertEvent,
    makeReply,
    insertTurn,
    respond,
  } = input;

  const contaminationSummaries = resolvedContext.contaminationSummaries;
  const noteContamination = (info: {
    slot: string;
    reason: string;
    action: string;
    candidate?: string | null;
  }) => {
    const candidate = String(info.candidate || "").trim();
    const summary = [info.slot, info.reason, info.action, candidate ? `candidate=${candidate}` : null]
      .filter(Boolean)
      .join(" | ");
    contaminationSummaries.push(summary);
    if (contaminationSummaries.length > 10) {
      contaminationSummaries.splice(0, contaminationSummaries.length - 10);
    }
  };

  let resolvedIntent = resolvedContext.resolvedIntent;
  let resolvedOrderId = resolvedContext.resolvedOrderId;
  let policyContext: PolicyEvalContext = resolvedContext.policyContext;

  const inputGate = runPolicyStage(compiledPolicy, "input", policyContext);
  const matchedRuleIds = inputGate.matched.map((rule) => rule.id);
  const matchedTemplateIds = extractTemplateIds(inputGate.matched as any[]);
  let usedRuleIds = [...matchedRuleIds];
  let usedTemplateIds = [...matchedTemplateIds];
  const inputRuleIds = [...matchedRuleIds];
  const toolRuleIds: string[] = [];
  const usedToolPolicies: string[] = [];
  const usedProviders: string[] = [];
  const mcpActions: string[] = [];
  const mcpCandidateCalls: string[] = [];
  const mcpSkipLogs: string[] = [];
  const mcpSkipQueue: Array<{
    tool: string;
    reason: string;
    args?: Record<string, unknown>;
    detail?: Record<string, unknown>;
  }> = [];
  const slotDebug = {
    expectedInput,
    orderId: resolvedOrderId,
    phone: typeof policyContext.entity?.phone === "string" ? policyContext.entity.phone : null,
    zipcode: typeof policyContext.entity?.zipcode === "string" ? policyContext.entity.zipcode : null,
    address: typeof policyContext.entity?.address === "string" ? policyContext.entity.address : null,
  };

  const intentFromPolicy = inputGate.actions.flags?.intent_name
    ? String(inputGate.actions.flags.intent_name)
    : "general";
  resolvedIntent = reconcileIntentFromInputGate({
    intentFromPolicy,
    resolvedIntent,
    detectedIntent: resolvedContext.detectedIntent,
    hasAddressSignal: resolvedContext.hasAddressSignal,
    lockIntentToRestockSubscribe,
  });
  policyContext = {
    ...policyContext,
    intent: { name: resolvedIntent },
  };
  const activePolicyConflicts = (compiledPolicy.conflicts || []).filter((c: any) => {
    if (c.intentScope === "*") return true;
    return c.intentScope.split(",").map((v: string) => v.trim()).includes(resolvedIntent);
  });
  await emitPolicyStaticConflict({
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    policyContext,
    activePolicyConflicts,
  });
  const gate = evaluateIntentScopeGate({
    resolvedIntent,
    message,
    effectiveMessageForIntent,
    policyEntity: (policyContext.entity || {}) as Record<string, unknown>,
    prevBotContext,
    expectedInput,
  });
  await emitSlotExtracted({
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    expectedInput,
    effectiveMessageForIntent,
    message,
    derivedOrderId,
    derivedPhone,
    derivedZipcode,
    derivedAddress,
    resolvedOrderId,
    policyContext,
    maskPhone,
    resolvedSlots: gate.resolved_slots,
    missingSlots: gate.missing_slots,
  });

  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "INTENT_SCOPE_GATE_REVIEW_STARTED",
    {
      intent: resolvedIntent,
      expected_input: expectedInput || null,
      query_source:
        effectiveMessageForIntent !== message
          ? "intent_disambiguation_source_text"
          : "current_message",
    },
    { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
  );
  if (gate.enabled) {
    if (gate.missing_slots.length > 0 && gate.spec) {
      const conversation =
        policyContext.conversation && typeof policyContext.conversation === "object"
          ? (policyContext.conversation as Record<string, unknown>)
          : {};
      const flags =
        conversation.flags && typeof conversation.flags === "object"
          ? (conversation.flags as Record<string, unknown>)
          : {};
      policyContext = {
        ...policyContext,
        conversation: {
          ...conversation,
          flags: {
            ...flags,
            intent_scope_gate_blocked: true,
            intent_scope_missing_slots: gate.missing_slots,
            intent_scope_resolved_slots: gate.resolved_slots,
          },
        },
      };
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        {
          stage: "input",
          action: "INTENT_SCOPE_GATE_BLOCKED",
          intent: resolvedIntent,
          required_slots: gate.spec.required_slots,
          resolved_slots: gate.resolved_slots,
          missing_slots: gate.missing_slots,
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        {
          stage: "input",
          action: "ASK_SCOPE_SLOT",
          intent: resolvedIntent,
          ask_action: gate.spec.ask_action,
          prompt_template_key: gate.spec.slot_prompt_template_key,
          expected_input: gate.spec.expected_input,
          missing_slots: gate.missing_slots,
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
      );
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "PRE_MCP_DECISION",
        {
          intent: resolvedIntent,
          query_source:
            effectiveMessageForIntent !== message
              ? "intent_disambiguation_source_text"
              : "current_message",
          query_text:
            effectiveMessageForIntent !== message
              ? effectiveMessageForIntent
              : message,
          forced_calls: [],
          final_calls: [],
          blocked_by_missing_slots: true,
          resolved_slots: gate.resolved_slots,
          missing_slots: gate.missing_slots,
          entity: {
            order_id: resolvedOrderId || null,
            phone_masked:
              typeof policyContext.entity?.phone === "string" ? maskPhone(policyContext.entity.phone) : "-",
            has_address: Boolean(policyContext.entity?.address),
          },
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
      );
      const prompt = buildIntentScopePrompt({
        spec: gate.spec,
      });
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
          intent_scope_pending: true,
          intent_scope_missing_slots: gate.missing_slots,
          expected_input: gate.spec.expected_input,
          mcp_actions: mcpActions,
        },
      });
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "INTENT_SCOPE_GATE_REVIEW_COMPLETED",
        {
          intent: resolvedIntent,
          blocked: true,
          required_slots: gate.spec.required_slots,
          resolved_slots: gate.resolved_slots,
          missing_slots: gate.missing_slots,
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
      );
      return {
        response: respond({ session_id: sessionId, step: "confirm", message: reply, mcp_actions: [] }),
      };
    }
    await insertEvent(
      context,
      sessionId,
      latestTurnId,
      "POLICY_DECISION",
      {
        stage: "input",
        action: "SCOPE_READY",
        intent: resolvedIntent,
        required_slots: gate.spec?.required_slots || [],
        resolved_slots: gate.resolved_slots,
      },
      { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
    );
    const conversation =
      policyContext.conversation && typeof policyContext.conversation === "object"
        ? (policyContext.conversation as Record<string, unknown>)
        : {};
    const flags =
      conversation.flags && typeof conversation.flags === "object"
        ? (conversation.flags as Record<string, unknown>)
        : {};
    policyContext = {
      ...policyContext,
      conversation: {
        ...conversation,
        flags: {
          ...flags,
          intent_scope_gate_blocked: false,
          intent_scope_missing_slots: gate.missing_slots,
          intent_scope_resolved_slots: gate.resolved_slots,
        },
      },
    };
  }
  await insertEvent(
    context,
    sessionId,
    latestTurnId,
    "INTENT_SCOPE_GATE_REVIEW_COMPLETED",
    {
      intent: resolvedIntent,
      blocked: false,
      required_slots: gate.spec?.required_slots || [],
      resolved_slots: gate.resolved_slots,
      missing_slots: gate.missing_slots,
    },
    { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, unknown> }
  );

  const forcedInputResponse = await handleInputForcedResponse({
    forcedResponse: inputGate.actions.forcedResponse,
    normalizeOrderChangeAddressPrompt,
    resolvedIntent,
    makeReply,
    insertTurn,
    sessionId,
    nextSeq,
    message,
    policyContext,
    resolvedOrderId,
    insertEvent,
    context,
    latestTurnId,
    respond,
  });
  if (forcedInputResponse) {
    return { response: forcedInputResponse };
  }

  usedRuleIds = [...usedRuleIds];
  usedTemplateIds = [...usedTemplateIds];
  return {
    response: null,
    resolvedIntent,
    resolvedOrderId,
    policyContext,
    inputGate,
    activePolicyConflicts,
    usedRuleIds,
    usedTemplateIds,
    inputRuleIds,
    toolRuleIds,
    usedToolPolicies,
    usedProviders,
    mcpActions,
    mcpCandidateCalls,
    mcpSkipLogs,
    mcpSkipQueue,
    slotDebug,
    contaminationSummaries,
    noteContamination,
  };
}
