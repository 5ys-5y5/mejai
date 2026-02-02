import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.message || !body.llm || !body.kb_id) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    // V3는 현재 mk2 실행 엔진 위에서 "natural" 오케스트레이션 실험 플래그를 사용한다.
    const targetUrl = new URL("/api/playground/chat_mk2", req.nextUrl.origin);
    const authHeader = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";

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
        llm: body.llm,
        kb_id: body.kb_id,
        admin_kb_ids: Array.isArray(body.admin_kb_ids) ? body.admin_kb_ids : [],
        mcp_tool_ids: Array.isArray(body.mcp_tool_ids) ? body.mcp_tool_ids : [],
        // V3는 파이프라인 강제 대신 자연어 중심 모드를 기본값으로 사용한다.
        mode: "natural",
      }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[playground/chat_v3] proxy failed", error);
    return NextResponse.json(
      {
        step: "final",
        message: "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.",
        mcp_actions: [],
        error: "CHAT_V3_PROXY_FAILED",
      },
      { status: 200 }
    );
  }
}
