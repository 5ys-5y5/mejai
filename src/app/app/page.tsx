"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AgentSelectPopover } from "@/components/AgentSelectPopover";
import { DateRangePopover } from "@/components/DateRangePopover";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/apiClient";

type SessionRow = {
  id: string;
  started_at: string | null;
  duration_sec: number | null;
  outcome: string | null;
  agent_id: string | null;
  sentiment: string | null;
};

type ReviewRow = {
  id: string;
  session_id: string | null;
};

type AgentOption = {
  id: string;
  name: string;
};

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-300 bg-slate-50", className)}>
      {children}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <CardShell>
      <div className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{sub || ""}</div>
      </div>
    </CardShell>
  );
}

function SkeletonLine() {
  return <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />;
}

const resolvedSet = new Set(["해결", "Resolved", "resolved"]);
const escalatedSet = new Set(["이관", "Escalated", "escalated"]);

export default function DashboardPage() {
  const [selectedAgentId, setSelectedAgentId] = useState("all");
  const [range, setRange] = useState("last_month");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgPending, setOrgPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState("starter");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setSessions([]);
      setReviewQueue([]);
      setAgents([]);
      setOrgId(null);
      setIsAdmin(false);
      setLoading(false);
      setError("Supabase 설정이 필요합니다.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setSessions([]);
      setReviewQueue([]);
      setAgents([]);
      setOrgId(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const profile = await apiFetch<{
        plan: string;
        is_admin: boolean;
        org_role: string;
        org_id: string | null;
      }>("/api/user-profile");
      const pending = profile.org_role === "pending";
      setIsAdmin(Boolean(profile.is_admin));
      setPlan(profile.plan || "starter");
      setOrgPending(pending);
      setOrgId(profile.org_id || null);
      if (pending || !profile.org_id) {
        setSessions([]);
        setReviewQueue([]);
        setAgents([]);
        setLoading(false);
        return;
      }
    } catch {
      setIsAdmin(false);
      setPlan("starter");
      setOrgPending(false);
      setOrgId(null);
      setSessions([]);
      setReviewQueue([]);
      setAgents([]);
      setLoading(false);
      return;
    }

    let sessionRows: SessionRow[] = [];
    let reviewRows: ReviewRow[] = [];
    try {
      const sessionRes = await apiFetch<{ items: SessionRow[] }>("/api/sessions?limit=500");
      sessionRows = sessionRes.items || [];

      const reviewRes = await apiFetch<{ items: ReviewRow[] }>("/api/review-queue?limit=500");
      reviewRows = reviewRes.items || [];
    } catch (err) {
      setError("세션 데이터를 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    const agentMap = new Map<string, AgentOption>();
    sessionRows.forEach((s) => {
      const id = s.agent_id || "미지정";
      if (!agentMap.has(id)) {
        agentMap.set(id, { id, name: id });
      }
    });

    setSessions(sessionRows);
    setReviewQueue(reviewRows);
    setAgents([...agentMap.values()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    loadData();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  const handleSimulate = useCallback(async () => {
    setSimulating(true);
    setSimulateError(null);
    try {
      await apiFetch("/api/simulate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escalated: true }),
      });
      await loadData();
    } catch (err) {
      setSimulateError("시뮬레이션 생성에 실패했습니다.");
    } finally {
      setSimulating(false);
    }
  }, [loadData]);

  const sessionsForSelection = useMemo(() => {
    if (selectedAgentId === "all") return sessions;
    return sessions.filter((s) => (s.agent_id || "미지정") === selectedAgentId);
  }, [selectedAgentId, sessions]);

  const followupCountByAgent = useMemo(() => {
    const by = new Map<string, number>();
    agents.forEach((a) => by.set(a.id, 0));
    reviewQueue.forEach((rq) => {
      const s = sessions.find((x) => x.id === rq.session_id);
      if (!s) return;
      const agentId = s.agent_id || "미지정";
      by.set(agentId, (by.get(agentId) || 0) + 1);
    });
    return by;
  }, [agents, reviewQueue, sessions]);

  const summary = useMemo(() => {
    const totalCalls = sessionsForSelection.length;
    const avgDurationSec = totalCalls
      ? Math.round(
          sessionsForSelection.reduce((acc, s) => acc + (s.duration_sec || 0), 0) / totalCalls
        )
      : 0;
    const resolved = sessionsForSelection.filter((s) => resolvedSet.has(s.outcome || "")).length;
    const escalated = sessionsForSelection.filter((s) => escalatedSet.has(s.outcome || "")).length;
    const successRate = totalCalls ? Math.round((resolved / totalCalls) * 100) : 0;
    const escalationRate = totalCalls ? Math.round((escalated / totalCalls) * 100) : 0;

    const totalCostCredits = 0;
    const totalLlmCostUsd = 0;
    const avgCostCredits = 0;
    const avgLlmCostUsdPerMin = 0;

    const counts = new Map<string, number>();
    sessionsForSelection.forEach((s) => {
      const id = s.agent_id || "미지정";
      counts.set(id, (counts.get(id) || 0) + 1);
    });

    const mostCalled = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ id, count, name: id }));

    return {
      totalCalls,
      avgDurationSec,
      totalCostCredits,
      avgCostCredits,
      totalLlmCostUsd,
      avgLlmCostUsdPerMin,
      successRate,
      escalationRate,
      mostCalled,
    };
  }, [sessionsForSelection]);

  function fmtDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-end gap-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                <AgentSelectPopover
                  value={selectedAgentId}
                  onChange={setSelectedAgentId}
                  options={agents}
                  followupCountByAgent={followupCountByAgent}
                />
                <DateRangePopover value={range} onChange={setRange} />
              </div>
            </div>
          </div>
          {isAdmin ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {simulateError ? <div className="text-xs text-rose-600">{simulateError}</div> : null}
              <button
                type="button"
                onClick={handleSimulate}
                disabled={simulating}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold",
                  simulating
                    ? "border-slate-200 bg-slate-100 text-slate-400"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                )}
              >
                {simulating ? "시뮬레이션 생성 중..." : "통화 시뮬레이션 생성"}
              </button>
            </div>
          ) : null}

          {orgPending ? (
            <CardShell className="p-5">
              <div className="text-sm font-semibold text-slate-900">사업체 승인 대기 중입니다.</div>
              <div className="mt-2 text-sm text-slate-600">
                사업자 등록번호 소유자의 승인 후 서비스를 이용할 수 있습니다.
              </div>
            </CardShell>
          ) : null}

          {!orgId ? (
            <CardShell className="bg-amber-50 p-5">
              <div className="text-sm font-semibold text-slate-900">조직 정보가 없습니다.</div>
              <div className="mt-2 text-sm text-slate-600">
                이메일 인증 후 온보딩에서 조직 정보를 입력해 주세요.
              </div>
              <div className="mt-3">
                <Link href="/onboarding" className="text-sm text-emerald-700 hover:underline">
                  온보딩으로 이동
                </Link>
              </div>
            </CardShell>
          ) : null}

          {isAdmin ? <div className="border-t border-slate-200" /> : null}

          {error ? (
            <CardShell className="p-5">
              <div className="text-sm text-rose-600">{error}</div>
            </CardShell>
          ) : null}

          <div className="rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Metric label="통화 수" value={loading ? "-" : String(summary.totalCalls)} sub="" />
              <Metric label="평균 통화 시간" value={loading ? "-" : fmtDuration(summary.avgDurationSec)} sub="" />
              <Metric label="총 비용" value={loading ? "-" : `${summary.totalCostCredits}`} sub="크레딧" />
              <Metric label="평균 비용" value={loading ? "-" : `${summary.avgCostCredits}`} sub="크레딧/통화" />
              <Metric label="총 LLM 비용" value={loading ? "-" : `$${summary.totalLlmCostUsd}`} sub="" />
              <Metric label="평균 LLM 비용" value={loading ? "-" : `$${summary.avgLlmCostUsdPerMin}`} sub="/분" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <CardShell className="lg:col-span-2">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">전체 성공률</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {loading ? "-" : `${summary.successRate}%`}
                  </div>
                </div>
                <div className="p-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">차트(예시)</div>
                    <div className="mt-3 space-y-2">
                      <SkeletonLine />
                      <SkeletonLine />
                      <SkeletonLine />
                    </div>
                    <div className="mt-4 text-[11px] text-slate-500">
                      Hover/클릭은 실제 차트 라이브러리 연결 시 적용됩니다.
                    </div>
                  </div>
                </div>
              </CardShell>

              <CardShell>
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">이관률</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {loading ? "-" : `${summary.escalationRate}%`}
                  </div>
                </div>
                <div className="p-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">이관 / 전체 통화</div>
                    <div className="mt-3 text-sm text-slate-700">기준 기간 내 이관 비율입니다.</div>
                  </div>
                </div>
              </CardShell>

              <CardShell>
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">가장 많이 호출된 에이전트</div>
                  <div className="text-xs text-slate-500">Calls</div>
                </div>
                <div className="p-5 space-y-2">
                  {summary.mostCalled.length === 0 ? (
                    <div className="text-sm text-slate-500">데이터가 없습니다.</div>
                  ) : (
                    summary.mostCalled.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="text-sm text-slate-900 font-medium truncate">{a.name}</div>
                        <div className="text-sm text-slate-700 tabular-nums">{a.count}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardShell>
            </div>

            <CardShell>
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">에이전트별 성과</div>
                <div className="text-xs text-slate-500">
                  에이전트를 클릭하면 상단 지표가 해당 에이전트 기준으로 갱신됩니다.
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedAgentId === "all" ? agents : agents.filter((x) => x.id === selectedAgentId)).map(
                  (a) => {
                    const agentSessions = sessions.filter(
                      (s) => (s.agent_id || "미지정") === a.id
                    );
                    const calls = agentSessions.length;
                    const resolved = agentSessions.filter((s) => resolvedSet.has(s.outcome || "")).length;
                    const successRate = calls ? Math.round((resolved / calls) * 100) : 0;
                    const followups = followupCountByAgent.get(a.id) || 0;

                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedAgentId(a.id)}
                        className={cn(
                          "text-left rounded-2xl border p-4 transition-colors",
                          selectedAgentId === a.id
                            ? "border-slate-300 bg-slate-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900 truncate">{a.name}</div>
                              {followups > 0 ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                                  <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
                                  후속 지원 요청 {followups}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-2">
                            <div className="text-[11px] text-slate-500">통화 수</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{calls}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-2">
                            <div className="text-[11px] text-slate-500">성공률</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{successRate}%</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-2">
                            <div className="text-[11px] text-slate-500">평균 통화 시간</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                              {calls
                                ? fmtDuration(
                                    Math.round(
                                      agentSessions.reduce((acc, s) => acc + (s.duration_sec || 0), 0) /
                                        calls
                                    )
                                  )
                                : "0:00"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </CardShell>
          </div>
        </div>
      </div>
    </div>
  );
}
