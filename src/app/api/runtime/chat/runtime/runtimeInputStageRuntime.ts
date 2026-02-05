import { runPolicyStage, type PolicyEvalContext } from "@/lib/policyEngine";
import { extractTemplateIds } from "./runtimeSupport";
import {
  emitPolicyStaticConflict,
  emitSlotExtracted,
  handleInputForcedResponse,
  reconcileIntentFromInputGate,
} from "./policyInputRuntime";

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
  });

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
