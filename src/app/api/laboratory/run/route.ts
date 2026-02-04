import { NextRequest, NextResponse } from "next/server";

function normalizeRoute(value?: string | null) {
  // Runtime chat is now a single core endpoint.
  if (!value) return "/api/runtime/chat";
  return "/api/runtime/chat";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.message || !body.llm || !body.kb_id) {
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

    const res = await fetch(targetUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        message: String(body.message || ""),
        session_id: body.session_id || undefined,
        agent_id: body.agent_id || undefined,
        llm: body.llm,
        kb_id: body.kb_id,
        admin_kb_ids: Array.isArray(body.admin_kb_ids) ? body.admin_kb_ids : [],
        mcp_tool_ids: mergedMcpSelectors,
        mcp_provider_keys: requestProviderKeys,
        mode: body.mode,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[laboratory/run] proxy failed", error);
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
