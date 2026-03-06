import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizeWidgetChatPolicyProvider, normalizeWidgetChatPolicyRecordFromProvider } from "@/lib/widgetChatPolicyShape";
import { type WidgetSetupConfig, normalizeStringArray } from "@/lib/widgetTemplateMeta";
import { getPolicyWidgetAccess, getPolicyWidgetSetupConfig, getPolicyWidgetTheme, setPolicyWidgetAccess, setPolicyWidgetSetupConfig, setPolicyWidgetTheme } from "@/lib/widgetPolicyUtils";
import { ensureTemplateSharedInstance } from "@/lib/widgetSharedInstance";

type TemplateRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  is_public?: boolean | null;
  chat_policy?: Record<string, unknown> | null;
  created_by?: string | null;
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
  const access = getPolicyWidgetAccess(policy);
  return {
    id: template.id,
    name: template.name || "Web Widget",
    agent_id: setupConfig?.agent_id || null,
    allowed_domains: access.allowed_domains || [],
    allowed_paths: access.allowed_paths || [],
    theme,
    is_active: template.is_active ?? true,
    public_key: instance?.public_key || null,
    page_keys: Array.isArray((template as any).page_keys) ? ((template as any).page_keys as string[]) : [],
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

  const url = new URL(req.url);
  const pageKey = String(url.searchParams.get("page_key") || "").trim();
  let query = context.supabase
    .from("B_chat_widgets")
    .select("*")
    .eq("created_by", context.user.id)
    .order("created_at", { ascending: false });
  if (pageKey) {
    query = query.contains("page_keys", [pageKey]);
  }
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
      const access = getPolicyWidgetAccess(policy);
      if (!supabaseAdmin) return;
      try {
        const shared = await ensureTemplateSharedInstance(supabaseAdmin, template, access);
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
  const allowedDomains = normalizeStringArray(body.allowed_domains);
  const allowedPaths = normalizeStringArray(body.allowed_paths);
  const theme = typeof body.theme === "object" && body.theme ? body.theme : {};
  const isActive = typeof body.is_active === "boolean" ? body.is_active : true;
  const rotateKey = body.rotate_key === true;
  const templateId = String(body.template_id || "").trim();
  const pageKeysProvided = Array.isArray(body.page_keys);
  const nextPageKeys = pageKeysProvided ? normalizeStringArray(body.page_keys) : [];
  const pageKey = String(body.page_key || "").trim();

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
  const nextAccess = {
    allowed_domains: allowedDomains,
    allowed_paths: allowedPaths,
  };
  const policyWithAccess = setPolicyWidgetAccess(policyWithSetup, nextAccess);
  const existingPageKeys = Array.isArray((existingTemplate as any)?.page_keys)
    ? normalizeStringArray((existingTemplate as any).page_keys)
    : [];
  const mergedPageKeys = pageKeysProvided
    ? nextPageKeys
    : pageKey
      ? Array.from(new Set([...existingPageKeys, pageKey]))
      : existingPageKeys;

  let templateRow: TemplateRow;
  if (existingTemplate?.id) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .update({
        name,
        chat_policy: policyWithAccess,
        is_active: isActive,
        ...(pageKeysProvided || pageKey ? { page_keys: mergedPageKeys } : {}),
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
        chat_policy: policyWithAccess,
        is_active: isActive,
        is_public: true,
        page_keys: mergedPageKeys,
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
    const shared = await ensureTemplateSharedInstance(supabaseAdmin, templateRow, nextAccess, nowIso);
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
