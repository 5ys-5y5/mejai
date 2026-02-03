import { NextRequest, NextResponse } from "next/server";
import { POST as postDomainAgent } from "../chat/route_mk2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.message || !body.llm || !body.kb_id) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const delegated = new NextRequest(
      new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({
          message: String(body.message || ""),
          session_id: body.session_id || undefined,
          llm: body.llm,
          kb_id: body.kb_id,
          admin_kb_ids: Array.isArray(body.admin_kb_ids) ? body.admin_kb_ids : [],
          mcp_tool_ids: Array.isArray(body.mcp_tool_ids) ? body.mcp_tool_ids : [],
          mode: "natural",
        }),
      })
    );
    return postDomainAgent(delegated);
  } catch (error) {
    console.error("[playground/orchestration] proxy failed", error);
    return NextResponse.json(
      {
        step: "final",
        message: "처리 중 오류가 발생했습니다. 같은 내용을 한 번 더 보내주세요.",
        mcp_actions: [],
        error: "ORCHESTRATION_PROXY_FAILED",
      },
      { status: 200 }
    );
  }
}

