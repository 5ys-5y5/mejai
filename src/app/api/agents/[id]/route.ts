import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteContext = { params: Promise<{ id: string }> };

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeId(raw: string) {
  let value = raw;
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep raw if decoding fails
  }
  value = value.trim();
  value = value.split("?")[0]?.split("#")[0] || value;
  return value;
}

function bumpVersion(value?: string | null) {
  if (!value) return "1.0";
  const raw = value.trim();
  const match = raw.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (match) {
    const hasV = raw.toLowerCase().startsWith("v");
    const major = Number(match[1] || 0);
    const minor = match[2] !== undefined ? Number(match[2]) : null;
    const patch = match[3] !== undefined ? Number(match[3]) : null;
    if (patch !== null) {
      return `${hasV ? "v" : ""}${major}.${minor ?? 0}.${patch + 1}`;
    }
    if (minor !== null) {
      return `${hasV ? "v" : ""}${major}.${minor + 1}`;
    }
    return `${hasV ? "v" : ""}${major + 1}`;
  }
  const revMatch = raw.match(/^(.*?)-rev(\d+)$/i);
  if (revMatch) {
    return `${revMatch[1]}-rev${Number(revMatch[2]) + 1}`;
  }
  return `${raw}-rev1`;
}

function isValidLlm(value?: string | null) {
  if (!value) return false;
  return value === "chatgpt" || value === "gemini";
}

function buildScopedQuery(client: SupabaseClient, id: string, orgId: string) {
  return client.from("B_bot_agents").select("*").eq("id", id).or(`org_id.eq.${orgId},org_id.is.null`);
}

