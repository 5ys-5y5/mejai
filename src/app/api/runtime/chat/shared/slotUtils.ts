import type { ProductAliasRow } from "./types";

export function isValidLlm(value?: string | null) {
  return value === "chatgpt" || value === "gemini";
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeMatchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchAliasText(text: string, alias: string, matchType: ProductAliasRow["match_type"]) {
  const hay = normalizeMatchText(text);
  const needle = normalizeMatchText(alias);
  if (!needle) return false;
  if (matchType === "exact") return hay === needle;
  if (matchType === "contains") return hay.includes(needle);
  if (matchType === "regex") {
    try {
      return new RegExp(alias, "i").test(text);
    } catch {
      return false;
    }
  }
  return false;
}

export function chooseBestAlias(text: string, aliases: ProductAliasRow[]) {
  const candidates = aliases.filter((row) => matchAliasText(text, row.alias, row.match_type));
  if (candidates.length === 0) return null;
  const scored = candidates.map((row) => ({
    row,
    priority: row.priority ?? 0,
    length: row.alias.length,
  }));
  scored.sort((a, b) => b.priority - a.priority || b.length - a.length);
  return scored[0].row;
}

export function extractChannel(text: string) {
  if (/카카오|카톡|kakao/i.test(text)) return "kakao";
  if (/문자|sms/i.test(text)) return "sms";
  if (/이메일|email|메일/i.test(text)) return "email";
  return null;
}

export function extractPhone(text: string) {
  const digits = text.replace(/[^\d]/g, "");
  if (digits.length >= 10 && digits.length <= 11) return digits;
  return null;
}

export function maskPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "-";
  if (digits.length <= 4) return `***${digits}`;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function normalizePhoneDigits(value: string | null | undefined) {
  return String(value || "").replace(/[^\d]/g, "");
}

export function extractOtpCode(text: string) {
  const match = text.match(/\b\d{4,8}\b/);
  return match ? match[0] : null;
}

export function extractOrderId(text: string) {
  const labeled = text.match(/(?:주문번호|order)[^\dA-Za-z]{0,10}([0-9A-Za-z\-]{6,30})/i);
  if (labeled) return labeled[1];
  const hyphenId = text.match(/\b\d{4,12}-\d{3,12}(?:-\d{1,6})?\b/);
  if (hyphenId) return hyphenId[0];
  const plain = text.match(/\b\d{6,20}\b/);
  if (!plain) return null;
  const digits = plain[0];
  if (/^01\d{8,9}$/.test(digits)) return null;
  return digits;
}

export function isLikelyOrderId(value: string | null | undefined) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (/[가-힣\s]/.test(v)) return false;
  if (/^01\d{8,9}$/.test(v)) return false;
  // Guard against OTP/short numeric values being treated as order ids.
  if (/^\d{6,20}$/.test(v)) return v.length >= 12;
  if (/^\d{4,12}-\d{3,12}(?:-\d{1,6})?$/.test(v)) return true;
  if (/^[0-9A-Za-z\-]{6,30}$/.test(v)) return true;
  return false;
}

export function isInvalidOrderIdError(errorText: string | null | undefined) {
  const text = String(errorText || "").toLowerCase();
  return text.includes("invalid order number") || text.includes("parameter.order_id");
}

