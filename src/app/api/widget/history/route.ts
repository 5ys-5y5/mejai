import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";

type WidgetMessage = {
  role: "user" | "bot";
  content: string;
  created_at?: string | null;
  turn_id?: string | null;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_WIDGET_TOKEN" }, { status: 401 });
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
    .eq("id", payload.session_id)
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

  const { data: turns, error } = await supabaseAdmin
    .from("D_conv_turns")
    .select("id, seq, transcript_text, answer_text, final_answer, created_at")
    .eq("session_id", payload.session_id)
    .order("seq", { ascending: true })
    .limit(80);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const messages: WidgetMessage[] = [];
  for (const row of turns || []) {
    const userText = normalizeText((row as Record<string, any>).transcript_text);
    if (userText) {
      messages.push({
        role: "user",
        content: userText,
        created_at: (row as Record<string, any>).created_at ?? null,
      });
    }
    const botText = normalizeText((row as Record<string, any>).final_answer || (row as Record<string, any>).answer_text);
    if (botText) {
      messages.push({
        role: "bot",
        content: botText,
        created_at: (row as Record<string, any>).created_at ?? null,
        turn_id: String((row as Record<string, any>).id || "").trim() || null,
      });
    }
  }

  return NextResponse.json({ session_id: payload.session_id, messages });
}
