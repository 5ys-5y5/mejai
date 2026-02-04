import { NextRequest, NextResponse } from "next/server";
import { callAdapter } from "@/lib/mcpAdapters";
import { getServerContext } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const cookieHeader = req.headers.get("cookie") || "";
    const context = await getServerContext(authHeader, cookieHeader);
    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: 401 });
    }

    const body = await req.json();
    const { tool, params } = body;

    if (!tool) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    const result = await callAdapter(tool, params || {}, {
      supabase: context.supabase,
      orgId: context.orgId,
      userId: context.user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("MCP Debug Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
