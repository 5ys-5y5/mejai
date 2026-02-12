import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { verifyWidgetToken } from "@/lib/widgetToken";

function getWidgetRuntimeSecret() {
  return String(process.env.WIDGET_RUNTIME_SECRET || "").trim();
}

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function handleStream(req: NextRequest, message: string, sessionId: string) {
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
  return handleStream(req, message, sessionId);
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
