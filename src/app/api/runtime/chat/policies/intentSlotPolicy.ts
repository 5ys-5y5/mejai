const RESTOCK_KEYWORDS = /재입고|입고|재고|품절|다시\s*입고|다시\s*들어|재판매/;

const RESTOCK_LEAD_DAY_OPTIONS = [1, 2, 3, 7, 14] as const;

export function isRestockSubscribe(text: string) {
  return (
    RESTOCK_KEYWORDS.test(text) &&
    /(알림|신청|예약|구독|등록|받고|받을|문자|sms|카카오|카톡|이메일|메일|입고되면|재입고되면|notify|subscribe)/i.test(
      text
    )
  );
}

export function isRestockInquiry(text: string) {
  return RESTOCK_KEYWORDS.test(text) && !isRestockSubscribe(text);
}

export function detectIntent(text: string) {
  if (isRestockSubscribe(text)) return "restock_subscribe";
  if (isRestockInquiry(text)) return "restock_inquiry";
  if (/주소|배송지|수령인|연락처/.test(text)) return "order_change";
  if (/조회|확인/.test(text) && /배송|송장|출고|운송장/.test(text)) return "shipping_inquiry";
  if (/배송|송장|출고|운송장|배송조회/.test(text)) return "shipping_inquiry";
  if (/환불|취소|반품|교환/.test(text)) return "refund_request";
  return "general";
}

export function detectIntentCandidates(text: string) {
  const out: string[] = [];
  if (isRestockSubscribe(text)) out.push("restock_subscribe");
  if (isRestockInquiry(text)) out.push("restock_inquiry");
  if (/문의|문의사항|질문|도움|상담/.test(text)) out.push("faq");
  if (/주소|배송지|수령인|연락처/.test(text)) out.push("order_change");
  if (/환불|취소|반품|교환/.test(text)) out.push("refund_request");
  if (out.length === 0) out.push("general");
  return Array.from(new Set(out));
}

export function intentLabel(intent: string) {
  switch (intent) {
    case "restock_inquiry":
      return "재입고 일정 안내";
    case "restock_subscribe":
      return "재입고 알림 신청";
    case "faq":
      return "일반 문의";
    case "order_change":
      return "배송지 변경";
    case "refund_request":
      return "취소/환불";
    default:
      return "기타 문의";
  }
}

export function isAddressChangeUtterance(text: string) {
  const v = String(text || "");
  return /(주소|배송지|수령지|받는\s*곳).*(바꿔|바꾸|변경|수정|고쳐|옮겨)|(?:바꿔|바꾸|변경|수정|고쳐|옮겨).*(주소|배송지|수령지|받는\s*곳)/.test(
    v
  );
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
  return /^(네|네요|예|예요|응|응응|맞아|맞아요|맞습니다|yes|y)$/.test(v);
}

export function isNoText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(아니|아니오|아니요|아뇨|no|n)$/.test(v);
}

export function isExecutionAffirmativeText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /(도와|도움|진행|해줘|해주세요|부탁|신청할래|신청할게|신청해|예약해|등록해|알림해|해볼게|할래요|할게요)/.test(v);
}

export function isEndConversationText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(대화\s*종료|종료|끝|그만|close|end)$/.test(v) || isNoText(v);
}

export function isOtherInquiryText(text: string) {
  const v = String(text || "").trim().toLowerCase();
  if (!v) return false;
  return /^(다른\s*문의|다른문의|추가\s*문의|계속|other|new)$/.test(v);
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
  if (/카카오|카톡/.test(v)) return "kakao";
  if (/이메일|메일|email/i.test(v)) return "email";
  if (/문자|sms/i.test(v)) return "sms";
  return null;
}

export function parseIndexedChoice(text: string) {
  const m = String(text || "").trim().match(/^(\d{1,2})\s*번?$/);
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
  if (/전체|all|모두/i.test(raw)) return [...available];
  const picked = Array.from(new Set((raw.match(/\d{1,2}/g) || []).map((v) => Number(v)).filter(Number.isFinite)));
  return picked.filter((n) => available.includes(n)).sort((a, b) => a - b);
}
