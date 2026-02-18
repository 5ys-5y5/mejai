const RESTOCK_KEYWORDS = /(재입고|재고|입고|품절|restock|stock)/i;
const RESTOCK_SUBSCRIBE_KEYWORDS = /(알림|신청|구독|예약|notify|subscribe|sms|문자|카톡|카카오|email|이메일)/i;
const ORDER_CHANGE_KEYWORDS =
  /(?:배송지|주소|수령지)\s*(?:변경|수정|바꾸|바꿔|교체|업데이트)|(?:변경|수정)\s*(?:배송지|주소|수령지)/i;
const SHIPPING_KEYWORDS = /(배송|출고|운송장|송장|배송조회|배송\s*상태|배송\s*언제|도착|지연)/i;
const REFUND_KEYWORDS = /(환불|반품|교환|취소)/i;
const FAQ_KEYWORDS = /(문의|질문|faq|사용법|방법|안내|가능한가|알려줘)/i;

const RESTOCK_LEAD_DAY_OPTIONS = [1, 2, 3, 7, 14] as const;

export function isRestockSubscribe(text: string) {
  return RESTOCK_KEYWORDS.test(text) && RESTOCK_SUBSCRIBE_KEYWORDS.test(text);
}

export function isRestockInquiry(text: string) {
  return RESTOCK_KEYWORDS.test(text) && !isRestockSubscribe(text);
}

export function detectIntent(text: string) {
  if (isRestockSubscribe(text)) return "restock_subscribe";
  if (isRestockInquiry(text)) return "restock_inquiry";
  if (isAddressChangeUtterance(text)) return "order_change";
  if (SHIPPING_KEYWORDS.test(text)) return "shipping_inquiry";
  if (REFUND_KEYWORDS.test(text)) return "refund_request";
  return "general";
}

export function detectIntentCandidates(text: string) {
  const out: string[] = [];
  if (isRestockSubscribe(text)) out.push("restock_subscribe");
  if (isRestockInquiry(text)) out.push("restock_inquiry");
  if (FAQ_KEYWORDS.test(text)) out.push("faq");
  if (isAddressChangeUtterance(text)) out.push("order_change");
  if (REFUND_KEYWORDS.test(text)) out.push("refund_request");
  if (SHIPPING_KEYWORDS.test(text)) out.push("shipping_inquiry");
  if (out.length === 0) out.push("general");
  return Array.from(new Set(out));
}

export function intentLabel(intent: string) {
  switch (intent) {
    case "restock_inquiry":
      return "재입고 문의";
    case "restock_subscribe":
      return "재입고 알림 신청";
    case "faq":
      return "FAQ 문의";
    case "order_change":
      return "배송지 변경";
    case "refund_request":
      return "환불/반품";
    case "shipping_inquiry":
      return "배송 문의";
    default:
      return "일반 문의";
  }
}

export function intentSupportScope(intent: string) {
  switch (intent) {
    case "restock_inquiry":
      return "재입고 일정 확인";
    case "restock_subscribe":
      return "재입고 알림 신청";
    case "faq":
      return "이용/정책/일반 문의";
    case "order_change":
      return "배송지/수령인 정보 변경";
    case "refund_request":
      return "취소/반품/환불";
    case "shipping_inquiry":
      return "배송 상태/송장 조회";
    default:
      return "";
  }
}

export function isAddressChangeUtterance(text: string) {
  return ORDER_CHANGE_KEYWORDS.test(String(text || ""));
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
  return /^(네|예|응|그래|맞아|맞아요|맞습니다|좋아요|가능|ㅇㅇ|ok|okay|yes|y)$/.test(v);
}

export function isNoText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(아니요|아니|아니오|싫어요|안돼|불가|no|n)$/.test(v);
}

export function isExecutionAffirmativeText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /(진행|처리|신청|접수|해주세요|해줘|바로|확인|할게|할래)/i.test(v);
}

export function isEndConversationText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(종료|끝|그만|닫아|대화 종료|상담 종료|close|end)$/i.test(v) || isNoText(v);
}

export function isOtherInquiryText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(다른 문의|다른 질문|다른 내용|새 문의|새 질문|다른 거|other|new)$/i.test(v);
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
  if (/(카카오|카톡|kakao)/i.test(v)) return "kakao";
  if (/(이메일|email)/i.test(v)) return "email";
  if (/(문자|sms)/i.test(v)) return "sms";
  return null;
}

export function parseIndexedChoice(text: string) {
  const m = String(text || "").trim().match(/^(\d{1,2})\s*(?:번|번요)?$/);
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
  if (/(모두|전체|전부|all)/i.test(raw)) return [...available];
  const picked = Array.from(new Set((raw.match(/\d{1,2}/g) || []).map((v) => Number(v)).filter(Number.isFinite)));
  return picked.filter((n) => available.includes(n)).sort((a, b) => a - b);
}

export function extractNumberedOptionIndicesFromText(text: string, max = 99) {
  const values = Array.from(String(text || "").matchAll(/-\s*(\d{1,2})\s*(?:번)?\s*\|/g))
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
