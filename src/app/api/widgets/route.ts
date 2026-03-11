import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizeWidgetChatPolicyProvider, normalizeWidgetChatPolicyRecordFromProvider } from "@/lib/widgetChatPolicyShape";
import { type WidgetSetupConfig } from "@/lib/widgetTemplateMeta";
import { getPolicyWidgetSetupConfig, getPolicyWidgetTheme, setPolicyWidgetSetupConfig, setPolicyWidgetTheme } from "@/lib/widgetPolicyUtils";
import { ensureTemplateSharedInstance } from "@/lib/widgetSharedInstance";

type TemplateRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  chat_policy?: Record<string, unknown> | null;
  created_by?: string | null;
  public_key?: string | null;
};

type InstanceRow = {
  id: string;
  public_key: string;
  template_id: string;
};

function makePublicKey() {
  return `mw_pk_${crypto.randomBytes(16).toString("hex")}`;
}

function mapTemplateToWidgetConfig(template: TemplateRow, instance?: InstanceRow | null) {
  const policy = normalizeWidgetChatPolicyProvider(template.chat_policy || null);
  const theme = getPolicyWidgetTheme(policy);
  const setupConfig = getPolicyWidgetSetupConfig(policy);
  return {
    id: template.id,
    name: template.name || "Web Widget",
    agent_id: setupConfig?.agent_id || null,
    theme,
    is_active: template.is_active ?? true,
    template_public_key: template.public_key || null,
    instance_id: instance?.id || null,
    instance_public_key: instance?.public_key || null,
  };
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  let query = context.supabase
    .from("B_chat_widgets")
    .select("*")
    .eq("created_by", context.user.id)
    .order("created_at", { ascending: false });
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const templates = (data || []) as TemplateRow[];
  if (templates.length === 0) {
    return NextResponse.json({ items: [], item: null });
  }

  let supabaseAdmin: ReturnType<typeof createAdminSupabaseClient> | null = null;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch {
    supabaseAdmin = null;
  }

  const instanceMap = new Map<string, InstanceRow>();
  await Promise.all(
    templates.map(async (template) => {
      const policy = normalizeWidgetChatPolicyProvider(template.chat_policy || null);
      if (!supabaseAdmin) return;
      try {
        const shared = await ensureTemplateSharedInstance(supabaseAdmin, template);
        instanceMap.set(template.id, {
          id: shared.id,
          public_key: shared.public_key,
          template_id: shared.template_id,
        });
      } catch {
        // ignore shared instance errors
      }
    })
  );

  const items = templates.map((template) =>
    mapTemplateToWidgetConfig(template, instanceMap.get(template.id) || null)
  );

  return NextResponse.json({ items, item: items[0] || null });
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
  const name = String(body.name || "").trim() || "Web Widget";
  const agentId = String(body.agent_id || "").trim() || null;
  const theme = typeof body.theme === "object" && body.theme ? body.theme : {};
  const isActive = typeof body.is_active === "boolean" ? body.is_active : true;
  const rotateKey = body.rotate_key === true;
  const templateId = String(body.template_id || "").trim();
  const templatePublicKey = makePublicKey();

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: existing } = templateId
    ? await supabaseAdmin
        .from("B_chat_widgets")
        .select("*")
        .eq("id", templateId)
        .maybeSingle()
    : await supabaseAdmin
        .from("B_chat_widgets")
        .select("*")
        .eq("created_by", context.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const existingTemplate = existing as TemplateRow | null;
  const basePolicy = normalizeWidgetChatPolicyProvider(existingTemplate?.chat_policy || null);
  const setupConfig = getPolicyWidgetSetupConfig(basePolicy) || ({} as WidgetSetupConfig);
  const nextSetupConfig = { ...(setupConfig || {}), agent_id: agentId } satisfies WidgetSetupConfig;
  const chatPolicy = normalizeWidgetChatPolicyRecordFromProvider(existingTemplate?.chat_policy || null);
  const chatPolicyShape = normalizeWidgetChatPolicyProvider(chatPolicy);
  const policyWithTheme = setPolicyWidgetTheme(chatPolicyShape, theme);
  const policyWithSetup = setPolicyWidgetSetupConfig(policyWithTheme, nextSetupConfig);
  const resolvedTemplatePublicKey =
    existingTemplate && existingTemplate.public_key ? String(existingTemplate.public_key) : templatePublicKey;

  let templateRow: TemplateRow;
  if (existingTemplate?.id) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .update({
        name,
        chat_policy: policyWithSetup,
        is_active: isActive,
        ...(existingTemplate.public_key ? {} : { public_key: resolvedTemplatePublicKey }),
        updated_at: nowIso,
      })
      .eq("id", existingTemplate.id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "TEMPLATE_UPDATE_FAILED" }, { status: 400 });
    }
    templateRow = data as TemplateRow;
  } else {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .insert({
        name,
        chat_policy: policyWithSetup,
        is_active: isActive,
        is_public: true,
        public_key: resolvedTemplatePublicKey,
        created_by: context.user.id,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message || "TEMPLATE_CREATE_FAILED" }, { status: 400 });
    }
    templateRow = data as TemplateRow;
  }

  let instance: InstanceRow | null = null;
  try {
    const shared = await ensureTemplateSharedInstance(supabaseAdmin, templateRow, nowIso);
    instance = { id: shared.id, public_key: shared.public_key, template_id: shared.template_id };
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "INSTANCE_CREATE_FAILED" },
      { status: 400 }
    );
  }

  if (rotateKey && instance) {
    const { data: rotated, error } = await supabaseAdmin
      .from("B_chat_widget_instances")
      .update({
        public_key: makePublicKey(),
        updated_at: nowIso,
      })
      .eq("id", instance.id)
      .select("id, public_key, template_id")
      .single();
    if (error || !rotated) {
      return NextResponse.json({ error: error?.message || "INSTANCE_ROTATE_FAILED" }, { status: 400 });
    }
    instance = rotated as InstanceRow;
  }

  return NextResponse.json({ item: mapTemplateToWidgetConfig(templateRow, instance) });
}
