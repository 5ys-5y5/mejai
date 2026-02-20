import {
  END_CONVERSATION_PATTERN,
  EXECUTION_AFFIRMATIVE_PATTERN,
  INTENT_KEYWORDS,
  NO_TEXT_PATTERN,
  OTHER_INQUIRY_PATTERN,
  RESTOCK_LEAD_DAY_OPTIONS,
  YES_TEXT_PATTERN,
} from "./lexicon";

export const ACTION_TOKENS = {
  restockSubscribe: "action:restock_subscribe",
  endConversation: "action:end_conversation",
  otherInquiry: "action:other_inquiry",
} as const;

const ACTION_TOKEN_MAP: Record<string, { action: string; label: string }> = {
  [ACTION_TOKENS.restockSubscribe]: { action: "restock_subscribe", label: "?ъ엯怨??뚮┝ ?좎껌" },
  [ACTION_TOKENS.endConversation]: { action: "end_conversation", label: "???醫낅즺" },
  [ACTION_TOKENS.otherInquiry]: { action: "other_inquiry", label: "?ㅻⅨ 臾몄쓽" },
};

export function parseActionToken(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return null;
  return ACTION_TOKEN_MAP[v]?.action ?? null;
}

export function resolveActionLabel(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return null;
  return ACTION_TOKEN_MAP[v]?.label ?? null;
}

export function replaceActionTokensForDisplay(text: string) {
  const value = String(text || "");
  if (!value) return value;
  return value.replace(/action:[a-z_]+/gi, (token) => resolveActionLabel(token) || token);
}

export function isRestockSubscribe(text: string) {
  const action = parseActionToken(text);
  if (action === "restock_subscribe") return true;
  return INTENT_KEYWORDS.restock.test(text) && INTENT_KEYWORDS.restockSubscribe.test(text);
}

export function isRestockInquiry(text: string) {
  return INTENT_KEYWORDS.restock.test(text) && !isRestockSubscribe(text);
}

export function detectIntent(text: string) {
  const action = parseActionToken(text);
  if (action === "restock_subscribe") return "restock_subscribe";
  if (isRestockSubscribe(text)) return "restock_subscribe";
  if (isRestockInquiry(text)) return "restock_inquiry";
  if (isAddressChangeUtterance(text)) return "order_change";
  if (INTENT_KEYWORDS.shipping.test(text)) return "shipping_inquiry";
  if (INTENT_KEYWORDS.refund.test(text)) return "refund_request";
  return "general";
}

export function detectIntentCandidates(text: string) {
  const out: string[] = [];
  const action = parseActionToken(text);
  if (action === "restock_subscribe") out.push("restock_subscribe");
  if (isRestockSubscribe(text)) out.push("restock_subscribe");
  if (isRestockInquiry(text)) out.push("restock_inquiry");
  if (INTENT_KEYWORDS.faq.test(text)) out.push("faq");
  if (isAddressChangeUtterance(text)) out.push("order_change");
  if (INTENT_KEYWORDS.refund.test(text)) out.push("refund_request");
  if (INTENT_KEYWORDS.shipping.test(text)) out.push("shipping_inquiry");
  if (out.length === 0) out.push("general");
  return Array.from(new Set(out));
}

export function intentLabel(intent: string) {
  switch (intent) {
    case "restock_inquiry":
      return "?ъ엯怨?臾몄쓽";
    case "restock_subscribe":
      return "?ъ엯怨??뚮┝ ?좎껌";
    case "faq":
      return "FAQ 臾몄쓽";
    case "order_change":
      return "諛곗넚吏 蹂寃?;
    case "refund_request":
      return "?섎텋/諛섑뭹";
    case "shipping_inquiry":
      return "諛곗넚 臾몄쓽";
    default:
      return "?쇰컲 臾몄쓽";
  }
}

export function intentSupportScope(intent: string) {
  switch (intent) {
    case "restock_inquiry":
      return "?ъ엯怨??쇱젙 ?뺤씤";
    case "restock_subscribe":
      return "?ъ엯怨??뚮┝ ?좎껌";
    case "faq":
      return "?댁슜/?뺤콉/?쇰컲 臾몄쓽";
    case "order_change":
      return "배송지/주문정보 변경";
    case "refund_request":
      return "痍⑥냼/諛섑뭹/?섎텋";
    case "shipping_inquiry":
      return "諛곗넚 ?곹깭/?≪옣 議고쉶";
    default:
      return "";
  }
}

