import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { issueWidgetToken } from "@/lib/widgetToken";
import { WIDGET_PAGE_KEY, type ConversationFeaturesProviderShape } from "@/lib/conversation/pageFeaturePolicy";
import { normalizeWidgetOverrides } from "@/lib/widgetTemplateMeta";
import { ensureWidgetSession } from "@/lib/widgetSessions";
import {
  filterWidgetOverridesByPolicy,
  resolveWidgetBasePolicy,
  resolveWidgetRuntimeConfig,
  type WidgetInstanceRow,
  type WidgetTemplateRow,
} from "@/lib/widgetRuntimeConfig";

type TemplateRow = WidgetTemplateRow & {
  public_key?: string | null;
};
type InstanceRow = WidgetInstanceRow;

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
  const instanceId = String(body.instance_id || "").trim();
  const templateId = String(body.template_id || "").trim();
  const widgetId = String(body.widget_id || "").trim() || (!instanceId ? templateId : "");
  const fallbackPublicKey = String(body.public_key || body.key || "").trim();
  const widgetPublicKey = String(body.widget_public_key || "").trim() || (!instanceId ? fallbackPublicKey : "");
  const instancePublicKey = String(body.instance_public_key || "").trim() || (instanceId ? fallbackPublicKey : "");
  if (instanceId) {
    if (!instancePublicKey || !templateId) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 400 });
    }
  } else if (!widgetId || !widgetPublicKey) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 400 });
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

  let instance: InstanceRow | null = null;
  let template: TemplateRow | null = null;

  if (instanceId) {
    const { data, error } = await supabaseAdmin
      .from("B_chat_widget_instances")
      .select("*")
      .eq("id", instanceId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data || !data.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    if (String(data.public_key || "") !== instancePublicKey) {
      return NextResponse.json({ error: "AUTH_FAILED" }, { status: 403 });
    }
    if (String(data.template_id || "") !== templateId) {
      return NextResponse.json({ error: "TEMPLATE_MISMATCH" }, { status: 400 });
    }
    instance = data as InstanceRow;
  } else if (widgetId) {
    const { data, error } = await supabaseAdmin.from("B_chat_widgets").select("*").eq("id", widgetId).maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data || !data.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    if (String(data.public_key || "") !== widgetPublicKey) {
      return NextResponse.json({ error: "AUTH_FAILED" }, { status: 403 });
    }
    template = data as TemplateRow;
  }

  if (!template) {
    if (!instance) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    const { data, error } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("*")
      .eq("id", instance.template_id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data || !data.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    template = data as TemplateRow;
  }

  const basePolicy = resolveWidgetBasePolicy(template);
  const filteredOverrides = filterWidgetOverridesByPolicy(overrides, basePolicy);
  const resolved = resolveWidgetRuntimeConfig(template, instance, filteredOverrides);
  const origin = readOrigin(body);
  const pageUrl = String(body.page_url || body.pageUrl || body.referrer || "").trim();

  const visitorId = readVisitorId(body);
  let sessionId = "";
  try {
    const ensuredSession = await ensureWidgetSession(supabaseAdmin, {
      sessionId: String(body.session_id || "").trim(),
      templateId: String(template.id || ""),
      instanceId: instance?.id || null,
      origin: origin || null,
      pageUrl: pageUrl || null,
      referrer: String(body.referrer || "").trim() || null,
      visitorId: visitorId || null,
      visitor: body.visitor && typeof body.visitor === "object" ? body.visitor : null,
      createIfMissing: false,
    });
    sessionId = ensuredSession.sessionId;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WIDGET_SESSION_RESOLVE_FAILED" },
      { status: 400 }
    );
  }

  let widgetToken: string;
  try {
    widgetToken = issueWidgetToken({
      org_id: template.created_by ? String(template.created_by) : null,
      template_id: String(template.id),
      instance_id: instance?.id || null,
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
            widget_id: instance?.id || template.id,
            widget_instance_id: instance?.id || null,
            template_id: template.id,
            page_key: settingsSource.pageKey,
            source: settingsSource.source,
            has_page_override: settingsSource.hasPageOverride,
            has_setup_fields: settingsSource.hasSetupFields,
            has_debug_copy: settingsSource.hasDebugCopy,
            origin: origin || null,
            page_url: pageUrl || null,
          },
          created_at: new Date().toISOString(),
          bot_context: { source: "widget_init" },
        });
      } catch (error) {
        console.warn("[widget/init] failed to log ui settings source", {
          sessionId,
          widgetId: instance?.id || template.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }

  return NextResponse.json({
    widget_token: widgetToken,
    session_id: sessionId,
    widget_config: {
      id: instance?.id || template.id,
      name: resolved.name,
      theme: resolved.theme || {},
      public_key: instance?.public_key || template.public_key || null,
      chat_policy: chatPolicy,
      setup_config: resolved.setup_config,
    },
  });
}
