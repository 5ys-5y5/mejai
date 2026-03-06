import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";
import { issueWidgetToken } from "@/lib/widgetToken";
import { extractHostFromUrl, matchAllowedDomain } from "@/lib/widgetUtils";
import { WIDGET_PAGE_KEY, type ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";
import { normalizeWidgetOverrides } from "@/lib/widgetTemplateMeta";
import { filterWidgetOverridesByPolicy, resolveWidgetBasePolicy, resolveWidgetRuntimeConfig } from "@/lib/widgetRuntimeConfig";
import { ensureTemplateSharedInstance } from "@/lib/widgetSharedInstance";
import { normalizeWidgetChatPolicyProvider } from "@/lib/widgetChatPolicyShape";
import { getPolicyWidgetAccess } from "@/lib/widgetPolicyUtils";

function nowIso() {
  return new Date().toISOString();
}

function makeSessionCode() {
  return `w_${Math.random().toString(36).slice(2, 8)}`;
}

function readVisitorId(input: Record<string, any>) {
  const visitor = input.visitor && typeof input.visitor === "object" ? input.visitor : null;
  const visitorId =
    (visitor && (visitor.id || visitor.visitor_id || visitor.external_user_id)) ||
    input.visitor_id ||
    input.visitorId;
  return visitorId ? String(visitorId).trim() : "";
}

function readOrigin(input: Record<string, any>) {
  const origin = String(input.origin || "").trim();
  if (origin) return origin;
  const pageUrl = String(input.page_url || input.pageUrl || "").trim();
  if (pageUrl) {
    try {
      return new URL(pageUrl).origin;
    } catch {
      return "";
    }
  }
  const referrer = String(input.referrer || "").trim();
  if (referrer) {
    try {
      return new URL(referrer).origin;
    } catch {
      return "";
    }
  }
  return "";
}

async function isPreviewAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) return false;
  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  return Boolean(access?.is_admin);
}

function isSameOriginPreview(req: NextRequest) {
  const requestOrigin = String(req.headers.get("origin") || "").trim();
  const requestReferer = String(req.headers.get("referer") || "").trim();
  const serverOrigin = new URL(req.url).origin;
  if (requestOrigin && requestOrigin === serverOrigin) return true;
  if (requestReferer && requestReferer.startsWith(serverOrigin)) return true;
  return false;
}

