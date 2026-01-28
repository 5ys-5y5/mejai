import { NextRequest, NextResponse } from "next/server";
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
    return JSON.parse(decoded) as {
      mall_id?: string;
      scope?: string;
      org_id?: string;
      user_id?: string;
      origin?: string;
    } | null;
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

  const decodedState = decodeStatePayload(state);
  const originForPostMessage = JSON.stringify(decodedState?.origin || "*");
  const title = error ? "Cafe24 OAuth Error" : "Cafe24 OAuth Success";
  const renderErrorPage = (message: string) => {
    const script = `
    <script>
      (function () {
        var origin = ${originForPostMessage};
        try {
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "cafe24_oauth_error",
                error: ${JSON.stringify(message)},
                trace_id: ${JSON.stringify(traceId)},
                callback_url: window.location.href
              },
              origin
            );
          }
        } catch {}
      })();
    </script>
    `.trim();
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
    <div>error: ${message}</div>
    <div>trace_id: ${traceId}</div>
    ${script}
  </body>
</html>
    `.trim();
    return new NextResponse(body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };

  if (error) {
    return renderErrorPage(error);
  }

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
  const scopeFromState = decodedState?.scope || "";
  const mallId = mallIdFromState || "";
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
    let friendly = `Token exchange failed: ${tokenText}`;
    try {
      const parsed = JSON.parse(tokenText) as { error?: string; error_description?: string };
      if (parsed?.error === "invalid_grant" && (parsed.error_description || "").includes("mall_id")) {
        friendly = "Cafe24 로그인 계정의 mall_id와 입력한 mall_id가 일치하지 않습니다. 올바른 계정으로 로그인해주세요.";
      }
    } catch {}
    return renderErrorPage(friendly);
  }
  const tokenJson = JSON.parse(tokenText) as {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    mall_id: string;
  };
  const postPayload = {
    type: "cafe24_oauth_complete",
    callback_url: "", // filled in browser
    mall_id: mallId,
    scope: scopeFromState,
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token,
    expires_at: tokenJson.expires_at,
  };

  const body = `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; line-height: 1.5; color: #0f172a; }
      code, pre { background: #f1f5f9; padding: 8px; display: block; border-radius: 8px; }
      .label { font-weight: 700; margin-top: 16px; color: #334155; }
      .note { color: #64748b; margin-top: 12px; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="label">status</div><pre>authorized</pre>
    <div class="label">state</div><pre>${state}</pre>
    <div class="label">saved_mall_id</div><pre>${mallId}</pre>
    <p class="note">토큰이 브라우저로 전달되었습니다. 마지막에 저장 버튼을 눌러야 DB에 기록됩니다.</p>
    <script>
      (function () {
        var origin = ${originForPostMessage};
        try {
          if (window.opener) {
            window.opener.postMessage(
              {
                ...${JSON.stringify(postPayload)},
                callback_url: window.location.href
              },
              origin
            );
            window.setTimeout(function () { window.close(); }, 0);
          }
        } catch {}
      })();
    </script>
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
