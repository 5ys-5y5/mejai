export type StepInput<T extends Record<string, any>> = T;
export type StepOutput<T extends Record<string, any>> = T;

export type DisambiguationStepInput = StepInput<{
  message: string;
  expectedInput: string | null;
  resolvedIntent: string;
}>;

export type DisambiguationStepOutput = StepOutput<{
  forcedIntentQueue: string[];
  pendingIntentQueue: string[];
  effectiveMessageForIntent: string;
}>;

export type PreTurnGuardStepInput = StepInput<{
  message: string;
  resolvedIntent: string;
  expectedInput: string | null;
  derivedPhone: string | null;
}>;

export type PreTurnGuardStepOutput = StepOutput<{
  expectedInput: string | null;
  derivedPhone: string | null;
}>;

export type SlotDerivationStepOutput = StepOutput<{
  derivedOrderId: string | null;
  derivedPhone: string | null;
  derivedZipcode: string | null;
  derivedAddress: string | null;
  resolvedIntent: string;
}>;

export type OtpGateStepOutput = StepOutput<{
  otpVerifiedThisTurn: boolean;
  otpPending: boolean;
  customerVerificationToken: string | null;
  mcpCandidateCalls: string[];
}>;

export type ToolExecStepOutput = StepOutput<{
  mcpSummary: string;
  listOrdersCalled: boolean;
  listOrdersEmpty: boolean;
  listOrdersChoices: Array<Record<string, any>>;
}>;

export type PostToolFlowStepOutput = StepOutput<{
  resolvedOrderId: string | null;
  mcpSummary: string;
}>;

