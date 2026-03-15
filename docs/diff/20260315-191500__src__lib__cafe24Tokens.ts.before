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

function maskRefreshToken(value: string) {
  const token = String(value || "").trim();
  if (!token) return "";
  if (token.length <= 8) return `${token.slice(0, 2)}***${token.slice(-1)}`;
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

function isInvalidGrantError(message: string) {
  const text = String(message || "").toLowerCase();
  return text.includes("invalid_grant") || text.includes("invalid refresh_token") || text.includes("invalid_refresh_token");
}

async function requestCafe24TokenRefresh(input: {
  mallId: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const auth = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64");
  const res = await fetch(`https://${input.mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(input.refreshToken)}`,
  });
  const payloadText = await res.text();
  if (!res.ok) {
    return { ok: false as const, error: `Cafe24 refresh failed ${res.status}: ${payloadText}` };
  }
  const payload = JSON.parse(payloadText) as {
    access_token: string;
    refresh_token?: string;
    expires_at: string;
  };
  return { ok: true as const, payload };
}

async function readCafe24ProviderSnapshot(supabase: SupabaseClient, settingsId: string) {
  const { data, error } = await supabase
    .from("A_iam_auth_settings")
    .select("providers")
    .eq("id", settingsId)
    .maybeSingle();
  if (error || !data) return { providers: null as Record<string, Record<string, unknown> | undefined> | null, cafe24: null as Record<string, unknown> | null };
  const providers = (data.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  const cafe24 = (providers.cafe24 || {}) as Record<string, unknown>;
  return { providers, cafe24 };
}

function toRefreshTokenCandidates(input: {
  initialRefreshToken: string;
  latestRefreshToken: string;
  snapshotCandidates: unknown;
  envRefreshToken: string;
}) {
  const { initialRefreshToken, latestRefreshToken, snapshotCandidates, envRefreshToken } = input;
  const collected: string[] = [];
  const push = (value: unknown) => {
    const token = String(value || "").trim();
    if (!token) return;
    if (!collected.includes(token)) collected.push(token);
  };
  push(initialRefreshToken);
  push(latestRefreshToken);
  if (Array.isArray(snapshotCandidates)) {
    snapshotCandidates.forEach((candidate) => push(candidate));
  }
  push(envRefreshToken);
  return collected;
}

async function writeRefreshFailureAudit(input: {
  supabase: SupabaseClient;
  settingsId: string;
  providers: Record<string, Record<string, unknown> | undefined> | null;
  error: string;
  attemptedCandidates: string[];
}) {
  const { supabase, settingsId, providers, error, attemptedCandidates } = input;
  if (!providers) return;
  const currentCafe24 = (providers.cafe24 || {}) as Record<string, unknown>;
  providers.cafe24 = {
    ...currentCafe24,
    last_refresh_error: error,
    last_refresh_attempt_at: new Date().toISOString(),
    attempted_candidates: attemptedCandidates.map((token) => maskRefreshToken(token)).filter(Boolean),
  };
  await supabase
    .from("A_iam_auth_settings")
    .update({ providers, updated_at: new Date().toISOString() })
    .eq("id", settingsId);
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

  const snapshot = await readCafe24ProviderSnapshot(cfg.supabase, cfg.settingsId);
  const latestRefreshToken = String(snapshot.cafe24?.refresh_token || "").trim();
  const candidateTokens = toRefreshTokenCandidates({
    initialRefreshToken: cfg.refreshToken,
    latestRefreshToken,
    snapshotCandidates: snapshot.cafe24?.refresh_token_candidates,
    envRefreshToken: readEnv("CAFE24_REFRESH_TOKEN"),
  });

  let payload:
    | {
        access_token: string;
        refresh_token?: string;
        expires_at: string;
      }
    | null = null;
  let usedRefreshToken = "";
  let lastError = "Cafe24 refresh failed: no token candidates";

  for (const tokenCandidate of candidateTokens) {
    const attempt = await requestCafe24TokenRefresh({
      mallId: cfg.mallId,
      refreshToken: tokenCandidate,
      clientId,
      clientSecret,
    });
    if (attempt.ok) {
      payload = attempt.payload;
      usedRefreshToken = tokenCandidate;
      lastError = "";
      break;
    }
    lastError = attempt.error;
    if (!isInvalidGrantError(attempt.error)) {
      break;
    }
  }

  if (!payload) {
    await writeRefreshFailureAudit({
      supabase: cfg.supabase,
      settingsId: cfg.settingsId,
      providers: snapshot.providers,
      error: lastError,
      attemptedCandidates: candidateTokens,
    });
    return { ok: false as const, error: lastError };
  }

  const { data: settingsRow, error: settingsError } = await cfg.supabase
    .from("A_iam_auth_settings")
    .select("providers")
    .eq("id", cfg.settingsId)
    .maybeSingle();
  if (settingsError || !settingsRow) {
    return { ok: false as const, error: "Auth settings not found" };
  }
  const providers = (settingsRow.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  const current = (providers.cafe24 || {}) as Record<string, unknown>;
  const existingCandidates = Array.isArray(current.refresh_token_candidates) ? current.refresh_token_candidates : [];
  const nextCandidates = toRefreshTokenCandidates({
    initialRefreshToken: String(payload.refresh_token || "").trim(),
    latestRefreshToken: usedRefreshToken,
    snapshotCandidates: existingCandidates,
    envRefreshToken: "",
  }).slice(0, 8);
  const next = {
    ...current,
    access_token: payload.access_token,
    refresh_token: String(payload.refresh_token || usedRefreshToken || "").trim(),
    expires_at: payload.expires_at,
    refresh_token_candidates: nextCandidates,
    last_refresh_error: null,
    last_refresh_attempt_at: new Date().toISOString(),
    attempted_candidates: [],
  };
  providers.cafe24 = next;
  const { error } = await cfg.supabase
    .from("A_iam_auth_settings")
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
