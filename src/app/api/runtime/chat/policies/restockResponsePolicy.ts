import { runLlm } from "@/lib/llm_mk2";

import { CHAT_PRINCIPLES } from "./principles";
import { normalizeAddressText } from "../shared/slotUtils";



type RestockScheduleEntry = {

  product_name: string;

  month: number;

  day: number;

  raw_date: string;

  source: string;

};



export function normalizeKoreanMatchText(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripRestockNoise(input: string) {
  return normalizeKoreanMatchText(input)
    .replace(/(재입고|입고|일정|언제|알고싶|알려|제품|상품|문의|확인|요|입니다|이에요|해요)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKoreanQueryToken(token: string) {
  const v = normalizeKoreanMatchText(token);
  if (!v) return "";
  return v.replace(/(은|는|이|가|을|를|와|과|도|에|에서|으로|로|랑|이나|나|만)$/g, "");
}

export function extractRestockSectionLines(content: string) {
  const lines = String(content || "").split(/\r?\n/);
  const section: string[] = [];
  let inRestockSection = false;
  for (const raw of lines) {
    const line = String(raw || "");
    const heading = line.match(/^\s*#{1,6}\s*(.+?)\s*$/);
    if (heading) {
      const title = heading[1].trim();
      inRestockSection = /재입고/.test(title);
      continue;
    }
    if (inRestockSection) section.push(line);
  }
  return section.length > 0 ? section : lines;
}

export function parseRestockEntriesFromContent(content: string, source: string): RestockScheduleEntry[] {
  const lines = extractRestockSectionLines(content);
  const out: RestockScheduleEntry[] = [];
  for (const raw of lines) {
    const line = String(raw || "")
      .replace(/^\s*[-*•\d.)]+\s*/, "")
      .trim();
    if (!line) continue;
    const m = line.match(/^(.*?)\s+(\d{1,2})\/(\d{1,2})(?:\D.*)?$/);
    if (!m) continue;
    const productName = m[1].trim();
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!productName || !Number.isFinite(month) || !Number.isFinite(day)) continue;
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    out.push({
      product_name: productName,
      month,
      day,
      raw_date: `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
      source,
    });
  }
  const dedup = new Map<string, RestockScheduleEntry>();
  out.forEach((item) => {
    const key = `${normalizeKoreanMatchText(item.product_name)}|${item.raw_date}`;
    if (!dedup.has(key)) dedup.set(key, item);
  });
  return Array.from(dedup.values());
}

export function rankRestockEntries(queryText: string, entries: RestockScheduleEntry[]) {
  const query = stripRestockNoise(queryText);
  const queryTokens = query
    .split(" ")
    .map((t) => normalizeKoreanQueryToken(t))
    .filter((t) => t.length > 0);
  const queryNoSpace = queryTokens.join("");
  return entries
    .map((entry) => {
      const name = normalizeKoreanMatchText(entry.product_name);
      const nameNoSpace = name.replace(/\s+/g, "");
      let score = 0;
      if (queryNoSpace && nameNoSpace.includes(queryNoSpace)) score += 4;
      if (queryNoSpace && queryNoSpace.includes(nameNoSpace)) score += 2;
      if (queryTokens.length > 0) {
        const matched = queryTokens.filter((t) => t && name.includes(t)).length;
        score += matched * 1.5;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, CHAT_PRINCIPLES.response.choicePreviewMax);
}

export function findBestRestockEntryByProductName(productName: string, entries: RestockScheduleEntry[]) {
  const ranked = rankRestockEntries(productName, entries);
  if (ranked.length <= 0) return null;

  const best = ranked[0].entry;
  const productNorm = stripRestockNoise(productName);
  const entryNorm = stripRestockNoise(best.product_name);
  const productNoSpace = productNorm.replace(/\s+/g, "");
  const entryNoSpace = entryNorm.replace(/\s+/g, "");

  // Strong exact-ish containment: safe to attach KB schedule.
  if (productNoSpace && entryNoSpace && (productNoSpace.includes(entryNoSpace) || entryNoSpace.includes(productNoSpace))) {
    return best;
  }

  // Otherwise require substantial token overlap to avoid brand-only false matches.
  const tokens = (s: string) => s.split(" ").map((v) => v.trim()).filter((v) => v.length >= 2);
  const productTokens = new Set(tokens(productNorm));
  const entryTokens = new Set(tokens(entryNorm));
  if (productTokens.size === 0 || entryTokens.size === 0) return null;

  const overlap = Array.from(productTokens).filter((t) => entryTokens.has(t)).length;
  const productCoverage = overlap / productTokens.size;
  const entryCoverage = overlap / entryTokens.size;

  if (overlap >= 2 && (productCoverage >= 0.5 || entryCoverage >= 0.5)) {
    return best;
  }
  return null;
}

export function toRestockDueText(month: number, day: number, now = new Date()) {
  const year = now.getFullYear();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(year, month - 1, day);
  if (target.getTime() < base.getTime() - 1000 * 60 * 60 * 24 * 120) {
    target = new Date(year + 1, month - 1, day);
  }
  const diffDays = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  const targetText = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
  const dday = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)}`;
  return { targetText, dday, diffDays };
}

export function buildRestockFinalAnswerWithChoices(
  productName: string,
  due: { targetText: string; dday: string; month?: number; day?: number }
) {
  const mmddMatch = due.targetText.match(/^\d{4}-(\d{2})-(\d{2})$/);
  const mmdd = mmddMatch ? `${mmddMatch[1]}/${mmddMatch[2]}` : due.targetText;
  return `요약: ${productName} 입고 예정일 ${mmdd}입니다.\n상세: 예정일 ${due.targetText} (${due.dday})\n다음 선택: 재입고 알림 신청 / 대화 종료`;
}

export function readProductShape(raw: unknown) {
  const root = (raw || {}) as Record<string, any>;
  const fromProduct = (root.product || {}) as Record<string, any>;
  const fromProducts =
    Array.isArray((root as { products?: unknown }).products) &&
    ((root as { products?: unknown }).products as Array<unknown>).length > 0
      ? (((root as { products?: unknown }).products as Array<unknown>)[0] as Record<string, any>)
      : null;
  const product = (Object.keys(fromProduct).length > 0 ? fromProduct : fromProducts) || root;
  const productRecord = product as Record<string, any>;
  const productName = String(
    productRecord.product_name ||
      productRecord.product_name_default ||
      productRecord.name ||
      ""
  ).trim();
  const rawQty =
    productRecord.stock_quantity ??
    productRecord.quantity ??
    productRecord.total_stock ??
    productRecord.stock;
  const qtyNum =
    rawQty === null || rawQty === undefined || rawQty === ""
      ? null
      : Number(String(rawQty).replace(/,/g, ""));
  const soldOutRaw = String(
    productRecord.sold_out ??
      productRecord.soldout ??
      productRecord.is_soldout ??
      ""
  )
    .trim()
    .toUpperCase();
  const soldOut =
    soldOutRaw === "T" ||
    soldOutRaw === "TRUE" ||
    soldOutRaw === "Y" ||
    soldOutRaw === "1" ||
    (Number.isFinite(qtyNum as number) && (qtyNum as number) <= 0);
  const thumbnailUrl = String(
    productRecord.tiny_image ||
      productRecord.small_image ||
      productRecord.list_image ||
      productRecord.image_url ||
      productRecord.detail_image ||
      ""
  ).trim();
  return {
    productName,
    qty: Number.isFinite(qtyNum as number) ? (qtyNum as number) : null,
    soldOut,
    thumbnailUrl,
  };
}

export function normalizeOrderChangeAddressPrompt(intent: string, text: string) {
  if (intent !== "order_change") return text;
  if (!/우편번호/.test(text)) return text;
  return "배송지 변경을 위해 새 주소를 알려주세요. 예) 주소: 서울시 ...";
}

export function isOrderChangeZipcodeTemplateText(text: string) {
  const v = normalizeAddressText(text);
  if (!v) return false;
  if (!/배송지\s*변경/.test(v)) return false;
  return /우편번호/.test(v) || /새\s*주소/.test(v);
}

export async function generateAlternativeRestockConsentQuestion(input: {
  intent: string;
  alternativesCount: number;
  userQuery: string;
  model?: "chatgpt" | "gemini";
}) {
  const count = Math.max(1, Number(input.alternativesCount || 1));
  const fallback = `요청하신 상품은 현재 재입고 일정 안내 대상에 없습니다.\n재입고 일정이 있는 제품에 대한 정보를 확인하시겠습니까? (가능 항목 ${count}개)`;
  const prompt = `Generate one concise Korean question for customer support chat.
Context:
- user_intent: ${String(input.intent || "").trim() || "unknown"}
- user_query: ${String(input.userQuery || "").trim() || "-"}
- available_alternative_count: ${count}
Rules:
1) Do not reveal alternative product names.
2) Clearly say the requested product is not in target.
3) Ask consent to check alternative products.
4) Keep to max 2 lines.
Return plain text only.`;
  try {
    const res = await runLlm(input.model || "chatgpt", [
      { role: "system", content: "You generate deterministic, concise Korean CX prompts. No markdown." },
      { role: "user", content: prompt },
    ]);
    const text = String(res.text || "").replace(/\r/g, "").trim();
    if (!text) return fallback;
    const sanitized = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join("\n");
    return sanitized || fallback;
  } catch {
    return fallback;
  }
}

export async function extractEntitiesWithLlm(text: string, model: "chatgpt" | "gemini") {
  const prompt = `Extract entities from the text. Return JSON only.
Text: "${text}"
Output Schema: { "order_id": string | null, "phone": string | null, "address": string | null, "intent": string | null }`;

  try {
    const res = await runLlm(model, [
      { role: "system", content: "You are a precise entity extractor. Return valid JSON only. do not use markdown code block." },
      { role: "user", content: prompt },
    ]);
    const cleanJson = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch {
    return null;
  }
}

