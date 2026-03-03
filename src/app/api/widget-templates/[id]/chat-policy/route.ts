import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { applyWidgetMeta, readWidgetMeta, stripWidgetMeta } from "@/lib/widgetTemplateMeta";
import type { ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";

function normalizeId(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function isUuid(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized
  );
}

async function ensureAdmin(context: Awaited<ReturnType<typeof getServerContext>>) {
  if ("error" in context) return { ok: false, status: 401, error: context.error };
  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!access?.is_admin) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const templateId = normalizeId(params?.id);
  if (!isUuid(templateId)) {
    return NextResponse.json({ error: "INVALID_TEMPLATE_ID" }, { status: 400 });
  }
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  if (!isUuid(context.orgId)) {
    return NextResponse.json({ error: "INVALID_ORG_ID" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("B_chat_widgets")
    .select("id, org_id, theme")
    .eq("id", templateId)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const meta = readWidgetMeta(data.theme);
  const provider = (meta.chat_policy || null) as ConversationFeaturesProviderShape | null;
  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const templateId = normalizeId(params?.id);
  if (!isUuid(templateId)) {
    return NextResponse.json({ error: "INVALID_TEMPLATE_ID" }, { status: 400 });
  }
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  if (!isUuid(context.orgId)) {
    return NextResponse.json({ error: "INVALID_ORG_ID" }, { status: 400 });
  }

  const adminCheck = await ensureAdmin(context);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, org_id, theme")
    .eq("id", templateId)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const meta = readWidgetMeta(existing.theme);
  const provider = (body.provider || null) as ConversationFeaturesProviderShape | null;
  const nextTheme = applyWidgetMeta(stripWidgetMeta(existing.theme), {
    ...meta,
    chat_policy: provider,
  });

  const { error } = await supabaseAdmin
    .from("B_chat_widgets")
    .update({
      theme: nextTheme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
