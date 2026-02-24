import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import {
  fetchChatPolicyRow,
  upsertChatPolicy,
} from "@/lib/chatPolicyStore";
import type { ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";

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

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const picked = await fetchChatPolicyRow(supabaseAdmin, context.orgId);
  if (picked.error) {
    return NextResponse.json({ error: picked.error.message }, { status: 400 });
  }

  const currentChatPolicy =
    (picked.row?.chat_policy as ConversationFeaturesProviderShape | null) || {};
  const pageRegistryRaw = Array.isArray(currentChatPolicy.page_registry)
    ? currentChatPolicy.page_registry
    : [];
  const pageRegistry = Array.from(
    new Set(
      pageRegistryRaw
        .map((v) => normalizePage(v))
        .filter(Boolean)
        .concat(page)
    )
  );
  const nextPolicy: ConversationFeaturesProviderShape = {
    ...currentChatPolicy,
    page_registry: pageRegistry,
  };

  const { error: upsertError } = await upsertChatPolicy(
    supabaseAdmin,
    context.orgId,
    nextPolicy,
    context.user.id
  );
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  return NextResponse.json({ ok: true, page });
}

