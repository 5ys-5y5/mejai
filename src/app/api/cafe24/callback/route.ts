import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const error = searchParams.get("error") || "";
  const traceId = searchParams.get("trace_id") || "";

  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

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

  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  const redirectUri = process.env.CAFE24_REDIRECT_URI || "";
  if (!redirectUri) {
    return new NextResponse("Missing redirect uri", { status: 500 });
  }

  const { data: settings, error: settingsError } = await context.supabase
    .from("auth_settings")
    .select("providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (settingsError || !settings) {
    return new NextResponse("Missing auth settings", { status: 400 });
  }
  const providers = (settings.providers || {}) as Record<
    string,
    { mall_id?: string; client_id?: string; client_secret?: string }
  >;
  const cafe24 = providers.cafe24 || {};
  const mallId = cafe24.mall_id || "";
  const clientId = cafe24.client_id || "";
  const clientSecret = cafe24.client_secret || "";
  if (!clientId || !clientSecret || !mallId) {
    return new NextResponse("Missing Cafe24 config in DB", { status: 400 });
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

  const { data: existing, error: existingError } = await context.supabase
    .from("auth_settings")
    .select("id, providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (existingError) {
    return new NextResponse(`DB read failed: ${existingError.message}`, { status: 500 });
  }
  const existingProviders = (existing?.providers || {}) as Record<string, unknown>;
  existingProviders.cafe24 = {
    ...existingProviders.cafe24,
    mall_id: tokenJson.mall_id || mallId,
    client_id: clientId,
    client_secret: clientSecret,
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token,
    expires_at: tokenJson.expires_at,
  };

  if (existing?.id) {
    const { error: updateError } = await context.supabase
      .from("auth_settings")
      .update({ providers: existingProviders, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateError) {
      return new NextResponse(`DB update failed: ${updateError.message}`, { status: 500 });
    }
  } else {
    const { error: insertError } = await context.supabase.from("auth_settings").insert({
      org_id: context.orgId,
      user_id: context.user.id,
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
