import { runPolicyStage } from "@/lib/policyEngine";
import { extractTemplateIds } from "./runtimeSupport";
import {
  buildMutationToolCall,
  getMutationIntentContract,
  resolveMutationReadyState,
} from "./intentContractRuntime";
import {
  createToolAccessEvaluator,
  emitPreMcpDecisionEvent,
  emitToolPolicyConflictIfAny,
  executeFinalToolCalls,
  filterForcedCallsByPolicy,
  handleToolForcedResponse,
  maybeQueueListOrdersSkip,
  normalizeAndFilterFinalCalls,
} from "./toolRuntime";
import { handlePreSensitiveOtpGuard } from "./otpRuntime";
import { handlePostToolDeterministicFlows } from "./postToolRuntime";
import { getSubstitutionPlan } from "../policies/principles";
import type { CompiledPolicy } from "../shared/runtimeTypes";

export async function runToolStagePipeline(input: Record<string, any> & { compiledPolicy: CompiledPolicy }) {
  const {
    compiledPolicy,
    policyContext,
    resolvedIntent,
    usedRuleIds,
    usedTemplateIds,
    usedToolPolicies,
    mcpCandidateCalls,
    activePolicyConflicts,
    resolvedOrderId,
    customerVerificationToken,
    otpVerifiedThisTurn,
    otpPending,
    derivedPhone,
    prevPhoneFromTranscript,
    lastTurn,
    extractPhone,
    hasAllowedToolName,
    noteMcpSkip,
    allowedToolNames,
    flushMcpSkipLogs,
    makeReply,
    insertTurn,
    sessionId,
    nextSeq,
    message,
    callMcpTool,
    context,
    latestTurnId,
    allowedTools,
    noteMcp,
    mcpActions,
    respond,
    conversationMode,
    insertEvent,
    normalizeOrderChangeAddressPrompt,
    isOrderChangeZipcodeTemplateText,
    productDecisionRes,
    buildDefaultOrderRange,
    isLikelyOrderId,
    noteContamination,
    validateToolArgs,
    CHAT_PRINCIPLES,
    buildLookupOrderArgs,
    readLookupOrderView,
    toOrderDateShort,
    toMoneyText,
    effectiveMessageForIntent,
    maskPhone,
    deniedOverride,
    listOrdersCalled,
    listOrdersEmpty,
    listOrdersChoices,
    executionGuardRules,
    refundConfirmAcceptedThisTurn,
    mcpSummary: initialMcpSummary,
    hasUniqueAnswerCandidate,
    hasChoiceAnswerCandidates,
    normalizePhoneDigits,
    callAddressSearchWithAudit,
    requiresOtpForIntent,
    isOtpRequiredTool,
  } = input;

  const toolGate = runPolicyStage(compiledPolicy, "tool", policyContext);
  const toolRuleIds = toolGate.matched.map((rule: { id?: string }) => rule.id).filter(Boolean) as string[];
  usedRuleIds.push(...toolRuleIds);
  usedTemplateIds.push(...extractTemplateIds(toolGate.matched as Array<Record<string, any>>));
  const forcedCalls = toolGate.actions.forcedToolCalls || [];
  mcpCandidateCalls.splice(
    0,
    mcpCandidateCalls.length,
    ...forcedCalls.map((call: { name?: string }) => String(call.name || "")).filter(Boolean)
  );

  const denied = deniedOverride || new Set(toolGate.actions.denyTools || []);
  const allowed = new Set(toolGate.actions.allowTools || []);
  const canUseTool = createToolAccessEvaluator(denied, allowed);
  let finalCalls = filterForcedCallsByPolicy(
    forcedCalls as Array<{ name: string; args?: Record<string, any> }>,
    denied,
    allowed,
    noteMcpSkip
  ) as typeof forcedCalls;

  const mutationContract = getMutationIntentContract(resolvedIntent);
  if (mutationContract) {
    const entity = (policyContext?.entity || {}) as Record<string, any>;
    const readyState = resolveMutationReadyState({
      contract: mutationContract,
      entity,
      resolvedOrderId,
    });
    const hasMutationCall = finalCalls.some(
      (call: { name: string }) => call.name === mutationContract.mutationTool
    );
    if (
      readyState.ready &&
      !hasMutationCall &&
      hasAllowedToolName(mutationContract.mutationTool) &&
      canUseTool(mutationContract.mutationTool)
    ) {
      const toolCall = buildMutationToolCall({
        contract: mutationContract,
        entity,
        resolvedOrderId,
      });
      finalCalls.push(toolCall);
      if (!mcpCandidateCalls.includes(mutationContract.mutationTool)) {
        mcpCandidateCalls.push(mutationContract.mutationTool);
      }
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        {
          stage: "tool",
          action: "AUTO_FORCE_MUTATION_TOOL",
          reason: "MUTATION_INTENT_READY",
          intent: mutationContract.intent,
          tool: mutationContract.mutationTool,
          resolved: readyState.resolved,
        },
        { intent_name: resolvedIntent, entity }
      );
    } else if (!readyState.ready) {
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "EXECUTION_GUARD_TRIGGERED",
        {
          tool: mutationContract.mutationTool,
          reason: "MISSING_REQUIRED_SLOTS",
          error: "MUTATION_INTENT_NOT_READY",
          missing: readyState.missing,
        },
        { intent_name: resolvedIntent, entity }
      );
    }
  }

  finalCalls = await normalizeAndFilterFinalCalls({
    finalCalls,
    buildDefaultOrderRange,
    policyContext,
    resolvedIntent,
    noteMcpSkip,
    compiledPolicy,
    usedToolPolicies,
    customerVerificationToken,
    isLikelyOrderId,
    noteContamination,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    validateToolArgs,
  });

  const preSensitiveOtpGuard = await handlePreSensitiveOtpGuard({
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
    insertEvent,
  });
  if (preSensitiveOtpGuard) {
    return { response: preSensitiveOtpGuard };
  }

  maybeQueueListOrdersSkip({
    finalCalls,
    mcpCandidateCalls,
    resolvedOrderId,
    resolvedIntent,
    policyContext,
    compiledPolicy,
    hasAllowedToolName,
    canUseTool,
    noteMcpSkip,
    maskPhone,
    buildDefaultOrderRange,
  });

  await emitPreMcpDecisionEvent({
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    effectiveMessageForIntent,
    message,
    forcedCalls: forcedCalls as Array<{ name: string; args?: Record<string, any> }>,
    finalCalls: finalCalls as Array<{ name: string; args?: Record<string, any> }>,
    denied,
    allowed,
    allowedToolNames,
    activePolicyConflicts,
    resolvedOrderId,
    policyContext,
    maskPhone,
  });
  await flushMcpSkipLogs();

  await emitToolPolicyConflictIfAny({
    toolGate,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    policyContext,
  });

  const forcedToolResponse = await handleToolForcedResponse({
    toolGate,
    conversationMode,
    resolvedIntent,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    normalizeOrderChangeAddressPrompt,
    compiledPolicy,
    usedTemplateIds,
    isOrderChangeZipcodeTemplateText,
    policyContext,
    hasAllowedToolName,
    canUseTool,
    makeReply,
    insertTurn,
    nextSeq,
    message,
    resolvedOrderId,
    productDecisionRes,
    customerVerificationToken,
    respond,
  });
  if (forcedToolResponse) {
    return { response: forcedToolResponse };
  }

  const orderIdPlan = getSubstitutionPlan("order_id");
  if (resolvedIntent === "order_change" && !resolvedOrderId && orderIdPlan) {
    const phone = typeof policyContext?.entity?.phone === "string" ? String(policyContext.entity.phone).trim() : "";
    const alreadyPlanned = finalCalls.some((call: { name: string }) => call.name === "list_orders");
    if (
      phone &&
      orderIdPlan.ask.includes("phone") &&
      orderIdPlan.tools.includes("list_orders") &&
      !alreadyPlanned &&
      hasAllowedToolName("list_orders") &&
      canUseTool("list_orders")
    ) {
      const memberId =
        typeof policyContext?.entity?.member_id === "string" ? String(policyContext.entity.member_id) : null;
      finalCalls.push({
        name: "list_orders",
        args: {
          ...(memberId ? { member_id: memberId } : { cellphone: phone }),
          ...buildDefaultOrderRange(),
        },
      });
      if (!mcpCandidateCalls.includes("list_orders")) {
        mcpCandidateCalls.push("list_orders");
      }
      await insertEvent(
        context,
        sessionId,
        latestTurnId,
        "POLICY_DECISION",
        {
          stage: "tool",
          action: "SUBSTITUTE_ORDER_ID_WITH_PHONE",
          reason: "MISSING_ORDER_ID_PHONE_AVAILABLE",
        },
        { intent_name: resolvedIntent, entity: policyContext.entity as Record<string, any> }
      );
    }
  }

  const toolResults: Array<{ name: string; ok: boolean; data?: Record<string, any>; error?: unknown }> =
    Array.isArray(input.toolResults) ? input.toolResults : [];
  const toolExec = await executeFinalToolCalls({
    finalCalls,
    hasAllowedToolName,
    noteMcpSkip,
    allowedToolNames,
    resolvedIntent,
    refundConfirmAcceptedThisTurn,
    resolvedOrderId,
    callMcpTool,
    context,
    sessionId,
    latestTurnId,
    policyContext,
    allowedTools,
    noteMcp,
    toolResults,
    CHAT_PRINCIPLES,
    canUseTool,
    buildLookupOrderArgs,
    customerVerificationToken,
    readLookupOrderView,
    mcpActions,
    toOrderDateShort,
    toMoneyText,
  });
  let mcpSummary = String(initialMcpSummary || "");
  let nextListOrdersCalled = Boolean(listOrdersCalled);
  let nextListOrdersEmpty = Boolean(listOrdersEmpty);
  let nextListOrdersChoices = Array.isArray(listOrdersChoices) ? listOrdersChoices : [];
  mcpSummary = toolExec.mcpSummary;
  nextListOrdersCalled = toolExec.listOrdersCalled;
  nextListOrdersEmpty = toolExec.listOrdersEmpty;
  nextListOrdersChoices = toolExec.listOrdersChoices as Array<Record<string, any>>;

  await flushMcpSkipLogs();

  const postToolFlow = await handlePostToolDeterministicFlows({
    toolResults,
    readLookupOrderView,
    insertEvent,
    context,
    sessionId,
    latestTurnId,
    resolvedIntent,
    listOrdersChoices: nextListOrdersChoices,
    normalizePhoneDigits,
    maskPhone,
    makeReply,
    insertTurn,
    nextSeq,
    message,
    mcpActions,
    respond,
    hasUniqueAnswerCandidate,
    hasChoiceAnswerCandidates,
    compiledPolicy,
    CHAT_PRINCIPLES,
    listOrdersCalled: nextListOrdersCalled,
    listOrdersEmpty: nextListOrdersEmpty,
    customerVerificationToken,
    resolvedOrderId,
    policyContext,
    callAddressSearchWithAudit,
    executionGuardRules,
    refundConfirmAcceptedThisTurn,
    mcpSummary,
  });
  if (postToolFlow.response) {
    return { response: postToolFlow.response };
  }

  return {
    response: null,
    toolRuleIds,
    usedRuleIds,
    usedTemplateIds,
    usedToolPolicies,
    mcpCandidateCalls,
    finalCalls,
    allowed,
    canUseTool,
    mcpSummary: postToolFlow.mcpSummary,
    listOrdersCalled: nextListOrdersCalled,
    listOrdersEmpty: nextListOrdersEmpty,
    listOrdersChoices: nextListOrdersChoices,
    resolvedOrderId: postToolFlow.resolvedOrderId,
    policyContext: postToolFlow.policyContext,
    toolResults,
  };
}

