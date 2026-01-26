export const DEFAULT_RAG_LIMIT_BYTES = 1024 * 1024;

export function getRagLimitBytes(plan?: string | null) {
  switch ((plan || "").toLowerCase()) {
    case "starter":
      return 1024 * 1024;
    case "pro":
      return 5 * 1024 * 1024;
    case "business":
      return 20 * 1024 * 1024;
    case "enterprise":
      return 100 * 1024 * 1024;
    default:
      return DEFAULT_RAG_LIMIT_BYTES;
  }
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function calcUtf8Bytes(value?: string | null) {
  if (!value) return 0;
  return new TextEncoder().encode(value).length;
}

export function calcRagUsageBytes(items: Array<{ content?: string | null }>) {
  return items.reduce((sum, item) => sum + calcUtf8Bytes(item.content), 0);
}
