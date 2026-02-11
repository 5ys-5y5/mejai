"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/IconChip";
import { Clock, Headphones, PhoneCall, Pencil, Upload, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";

type SessionDetail = {
  id: string;
  started_at: string | null;
  created_at?: string | null;
  duration_sec: number | null;
  channel: string | null;
  caller_masked: string | null;
  outcome: string | null;
  sentiment: string | null;
  agent_id: string | null;
  satisfaction: number | null;
  escalation_reason: string | null;
  recording_url: string | null;
};

type TurnRow = {
  id: string;
  seq: number | null;
  start_time: string | null;
  end_time: string | null;
  transcript_text: string | null;
  summary_text: string | null;
  confirm_prompt: string | null;
  confirmation_response: string | null;
  correction_text: string | null;
  answer_text: string | null;
  final_answer: string | null;
  created_at?: string | null;
};

type AudioSegment = {
  id: string;
  label: string | null;
  start_time: string | null;
  end_time: string | null;
};

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white", className)}>{children}</div>
  );
}

function SkeletonLine() {
  return <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />;
}

function AudioStub({ segments }: { segments: { t: string; label: string }[] }) {
  return (
    <CardShell className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">오디오</div>
        <Badge variant="slate">연결됨</Badge>
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonLine />
        <SkeletonLine />
        <div className="flex items-center gap-2 pt-2">
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
            <Play className="inline h-3.5 w-3.5 mr-1.5" />
            재생
          </button>
          <div className="text-xs text-slate-500">00:00 / 05:12</div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-xs font-semibold text-slate-900">구간 재생(세그먼트)</div>
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          {segments.map((seg) => (
            <div key={`${seg.t}-${seg.label}`} className="flex items-center justify-between">
              <span>{seg.label}</span>
              <span className="text-slate-500">{seg.t}</span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

export default function CallsDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [turns, setTurns] = useState<TurnRow[]>([]);
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [flowRunning, setFlowRunning] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sessionRes = await apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);
        const turnsRes = await apiFetch<TurnRow[]>(`/api/sessions/${sessionId}/turns`);
        const audioRes = await apiFetch<AudioSegment[]>(`/api/sessions/${sessionId}/audio-segments`);

        if (mounted) {
          setSession(sessionRes);
          setTurns(turnsRes || []);
          setAudioSegments(audioRes || []);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("세션 데이터를 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const refresh = async () => {
    const sessionRes = await apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);
    const turnsRes = await apiFetch<TurnRow[]>(`/api/sessions/${sessionId}/turns`);
    const audioRes = await apiFetch<AudioSegment[]>(`/api/sessions/${sessionId}/audio-segments`);
    setSession(sessionRes);
    setTurns(turnsRes || []);
    setAudioSegments(audioRes || []);
  };

  const processStep = async (step: string, payload: Record<string, unknown>) => {
    setProcessing(true);
    setProcessError(null);
    try {
      await apiFetch(`/api/sessions/${sessionId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, ...payload }),
      });
      await refresh();
    } catch {
      setProcessError("통화 처리 단계 실행에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runFlow = async (mode: "resolve" | "escalate") => {
    if (flowRunning) return;
    setFlowRunning(true);
    setProcessError(null);
    try {
      await processStep("asr", {
        seq: turns.length + 1,
        start_time: "00:00",
        end_time: "00:08",
        transcript_text: "고객이 환불 진행 상황을 문의했습니다.",
        asr_confidence: 0.93,
      });
      await delay(300);
      await processStep("summary", {
        seq: turns.length + 2,
        summary_text: "환불 진행 상태 문의. 주문번호 확인 필요.",
      });
      await delay(300);
      await processStep("confirm", {
        seq: turns.length + 3,
        confirm_prompt: "주문번호 8841로 조회해도 될까요?",
      });
      await delay(300);
      if (mode === "escalate") {
        await processStep("escalate", {
          seq: turns.length + 4,
          escalation_reason: "사람 상담 필요",
        });
      } else {
        await processStep("final", {
          seq: turns.length + 4,
          final_answer: "환불 처리가 진행 중이며 1~2영업일 내 완료됩니다.",
          outcome: "해결",
        });
      }
    } finally {
      setFlowRunning(false);
    }
  };

  const transcript = useMemo(() => {
    const items: { t: string; who: string; text: string }[] = [];
    turns.forEach((t) => {
      const time = t.start_time || t.created_at || "";
      if (t.transcript_text) {
        items.push({ t: time || "-", who: "고객", text: t.transcript_text });
      }
      const agentText = t.final_answer || t.answer_text;
      if (agentText) {
        items.push({ t: t.end_time || time || "-", who: "상담", text: agentText });
      }
    });
    return items;
  }, [turns]);

  const asrSegments = useMemo(
    () =>
      turns
        .filter((t) => t.transcript_text)
        .map((t) => ({ t: t.start_time || "-", text: t.transcript_text as string })),
    [turns]
  );

  const summary = useMemo(() => {
    const last = [...turns].reverse().find((t) => t.summary_text);
    return last?.summary_text || "-";
  }, [turns]);

  const confirmationPrompt = useMemo(() => {
    const last = [...turns].reverse().find((t) => t.confirm_prompt);
    return last?.confirm_prompt || "-";
  }, [turns]);

  const confirmationResponse = useMemo(() => {
    const last = [...turns].reverse().find((t) => t.confirmation_response || t.correction_text);
    return last?.confirmation_response || last?.correction_text || "-";
  }, [turns]);

  const finalAnswer = useMemo(() => {
    const last = [...turns].reverse().find((t) => t.final_answer || t.answer_text);
    return last?.final_answer || last?.answer_text || "-";
  }, [turns]);

  const audioSegmentsView = useMemo(
    () =>
      audioSegments.map((s) => ({
        t: s.start_time || "-",
        label: s.label || "구간",
      })),
    [audioSegments]
  );

  if (!session && !loading && !error) {
    return (
      <div className="px-5 md:px-8 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <CardShell className="p-5">
            <div className="text-sm text-slate-900">세션을 찾을 수 없습니다.</div>
            <div className="mt-3">
              <Link className="text-sm text-emerald-700 hover:underline" href="/app/calls">
                세션 목록으로
              </Link>
            </div>
          </CardShell>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 md:px-8 py-6">
        <div className="mx-auto w-full max-w-6xl">
          <CardShell className="p-5">
            <div className="text-sm text-rose-600">{error}</div>
          </CardShell>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-5 space-y-4">
              <CardShell className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <IconChip icon={PhoneCall} label={session?.caller_masked || "발신자 정보 없음"} />
                  <IconChip icon={Clock} label={`${session?.duration_sec || 0}s`} />
                  <IconChip icon={Headphones} label={session?.agent_id || "미지정"} />
                  <Badge variant={session?.outcome === "해결" ? "green" : "amber"}>
                    {session?.outcome || "미정"}
                  </Badge>
                  <Badge variant={session?.sentiment === "불만" ? "red" : "slate"}>
                    {session?.sentiment || "미정"}
                  </Badge>
                  <span className="ml-auto text-xs text-slate-500">
                    {session?.started_at || session?.created_at || "-"}
                  </span>
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  녹취 URL, STT 타임코드, 라우팅 이벤트를 이 영역에 표시합니다.
                </div>
              </CardShell>

              <AudioStub segments={audioSegmentsView} />

              <CardShell className="p-5">
                <div className="text-sm font-semibold text-slate-900">세션 작업</div>
                {processError ? (
                  <div className="mt-2 text-xs text-rose-600">{processError}</div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
                    <Pencil className="inline h-3.5 w-3.5 mr-1.5" />
                    라벨 수정
                  </button>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 hover:bg-slate-50">
                    <Upload className="inline h-3.5 w-3.5 mr-1.5" />
                    내보내기
                  </button>
                  <button
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    disabled={processing}
                    onClick={() =>
                      processStep("asr", {
                        seq: turns.length + 1,
                        start_time: "00:00",
                        end_time: "00:08",
                        transcript_text: "고객이 환불 진행 상황을 문의했습니다.",
                        asr_confidence: 0.93,
                      })
                    }
                  >
                    ASR 기록
                  </button>
                  <button
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    disabled={processing}
                    onClick={() =>
                      processStep("summary", {
                        seq: turns.length + 1,
                        summary_text: "환불 진행 상태 문의. 주문번호 확인 필요.",
                      })
                    }
                  >
                    요약 기록
                  </button>
                  <button
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    disabled={processing}
                    onClick={() =>
                      processStep("confirm", {
                        seq: turns.length + 1,
                        confirm_prompt: "주문번호 8841로 조회해도 될까요?",
                      })
                    }
                  >
                    확인 요청
                  </button>
                  <button
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    disabled={processing}
                    onClick={() =>
                      processStep("final", {
                        seq: turns.length + 1,
                        final_answer: "환불 처리가 진행 중이며 1~2영업일 내 완료됩니다.",
                        outcome: "해결",
                      })
                    }
                  >
                    최종 응답
                  </button>
                  <button
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    disabled={processing}
                    onClick={() =>
                      processStep("escalate", {
                        seq: turns.length + 1,
                        escalation_reason: "사람 상담 필요",
                      })
                    }
                  >
                    이관 처리
                  </button>
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={flowRunning || processing}
                    onClick={() => runFlow("resolve")}
                  >
                    자동 처리 시작
                  </button>
                  <button
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={flowRunning || processing}
                    onClick={() => runFlow("escalate")}
                  >
                    자동 이관 시뮬레이션
                  </button>
                </div>
              </CardShell>
            </div>

            <div className="xl:col-span-7 space-y-4">
              <CardShell>
                <div className="px-5 py-4 border-b border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">대화 타임라인</div>
                  <div className="mt-1 text-xs text-slate-500">타임코드 기반 대화 흐름</div>
                </div>
                <div className="p-5 space-y-3">
                  {loading ? (
                    <div className="text-sm text-slate-500">불러오는 중...</div>
                  ) : (
                    transcript.map((m, idx) => {
                      const isAgent = m.who === "상담";
                      return (
                        <div key={idx} className={cn("flex gap-3", isAgent ? "" : "justify-end")}>
                          <div
                            className={cn(
                              "w-full max-w-[520px] rounded-2xl border p-3",
                              isAgent ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50"
                            )}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className={cn("font-medium", isAgent ? "text-slate-900" : "text-emerald-800")}>
                                {m.who}
                              </div>
                              <div className="text-slate-500">{m.t}</div>
                            </div>
                            <div className="mt-1 text-sm text-slate-900 leading-relaxed">{m.text}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardShell>

              <CardShell>
                <div className="px-5 py-4 border-b border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">세션/턴 로그</div>
                  <div className="mt-1 text-xs text-slate-500">
                    ASR, 요약, 확인, 응답, 만족도 및 이관 사유를 포함합니다.
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold text-slate-900">ASR 전사</div>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      {asrSegments.length === 0 ? (
                        <div className="text-xs text-slate-500">ASR 데이터가 없습니다.</div>
                      ) : (
                        asrSegments.map((seg) => (
                          <div key={`${seg.t}-${seg.text}`} className="flex items-start justify-between gap-4">
                            <span className="flex-1">{seg.text}</span>
                            <span className="text-xs text-slate-500">{seg.t}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-900">요약</div>
                    <div className="mt-2 text-sm text-slate-700">{summary}</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-900">확인 요청 문구</div>
                    <div className="mt-2 text-sm text-slate-700">{confirmationPrompt}</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-900">고객 확인/수정</div>
                    <div className="mt-2 text-sm text-slate-700">{confirmationResponse}</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-900">최종 응답</div>
                    <div className="mt-2 text-sm text-slate-700">{finalAnswer}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-900">만족도 입력</div>
                      <div className="mt-2 text-sm text-slate-700">
                        {session?.satisfaction ?? "-"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold text-slate-900">이관 사유</div>
                      <div className="mt-2 text-sm text-slate-700">
                        {session?.escalation_reason || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardShell>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
