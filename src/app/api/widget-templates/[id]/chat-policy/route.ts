import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import {
  normalizeWidgetChatPolicyProvider,
  normalizeWidgetChatPolicyRecordFromProvider,
} from "@/lib/widgetChatPolicyShape";
import {
  getPolicyWidgetSetupConfig,
  getPolicyWidgetTheme,
  getPolicyWidgetAccess,
  setPolicyWidgetSetupConfig,
  setPolicyWidgetTheme,
  setPolicyWidgetAccess,
} from "@/lib/widgetPolicyUtils";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function ensureTemplateWidgetFields(
  provider: ReturnType<typeof normalizeWidgetChatPolicyProvider> | null,
  template: { name?: string | null; is_active?: boolean | null }
) {
  const base = provider && isPlainObject(provider) ? provider : {};
  const widget = isPlainObject((base as Record<string, unknown>).widget)
    ? { ...((base as Record<string, unknown>).widget as Record<string, unknown>) }
    : {};
  return { ...(base as Record<string, unknown>), widget } as ReturnType<typeof normalizeWidgetChatPolicyProvider>;
}

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const templateId = readTemplateId(req, resolvedParams);
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
    .select("id, name, is_active, chat_policy")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const baseProvider = normalizeWidgetChatPolicyProvider(data.chat_policy || null);
  const withTemplate = ensureTemplateWidgetFields(
    baseProvider,
    data as { name?: string | null; is_active?: boolean | null }
  );
  const provider = normalizeWidgetChatPolicyProvider(withTemplate);
  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const templateId = readTemplateId(req, resolvedParams);
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
    .select("id, name, is_active, chat_policy")
    .eq("id", templateId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const provider = normalizeWidgetChatPolicyRecordFromProvider(body.provider || null);
  const providerShape = normalizeWidgetChatPolicyProvider(provider);
  const existingPolicy = normalizeWidgetChatPolicyProvider(existing.chat_policy || null);
  const existingTheme = getPolicyWidgetTheme(existingPolicy);
  const existingSetup = getPolicyWidgetSetupConfig(existingPolicy);
  const existingAccess = getPolicyWidgetAccess(existingPolicy);
  let mergedProvider = providerShape;
  if (Object.keys(getPolicyWidgetTheme(providerShape)).length === 0 && Object.keys(existingTheme).length > 0) {
    mergedProvider = setPolicyWidgetTheme(mergedProvider, existingTheme);
  }
  if (!getPolicyWidgetSetupConfig(providerShape) && existingSetup) {
    mergedProvider = setPolicyWidgetSetupConfig(mergedProvider, existingSetup);
  }
  if (Object.keys(getPolicyWidgetAccess(providerShape)).length === 0 && Object.keys(existingAccess).length > 0) {
    mergedProvider = setPolicyWidgetAccess(mergedProvider, existingAccess);
  }

  const safeProvider = providerShape || {};
  const { error } = await supabaseAdmin
    .from("B_chat_widgets")
    .update({
      chat_policy: mergedProvider,
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
