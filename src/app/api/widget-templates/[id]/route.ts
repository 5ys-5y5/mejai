import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { normalizeStringArray, type WidgetSetupConfig } from "@/lib/widgetTemplateMeta";
import {
  normalizeWidgetChatPolicyProvider,
  normalizeWidgetChatPolicyRecordFromProvider,
} from "@/lib/widgetChatPolicyShape";
import {
  getPolicyWidgetAccess,
  getPolicyWidgetSetupConfig,
  getPolicyWidgetTheme,
  setPolicyWidgetAccess,
  setPolicyWidgetSetupConfig,
  setPolicyWidgetTheme,
} from "@/lib/widgetPolicyUtils";

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
  const basePolicy = normalizeWidgetChatPolicyProvider(row.chat_policy || null);
  const setupConfig = getPolicyWidgetSetupConfig(basePolicy);
  const theme = getPolicyWidgetTheme(basePolicy);
  const access = getPolicyWidgetAccess(basePolicy);
  return {
    ...row,
    theme,
    template_id: null,
    agent_id: setupConfig?.agent_id ?? null,
    setup_config: (setupConfig || null) as WidgetSetupConfig | null,
    allowed_domains: access.allowed_domains || [],
    allowed_paths: access.allowed_paths || [],
    chat_policy: basePolicy,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("B_chat_widgets")
    .select("*")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ item: mapTemplateRow(data as Record<string, any>) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
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
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const basePolicy = normalizeWidgetChatPolicyProvider(existing.chat_policy || null);
  const theme = typeof body.theme === "object" && body.theme ? body.theme : getPolicyWidgetTheme(basePolicy);
  const baseSetup = getPolicyWidgetSetupConfig(basePolicy);
  const agentIdProvided = body.agent_id !== undefined;
  const normalizedAgentId = agentIdProvided ? (String(body.agent_id || "").trim() || null) : null;
  const setupConfigBase = (body.setup_config && typeof body.setup_config === "object" ? body.setup_config : baseSetup) as
    | WidgetSetupConfig
    | null;
  const setupConfig = setupConfigBase
    ? {
        ...setupConfigBase,
        ...(agentIdProvided ? { agent_id: normalizedAgentId } : {}),
      }
    : agentIdProvided
      ? { agent_id: normalizedAgentId }
      : null;
  const access = {
    allowed_domains:
      body.allowed_domains !== undefined
        ? normalizeStringArray(body.allowed_domains)
        : getPolicyWidgetAccess(basePolicy).allowed_domains || [],
    allowed_paths:
      body.allowed_paths !== undefined
        ? normalizeStringArray(body.allowed_paths)
        : getPolicyWidgetAccess(basePolicy).allowed_paths || [],
  };
  const chatPolicy = normalizeWidgetChatPolicyRecordFromProvider(
    body.chat_policy && typeof body.chat_policy === "object" ? body.chat_policy : existing.chat_policy
  );

  const chatPolicyShape = normalizeWidgetChatPolicyProvider(chatPolicy);
  const policyWithTheme = setPolicyWidgetTheme(chatPolicyShape, theme);
  const policyWithSetup = setPolicyWidgetSetupConfig(policyWithTheme, setupConfig);
  const policyWithAccess = setPolicyWidgetAccess(policyWithSetup, access);

  const name = body.name !== undefined ? String(body.name || "").trim() || existing.name : existing.name;
  const isActive = body.is_active !== undefined ? Boolean(body.is_active) : existing.is_active;
  const isPublic = body.is_public !== undefined ? Boolean(body.is_public) : existing.is_public;
  const pageKeysProvided = Array.isArray(body.page_keys);
  const nextPageKeys = pageKeysProvided ? normalizeStringArray(body.page_keys) : null;

  const { data, error } = await supabaseAdmin
    .from("B_chat_widgets")
    .update({
      name,
      chat_policy: policyWithAccess,
      is_active: isActive,
      is_public: isPublic,
      ...(pageKeysProvided ? { page_keys: nextPageKeys } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolvedParams.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: mapTemplateRow(data as Record<string, any>) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
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
    .eq("id", resolvedParams.id)
    .eq("created_by", context.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
