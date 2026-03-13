import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
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

export async function POST(req: NextRequest) {
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
  if (!body || !body.template_id) {
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

  const templateId = String(body.template_id || "").trim();
  const { data: template } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, name, is_active, chat_policy, is_public")
    .eq("id", templateId)
    .maybeSingle();
  if (!template || !template.is_active) {
    return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const publicKey = makePublicKey();
  const name = String(body.name || template.name || "Widget Instance").trim() || "Widget Instance";
  const isPublic = typeof body.is_public === "boolean" ? body.is_public : true;
  const editableId = Array.isArray(body.editable_id) ? body.editable_id : [context.user.id];
  const usableId = Array.isArray(body.usable_id) ? body.usable_id : [];

  const { data, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .insert({
      template_id: templateId,
      public_key: publicKey,
      name,
      is_active: true,
      is_public: isPublic,
      editable_id: editableId,
      usable_id: usableId,
      created_by: context.user.id,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id, public_key, name, template_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}
