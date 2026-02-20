import { getIntentContract, getMutationIntentContract } from "./intentContractRuntime";
import { resolveInputContractSnapshot } from "./inputContractRuntime";
import { ACTION_TOKENS } from "../policies/intentSlotPolicy";

type QuickReply = { label: string; value: string };

const POST_ACTION_QUICK_REPLIES: QuickReply[] = [
  { label: "\uB300\uD654 \uC885\uB8CC", value: ACTION_TOKENS.endConversation },
  { label: "\uB2E4\uB978 \uBB38\uC758", value: ACTION_TOKENS.otherInquiry },
];

function normalizeMessage(text: string) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAuthGateTurn(botContext?: Record<string, any> | null) {
  const ctx = botContext && typeof botContext === "object" ? botContext : {};
  if (ctx.otp_pending) return true;
  if (ctx.otp_stage) return true;
  const expected = typeof ctx.expected_input === "string" ? ctx.expected_input : "";
  return expected === "otp_code";
}

function hasPendingUserRequest(botContext?: Record<string, any> | null) {
  const ctx = botContext && typeof botContext === "object" ? botContext : null;
  if (!ctx) return false;

  if (
    ctx.reuse_pending ||
    ctx.phone_reuse_pending ||
    ctx.order_id_reuse_pending ||
    ctx.address_reuse_pending ||
    ctx.zipcode_reuse_pending
  ) {
    return true;
  }

  const snapshot = resolveInputContractSnapshot({
    botContext: ctx,
    derivedExpectedInput: null,
    contractConfig: null,
  });
  const stage = String(snapshot.stage || "").trim();
  const isPostActionStage = stage.startsWith("post_action.");
  const explicitExpectedInputs = Array.isArray(ctx.expected_inputs)
    ? ctx.expected_inputs.map((item: unknown) => String(item || "").trim()).filter(Boolean)
    : [];
  if (!isPostActionStage && explicitExpectedInputs.length > 0) return true;
  if (!isPostActionStage && snapshot.expectedInputs.length > 0) return true;
  return false;
}

function isCompletionCue(intent: string, message: string) {
  const normalized = normalizeMessage(message);
  if (!normalized) return false;
  const contract = getIntentContract(intent);
  const mutationContract = getMutationIntentContract(intent);
  const cues = new Set<string>();
  if (Array.isArray(contract?.completionCues)) {
    contract!.completionCues.forEach((cue) => cues.add(String(cue || "").trim()));
  }
  if (mutationContract?.userSuccessPrefix) {
    cues.add(String(mutationContract.userSuccessPrefix || "").trim());
  }
  cues.add("\uC694\uC57D:");
  cues.add("\uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4");
  cues.add("\uC785\uACE0 \uC608\uC815\uC77C");
  return Array.from(cues).some((cue) => cue && normalized.includes(cue));
}

export function isIntentCompletionMessage(intent: string, message: string) {
  return isCompletionCue(intent, message);
}

export function resolveCompletionState(input: {
  intent: string;
  message: string;
  botContext?: Record<string, any> | null;
}) {
  const intent = String(input.intent || "").trim();
  const botContext = input.botContext && typeof input.botContext === "object" ? input.botContext : {};
  if (botContext.conversation_closed) {
    return { completed: true, nextText: "\uCD94\uAC00 \uB3C4\uC6C0 \uC694\uCCAD \uD655\uC778" };
  }
  if (isAuthGateTurn(botContext)) {
    return { completed: false, nextText: null };
  }
  if (hasPendingUserRequest(botContext)) {
    return { completed: false, nextText: null };
  }
  const completed =
    isCompletionCue(intent, input.message);
  return {
    completed,
    nextText: completed ? "\uCD94\uAC00 \uB3C4\uC6C0 \uC694\uCCAD \uD655\uC778" : null,
  };
}

export function shouldAppendPostActionChoices(input: {
  intent: string;
  message: string;
  botContext?: Record<string, any> | null;
}) {
  const intent = String(input.intent || "").trim();
  if (!intent || intent === "general") return false;
  const botContext = input.botContext && typeof input.botContext === "object" ? input.botContext : {};
  if (isAuthGateTurn(botContext)) return false;
  if (hasPendingUserRequest(botContext)) return false;
  if (botContext.post_action_stage) return false;
  const isCompletion = isCompletionCue(intent, input.message);
  if (!isCompletion) return false;
  if (botContext.conversation_closed) return false;
  return true;
}

export function appendPostActionQuickReplies(existing: QuickReply[]) {
  const base = Array.isArray(existing) ? existing : [];
  const deduped = new Map<string, QuickReply>();
  base.forEach((item) => {
    const key = String(item.value || item.label || "").trim();
    if (key) deduped.set(key, item);
  });
  POST_ACTION_QUICK_REPLIES.forEach((item) => {
    const key = String(item.value || item.label || "").trim();
    if (key && !deduped.has(key)) deduped.set(key, item);
  });
  return Array.from(deduped.values());
}