export function isAddressChangeUtterance(text: string) {
  return INTENT_KEYWORDS.orderChange.test(String(text || ""));
}

export function toOrderDateShort(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    const hh = String(parsed.getHours()).padStart(2, "0");
    const mi = String(parsed.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}`;
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) return `${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
  return raw;
}

export function toMoneyText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return "-";
  const num = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(num)) return raw;
  return num.toLocaleString("ko-KR");
}

export function isYesText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(네|예|응|그래|그렇(?:습니다|다)?|맞아|맞아요|맞습니다|좋아요|오케이|ok|okay|yes|y)$/i.test(v);
}

export function isNoText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(아니오|아니요|아니|아뇨|싫어요|안돼|안됩니다|불가|no|n)$/i.test(v);
}

export function isExecutionAffirmativeText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /(진행|처리|신청|접수|해주세요|부탁|바로|확인|진행해|받아|해줘|해 주세요|해줘요)/i.test(v);
}

export function isEndConversationText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  if (parseActionToken(v) === "end_conversation") return true;
  return /^(종료|그만|닫기|대화 종료|끝|close|end)$/i.test(v) || isNoText(v);
}

export function isOtherInquiryText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  if (parseActionToken(v) === "other_inquiry") return true;
  return /^(다른 문의|다른 질문|다른 내용|새 문의|새 질문|다른 것|other|new)$/i.test(v);
}

export function parseSatisfactionScore(text: string) {
  const v = String(text || "").trim();
  if (!v) return null;
  const match = v.match(/[1-5]/);
  if (!match) return null;
  const score = Number(match[0]);
  return Number.isFinite(score) && score >= 1 && score <= 5 ? score : null;
}

export function extractRestockChannel(text: string) {
  const v = String(text || "");
  if (/(移댁뭅??移댄넚|kakao)/i.test(v)) return "kakao";
  if (/(?대찓??email)/i.test(v)) return "email";
  if (/(臾몄옄|sms)/i.test(v)) return "sms";
  return null;
}

export function parseIndexedChoice(text: string) {
  const m = String(text || "").trim().match(/^(\d{1,2})\s*(?:踰?踰덉슂)?$/);
  if (!m) return null;
  const idx = Number(m[1]);
  return Number.isFinite(idx) && idx > 0 ? idx : null;
}

export function parseIndexedChoices(text: string, max: number) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const values = (raw.match(/\d{1,2}/g) || [])
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= max);
  return Array.from(new Set(values));
}

export function availableRestockLeadDays(diffDays: number) {
  const remain = Math.max(0, Math.floor(diffDays));
  return RESTOCK_LEAD_DAY_OPTIONS.filter((day) => day <= remain);
}

export function parseLeadDaysSelection(text: string, available: number[]) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  if (/(紐⑤몢|?꾩껜|?꾨?|all)/i.test(raw)) return [...available];
  const picked = Array.from(new Set((raw.match(/\d{1,2}/g) || []).map((v) => Number(v)).filter(Number.isFinite)));
  return picked.filter((n) => available.includes(n)).sort((a, b) => a - b);
}

export function extractNumberedOptionIndicesFromText(text: string, max = 99) {
  const values = Array.from(String(text || "").matchAll(/-\s*(\d{1,2})\s*(?:踰??\s*\|/g))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= max);
  return Array.from(new Set(values));
}

export function extractLeadDayOptionsFromText(text: string, max = 31) {
  const raw = String(text || "");
  const hasLeadDaySignal = /D-\d{1,2}/.test(raw);
  if (!hasLeadDaySignal) return [];
  const values = Array.from(raw.matchAll(/D-(\d{1,2})/g))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= max);
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function toLeadDayQuickReplies(days: number[], max = 7) {
  const normalized = Array.from(
    new Set(
      (Array.isArray(days) ? days : [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
    )
  ).slice(0, Math.max(1, max));
  return normalized.map((n) => ({ label: `D-${n}`, value: String(n) }));
}

