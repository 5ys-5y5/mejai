import { NextRequest } from "next/server";
import { runLlm, type ChatMessage } from "@/lib/llm_mk2";
import {
  formatOutputDefault,
  runPolicyStage,
  validateToolArgs,
  type PolicyEvalContext,
} from "@/lib/policyEngine";
import {
  CHAT_PRINCIPLES,
  hasChoiceAnswerCandidates,
  hasUniqueAnswerCandidate,
  isOtpRequiredTool,
  requiresOtpForIntent,
} from "../policies/principles";
import {
  availableRestockLeadDays,
  detectIntent,
  detectIntentCandidates,
  extractRestockChannel,
  intentLabel,
  isAddressChangeUtterance,
  isEndConversationText,
  isExecutionAffirmativeText,
  isNoText,
  isOtherInquiryText,
  isRestockInquiry,
  isRestockSubscribe,
  isYesText,
  parseIndexedChoice,
  parseIndexedChoices,
  parseLeadDaysSelection,
  parseSatisfactionScore,
  toMoneyText,
  toOrderDateShort,
} from "../policies/intentSlotPolicy";
import {
  buildLookupOrderArgs,
  extractAddress,
  extractAddressDetail,
  extractChannel,
  extractChoiceIndex,
  extractOrderId,
  extractOtpCode,
  extractPhone,
  extractZipcode,
  isInvalidOrderIdError,
  isLikelyAddressDetailOnly,
  isLikelyOrderId,
  isLikelyZipcode,
  findRecentEntity,
  maskPhone,
  normalizeAddressText,
  normalizePhoneDigits,
  readLookupOrderView,
  splitAddressForUpdate,
} from "../shared/slotUtils";
import type { AgentRow, KbRow, ProductDecision } from "../shared/types";
import {
  getRecentTurns,
  resolveProductDecision,
} from "../services/dataAccess";
import { insertEvent, insertFinalTurn } from "../services/auditRuntime";
import {
  buildRestockFinalAnswerWithChoices,
  extractEntitiesWithLlm,
  findBestRestockEntryByProductName,
  isOrderChangeZipcodeTemplateText,
  normalizeOrderChangeAddressPrompt,
  normalizeKoreanMatchText,
  normalizeKoreanQueryToken,
  parseRestockEntriesFromContent,
  rankRestockEntries,
  readProductShape,
  stripRestockNoise,
  toRestockDueText,
} from "../policies/restockResponsePolicy";
import { callAddressSearchWithAudit, callMcpTool } from "../services/mcpRuntime";
import { handleRestockIntent } from "../handlers/restockHandler";
import {
  buildDebugPrefix,
  buildDebugPrefixJson,
  buildDefaultOrderRange,
  buildFailedPayload,
  extractTemplateIds,
  nowIso,
  pushRuntimeTimingStage,
  type DebugPayload,
  type RuntimeTimingStage,
} from "./runtimeSupport";
import { deriveExpectedInputFromAnswer, isRestockSubscribeStage as isRestockSubscribeStageContext } from "./intentRuntime";
import { handleOtpLifecycleAndOrderGate, readOtpState } from "./otpRuntime";
import { buildFinalLlmMessages, handleGeneralNoPathGuard, runFinalResponseFlow } from "./finalizeRuntime";
import { handleRuntimeError } from "./errorRuntime";
import { handlePostActionStage } from "./postActionRuntime";
import { resolveIntentDisambiguation } from "./intentDisambiguationRuntime";
import { handlePreTurnGuards } from "./preTurnGuardRuntime";
import { deriveSlotsForTurn } from "./slotDerivationRuntime";
import { handleAddressChangeRefundPending } from "./pendingStateRuntime";
import { handleRestockPendingStage } from "./restockPendingRuntime";
import { resolveIntentAndPolicyContext } from "./contextResolutionRuntime";
import { bootstrapRuntime } from "./runtimeBootstrap";
import { type RuntimePipelineState } from "./runtimePipelineState";
import { runToolStagePipeline } from "./toolStagePipelineRuntime";
import { createRuntimeConversationIo } from "./runtimeConversationIoRuntime";
import { createRuntimeMcpOps } from "./runtimeMcpOpsRuntime";
import { runInputStageRuntime } from "./runtimeInputStageRuntime";
import { initializeRuntimeState } from "./runtimeInitializationRuntime";
import { createRuntimeResponder } from "../presentation/ui-runtimeResponseRuntime";
import { mergeRuntimeTemplateOverrides, resolveRuntimeTemplateOverridesFromPolicy } from "./promptTemplateRuntime";
import type {
  DisambiguationStepInput,
  DisambiguationStepOutput,
  OtpGateStepOutput,
  PreTurnGuardStepInput,
  PreTurnGuardStepOutput,
  SlotDerivationStepOutput,
} from "./runtimeStepContracts";