function resolveWidgetUiSettingsSource(policy: ConversationFeaturesProviderShape | null) {
  const pageKey = WIDGET_PAGE_KEY;
  const hasPageOverride = Boolean(policy?.pages && policy.pages[pageKey]);
  const hasSetupFields = Boolean(policy?.settings_ui?.setup_fields && policy.settings_ui.setup_fields[pageKey]);
  const hasDebugCopy = Boolean(policy?.debug_copy && policy.debug_copy[pageKey]);
  return {
    pageKey,
    source: hasPageOverride ? "chat_policy.pages" : "default",
    hasPageOverride,
    hasSetupFields,
    hasDebugCopy,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const publicKey = String(body.public_key || body.key || "").trim();
  const templateId = String(body.template_id || "").trim();
  const previewMode = body.preview === true || body.preview === "true";
  const previewAllowed = previewMode
    ? (await isPreviewAdmin(req)) || isSameOriginPreview(req)
    : false;
  if (!publicKey && !templateId) {
    return NextResponse.json({ error: "PUBLIC_KEY_REQUIRED" }, { status: 400 });
  }
  const overrides = normalizeWidgetOverrides(body.overrides);

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  let { data: instance, error: widgetError } = publicKey
    ? await supabaseAdmin
        .from("B_chat_widget_instances")
        .select("*")
        .eq("public_key", publicKey)
        .eq("is_active", true)
        .maybeSingle()
    : { data: null, error: null };

  if (widgetError) {
    return NextResponse.json({ error: widgetError.message }, { status: 400 });
  }
  const resolvedTemplateId = templateId || (!instance && publicKey && isUuid(publicKey) ? publicKey : "");
  if (!instance && resolvedTemplateId) {
    const { data: template } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("*")
      .eq("id", resolvedTemplateId)
      .maybeSingle();
    if (!template || !template.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    if (!template.is_public && !previewAllowed) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    const templatePolicy = normalizeWidgetChatPolicyProvider(template.chat_policy || null);
    const access = getPolicyWidgetAccess(templatePolicy);
    try {
      instance = await ensureTemplateSharedInstance(supabaseAdmin, template, access);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "INSTANCE_CREATE_FAILED" },
        { status: 400 }
      );
    }
  }

  if (!instance) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const { data: template } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("*")
    .eq("id", instance.template_id)
    .maybeSingle();
  if (!template || !template.is_active) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }
  if ((!template.is_public || !instance.is_public) && !previewAllowed) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const basePolicy = resolveWidgetBasePolicy(template, instance);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(template, instance, filteredOverrides);
  const origin = readOrigin(body);
  const pageUrl = String(body.page_url || body.pageUrl || body.referrer || "").trim();
  const host = extractHostFromUrl(origin || pageUrl);
  if (!previewAllowed) {
    const allowedDomains = Array.isArray(resolved.allowed_domains) ? resolved.allowed_domains : [];
    if (allowedDomains.length > 0 && !matchAllowedDomain(host, allowedDomains)) {
      return NextResponse.json({ error: "DOMAIN_NOT_ALLOWED" }, { status: 403 });
    }
    const allowedPaths = resolved.allowed_paths as unknown[];
    if (allowedPaths.length > 0 && pageUrl) {
      let pathname = "";
      try {
        pathname = new URL(pageUrl).pathname || "/";
      } catch {
        pathname = "";
      }
      const normalizedPaths = allowedPaths
        .map((p: unknown) => String(p || "").trim())
        .filter((value): value is string => Boolean(value));
      if (normalizedPaths.length > 0) {
        const ok = normalizedPaths.some((rule) => {
          if (rule === "*") return true;
          if (!rule.startsWith("/")) return pathname.startsWith(`/${rule}`);
          return pathname.startsWith(rule);
        });
        if (!ok) {
          return NextResponse.json({ error: "PATH_NOT_ALLOWED" }, { status: 403 });
        }
      }
    }
  }

  const visitorId = readVisitorId(body);
  const now = nowIso();
  let sessionId = String(body.session_id || "").trim();

  if (sessionId) {
    const { data: existing } = await supabaseAdmin
      .from("D_conv_sessions")
      .select("id, metadata")
      .eq("id", sessionId)
      .maybeSingle();
    if (!existing) {
      sessionId = "";
    }
    if (existing?.metadata && typeof existing.metadata === "object") {
      const metadata = existing.metadata as Record<string, unknown>;
      const instanceId = String(metadata.widget_instance_id || "");
      if (instanceId && instanceId !== String(instance.id)) {
        sessionId = "";
      }
    }
  }

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    const metadata = {
      widget_instance_id: instance.id,
      template_id: template.id,
      origin: origin || null,
      page_url: pageUrl || null,
      referrer: String(body.referrer || "").trim() || null,
      visitor_id: visitorId || null,
      visitor: body.visitor && typeof body.visitor === "object" ? body.visitor : null,
    };
    const payload = {
      id: sessionId,
      session_code: makeSessionCode(),
      started_at: now,
      channel: "web_widget",
      metadata,
    };
    const { error: insertError } = await supabaseAdmin.from("D_conv_sessions").insert(payload);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  let widgetToken: string;
  try {
    widgetToken = issueWidgetToken({
      org_id: template.created_by ? String(template.created_by) : "",
      widget_id: String(instance.id),
      session_id: sessionId,
      visitor_id: visitorId || null,
      origin: origin || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TOKEN_ISSUE_FAILED" },
      { status: 500 }
    );
  }

  const chatPolicy = resolved.chat_policy;
  if (sessionId) {
    const settingsSource = resolveWidgetUiSettingsSource(chatPolicy);
    void (async () => {
      try {
        await supabaseAdmin.from("F_audit_events").insert({
          session_id: sessionId,
          turn_id: null,
          event_type: "UI_SETTINGS_SOURCE",
          payload: {
            widget_instance_id: instance.id,
            template_id: template.id,
            page_key: settingsSource.pageKey,
            source: settingsSource.source,
            has_page_override: settingsSource.hasPageOverride,
            has_setup_fields: settingsSource.hasSetupFields,
            has_debug_copy: settingsSource.hasDebugCopy,
            origin: origin || null,
            page_url: pageUrl || null,
          },
          created_at: nowIso(),
          bot_context: { source: "widget_init" },
        });
      } catch (error) {
        console.warn("[widget/init] failed to log ui settings source", {
          sessionId,
          widgetId: instance.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }

  return NextResponse.json({
    widget_token: widgetToken,
    session_id: sessionId,
    widget_config: {
      id: instance.id,
      name: resolved.name,
      allowed_domains: resolved.allowed_domains,
      theme: resolved.theme || {},
      public_key: instance.public_key,
      chat_policy: chatPolicy,
      setup_config: resolved.setup_config,
    },
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
