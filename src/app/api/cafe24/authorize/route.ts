import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import crypto from "crypto";

function encodeBase64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function readStateSecret() {
  return (process.env.CAFE24_OAUTH_STATE_SECRET || "").trim();
}

function signState(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const redirectUri = process.env.CAFE24_REDIRECT_URI || "";
  if (!redirectUri) {
    return NextResponse.json({ error: "MISSING_REDIRECT_URI" }, { status: 500 });
  }
  const stateSecret = readStateSecret();
  if (!stateSecret) {
    return NextResponse.json({ error: "MISSING_OAUTH_STATE_SECRET" }, { status: 500 });
  }

  const clientId = (process.env.CAFE24_CLIENT_ID || "").trim();
  if (!clientId) {
    return NextResponse.json({ error: "MISSING_CAFE24_CLIENT_ID" }, { status: 500 });
  }

  const url = new URL(req.url);
  let mallId = (url.searchParams.get("mall_id") || "").trim();
  let scope = (url.searchParams.get("scope") || "").trim();

  if (!mallId || !scope) {
    const { data, error } = await context.supabase
      .from("auth_settings")
      .select("providers")
      .eq("org_id", context.orgId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "AUTH_SETTINGS_NOT_FOUND" }, { status: 400 });
    }
    const providers = (data.providers || {}) as Record<string, { mall_id?: string; scope?: string }>;
    const cafe24 = providers.cafe24 || {};
    mallId = mallId || cafe24.mall_id || "";
    scope = scope || cafe24.scope || "";
  }

  if (!mallId || !scope) {
    return NextResponse.json({ error: "MISSING_CAFE24_CONFIG" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const statePayload = JSON.stringify({
    mall_id: mallId,
    scope,
    org_id: context.orgId,
    user_id: context.user.id,
    origin,
    ts: Date.now(),
    nonce: Math.random(),
  });
  const encoded = encodeBase64Url(statePayload);
  const signature = signState(encoded, stateSecret);
  const state = `${encoded}.${signature}`;
  const authorizeUrl = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", scope);

  const mode = (url.searchParams.get("mode") || "").toLowerCase();
  if (mode === "json" || req.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ url: authorizeUrl.toString() });
  }

  return NextResponse.redirect(authorizeUrl.toString());
}
