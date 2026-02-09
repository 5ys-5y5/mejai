export const SAMPLE_KB_MODE = "sample";

export function isSampleKbValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === SAMPLE_KB_MODE;
}

export function isAdminKbValue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "admin";
}

export function isSampleKbRow(row: { is_sample?: unknown } | null | undefined): boolean {
  if (!row) return false;
  return row.is_sample === true;
}
