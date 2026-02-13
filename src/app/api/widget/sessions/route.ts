import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";

function normalizeVisitorId(input: string | null | undefined) {
  return String(input || "").trim();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_WIDGET_TOKEN" }, { status: 401 });
  }

  const visitorId = normalizeVisitorId(payload.visitor_id);
  if (!visitorId) {
    return NextResponse.json({ sessions: [] });
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

  const { data, error } = await supabaseAdmin
    .from("D_conv_sessions")
    .select("id, session_code, started_at, metadata")
    .eq("org_id", widget.org_id)
    .contains("metadata", { visitor_id: visitorId, widget_id: widget.id })
    .order("started_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const sessions = (data || []).map((row) => ({
    id: row.id,
    session_code: row.session_code,
    started_at: row.started_at,
  }));

  return NextResponse.json({ sessions });
}
