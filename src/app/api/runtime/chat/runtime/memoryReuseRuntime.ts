import { CHAT_PRINCIPLES, shouldEnforceNoRepeatQuestions } from "../policies/principles";

type OptionalText = string | null | undefined;

function normalizeText(value: OptionalText) {
  const text = String(value || "").trim();
  return text || null;
}

function resolveByConfiguredOrder(input: {
  derived?: OptionalText;
  prevEntity?: OptionalText;
  prevTranscript?: OptionalText;
  recentEntity?: OptionalText;
}) {
  const byKey: Record<string, string | null> = {
    derived: normalizeText(input.derived),
    prevEntity: normalizeText(input.prevEntity),
    prevTranscript: normalizeText(input.prevTranscript),
    recentEntity: normalizeText(input.recentEntity),
  };
  for (const key of CHAT_PRINCIPLES.memory.entityReuseOrder) {
    const candidate = byKey[key];
    if (candidate) return candidate;
  }
  return null;
}

export function resolvePhoneWithReuse(input: {
  derivedPhone?: OptionalText;
  prevEntityPhone?: OptionalText;
  prevPhoneFromTranscript?: OptionalText;
  recentEntityPhone?: OptionalText;
}) {
  return resolveByConfiguredOrder({
    derived: input.derivedPhone,
    prevEntity: input.prevEntityPhone,
    prevTranscript: input.prevPhoneFromTranscript,
    recentEntity: input.recentEntityPhone,
  });
}

export function resolveAddressWithReuse(input: {
  derivedAddress?: OptionalText;
  prevEntityAddress?: OptionalText;
  prevAddressFromTranscript?: OptionalText;
  recentEntityAddress?: OptionalText;
}) {
  return resolveByConfiguredOrder({
    derived: input.derivedAddress,
    prevEntity: input.prevEntityAddress,
    prevTranscript: input.prevAddressFromTranscript,
    recentEntity: input.recentEntityAddress,
  });
}

export function canOfferPhoneReusePrompt(input: {
  resolvedIntent: string;
  isNeedOrderIdTemplate: boolean;
  normalizedPhone: string;
  listOrdersCalled: boolean;
}) {
  if (!shouldEnforceNoRepeatQuestions()) return false;
  return (
    input.resolvedIntent === "order_change" &&
    input.isNeedOrderIdTemplate &&
    input.normalizedPhone.length >= 10 &&
    !input.listOrdersCalled
  );
}

export function readPendingPhoneReuse(botContext: Record<string, any>) {
  const pending = Boolean(botContext.phone_reuse_pending);
  const pendingPhone = normalizeText(String(botContext.pending_phone || ""));
  return { pending, pendingPhone };
}

