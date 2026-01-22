import { NextRequest, NextResponse } from "next/server";
import { getServerContext } from "@/lib/serverAuth";

function makeSessionCode() {
  return `s_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cookieHeader = req.headers.get("cookie") || "";
  const context = await getServerContext(authHeader, cookieHeader);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const durationSec = Number(body.duration_sec || 320);
  const startedAt = new Date(now.getTime() - durationSec * 1000).toISOString();
  const endedAt = now.toISOString();
  const escalated = Boolean(body.escalated);

  const sessionPayload = {
    org_id: context.orgId,
    session_code: body.session_code ?? makeSessionCode(),
    started_at: body.started_at ?? startedAt,
    ended_at: body.ended_at ?? endedAt,
    duration_sec: body.duration_sec ?? durationSec,
    channel: body.channel ?? "유선",
    caller_masked: body.caller_masked ?? "+82-10-****-5678",
    agent_id: body.agent_id ?? "a_support",
    outcome: body.outcome ?? (escalated ? "이관" : "해결"),
    sentiment: body.sentiment ?? (escalated ? "불만" : "보통"),
    escalation_reason: body.escalation_reason ?? (escalated ? "사람 상담 필요" : "해당 없음"),
    satisfaction: body.satisfaction ?? (escalated ? 2 : 1),
    recording_url: body.recording_url ?? null,
    metadata: body.metadata ?? {},
  };

  const { data: session, error: sessionError } = await context.supabase
    .from("sessions")
    .insert(sessionPayload)
    .select("*")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message || "SESSION_CREATE_FAILED" }, { status: 400 });
  }

  const turnsPayload = [
    {
      session_id: session.id,
      seq: 1,
      start_time: "00:00",
      end_time: "00:18",
      transcript_text: "안녕하세요. 상담 도움을 요청합니다.",
      summary_text: null,
      confirm_prompt: null,
      confirmation_response: null,
      correction_text: null,
      answer_text: "문의 내용을 확인했습니다. 잠시만 기다려 주세요.",
      final_answer: null,
      asr_confidence: 0.92,
    },
    {
      session_id: session.id,
      seq: 2,
      start_time: "00:19",
      end_time: "00:48",
      transcript_text: "환불 진행 상황을 알고 싶습니다.",
      summary_text: null,
      confirm_prompt: "환불 진행 상황을 확인해 드려도 될까요?",
      confirmation_response: "네, 맞습니다.",
      correction_text: null,
      answer_text: "환불 상태를 조회 중입니다.",
      final_answer: null,
      asr_confidence: 0.9,
    },
    {
      session_id: session.id,
      seq: 3,
      start_time: "00:49",
      end_time: "01:12",
      transcript_text: "주문번호는 8841입니다.",
      summary_text: "환불 상태 문의. 주문번호 8841 확인 후 안내.",
      confirm_prompt: "주문번호 8841로 조회해도 될까요?",
      confirmation_response: "네, 맞아요.",
      correction_text: null,
      answer_text: escalated
        ? "담당자에게 이관하여 확인 후 안내드리겠습니다."
        : "환불 처리가 진행 중이며 1~2영업일 내 완료됩니다.",
      final_answer: escalated
        ? "담당자에게 이관하여 확인 후 안내드리겠습니다."
        : "환불 처리가 진행 중이며 1~2영업일 내 완료됩니다.",
      asr_confidence: 0.94,
    },
  ];

  const { data: turns, error: turnsError } = await context.supabase
    .from("turns")
    .insert(turnsPayload)
    .select("*");

  if (turnsError) {
    return NextResponse.json({ error: turnsError.message }, { status: 400 });
  }

  const eventsPayload: Array<{
    session_id: string;
    event_type: string;
    payload: Record<string, unknown>;
  }> = [
    {
      session_id: session.id,
      event_type: "SUMMARY_GENERATED",
      payload: { summary: "환불 상태 문의. 주문번호 8841 확인 후 안내." },
    },
    {
      session_id: session.id,
      event_type: "FINAL_ANSWER_READY",
      payload: { answer: turnsPayload[2].final_answer },
    },
  ];

  if (escalated) {
    eventsPayload.push({
      session_id: session.id,
      event_type: "ESCALATED",
      payload: { reason: sessionPayload.escalation_reason },
    });
  }

  const { data: events, error: eventsError } = await context.supabase
    .from("event_logs")
    .insert(eventsPayload)
    .select("*");

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 400 });
  }

  const audioPayload = [
    { session_id: session.id, label: "인사", start_time: "00:00", end_time: "00:10", audio_url: null },
    { session_id: session.id, label: "주문번호 확인", start_time: "00:49", end_time: "01:05", audio_url: null },
  ];

  const { data: audioSegments, error: audioError } = await context.supabase
    .from("audio_segments")
    .insert(audioPayload)
    .select("*");

  if (audioError) {
    return NextResponse.json({ error: audioError.message }, { status: 400 });
  }

  let reviewItem = null;
  if (escalated) {
    const { data: review, error: reviewError } = await context.supabase
      .from("review_queue")
      .insert({
        session_id: session.id,
        reason: "후속 지원 요청",
        owner: "미배정",
        status: "Open",
      })
      .select("*")
      .single();

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 400 });
    }
    reviewItem = review;
  }

  return NextResponse.json({
    session,
    turns,
    events,
    audio_segments: audioSegments,
    review_queue: reviewItem,
  });
}
