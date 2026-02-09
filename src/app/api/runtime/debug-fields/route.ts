import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

type JsonLike = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectPaths(input: unknown, prefix: string, out: Map<string, unknown>, depth = 0) {
  if (depth > 6) return;
  if (Array.isArray(input)) {
    if (input.length === 0) {
      if (!out.has(prefix)) out.set(prefix, []);
      return;
    }
    if (!out.has(prefix)) out.set(prefix, input);
    collectPaths(input[0], `${prefix}[0]`, out, depth + 1);
    return;
  }
  if (isRecord(input)) {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      if (!out.has(prefix)) out.set(prefix, {});
      return;
    }
    for (const [key, value] of entries) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!out.has(path)) out.set(path, value);
      collectPaths(value, path, out, depth + 1);
    }
    return;
  }
  if (!out.has(prefix)) out.set(prefix, input);
}

function toSortedList(values: Set<string>) {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export async function GET(req: NextRequest) {
  const context = await getServerContext(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const { data: access } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: sessions, error: sessionError } = await context.supabase
    .from("D_conv_sessions")
    .select("id")
    .eq("org_id", context.orgId)
    .order("started_at", { ascending: false })
    .limit(30);
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 400 });
  }
  const sessionIds = (sessions || []).map((row) => String((row as { id?: string }).id || "")).filter(Boolean);
  if (sessionIds.length === 0) {
    return NextResponse.json({
      event_types: [],
      mcp_tools: [],
      sample_paths: {},
    });
  }

  const [mcpRes, eventRes, debugRes] = await Promise.all([
    context.supabase
      .from("F_audit_mcp_tools")
      .select("tool_name, status, request_payload, response_payload, policy_decision, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(80),
    context.supabase
      .from("F_audit_events")
      .select("event_type, payload, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(120),
    context.supabase
      .from("F_audit_turn_specs_view")
      .select("prefix_json, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);
  if (mcpRes.error) return NextResponse.json({ error: mcpRes.error.message }, { status: 400 });
  if (eventRes.error) return NextResponse.json({ error: eventRes.error.message }, { status: 400 });
  if (debugRes.error) return NextResponse.json({ error: debugRes.error.message }, { status: 400 });

  const samplePaths = new Map<string, unknown>();
  const eventTypes = new Set<string>();
  const mcpTools = new Set<string>();

  for (const row of mcpRes.data || []) {
    const item = row as {
      tool_name?: string | null;
      status?: string | null;
      request_payload?: JsonLike | null;
      response_payload?: JsonLike | null;
      policy_decision?: JsonLike | null;
    };
    if (item.tool_name) mcpTools.add(String(item.tool_name));
    if (!samplePaths.has("mcp.tool_name")) samplePaths.set("mcp.tool_name", item.tool_name || null);
    if (!samplePaths.has("mcp.status")) samplePaths.set("mcp.status", item.status || null);
    if (item.request_payload) collectPaths(item.request_payload, "mcp.request_payload", samplePaths);
    if (item.response_payload) collectPaths(item.response_payload, "mcp.response_payload", samplePaths);
    if (item.policy_decision) collectPaths(item.policy_decision, "mcp.policy_decision", samplePaths);
  }

  for (const row of eventRes.data || []) {
    const item = row as { event_type?: string | null; payload?: JsonLike | null };
    if (item.event_type) eventTypes.add(String(item.event_type));
    if (!samplePaths.has("event.event_type")) samplePaths.set("event.event_type", item.event_type || null);
    if (item.payload) collectPaths(item.payload, "event.payload", samplePaths);
  }

  for (const row of debugRes.data || []) {
    const item = row as { prefix_json?: JsonLike | null };
    if (item.prefix_json) collectPaths(item.prefix_json, "debug.prefix_json", samplePaths);
  }

  return NextResponse.json({
    event_types: toSortedList(eventTypes),
    mcp_tools: toSortedList(mcpTools),
    sample_paths: Object.fromEntries(samplePaths.entries()),
  });
}

