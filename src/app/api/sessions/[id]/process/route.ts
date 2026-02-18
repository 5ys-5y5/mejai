import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

const EVENT_MAP: Record<string, string> = {
  asr: "ASR_RECEIVED",
  summary: "SUMMARY_GENERATED",
  confirm: "CONFIRMATION_REQUESTED",
  response: "ANSWER_READY",
  final: "FINAL_ANSWER_READY",
  escalate: "ESCALATED",
};

export async function POST(
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
  const body = await req.json().catch(() => null);
  if (!body || !body.step) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await contextAuth.supabase
    .from("D_conv_sessions")
    .select("id, org_id")
    .eq("id", id)
    .eq("org_id", contextAuth.orgId)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  const turnPayload = {
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

  const { data: turn, error: turnError } = await contextAuth.supabase
    .from("D_conv_turns")
    .insert(turnPayload)
    .select("*")
    .single();

  if (turnError) {
    return NextResponse.json({ error: turnError.message }, { status: 400 });
  }

  const eventType = EVENT_MAP[String(body.step)] || "TURN_LOGGED";
  const { data: event, error: eventError } = await contextAuth.supabase
    .from("F_audit_events")
    .insert({
      session_id: id,
      event_type: eventType,
      payload: body.event_payload ?? body ?? {},
    })
    .select("*")
    .single();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  let sessionUpdate = null;
  if (body.step === "final") {
    const { data } = await contextAuth.supabase
      .from("D_conv_sessions")
      .update({ outcome: body.outcome ?? "해결" })
      .eq("id", id)
      .select("*")
      .single();
    sessionUpdate = data || null;
  }

  if (body.step === "escalate" || body.escalated) {
    const escalationReason = body.escalation_reason ?? "사람 상담 필요";
    await contextAuth.supabase
      .from("D_conv_sessions")
      .update({ outcome: "이관", escalation_reason: escalationReason })
      .eq("id", id);

    await contextAuth.supabase.from("E_ops_review_queue_items").insert({
      session_id: id,
      reason: "후속 지원 요청",
      owner: "미배정",
      status: "Open",
    });
  }

  return NextResponse.json({ turn, event, session: sessionUpdate });
}
