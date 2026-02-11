export type RuntimePipelineState = {
  resolvedIntent: string;
  resolvedOrderId: string | null;
  expectedInput: string | null;
  customerVerificationToken: string | null;
  derivedChannel: string | null;
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
  contaminationSummaries: string[];
  mcpActions: string[];
  mcpCandidateCalls: string[];
  mcpSkipLogs: string[];
  mcpSkipQueue: Array<{
    tool: string;
    reason: string;
    args?: Record<string, any>;
    detail?: Record<string, any>;
  }>;
  usedRuleIds: string[];
  usedTemplateIds: string[];
  inputRuleIds: string[];
  toolRuleIds: string[];
  usedToolPolicies: string[];
  usedProviders: string[];
  lastMcpFunction: string | null;
  lastMcpStatus: string | null;
  lastMcpError: string | null;
  lastMcpCount: number | null;
};

export function createRuntimePipelineState(
  initial: Pick<
    RuntimePipelineState,
    | "resolvedIntent"
    | "expectedInput"
    | "customerVerificationToken"
    | "derivedChannel"
    | "derivedOrderId"
    | "derivedPhone"
    | "derivedZipcode"
    | "derivedAddress"
    | "lockIntentToRestockSubscribe"
  >
): RuntimePipelineState {
  return {
    ...initial,
    resolvedOrderId: initial.derivedOrderId || null,
    updateConfirmAcceptedThisTurn: false,
    refundConfirmAcceptedThisTurn: false,
    restockSubscribeAcceptedThisTurn: false,
    forcedIntentQueue: [],
    pendingIntentQueue: [],
    contaminationSummaries: [],
    mcpActions: [],
    mcpCandidateCalls: [],
    mcpSkipLogs: [],
    mcpSkipQueue: [],
    usedRuleIds: [],
    usedTemplateIds: [],
    inputRuleIds: [],
    toolRuleIds: [],
    usedToolPolicies: [],
    usedProviders: [],
    lastMcpFunction: null,
    lastMcpStatus: null,
    lastMcpError: null,
    lastMcpCount: null,
  };
}

