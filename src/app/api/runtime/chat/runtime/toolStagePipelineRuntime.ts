import { runPolicyStage } from "@/lib/policyEngine";
import { extractTemplateIds } from "./runtimeSupport";
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

export async function runToolStagePipeline(input: Record<string, any>) {
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
  const toolRuleIds = toolGate.matched.map((rule: any) => rule.id);
  usedRuleIds.push(...toolRuleIds);
  usedTemplateIds.push(...extractTemplateIds(toolGate.matched as any[]));
  const forcedCalls = toolGate.actions.forcedToolCalls || [];
  mcpCandidateCalls.splice(0, mcpCandidateCalls.length, ...forcedCalls.map((call: any) => String(call.name || "")).filter(Boolean));

  const denied = deniedOverride || new Set(toolGate.actions.denyTools || []);
  const allowed = new Set(toolGate.actions.allowTools || []);
  const canUseTool = createToolAccessEvaluator(denied, allowed);
  let finalCalls = filterForcedCallsByPolicy(
    forcedCalls as Array<{ name: string; args?: Record<string, unknown> }>,
    denied,
    allowed,
    noteMcpSkip
  ) as typeof forcedCalls;

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
    forcedCalls: forcedCalls as Array<{ name: string; args?: Record<string, unknown> }>,
    finalCalls: finalCalls as Array<{ name: string; args?: Record<string, unknown> }>,
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

  const toolResults: Array<{ name: string; ok: boolean; data?: Record<string, unknown>; error?: unknown }> =
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
  nextListOrdersChoices = toolExec.listOrdersChoices as Array<Record<string, unknown>>;

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
