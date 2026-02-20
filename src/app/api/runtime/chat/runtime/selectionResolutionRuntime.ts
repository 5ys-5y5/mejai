import { parseActionToken, parseIndexedChoices } from "../policies/intentSlotPolicy";

type CandidateItem = Record<string, any>;

export type SelectionResolution = {
  entity: Record<string, string>;
  source: string | null;
};

const EXCLUDED_KEYS = new Set([
  "index",
  "value",
  "label",
  "title",
  "subtitle",
  "description",
  "fields",
  "image_url",
  "thumbnail_url",
  "raw_date",
  "display_label",
  "candidate_count",
]);

const KEY_ALIASES: Record<string, string> = {
  zip_no: "zipcode",
  zip: "zipcode",
  postal_code: "zipcode",
  road_addr: "address",
  road_address: "address",
  jibun_addr: "address",
  product_no: "product_id",
  productId: "product_id",
  order_no: "order_id",
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeScalar(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return null;
}

function mergePatchValue(base: Record<string, string>, key: string, value: string) {
  const prev = base[key];
  if (!prev) {
    base[key] = value;
    return;
  }
  if (prev === value) return;
  const merged = Array.from(new Set(`${prev},${value}`.split(",").map((v) => v.trim()).filter(Boolean)));
  base[key] = merged.join(",");
}

function buildEntityPatchFromCandidate(candidate: CandidateItem) {
  const patch: Record<string, string> = {};
  if (!candidate || typeof candidate !== "object") return patch;
  const explicit = candidate.entity_patch;
  if (explicit && typeof explicit === "object" && !Array.isArray(explicit)) {
    Object.entries(explicit as Record<string, unknown>).forEach(([key, value]) => {
      const normalized = normalizeScalar(value);
      if (!normalized) return;
      mergePatchValue(patch, key, normalized);
    });
    return patch;
  }
  Object.entries(candidate).forEach(([rawKey, value]) => {
    if (!rawKey) return;
    if (EXCLUDED_KEYS.has(rawKey)) return;
    if (rawKey.startsWith("_")) return;
    const normalized = normalizeScalar(value);
    if (!normalized) return;
    const mappedKey = KEY_ALIASES[rawKey] || rawKey;
    mergePatchValue(patch, mappedKey, normalized);
  });
  return patch;
}

function extractChoiceSources(prevBotContext: Record<string, any>) {
  const sources: Array<{ key: string; items: CandidateItem[]; priority: number }> = [];
  const seen = new Set<string>();
  const pushSource = (key: string, items: CandidateItem[], priority: number) => {
    if (!Array.isArray(items) || items.length === 0) return;
    if (seen.has(key)) return;
    seen.add(key);
    sources.push({ key, items, priority });
  };
  const responseSchema = prevBotContext?.response_schema;
  const choiceItems = Array.isArray(responseSchema?.choice_items)
    ? (responseSchema.choice_items as CandidateItem[])
    : [];
  pushSource("response_schema.choice_items", choiceItems, 1);
  pushSource("pending_candidates", prevBotContext?.pending_candidates, 2);
  pushSource("restock_candidates", prevBotContext?.restock_candidates, 3);
  pushSource("order_choices", prevBotContext?.order_choices, 4);
  Object.entries(prevBotContext || {}).forEach(([key, value]) => {
    if (seen.has(key)) return;
    if (!Array.isArray(value)) return;
    if (!key.endsWith("_candidates") && !key.endsWith("_choices")) return;
    const items = (value as CandidateItem[]).filter((item) => item && typeof item === "object");
    if (items.length === 0) return;
    pushSource(key, items, 5);
  });
  return sources.sort((a, b) => a.priority - b.priority);
}

function pickByValue(message: string, items: CandidateItem[]) {
  const tokens = message.split(/[,\s]+/).map((v) => v.trim()).filter(Boolean);
  if (tokens.length === 0) return [];
  const byValue = new Map<string, CandidateItem>();
  items.forEach((item) => {
    const value = normalizeText(item.value || item.id || item.index);
    if (value) byValue.set(value, item);
  });
  return tokens.map((token) => byValue.get(token)).filter(Boolean) as CandidateItem[];
}

function pickByIndex(message: string, items: CandidateItem[]) {
  const max = Math.max(1, items.length);
  const indices = parseIndexedChoices(message, max);
  if (indices.length === 0) return [];
  return indices
    .map((idx) => {
      const explicit = items.find((item) => Number(item.index) === idx);
      if (explicit) return explicit;
      return items[idx - 1];
    })
    .filter(Boolean) as CandidateItem[];
}

export function resolveSelectionFromPrevContext(input: {
  message: string;
  prevBotContext: Record<string, any>;
  expectedInputs: string[];
}): SelectionResolution {
  const message = normalizeText(input.message);
  const empty: SelectionResolution = { entity: {}, source: null };
  if (!message) return empty;
  if (parseActionToken(message)) return empty;
  const sources = extractChoiceSources(input.prevBotContext || {});
  if (sources.length === 0) return empty;
  let best: { entity: Record<string, string>; source: string } | null = null;
  for (const source of sources) {
    const byIndex = pickByIndex(message, source.items);
    const picked = byIndex.length > 0 ? byIndex : pickByValue(message, source.items);
    if (picked.length === 0) continue;
    const patch: Record<string, string> = {};
    picked.forEach((item) => {
      const next = buildEntityPatchFromCandidate(item);
      Object.entries(next).forEach(([key, value]) => {
        mergePatchValue(patch, key, value);
      });
    });
    if (Object.keys(patch).length === 0) continue;
    best = { entity: patch, source: source.key };
    break;
  }
  return best || empty;
}
