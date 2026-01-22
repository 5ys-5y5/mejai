import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { resolveAuthHeader } from "@/lib/serverAuth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(authHeader);
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("event_logs")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data || []);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const header = resolveAuthHeader(req.headers.get("authorization") || "", req.headers.get("cookie") || "");
  if (!header) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(header);
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body || !body.event_type) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const payload = {
    session_id: id,
    event_type: body.event_type,
    payload: body.payload ?? {},
  };

  const { data, error } = await supabase.from("event_logs").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
