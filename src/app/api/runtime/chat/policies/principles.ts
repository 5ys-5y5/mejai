export const CHAT_PRINCIPLES = {
  // Runtime architecture contract (non-negotiable).
  // Goal: keep intent-driven flexibility by using semantic contracts, not case-specific hardcoding.
  architecture: {
    enforceIntentContractRuntime: true,
    rejectCaseSpecificHotfixAsPrimaryFix: true,
    requireGeneralizableFixAcrossTools: true,
    // Required self-heal design baseline:
    // 1) intent/slot semantics -> request contract mapping
    // 2) response contract -> conversation/entity projection
    // 3) deterministic invariants at pre/post tool boundaries
    requireSlotRequestResponseContractValidation: true,
  },
  // Non-negotiable privacy gate for high-risk operations.
  safety: {
    otpRequiredIntents: ["order_change", "shipping_inquiry", "refund_request"] as const,
    otpRequiredTools: [
      "find_customer_by_phone",
      "list_orders",
      "lookup_order",
      "track_shipment",
      "update_order_shipping_address",
    ] as const,
    // For sensitive intents, require OTP before any user-specific flow continues.
    forceOtpBeforeSensitiveIntentFlow: true,
  },
  // Deterministic answer-shape policy used by choice flows.
  response: {
    uniqueAnswerCount: 1,
    choiceAnswerMinCount: 2,
    orderLookupPreviewMax: 3,
    choicePreviewMax: 5,
    quickReplyMax: 9,
    requireNextActionForNonTerminal: true,
    requireConsentBeforeAlternativeSuggestion: true,
    alternativeSuggestionConsentIntents: ["restock_inquiry"] as const,
    hideAlternativeCandidatesBeforeConsent: true,
    requireImageCardsForChoiceWhenAvailable: true,
    // Restock KB takes priority when mall product name does not match KB product name.
    restockPreferKbWhenNoMallNameMatch: true,
    restockNewProductLabel: "신상품",
  },
  // Intent-scoped slot gate contract.
  // Promise: do not progress to tool/final-answer stage until required intent slots are resolved.
  dialogue: {
    enforceIntentScopedSlotGate: true,
    blockFinalAnswerUntilRequiredSlotsResolved: true,
    requireFollowupQuestionForMissingRequiredSlots: true,
    requireScopeStateTransitionLogging: true,
  },
  // Address/zipcode resolution contract for shipping address changes.
  address: {
    // Users usually know road/jibun address but not zipcode.
    resolveZipcodeViaJusoWhenAddressGiven: true,
    // If JUSO returns multiple candidates, force user choice from explicit triples.
    requireCandidateSelectionWhenMultipleZipcodes: true,
    // Candidate choice must include jibun/road/zipcode together for deterministic confirmation.
    requireJibunRoadZipTripleInChoice: true,
    // If zipcode cannot be found from input address, treat as typo and ask address again.
    requireAddressRetryWhenZipcodeNotFound: true,
  },
  // High-priority memory reuse contract.
  // Promise: do not ask again for information already provided by the user when it can be safely reused.
  memory: {
    enforceNoRepeatQuestions: true,
    reusePriority: "highest",
    selfUpdateEnabledByDefault: true,
    selfUpdateVisibilityDefault: "admin" as const,
    // Deterministic source precedence for slot carry-over.
    entityReuseOrder: ["derived", "prevEntity", "prevTranscript", "recentEntity"] as const,
    // Navigator-only metadata: runtime owners that execute this principle.
    ownerModules: {
      phoneReusePrompt: "src/app/api/runtime/chat/runtime/finalizeRuntime.ts",
      phoneReuseNextTurn: "src/app/api/runtime/chat/runtime/preTurnGuardRuntime.ts",
      entityCarryOver: "src/app/api/runtime/chat/runtime/contextResolutionRuntime.ts",
    } as const,
  },
  // Mutation audit contract.
  // Promise: every state-changing operation must persist before/after evidence for deterministic debugging.
  audit: {
    requireBeforeAfterOnMutation: true,
    requireFailureBoundaryLogs: true,
    requireMcpLastFunctionAlwaysRecorded: true,
    mutationTools: ["update_order_shipping_address"] as const,
    mutationEvidenceFields: ["before", "request", "after", "diff"] as const,
    // Generic contract: for every mutating MCP/API call, preserve original entity snapshot
    // whenever the target has an existing value (update/delete style operations).
    preserveOriginalEntityForMutationTargets: true,
    preserveOriginalEntityMutationKinds: ["update", "delete"] as const,
    preserveOriginalEntityScope: "all_mcp_and_api_calls" as const,
  },
} as const;

export function requiresOtpForIntent(intent: string) {
  return (CHAT_PRINCIPLES.safety.otpRequiredIntents as readonly string[]).includes(String(intent || ""));
}

export function shouldForceOtpBeforeSensitiveIntentFlow() {
  return Boolean(CHAT_PRINCIPLES.safety.forceOtpBeforeSensitiveIntentFlow);
}

export function shouldEnforceIntentContractRuntime() {
  return Boolean(CHAT_PRINCIPLES.architecture.enforceIntentContractRuntime);
}

export function shouldRejectCaseSpecificHotfixAsPrimaryFix() {
  return Boolean(CHAT_PRINCIPLES.architecture.rejectCaseSpecificHotfixAsPrimaryFix);
}

