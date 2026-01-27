import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import crypto from "crypto";

function decodeStatePayload(state: string) {
  if (!state || !state.includes(".")) return null;
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  const secret = (process.env.CAFE24_OAUTH_STATE_SECRET || "").trim();
  if (!secret) return null;
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  if (expected !== signature) return null;
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(decoded) as { mall_id?: string; org_id?: string; user_id?: string } | null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const error = searchParams.get("error") || "";
  const traceId = searchParams.get("trace_id") || "";

  const title = error ? "Cafe24 OAuth Error" : "Cafe24 OAuth Success";

  if (error) {
    const body = `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    <h1>${title}</h1>
    <div>error: ${error}</div>
    <div>trace_id: ${traceId}</div>
  </body>
</html>
    `.trim();
    return new NextResponse(body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const decodedState = decodeStatePayload(state);
  if (!decodedState?.org_id || !decodedState?.user_id) {
    return new NextResponse("Invalid state", { status: 400 });
  }

  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  const redirectUri = process.env.CAFE24_REDIRECT_URI || "";
  if (!redirectUri) {
    return new NextResponse("Missing redirect uri", { status: 500 });
  }

  const clientId = (process.env.CAFE24_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CAFE24_CLIENT_SECRET_KEY || "").trim();
  if (!clientId || !clientSecret) {
    return new NextResponse("Missing Cafe24 client credentials", { status: 500 });
  }

  const mallIdFromState = decodedState?.mall_id || "";

  const adminSupabase = createAdminSupabaseClient();
  const { data: settings, error: settingsError } = await adminSupabase
    .from("auth_settings")
    .select("providers")
    .eq("org_id", decodedState.org_id)
    .eq("user_id", decodedState.user_id)
    .maybeSingle();
  if (settingsError && settingsError.code !== "PGRST116") {
    return new NextResponse(`Auth settings lookup failed: ${settingsError.message}`, { status: 400 });
  }
  const providers = ((settings?.providers || {}) as Record<string, { mall_id?: string }>) || {};
  const cafe24 = providers.cafe24 || {};
  const mallId = mallIdFromState || cafe24.mall_id || "";
  if (!mallId) {
    return new NextResponse("Missing Cafe24 mall_id", { status: 400 });
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`,
  });
  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    return new NextResponse(`Token exchange failed: ${tokenText}`, { status: 400 });
  }
  const tokenJson = JSON.parse(tokenText) as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    mall_id: string;
  };

  const { data: existing, error: existingError } = await adminSupabase
    .from("auth_settings")
    .select("id, providers")
    .eq("org_id", decodedState.org_id)
    .eq("user_id", decodedState.user_id)
    .maybeSingle();
  if (existingError) {
    return new NextResponse(`DB read failed: ${existingError.message}`, { status: 500 });
  }
  const existingProviders = (existing?.providers || {}) as Record<string, unknown>;
  const existingCafe24 = (existingProviders.cafe24 ?? {}) as Record<string, unknown>;
  const nextCafe24: Record<string, unknown> = {
    ...existingCafe24,
    mall_id: tokenJson.mall_id || mallId,
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token,
    expires_at: tokenJson.expires_at,
  };
  delete nextCafe24.client_id;
  delete nextCafe24.client_secret;
  existingProviders.cafe24 = nextCafe24;

  if (existing?.id) {
    const { error: updateError } = await adminSupabase
      .from("auth_settings")
      .update({ providers: existingProviders, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateError) {
      return new NextResponse(`DB update failed: ${updateError.message}`, { status: 500 });
    }
  } else {
    const { error: insertError } = await adminSupabase.from("auth_settings").insert({
      org_id: decodedState.org_id,
      user_id: decodedState.user_id,
      providers: existingProviders,
      updated_at: new Date().toISOString(),
    });
    if (insertError) {
      return new NextResponse(`DB insert failed: ${insertError.message}`, { status: 500 });
    }
  }

  const body = `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; }
      code, pre { background: #f4f4f4; padding: 8px; display: block; }
      .label { font-weight: 700; margin-top: 16px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="label">status</div><pre>stored</pre>
    <div class="label">state</div><pre>${state}</pre>
    <p>토큰이 저장되었습니다. 이제 MCP 호출을 진행할 수 있습니다.</p>
  </body>
</html>
  `.trim();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
