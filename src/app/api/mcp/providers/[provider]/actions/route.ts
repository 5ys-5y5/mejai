import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { buildMcpProviderGroups, loadMcpToolsForOrg } from "@/lib/mcpToolsService";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params;
  const url = new URL(req.url);
  const rawAuthHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  let authHeader = rawAuthHeader;
  if (!authHeader) {
    const tokenParam = url.searchParams.get("token") || url.searchParams.get("access_token");
    if (tokenParam) authHeader = `Bearer ${tokenParam}`;
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
    const groups = buildMcpProviderGroups(items);
    const providerKey = String(resolvedParams.provider || "").trim().toLowerCase();
    const group = groups.find((entry) => entry.key === providerKey);
    if (!group) {
      return NextResponse.json({ error: "PROVIDER_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      provider: {
        key: group.key,
        title: group.title,
        description: group.description,
        initials: group.initials,
        connected: group.connected,
        action_count: group.action_count,
      },
      items: group.actions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MCP_PROVIDER_ACTIONS_LOAD_FAILED" },
      { status: 400 }
    );
  }
}
