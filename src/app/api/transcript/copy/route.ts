import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";
import { verifyWidgetToken } from "@/lib/widgetToken";
import type { ConversationFeaturesProviderShape, ConversationPageKey } from "@/lib/conversation/pageFeaturePolicy";
import { resolvePageConversationDebugOptions } from "@/lib/transcriptCopyPolicy";
import {
  buildDebugTranscript,
  buildIssueTranscript,
  type LogBundle,
  type TranscriptMessage,
} from "@/lib/debugTranscript";
import { mapRuntimeResponseToTranscriptFields } from "@/lib/runtimeResponseTranscript";

const TRANSCRIPT_SNAPSHOT_EVENT_TYPE = "DEBUG_TRANSCRIPT_SNAPSHOT_SAVED";
const WIDGET_PROXY_EVENT_PREFIX = "WIDGET_RUNTIME_PROXY_";

type CopyRequestBody = {
  session_id?: string;
  kind?: "conversation" | "issue";
  page?: string;
  limit?: number;
};

type TurnRow = {
  id: string;
  seq: number | null;
  transcript_text: string | null;
  answer_text: string | null;
  final_answer: string | null;
  bot_context?: Record<string, unknown> | null;
  created_at?: string | null;
};

type LogsByTurn = Map<string, LogBundle>;

function parsePageKey(value: unknown): ConversationPageKey {
  const pageKey = String(value || "").trim();
  if (!pageKey) return "/app/laboratory";
  return pageKey;
}

