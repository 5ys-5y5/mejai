import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { callAdapter } from "@/lib/mcpAdapters";
import { applyMasking, checkPolicyConditions, validateToolParams } from "@/lib/mcpPolicy";

type ToolCallBody = {
  tool?: string;
  tool_key?: string;
  provider_key?: string;
  name?: string;
  params?: Record<string, unknown>;
  session_id?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ToolCallBody | null;
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const params = body.params || {};
  const resolvedParams: Record<string, unknown> = { ...params };
  const parseToolKey = (raw: string) => {
    const value = String(raw || "").trim();
    if (!value.includes(":")) return null;
    const [provider, ...rest] = value.split(":");
    const name = rest.join(":").trim();
    if (!provider || !name) return null;
    return { provider_key: provider.trim().toLowerCase(), name };
  };
  const byToolKey = body.tool_key ? parseToolKey(body.tool_key) : null;
  const providerKey = String(body.provider_key || byToolKey?.provider_key || "").trim().toLowerCase();
  const toolName = String(body.name || byToolKey?.name || body.tool || "").trim();
  if (!toolName) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let tool: {
    id: string;
    name: string;
    provider_key: string;
    scope_key?: string | null;
    endpoint_path?: string | null;
    http_method?: string | null;
    schema_json: unknown;
    version: string;
    is_active: boolean;
    rate_limit_per_min?: number | null;
    masking_rules?: unknown;
    conditions?: unknown;
  } | null = null;

  const dbToolQuery = context.supabase
    .from("C_mcp_tools")
    .select(
      "id, name, provider_key, scope_key, endpoint_path, http_method, schema_json, version, is_active, rate_limit_per_min, masking_rules, conditions"
    )
    .eq("name", toolName)
    .eq("is_active", true);
  if (providerKey) {
    dbToolQuery.eq("provider_key", providerKey);
  }
  const { data: dbTools, error: toolError } = await dbToolQuery.limit(2);

  if (toolError || !dbTools || dbTools.length === 0) {
    return NextResponse.json({ error: "TOOL_NOT_FOUND" }, { status: 404 });
  }
  if (!providerKey && dbTools.length > 1) {
    return NextResponse.json(
      { error: "AMBIGUOUS_TOOL_NAME", message: "provider_key or tool_key is required" },
      { status: 400 }
    );
  }
  tool = dbTools[0];

  if (tool.endpoint_path && resolvedParams.path === undefined) {
    resolvedParams.path = tool.endpoint_path;
  }
  if (tool.http_method && resolvedParams.method === undefined) {
    resolvedParams.method = tool.http_method;
  }
  if (tool.scope_key && resolvedParams.required_scope === undefined) {
    resolvedParams.required_scope = tool.scope_key;
  }

  const schema = (tool.schema_json || {}) as Record<string, unknown>;
  const validation = validateToolParams(schema, resolvedParams);
  if (!validation.ok) {
    return NextResponse.json({ error: "INVALID_PARAMS", message: validation.error }, { status: 400 });
  }

  const conditionCheck = checkPolicyConditions((tool.conditions as any) || null, resolvedParams);
  if (!conditionCheck.ok) {
    return NextResponse.json({ error: conditionCheck.error }, { status: 403 });
  }

  if (tool.rate_limit_per_min && tool.rate_limit_per_min > 0) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await context.supabase
      .from("F_audit_mcp_tools")
      .select("id", { count: "exact", head: true })
      .eq("org_id", context.orgId)
      .eq("tool_id", tool.id)
      .gte("created_at", since);
    if ((count || 0) >= tool.rate_limit_per_min) {
      await context.supabase.from("F_audit_mcp_tools").insert({
        org_id: context.orgId,
        session_id: body.session_id ?? null,
        tool_id: tool.id,
        tool_version: tool.version ?? null,
        tool_name: `${String((tool as any).provider_key || "unknown")}:${tool.name}`,
        request_payload: resolvedParams,
        response_payload: null,
        status: "rate_limited",
        latency_ms: 0,
        masked_fields: [],
        policy_decision: { allowed: false, reason: "RATE_LIMIT" },
        created_at: nowIso(),
      });
      return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
    }
  }

  const start = Date.now();
  const result = await callAdapter(
    String((tool as any).provider_key || "unknown"),
    resolvedParams,
    {
      supabase: context.supabase,
      orgId: context.orgId,
      userId: context.user.id,
    },
    { toolName: tool.name }
  );
  const latency = Date.now() - start;

  const responsePayload = result.data ? { ...result.data } : {};
  const masked = applyMasking(responsePayload, (tool.masking_rules as any) || null);

  await context.supabase.from("F_audit_mcp_tools").insert({
    org_id: context.orgId,
    session_id: body.session_id ?? null,
    tool_id: tool.id,
    tool_version: tool.version ?? null,
    tool_name: `${String((tool as any).provider_key || "unknown")}:${tool.name}`,
    request_payload: resolvedParams,
    response_payload: masked.masked,
    status: result.status,
    latency_ms: latency,
    masked_fields: masked.maskedFields,
    policy_decision: { allowed: true },
    created_at: nowIso(),
  });

  return NextResponse.json({
    tool: `${String((tool as any).provider_key || "unknown")}:${tool.name}`,
    version: tool.version,
    status: result.status,
    data: masked.masked,
    error: result.error || null,
    meta: { latency_ms: latency },
  });
}

