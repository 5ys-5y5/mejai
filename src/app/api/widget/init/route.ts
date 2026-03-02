import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { issueWidgetToken } from "@/lib/widgetToken";
import { extractHostFromUrl, matchAllowedDomain } from "@/lib/widgetUtils";
import {
  readConversationFeatureProvider,
} from "@/lib/conversation/policyMerge";
import {
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
  type WidgetChatPolicyConfig,
} from "@/lib/conversation/pageFeaturePolicy";

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function readWidgetPolicy(policy: unknown): WidgetChatPolicyConfig | null {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  const widget = (policy as { widget?: unknown }).widget;
  if (!widget || typeof widget !== "object" || Array.isArray(widget)) return null;
  return widget as WidgetChatPolicyConfig;
}

function mergeWidgetTheme(
  baseTheme: Record<string, unknown> | null | undefined,
  policyTheme: WidgetChatPolicyConfig["theme"]
) {
  const theme = baseTheme && typeof baseTheme === "object" ? baseTheme : {};
  if (!policyTheme) return { ...theme };
  return { ...theme, ...policyTheme };
}

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

function resolveWidgetUiSettingsSource(policy: ConversationFeaturesProviderShape | null) {
  const pageKey = WIDGET_PAGE_KEY;
  const hasPageOverride = Boolean(policy?.features || (policy?.pages && policy.pages[pageKey]));
  const hasSetupFields = Boolean(
    policy?.setup_ui || (policy?.settings_ui?.setup_fields && policy.settings_ui.setup_fields[pageKey])
  );
  const hasDebugCopy = Boolean(policy?.debug || (policy?.debug_copy && policy.debug_copy[pageKey]));
  return {
    pageKey,
    source: hasPageOverride ? "chat_policy" : "default",
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
  if (!publicKey) {
    return NextResponse.json({ error: "PUBLIC_KEY_REQUIRED" }, { status: 400 });
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

  const { data: widget, error: widgetError } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, org_id, name, agent_id, theme, public_key, chat_policy, is_public")
    .eq("public_key", publicKey)
    .maybeSingle();

  if (widgetError) {
    return NextResponse.json({ error: widgetError.message }, { status: 400 });
  }
  if (!widget) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }
  if (widget.is_public !== true) {
    return NextResponse.json({ error: "WIDGET_PRIVATE" }, { status: 403 });
  }

  const mergedChatPolicy = readConversationFeatureProvider(widget.chat_policy);
  const widgetPolicy = readWidgetPolicy(mergedChatPolicy);
  if (widgetPolicy?.is_active === false) {
    return NextResponse.json({ error: "WIDGET_INACTIVE" }, { status: 404 });
  }

  const origin = readOrigin(body);
  const pageUrl = String(body.page_url || body.pageUrl || body.referrer || "").trim();
  const host = extractHostFromUrl(origin || pageUrl);
  const allowedDomains = widgetPolicy?.allowed_domains || [];
  if (allowedDomains.length > 0 && !matchAllowedDomain(host, allowedDomains)) {
    return NextResponse.json({ error: "DOMAIN_NOT_ALLOWED" }, { status: 403 });
  }
  const allowedPaths = widgetPolicy?.allowed_paths || [];
  const mergedTheme = mergeWidgetTheme(widget.theme as Record<string, unknown> | null, widgetPolicy?.theme);
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

  const visitorId = readVisitorId(body);
  const now = nowIso();
  let sessionId = String(body.session_id || "").trim();

  if (sessionId) {
    const { data: existing } = await supabaseAdmin
      .from("D_conv_sessions")
      .select("id, org_id, widget_id, metadata")
      .eq("id", sessionId)
      .eq("org_id", widget.org_id)
      .maybeSingle();
    if (!existing) {
      sessionId = "";
    } else {
      const sessionWidgetId = String((existing as Record<string, any>).widget_id || "").trim();
      const metadata =
        existing.metadata && typeof existing.metadata === "object"
          ? (existing.metadata as Record<string, any>)
          : null;
      const metadataWidgetId = metadata ? String(metadata.widget_id || "").trim() : "";
      const expectedWidgetId = String(widget.id || "").trim();
      if (sessionWidgetId && sessionWidgetId !== expectedWidgetId) {
        sessionId = "";
      } else if (!sessionWidgetId && metadataWidgetId && metadataWidgetId !== expectedWidgetId) {
        sessionId = "";
      }
    }
  }

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    const metadata = {
      widget_id: widget.id,
      origin: origin || null,
      page_url: pageUrl || null,
      referrer: String(body.referrer || "").trim() || null,
      visitor_id: visitorId || null,
      visitor: body.visitor && typeof body.visitor === "object" ? body.visitor : null,
    };
    const effectiveAgentId = widgetPolicy?.agent_id || widget.agent_id || null;
    const payload = {
      id: sessionId,
      org_id: widget.org_id,
      widget_id: widget.id,
      session_code: makeSessionCode(),
      started_at: now,
      channel: "web_widget",
      agent_id: effectiveAgentId,
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
      org_id: String(widget.org_id),
      widget_id: String(widget.id),
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

  if (sessionId) {
    const settingsSource = resolveWidgetUiSettingsSource(mergedChatPolicy);
    void (async () => {
      try {
        await supabaseAdmin.from("F_audit_events").insert({
          session_id: sessionId,
          turn_id: null,
          event_type: "UI_SETTINGS_SOURCE",
          payload: {
            widget_id: widget.id,
            org_id: widget.org_id,
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
          widgetId: widget.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }

  return NextResponse.json({
    widget_token: widgetToken,
    session_id: sessionId,
    widget_config: {
      id: widget.id,
      name: widgetPolicy?.name || widget.name,
      agent_id: widgetPolicy?.agent_id || widget.agent_id,
      allowed_domains: allowedDomains,
      allowed_paths: allowedPaths,
      allowed_accounts: normalizeStringArray(
        (widgetPolicy?.theme as Record<string, any>)?.allowed_accounts ?? widgetPolicy?.allowed_accounts
      ),
      theme: mergedTheme,
      public_key: widget.public_key,
      chat_policy: mergedChatPolicy,
    },
  });
}
