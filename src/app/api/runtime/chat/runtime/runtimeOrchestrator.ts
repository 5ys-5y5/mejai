import { NextRequest } from "next/server";
import { runLlm } from "@/lib/llm_mk2";
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
  isLikelyAddressDetailOnly,
  isLikelyOrderId,
  isLikelyZipcode,
  isUuidLike,
  findRecentEntity,
  maskPhone,
  normalizePhoneDigits,
  readLookupOrderView,
} from "../shared/slotUtils";
import type { KbRow } from "../shared/types";
import {
  getRecentTurns,
  resolveProductDecision,
} from "../services/dataAccess";
import { insertEvent, insertFinalTurn, upsertDebugLog } from "../services/auditRuntime";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
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
  buildDebugPrefixJson,
  buildDefaultOrderRange,
  buildFailedPayload,
  extractTemplateIds,
  nowIso,
  pushRuntimeTimingStage,
  type RuntimeTimingStage,
} from "./runtimeSupport";
import { deriveExpectedInputFromAnswer, isRestockSubscribeStage as isRestockSubscribeStageContext } from "./intentRuntime";
import { handleOtpLifecycleAndOrderGate } from "./otpRuntime";
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
import { applyReplyStyle, resolveReplyStyleDirective } from "../policies/replyStyleRuntime";
import type { RuntimeContext } from "../shared/runtimeTypes";
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
  const readHeader = (name: string) => String(req.headers.get(name) || "").trim();
  const headerOrigin = readHeader("origin");
  const headerReferer = readHeader("referer");
  const headerHost = readHeader("host");
  const parseDomain = (value: string) => {
    if (!value) return "";
    try {
      return new URL(value).hostname || "";
    } catch {
      const cleaned = value.replace(/^https?:\/\//, "");
      return cleaned.split("/")[0] || "";
    }
  };
  const requestOrigin = headerOrigin || headerReferer || "";
  const requestDomain = parseDomain(requestOrigin) || parseDomain(headerHost);
  const requestMeta = {
    domain: requestDomain || null,
    origin: requestOrigin || null,
    widgetOrgIdPresent: Boolean(readHeader("x-widget-org-id")),
    widgetUserIdPresent: Boolean(readHeader("x-widget-user-id")),
    widgetAgentIdPresent: Boolean(readHeader("x-widget-agent-id")),
    widgetSecretPresent: Boolean(readHeader("x-widget-secret")),
  };
  const runtimeTraceId =
    String(req.headers.get("x-runtime-trace-id") || "").trim() ||
    `rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const runtimeTurnId =
    String(req.headers.get("x-runtime-turn-id") || "").trim() || crypto.randomUUID();
  const timingStages: RuntimeTimingStage[] = [];
  let RuntimeContextAny: RuntimeContext | null = null;
  let currentSessionId: string | null = null;
  let firstTurnInSession = false;
  let latestTurnId: string | null = null;
  let lastDebugPrefixJson: Record<string, any> | null = null;
  let auditMessage: string | null = null;
  let auditConversationMode: string | null = null;
  let auditIntent: string | null = null;
  let auditEntity: Record<string, any> = {};
  let pipelineStateForError: RuntimePipelineState | null = null;
  let lastStage = "bootstrap.start";
  const stageHistory: Array<{ stage: string; at: string }> = [];
  const runtimeCallChain: Array<{ module_path: string; function_name: string }> = [];
  const pushRuntimeCall = (modulePath: string, functionName: string) => {
    const module_path = String(modulePath || "").trim();
    const function_name = String(functionName || "").trim();
    if (!module_path || !function_name) return;
    const last = runtimeCallChain[runtimeCallChain.length - 1];
    if (last && last.module_path === module_path && last.function_name === function_name) return;
    runtimeCallChain.push({ module_path, function_name });
  };
  const markStage = (stage: string) => {
    const safeStage = String(stage || "").trim();
    if (!safeStage) return;
    lastStage = safeStage;
    stageHistory.push({ stage: safeStage, at: nowIso() });
    if (stageHistory.length > 12) stageHistory.shift();
  };
  const deriveScopeLevels = (stage: string) => {
    const safeStage = String(stage || "").trim() || "bootstrap.unknown";
    const parts = safeStage.split(".").filter(Boolean);
    const level5 = "runtime.chat";
    const level2 = parts[0] || "bootstrap";
    const level1 = parts.slice(0, 2).join(".") || safeStage;
    return { level5, level2, level1 };
  };
  const persistBootstrapFailure = async (input: {
    err: unknown;
    runtimeTraceId: string;
    runtimeTurnId: string;
    auditMessage: string | null;
    auditIntent: string | null;
    auditEntity: Record<string, any>;
    auditConversationMode: string | null;
    lastDebugPrefixJson: Record<string, any> | null;
    runtimeCallChain: Array<{ module_path: string; function_name: string }>;
    stageHistory: Array<{ stage: string; at: string }>;
    lastStage: string;
    sessionId: string | null;
    debugEnabled: boolean;
  }) => {
    const {
      err,
      runtimeTraceId,
      runtimeTurnId,
      auditMessage,
      auditIntent,
      auditEntity,
      auditConversationMode,
      lastDebugPrefixJson,
      runtimeCallChain,
      stageHistory: localStages,
      lastStage: localLastStage,
      sessionId,
      debugEnabled: debugFlag,
    } = input;
    const errorMessage = err instanceof Error ? err.message : String(err || "INTERNAL_ERROR");
    const errorStack = err instanceof Error ? err.stack || null : null;
    let admin;
    try {
      admin = createAdminSupabaseClient();
    } catch (error) {
      console.warn("[runtime/chat_mk2] bootstrap failure: admin supabase init failed", {
        trace_id: runtimeTraceId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    const auditContext = { supabase: admin, runtimeTraceId } as RuntimeContext;
    const scope = deriveScopeLevels(localLastStage);
    let resolvedSessionId = sessionId;
    if (!resolvedSessionId) {
      resolvedSessionId = crypto.randomUUID();
      try {
        await admin.from("D_conv_sessions").insert({
          id: resolvedSessionId,
          org_id: null,
          session_code: `err_${Math.random().toString(36).slice(2, 8)}`,
          started_at: nowIso(),
          channel: "runtime_error",
          metadata: {
            trace_id: runtimeTraceId,
            reason: "bootstrap_failure",
            last_stage: localLastStage,
          },
        });
      } catch (error) {
        console.warn("[runtime/chat_mk2] bootstrap failure: session insert failed", {
          trace_id: runtimeTraceId,
          session_id: resolvedSessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const resolvedTurnId = isUuidLike(runtimeTurnId) ? runtimeTurnId : crypto.randomUUID();
    const fallback = "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.";
    const failed = buildFailedPayload({
      code: "INTERNAL_ERROR",
      summary: errorMessage || "INTERNAL_ERROR",
      intent: auditIntent || undefined,
      stage: `runtime.chat.${scope.level2}`,
      retryable: true,
      detail: debugFlag ? { stack: errorStack } : undefined,
    });
    const messageSnippet = auditMessage ? String(auditMessage).slice(0, 200) : null;
    const errorPayloadBase = {
      code: "BOOTSTRAP_ERROR",
      summary: errorMessage || "INTERNAL_ERROR",
      stage: "runtime.chat.bootstrap",
      trace_id: runtimeTraceId,
      runtime_turn_id: runtimeTurnId,
      last_stage: localLastStage,
      scope,
      message_excerpt: messageSnippet,
      stage_history: localStages,
      error_stack: debugFlag ? errorStack : null,
    };
    await insertEvent(
      auditContext,
      resolvedSessionId,
      resolvedTurnId,
      "BOOTSTRAP_FAILURE_BEFORE_TURN_WRITE",
      { ...errorPayloadBase, point: "before_turn_write" },
      { trace_id: runtimeTraceId, stage: "bootstrap_failure" }
    );
    let persistedTurnId = resolvedTurnId;
    let persistedSeq: number | null = null;
    try {
      const { data, error } = await admin
        .from("D_conv_turns")
        .insert({
          id: resolvedTurnId,
          session_id: resolvedSessionId,
          seq: null,
          transcript_text: auditMessage || "",
          answer_text: fallback,
          final_answer: fallback,
          failed,
          bot_context: {
            intent_name: auditIntent || "general",
            entity: auditEntity || {},
            error_code: "BOOTSTRAP_ERROR",
            error_stage: localLastStage,
            trace_id: runtimeTraceId,
            runtime_turn_id: runtimeTurnId,
          },
        })
        .select("id, session_id, seq")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      if (data?.id) persistedTurnId = String(data.id);
      persistedSeq = data?.seq ? Number(data.seq) : null;
    } catch (error) {
      console.warn("[runtime/chat_mk2] bootstrap failure: turn insert failed", {
        trace_id: runtimeTraceId,
        session_id: resolvedSessionId,
        turn_id: resolvedTurnId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    const debugPrefix =
      lastDebugPrefixJson ||
      buildDebugPrefixJson({
        llmModel: null,
        mcpTools: [],
        mcpProviders: [],
        mcpLastFunction: "NO_TOOL_CALLED:BOOTSTRAP_ERROR",
        mcpLastStatus: "error",
        mcpLastError: errorMessage || "INTERNAL_ERROR",
        mcpLastCount: null,
        mcpLogs: [
          `bootstrap_error: ${errorMessage || "INTERNAL_ERROR"}`,
          `last_stage: ${localLastStage}`,
        ],
        providerAvailable: [],
        conversationMode: auditConversationMode || "mk2",
        runtimeCallChain,
      });
    try {
      await upsertDebugLog(auditContext, {
        sessionId: resolvedSessionId,
        turnId: persistedTurnId,
        seq: persistedSeq,
        prefixJson: debugPrefix,
      });
    } catch (error) {
      console.warn("[runtime/chat_mk2] bootstrap failure: debug log insert failed", {
        trace_id: runtimeTraceId,
        session_id: resolvedSessionId,
        turn_id: persistedTurnId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    await insertEvent(
      auditContext,
      resolvedSessionId,
      persistedTurnId,
      "BOOTSTRAP_FAILURE_AFTER_TURN_WRITE",
      { ...errorPayloadBase, point: "after_turn_write", turn_id: persistedTurnId },
      { trace_id: runtimeTraceId, stage: "bootstrap_failure" }
    );
    await insertEvent(
      auditContext,
      resolvedSessionId,
      persistedTurnId,
      "UNHANDLED_ERROR_CAUGHT",
      { ...errorPayloadBase, turn_id: persistedTurnId },
      { trace_id: runtimeTraceId, stage: "bootstrap_failure" }
    );
    return { sessionId: resolvedSessionId, turnId: persistedTurnId };
  };
  pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeOrchestrator.ts", "POST");
  markStage("bootstrap.start");
  const respond = createRuntimeResponder({
    runtimeTraceId,
    requestStartedAt,
    timingStages,
    quickReplyMax: CHAT_PRINCIPLES.response.quickReplyMax,
    getRuntimeContextAny: () => RuntimeContextAny,
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
        allowlistMeta,
        providerAvailable,
        providerConfig,
        runtimeFlags,
        authSettings,
      userPlan,
      userIsAdmin,
      userRole,
      userOrgId,
      sessionId,
      recentTurns,
      firstTurnInSession: firstInSession,
      lastTurn,
      nextSeq,
      prevBotContext,
    } = bootstrap.state;
    markStage("bootstrap.done");
    if (context && typeof context === "object") {
      const contextRecord = context as Record<string, any>;
      contextRecord.runtimeTraceId = runtimeTraceId;
      contextRecord.runtimeRequestStartedAt = new Date(requestStartedAt).toISOString();
      contextRecord.runtimeTurnId = runtimeTurnId;
    }
    const runtimeTemplateOverrides = resolveRuntimeTemplateOverridesFromPolicy(
      ((compiledPolicy as { templates?: Record<string, any> })?.templates || {}) as Record<string, any>
    );
    const effectivePrevBotContext = mergeRuntimeTemplateOverrides(
      (prevBotContext || {}) as Record<string, any>,
      runtimeTemplateOverrides
    );
    RuntimeContextAny = context;
    currentSessionId = sessionId;
    firstTurnInSession = firstInSession;
    latestTurnId = runtimeTurnId;
    auditMessage = message;
    auditConversationMode = conversationMode;
    pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeInitializationRuntime.ts", "initializeRuntimeState");
    const initialized = initializeRuntimeState({
      message,
      lastTurn,
      recentTurns,
      prevBotContext: effectivePrevBotContext as Record<string, any>,
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
    let expectedInputSource = initialized.expectedInputSource;
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
    const toolResults = initialized.toolResults;
    const deriveModelSelectionMeta = (model: string | null, userText: string) => {
      const length = String(userText || "").trim().length;
      if (!model) {
        return {
          reason: "deterministic_or_skipped",
          inputLength: length,
          lengthRuleHit: null,
          keywordRuleHit: null,
        };
      }
      const isMini =
        model.includes("mini") ||
        model.includes("flash-lite") ||
        model.includes("flash");
      if (length > 400) {
        return {
          reason: "length_rule",
          inputLength: length,
          lengthRuleHit: true,
          keywordRuleHit: false,
        };
      }
      if (!isMini) {
        return {
          reason: "keyword_rule",
          inputLength: length,
          lengthRuleHit: false,
          keywordRuleHit: true,
        };
      }
      return {
        reason: "short_default",
        inputLength: length,
        lengthRuleHit: false,
        keywordRuleHit: false,
      };
    };
    const computeExpectedToolNames = (intent: string) => {
      if (["order_change", "shipping_inquiry", "refund_request"].includes(intent)) {
        return [
          "send_otp",
          "verify_otp",
          ...CHAT_PRINCIPLES.safety.otpRequiredTools,
        ];
      }
      return [];
    };
    const computeIntentScopeMismatchReason = () => {
      const expected = slotDebug.expectedInput;
      if (!expected) return null;
      const derivedSlots: Record<string, string | null> = {
        order_id: derivedOrderId,
        phone: derivedPhone,
        zipcode: derivedZipcode,
        address: derivedAddress,
      };
      const expectedValue = derivedSlots[expected] || null;
      if (expectedValue) return null;
      const firstActual = Object.entries(derivedSlots).find(([, value]) => Boolean(value));
      if (!firstActual) return null;
      return `expected_input=${expected} but derived_${firstActual[0]}=${String(firstActual[1] || "")}`;
    };
    let activePolicyConflicts: Array<Record<string, any>> = [];
    const buildRuntimeSnapshot = (resolvedLlmModel: string | null, resolvedTools: string[]) => {
      const modelMeta = deriveModelSelectionMeta(resolvedLlmModel, message);
      const allowlistAllowedToolNames = Array.from(allowedToolNames);
      const allowlistResolvedToolIds = Array.from(new Set(Array.from(allowedToolIdByName.values())));
      const expectedTools = computeExpectedToolNames(resolvedIntent);
      const missingExpectedTools = expectedTools.filter((tool) => (allowedToolByName.get(tool)?.length || 0) === 0);
      return {
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
      agentId: agent.id || null,
      agentParentId: String((agent as Record<string, any>).parent_id || "").trim() || null,
      agentName: agent.name || null,
      agentType: String((agent as Record<string, any>).agent_type || "").trim() || null,
      agentVersion: String((agent as Record<string, any>).version || "").trim() || null,
      agentLlm: agent.llm || null,
      agentKbId: agent.kb_id || null,
      agentIsActive: typeof (agent as Record<string, any>).is_active === "boolean" ? (agent as Record<string, any>).is_active : null,
      agentResolvedFromParent: bootstrap.state.agentResolvedFromParent,
      agentMcpToolIdsRaw: Array.isArray(agent.mcp_tool_ids) ? agent.mcp_tool_ids.map((id: string) => String(id)) : [],
      kbId: kb.id,
      kbTitle: kb.title || null,
      kbVersion: (kb as Record<string, any>).version || null,
      kbIsAdmin: (kb as Record<string, any>).is_admin ?? null,
      kbAdminSummary: adminKbs.map((item) => ({
        id: String(item.id || ""),
        title: String((item as Record<string, any>).title || "") || null,
        version: String((item as Record<string, any>).version || "") || null,
        is_admin:
          typeof (item as Record<string, any>).is_admin === "boolean"
            ? (item as Record<string, any>).is_admin
            : null,
      })),
      widgetId: bootstrap.state.widgetContext?.widgetId || null,
      widgetName: bootstrap.state.widgetContext?.widgetName || null,
      widgetPublicKey: bootstrap.state.widgetContext?.widgetPublicKey || null,
      widgetAgentId: bootstrap.state.widgetContext?.widgetAgentId || null,
      widgetOrgId: bootstrap.state.widgetContext?.widgetOrgId || null,
      widgetAllowedDomains: bootstrap.state.widgetContext?.widgetAllowedDomains || [],
      widgetAllowedPaths: bootstrap.state.widgetContext?.widgetAllowedPaths || [],
      requestDomain: requestMeta.domain,
      requestOrigin: requestMeta.origin,
      requestWidgetOrgIdPresent: requestMeta.widgetOrgIdPresent,
      requestWidgetUserIdPresent: requestMeta.widgetUserIdPresent,
      requestWidgetAgentIdPresent: requestMeta.widgetAgentIdPresent,
      requestWidgetSecretPresent: requestMeta.widgetSecretPresent,
      userGroup: bootstrap.state.userGroup,
      kbAdminApplyGroups: bootstrap.state.adminKbFilterMeta.map((item) => ({ id: item.id, apply_groups: item.apply_groups })),
      kbAdminApplyGroupsMode: bootstrap.state.adminKbFilterMeta.map((item) => item.apply_groups_mode || null),
      kbAdminFilterReasons: bootstrap.state.adminKbFilterMeta.map((item) => item.reason),
      usedRuleIds,
      usedTemplateIds,
      usedToolPolicies,
      slotExpectedInput: slotDebug.expectedInput,
      slotExpectedInputPrev: typeof effectivePrevBotContext.expected_input === "string" ? String(effectivePrevBotContext.expected_input) : null,
      slotExpectedInputSource: expectedInputSource,
      slotOrderId: slotDebug.orderId,
      slotPhone: slotDebug.phone,
      slotPhoneMasked: maskPhone(slotDebug.phone),
      slotZipcode: slotDebug.zipcode,
      slotAddress: slotDebug.address,
      slotDerivedOrderId: derivedOrderId,
      slotDerivedPhone: derivedPhone,
      slotDerivedZipcode: derivedZipcode,
      slotDerivedAddress: derivedAddress,
      mcpCandidateCalls,
      mcpSkipped: mcpSkipLogs,
      policyInputRules: inputRuleIds,
      policyToolRules: toolRuleIds,
      contextContamination: contaminationSummaries,
      conversationMode,
      runtimeCallChain,
      templateOverrides: runtimeTemplateOverrides as Record<string, string>,
      modelSelectionReason: modelMeta.reason,
      modelSelectionInputLength: modelMeta.inputLength,
      modelSelectionLengthRuleHit: modelMeta.lengthRuleHit,
      modelSelectionKeywordRuleHit: modelMeta.keywordRuleHit,
      allowlistResolvedToolIds,
      allowlistAllowedToolNames,
      allowlistAllowedToolCount: allowlistAllowedToolNames.length,
      allowlistMissingExpectedTools: missingExpectedTools,
      allowlistRequestedToolCount: allowlistMeta?.requestedToolCount ?? null,
      allowlistValidToolCount: allowlistMeta?.validToolCount ?? null,
      allowlistProviderSelectionCount: allowlistMeta?.providerSelectionCount ?? null,
      allowlistProviderSelections: allowlistMeta?.providerSelections || [],
      allowlistToolsByIdCount: allowlistMeta?.toolsByIdCount ?? null,
      allowlistToolsByProviderCount: allowlistMeta?.toolsByProviderCount ?? null,
      allowlistResolvedToolCount: allowlistMeta?.resolvedToolCount ?? null,
      allowlistQueryErrorById: allowlistMeta?.queryErrorById ?? null,
      allowlistQueryErrorByProvider: allowlistMeta?.queryErrorByProvider ?? null,
      intentScopeMismatchReason: computeIntentScopeMismatchReason(),
      policyConflicts: activePolicyConflicts,
      policyConflictResolution: activePolicyConflicts.length > 0 ? "tool_stage_force_response_precedence" : null,
    };
    };
    const replyStyleDirective = resolveReplyStyleDirective({
      primaryKbContent: kb.content || "",
      adminKbContents: adminKbs.map((item) => item.content || ""),
    });
    const { makeReply, insertTurn } = createRuntimeConversationIo({
      context,
      insertFinalTurn,
      pendingIntentQueue,
      orgId: userOrgId || authContext.orgId || null,
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
      decorateReplyText: (text) => applyReplyStyle(text, replyStyleDirective),
    });
    const disambiguationInput: DisambiguationStepInput = {
      message,
      expectedInput,
      resolvedIntent,
    };
    markStage("intent_disambiguation.start");
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
    if (disambiguation.response) return disambiguation.response;
    const disambiguationOutput: DisambiguationStepOutput = {
      forcedIntentQueue: disambiguation.forcedIntentQueue,
      pendingIntentQueue: disambiguation.pendingIntentQueue,
      effectiveMessageForIntent: disambiguation.effectiveMessageForIntent,
    };
    forcedIntentQueue = disambiguationOutput.forcedIntentQueue;
    pendingIntentQueue = disambiguationOutput.pendingIntentQueue;
    pipelineState.forcedIntentQueue = forcedIntentQueue;
    pipelineState.pendingIntentQueue = pendingIntentQueue;
    const effectiveMessageForIntent = disambiguationOutput.effectiveMessageForIntent;
    const preTurnGuardInput: PreTurnGuardStepInput = {
      message,
      resolvedIntent,
      expectedInput,
      derivedPhone,
    };
    markStage("pre_turn_guard.start");
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
    if (preTurnGuards.response) return preTurnGuards.response;
    const preTurnGuardOutput: PreTurnGuardStepOutput = {
      derivedPhone: preTurnGuards.derivedPhone,
      expectedInput: preTurnGuards.expectedInput,
    };
    derivedPhone = preTurnGuardOutput.derivedPhone;
    expectedInput = preTurnGuardOutput.expectedInput;
    pipelineState.derivedPhone = derivedPhone;
    pipelineState.expectedInput = expectedInput;
    markStage("slot_derivation.start");
    pushRuntimeCall("src/app/api/runtime/chat/runtime/slotDerivationRuntime.ts", "deriveSlotsForTurn");
    const slotDerivation = await deriveSlotsForTurn({
      message,
      expectedInput,
      resolvedIntent,
      agentLlm: (agent.llm ?? null) as "chatgpt" | "gemini" | null,
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

    markStage("pending_state.start");
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
    if (pendingState.response) return pendingState.response;
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
    markStage("restock_pending.start");
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
    if (restockPending.response) return restockPending.response;
    resolvedIntent = restockPending.resolvedIntent;
    restockSubscribeAcceptedThisTurn = restockPending.restockSubscribeAcceptedThisTurn;
    lockIntentToRestockSubscribe = restockPending.lockIntentToRestockSubscribe;
    pipelineState.resolvedIntent = resolvedIntent;
    pipelineState.restockSubscribeAcceptedThisTurn = restockSubscribeAcceptedThisTurn;
    pipelineState.lockIntentToRestockSubscribe = lockIntentToRestockSubscribe;
    markStage("post_action.start");
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
    if (postActionStage.response) return postActionStage.response;
    markStage("context_resolution.start");
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
    auditEntity = (policyContext.entity || {}) as Record<string, any>;
    markStage("input_stage.start");
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
      prevBotContext: effectivePrevBotContext as Record<string, any>,
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
    activePolicyConflicts = inputStage.activePolicyConflicts as Array<Record<string, any>>;
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
      args?: Record<string, any>;
      detail?: Record<string, any>;
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
    markStage("mcp_ops.start");
    pushRuntimeCall("src/app/api/runtime/chat/runtime/runtimeMcpOpsRuntime.ts", "createRuntimeMcpOps");
    const { noteMcp, noteMcpSkip, flushMcpSkipLogs } = createRuntimeMcpOps({
      usedProviders,
      mcpSkipLogs,
      mcpSkipQueue,
      pipelineState,
      getResolvedIntent: () => resolvedIntent,
      getPolicyEntity: () => (policyContext.entity || {}) as Record<string, any>,
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
    auditEntity = (policyContext.entity || {}) as Record<string, any>;

    markStage("otp_gate.start");
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
    const otpVerifiedThisTurn = otpGateOutput.otpVerifiedThisTurn;
    const otpPending = otpGateOutput.otpPending;
    customerVerificationToken = otpGateOutput.customerVerificationToken;
    policyContext = otpGate.policyContext;
    auditEntity = otpGate.auditEntity;
    mcpCandidateCalls = otpGateOutput.mcpCandidateCalls;
    pipelineState.customerVerificationToken = customerVerificationToken;
    pipelineState.mcpCandidateCalls = mcpCandidateCalls;

    markStage("product_decision.start");
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
      auditEntity = (policyContext.entity || {}) as Record<string, any>;
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
    markStage("tool_stage.start");
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
    const finalCalls = toolStage.finalCalls as Array<{ name: string; args?: Record<string, any> }>;
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

    markStage("restock_handler.start");
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

    markStage("finalize.guard.start");
    pushRuntimeCall("src/app/api/runtime/chat/runtime/finalizeRuntime.ts", "handleGeneralNoPathGuard");
    const guarded = await handleGeneralNoPathGuard({
      resolvedIntent,
      finalCalls,
      allowed,
      kbId: kb.id,
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
      policyEntity: (policyContext.entity || {}) as Record<string, any>,
      productDecision: (productDecisionRes.decision || null) as Record<string, any> | null,
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

    markStage("finalize.run.start");
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
    if (!RuntimeContextAny || !currentSessionId) {
      const persisted = await persistBootstrapFailure({
        err,
        runtimeTraceId,
        runtimeTurnId,
        auditMessage,
        auditIntent,
        auditEntity,
        auditConversationMode,
        lastDebugPrefixJson,
        runtimeCallChain,
        stageHistory,
        lastStage,
        sessionId: currentSessionId,
        debugEnabled,
      });
      if (persisted?.sessionId) currentSessionId = persisted.sessionId;
      if (persisted?.turnId) latestTurnId = persisted.turnId;
    }
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
      RuntimeContextAny,
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


