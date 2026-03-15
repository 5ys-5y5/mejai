import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { readWidgetTokenInstanceId, readWidgetTokenTemplateId, verifyWidgetToken } from "@/lib/widgetToken";

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

  const tokenInstanceId = readWidgetTokenInstanceId(payload);
  const tokenTemplateId = readWidgetTokenTemplateId(payload);

  if (tokenInstanceId) {
    const { data: instance } = await supabaseAdmin
      .from("B_chat_widget_instances")
      .select("id, is_active")
      .eq("id", tokenInstanceId)
      .maybeSingle();
    if (!instance || !instance.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
  } else if (tokenTemplateId) {
    const { data: template } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("id, is_active")
      .eq("id", tokenTemplateId)
      .maybeSingle();
    if (!template || !template.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
  } else {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }

  const query = supabaseAdmin
    .from("D_conv_sessions")
    .select("id, session_code, started_at, metadata")
    .contains(
      "metadata",
      tokenInstanceId ? { visitor_id: visitorId, widget_instance_id: tokenInstanceId } : { visitor_id: visitorId, template_id: tokenTemplateId }
    )
    .order("started_at", { ascending: false })
    .limit(40);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const sessions = (data || [])
    .filter((row) => {
      const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null;
      const metadataInstanceId = String(metadata?.widget_instance_id || "").trim();
      if (tokenInstanceId) return metadataInstanceId === tokenInstanceId;
      return !metadataInstanceId;
    })
    .map((row) => ({
      id: row.id,
      session_code: row.session_code,
      started_at: row.started_at,
    }));

  return NextResponse.json({ sessions });
}
