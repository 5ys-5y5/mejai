import type { SupabaseClient } from "@supabase/supabase-js";

export function isTokenExpired(expiresAt: string, skewMs = 30_000) {
  const exp = Date.parse(expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp <= Date.now() + skewMs;
}

export function isExpiringSoon(expiresAt: string, windowMs = 45 * 60_000) {
  const exp = Date.parse(expiresAt);
  if (Number.isNaN(exp)) return true;
  return exp <= Date.now() + windowMs;
}

function readEnv(name: string) {
  return (process.env[name] || "").trim();
}

export async function refreshCafe24Token(cfg: {
  settingsId: string;
  mallId: string;
  refreshToken: string;
  supabase: SupabaseClient;
}) {
  const clientId = readEnv("CAFE24_CLIENT_ID");
  const clientSecret = readEnv("CAFE24_CLIENT_SECRET_KEY");
  if (!clientId || !clientSecret) {
    return { ok: false as const, error: "Missing CAFE24_CLIENT_ID/CAFE24_CLIENT_SECRET_KEY" };
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`https://${cfg.mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(cfg.refreshToken)}`,
  });
  const payloadText = await res.text();
  if (!res.ok) {
    return { ok: false as const, error: `Cafe24 refresh failed ${res.status}: ${payloadText}` };
  }
  const payload = JSON.parse(payloadText) as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
  const { data: settingsRow, error: settingsError } = await cfg.supabase
    .from("auth_settings")
    .select("providers")
    .eq("id", cfg.settingsId)
    .maybeSingle();
  if (settingsError || !settingsRow) {
    return { ok: false as const, error: "Auth settings not found" };
  }
  const providers = (settingsRow.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  const current = (providers.cafe24 || {}) as Record<string, unknown>;
  const next = {
    ...current,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at,
  };
  providers.cafe24 = next;
  const { error } = await cfg.supabase
    .from("auth_settings")
    .update({
      providers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cfg.settingsId);
  if (error) {
    return { ok: false as const, error: `Token update failed: ${error.message}` };
  }
  return { ok: true as const, accessToken: payload.access_token };
}
