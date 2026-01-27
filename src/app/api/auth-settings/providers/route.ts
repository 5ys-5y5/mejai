import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

function getProviderFromParams(req: NextRequest) {
  const url = new URL(req.url);
  return (url.searchParams.get("provider") || "").trim();
}

export async function GET(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: access } = await context.supabase
    .from("user_access")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const provider = getProviderFromParams(req);
  if (!provider) {
    return NextResponse.json({ error: "PROVIDER_REQUIRED" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("auth_settings")
    .select("providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const providers = (data?.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  return NextResponse.json({ provider: providers[provider] || {} });
}

export async function POST(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: access } = await context.supabase
    .from("user_access")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json()) as { provider?: string; values?: Record<string, unknown> };
  const provider = (body.provider || "").trim();
  if (!provider || !body.values) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("auth_settings")
    .select("id, providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    const providers = { [provider]: body.values };
    const { error: insertError } = await context.supabase.from("auth_settings").insert({
      org_id: context.orgId,
      user_id: context.user.id,
      providers,
      updated_at: new Date().toISOString(),
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const providers = (data.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  const current = providers[provider] || {};
  providers[provider] = { ...current, ...body.values };

  const { error: updateError } = await context.supabase
    .from("auth_settings")
    .update({ providers, updated_at: new Date().toISOString() })
    .eq("id", data.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
