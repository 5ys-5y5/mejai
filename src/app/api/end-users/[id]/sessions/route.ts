import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

const ORDER_FIELDS = new Set(["started_at", "created_at"]);

function parseOrder(orderParam: string | null) {
  if (!orderParam) return { field: "started_at", ascending: false };
  const [fieldRaw, dirRaw] = orderParam.split(".");
  const field = ORDER_FIELDS.has(fieldRaw) ? fieldRaw : "started_at";
  const ascending = dirRaw === "asc";
  return { field, ascending };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const contextAuth = await getServerContext(authHeader, cookieHeader);
  if ("error" in contextAuth) {
    return NextResponse.json({ error: contextAuth.error }, { status: 401 });
  }
  const { id } = await context.params;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  const { data, error, count } = await contextAuth.supabase
    .from("A_end_user_sessions")
    .select("*", { count: "exact" })
    .eq("org_id", contextAuth.orgId)
    .eq("end_user_id", id)
    .order(field, { ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
}
