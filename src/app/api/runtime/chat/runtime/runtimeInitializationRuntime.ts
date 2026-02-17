import { createRuntimePipelineState, type RuntimePipelineState } from "./runtimePipelineState";

export function initializeRuntimeState(input: {
  message: string;
  lastTurn: Record<string, any> | null;
  recentTurns: Array<Record<string, any>>;
  prevBotContext: Record<string, any>;
  allowedToolByName: Map<string, string[]>;
  extractOrderId: (text: string) => string | null;
  extractPhone: (text: string) => string | null;
  extractZipcode: (text: string) => string | null;
  extractAddress: (text: string, orderId: string | null, phone: string | null, zipcode: string | null) => string | null;
  extractChannel: (text: string) => string | null;
  findRecentEntity: (turns: Array<Record<string, any>>) => Record<string, string | null> | null;
  isRestockSubscribeStageContext: (botContext: Record<string, any>) => boolean;
  deriveExpectedInputFromAnswer: (answer: string) => string | null;
  isRestockInquiry: (text: string) => boolean;
  isRestockSubscribe: (text: string) => boolean;
}): {
  hasAllowedToolName: (name: string) => boolean;
  prevIntent: string | null;
  resolvedIntent: string;
  prevEntity: Record<string, any>;
  prevSelectedOrderId: string | null;
  prevChoices: Array<{ order_id?: string }>;
  prevOrderIdFromTranscript: string | null;
  prevPhoneFromTranscript: string | null;
  prevZipFromTranscript: string | null;
  prevAddressFromTranscript: string | null;
  recentEntity: Record<string, string | null> | null;
  pipelineState: RuntimePipelineState;
  derivedChannel: string | null;
  expectedInput: string | null;
  expectedInputSource: string | null;
  customerVerificationToken: string | null;
  derivedOrderId: string | null;
  derivedPhone: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  updateConfirmAcceptedThisTurn: boolean;
  refundConfirmAcceptedThisTurn: boolean;
  restockSubscribeAcceptedThisTurn: boolean;
  lockIntentToRestockSubscribe: boolean;
  forcedIntentQueue: string[];
  pendingIntentQueue: string[];
  slotDebug: {
    expectedInput: string | null;
    orderId: string | null;
    phone: string | null;
    zipcode: string | null;
    address: string | null;
  };
  usedRuleIds: string[];
  usedTemplateIds: string[];
  inputRuleIds: string[];
  toolRuleIds: string[];
  usedToolPolicies: string[];
  usedProviders: string[];
  mcpActions: string[];
  mcpCandidateCalls: string[];
  mcpSkipLogs: string[];
  mcpSkipQueue: Array<{
    tool: string;
    reason: string;
    args?: Record<string, any>;
    detail?: Record<string, any>;
  }>;
  lastMcpFunction: string | null;
  lastMcpStatus: string | null;
  lastMcpError: string | null;
  lastMcpCount: number | null;
  contaminationSummaries: string[];
  toolResults: Array<{ name: string; ok: boolean; data?: Record<string, any>; error?: unknown }>;
} {
  const {
    message,
    lastTurn,
    recentTurns,
    prevBotContext,
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
  } = input;

  const hasAllowedToolName = (name: string) => (allowedToolByName.get(name)?.length || 0) > 0;
  const prevIntent =
    typeof prevBotContext.intent_name === "string" ? String(prevBotContext.intent_name) : null;
  const resolvedIntent = prevIntent || "general";
  const prevEntity = (prevBotContext.entity || {}) as Record<string, any>;
  const prevSelectedOrderId =
    typeof prevBotContext.selected_order_id === "string" ? prevBotContext.selected_order_id : null;
  const prevChoicesRaw = prevBotContext.order_choices;
  const prevChoices = Array.isArray(prevChoicesRaw)
    ? (prevChoicesRaw as Array<{ order_id?: string }>)
    : [];
  const prevTranscript = typeof lastTurn?.transcript_text === "string" ? lastTurn.transcript_text : "";
  const prevOrderIdFromTranscript = extractOrderId(prevTranscript);
  const prevPhoneFromTranscript = extractPhone(prevTranscript);
  const prevZipFromTranscript = extractZipcode(prevTranscript);
  const prevAddressFromTranscript = extractAddress(
    prevTranscript,
    prevOrderIdFromTranscript,
    prevPhoneFromTranscript,
    prevZipFromTranscript
  );
  const recentEntity = findRecentEntity(recentTurns);
  const lastTokenTurn = recentTurns.find((turn) => turn?.bot_context?.customer_verification_token);
  const initialCustomerVerificationToken =
    (typeof lastTokenTurn?.bot_context?.customer_verification_token === "string"
      ? lastTokenTurn?.bot_context?.customer_verification_token
      : null) ||
    (typeof prevBotContext.customer_verification_token === "string"
      ? prevBotContext.customer_verification_token
      : null);

  const derivedChannel = extractChannel(message);
  const initialDerivedOrderId = extractOrderId(message);
  const initialDerivedPhone = extractPhone(message);
  const initialDerivedZipcode = extractZipcode(message);
  const initialDerivedAddress = extractAddress(message, initialDerivedOrderId, initialDerivedPhone, initialDerivedZipcode);
  const restockSubscribeStageActive = isRestockSubscribeStageContext(prevBotContext);
  const lastAnswer =
    typeof lastTurn?.final_answer === "string"
      ? lastTurn?.final_answer
      : typeof lastTurn?.answer_text === "string"
        ? lastTurn?.answer_text
        : "";
  let initialExpectedInput = deriveExpectedInputFromAnswer(lastAnswer);
  let expectedInputSource = initialExpectedInput ? "derived_from_last_answer" : null;
  if (initialExpectedInput === "address" && /(환불|취소|반품|교환)/.test(message)) {
    initialExpectedInput = null;
    expectedInputSource = "reset_by_message_keyword";
  }
  if (isRestockInquiry(message) || isRestockSubscribe(message)) {
    initialExpectedInput = null;
    expectedInputSource = "reset_by_restock_intent";
  }
  const pipelineState = createRuntimePipelineState({
    resolvedIntent,
    expectedInput: initialExpectedInput,
    customerVerificationToken: initialCustomerVerificationToken,
    derivedChannel,
    derivedOrderId: initialDerivedOrderId,
    derivedPhone: initialDerivedPhone,
    derivedZipcode: initialDerivedZipcode,
    derivedAddress: initialDerivedAddress,
    lockIntentToRestockSubscribe: restockSubscribeStageActive,
  });

  return {
    hasAllowedToolName,
    prevIntent,
    resolvedIntent,
    prevEntity,
    prevSelectedOrderId,
    prevChoices,
    prevOrderIdFromTranscript,
    prevPhoneFromTranscript,
    prevZipFromTranscript,
    prevAddressFromTranscript,
    recentEntity,
    pipelineState,
    derivedChannel: pipelineState.derivedChannel,
    expectedInput: pipelineState.expectedInput,
    expectedInputSource,
    customerVerificationToken: pipelineState.customerVerificationToken,
    derivedOrderId: pipelineState.derivedOrderId,
    derivedPhone: pipelineState.derivedPhone,
    derivedZipcode: pipelineState.derivedZipcode,
    derivedAddress: pipelineState.derivedAddress,
    updateConfirmAcceptedThisTurn: pipelineState.updateConfirmAcceptedThisTurn,
    refundConfirmAcceptedThisTurn: pipelineState.refundConfirmAcceptedThisTurn,
    restockSubscribeAcceptedThisTurn: pipelineState.restockSubscribeAcceptedThisTurn,
    lockIntentToRestockSubscribe: pipelineState.lockIntentToRestockSubscribe,
    forcedIntentQueue: pipelineState.forcedIntentQueue,
    pendingIntentQueue: pipelineState.pendingIntentQueue,
    slotDebug: {
      expectedInput: pipelineState.expectedInput,
      orderId: null,
      phone: typeof prevEntity.phone === "string" ? prevEntity.phone : null,
      zipcode: typeof prevEntity.zipcode === "string" ? prevEntity.zipcode : null,
      address: typeof prevEntity.address === "string" ? prevEntity.address : null,
    },
    usedRuleIds: pipelineState.usedRuleIds,
    usedTemplateIds: pipelineState.usedTemplateIds,
    inputRuleIds: pipelineState.inputRuleIds,
    toolRuleIds: pipelineState.toolRuleIds,
    usedToolPolicies: pipelineState.usedToolPolicies,
    usedProviders: pipelineState.usedProviders,
    mcpActions: pipelineState.mcpActions,
    mcpCandidateCalls: pipelineState.mcpCandidateCalls,
    mcpSkipLogs: pipelineState.mcpSkipLogs,
    mcpSkipQueue: pipelineState.mcpSkipQueue,
    lastMcpFunction: pipelineState.lastMcpFunction,
    lastMcpStatus: pipelineState.lastMcpStatus,
    lastMcpError: pipelineState.lastMcpError,
    lastMcpCount: pipelineState.lastMcpCount,
    contaminationSummaries: pipelineState.contaminationSummaries,
    toolResults: [],
  };
}