export function extractZipcode(text: string) {
  const match = text.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

export function isLikelyZipcode(value: string | null | undefined) {
  return /^\d{5}$/.test(String(value || "").trim());
}

export function parseAddressParts(text: string) {
  const zipcode = extractZipcode(text);
  let cleaned = text.replace(/\(\s*\d{5}\s*\)/g, " ").replace(/\b\d{5}\b/g, " ");
  cleaned = cleaned.replace(/^(주소|배송지)\s*[:\-]?\s*/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (!cleaned) return { zipcode, address1: "", address2: "" };
  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    const address2 = tokens.pop() || "";
    const address1 = tokens.join(" ");
    return { zipcode, address1, address2 };
  }
  return { zipcode, address1: cleaned, address2: "" };
}

export function normalizeAddressText(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function cleanAddressCandidate(text: string) {
  let v = normalizeAddressText(text);
  if (!v) return "";
  // "배송지를", "주소를" 같은 목적격 조사 제거
  v = v.replace(/^(?:배송지|주소)?\s*(?:를|을)\s*/g, "");
  // "으로/로 바꾸고 싶어요" 류의 의도 표현 제거
  v = v.replace(
    /\s*(?:으로|로)?\s*(?:바꿔|바꾸|변경|수정|고쳐|옮겨)(?:\S*\s*)*(?:주세요|줘요|줘|요|싶어요|싶습니다|원해요|원합니다)?[.!?~]*$/g,
    ""
  );
  v = v.replace(/[,.!?~]+$/g, "").trim();
  return v;
}

export function hasKoreanAddressCue(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return false;
  // NOTE: Avoid \b with Korean text; it can miss valid matches in JS.
  return /[가-힣]{2,}(시|도|군|구|동|로|길|읍|면)(\s|$)/.test(v);
}

export function isLikelyAddressDetailOnly(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return false;
  // full addresses usually contain one of these location tokens.
  if (hasKoreanAddressCue(v)) return false;
  return /(?:[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*(?:호|층|실|동)?|\b\d{1,5}\b)/.test(v);
}

export function extractAddressDetail(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return "";
  const detailMatch = v.match(
    /((?:\d+\s*동\s*)?(?:[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*(?:호|층|실)?|\d{1,5}))$/i
  );
  if (detailMatch) return normalizeAddressText(detailMatch[1]);
  const matches = Array.from(
    v.matchAll(/(?:\d+\s*동\s*[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*호|\d+\s*동|[A-Za-z]?\d{1,5}(?:-[A-Za-z0-9]{1,5})?\s*(?:호|층|실)?|\b\d{1,5}\b)/gi)
  );
  if (matches.length > 0) {
    return normalizeAddressText(matches[matches.length - 1][0]);
  }
  return "";
}

export function splitAddressForUpdate(
  rawAddress: string,
  opts?: {
    baseAddress?: string | null;
    fallbackBaseAddress?: string | null;
    baseAddressCandidates?: Array<string | null | undefined>;
  }
) {
  const raw = normalizeAddressText(rawAddress);
  const parsed = parseAddressParts(raw);
  const baseAddress = normalizeAddressText(opts?.baseAddress || "");
  const fallbackBaseAddress = normalizeAddressText(opts?.fallbackBaseAddress || "");
  const candidateBases = [
    baseAddress,
    ...(Array.isArray(opts?.baseAddressCandidates) ? opts!.baseAddressCandidates : []),
    fallbackBaseAddress,
  ]
    .map((value) => normalizeAddressText(String(value || "")))
    .filter(Boolean);
  const chosenBase = candidateBases[0] || "";
  const candidateTerminalTokens = new Set(
    candidateBases
      .map((value) => {
        const tokens = value.split(" ").filter(Boolean);
        return normalizeAddressText(tokens[tokens.length - 1] || "");
      })
      .filter(Boolean)
  );

  if (chosenBase) {
    const detailFromSuffix = raw.startsWith(chosenBase)
      ? normalizeAddressText(raw.slice(chosenBase.length))
      : "";
    const extractedDetail = normalizeAddressText(extractAddressDetail(raw) || "");
    const hasExplicitUnitMarker = /(호|층|실|동)$/i.test(extractedDetail) || /(호|층|실|동)\b/i.test(raw);
    const extractedLooksLikeLotOnly = /^\d{1,5}(?:-\d{1,5})?$/.test(extractedDetail);
    const detailFromParsed = isLikelyAddressDetailOnly(raw) ? normalizeAddressText(parsed.address2) : "";
    let detail = detailFromSuffix || extractedDetail || detailFromParsed;
    if (candidateTerminalTokens.has(normalizeAddressText(detail))) {
      detail = "";
    }
    if (!hasExplicitUnitMarker && extractedLooksLikeLotOnly && !isLikelyAddressDetailOnly(raw)) {
      detail = detailFromSuffix || "";
    }
    return {
      zipcode: parsed.zipcode,
      address1: chosenBase,
      address2: detail,
    };
  }

  if (isLikelyAddressDetailOnly(raw) && fallbackBaseAddress) {
    const detail = extractAddressDetail(raw) || raw;
    return {
      zipcode: parsed.zipcode,
      address1: fallbackBaseAddress,
      address2: detail,
    };
  }

  return parsed;
}

export function buildLookupOrderArgs(orderId: string, customerVerificationToken: string | null) {
  const args: Record<string, unknown> = { order_id: orderId };
  if (customerVerificationToken) {
    args.customer_verification_token = customerVerificationToken;
  }
  return args;
}

export function readLookupOrderView(payload: unknown) {
  const order = payload && typeof payload === "object" ? ((payload as any).order || {}) : {};
  const core = order?.core && typeof order.core === "object" ? order.core : order;
  const summary =
    order?.summary && typeof order.summary === "object"
      ? order.summary
      : (order?.order_summary && typeof order.order_summary === "object" ? order.order_summary : {});
  const items =
    (Array.isArray(order?.items) && order.items) ||
    (Array.isArray(order?.order_items) && order.order_items) ||
    (Array.isArray(order?.order_item) && order.order_item) ||
    (Array.isArray(order?.products) && order.products) ||
    [];
  return { order, core, summary, items };
}

export function extractAddress(text: string, orderId: string | null, phone: string | null, zipcode: string | null) {
  const keywordMatch = text.search(/주소|배송지/);
  const hasKoreanAddressToken = hasKoreanAddressCue(text);
  const hasZip = Boolean(zipcode || /\(\s*\d{5}\s*\)/.test(text));
  if (keywordMatch === -1 && !hasKoreanAddressToken && !hasZip) return null;
  let segment = keywordMatch === -1 ? text : text.slice(keywordMatch);
  if (keywordMatch !== -1) {
    segment = segment.replace(/^(주소|배송지)\s*[:\-]?\s*/g, "");
  }
  if (orderId) segment = segment.replace(orderId, " ");
  if (phone) segment = segment.replace(phone, " ");
  if (zipcode) segment = segment.replace(zipcode, " ");
  segment = segment.replace(/주문번호[^\s]*/gi, " ");
  segment = cleanAddressCandidate(segment);
  if (!segment) return null;
  if (!hasKoreanAddressCue(segment) && !isLikelyAddressDetailOnly(segment) && segment.length < 8) return null;
  return segment;
}

export function extractChoiceIndex(text: string, max: number) {
  const match = text.match(/(?:^|\s)(\d{1,2})(?:\s*번|\s*번째)?/);
  if (!match) return null;
  const idx = Number(match[1]);
  if (!Number.isFinite(idx) || idx < 1 || idx > max) return null;
  return idx;
}

export function findRecentEntity(turns: Array<Record<string, unknown>>) {
  for (const turn of turns) {
    const botContext = (turn.bot_context || {}) as Record<string, unknown>;
    const selectedOrderId =
      typeof botContext.selected_order_id === "string" ? botContext.selected_order_id : null;
    const transcript = typeof turn.transcript_text === "string" ? turn.transcript_text : "";
    const orderId = extractOrderId(transcript);
    const phone = extractPhone(transcript);
    const zipcode = extractZipcode(transcript);
    const address = extractAddress(transcript, orderId, phone, zipcode);
    if (selectedOrderId || orderId || phone || address || zipcode) {
      return {
        order_id: selectedOrderId || orderId,
        phone,
        address,
        zipcode,
      };
    }
  }
  return null;
}
