import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { refreshCafe24Token } from "@/lib/cafe24Tokens";

type Cafe24ProviderConfig = {
  mall_id?: string;
  access_token?: string;
  refresh_token?: string;
  api_version?: string;
};

function readApiVersion(provider?: Cafe24ProviderConfig) {
  return (
    (provider?.api_version || "").trim() ||
    (process.env.CAFE24_API_VERSION || "").trim() ||
    "2025-12-01"
  );
}

async function requestShops(config: { mallId: string; accessToken: string; apiVersion: string }) {
  const url = `https://${config.mallId}.cafe24api.com/api/v2/admin/shops`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Cafe24-Api-Version": config.apiVersion,
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export async function GET(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const headerMallId = (req.headers.get("x-cafe24-mall-id") || "").trim();
  const headerAccessToken = (req.headers.get("x-cafe24-access-token") || "").trim();

  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let mallId = headerMallId;
  let accessToken = headerAccessToken;
  let refreshToken = "";
  let settingsId = "";
  let apiVersion = readApiVersion();
  if (!mallId || !accessToken) {
    const { data, error } = await context.supabase
      .from("A_iam_auth_settings")
      .select("id, providers")
      .eq("org_id", context.orgId)
      .eq("user_id", context.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const providers = (data?.providers || {}) as Record<string, Cafe24ProviderConfig | undefined>;
    const cafe24 = providers.cafe24 || {};
    mallId = mallId || cafe24.mall_id || "";
    accessToken = accessToken || cafe24.access_token || "";
    refreshToken = cafe24.refresh_token || "";
    settingsId = data?.id || "";
    apiVersion = readApiVersion(cafe24);
  }

  if (!mallId || !accessToken) {
    return NextResponse.json({ error: "CAFE24_TOKEN_MISSING" }, { status: 400 });
  }

  let response = await requestShops({ mallId, accessToken, apiVersion });
  if (!response.ok && response.status === 401 && refreshToken && settingsId) {
    const refreshed = await refreshCafe24Token({
      settingsId,
      mallId,
      refreshToken,
      supabase: context.supabase,
    });
    if (refreshed.ok) {
      response = await requestShops({ mallId, accessToken: refreshed.accessToken, apiVersion });
    }
  }

  if (!response.ok) {
    return NextResponse.json({ error: response.text }, { status: response.status });
  }

  try {
    return NextResponse.json(JSON.parse(response.text));
  } catch {
    return NextResponse.json({ error: "INVALID_RESPONSE" }, { status: 502 });
  }
}
