import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";
import { buildIntentDisambiguationTableHtmlFromText } from "@/components/design-system/conversation/runtimeUiCatalog";
import { readConversationFeatureProvider } from "@/lib/conversation/policyMerge";
import type { WidgetChatPolicyConfig } from "@/lib/conversation/pageFeaturePolicy";

type WidgetMessage = {
  role: "user" | "bot";
  content: string;
  rich_html?: string | null;
  created_at?: string | null;
  turn_id?: string | null;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionOverride = String(url.searchParams.get("session_id") || "").trim();
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
    .select("id, org_id, chat_policy, is_public")
    .eq("id", payload.widget_id)
    .maybeSingle();
  if (!widget) {
    return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
  }
  if (widget.is_public !== true) {
    return NextResponse.json({ error: "WIDGET_PRIVATE" }, { status: 403 });
  }
  const mergedPolicy = readConversationFeatureProvider(widget.chat_policy);
  const widgetPolicy = (mergedPolicy as { widget?: WidgetChatPolicyConfig } | null)?.widget || null;
  if (widgetPolicy?.is_active === false) {
    return NextResponse.json({ error: "WIDGET_INACTIVE" }, { status: 403 });
  }

  let baseEndUserId = "";
  const baseSessionId = String(payload.session_id || "").trim();
  if (baseSessionId) {
    const { data: baseSession } = await supabaseAdmin
      .from("D_conv_sessions")
      .select("id, end_user_id")
      .eq("id", baseSessionId)
      .eq("org_id", widget.org_id)
      .maybeSingle();
    baseEndUserId = String((baseSession as Record<string, any>)?.end_user_id || "").trim();
  }

  const { data: session } = await supabaseAdmin
    .from("D_conv_sessions")
    .select("id, org_id, widget_id, metadata, end_user_id")
    .eq("id", targetSessionId)
    .eq("org_id", widget.org_id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  const sessionWidgetId = String((session as Record<string, any>).widget_id || "").trim();
  if (sessionWidgetId && sessionWidgetId !== String(payload.widget_id)) {
    return NextResponse.json({ error: "SESSION_WIDGET_MISMATCH" }, { status: 403 });
  }
  const metadata = session.metadata && typeof session.metadata === "object" ? (session.metadata as Record<string, any>) : null;
  const metadataWidgetId = metadata ? String(metadata.widget_id || "").trim() : "";
  if (!sessionWidgetId && metadataWidgetId && metadataWidgetId !== String(payload.widget_id)) {
    return NextResponse.json({ error: "SESSION_WIDGET_MISMATCH" }, { status: 403 });
  }
  const metadataVisitorId = metadata
    ? String(metadata.visitor_id || metadata.visitorId || metadata.external_user_id || "").trim()
    : "";
  const targetEndUserId = String((session as Record<string, any>).end_user_id || "").trim();
  if (baseEndUserId && targetEndUserId && baseEndUserId !== targetEndUserId) {
    return NextResponse.json({ error: "SESSION_END_USER_MISMATCH" }, { status: 403 });
  }
  if (!baseEndUserId && payload.visitor_id && metadataVisitorId && metadataVisitorId !== String(payload.visitor_id)) {
    return NextResponse.json({ error: "SESSION_VISITOR_MISMATCH" }, { status: 403 });
  }

  const { data: turns, error } = await supabaseAdmin
    .from("D_conv_turns")
    .select("id, seq, transcript_text, answer_text, final_answer, created_at")
    .eq("session_id", targetSessionId)
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
      const richHtml = buildIntentDisambiguationTableHtmlFromText(botText);
      messages.push({
        role: "bot",
        content: botText,
        rich_html: richHtml,
        created_at: (row as Record<string, any>).created_at ?? null,
        turn_id: String((row as Record<string, any>).id || "").trim() || null,
      });
    }
  }

  return NextResponse.json({ session_id: targetSessionId, messages });
}
