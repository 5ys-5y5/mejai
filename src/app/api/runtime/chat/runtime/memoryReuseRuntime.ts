import { CHAT_PRINCIPLES, shouldEnforceNoRepeatQuestions, shouldReuseProvidedInfoWithYesNo, getSubstitutionPlan } from "../policies/principles";

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

const LEGACY_PENDING_SLOT_KEYS = [
  { flag: "phone_reuse_pending", slot: "phone", value: "pending_phone" },
  { flag: "order_id_reuse_pending", slot: "order_id", value: "pending_order_id" },
  { flag: "address_reuse_pending", slot: "address", value: "pending_address" },
  { flag: "zipcode_reuse_pending", slot: "zipcode", value: "pending_zipcode" },
];

export function shouldOfferReusePromptForSlot(input: {
  slotKey: string;
  slotValue: string | null;
  listOrdersCalled?: boolean;
}) {
  if (!shouldEnforceNoRepeatQuestions()) return false;
  if (!shouldReuseProvidedInfoWithYesNo()) return false;
  const slotKey = String(input.slotKey || "").trim();
  if (!slotKey) return false;
  if (!normalizeText(input.slotValue)) return false;
  if (slotKey === "order_id" && input.listOrdersCalled) return false;
  return true;
}

export function readPendingReuse(botContext: Record<string, any>) {
  if (botContext.reuse_pending) {
    return {
      pending: true,
      slotKey: normalizeText(String(botContext.pending_reuse_slot || "")),
      value: normalizeText(String(botContext.pending_reuse_value || "")),
    };
  }
  for (const legacy of LEGACY_PENDING_SLOT_KEYS) {
    if (botContext[legacy.flag]) {
      return {
        pending: true,
        slotKey: legacy.slot,
        value: normalizeText(String(botContext[legacy.value] || "")),
      };
    }
  }
  return { pending: false, slotKey: null, value: null };
}

export function pickReuseCandidate(input: {
  missingSlots: string[];
  entity: Record<string, any>;
  listOrdersCalled?: boolean;
}) {
  const missingSlots = Array.isArray(input.missingSlots) ? input.missingSlots : [];
  for (const slot of missingSlots) {
    const value = normalizeText(String(input.entity?.[slot] || ""));
    if (!value) continue;
    if (!shouldOfferReusePromptForSlot({ slotKey: slot, slotValue: value, listOrdersCalled: input.listOrdersCalled })) {
      continue;
    }
    return { slotKey: slot, value };
  }
  return null;
}

export function getReuseSlotLabel(slotKey: string) {
  const key = String(slotKey || "").trim();
  if (!key) return "information";
  if (key === "order_id") return "order number";
  if (key === "zipcode") return "zipcode";
  if (key === "address") return "address";
  if (key === "phone") return "phone number";
  return key.replace(/_/g, " ");
}

export function getPreferredPromptSlot(slotKey: string) {
  const plan = getSubstitutionPlan(slotKey);
  if (plan?.ask?.length) return plan.ask[0];
  return slotKey;
}

