import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";
import { extractHostFromUrl, matchAllowedDomain } from "@/lib/widgetUtils";
import { decodeWidgetOverrides } from "@/lib/widgetOverrides";
import { normalizeWidgetOverrides } from "@/lib/widgetTemplateMeta";
import { filterWidgetOverridesByPolicy, resolveWidgetBasePolicy, resolveWidgetRuntimeConfig } from "@/lib/widgetRuntimeConfig";
import { ensureTemplateSharedInstance } from "@/lib/widgetSharedInstance";
import { normalizeWidgetChatPolicyProvider } from "@/lib/widgetChatPolicyShape";
import { getPolicyWidgetAccess } from "@/lib/widgetPolicyUtils";

function withCors(res: NextResponse, origin?: string | null) {
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return withCors(new NextResponse(null, { status: 204 }), origin);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const publicKey = String(url.searchParams.get("key") || url.searchParams.get("public_key") || "").trim();
  const templateIdParam = String(url.searchParams.get("template_id") || "").trim();
  const overridesParam = String(url.searchParams.get("ovr") || "").trim();
  const previewParam = String(url.searchParams.get("preview") || "").trim().toLowerCase();
  const originHeader = req.headers.get("origin");
  if (!publicKey) {
    return withCors(NextResponse.json({ error: "PUBLIC_KEY_REQUIRED" }, { status: 400 }), originHeader);
  }
  const overrides = normalizeWidgetOverrides(decodeWidgetOverrides(overridesParam));
  const allowPreview = previewParam === "1" || previewParam === "true";

  let allowAdminPreview = false;
  if (allowPreview) {
    const authHeader = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";
    const context = await getServerContext(authHeader, cookieHeader);
    if (!("error" in context)) {
      const { data: access } = await context.supabase
        .from("A_iam_user_access_maps")
        .select("is_admin")
        .eq("user_id", context.user.id)
        .maybeSingle();
      allowAdminPreview = Boolean(access?.is_admin);
    }
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return withCors(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
        { status: 500 }
      ),
      originHeader
    );
  }

  let { data: instance, error } = await supabaseAdmin
    .from("B_chat_widget_instances")
    .select("id, template_id, public_key, name, is_active, chat_policy, is_public")
    .eq("public_key", publicKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }), originHeader);
  }
  const resolvedTemplateId = templateIdParam || (!instance ? publicKey : "");

  let templateId = instance ? String(instance.template_id) : "";
  if (!instance && resolvedTemplateId) {
    const { data: template } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("id, name, is_active, chat_policy, is_public, created_by")
      .eq("id", resolvedTemplateId)
      .maybeSingle();
    if (!template || !template.is_active) {
      return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
    }
    if (!template.is_public && !allowAdminPreview) {
      return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
    }
    const templatePolicy = normalizeWidgetChatPolicyProvider(template.chat_policy || null);
    const access = getPolicyWidgetAccess(templatePolicy);
    try {
      const shared = await ensureTemplateSharedInstance(supabaseAdmin, template, access);
      instance = {
        id: shared.id,
        template_id: shared.template_id,
        public_key: shared.public_key,
        name: template.name || "Widget Template",
        is_active: true,
        is_public: true,
        chat_policy: shared.chat_policy || null,
      };
    } catch (error) {
      return withCors(
        NextResponse.json(
          { error: error instanceof Error ? error.message : "INSTANCE_CREATE_FAILED" },
          { status: 400 }
        ),
        originHeader
      );
    }
    templateId = String(template.id);
  }

  if (!instance) {
    return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
  }

  const { data: template } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, name, is_active, chat_policy, is_public, created_by")
    .eq("id", templateId)
    .maybeSingle();
  if (!template || !template.is_active) {
    return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
  }
  if ((!template.is_public || !instance.is_public) && !allowAdminPreview) {
    return withCors(NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 }), originHeader);
  }

  const basePolicy = resolveWidgetBasePolicy(template, instance);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(template, instance, filteredOverrides);

  const allowedDomains = resolved.allowed_domains;
  const originHost = extractHostFromUrl(originHeader || "");
  if (allowedDomains.length > 0 && originHost && !matchAllowedDomain(originHost, allowedDomains)) {
    return withCors(NextResponse.json({ error: "DOMAIN_NOT_ALLOWED" }, { status: 403 }), originHeader);
  }

  return withCors(
    NextResponse.json({
      widget: {
        id: instance.id,
        name: resolved.name,
        theme: resolved.theme || {},
        public_key: instance.public_key,
        allowed_domains: resolved.allowed_domains,
        chat_policy: resolved.chat_policy,
        setup_config: resolved.setup_config,
      },
    }),
    originHeader
  );
}
