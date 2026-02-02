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
    .from("D_conv_turns")
    .select("*")
    .eq("session_id", id)
    .order("seq", { ascending: true });

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
    seq: body.seq ?? null,
    start_time: body.start_time ?? null,
    end_time: body.end_time ?? null,
    transcript_text: body.transcript_text ?? null,
    summary_text: body.summary_text ?? null,
    confirm_prompt: body.confirm_prompt ?? null,
    confirmation_response: body.confirmation_response ?? null,
    correction_text: body.correction_text ?? null,
    answer_text: body.answer_text ?? null,
    final_answer: body.final_answer ?? null,
    asr_confidence: body.asr_confidence ?? null,
  };

  const { data, error } = await supabase.from("D_conv_turns").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
