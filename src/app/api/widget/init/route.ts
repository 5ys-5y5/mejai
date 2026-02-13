import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { issueWidgetToken } from "@/lib/widgetToken";
import { extractHostFromUrl, matchAllowedDomain } from "@/lib/widgetUtils";
import { fetchWidgetChatPolicy } from "@/lib/widgetChatPolicy";

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
    .select("*")
    .eq("public_key", publicKey)
    .eq("is_active", true)
    .maybeSingle();

  if (widgetError) {
    return NextResponse.json({ error: widgetError.message }, { status: 400 });
  }
  if (!widget) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const origin = readOrigin(body);
  const pageUrl = String(body.page_url || body.pageUrl || body.referrer || "").trim();
  const host = extractHostFromUrl(origin || pageUrl);
  const allowedDomains = Array.isArray(widget.allowed_domains) ? widget.allowed_domains : [];
  if (!matchAllowedDomain(host, allowedDomains)) {
    return NextResponse.json({ error: "DOMAIN_NOT_ALLOWED" }, { status: 403 });
  }
  const allowedPaths = Array.isArray(widget.allowed_paths) ? (widget.allowed_paths as unknown[]) : [];
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
      .select("id, org_id, metadata")
      .eq("id", sessionId)
      .eq("org_id", widget.org_id)
      .maybeSingle();
    if (!existing) {
      sessionId = "";
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
    const payload = {
      id: sessionId,
      org_id: widget.org_id,
      session_code: makeSessionCode(),
      started_at: now,
      channel: "web_widget",
      agent_id: widget.agent_id || null,
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

  const chatPolicy = await fetchWidgetChatPolicy(supabaseAdmin, String(widget.org_id || "")).catch(() => null);

  return NextResponse.json({
    widget_token: widgetToken,
    session_id: sessionId,
    widget_config: {
      id: widget.id,
      name: widget.name,
      agent_id: widget.agent_id,
      allowed_domains: widget.allowed_domains || [],
      theme: widget.theme || {},
      public_key: widget.public_key,
      chat_policy: chatPolicy,
    },
  });
}