const EXECUTION_GUARD_RULES = {
  updateAddress: {
    missingZipcodeCode: "MISSING_ZIPCODE",
    askZipcodePrompt: "배송지 변경을 위해 우편번호(5자리)를 알려주세요.",
    fallbackTicketMessage:
      "배송지 변경 자동 처리에 실패하여 상담 요청을 접수했습니다. 담당자가 확인 후 안내드릴게요.",
    fallbackRetryMessage: "배송지 변경 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
  },
} as const;


export async function POST(req: NextRequest) {
  const debugEnabled = process.env.DEBUG_RUNTIME_CHAT === "1" || process.env.NODE_ENV !== "production";
  const requestStartedAt = Date.now();
  const runtimeTraceId =
    String(req.headers.get("x-runtime-trace-id") || "").trim() ||
    `rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const timingStages: RuntimeTimingStage[] = [];
  let runtimeContext: any = null;
  let currentSessionId: string | null = null;
  let firstTurnInSession = false;
  let latestTurnId: string | null = null;
  let lastDebugPrefixJson: Record<string, unknown> | null = null;
  let auditMessage: string | null = null;
  let auditConversationMode: string | null = null;
  let auditIntent: string | null = null;
  let auditEntity: Record<string, unknown> = {};
  let pipelineStateForError: RuntimePipelineState | null = null;
  const runtimeCallChain: Array<{ module_path: string; function_name: string }> = [];
  const pushRuntimeCall = (modulePath: string, functionName: string) => {
    const module_path = String(modulePath || "").trim();
    const function_name = String(functionName || "").trim();
    if (!module_path || !function_name) return;
    const last = runtimeCallChain[runtimeCallChain.length - 1];
    if (last && last.module_path === module_path && last.function_name === function_name) return;
    runtimeCallChain.push({ module_path, function_name });
  };
  pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts", "POST");
  const respond = createRuntimeResponder({
    runtimeTraceId,
    requestStartedAt,
    timingStages,
    quickReplyMax: CHAT_PRINCIPLES.response.quickReplyMax,
    getRuntimeContext: () => runtimeContext,
    getCurrentSessionId: () => currentSessionId,
    getLatestTurnId: () => latestTurnId,
    getFirstTurnInSession: () => firstTurnInSession,
  });
  try {
    pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeBootstrap.ts", "bootstrapRuntime");
    const bootstrap = await bootstrapRuntime({
      req,
      debugEnabled,
      timingStages,
      respond,
    });
    if (bootstrap.response) return bootstrap.response;
    const {
      context,
      authContext,
      body,
      agent,
      message,
      conversationMode,
      kb,
      adminKbs,
      compiledPolicy,
      allowedToolNames,
      allowedToolIdByName,
      allowedToolVersionByName,
        allowedToolByName,
        allowedTools,
        providerAvailable,
        providerConfig,
        runtimeFlags,
        authSettings,
      userPlan,
      userIsAdmin,
      userRole,
      userOrgId,
      sessionId,
      reusedSession,
      recentTurns,
      firstTurnInSession: firstInSession,
      lastTurn,
      nextSeq,
      prevBotContext,
    } = bootstrap.state;
    const runtimeTemplateOverrides = resolveRuntimeTemplateOverridesFromPolicy((compiledPolicy as any)?.templates || {});
    const effectivePrevBotContext = mergeRuntimeTemplateOverrides(
      (prevBotContext || {}) as Record<string, unknown>,
      runtimeTemplateOverrides
    );
    runtimeContext = context;
    currentSessionId = sessionId;
    firstTurnInSession = firstInSession;
    auditMessage = message;
    auditConversationMode = conversationMode;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts", "initializeRuntimeState");
    const initialized = initializeRuntimeState({
      message,
      lastTurn,
      recentTurns,
      prevBotContext: effectivePrevBotContext as Record<string, unknown>,
      allowedToolByName,
      extractOrderId,
      extractPhone,
      extractZipcode,
      extractAddress,
      extractChannel,
      findRecentEntity,
      isRestockSubscribeStageContext,
      deriveExpectedInputFromAnswer,
      isRestockInquiry,
      isRestockSubscribe,
    });
    const hasAllowedToolName = initialized.hasAllowedToolName;
    const prevIntent = initialized.prevIntent;
    let resolvedIntent = initialized.resolvedIntent;
    const prevEntity = initialized.prevEntity;
    const prevSelectedOrderId = initialized.prevSelectedOrderId;
    const prevChoices = initialized.prevChoices;
    const prevOrderIdFromTranscript = initialized.prevOrderIdFromTranscript;
    const prevPhoneFromTranscript = initialized.prevPhoneFromTranscript;
    const prevZipFromTranscript = initialized.prevZipFromTranscript;
    const prevAddressFromTranscript = initialized.prevAddressFromTranscript;
    const recentEntity = initialized.recentEntity;
    const pipelineState = initialized.pipelineState;
    const derivedChannel = initialized.derivedChannel;
    pipelineStateForError = pipelineState;
    let expectedInput = initialized.expectedInput;
    let customerVerificationToken = initialized.customerVerificationToken;
    let derivedOrderId = initialized.derivedOrderId;
    let derivedPhone = initialized.derivedPhone;
    let derivedZipcode = initialized.derivedZipcode;
    let derivedAddress = initialized.derivedAddress;
    let updateConfirmAcceptedThisTurn = initialized.updateConfirmAcceptedThisTurn;
    let refundConfirmAcceptedThisTurn = initialized.refundConfirmAcceptedThisTurn;
    let restockSubscribeAcceptedThisTurn = initialized.restockSubscribeAcceptedThisTurn;
    let lockIntentToRestockSubscribe = initialized.lockIntentToRestockSubscribe;
    let forcedIntentQueue = initialized.forcedIntentQueue;
    let pendingIntentQueue = initialized.pendingIntentQueue;
    let slotDebug = initialized.slotDebug;
    let usedRuleIds = initialized.usedRuleIds;
    let usedTemplateIds = initialized.usedTemplateIds;
    let inputRuleIds = initialized.inputRuleIds;
    let toolRuleIds = initialized.toolRuleIds;
    let usedToolPolicies = initialized.usedToolPolicies;
    let usedProviders = initialized.usedProviders;
    let mcpActions = initialized.mcpActions;
    let mcpCandidateCalls = initialized.mcpCandidateCalls;
    let mcpSkipLogs = initialized.mcpSkipLogs;
    let mcpSkipQueue = initialized.mcpSkipQueue;
    let lastMcpFunction = initialized.lastMcpFunction;
    let lastMcpStatus = initialized.lastMcpStatus;
    let lastMcpError = initialized.lastMcpError;
    let lastMcpCount = initialized.lastMcpCount;
    let contaminationSummaries = initialized.contaminationSummaries;
    let toolResults = initialized.toolResults;
    const buildRuntimeSnapshot = (resolvedLlmModel: string | null, resolvedTools: string[]) => ({
      llmModel: resolvedLlmModel,
      mcpTools: resolvedTools.length > 0 ? resolvedTools : mcpActions,
      mcpProviders: usedProviders,
      mcpLastFunction: lastMcpFunction,
      mcpLastStatus: lastMcpStatus,
      mcpLastError: lastMcpError,
      mcpLastCount: lastMcpCount,
      mcpLogs: mcpSkipLogs,
      providerConfig: usedProviders.includes("cafe24") ? providerConfig : {},
      providerAvailable,
      authSettingsId: authSettings?.id || null,
      userId: authContext.user.id,
      orgId: userOrgId || authContext.orgId,
      userPlan,
      userIsAdmin,
      userRole,
      kbUserId: kb.id,
      kbAdminIds: adminKbs.map((item) => item.id),
      usedRuleIds,
      usedTemplateIds,
      usedToolPolicies,
      slotExpectedInput: slotDebug.expectedInput,
      slotOrderId: slotDebug.orderId,
      slotPhone: slotDebug.phone,
      slotPhoneMasked: maskPhone(slotDebug.phone),
      slotZipcode: slotDebug.zipcode,
      slotAddress: slotDebug.address,
      mcpCandidateCalls,
      mcpSkipped: mcpSkipLogs,
      policyInputRules: inputRuleIds,
      policyToolRules: toolRuleIds,
      contextContamination: contaminationSummaries,
      conversationMode,
      runtimeCallChain,
      templateOverrides: runtimeTemplateOverrides as Record<string, string>,
    });
    const { makeReply, insertTurn } = createRuntimeConversationIo({
      context,
      insertFinalTurn,
      pendingIntentQueue,
      getSnapshot: buildRuntimeSnapshot,
      getFallbackSnapshot: () => buildRuntimeSnapshot(null, []),
      getToolResults: () => toolResults,
      getMcpSkipLogs: () => mcpSkipLogs,
      buildDebugPrefixJson,
      getLastDebugPrefixJson: () => lastDebugPrefixJson,
      setLastDebugPrefixJson: (next) => {
        lastDebugPrefixJson = next;
      },
      setLatestTurnId: (id) => {
        latestTurnId = id;
      },
    });
    const disambiguationInput: DisambiguationStepInput = {
      message,
      expectedInput,
      resolvedIntent,
    };
    pushRuntimeCall("src/app/api/runtime/chat/runtime/intentDisambiguationRuntime.ts", "resolveIntentDisambiguation");
    const disambiguation = await resolveIntentDisambiguation({
      context,
      sessionId,
      nextSeq,
      message: disambiguationInput.message,
      prevIntent,
      prevEntity,
      prevBotContext: effectivePrevBotContext,
      expectedInput: disambiguationInput.expectedInput,
      latestTurnId,
      resolvedIntent: disambiguationInput.resolvedIntent,
      detectIntentCandidates,
      hasChoiceAnswerCandidates,
      intentLabel,
      parseIndexedChoices,
      isYesText,
      makeReply,
      insertTurn,
      insertEvent,
      respond,
    });
    if (disambiguation.response) return disambiguation.response as any;
    const disambiguationOutput: DisambiguationStepOutput = {
      forcedIntentQueue: disambiguation.forcedIntentQueue,
      pendingIntentQueue: disambiguation.pendingIntentQueue,
      effectiveMessageForIntent: disambiguation.effectiveMessageForIntent,
    };
    forcedIntentQueue = disambiguationOutput.forcedIntentQueue;
    pendingIntentQueue = disambiguationOutput.pendingIntentQueue;
    pipelineState.forcedIntentQueue = forcedIntentQueue;
    pipelineState.pendingIntentQueue = pendingIntentQueue;
    const intentDisambiguationSourceText = disambiguation.intentDisambiguationSourceText;
    let effectiveMessageForIntent = disambiguationOutput.effectiveMessageForIntent;
    const preTurnGuardInput: PreTurnGuardStepInput = {
      message,
      resolvedIntent,
      expectedInput,
      derivedPhone,
    };
    pushRuntimeCall("src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts", "handlePreTurnGuards");
    const preTurnGuards = await handlePreTurnGuards({
      context,
      prevBotContext: effectivePrevBotContext,
      resolvedIntent: preTurnGuardInput.resolvedIntent,
      prevEntity,
      prevSelectedOrderId,
      message: preTurnGuardInput.message,
      sessionId,
      nextSeq,
      latestTurnId,
      derivedPhone: preTurnGuardInput.derivedPhone,
      expectedInput: preTurnGuardInput.expectedInput,
      normalizePhoneDigits,
      isYesText,
      isNoText,
      maskPhone,
      makeReply,
      insertTurn,
      insertEvent,
      respond,
    });
    if (preTurnGuards.response) return preTurnGuards.response as any;
    const preTurnGuardOutput: PreTurnGuardStepOutput = {
      derivedPhone: preTurnGuards.derivedPhone,
      expectedInput: preTurnGuards.expectedInput,
    };
    derivedPhone = preTurnGuardOutput.derivedPhone;
    expectedInput = preTurnGuardOutput.expectedInput;
    pipelineState.derivedPhone = derivedPhone;
    pipelineState.expectedInput = expectedInput;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts", "deriveSlotsForTurn");
    const slotDerivation = await deriveSlotsForTurn({
      message,
      expectedInput,
      resolvedIntent,
      agentLlm: agent.llm,
      timingStages,
      pushRuntimeTimingStage,
      derivedOrderId,
      derivedPhone,
      derivedZipcode,
      derivedAddress,
      extractOrderId,
      extractPhone,
      extractZipcode,
      extractAddress,
      extractAddressDetail,
      isLikelyAddressDetailOnly,
      extractEntitiesWithLlm,
      detectIntent,
    });
    const slotDerivationOutput: SlotDerivationStepOutput = {
      derivedOrderId: slotDerivation.derivedOrderId,
      derivedPhone: slotDerivation.derivedPhone,
      derivedZipcode: slotDerivation.derivedZipcode,
      derivedAddress: slotDerivation.derivedAddress,
      resolvedIntent: slotDerivation.resolvedIntent,
    };
    derivedOrderId = slotDerivationOutput.derivedOrderId;
    derivedPhone = slotDerivationOutput.derivedPhone;
    derivedZipcode = slotDerivationOutput.derivedZipcode;
    derivedAddress = slotDerivationOutput.derivedAddress;
    resolvedIntent = slotDerivationOutput.resolvedIntent;
    pipelineState.derivedOrderId = derivedOrderId;
    pipelineState.derivedPhone = derivedPhone;
    pipelineState.derivedZipcode = derivedZipcode;
    pipelineState.derivedAddress = derivedAddress;
    pipelineState.resolvedIntent = resolvedIntent;

    pushRuntimeCall("src/app/api/runtime/chat/runtime/pendingStateRuntime.ts", "handleAddressChangeRefundPending");
    const pendingState = await handleAddressChangeRefundPending({
      context,
      prevBotContext: effectivePrevBotContext,
      resolvedIntent,
      prevEntity,
      prevSelectedOrderId,
      message,
      sessionId,
      nextSeq,
      latestTurnId,
      derivedOrderId,
      derivedZipcode,
      derivedAddress,
      updateConfirmAcceptedThisTurn,
      refundConfirmAcceptedThisTurn,
      callAddressSearchWithAudit,
      extractZipcode,
      extractAddress,
      extractAddressDetail,
      isLikelyAddressDetailOnly,
      isLikelyOrderId,
      isLikelyZipcode,
      isYesText,
      isNoText,
      makeReply,
      insertTurn,
      insertEvent,
      respond,
    });
    if (pendingState.response) return pendingState.response as any;
    derivedOrderId = pendingState.derivedOrderId;
    derivedZipcode = pendingState.derivedZipcode;
    derivedAddress = pendingState.derivedAddress;
    updateConfirmAcceptedThisTurn = pendingState.updateConfirmAcceptedThisTurn;
    refundConfirmAcceptedThisTurn = pendingState.refundConfirmAcceptedThisTurn;
    pipelineState.derivedOrderId = derivedOrderId;
    pipelineState.derivedZipcode = derivedZipcode;
    pipelineState.derivedAddress = derivedAddress;
    pipelineState.updateConfirmAcceptedThisTurn = updateConfirmAcceptedThisTurn;
    pipelineState.refundConfirmAcceptedThisTurn = refundConfirmAcceptedThisTurn;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/restockPendingRuntime.ts", "handleRestockPendingStage");
    const restockPending = await handleRestockPendingStage({
      context,
      prevBotContext: effectivePrevBotContext,
      resolvedIntent,
      prevEntity,
      prevSelectedOrderId,
      message,
      sessionId,
      nextSeq,
      latestTurnId,
      restockSubscribeAcceptedThisTurn,
      lockIntentToRestockSubscribe,
      parseLeadDaysSelection,
      normalizePhoneDigits,
      extractPhone,
      maskPhone,
      isEndConversationText,
      isNoText,
      isYesText,
      isExecutionAffirmativeText,
      isRestockSubscribe,
      makeReply,
      insertTurn,
      insertEvent,
      respond,
    });
    if (restockPending.response) return restockPending.response as any;
    resolvedIntent = restockPending.resolvedIntent;
    restockSubscribeAcceptedThisTurn = restockPending.restockSubscribeAcceptedThisTurn;
    lockIntentToRestockSubscribe = restockPending.lockIntentToRestockSubscribe;
    pipelineState.resolvedIntent = resolvedIntent;
    pipelineState.restockSubscribeAcceptedThisTurn = restockSubscribeAcceptedThisTurn;
    pipelineState.lockIntentToRestockSubscribe = lockIntentToRestockSubscribe;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/postActionRuntime.ts", "handlePostActionStage");
    const postActionStage = await handlePostActionStage({
      context,
      prevBotContext: effectivePrevBotContext,
      resolvedIntent,
      prevEntity,
      message,
      sessionId,
      nextSeq,
      mcpActions,
      parseSatisfactionScore,
      isEndConversationText,
      isOtherInquiryText,
      isYesText,
      makeReply,
      insertTurn,
      respond,
    });
    if (postActionStage.response) return postActionStage.response as any;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts", "resolveIntentAndPolicyContext");
    const resolvedContext = await resolveIntentAndPolicyContext({
      context,
      sessionId,
      latestTurnId,
      message,
      expectedInput,
      forcedIntentQueue,
      lockIntentToRestockSubscribe,
      prevIntent,
      prevEntity,
      prevBotContext: effectivePrevBotContext,
      prevSelectedOrderId,
      prevOrderIdFromTranscript,
      prevPhoneFromTranscript,
      prevAddressFromTranscript,
      prevZipFromTranscript,
      recentEntity: (recentEntity || null) as Record<string, string | null> | null,
      prevChoices,
      derivedChannel,
      derivedOrderId,
      derivedPhone,
      derivedAddress,
      derivedZipcode,
      detectIntent,
      extractChoiceIndex,
      isLikelyOrderId,
      isLikelyZipcode,
      isAddressChangeUtterance,
      isYesText,
      isNoText,
      insertEvent,
      resolvedIntent,
    });
    let resolvedOrderId = resolvedContext.resolvedOrderId;
    pipelineState.resolvedOrderId = resolvedOrderId;
    resolvedIntent = resolvedContext.resolvedIntent;
    pipelineState.resolvedIntent = resolvedIntent;
    let policyContext: PolicyEvalContext = resolvedContext.policyContext;
    auditIntent = resolvedIntent;
    auditEntity = (policyContext.entity || {}) as Record<string, unknown>;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeInputStageRuntime.ts", "runInputStageRuntime");
    const inputStage = await runInputStageRuntime({
      compiledPolicy,
      resolvedContext: {
        contaminationSummaries: resolvedContext.contaminationSummaries,
        detectedIntent: resolvedContext.detectedIntent,
        hasAddressSignal: resolvedContext.hasAddressSignal,
        resolvedOrderId,
        resolvedIntent,
        policyContext,
      },
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
    });
    if (inputStage.response) return inputStage.response;
    resolvedIntent = inputStage.resolvedIntent as string;
    resolvedOrderId = (inputStage.resolvedOrderId as string | null) || null;
    policyContext = inputStage.policyContext as PolicyEvalContext;
    const activePolicyConflicts = inputStage.activePolicyConflicts as any[];
    usedRuleIds = inputStage.usedRuleIds as string[];
    usedTemplateIds = inputStage.usedTemplateIds as string[];
    inputRuleIds = inputStage.inputRuleIds as string[];
    toolRuleIds = inputStage.toolRuleIds as string[];
    usedToolPolicies = inputStage.usedToolPolicies as string[];
    usedProviders = inputStage.usedProviders as string[];
    mcpActions = inputStage.mcpActions as string[];
    mcpCandidateCalls = inputStage.mcpCandidateCalls as string[];
    mcpSkipLogs = inputStage.mcpSkipLogs as string[];
    mcpSkipQueue = inputStage.mcpSkipQueue as Array<{
      tool: string;
      reason: string;
      args?: Record<string, unknown>;
      detail?: Record<string, unknown>;
    }>;
    slotDebug = inputStage.slotDebug as typeof slotDebug;
    contaminationSummaries = inputStage.contaminationSummaries as string[];
    const noteContamination = inputStage.noteContamination as (info: {
      slot: string;
      reason: string;
      action: string;
      candidate?: string | null;
    }) => void;
    pipelineState.resolvedIntent = resolvedIntent;
    pipelineState.resolvedOrderId = resolvedOrderId;
    pipelineState.usedRuleIds = usedRuleIds;
    pipelineState.usedTemplateIds = usedTemplateIds;
    pipelineState.inputRuleIds = inputRuleIds;
    pipelineState.toolRuleIds = toolRuleIds;
    pipelineState.usedToolPolicies = usedToolPolicies;
    pipelineState.usedProviders = usedProviders;
    pipelineState.mcpActions = mcpActions;
    pipelineState.mcpCandidateCalls = mcpCandidateCalls;
    pipelineState.mcpSkipLogs = mcpSkipLogs;
    pipelineState.mcpSkipQueue = mcpSkipQueue;
    pipelineState.contaminationSummaries = contaminationSummaries;
    lastMcpFunction = null;
    lastMcpStatus = null;
    lastMcpError = null;
    lastMcpCount = null;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts", "createRuntimeMcpOps");
    const { noteMcp, noteMcpSkip, flushMcpSkipLogs } = createRuntimeMcpOps({
      usedProviders,
      mcpSkipLogs,
      mcpSkipQueue,
      pipelineState,
      getResolvedIntent: () => resolvedIntent,
      getPolicyEntity: () => (policyContext.entity || {}) as Record<string, unknown>,
      setTracking: (next) => {
        lastMcpFunction = next.lastMcpFunction;
        lastMcpStatus = next.lastMcpStatus;
        lastMcpError = next.lastMcpError;
        lastMcpCount = next.lastMcpCount;
        pipelineState.lastMcpFunction = lastMcpFunction;
        pipelineState.lastMcpStatus = lastMcpStatus;
        pipelineState.lastMcpError = lastMcpError;
        pipelineState.lastMcpCount = lastMcpCount;
      },
      insertEvent,
      context,
      sessionId,
      getLatestTurnId: () => latestTurnId,
      allowedToolIdByName,
      allowedToolVersionByName,
      nowIso,
    });
    auditIntent = resolvedIntent;
    auditEntity = (policyContext.entity || {}) as Record<string, unknown>;

    pushRuntimeCall("src/app/api/runtime/chat/runtime/otpRuntime.ts", "handleOtpLifecycleAndOrderGate");
    const otpGate = await handleOtpLifecycleAndOrderGate({
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
      prevBotContext: effectivePrevBotContext,
      derivedPhone,
      prevPhoneFromTranscript,
      customerVerificationToken,
      policyContext,
      auditEntity,
      mcpCandidateCalls,
    });
    if (otpGate.response) return otpGate.response;
    const otpGateOutput: OtpGateStepOutput = {
      otpVerifiedThisTurn: otpGate.otpVerifiedThisTurn,
      otpPending: otpGate.otpPending,
      customerVerificationToken: otpGate.customerVerificationToken,
      mcpCandidateCalls: otpGate.mcpCandidateCalls,
    };
    let otpVerifiedThisTurn = otpGateOutput.otpVerifiedThisTurn;
    const otpPending = otpGateOutput.otpPending;
    customerVerificationToken = otpGateOutput.customerVerificationToken;
    policyContext = otpGate.policyContext;
    auditEntity = otpGate.auditEntity;
    mcpCandidateCalls = otpGateOutput.mcpCandidateCalls;
    pipelineState.customerVerificationToken = customerVerificationToken;
    pipelineState.mcpCandidateCalls = mcpCandidateCalls;

    pushRuntimeCall("src/app/api/runtime/chat/services/dataAccess.ts", "resolveProductDecision");
    const productDecisionRes = await resolveProductDecision(context, message);
    if (productDecisionRes.decision) {
      const decision = productDecisionRes.decision;
      policyContext = {
        ...policyContext,
        product: {
          id: decision.product_id,
          answerable: decision.answerability === "ALLOW",
          restock_known: decision.restock_policy !== "UNKNOWN",
          restock_policy: decision.restock_policy,
          restock_at: decision.restock_at ?? null,
        },
      };
      auditEntity = (policyContext.entity || {}) as Record<string, unknown>;
    }

    let listOrdersCalled = false;
    let listOrdersEmpty = false;
    let listOrdersChoices: Array<{
      index: number;
      order_id: string;
      order_date?: string;
      order_date_short?: string;
      product_name?: string;
      option_name?: string;
      quantity?: string;
      price?: string;
      label?: string;
    }> = [];
    let mcpSummary = "";
    pushRuntimeCall("src/app/api/runtime/chat/runtime/toolStagePipelineRuntime.ts", "runToolStagePipeline");
    const toolStage = await runToolStagePipeline({
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
      toolResults,
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
      listOrdersCalled,
      listOrdersEmpty,
      listOrdersChoices,
      executionGuardRules: EXECUTION_GUARD_RULES,
      refundConfirmAcceptedThisTurn,
      mcpSummary,
      hasUniqueAnswerCandidate,
      hasChoiceAnswerCandidates,
      normalizePhoneDigits,
      callAddressSearchWithAudit,
      requiresOtpForIntent,
      isOtpRequiredTool,
    });
    if (toolStage.response) return toolStage.response;
    toolRuleIds = toolStage.toolRuleIds as string[];
    usedRuleIds = toolStage.usedRuleIds as string[];
    usedTemplateIds = toolStage.usedTemplateIds as string[];
    usedToolPolicies = toolStage.usedToolPolicies as string[];
    mcpCandidateCalls = toolStage.mcpCandidateCalls as string[];
    const finalCalls = toolStage.finalCalls as Array<{ name: string; args?: Record<string, unknown> }>;
    const allowed = toolStage.allowed as Set<string>;
    const canUseTool = toolStage.canUseTool as (name: string) => boolean;
    mcpSummary = toolStage.mcpSummary as string;
    listOrdersCalled = Boolean(toolStage.listOrdersCalled);
    listOrdersEmpty = Boolean(toolStage.listOrdersEmpty);
    listOrdersChoices = toolStage.listOrdersChoices as typeof listOrdersChoices;
    resolvedOrderId = (toolStage.resolvedOrderId as string | null) || null;
    policyContext = toolStage.policyContext as PolicyEvalContext;
    pipelineState.customerVerificationToken = customerVerificationToken;
    pipelineState.resolvedOrderId = resolvedOrderId;
    pipelineState.mcpActions = mcpActions;

    pushRuntimeCall("src/app/api/runtime/chat/handlers/restockHandler.ts", "handleRestockIntent");
    const restockHandled = await handleRestockIntent({
      resolvedIntent,
      kb,
      adminKbs,
      prevBotContext: effectivePrevBotContext,
      message,
      effectiveMessageForIntent,
      productDecisionRes,
      customerVerificationToken,
      mcpActions,
      context,
      sessionId,
      latestTurnId,
      policyContext,
      nextSeq,
      insertTurn,
      insertEvent,
      respond,
      makeReply,
      parseRestockEntriesFromContent,
      parseIndexedChoice,
      toRestockDueText,
      buildRestockFinalAnswerWithChoices,
      rankRestockEntries,
      normalizeKoreanQueryToken,
      normalizeKoreanMatchText,
      stripRestockNoise,
      hasChoiceAnswerCandidates,
      CHAT_PRINCIPLES,
      canUseTool,
      hasAllowedToolName,
      callMcpTool,
      noteMcp,
      toolResults,
      readProductShape,
      findBestRestockEntryByProductName,
      hasUniqueAnswerCandidate,
      buildFailedPayload,
      availableRestockLeadDays,
      normalizePhoneDigits,
      restockSubscribeAcceptedThisTurn,
      lockIntentToRestockSubscribe,
      allowedTools,
      providerConfig,
      extractRestockChannel,
      allowRestockLite: Boolean(runtimeFlags?.restock_lite),
    });
    if (restockHandled) return restockHandled;

    pushRuntimeCall("src/app/api/runtime/chat/runtime/finalizeRuntime.ts", "handleGeneralNoPathGuard");
    const guarded = await handleGeneralNoPathGuard({
      resolvedIntent,
      finalCalls,
      allowed,
      kbKind: (kb as KbRow).kb_kind || null,
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
    });
    if (guarded) return guarded;

    const { messages } = buildFinalLlmMessages({
      message,
      resolvedIntent,
      derivedChannel,
      resolvedOrderId,
      policyEntity: (policyContext.entity || {}) as Record<string, unknown>,
      productDecision: (productDecisionRes.decision || null) as Record<string, unknown> | null,
      kb: { title: kb.title, content: kb.content || null },
      adminKbs: adminKbs.map((item) => ({ title: item.title, content: item.content || null })),
      mcpSummary,
      recentTurns: recentTurns.map((turn) => ({
        transcript_text: turn.transcript_text,
        final_answer: turn.final_answer,
        answer_text: turn.answer_text,
      })),
    });
    pipelineState.resolvedIntent = resolvedIntent;
    pipelineState.resolvedOrderId = resolvedOrderId;
    pipelineState.customerVerificationToken = customerVerificationToken;
    pipelineState.mcpActions = mcpActions;
    pipelineState.usedRuleIds = usedRuleIds;
    pipelineState.usedTemplateIds = usedTemplateIds;
    pipelineState.inputRuleIds = inputRuleIds;
    pipelineState.toolRuleIds = toolRuleIds;
    pipelineState.usedToolPolicies = usedToolPolicies;
    pipelineState.usedProviders = usedProviders;
    pipelineState.mcpCandidateCalls = mcpCandidateCalls;
    pipelineState.mcpSkipLogs = mcpSkipLogs;
    pipelineState.mcpSkipQueue = mcpSkipQueue;

    pushRuntimeCall("src/app/api/runtime/chat/runtime/finalizeRuntime.ts", "runFinalResponseFlow");
    return runFinalResponseFlow({
      runLlm,
      agentLlm: agent.llm,
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
    });
  } catch (err) {
    if (!auditIntent && pipelineStateForError) {
      auditIntent = pipelineStateForError.resolvedIntent || "general";
    }
    const runtimeError = await handleRuntimeError({
      err,
      debugEnabled,
      buildFailedPayload,
      auditIntent,
      auditEntity,
      auditConversationMode,
      runtimeContext,
      currentSessionId,
      latestTurnId,
      insertEvent,
      getRecentTurns,
      lastDebugPrefixJson,
      buildDebugPrefixJson,
      insertFinalTurn,
      auditMessage,
      respond,
    });
    latestTurnId = runtimeError.latestTurnId;
    return runtimeError.response;
  }
}
