import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

function encodeBase64Url(input: string) {
  return Buffer.from(input).toString("base64url");
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

  const { data, error } = await context.supabase
    .from("auth_settings")
    .select("providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "AUTH_SETTINGS_NOT_FOUND" }, { status: 400 });
  }
  const providers = (data.providers || {}) as Record<string, { mall_id?: string; client_id?: string; scope?: string }>;
  const cafe24 = providers.cafe24 || {};
  const mallId = cafe24.mall_id || "";
  const clientId = cafe24.client_id || "";
  const scope = cafe24.scope || "";
  if (!mallId || !clientId || !scope) {
    return NextResponse.json({ error: "MISSING_CAFE24_CONFIG" }, { status: 400 });
  }

  const state = encodeBase64Url(`${Date.now()}-${Math.random()}`);
  const url = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);

  return NextResponse.redirect(url.toString());
}
