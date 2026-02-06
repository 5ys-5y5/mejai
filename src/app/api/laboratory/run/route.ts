import { NextRequest, NextResponse } from "next/server";

function normalizeRoute(value?: string | null) {
  // Runtime chat is now a single core endpoint.
  if (!value) return "/api/runtime/chat";
  return "/api/runtime/chat";
}

function makeTraceId() {
  return `lab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  const incomingTraceId = String(req.headers.get("x-runtime-trace-id") || "").trim();
  const traceId = incomingTraceId || makeTraceId();
  try {
    const parseStartedAt = Date.now();
    const body = await req.json().catch(() => null);
    if (!body || !body.message || !body.llm) {
      console.info("[laboratory/run][timing]", {
        trace_id: traceId,
        status: "invalid_body",
        parse_body_ms: Date.now() - parseStartedAt,
        total_ms: Date.now() - requestStartedAt,
      });
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const targetPath = normalizeRoute(String(body.route || ""));
    const targetUrl = new URL(targetPath, req.nextUrl.origin);
    const authHeader = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";
    const requestToolIds = Array.isArray(body.mcp_tool_ids) ? body.mcp_tool_ids : [];
    const requestProviderKeys = Array.isArray(body.mcp_provider_keys) ? body.mcp_provider_keys : [];
    const mergedMcpSelectors = Array.from(
      new Set(
        [...requestToolIds, ...requestProviderKeys]
          .map((value) => String(value).trim())
          .filter(Boolean)
      )
    );

    const fetchStartedAt = Date.now();
    const res = await fetch(targetUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        "x-runtime-trace-id": traceId,
      },
      body: JSON.stringify({
        message: String(body.message || ""),
        session_id: body.session_id || undefined,
        agent_id: body.agent_id || undefined,
        llm: body.llm,
        kb_id: body.kb_id || undefined,
        inline_kb: body.inline_kb || undefined,
        admin_kb_ids: Array.isArray(body.admin_kb_ids) ? body.admin_kb_ids : [],
        mcp_tool_ids: mergedMcpSelectors,
        mcp_provider_keys: requestProviderKeys,
        mode: body.mode,
      }),
    });
    const runtimeFetchMs = Date.now() - fetchStartedAt;

    const parseResponseStartedAt = Date.now();
    const data = await res.json().catch(() => ({}));
    const parseResponseMs = Date.now() - parseResponseStartedAt;
    console.info("[laboratory/run][timing]", {
      trace_id: traceId,
      status: res.status,
      route: targetPath,
      is_first_turn: !body.session_id,
      parse_body_ms: fetchStartedAt - parseStartedAt,
      runtime_fetch_ms: runtimeFetchMs,
      parse_response_ms: parseResponseMs,
      total_ms: Date.now() - requestStartedAt,
    });
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[laboratory/run] proxy failed", error);
    console.info("[laboratory/run][timing]", {
      trace_id: traceId,
      status: "proxy_failed",
      total_ms: Date.now() - requestStartedAt,
    });
    return NextResponse.json(
      {
        step: "final",
        message: "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.",
        mcp_actions: [],
        error: "LAB_PROXY_FAILED",
      },
      { status: 200 }
    );
  }
}
