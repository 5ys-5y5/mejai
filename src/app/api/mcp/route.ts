import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { buildMcpProviderGroups, loadMcpToolsForOrg } from "@/lib/mcpToolsService";

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

  const { data: access, error: accessError } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 400 });
  }

  if (!access?.is_admin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const items = await loadMcpToolsForOrg(context.supabase, context.orgId);
    const providers = buildMcpProviderGroups(items);
    return NextResponse.json({
      summary: { provider_count: providers.length, action_count: items.length },
      providers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MCP_LOAD_FAILED" },
      { status: 400 }
    );
  }
}

