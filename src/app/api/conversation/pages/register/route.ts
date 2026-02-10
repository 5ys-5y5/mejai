import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

function normalizePage(input: unknown) {
  const value = String(input || "").trim();
  if (!value.startsWith("/")) return "";
  if (value.length > 200) return "";
  return value;
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

  const { data, error } = await context.supabase
    .from("A_iam_auth_settings")
    .select("id, providers")
    .eq("org_id", context.orgId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  if (!data) {
    const providers = {
      chat_policy: {
        page_registry: [page],
      },
    };
    const { error: insertError } = await context.supabase.from("A_iam_auth_settings").insert({
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

  const { error: updateError } = await context.supabase
    .from("A_iam_auth_settings")
    .update({ providers, updated_at: nowIso })
    .eq("id", data.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({ ok: true, page });
}

