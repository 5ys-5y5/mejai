import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";
import { resolveRuntimeFlags } from "@/lib/runtimeFlags";
import {
  applyConversationFeatureVisibility,
  isProviderEnabled,
  isToolEnabled,
  resolveConversationPageFeatures,
  WIDGET_PAGE_KEY,
  type ConversationFeaturesProviderShape,
} from "@/lib/conversation/pageFeaturePolicy";
import { fetchWidgetChatPolicy } from "@/lib/widgetChatPolicy";

function getWidgetRuntimeSecret() {
  return String(process.env.WIDGET_RUNTIME_SECRET || "").trim();
}

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function handleStream(
  req: NextRequest,
  message: string,
  sessionId: string,
  extras?: {
    visitor?: Record<string, any> | null;
    end_user?: Record<string, any> | null;
    runtime_flags?: Record<string, any> | null;
    llm?: string | null;
    kb_id?: string | null;
    inline_kb?: string | null;
    admin_kb_ids?: unknown[] | null;
    mcp_tool_ids?: unknown[] | null;
    mcp_provider_keys?: unknown[] | null;
    mode?: string | null;
  }
) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const payload = verifyWidgetToken(token);
  if (!payload) {
    return new Response(encodeEvent("error", { error: "INVALID_WIDGET_TOKEN" }), {
      status: 401,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return new Response(encodeEvent("error", { error: "ADMIN_SUPABASE_INIT_FAILED" }), {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const { data: widget } = await supabaseAdmin
    .from("B_chat_widgets")
    .select("id, org_id, agent_id, is_active")
    .eq("id", payload.widget_id)
    .maybeSingle();
  if (!widget || !widget.is_active) {
    return new Response(encodeEvent("error", { error: "WIDGET_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  let providerValue: ConversationFeaturesProviderShape | null = null;
  try {
    providerValue = await fetchWidgetChatPolicy(supabaseAdmin, String(widget.org_id || ""));
  } catch {
    providerValue = null;
  }
  const featureFlags = applyConversationFeatureVisibility(
    resolveConversationPageFeatures(WIDGET_PAGE_KEY, providerValue),
    false
  );
  const requestToolIds: unknown[] = Array.isArray(extras?.mcp_tool_ids) ? extras!.mcp_tool_ids! : [];
  const requestProviderKeys: unknown[] = Array.isArray(extras?.mcp_provider_keys)
    ? extras!.mcp_provider_keys!
    : [];
  const filteredProviderKeys = featureFlags.mcp.providerSelector
    ? requestProviderKeys
        .map((value: unknown) => String(value || "").trim())
        .filter((key: string) => key.length > 0 && isProviderEnabled(key, featureFlags))
    : [];
  const filteredToolIds = featureFlags.mcp.actionSelector
    ? requestToolIds
        .map((value: unknown) => String(value || "").trim())
        .filter((id: string) => id.length > 0 && isToolEnabled(id, featureFlags))
    : [];
  const mergedMcpSelectors = Array.from(
    new Set(
      [...filteredToolIds, ...filteredProviderKeys]
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
  const normalizedLlm = String(extras?.llm || "").trim();
  const effectiveLlm = featureFlags.setup.llmSelector
    ? normalizedLlm || featureFlags.setup.defaultLlm
    : featureFlags.setup.defaultLlm;
  const effectiveKbId = featureFlags.setup.kbSelector ? String(extras?.kb_id || "").trim() || undefined : undefined;
  const effectiveInlineKb = featureFlags.setup.inlineUserKbInput
    ? String(extras?.inline_kb || "").trim() || undefined
    : undefined;
  const effectiveAdminKbIds = featureFlags.setup.adminKbSelector
    ? (Array.isArray(extras?.admin_kb_ids) ? extras!.admin_kb_ids! : [])
        .map((value: unknown) => String(value || "").trim())
        .filter((value: string) => value.length > 0)
    : [];

  const secret = getWidgetRuntimeSecret();
  if (!secret) {
    return new Response(encodeEvent("error", { error: "WIDGET_RUNTIME_SECRET_MISSING" }), {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(encodeEvent("ready", { ts: Date.now() })));
      try {
        const targetUrl = new URL("/api/runtime/chat", req.nextUrl.origin);
        const runtimeFlags = resolveRuntimeFlags(
          extras?.runtime_flags && typeof extras.runtime_flags === "object" ? extras.runtime_flags : undefined
        );
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
            page_key: WIDGET_PAGE_KEY,
            mode: extras?.mode || undefined,
            llm: effectiveLlm,
            kb_id: effectiveKbId,
            inline_kb: effectiveInlineKb,
            admin_kb_ids: effectiveAdminKbIds,
            mcp_tool_ids: mergedMcpSelectors,
            mcp_provider_keys: filteredProviderKeys,
            runtime_flags: runtimeFlags,
            ...(extras?.visitor && typeof extras.visitor === "object" ? { visitor: extras.visitor } : {}),
            ...(extras?.end_user && typeof extras.end_user === "object" ? { end_user: extras.end_user } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        controller.enqueue(encoder.encode(encodeEvent("message", { payload: data })));
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            encodeEvent("error", { error: error instanceof Error ? error.message : "STREAM_FAILED" })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.message) {
    return new Response(encodeEvent("error", { error: "INVALID_BODY" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  const message = String(body.message || "").trim();
  const sessionId = String(body.session_id || "").trim();
  if (!sessionId || !message) {
    return new Response(encodeEvent("error", { error: "INVALID_INPUT" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  const visitor = body?.visitor && typeof body.visitor === "object" ? body.visitor : null;
  const endUser = body?.end_user && typeof body.end_user === "object" ? body.end_user : null;
  const runtimeFlags = body?.runtime_flags && typeof body.runtime_flags === "object" ? body.runtime_flags : null;
  const llm = typeof body?.llm === "string" ? body.llm : null;
  const kbId = typeof body?.kb_id === "string" ? body.kb_id : null;
  const inlineKb = typeof body?.inline_kb === "string" ? body.inline_kb : null;
  const adminKbIds = Array.isArray(body?.admin_kb_ids) ? body.admin_kb_ids : null;
  const mcpToolIds = Array.isArray(body?.mcp_tool_ids) ? body.mcp_tool_ids : null;
  const mcpProviderKeys = Array.isArray(body?.mcp_provider_keys) ? body.mcp_provider_keys : null;
  const mode = typeof body?.mode === "string" ? body.mode : null;
  return handleStream(req, message, sessionId, {
    visitor,
    end_user: endUser,
    runtime_flags: runtimeFlags,
    llm,
    kb_id: kbId,
    inline_kb: inlineKb,
    admin_kb_ids: adminKbIds,
    mcp_tool_ids: mcpToolIds,
    mcp_provider_keys: mcpProviderKeys,
    mode,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const message = String(url.searchParams.get("message") || "").trim();
  const sessionId = String(url.searchParams.get("session_id") || "").trim();
  if (!message || !sessionId) {
    return new Response(encodeEvent("error", { error: "INVALID_INPUT" }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  return handleStream(req, message, sessionId);
}
