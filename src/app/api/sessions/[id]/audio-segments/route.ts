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
    .from("D_conv_audio_segments")
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
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const payload = {
    session_id: id,
    label: body.label ?? null,
    start_time: body.start_time ?? null,
    end_time: body.end_time ?? null,
    audio_url: body.audio_url ?? null,
  };

  const { data, error } = await supabase
    .from("D_conv_audio_segments")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
