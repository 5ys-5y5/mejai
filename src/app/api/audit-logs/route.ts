import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

function parseOrder(orderParam: string | null) {
  if (!orderParam) return { field: "created_at", ascending: false };
  const [field, dir] = orderParam.split(".");
  return { field: field || "created_at", ascending: dir === "asc" };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(authHeader);
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  const orderParam = url.searchParams.get("order");
  const { field, ascending } = parseOrder(orderParam);

  const { data, error, count } = await supabase
    .from("E_ops_actions")
    .select("*", { count: "exact" })
    .order(field, { ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ items: data || [], total: count || 0 });
}
