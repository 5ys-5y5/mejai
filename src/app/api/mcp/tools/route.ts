import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { loadMcpToolsForOrg } from "@/lib/mcpToolsService";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawAuthHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  let authHeader = rawAuthHeader;
  if (!authHeader) {
    const tokenParam = url.searchParams.get("token") || url.searchParams.get("access_token");
    if (tokenParam) {
      authHeader = `Bearer ${tokenParam}`;
    }
  }
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  if (!context.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const items = await loadMcpToolsForOrg(context.supabase, context.agentId);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MCP_TOOLS_LOAD_FAILED" },
      { status: 400 }
    );
  }
}
