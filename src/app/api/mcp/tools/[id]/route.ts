import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { getServerContext } from "@/lib/serverAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeProviderKey(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "cafe24" || normalized === "solapi" || normalized === "juso") return normalized;
  return "unknown";
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const safe = Number(value);
  return Number.isFinite(safe) ? safe : undefined;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeUuidList(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  const next = value.map((item) => String(item || "").trim()).filter(Boolean);
  if (next.some((item) => !isUuid(item))) return null;
  return next;
}

async function ensureAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return { ok: false as const, status: 401, body: { error: context.error } };
  }

  const { data: access, error: accessError } = await context.supabase
    .from("A_iam_user_access_maps")
    .select("is_admin")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (accessError) {
    return { ok: false as const, status: 400, body: { error: accessError.message } };
  }

  if (!access?.is_admin) {
    return { ok: false as const, status: 403, body: { error: "FORBIDDEN" } };
  }

  return { ok: true as const, context };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params;
  const admin = await ensureAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const name = normalizeText(body.name);
  if (!name) {
    return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
  }

  const version = normalizeText(body.version) || "1.0";
  const scopeKey = normalizeText(body.scope_key);
  const endpointPath = normalizeText(body.endpoint_path);
  const httpMethod = normalizeText(body.http_method)?.toUpperCase() || null;
  const description = normalizeText(body.description);
  const rateLimit = normalizeNumber(body.rate_limit_per_min);
  const editableIds = normalizeUuidList(body.editable_id);
  const usableIds = normalizeUuidList(body.usable_id);
  if (rateLimit === undefined || editableIds === null || usableIds === null) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("C_mcp_tools")
    .select("id, editable_id, usable_id")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const schemaJson = typeof body.schema_json === "object" && body.schema_json !== null ? body.schema_json : {};
  const maskingRules = body.masking_rules ?? null;
  const conditions = body.conditions ?? null;

  const { data, error } = await supabaseAdmin
    .from("C_mcp_tools")
    .update({
      provider_key: normalizeProviderKey(body.provider_key),
      scope_key: scopeKey,
      name,
      description,
      schema_json: schemaJson,
      endpoint_path: endpointPath,
      http_method: httpMethod,
      version,
      rate_limit_per_min: rateLimit,
      is_active: normalizeBoolean(body.is_active, true),
      masking_rules: maskingRules,
      conditions,
      visibility: "public",
      access: "open_world",
      is_destructive: normalizeBoolean(body.is_destructive, false),
      is_public: normalizeBoolean(body.is_public, true),
      editable_id: editableIds ?? existing.editable_id ?? [admin.context.user.id],
      usable_id: usableIds ?? existing.usable_id ?? [],
    })
    .eq("id", resolvedParams.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "MCP_TOOL_UPDATE_FAILED" }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params;
  const admin = await ensureAdmin(req);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminSupabaseClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ADMIN_SUPABASE_INIT_FAILED" },
      { status: 500 }
    );
  }

  const { data: agents, error: agentError } = await supabaseAdmin
    .from("B_bot_agents")
    .select("id, name, mcp_tool_ids")
    .or(`org_id.eq.${admin.context.orgId},org_id.is.null`);

  if (agentError) {
    return NextResponse.json({ error: agentError.message }, { status: 400 });
  }

  const linkedAgents = (agents || []).filter((agent) =>
    Array.isArray(agent.mcp_tool_ids) ? agent.mcp_tool_ids.includes(resolvedParams.id) : false
  );

  if (linkedAgents.length > 0) {
    return NextResponse.json(
      {
        error: "MCP_TOOL_IN_USE",
        items: linkedAgents.map((agent) => ({ id: agent.id, name: agent.name })),
      },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin.from("C_mcp_tools").delete().eq("id", resolvedParams.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
