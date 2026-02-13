import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";

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

  const targetUrl = new URL("/api/runtime/chat", req.nextUrl.origin);
  const res = await fetch(targetUrl.toString(), {
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

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
