import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { refreshCafe24Token } from "@/lib/cafe24Tokens";

type Cafe24ProviderConfig = {
  mall_id?: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: string;
};

export async function POST(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from("A_iam_auth_settings")
    .select("id, providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "AUTH_SETTINGS_NOT_FOUND" }, { status: 400 });
  }

  const providers = (data.providers || {}) as Record<string, Cafe24ProviderConfig | undefined>;
  const cafe24 = providers.cafe24 || {};
  const mallId = String(cafe24.mall_id || "").trim();
  const refreshToken = String(cafe24.refresh_token || "").trim();

  if (!mallId || !refreshToken) {
    return NextResponse.json({ error: "CAFE24_PROVIDER_CONFIG_MISSING" }, { status: 400 });
  }

  const refreshed = await refreshCafe24Token({
    settingsId: data.id,
    mallId,
    refreshToken,
    supabase: context.supabase,
  });

  if (!refreshed.ok) {
    return NextResponse.json({ refreshed: false, error: refreshed.error }, { status: 400 });
  }

  return NextResponse.json({ refreshed: true, access_token: refreshed.accessToken });
}

