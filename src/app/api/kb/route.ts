import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";
import crypto from "crypto";
import { createEmbedding } from "@/lib/embeddings";
import { isAdminKbValue, isSampleKbRow, isSampleKbValue } from "@/lib/kbType";
import { createAdminSupabaseClient } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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

function toApplyGroups(value: unknown): Array<{ path: string; values: string[] }> | null {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const path = typeof (item as Record<string, unknown>).path === "string" ? (item as Record<string, unknown>).path : "";
      const rawValues = (item as Record<string, unknown>).values;
      const values = Array.isArray(rawValues) ? rawValues.map(String).filter(Boolean) : [];
      if (!path || values.length === 0) return null;
      return { path, values };
    })
    .filter((item): item is { path: string; values: string[] } => Boolean(item));
  return normalized.length > 0 ? normalized : null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const contextRes = await getServerContext(authHeader, cookieHeader);
  let supabase = null as unknown as ReturnType<typeof createServerSupabaseClient>;
  let agentId: string | null = null;
  let userId: string | null = null;
  let publicOnly = false;
  if ("error" in contextRes) {
    publicOnly = true;
    try {
      supabase = createAdminSupabaseClient();
    } catch {
      supabase = createServerSupabaseClient();
    }
  } else {
    supabase = contextRes.supabase as ReturnType<typeof createServerSupabaseClient>;
    agentId = contextRes.agentId;
    userId = contextRes.user.id;
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const category = url.searchParams.get("category");
  const isActive = url.searchParams.get("is_active");
  const isAdmin = url.searchParams.get("is_admin");
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  let query = supabase
    .from("B_bot_knowledge_bases")
    .select("*", { count: "exact" })
    .order(field, { ascending })
    .range(offset, offset + limit - 1);
  if (publicOnly) {
    query = query.eq("is_public", true);
  } else {
    query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (isActive !== null) {
    if (isActive === "true") query = query.eq("is_active", true);
    if (isActive === "false") query = query.eq("is_active", false);
  }

  if (isAdmin === "sample") {
    query = query.eq("is_public", true);
  }

  let userGroup: Record<string, unknown> | null = null;
  if (!publicOnly && userId) {
    const { data: accessRow } = await supabase
      .from("A_iam_user_profiles")
      .select("group")
      .eq("user_id", userId)
      .maybeSingle();
    userGroup = (accessRow?.group as Record<string, unknown> | null) ?? null;
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = (data || []).map((row: Record<string, unknown>) => {
    const applyGroups = toApplyGroups(row?.apply_groups);
    const applyGroupsMode = row?.apply_groups_mode === "any" ? "any" : row?.apply_groups_mode === "all" ? "all" : null;
    const applies = isAdminKbValue(row?.is_admin)
      ? matchesAdminGroup(applyGroups, userGroup, applyGroupsMode)
      : true;
    return { ...row, applies_to_user: applies };
  });

  const filteredItems = isAdmin === "sample" ? items.filter((row) => isSampleKbRow(row as Record<string, unknown>)) : items;

  return NextResponse.json({ items: filteredItems, total: isAdmin === "sample" ? filteredItems.length : count || 0 });
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
  const agentId =
    String(req.headers.get("x-agent-id") || body.agent_id || context.agentId || "")
      .trim() || null;

  const newId = crypto.randomUUID();
  const wantsSample = body.is_public === true || body.is_sample === true || isSampleKbValue(body.is_admin);
  const wantsAdmin = isAdminKbValue(body.is_admin) && !wantsSample;
  let applyGroups = Array.isArray(body.apply_groups) ? body.apply_groups : null;
  let applyGroupsMode =
    body.apply_groups_mode === "any" || body.apply_groups_mode === "all" ? body.apply_groups_mode : "all";
  let isAdmin = false;
  if (wantsAdmin || wantsSample) {
    if (!context.isAdmin) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    isAdmin = wantsAdmin;
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
    agent_id: agentId,
    embedding: null as number[] | null,
    is_admin: isAdmin,
    is_public: wantsSample,
    apply_groups: applyGroups,
    apply_groups_mode: applyGroupsMode,
    content_json: isAdmin ? (body.content_json ?? null) : null,
    created_user_id: context.user.id,
    owner_user_ids: [context.user.id],
    allowed_user_ids: [],
  };

  try {
    const embeddingRes = await createEmbedding(String(body.content || ""));
    payload.embedding = embeddingRes.embedding as number[];
  } catch {
    return NextResponse.json({ error: "EMBEDDING_FAILED" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("B_bot_knowledge_bases")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
