import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import crypto from "crypto";
import { createEmbedding } from "@/lib/embeddings";

function parseOrder(orderParam: string | null) {
  if (!orderParam) return { field: "created_at", ascending: false };
  const [field, dir] = orderParam.split(".");
  return { field: field || "created_at", ascending: dir === "asc" };
}

function readGroupValue(group: Record<string, unknown> | null, path: string) {
  if (!group) return null;
  return path.split(".").reduce((acc: unknown, key) => {
    if (!acc || typeof acc !== "object") return null;
    return (acc as Record<string, unknown>)[key];
  }, group as unknown);
}

function matchesAdminGroup(
  applyGroups: Array<{ path: string; values: string[] }> | null | undefined,
  group: Record<string, unknown> | null,
  mode: "all" | "any" | null | undefined
) {
  if (!applyGroups || applyGroups.length === 0) return true;
  const matcher = mode === "any" ? "some" : "every";
  return applyGroups[matcher]((rule) => {
    const value = readGroupValue(group, rule.path);
    if (value === null || value === undefined) return false;
    return rule.values.map(String).includes(String(value));
  });
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
  const category = url.searchParams.get("category");
  const isActive = url.searchParams.get("is_active");
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  let query = context.supabase
    .from("knowledge_base")
    .select("*", { count: "exact" })
    .order(field, { ascending })
    .range(offset, offset + limit - 1)
    .or(`org_id.eq.${context.orgId},org_id.is.null`);

  if (category) {
    query = query.eq("category", category);
  }

  if (isActive !== null) {
    if (isActive === "true") query = query.eq("is_active", true);
    if (isActive === "false") query = query.eq("is_active", false);
  }

  const { data: accessRow } = await context.supabase
    .from("user_access")
    .select("group")
    .eq("user_id", context.user.id)
    .maybeSingle();
  const userGroup = (accessRow?.group as Record<string, unknown> | null) ?? null;

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = (data || []).map((row: any) => {
    const applies =
      row?.is_admin
        ? matchesAdminGroup(row?.apply_groups || null, userGroup, row?.apply_groups_mode || null)
        : true;
    return { ...row, applies_to_user: applies };
  });

  return NextResponse.json({ items, total: count || 0 });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !body.title || !body.content) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const newId = crypto.randomUUID();
  const wantsAdmin = Boolean(body.is_admin);
  let applyGroups = Array.isArray(body.apply_groups) ? body.apply_groups : null;
  let applyGroupsMode =
    body.apply_groups_mode === "any" || body.apply_groups_mode === "all" ? body.apply_groups_mode : "all";
  let isAdmin = false;
  if (wantsAdmin) {
    const { data: access, error: accessError } = await context.supabase
      .from("user_access")
      .select("is_admin")
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (accessError || !access?.is_admin) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    isAdmin = true;
  }

  if (!isAdmin) {
    applyGroups = null;
    applyGroupsMode = null;
  }

  const payload = {
    id: newId,
    parent_id: newId,
    title: body.title,
    content: body.content,
    category: body.category ?? null,
    version: "1.0",
    is_active: body.is_active ?? true,
    org_id: context.orgId,
    embedding: null as number[] | null,
    is_admin: isAdmin,
    apply_groups: applyGroups,
    apply_groups_mode: applyGroupsMode,
    content_json: isAdmin ? (body.content_json ?? null) : null,
  };

  try {
    const embeddingRes = await createEmbedding(String(body.content || ""));
    payload.embedding = embeddingRes.embedding as number[];
  } catch (err) {
    return NextResponse.json({ error: "EMBEDDING_FAILED" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("knowledge_base")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
