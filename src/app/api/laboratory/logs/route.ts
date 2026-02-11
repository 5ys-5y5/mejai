import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

const TRANSCRIPT_SNAPSHOT_EVENT_TYPE = "DEBUG_TRANSCRIPT_SNAPSHOT_SAVED";

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
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  const requestedLimit = Number(url.searchParams.get("limit") || 20);
  const safeLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.floor(requestedLimit)) : 20;
  const limit = Math.min(safeLimit, 20000);
  if (!sessionId) {
    return NextResponse.json({ error: "INVALID_SESSION_ID" }, { status: 400 });
  }

  const { data: sessionRow, error: sessionError } = await context.supabase
    .from("D_conv_sessions")
    .select("id, org_id")
    .eq("id", sessionId)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 400 });
  }
  if (!sessionRow) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  const [mcpRes, eventRes, debugRes] = await Promise.all([
    fetchAllRows(
      async (from, to) =>
        await context.supabase
          .from("F_audit_mcp_tools")
          .select(
            "id, tool_name, tool_version, status, request_payload, response_payload, policy_decision, latency_ms, created_at, session_id, turn_id"
          )
          .eq("org_id", context.orgId)
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .range(from, to),
      limit
    ),
    fetchAllRows(
      async (from, to) =>
        await context.supabase
          .from("F_audit_events")
          .select("id, event_type, payload, created_at, session_id, turn_id")
          .eq("session_id", sessionId)
          .neq("event_type", TRANSCRIPT_SNAPSHOT_EVENT_TYPE)
          .order("created_at", { ascending: false })
          .range(from, to),
      limit
    ),
    fetchAllRows(
      async (from, to) =>
        await context.supabase
          .from("F_audit_turn_specs_view")
          .select("id, session_id, turn_id, seq, prefix_json, prefix_tree, created_at")
          .eq("session_id", sessionId)
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

  return NextResponse.json({
    mcp_logs: mcpRes.data || [],
    event_logs: eventRes.data || [],
    debug_logs: debugRes.data || [],
  });
}