export function shouldRequireGeneralizableFixAcrossTools() {
  return Boolean(CHAT_PRINCIPLES.architecture.requireGeneralizableFixAcrossTools);
}

export function shouldRequireSlotRequestResponseContractValidation() {
  return Boolean(CHAT_PRINCIPLES.architecture.requireSlotRequestResponseContractValidation);
}

export function isOtpRequiredTool(toolName: string) {
  return (CHAT_PRINCIPLES.safety.otpRequiredTools as readonly string[]).includes(String(toolName || ""));
}

export function hasUniqueAnswerCandidate(count: number) {
  return Number(count) === CHAT_PRINCIPLES.response.uniqueAnswerCount;
}

export function hasChoiceAnswerCandidates(count: number) {
  return Number(count) >= CHAT_PRINCIPLES.response.choiceAnswerMinCount;
}

export function requiresAlternativeSuggestionConsent(intent: string) {
  if (!CHAT_PRINCIPLES.response.requireConsentBeforeAlternativeSuggestion) return false;
  return (CHAT_PRINCIPLES.response.alternativeSuggestionConsentIntents as readonly string[]).includes(
    String(intent || "")
  );
}

export function shouldHideAlternativeCandidatesBeforeConsent() {
  return Boolean(CHAT_PRINCIPLES.response.hideAlternativeCandidatesBeforeConsent);
}

export function shouldRenderImageCardsForChoiceWhenAvailable() {
  return Boolean(CHAT_PRINCIPLES.response.requireImageCardsForChoiceWhenAvailable);
}

export function shouldPreferRestockKbWhenNoMallNameMatch() {
  return Boolean(CHAT_PRINCIPLES.response.restockPreferKbWhenNoMallNameMatch);
}

export function getRestockNewProductLabel() {
  return String(CHAT_PRINCIPLES.response.restockNewProductLabel || "신상품");
}

export function shouldEnforceNoRepeatQuestions() {
  return Boolean(CHAT_PRINCIPLES.memory.enforceNoRepeatQuestions);
}

export function shouldResolveZipcodeViaJusoWhenAddressGiven() {
  return Boolean(CHAT_PRINCIPLES.address.resolveZipcodeViaJusoWhenAddressGiven);
}

export function shouldRequireCandidateSelectionWhenMultipleZipcodes() {
  return Boolean(CHAT_PRINCIPLES.address.requireCandidateSelectionWhenMultipleZipcodes);
}

export function shouldRequireJibunRoadZipTripleInChoice() {
  return Boolean(CHAT_PRINCIPLES.address.requireJibunRoadZipTripleInChoice);
}

export function shouldRequireAddressRetryWhenZipcodeNotFound() {
  return Boolean(CHAT_PRINCIPLES.address.requireAddressRetryWhenZipcodeNotFound);
}

export function getEntityReuseOrder() {
  return CHAT_PRINCIPLES.memory.entityReuseOrder as readonly string[];
}

export function isSelfUpdateEnabledByDefault() {
  return Boolean(CHAT_PRINCIPLES.memory.selfUpdateEnabledByDefault);
}

export function getSelfUpdateVisibilityDefault() {
  return CHAT_PRINCIPLES.memory.selfUpdateVisibilityDefault as "user" | "admin";
}

export function shouldRequireBeforeAfterOnMutation() {
  return Boolean(CHAT_PRINCIPLES.audit.requireBeforeAfterOnMutation);
}

export function shouldRequireFailureBoundaryLogs() {
  return Boolean(CHAT_PRINCIPLES.audit.requireFailureBoundaryLogs);
}

export function shouldEnforceIntentScopedSlotGate() {
  return Boolean(CHAT_PRINCIPLES.dialogue.enforceIntentScopedSlotGate);
}

export function shouldBlockFinalAnswerUntilRequiredSlotsResolved() {
  return Boolean(CHAT_PRINCIPLES.dialogue.blockFinalAnswerUntilRequiredSlotsResolved);
}

export function shouldRequireFollowupQuestionForMissingRequiredSlots() {
  return Boolean(CHAT_PRINCIPLES.dialogue.requireFollowupQuestionForMissingRequiredSlots);
}

export function shouldRequireScopeStateTransitionLogging() {
  return Boolean(CHAT_PRINCIPLES.dialogue.requireScopeStateTransitionLogging);
}

export function shouldRequireMcpLastFunctionAlwaysRecorded() {
  return Boolean(CHAT_PRINCIPLES.audit.requireMcpLastFunctionAlwaysRecorded);
}

export function getMutationAuditTools() {
  return CHAT_PRINCIPLES.audit.mutationTools as readonly string[];
}

export function getMutationEvidenceFields() {
  return CHAT_PRINCIPLES.audit.mutationEvidenceFields as readonly string[];
}

export function shouldPreserveOriginalEntityForMutationTargets() {
  return Boolean(CHAT_PRINCIPLES.audit.preserveOriginalEntityForMutationTargets);
}

export function getPreserveOriginalEntityMutationKinds() {
  return CHAT_PRINCIPLES.audit.preserveOriginalEntityMutationKinds as readonly string[];
}

export function getPreserveOriginalEntityScope() {
  return CHAT_PRINCIPLES.audit.preserveOriginalEntityScope as "all_mcp_and_api_calls";
}
