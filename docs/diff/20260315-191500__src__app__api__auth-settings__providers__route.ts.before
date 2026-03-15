import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

function getProviderFromParams(req: NextRequest) {
  const url = new URL(req.url);
  return (url.searchParams.get("provider") || "").trim();
}

type AuthSettingsRow = {
  id: string;
  user_id: string;
  providers: Record<string, Record<string, unknown> | undefined> | null;
  updated_at?: string | null;
};

async function findChatPolicyRow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  orgId: string,
  currentUserId: string
) {
  const { data, error } = await supabase
    .from("A_iam_auth_settings")
    .select("id, user_id, providers, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) return { row: null as AuthSettingsRow | null, error };
  const rows = (data || []) as AuthSettingsRow[];
  const withChatPolicy = rows.find((row) => Boolean(row.providers?.chat_policy));
  if (withChatPolicy) return { row: withChatPolicy, error: null };
  const owned = rows.find((row) => row.user_id === currentUserId);
  if (owned) return { row: owned, error: null };
  return { row: null as AuthSettingsRow | null, error: null };
}

export async function GET(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const provider = getProviderFromParams(req);
  if (!provider) {
    return NextResponse.json({ error: "PROVIDER_REQUIRED" }, { status: 400 });
  }

  let supabase = context.supabase;
  if (provider === "chat_policy") {
    try {
      supabase = createAdminSupabaseClient();
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" },
        { status: 500 }
      );
    }
  }

  let data:
    | { providers: Record<string, Record<string, unknown> | undefined> | null }
    | null = null;
  let error: { message: string } | null = null;
  if (provider === "chat_policy") {
    const picked = await findChatPolicyRow(supabase, context.orgId, context.user.id);
    if (picked.error) {
      error = { message: picked.error.message };
    } else if (picked.row) {
      data = { providers: picked.row.providers };
    }
  } else {
    const result = await supabase
      .from("A_iam_auth_settings")
      .select("providers")
      .eq("org_id", context.orgId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    data = result.data;
    if (result.error) error = { message: result.error.message };
  }

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
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json()) as {
    provider?: string;
    values?: Record<string, unknown>;
    commit?: boolean;
  };
  const provider = (body.provider || "").trim();
  if (!provider || !body.values) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  if (body.commit !== true) {
    return NextResponse.json({ error: "COMMIT_REQUIRED" }, { status: 400 });
  }

  let supabase = context.supabase;
  if (provider === "chat_policy") {
    try {
      supabase = createAdminSupabaseClient();
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" },
        { status: 500 }
      );
    }
  }

  let data:
    | { id: string; providers: Record<string, Record<string, unknown> | undefined> | null; user_id?: string }
    | null = null;
  let error: { message: string; code?: string } | null = null;
  if (provider === "chat_policy") {
    const picked = await findChatPolicyRow(supabase, context.orgId, context.user.id);
    if (picked.error) {
      error = { message: picked.error.message };
    } else if (picked.row) {
      data = { id: picked.row.id, providers: picked.row.providers, user_id: picked.row.user_id };
    }
  } else {
    const result = await supabase
      .from("A_iam_auth_settings")
      .select("id, providers")
      .eq("org_id", context.orgId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    data = result.data;
    if (result.error) error = { message: result.error.message, code: (result.error as { code?: string }).code };
  }

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    const providers = { [provider]: body.values };
    const { error: insertError } = await supabase.from("A_iam_auth_settings").insert({
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
  const next = { ...current, ...body.values };
  if (provider === "cafe24") {
    delete (next as Record<string, unknown>).scope;
  }
  providers[provider] = next;

  const { error: updateError } = await supabase
    .from("A_iam_auth_settings")
    .update({ providers, updated_at: new Date().toISOString() })
    .eq("id", data.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
