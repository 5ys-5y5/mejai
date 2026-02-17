import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";

const TRANSCRIPT_SNAPSHOT_EVENT_TYPE = "DEBUG_TRANSCRIPT_SNAPSHOT_SAVED";
const WIDGET_PROXY_EVENT_PREFIX = "WIDGET_RUNTIME_PROXY_";

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message?: string } | null }>,
  limit: number
) {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;
  while (from < limit) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const { data, error } = await fetchPage(from, to);
    if (error) return { data: null as T[] | null, error };
    const page = data || [];
    rows.push(...page);
    if (page.length < to - from + 1) break;
    from += page.length;
  }
  return { data: rows, error: null as { message?: string } | null };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionOverride = String(url.searchParams.get("session_id") || "").trim();
  const requestedLimit = Number(url.searchParams.get("limit") || 20);
  const safeLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.floor(requestedLimit)) : 20;
  const limit = Math.min(safeLimit, 20000);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_WIDGET_TOKEN" }, { status: 401 });
  }

  const targetSessionId = sessionOverride || String(payload.session_id || "").trim();
  if (!targetSessionId) {
    return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
  }
  if (sessionOverride && !payload.visitor_id) {
    return NextResponse.json({ error: "VISITOR_ID_REQUIRED" }, { status: 403 });
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

  const { data: widget } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, org_id, is_active")
    .eq("id", payload.widget_id)
    .maybeSingle();
  if (!widget || !widget.is_active) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const { data: session } = await supabaseAdmin
    .from("D_conv_sessions")
    .select("id, org_id, metadata")
    .eq("id", targetSessionId)
    .eq("org_id", widget.org_id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  const metadata = session.metadata && typeof session.metadata === "object" ? (session.metadata as Record<string, any>) : null;
  const metadataWidgetId = metadata ? String(metadata.widget_id || "").trim() : "";
  if (metadataWidgetId && metadataWidgetId !== String(payload.widget_id)) {
    return NextResponse.json({ error: "SESSION_WIDGET_MISMATCH" }, { status: 403 });
  }
  const metadataVisitorId = metadata
    ? String(metadata.visitor_id || metadata.visitorId || metadata.external_user_id || "").trim()
    : "";
  if (payload.visitor_id && metadataVisitorId && metadataVisitorId !== String(payload.visitor_id)) {
    return NextResponse.json({ error: "SESSION_VISITOR_MISMATCH" }, { status: 403 });
  }

  const [mcpRes, eventRes, debugRes] = await Promise.all([
    fetchAllRows(
      async (from, to) =>
        await supabaseAdmin
          .from("F_audit_mcp_tools")
          .select(
            "id, tool_name, tool_version, status, request_payload, response_payload, policy_decision, latency_ms, created_at, session_id, turn_id"
          )
          .eq("org_id", widget.org_id)
          .eq("session_id", targetSessionId)
          .order("created_at", { ascending: false })
          .range(from, to),
      limit
    ),
    fetchAllRows(
      async (from, to) =>
        await supabaseAdmin
          .from("F_audit_events")
          .select("id, event_type, payload, created_at, session_id, turn_id, bot_context")
          .eq("session_id", targetSessionId)
          .neq("event_type", TRANSCRIPT_SNAPSHOT_EVENT_TYPE)
          .order("created_at", { ascending: false })
          .range(from, to),
      limit
    ),
    fetchAllRows(
      async (from, to) =>
        await supabaseAdmin
          .from("F_audit_turn_specs_view")
          .select("id, session_id, turn_id, seq, prefix_json, prefix_tree, created_at")
          .eq("session_id", targetSessionId)
          .order("created_at", { ascending: false })
          .range(from, to),
      limit
    ),
  ]);

  if (mcpRes.error) {
    return NextResponse.json({ error: mcpRes.error.message }, { status: 400 });
  }
  if (eventRes.error) {
    return NextResponse.json({ error: eventRes.error.message }, { status: 400 });
  }
  if (debugRes.error) {
    return NextResponse.json({ error: debugRes.error.message }, { status: 400 });
  }

  const filteredEvents = (eventRes.data || [])
    .filter((item: any) => {
    const eventType = String(item?.event_type || "").trim();
    if (!eventType) return false;
    if (eventType.startsWith(WIDGET_PROXY_EVENT_PREFIX)) return false;
    const botContext = item?.bot_context && typeof item.bot_context === "object" ? (item.bot_context as Record<string, any>) : null;
    if (botContext && String(botContext.source || "").trim() === "widget_proxy") return false;
    return true;
  })
    .map((item: any) => {
      if (!item || typeof item !== "object") return item;
      const { bot_context: _botContext, ...rest } = item as Record<string, any>;
      return rest;
    });

  return NextResponse.json({
    mcp_logs: mcpRes.data || [],
    event_logs: filteredEvents,
    debug_logs: debugRes.data || [],
  });
}