function normalizeKind(value: unknown): "conversation" | "issue" {
  return value === "issue" ? "issue" : "conversation";
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 200;
  return Math.min(2000, Math.max(1, Math.floor(parsed)));
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeBotContext(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

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

function groupLogsByTurn(logs: LogBundle): LogsByTurn {
  const map: LogsByTurn = new Map();
  (logs.mcp_logs || []).forEach((item) => {
    const turnId = String(item.turn_id || "").trim();
    if (!turnId) return;
    const current = map.get(turnId) || {};
    map.set(turnId, {
      ...current,
      mcp_logs: [...(current.mcp_logs || []), item],
    });
  });
  (logs.event_logs || []).forEach((item) => {
    const turnId = String(item.turn_id || "").trim();
    if (!turnId) return;
    const current = map.get(turnId) || {};
    map.set(turnId, {
      ...current,
      event_logs: [...(current.event_logs || []), item],
    });
  });
  (logs.debug_logs || []).forEach((item) => {
    const turnId = String(item.turn_id || "").trim();
    if (!turnId) return;
    const current = map.get(turnId) || {};
    map.set(turnId, {
      ...current,
      debug_logs: [...(current.debug_logs || []), item],
    });
  });
  return map;
}

function buildMessages(turns: TurnRow[], logsByTurn: LogsByTurn) {
  const messages: TranscriptMessage[] = [];
  const messageLogs: Record<string, LogBundle> = {};

  turns.forEach((row) => {
    const turnId = String(row.id || "").trim();
    const userText = normalizeText(row.transcript_text);
    if (userText) {
      messages.push({
        id: `user:${turnId || Math.random().toString(16).slice(2)}`,
        role: "user",
        content: userText,
      });
    }

    const botText = normalizeText(row.final_answer || row.answer_text);
    if (botText) {
      const botContext = normalizeBotContext(row.bot_context);
      const mapped = mapRuntimeResponseToTranscriptFields({
        response_schema: botContext?.response_schema,
        response_schema_issues: botContext?.response_schema_issues,
        render_plan: botContext?.render_plan,
      });
      const botMessageId = turnId || `bot:${Math.random().toString(16).slice(2)}`;
      messages.push({
        id: botMessageId,
        role: "bot",
        content: botText,
        turnId: turnId || null,
        responseSchema: mapped.responseSchema,
        responseSchemaIssues: mapped.responseSchemaIssues,
        renderPlan: mapped.renderPlan,
      });
      const bundle = turnId ? logsByTurn.get(turnId) : null;
      if (bundle) {
        messageLogs[botMessageId] = bundle;
      }
    }
  });

  return { messages, messageLogs };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const body = (await req.json().catch(() => null)) as CopyRequestBody | null;
  const sessionOverride = normalizeText(body?.session_id);
  const kind = normalizeKind(body?.kind);
  const page = parsePageKey(body?.page);
  const limit = normalizeLimit(body?.limit);

  if (!sessionOverride) {
    return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
  }

  const widgetPayload = token ? verifyWidgetToken(token) : null;
  let providerValue: ConversationFeaturesProviderShape | null = null;
  let supabase: ReturnType<typeof createAdminSupabaseClient> | null = null;
  let orgId: string | null = null;
  let sessionId = sessionOverride;
  let filterWidgetProxyEvents = false;

  if (widgetPayload) {
    let supabaseAdmin;
    try {
      supabaseAdmin = createAdminSupabaseClient();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
        { status: 500 }
      );
    }
    supabase = supabaseAdmin;
    const { data: widget } = await supabaseAdmin
      .from("B_chat_widgets")
      .select("id, org_id, is_active")
      .eq("id", widgetPayload.widget_id)
      .maybeSingle();
    if (!widget || !widget.is_active) {
      return NextResponse.json({ error: "WIDGET_NOT_FOUND" }, { status: 404 });
    }
    orgId = String(widget.org_id || "");
    if (!orgId) {
      return NextResponse.json({ error: "ORG_NOT_FOUND" }, { status: 404 });
    }

    if (sessionOverride && !widgetPayload.visitor_id && sessionOverride !== String(widgetPayload.session_id || "")) {
      return NextResponse.json({ error: "VISITOR_ID_REQUIRED" }, { status: 403 });
    }

    const { data: session } = await supabaseAdmin
      .from("D_conv_sessions")
      .select("id, org_id, metadata")
      .eq("id", sessionOverride)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!session) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    const metadata = session.metadata && typeof session.metadata === "object" ? (session.metadata as Record<string, any>) : null;
    const metadataWidgetId = metadata ? String(metadata.widget_id || "").trim() : "";
    if (metadataWidgetId && metadataWidgetId !== String(widgetPayload.widget_id)) {
      return NextResponse.json({ error: "SESSION_WIDGET_MISMATCH" }, { status: 403 });
    }
    const metadataVisitorId = metadata
      ? String(metadata.visitor_id || metadata.visitorId || metadata.external_user_id || "").trim()
      : "";
    if (widgetPayload.visitor_id && metadataVisitorId && metadataVisitorId !== String(widgetPayload.visitor_id)) {
      return NextResponse.json({ error: "SESSION_VISITOR_MISMATCH" }, { status: 403 });
    }
    sessionId = sessionOverride;
    const { data: settings } = await supabaseAdmin
      .from("A_iam_auth_settings")
      .select("providers")
      .eq("org_id", orgId)
      .is("user_id", null)
      .maybeSingle();
    const providers = (settings?.providers || {}) as Record<string, ConversationFeaturesProviderShape | undefined>;
    providerValue = providers.chat_policy || null;
    filterWidgetProxyEvents = true;
  } else {
    const cookieHeader = req.headers.get("cookie") || "";
    const context = await getServerContext(authHeader, cookieHeader);
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: 401 });
    }
    supabase = context.supabase as ReturnType<typeof createAdminSupabaseClient>;
    orgId = context.orgId || null;
    const { data: sessionRow, error: sessionError } = await context.supabase
      .from("D_conv_sessions")
      .select("id, org_id")
      .eq("id", sessionOverride)
      .eq("org_id", orgId)
      .maybeSingle();
    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 400 });
    }
    if (!sessionRow) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }
    sessionId = sessionRow.id;
    const { data: settings } = await context.supabase
      .from("A_iam_auth_settings")
      .select("providers")
      .eq("org_id", orgId)
      .is("user_id", null)
      .maybeSingle();
    const providers = (settings?.providers || {}) as Record<string, ConversationFeaturesProviderShape | undefined>;
    providerValue = providers.chat_policy || null;
  }

  if (!supabase || !orgId) {
    return NextResponse.json({ error: "AUTH_CONTEXT_MISSING" }, { status: 401 });
  }

  const { data: turns, error: turnError } = await supabase
    .from("D_conv_turns")
    .select("id, seq, transcript_text, answer_text, final_answer, bot_context, created_at")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true })
    .limit(limit);
  if (turnError) {
    return NextResponse.json({ error: turnError.message }, { status: 400 });
  }

  const [mcpRes, eventRes, debugRes] = await Promise.all([
    fetchAllRows(
      async (from, to) =>
        await supabase!
          .from("F_audit_mcp_tools")
          .select(
            "id, tool_name, tool_version, status, request_payload, response_payload, policy_decision, latency_ms, created_at, session_id, turn_id"
          )
          .eq("org_id", orgId)
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .range(from, to),
      limit
    ),
    fetchAllRows(
      async (from, to) =>
        await supabase!
          .from("F_audit_events")
          .select("id, event_type, payload, created_at, session_id, turn_id, bot_context")
          .eq("session_id", sessionId)
          .neq("event_type", TRANSCRIPT_SNAPSHOT_EVENT_TYPE)
          .order("created_at", { ascending: false })
          .range(from, to),
      limit
    ),
    fetchAllRows(
      async (from, to) =>
        await supabase!
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

  const rawEvents = (eventRes.data || []) as Array<Record<string, unknown>>;
  const filteredEvents = filterWidgetProxyEvents
    ? rawEvents
        .filter((item: any) => {
          const eventType = String(item?.event_type || "").trim();
          if (!eventType) return false;
          if (eventType.startsWith(WIDGET_PROXY_EVENT_PREFIX)) return false;
          const botContext =
            item?.bot_context && typeof item.bot_context === "object" ? (item.bot_context as Record<string, any>) : null;
          if (botContext && String(botContext.source || "").trim() === "widget_proxy") return false;
          return true;
        })
        .map((item: any) => {
          if (!item || typeof item !== "object") return item;
          const { bot_context: _botContext, ...rest } = item as Record<string, any>;
          return rest;
        })
    : rawEvents;

  const logs: LogBundle = {
    mcp_logs: (mcpRes.data || []) as LogBundle["mcp_logs"],
    event_logs: filteredEvents as LogBundle["event_logs"],
    debug_logs: (debugRes.data || []) as LogBundle["debug_logs"],
  };
  const logsByTurn = groupLogsByTurn(logs);
  const { messages, messageLogs } = buildMessages((turns || []) as TurnRow[], logsByTurn);

  const debugOptions = resolvePageConversationDebugOptions(page, providerValue || null);
  const transcriptText =
    kind === "issue"
      ? buildIssueTranscript({ messages, messageLogs })
      : buildDebugTranscript({ messages, messageLogs, options: debugOptions });

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    kind,
    page,
    transcript_text: transcriptText,
  });
}
