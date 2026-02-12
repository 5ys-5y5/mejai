import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_WIDGET_TOKEN" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.type) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
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

  const { error } = await supabaseAdmin.from("F_widget_events").insert({
    org_id: payload.org_id,
    widget_id: payload.widget_id,
    session_id: payload.session_id,
    event_type: String(body.type || "").trim(),
    payload: body.payload || {},
    created_at: nowIso(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
