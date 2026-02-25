import { NextRequest, NextResponse } from "next/server";
import { applyManagedEnvOverrides } from "@/lib/managedEnv";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePhone(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function toE164Phone(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) {
    const digits = normalizePhone(raw);
    return digits ? `+${digits}` : "";
  }
  const digits = normalizePhone(raw);
  if (!digits) return "";
  if (digits.startsWith("82")) {
    return `+${digits}`;
  }
  if (digits.startsWith("0")) {
    return `+82${digits.slice(1)}`;
  }
  return `+${digits}`;
}

function logStep(step: string, detail?: Record<string, unknown>) {
  const payload = detail ? JSON.stringify(detail) : "";
  console.info(`[signup_proxy] ${step}${payload ? ` ${payload}` : ""}`);
}

function maskEmail(value: string) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || !raw.includes("@")) return raw ? "***" : "";
  const [local, domain] = raw.split("@");
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}${"*".repeat(Math.max(0, local.length - prefix.length))}@${domain}`;
}

function maskKey(value: string) {
  const raw = String(value || "");
  if (!raw) return "";
  return `${raw.slice(0, 6)}***${raw.slice(-4)}`;
}

async function sendInviteEmail(email: string, redirectTo?: string | null) {
  const supabaseAdmin = createAdminSupabaseClient();
  const options = redirectTo ? { redirectTo } : undefined;
  return supabaseAdmin.auth.admin.inviteUserByEmail(email, options);
}

async function logSignupFailure(payload: {
  email: string;
  status: number;
  error: string | null;
  requestId: string | null;
}) {
  try {
    const supabaseAdmin = createAdminSupabaseClient();
    await supabaseAdmin.from("F_audit_events").insert({
      session_id: null,
      turn_id: null,
      event_type: "AUTH_SIGNUP_FAILED",
      payload: {
        email_masked: maskEmail(payload.email),
        status: payload.status,
        error: payload.error,
        request_id: payload.requestId,
      },
      created_at: new Date().toISOString(),
      bot_context: { source: "signup_proxy" },
    });
  } catch {
    // ignore audit failures
  }
}

function readSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAuthHealth(env: { url: string; anonKey: string }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const startedAt = Date.now();
  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
      },
      signal: controller.signal,
    });
    logStep("health_check", {
      status: res.status,
      elapsed_ms: Date.now() - startedAt,
    });
    return res.ok;
  } catch (error) {
    logStep("health_check_error", {
      error: error instanceof Error ? error.message : String(error),
      elapsed_ms: Date.now() - startedAt,
    });
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verifySignupPhone(params: { phone: string; verificationToken: string }) {
  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch {
    return { ok: false, error: "ADMIN_SUPABASE_INIT_FAILED" };
  }

  const { data, error } = await supabaseAdmin
    .from("H_auth_otp_verifications_guest")
    .select("destination, verified_at")
    .eq("verification_token", params.verificationToken)
    .maybeSingle();

  if (error || !data || !data.verified_at) {
    return { ok: false, error: "PHONE_NOT_VERIFIED" };
  }

  const verifiedPhone = normalizePhone(String((data as Record<string, unknown>).destination || ""));
  if (!verifiedPhone) {
    return { ok: false, error: "VERIFIED_PHONE_MISSING" };
  }

  const inputPhone = normalizePhone(params.phone);
  if (!inputPhone || inputPhone !== verifiedPhone) {
    return { ok: false, error: "PHONE_MISMATCH" };
  }

  return { ok: true };
}

async function updateSignupUserPhone(userId: string, phone: string) {
  if (!isUuidLike(userId)) return { ok: false, error: "INVALID_USER_ID" };
  const normalizedPhone = normalizePhone(phone);
  const e164Phone = toE164Phone(phone);
  if (!normalizedPhone || !e164Phone) return { ok: false, error: "PHONE_REQUIRED" };

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch {
    return { ok: false, error: "ADMIN_SUPABASE_INIT_FAILED" };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    phone: e164Phone,
    user_metadata: {
      phone: normalizedPhone,
      phone_verified: true,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

async function callSignupApi(payload: Record<string, any>, timeoutMs: number, env: { url: string; anonKey: string }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const res = await fetch(`${env.url}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
        "X-Client-Info": "mejai-signup-proxy/1.0",
        "User-Agent": "mejai-signup-proxy/1.0",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const requestId = res.headers.get("sb-request-id");
    const text = await res.text();
    let data: Record<string, any> | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text ? { message: text } : null;
    }
    logStep("supabase_response", {
      status: res.status,
      request_id: requestId,
      elapsed_ms: Date.now() - startedAt,
      has_body: Boolean(text),
    });
    return { ok: res.ok, status: res.status, data, requestId };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  logStep("start");
  await applyManagedEnvOverrides("global");
  const env = readSupabaseEnv();
  if (!env.url || !env.anonKey) {
    logStep("env_missing", { url: Boolean(env.url), anon: Boolean(env.anonKey) });
    return NextResponse.json({ error: "SUPABASE_ENV_MISSING" }, { status: 500 });
  }
  logStep("env_loaded", { url: env.url, anon_key: maskKey(env.anonKey) });
  logStep("proxy_env", {
    http_proxy: Boolean(process.env.HTTP_PROXY),
    https_proxy: Boolean(process.env.HTTPS_PROXY),
    no_proxy: Boolean(process.env.NO_PROXY),
  });

  const healthOk = await checkAuthHealth(env);
  if (!healthOk) {
    return NextResponse.json({ error: "SUPABASE_HEALTH_CHECK_FAILED" }, { status: 502 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    logStep("invalid_body");
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const email = String(body.email || "").trim();
  const password = String(body.password || "").trim();
  const phone = String(body.phone || "").trim();
  const verificationToken = String(body.verification_token || "").trim();
  const redirectTo = String(body.redirect_to || "").trim();
  if (!email || !password) {
    logStep("missing_credentials", { email: Boolean(email), password: Boolean(password) });
    return NextResponse.json({ error: "EMAIL_PASSWORD_REQUIRED" }, { status: 400 });
  }
  if (!phone || !verificationToken) {
    logStep("missing_phone_verification", { phone: Boolean(phone), token: Boolean(verificationToken) });
    return NextResponse.json({ error: "PHONE_VERIFICATION_REQUIRED" }, { status: 400 });
  }

  const verification = await verifySignupPhone({ phone, verificationToken });
  if (!verification.ok) {
    logStep("phone_verification_failed", { error: verification.error });
    return NextResponse.json({ error: verification.error || "PHONE_VERIFICATION_FAILED" }, { status: 400 });
  }

  logStep("payload_ready", { email_masked: maskEmail(email), has_redirect: Boolean(redirectTo) });

  const payload = {
    email,
    password,
    ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
  };

  const maxAttempts = 3;
  let lastError: Record<string, any> | null = null;
  let lastStatus = 504;
  let lastRequestId: string | null = null;
  let sawAbort = false;
  let sawRateLimit = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logStep("attempt_start", { attempt });
      const result = await callSignupApi(payload, 120000, env);
      if (result.ok) {
        const createdUserId =
          String((result.data as Record<string, any>)?.user?.id || (result.data as Record<string, any>)?.id || "").trim();
        if (createdUserId) {
          const updateResult = await updateSignupUserPhone(createdUserId, phone);
          if (!updateResult.ok) {
            logStep("phone_update_failed", { user_id: createdUserId, error: updateResult.error });
            return NextResponse.json({ error: "PHONE_UPDATE_FAILED" }, { status: 500 });
          }
        } else {
          logStep("phone_update_skipped", { reason: "missing_user_id" });
        }
        logStep("success", { request_id: result.requestId, attempt });
        return NextResponse.json({ ok: true });
      }
      lastError = result.data || { message: "SIGNUP_FAILED" };
      lastStatus = result.status;
      lastRequestId = result.requestId || null;
      logStep("attempt_failed", {
        attempt,
        status: result.status,
        request_id: result.requestId,
        error: lastError?.message || null,
      });
      await logSignupFailure({
        email,
        status: result.status,
        error: lastError?.message || null,
        requestId: result.requestId || null,
      });
      if (result.status === 429) {
        sawRateLimit = true;
        return NextResponse.json(
          {
            error: "EMAIL_RATE_LIMIT",
            message: lastError?.message || "email rate limit exceeded",
            request_id: result.requestId || null,
          },
          { status: 429 }
        );
      }
      if (result.status !== 504 && result.status !== 429) {
        return NextResponse.json({ error: lastError.message || "SIGNUP_FAILED", request_id: result.requestId || null }, { status: result.status });
      }
    } catch (error) {
      lastError = { message: error instanceof Error ? error.message : "NETWORK_ERROR" };
      lastStatus = 502;
      sawAbort = error instanceof Error && error.name === "AbortError";
      logStep("attempt_exception", {
        attempt,
        error: lastError.message,
        error_name: error instanceof Error ? error.name : "UnknownError",
        timeout_ms: 120000,
      });
      await logSignupFailure({
        email,
        status: 502,
        error: lastError?.message || null,
        requestId: null,
      });
    }
    if (attempt < maxAttempts) {
      logStep("attempt_retry_wait", { attempt });
      const backoff = sawRateLimit ? 1500 * attempt : 400 * attempt;
      await sleep(backoff);
    }
  }

  if (sawAbort) {
    logStep("fallback_invite_start", { email_masked: maskEmail(email) });
    try {
      const inviteResult = await sendInviteEmail(email, redirectTo || null);
      logStep("fallback_invite_result", {
        error: inviteResult.error?.message || null,
        status: (inviteResult.error as any)?.status || null,
      });
      if (!inviteResult.error) {
        logStep("fallback_invite_success", { email_masked: maskEmail(email) });
        return NextResponse.json({ ok: true, mode: "invite" });
      }
      logStep("fallback_invite_failed", { error: inviteResult.error.message });
      return NextResponse.json(
        {
          error: inviteResult.error.message || "INVITE_FAILED",
          status: (inviteResult.error as any)?.status || 502,
        },
        { status: 502 }
      );
    } catch (error) {
      logStep("fallback_invite_exception", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "INVITE_EXCEPTION" }, { status: 502 });
    }
  }

  logStep("final_failure", { status: lastStatus, request_id: lastRequestId, error: lastError?.message || null });
  return NextResponse.json({ error: lastError?.message || "GATEWAY_TIMEOUT", request_id: lastRequestId }, { status: lastStatus || 504 });
}
