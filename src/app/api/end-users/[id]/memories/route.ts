import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

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
  const type = String(url.searchParams.get("type") || "").trim();
  const key = String(url.searchParams.get("key") || "").trim();
  const active = url.searchParams.get("active");
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  let query = contextAuth.supabase
    .from("A_end_user_memories")
    .select("*", { count: "exact" })
    .eq("org_id", contextAuth.orgId)
    .eq("end_user_id", id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("memory_type", type);
  if (key) query = query.eq("memory_key", key);
  if (active === "true") query = query.eq("is_active", true);
  if (active === "false") query = query.eq("is_active", false);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
}