function buildParentQuery(client: SupabaseClient, parentId: string, orgId: string) {
  return client
    .from("B_bot_agents")
    .select("*")
    .eq("parent_id", parentId)
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id: routeId } = await context.params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const rawId = routeId;
  const urlId = req.nextUrl.pathname.split("/").pop() || "";
  const id = normalizeId(rawId && rawId !== "undefined" ? rawId : urlId);
  if (!isUuid(id)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const { data: scopedData, error } = await buildScopedQuery(
    serverContext.supabase,
    id,
    serverContext.orgId
  ).maybeSingle();
  let data = scopedData;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    const parentResult = await buildParentQuery(serverContext.supabase, id, serverContext.orgId).limit(1).maybeSingle();
    if (parentResult.error) {
      return NextResponse.json({ error: parentResult.error.message }, { status: 400 });
    }
    data = parentResult.data ?? null;
  }

  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id: routeId } = await context.params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const payload: {
    name?: string;
    llm?: string;
    kb_id?: string;
    mcp_tool_ids?: string[];
    agent_type?: string | null;
    industry?: string | null;
    use_case?: string | null;
    website?: string | null;
    goal?: string | null;
    is_active?: boolean;
  } = {};

  if (typeof body.name === "string") payload.name = body.name;
  if (typeof body.llm === "string") payload.llm = body.llm;
  if (typeof body.kb_id === "string") payload.kb_id = body.kb_id;
  if (Array.isArray(body.mcp_tool_ids)) payload.mcp_tool_ids = body.mcp_tool_ids;
  if (body.agent_type === null || typeof body.agent_type === "string") payload.agent_type = body.agent_type;
  if (body.industry === null || typeof body.industry === "string") payload.industry = body.industry;
  if (body.use_case === null || typeof body.use_case === "string") payload.use_case = body.use_case;
  if (body.website === null || typeof body.website === "string") payload.website = body.website;
  if (body.goal === null || typeof body.goal === "string") payload.goal = body.goal;
  if (typeof body.is_active === "boolean") payload.is_active = body.is_active;

  if (payload.name !== undefined && payload.name.trim().length === 0) {
    return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
  }
  if (payload.llm !== undefined && !isValidLlm(payload.llm)) {
    return NextResponse.json({ error: "INVALID_LLM" }, { status: 400 });
  }
  if (payload.kb_id !== undefined && !isUuid(payload.kb_id)) {
    return NextResponse.json({ error: "INVALID_KB_ID" }, { status: 400 });
  }

  const rawId = routeId;
  const urlId = req.nextUrl.pathname.split("/").pop() || "";
  const id = normalizeId(rawId && rawId !== "undefined" ? rawId : urlId);
  const { data: fetched, error: fetchError } = await buildScopedQuery(
    serverContext.supabase,
    id,
    serverContext.orgId
  ).maybeSingle();
  let existing = fetched;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!existing) {
    const parentResult = await buildParentQuery(serverContext.supabase, id, serverContext.orgId).limit(1).maybeSingle();
    if (parentResult.error) {
      return NextResponse.json({ error: parentResult.error.message }, { status: 400 });
    }
    existing = parentResult.data ?? null;
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
  }

  const parentId = (existing as { parent_id?: string | null }).parent_id ?? existing.id;
  const nextName = payload.name ?? existing.name;
  const nextLlm = payload.llm ?? existing.llm;
  const nextKbId = payload.kb_id ?? existing.kb_id;
  const nextMcpToolIds = payload.mcp_tool_ids ?? existing.mcp_tool_ids ?? [];
  const nextAgentType = payload.agent_type ?? existing.agent_type ?? null;
  const nextIndustry = payload.industry ?? existing.industry ?? null;
  const nextUseCase = payload.use_case ?? existing.use_case ?? null;
  const nextWebsite = payload.website ?? existing.website ?? null;
  const nextGoal = payload.goal ?? existing.goal ?? null;
  const shouldActivate = payload.is_active === true;
  const shouldDeactivate = payload.is_active === false;

  const mcpChanged =
    JSON.stringify(nextMcpToolIds ?? []) !== JSON.stringify(existing.mcp_tool_ids ?? []);
  const configChanged =
    nextLlm !== existing.llm || nextKbId !== existing.kb_id || mcpChanged;
  const metaChanged =
    nextName !== existing.name ||
    nextAgentType !== (existing.agent_type ?? null) ||
    nextIndustry !== (existing.industry ?? null) ||
    nextUseCase !== (existing.use_case ?? null) ||
    nextWebsite !== (existing.website ?? null) ||
    nextGoal !== (existing.goal ?? null);

  let data = existing as typeof existing;
  let error: { message: string } | null = null;

  if (configChanged) {
    const nextIsActive = payload.is_active ?? existing.is_active ?? true;
    if (nextIsActive) {
      const { error: deactivateError } = await serverContext.supabase
        .from("B_bot_agents")
        .update({ is_active: false })
        .eq("parent_id", parentId)
        .or(`org_id.eq.${serverContext.orgId},org_id.is.null`);
      if (deactivateError) {
        return NextResponse.json({ error: deactivateError.message }, { status: 400 });
      }
    }
    const insertPayload = {
      parent_id: parentId,
      name: nextName,
      llm: nextLlm,
      kb_id: nextKbId,
      mcp_tool_ids: nextMcpToolIds,
      agent_type: nextAgentType,
      industry: nextIndustry,
      use_case: nextUseCase,
      website: nextWebsite,
      goal: nextGoal,
      version: bumpVersion(existing.version),
      is_active: nextIsActive,
      org_id: existing.org_id ?? serverContext.orgId,
      created_by: existing.created_by ?? serverContext.user.id,
    };

    const { data: inserted, error: insertError } = await serverContext.supabase
      .from("B_bot_agents")
      .insert(insertPayload)
      .select("*")
      .single();
    data = inserted as typeof existing;
    error = insertError ? { message: insertError.message } : null;
  } else {
    const updatePayload: Record<string, unknown> = {};
    if (metaChanged) {
      updatePayload.name = nextName;
      updatePayload.agent_type = nextAgentType;
      updatePayload.industry = nextIndustry;
      updatePayload.use_case = nextUseCase;
      updatePayload.website = nextWebsite;
      updatePayload.goal = nextGoal;
    }
    if (shouldActivate) updatePayload.is_active = true;
    if (shouldDeactivate) updatePayload.is_active = false;

    if (shouldActivate) {
      const { error: deactivateError } = await serverContext.supabase
        .from("B_bot_agents")
        .update({ is_active: false })
        .eq("parent_id", parentId)
        .or(`org_id.eq.${serverContext.orgId},org_id.is.null`);
      if (deactivateError) {
        return NextResponse.json({ error: deactivateError.message }, { status: 400 });
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      const { data: updated, error: updateError } = await serverContext.supabase
        .from("B_bot_agents")
        .update(updatePayload)
        .eq("id", existing.id)
        .or(`org_id.eq.${serverContext.orgId},org_id.is.null`)
        .select("*")
        .maybeSingle();
      data = updated as typeof existing;
      error = updateError ? { message: updateError.message } : null;
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id: routeId } = await context.params;
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const serverContext = await getServerContext(authHeader, cookieHeader);
  if ("error" in serverContext) {
    return NextResponse.json({ error: serverContext.error }, { status: 401 });
  }

  const rawId = routeId;
  const urlId = req.nextUrl.pathname.split("/").pop() || "";
  const id = normalizeId(rawId && rawId !== "undefined" ? rawId : urlId);
  const { data, error } = await serverContext.supabase
    .from("B_bot_agents")
    .delete()
    .eq("id", id)
    .or(`org_id.eq.${serverContext.orgId},org_id.is.null`)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
