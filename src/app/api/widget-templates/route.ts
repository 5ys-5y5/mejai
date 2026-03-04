import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("B_chat_widgets")
    .select("*")
    .eq("org_id", context.orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = (data || [])
    .filter((row: Record<string, any>) => (readWidgetMeta(row.theme).type || "template") === "template")
    .map(mapTemplateRow);

  return NextResponse.json({ items });
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
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const name = String(body.name || "").trim() || "Widget Template";
  const agentId = String(body.agent_id || "").trim() || null;
  const allowedDomains = normalizeStringArray(body.allowed_domains);
  const allowedPaths = normalizeStringArray(body.allowed_paths);
  const theme = typeof body.theme === "object" && body.theme ? body.theme : {};
  const setupConfig = (body.setup_config && typeof body.setup_config === "object" ? body.setup_config : null) as
    | WidgetSetupConfig
    | null;
  const chatPolicy = normalizeWidgetChatPolicyRecordFromProvider(
    body.chat_policy && typeof body.chat_policy === "object" ? body.chat_policy : null
  );
  const isActive = typeof body.is_active === "boolean" ? body.is_active : true;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const publicKey = makePublicKey();
  const { data, error } = await supabaseAdmin
    .from("B_chat_widgets")
    .insert({
      org_id: context.orgId,
      name,
      agent_id: agentId,
      allowed_domains: allowedDomains,
      allowed_paths: allowedPaths,
      theme: applyWidgetMeta(theme, { type: "template", setup_config: setupConfig }),
      chat_policy: chatPolicy,
      is_active: isActive,
      public_key: publicKey,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: mapTemplateRow(data as Record<string, any>) });
}
