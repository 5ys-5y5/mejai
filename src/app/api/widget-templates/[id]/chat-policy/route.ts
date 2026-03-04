import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import {
  normalizeWidgetChatPolicyProvider,
  normalizeWidgetChatPolicyRecordFromProvider,
} from "@/lib/widgetChatPolicyShape";

function normalizeId(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function readTemplateId(req: NextRequest, params?: { id?: string }) {
  const byParams = normalizeId(params?.id);
  if (byParams) return byParams;
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const idIndex = parts.indexOf("widget-templates") + 1;
  return idIndex > 0 ? normalizeId(parts[idIndex]) : "";
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
  const templateId = readTemplateId(req, params);
  if (!templateId) {
    return NextResponse.json({ error: "INVALID_TEMPLATE_ID" }, { status: 400 });
  }
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  const { data, error } = await context.supabase
    .from("B_chat_widgets")
    .select("id, org_id, theme, chat_policy")
    .eq("id", templateId)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const provider = normalizeWidgetChatPolicyProvider(data.chat_policy || null);
  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const templateId = readTemplateId(req, params);
  if (!templateId) {
    return NextResponse.json({ error: "INVALID_TEMPLATE_ID" }, { status: 400 });
  }
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
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
    .select("id, org_id, theme, chat_policy")
    .eq("id", templateId)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const provider = normalizeWidgetChatPolicyRecordFromProvider(body.provider || null);

  const { error } = await supabaseAdmin
    .from("B_chat_widgets")
    .update({
      chat_policy: provider,
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
