import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

function normalizePage(input: unknown) {
  const value = String(input || "").trim();
  if (!value.startsWith("/")) return "";
  if (value.length > 200) return "";
  return value;
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

export async function POST(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  let body: { page?: string } = {};
  try {
    body = (await req.json()) as { page?: string };
  } catch {
    body = {};
  }
  const page = normalizePage(body.page);
  if (!page) return NextResponse.json({ error: "INVALID_PAGE" }, { status: 400 });

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const picked = await findChatPolicyRow(supabaseAdmin, context.orgId, context.user.id);
  if (picked.error) {
    return NextResponse.json({ error: picked.error.message }, { status: 400 });
  }
  const data = picked.row
    ? ({ id: picked.row.id, providers: picked.row.providers } as {
        id: string;
        providers: Record<string, Record<string, unknown> | undefined> | null;
      })
    : null;

  const nowIso = new Date().toISOString();
  if (!data) {
    const providers = {
      chat_policy: {
        page_registry: [page],
      },
    };
    const { error: insertError } = await supabaseAdmin.from("A_iam_auth_settings").insert({
      org_id: context.orgId,
      user_id: context.user.id,
      providers,
      updated_at: nowIso,
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
    return NextResponse.json({ ok: true, page });
  }

  const providers = (data.providers || {}) as Record<string, Record<string, unknown> | undefined>;
  const currentChatPolicy = (providers.chat_policy || {}) as Record<string, unknown>;
  const pageRegistryRaw = Array.isArray(currentChatPolicy.page_registry) ? currentChatPolicy.page_registry : [];
  const pageRegistry = Array.from(
    new Set(
      pageRegistryRaw
        .map((v) => normalizePage(v))
        .filter(Boolean)
        .concat(page)
    )
  );
  providers.chat_policy = {
    ...currentChatPolicy,
    page_registry: pageRegistry,
  };

  const { error: updateError } = await supabaseAdmin
    .from("A_iam_auth_settings")
    .update({ providers, updated_at: nowIso })
    .eq("id", data.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ ok: true, page });
}

