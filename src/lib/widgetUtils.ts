export function normalizeDomain(value: string) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export function extractHostFromUrl(value: string | null | undefined) {
  try {
    if (!value) return "";
    const url = new URL(value);
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function matchAllowedDomain(host: string, allowed: string[]) {
  const normalizedHost = normalizeDomain(host);
  if (!normalizedHost) return false;
  const normalizedAllowed = allowed.map((item) => normalizeDomain(item)).filter(Boolean);
  if (normalizedAllowed.length === 0) return false;
  return normalizedAllowed.some((rule) => {
    if (rule === normalizedHost) return true;
    if (rule.startsWith("*.")) {
      const suffix = rule.slice(1);
      return normalizedHost.endsWith(suffix);
    }
    return false;
  });
}
