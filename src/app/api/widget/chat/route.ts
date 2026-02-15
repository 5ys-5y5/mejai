import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";

async function logWidgetProxyEvent(input: {
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  sessionId: string;
  widgetId: string;
  orgId: string;
  agentId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const { supabase, sessionId, widgetId, orgId, agentId, eventType, payload } = input;
  try {
    await supabase.from("F_audit_events").insert({
      session_id: sessionId,
      turn_id: null,
      event_type: eventType,
      payload: {
        widget_id: widgetId,
        org_id: orgId,
        agent_id: agentId || null,
        ...payload,
      },
      created_at: new Date().toISOString(),
      bot_context: { source: "widget_proxy" },
    });
  } catch (error) {
    console.warn("[widget/chat] failed to log proxy event", {
      eventType,
      sessionId,
      widgetId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function getWidgetRuntimeSecret() {
  return String(process.env.WIDGET_RUNTIME_SECRET || "").trim();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_WIDGET_TOKEN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.message) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  }
  const sessionId = String(body.session_id || payload.session_id || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
  }
  const llm = body.llm;
  const kbId = body.kb_id;
  const inlineKb = body.inline_kb;
  const adminKbIds = body.admin_kb_ids;
  const mcpToolIds = body.mcp_tool_ids;
  const mcpProviderKeys = body.mcp_provider_keys;
  const visitor = body.visitor;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: widget } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, org_id, agent_id, is_active")
    .eq("id", payload.widget_id)
    .maybeSingle();
  if (!widget || !widget.is_active) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const secret = getWidgetRuntimeSecret();
  if (!secret) {
    return NextResponse.json({ error: "WIDGET_RUNTIME_SECRET_MISSING" }, { status: 500 });
  }

  const targetUrl = new URL("/api/runtime/chat", req.nextUrl.origin).toString();
  const requestMeta = {
    target_url: targetUrl,
    req_origin: req.nextUrl.origin,
    req_host: req.headers.get("host") || "",
    req_forwarded_host: req.headers.get("x-forwarded-host") || "",
    req_forwarded_proto: req.headers.get("x-forwarded-proto") || "",
  };
  await logWidgetProxyEvent({
    supabase: supabaseAdmin,
    sessionId,
    widgetId: String(widget.id),
    orgId: String(widget.org_id),
    agentId: widget.agent_id || null,
    eventType: "WIDGET_RUNTIME_PROXY_START",
    payload: {
      ...requestMeta,
      message_length: message.length,
    },
  });

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-widget-secret": secret,
        "x-widget-org-id": String(widget.org_id),
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        agent_id: widget.agent_id || undefined,
        mode: body.mode,
        llm,
        kb_id: kbId,
        inline_kb: inlineKb,
        admin_kb_ids: adminKbIds,
        mcp_tool_ids: mcpToolIds,
        mcp_provider_keys: mcpProviderKeys,
        visitor,
      }),
    });
  } catch (error) {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
      agentId: widget.agent_id || null,
      eventType: "WIDGET_RUNTIME_PROXY_FETCH_FAILED",
      payload: {
        ...requestMeta,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "WIDGET_RUNTIME_PROXY_FETCH_FAILED", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }

  const rawText = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch (error) {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
      agentId: widget.agent_id || null,
      eventType: "WIDGET_RUNTIME_PROXY_INVALID_JSON",
      payload: {
        ...requestMeta,
        status: res.status,
        body_snippet: rawText.slice(0, 800),
      },
    });
    return NextResponse.json(
      { error: "WIDGET_RUNTIME_INVALID_RESPONSE", status: res.status },
      { status: 502 }
    );
  }

  if (!res.ok) {
    await logWidgetProxyEvent({
      supabase: supabaseAdmin,
      sessionId,
      widgetId: String(widget.id),
      orgId: String(widget.org_id),
      agentId: widget.agent_id || null,
      eventType: "WIDGET_RUNTIME_PROXY_ERROR",
      payload: {
        ...requestMeta,
        status: res.status,
        runtime_error: data.error || null,
        runtime_detail: data.detail || null,
      },
    });
  }
  await logWidgetProxyEvent({
    supabase: supabaseAdmin,
    sessionId,
    widgetId: String(widget.id),
    orgId: String(widget.org_id),
    agentId: widget.agent_id || null,
    eventType: "WIDGET_RUNTIME_PROXY_END",
    payload: {
      ...requestMeta,
      status: res.status,
      ok: res.ok,
    },
  });

  return NextResponse.json(data, { status: res.status });
}
