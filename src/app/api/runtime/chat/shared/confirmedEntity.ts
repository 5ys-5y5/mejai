const MAX_ARRAY_LENGTH = 50;
const MAX_OBJECT_KEYS = 50;

type ConfirmedValue = string | number | boolean | Array<string | number | boolean> | Record<string, string | number | boolean>;
export type ConfirmedEntity = Record<string, ConfirmedValue>;

const SKIP_PROMOTION_SUFFIXES = [
  "stage",
  "pending",
  "status",
  "candidates",
  "choices",
  "cards",
  "config",
  "rules",
  "actions",
  "policy",
  "prompt",
];

function isScalar(value: unknown): value is string | number | boolean {
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return false;
}

function isConfirmableValue(value: unknown): value is ConfirmedValue {
  if (isScalar(value)) return true;
  if (Array.isArray(value)) {
    if (value.length === 0 || value.length > MAX_ARRAY_LENGTH) return false;
    return value.every((item) => isScalar(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0 || entries.length > MAX_OBJECT_KEYS) return false;
    return entries.every(([, item]) => isScalar(item));
  }
  return false;
}

function normalizeConfirmableValue(value: unknown): ConfirmedValue | null {
  if (!isConfirmableValue(value)) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => (typeof item === "string" ? item.trim() : item));
  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, string | number | boolean> = {};
  entries.forEach(([key, item]) => {
    if (!isScalar(item)) return;
    next[key] = typeof item === "string" ? item.trim() : item;
  });
  return next;
}

export function normalizeConfirmedEntity(input: unknown): ConfirmedEntity {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const next: ConfirmedEntity = {};
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    const normalized = normalizeConfirmableValue(value);
    if (normalized === null) return;
    const safeKey = String(key || "").trim();
    if (!safeKey) return;
    next[safeKey] = normalized;
  });
  return next;
}

function shouldPromoteKey(baseKey: string) {
  const normalized = String(baseKey || "").trim();
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
  return !SKIP_PROMOTION_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

function extractPromotedFields(botContext: Record<string, any>) {
  const next: ConfirmedEntity = {};
  Object.entries(botContext || {}).forEach(([key, value]) => {
    if (!key.startsWith("pending_") && !key.startsWith("selected_")) return;
    const baseKey = key.replace(/^pending_/, "").replace(/^selected_/, "");
    if (!shouldPromoteKey(baseKey)) return;
    const normalized = normalizeConfirmableValue(value);
    if (normalized === null) return;
    if (!next[baseKey]) {
      next[baseKey] = normalized;
    }
  });
  return next;
}

export function deriveConfirmedEntityFromBotContext(botContext: Record<string, any>): ConfirmedEntity {
  const base = normalizeConfirmedEntity(botContext?.confirmed_entity);
  const fromEntity = normalizeConfirmedEntity(botContext?.entity);
  const promoted = extractPromotedFields(botContext || {});
  return mergeConfirmedEntity(base, fromEntity, promoted);
}

export function mergeConfirmedEntity(base: ConfirmedEntity, ...sources: Array<ConfirmedEntity | null | undefined>) {
  const next: ConfirmedEntity = { ...(base || {}) };
  sources.forEach((source) => {
    if (!source) return;
    Object.entries(source).forEach(([key, value]) => {
      const normalized = normalizeConfirmableValue(value);
      if (normalized === null) return;
      const safeKey = String(key || "").trim();
      if (!safeKey) return;
      next[safeKey] = normalized;
    });
  });
  return next;
}

export function stringifyConfirmedValue(value: ConfirmedValue, maxLength = 500) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
  }
  const raw = JSON.stringify(value);
  if (!raw) return null;
  return raw.length > maxLength ? `${raw.slice(0, maxLength - 1)}...` : raw;
}
