import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import crypto from "crypto";

function parseOrder(orderParam: string | null) {
  if (!orderParam) return { field: "created_at", ascending: false };
  const [field, dir] = orderParam.split(".");
  return { field: field || "created_at", ascending: dir === "asc" };
}

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidLlm(value?: string | null) {
  if (!value) return false;
  return value === "chatgpt" || value === "gemini";
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const isActive = url.searchParams.get("is_active");
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  let query = context.supabase
    .from("B_bot_agents")
    .select("*", { count: "exact" })
    .order(field, { ascending })
    .range(offset, offset + limit - 1)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);

  if (isActive !== null) {
    if (isActive === "true") query = query.eq("is_active", true);
    if (isActive === "false") query = query.eq("is_active", false);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.llm || !body.kb_id) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (!isValidLlm(body.llm)) {
    return NextResponse.json({ error: "INVALID_LLM" }, { status: 400 });
  }

  if (!isUuid(body.kb_id)) {
    return NextResponse.json({ error: "INVALID_KB_ID" }, { status: 400 });
  }

  const newId = crypto.randomUUID();
  const payload = {
    id: newId,
    parent_id: newId,
    name: String(body.name || "").trim(),
    llm: body.llm,
    kb_id: body.kb_id,
    mcp_tool_ids: Array.isArray(body.mcp_tool_ids) ? body.mcp_tool_ids : [],
    agent_type: body.agent_type ?? null,
    industry: body.industry ?? null,
    use_case: body.use_case ?? null,
    website: body.website ?? null,
    goal: body.goal ?? null,
    version: body.version ?? "1.0",
    is_active: body.is_active ?? true,
    org_id: context.orgId,
    created_by: context.user.id,
  };

  if (!payload.name) {
    return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
  }

  const { data, error } = await context.supabase.from("B_bot_agents").insert(payload).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
