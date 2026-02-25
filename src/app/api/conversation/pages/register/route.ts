import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import {
  fetchChatPolicyRow,
  upsertChatPolicy,
} from "@/lib/chatPolicyStore";
import {
  getDefaultConversationPageFeatures,
  normalizeConversationPageKey,
  type ConversationFeaturesProviderShape,
  type ConversationPageFeatures,
} from "@/lib/conversation/pageFeaturePolicy";

function normalizePage(input: unknown) {
  const value = String(input || "").trim();
  if (!value.startsWith("/")) return "";
  if (value.length > 200) return "";
  return value;
}

export async function POST(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");

  let body: { page?: string } = {};
  try {
    body = (await req.json()) as { page?: string };
  } catch {
    body = {};
  }
  const rawPage = normalizePage(body.page);
  if (!rawPage) return NextResponse.json({ error: "INVALID_PAGE" }, { status: 400 });
  const page = normalizeConversationPageKey(rawPage);

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 200 }
    );
  }

  const picked = await fetchChatPolicyRow(supabaseAdmin, "public");
  if (picked.error) {
    return NextResponse.json({ error: picked.error.message }, { status: 400 });
  }

  const currentChatPolicy =
    (picked.row?.chat_policy as ConversationFeaturesProviderShape | null) || {};
  const pages = { ...(currentChatPolicy.pages || {}) } as Partial<Record<string, ConversationPageFeatures>>;
  if (!pages[page]) {
    pages[page] = getDefaultConversationPageFeatures(page);
  }
  const pageRegistryRaw = Array.isArray(currentChatPolicy.page_registry)
    ? currentChatPolicy.page_registry
    : [];
  const pageRegistry = Array.from(
    new Set(
      pageRegistryRaw
        .map((v) => normalizeConversationPageKey(normalizePage(v)))
        .filter(Boolean)
        .concat(page)
    )
  );
  const nextPolicy: ConversationFeaturesProviderShape = {
    ...currentChatPolicy,
    pages,
    page_registry: pageRegistry,
  };

  const updatedBy = "error" in context ? null : context.user.id;
  const { error: upsertError } = await upsertChatPolicy(
    supabaseAdmin,
    "public",
    nextPolicy,
    updatedBy
  );
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  return NextResponse.json({ ok: true, page });
}

