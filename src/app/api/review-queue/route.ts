import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getServerContext, resolveAuthHeader } from "@/lib/serverAuth";

function parseOrder(orderParam: string | null) {
  if (!orderParam) return { field: "created_at", ascending: false };
  const [field, dir] = orderParam.split(".");
  return { field: field || "created_at", ascending: dir === "asc" };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const status = url.searchParams.get("status");
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  let query = context.supabase
    .from("review_queue")
    .select("*, sessions!inner(id, org_id)", { count: "exact" })
    .eq("sessions.org_id", context.orgId)
    .order(field, { ascending })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items =
    data?.map((row: { sessions?: unknown }) => {
      const { sessions, ...rest } = row as Record<string, unknown>;
      return rest;
    }) || [];

  return NextResponse.json({ items, total: count || 0 });
}

export async function POST(req: NextRequest) {
  const header = resolveAuthHeader(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if (!header) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(header);
  const body = await req.json().catch(() => null);
  if (!body || !body.session_id) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const payload = {
    session_id: body.session_id,
    reason: body.reason ?? null,
    owner: body.owner ?? null,
    status: body.status ?? "Open",
  };

  const { data, error } = await supabase.from("review_queue").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
