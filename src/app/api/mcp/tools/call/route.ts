import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import { callAdapter } from "@/lib/mcpAdapters";
import { applyMasking, checkPolicyConditions, validateToolParams } from "@/lib/mcpPolicy";

type ToolCallBody = {
  tool: string;
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
  if (!body?.tool) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const params = body.params || {};
  const toolName = body.tool;

  const { data: tool, error: toolError } = await context.supabase
    .from("mcp_tools")
    .select("id, name, schema_json, version, is_active")
    .eq("name", toolName)
    .eq("is_active", true)
    .maybeSingle();

  if (toolError || !tool) {
    return NextResponse.json({ error: "TOOL_NOT_FOUND" }, { status: 404 });
  }

  const { data: policy, error: policyError } = await context.supabase
    .from("mcp_tool_policies")
    .select("is_allowed, allowed_scopes, rate_limit_per_min, masking_rules, conditions, adapter_key")
    .eq("org_id", context.orgId)
    .eq("tool_id", tool.id)
    .maybeSingle();

  if (policyError || !policy) {
    return NextResponse.json({ error: "POLICY_NOT_FOUND" }, { status: 403 });
  }

  if (!policy.is_allowed) {
    await context.supabase.from("mcp_tool_audit_logs").insert({
      org_id: context.orgId,
      session_id: body.session_id ?? null,
      tool_id: tool.id,
      tool_name: tool.name,
      request_payload: params,
      response_payload: null,
      status: "blocked",
      latency_ms: 0,
      masked_fields: [],
      policy_decision: { allowed: false, reason: "POLICY_BLOCK" },
      created_at: nowIso(),
    });
    return NextResponse.json({ error: "POLICY_BLOCK" }, { status: 403 });
  }

  const schema = (tool.schema_json || {}) as Record<string, unknown>;
  const validation = validateToolParams(schema, params);
  if (!validation.ok) {
    return NextResponse.json({ error: "INVALID_PARAMS", message: validation.error }, { status: 400 });
  }

  const conditionCheck = checkPolicyConditions(policy.conditions, params);
  if (!conditionCheck.ok) {
    return NextResponse.json({ error: conditionCheck.error }, { status: 403 });
  }

  if (policy.rate_limit_per_min && policy.rate_limit_per_min > 0) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await context.supabase
      .from("mcp_tool_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", context.orgId)
      .eq("tool_id", tool.id)
      .gte("created_at", since);
    if ((count || 0) >= policy.rate_limit_per_min) {
      await context.supabase.from("mcp_tool_audit_logs").insert({
        org_id: context.orgId,
        session_id: body.session_id ?? null,
        tool_id: tool.id,
        tool_name: tool.name,
        request_payload: params,
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
  const adapterKey = policy.adapter_key || tool.name;
  const result = await callAdapter(adapterKey, params, {
    supabase: context.supabase,
    orgId: context.orgId,
    userId: context.user.id,
  });
  const latency = Date.now() - start;

  const responsePayload = result.data ? { ...result.data } : {};
  const masked = applyMasking(responsePayload, policy.masking_rules);

  await context.supabase.from("mcp_tool_audit_logs").insert({
    org_id: context.orgId,
    session_id: body.session_id ?? null,
    tool_id: tool.id,
    tool_name: tool.name,
    request_payload: params,
    response_payload: masked.masked,
    status: result.status,
    latency_ms: latency,
    masked_fields: masked.maskedFields,
    policy_decision: { allowed: true },
    created_at: nowIso(),
  });

  return NextResponse.json({
    tool: tool.name,
    version: tool.version,
    status: result.status,
    data: masked.masked,
    error: result.error || null,
    meta: { latency_ms: latency },
  });
}
