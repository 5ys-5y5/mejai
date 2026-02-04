import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { resolveAuthHeader } from "@/lib/serverAuth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const getByPath = (obj: unknown, path: string) => {
    if (!obj || typeof obj !== "object" || !path) return undefined;
    return path.split(".").reduce<unknown>((acc, seg) => {
      if (!acc || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[seg];
    }, obj);
  };
  const header = resolveAuthHeader(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if (!header) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(header);
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  const limitParam = searchParams.get("limit");
  const turnId = searchParams.get("turn_id");
  const seqParam = searchParams.get("seq");
  const key = searchParams.get("key");
  const value = searchParams.get("value");

  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 0, 1), 500) : 200;
  const seq = seqParam ? Number(seqParam) : null;

  if (key && !value) {
    return NextResponse.json({ error: "INVALID_QUERY", detail: "value is required when key is provided" }, { status: 400 });
  }

  let query = supabase
    .from("F_audit_turn_specs_view")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (since) {
    query = query.gt("created_at", since);
  }
  if (turnId) {
    query = query.eq("turn_id", turnId);
  }
  if (seq !== null && !Number.isNaN(seq)) {
    query = query.eq("seq", seq);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  let items = data || [];
  if (key && value) {
    items = items.filter((row) => {
      const record = row as Record<string, unknown>;
      const prefix = record?.prefix_json as Record<string, unknown> | undefined;
      const direct = getByPath(prefix, key);
      if (direct !== undefined && String(direct) === value) return true;
      const entries = Array.isArray(prefix?.entries) ? prefix.entries : [];
      return entries.some((entry) => {
        const item = entry as Record<string, unknown>;
        return item?.key === key && String(item?.value ?? "") === value;
      });
    });
  }
  return NextResponse.json(items);
}
