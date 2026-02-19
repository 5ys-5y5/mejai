import { DEFAULT_RULE_BUNDLE, type ChatRuleBundle } from "./composed";
import { getRuleBundle } from "./registry";

export const CHAT_PRINCIPLES = DEFAULT_RULE_BUNDLE;

export type ChatPrinciples = ChatRuleBundle;

const resolvePolicy = (policy?: ChatPrinciples) => policy ?? CHAT_PRINCIPLES;

export function getPolicyBundle(intent?: string) {
  return getRuleBundle(intent);
}



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

export function shouldRenderImageCardsForChoiceWhenAvailable(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.response.requireImageCardsForChoiceWhenAvailable);
}

export function shouldPreferRestockKbWhenNoMallNameMatch() {
  return Boolean(CHAT_PRINCIPLES.response.restockPreferKbWhenNoMallNameMatch);
}

export function getRestockNewProductLabel() {
  return String(CHAT_PRINCIPLES.response.restockNewProductLabel || "\uC2E0\uC0C1\uD488");
}

export function shouldEnforceNoRepeatQuestions(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.memory.enforceNoRepeatQuestions);
}

export function shouldResolveZipcodeViaJusoWhenAddressGiven(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.address.resolveZipcodeViaJusoWhenAddressGiven);
}

export function getWhatUserDontKnow(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return rules.substitution.whatUserDontKnow as readonly string[];
}

export function getSubstitutionResolutionMap(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return rules.substitution.resolution as Record<
    string,
    { ask: readonly string[]; tools: readonly string[]; requires: readonly string[] }
  >;
}

export function shouldResolveWithSubstitution(targetSlot: string, policy?: ChatPrinciples) {
  const unknown = new Set(getWhatUserDontKnow(policy));
  if (!unknown.has(String(targetSlot || ""))) return false;
  const plan = getSubstitutionResolutionMap(policy)[String(targetSlot || "")];
  return Boolean(plan);
}

export function getSubstitutionPlan(targetSlot: string, policy?: ChatPrinciples) {
  if (!shouldResolveWithSubstitution(targetSlot, policy)) return null;
  const plan = getSubstitutionResolutionMap(policy)[String(targetSlot || "")];
  if (!plan) return null;
  return {
    target: String(targetSlot || ""),
    ask: Array.isArray(plan.ask) ? plan.ask : [],
    tools: Array.isArray(plan.tools) ? plan.tools : [],
    requires: Array.isArray(plan.requires) ? plan.requires : [],
  };
}

export function shouldRequireChoiceWhenMultipleCandidates(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.substitution.requireChoiceWhenMultipleCandidates);
}

export function shouldReuseProvidedInfoWithYesNo(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.substitution.reuseProvidedInfoWithYesNo);
}

export function shouldRequireCandidateSelectionWhenMultipleZipcodes(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.address.requireCandidateSelectionWhenMultipleZipcodes);
}

export function shouldRequireJibunRoadZipTripleInChoice(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.address.requireJibunRoadZipTripleInChoice);
}

export function shouldRequireAddressRetryWhenZipcodeNotFound(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.address.requireAddressRetryWhenZipcodeNotFound);
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

export function shouldRequireMutationTargetConfirmationAlways(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.mutation.requireTargetConfirmationAlways);
}

export function getMutationTargetSummaryFields(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return rules.mutation.requireTargetSummaryFields as readonly string[];
}

export function shouldRequireBeforeAfterSummaryForMutations(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.mutation.requireBeforeAfterSummaryForMutations);
}

export function shouldRequireSingleTargetConfirmation(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.targetConfirmation.requireSingleCandidateConfirmation);
}

export function getTargetSummaryFields(targetKind: string, policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  const fields = (rules.targetConfirmation.summaryFieldsByTarget as Record<string, readonly string[]> | undefined) || {};
  return (fields[targetKind] || []) as readonly string[];
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

export function shouldEnforceLastQuestionAnswerBinding() {
  return Boolean(CHAT_PRINCIPLES.dialogue.enforceLastQuestionAnswerBinding);
}

export function shouldRequireThreePhasePrompt() {
  return Boolean(CHAT_PRINCIPLES.dialogue.requireThreePhasePrompt);
}

export function getThreePhasePromptLabels() {
  return CHAT_PRINCIPLES.dialogue.threePhasePromptLabels as {
    confirmed: string;
    confirming: string;
    next: string;
  };
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

export function shouldRequireReuseConfirmationOnEndUserMatch(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Boolean(rules.memory.requireReuseConfirmationOnEndUserMatch);
}

export function getReuseConfirmationScope(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return rules.memory.reuseConfirmationScope as "intent";
}

export function getReuseConfirmationMaxPerScope(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return Number(rules.memory.reuseConfirmationMaxPerScope);
}

export function getReuseConfirmationTargets(policy?: ChatPrinciples) {
  const rules = resolvePolicy(policy);
  return rules.memory.reuseConfirmationTargets as readonly string[];
}
