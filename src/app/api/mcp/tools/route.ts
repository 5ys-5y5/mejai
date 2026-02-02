import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

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

  const { data: policies, error: policyError } = await context.supabase
    .from("C_mcp_tool_policies")
    .select("tool_id, is_allowed, allowed_scopes, rate_limit_per_min, masking_rules, conditions, adapter_key")
    .eq("org_id", context.orgId);

  if (policyError) {
    return NextResponse.json({ error: policyError.message }, { status: 400 });
  }

  const toolIds = (policies || []).map((p) => p.tool_id);
  if (toolIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const { data: tools, error: toolError } = await context.supabase
    .from("C_mcp_tools")
    .select("id, name, description, schema_json, version, is_active")
    .in("id", toolIds)
    .eq("is_active", true);

  if (toolError) {
    return NextResponse.json({ error: toolError.message }, { status: 400 });
  }

  const policyByTool = new Map(policies?.map((p) => [p.tool_id, p]) || []);
  const items = (tools || []).map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    schema: tool.schema_json,
    version: tool.version,
    policy: policyByTool.get(tool.id) || null,
  }));

  return NextResponse.json({ items });
}
