import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import {
  applyWidgetMeta,
  normalizeStringArray,
  readWidgetMeta,
  stripWidgetMeta,
  type WidgetSetupConfig,
} from "@/lib/widgetTemplateMeta";
import {
  normalizeWidgetChatPolicyProvider,
  normalizeWidgetChatPolicyRecordFromProvider,
} from "@/lib/widgetChatPolicyShape";

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

function mapTemplateRow(row: Record<string, any>) {
  const meta = readWidgetMeta(row.theme);
  const legacyPolicy = normalizeWidgetChatPolicyProvider(meta.chat_policy || null);
  return {
    ...row,
    theme: stripWidgetMeta(row.theme),
    widget_type: meta.type || "template",
    template_id: meta.template_id || null,
    setup_config: (meta.setup_config || null) as WidgetSetupConfig | null,
    chat_policy: normalizeWidgetChatPolicyProvider(row.chat_policy || legacyPolicy || null),
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("B_chat_widgets")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ item: mapTemplateRow(data as Record<string, any>) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
  if (!body) {
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
    .select("*")
    .eq("id", params.id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const meta = readWidgetMeta(existing.theme);
  const theme = typeof body.theme === "object" && body.theme ? body.theme : stripWidgetMeta(existing.theme);
  const setupConfig = (body.setup_config && typeof body.setup_config === "object" ? body.setup_config : meta.setup_config) as
    | WidgetSetupConfig
    | null;
  const chatPolicy = normalizeWidgetChatPolicyRecordFromProvider(
    body.chat_policy && typeof body.chat_policy === "object" ? body.chat_policy : existing.chat_policy
  );

  const nextTheme = applyWidgetMeta(theme, {
    type: meta.type || "template",
    template_id: meta.template_id || null,
    setup_config: setupConfig,
    chat_policy: meta.chat_policy,
  });

  const name = body.name !== undefined ? String(body.name || "").trim() || existing.name : existing.name;
  const agentId =
    body.agent_id !== undefined ? String(body.agent_id || "").trim() || null : (existing.agent_id as string | null);
  const allowedDomains = body.allowed_domains !== undefined ? normalizeStringArray(body.allowed_domains) : existing.allowed_domains;
  const allowedPaths = body.allowed_paths !== undefined ? normalizeStringArray(body.allowed_paths) : existing.allowed_paths;
  const isActive = body.is_active !== undefined ? Boolean(body.is_active) : existing.is_active;

  const { data, error } = await supabaseAdmin
    .from("B_chat_widgets")
    .update({
      name,
      agent_id: agentId,
      allowed_domains: allowedDomains,
      allowed_paths: allowedPaths,
      theme: nextTheme,
      chat_policy: chatPolicy,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: mapTemplateRow(data as Record<string, any>) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { error } = await supabaseAdmin
    .from("B_chat_widgets")
    .delete()
    .eq("id", params.id)
    .eq("org_id", context.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
