"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgentSelectPopover } from "@/components/AgentSelectPopover";
import { DateRangePopover } from "@/components/DateRangePopover";
import { ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/apiClient";
import { usePerformanceConfig } from "@/hooks/usePerformanceConfig";
import { shouldRefreshOnAuthEvent } from "@/lib/performanceConfig";
import { useMultiTabLeaderLock } from "@/lib/multiTabSync";

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
  const { config } = usePerformanceConfig();
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
  const [cafe24IssueDetected, setCafe24IssueDetected] = useState(false);
  const [cafe24Issue, setCafe24Issue] = useState<string | null>(null);
  const [cafe24ReconnectBusy, setCafe24ReconnectBusy] = useState(false);
  const [cafe24ReconnectNotice, setCafe24ReconnectNotice] = useState<string>("");
  const [showCafe24CleanLoginGuide, setShowCafe24CleanLoginGuide] = useState(false);
  const [cafe24ProviderMallId, setCafe24ProviderMallId] = useState<string>("-");
  const cafe24ProviderRef = useRef<Record<string, unknown> | null>(null);
  const loadInFlightRef = useRef(false);
  const lastAuthRefreshRef = useRef(0);
  const { isLeader, tabId } = useMultiTabLeaderLock(
    "dashboard-polling",
    config.multi_tab_leader_enabled,
    config.multi_tab_leader_lock_ttl_ms
  );

  const loadData = useCallback(async (reason: "mount" | "poll" | "auth" | "manual" = "manual") => {
    if (reason === "poll" && typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
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
      loadInFlightRef.current = false;
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
      loadInFlightRef.current = false;
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
        loadInFlightRef.current = false;
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
      loadInFlightRef.current = false;
      return;
    }

    let sessionRows: SessionRow[] = [];
    let reviewRows: ReviewRow[] = [];
    try {
      const sessionRes = await apiFetch<{ items: SessionRow[] }>(`/api/sessions?limit=${config.dashboard_sessions_limit}`);
      sessionRows = sessionRes.items || [];

      const reviewRes = await apiFetch<{ items: ReviewRow[] }>(`/api/review-queue?limit=${config.dashboard_review_limit}`);
      reviewRows = reviewRes.items || [];
    } catch {
      setError("세션 데이터를 불러오지 못했습니다.");
      setLoading(false);
      loadInFlightRef.current = false;
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
    loadInFlightRef.current = false;
  }, [config.dashboard_review_limit, config.dashboard_sessions_limit]);

  useEffect(() => {
    if (!isLeader) return;
    loadData("mount");
  }, [isLeader, loadData]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      if (!config.dashboard_refresh_on_auth_change) return;
      if (!shouldRefreshOnAuthEvent(config.dashboard_auth_event_mode, event)) return;
      const now = Date.now();
      if (now - lastAuthRefreshRef.current < config.dashboard_auth_cooldown_ms) return;
      lastAuthRefreshRef.current = now;
      if (isLeader) {
        loadData("auth");
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [
    config.dashboard_auth_cooldown_ms,
    config.dashboard_auth_event_mode,
    config.dashboard_refresh_on_auth_change,
    isLeader,
    loadData,
  ]);

  useEffect(() => {
    if (!isLeader) return () => {};
    const timer = setInterval(() => {
      loadData("poll");
    }, config.dashboard_poll_ms);
    return () => {
      clearInterval(timer);
    };
  }, [config.dashboard_poll_ms, isLeader, loadData]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return () => {};
    const channel = new BroadcastChannel("mejai:dashboard-polling");
    channel.onmessage = (event: MessageEvent) => {
      const payload = (event.data || {}) as {
        sender?: string;
        type?: string;
        sessions?: SessionRow[];
        reviewQueue?: ReviewRow[];
        orgId?: string | null;
        orgPending?: boolean;
        isAdmin?: boolean;
        plan?: string;
      };
      if (payload.sender === tabId) return;
      if (payload.type === "sync") {
        const nextSessions = payload.sessions || [];
        setSessions(nextSessions);
        setReviewQueue(payload.reviewQueue || []);
        const agentMap = new Map<string, AgentOption>();
        nextSessions.forEach((s) => {
          const id = s.agent_id || "미지정";
          if (!agentMap.has(id)) {
            agentMap.set(id, { id, name: id });
          }
        });
        setAgents([...agentMap.values()]);
        setOrgId(payload.orgId || null);
        setOrgPending(Boolean(payload.orgPending));
        setIsAdmin(Boolean(payload.isAdmin));
        setPlan(payload.plan || "starter");
        setLoading(false);
      }
      if (payload.type === "request" && isLeader) {
        loadData("auth");
      }
    };
    if (!isLeader) {
      channel.postMessage({ type: "request", sender: tabId, ts: Date.now() });
    }
    return () => channel.close();
  }, [isLeader, loadData, tabId]);

  useEffect(() => {
    if (!isLeader) return;
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("mejai:dashboard-polling");
    channel.postMessage({
      type: "sync",
      sender: tabId,
      ts: Date.now(),
      sessions,
      reviewQueue,
      orgId,
      orgPending,
      isAdmin,
      plan,
    });
    channel.close();
  }, [isAdmin, isLeader, orgId, orgPending, plan, reviewQueue, sessions, tabId]);

  const handleSimulate = useCallback(async () => {
    setSimulating(true);
    setSimulateError(null);
    try {
      await apiFetch("/api/simulate-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escalated: true }),
      });
      await loadData("manual");
    } catch {
      setSimulateError("시뮬레이션 생성에 실패했습니다.");
    } finally {
      setSimulating(false);
    }
  }, [loadData]);

  const refreshCafe24ProviderState = useCallback(async () => {
    if (!isAdmin || !orgId) {
      setCafe24IssueDetected(false);
      setCafe24Issue(null);
      return;
    }
    try {
      const res = await apiFetch<{ provider?: Record<string, unknown> }>(`/api/auth-settings/providers?provider=cafe24`);
      const provider = (res.provider || {}) as Record<string, unknown>;
      cafe24ProviderRef.current = provider;
      const mallId = String(provider.mall_id || "").trim();
      setCafe24ProviderMallId(mallId || "-");
      const accessToken = String(provider.access_token || "").trim();
      const refreshToken = String(provider.refresh_token || "").trim();
      if (!mallId) {
        setCafe24IssueDetected(true);
        setCafe24Issue("Cafe24 mall_id is missing.");
        return;
      }
      if (!accessToken || !refreshToken) {
        setCafe24IssueDetected(true);
        setCafe24Issue("");
        return;
      }
      const lastError = String(provider.last_refresh_error || "").trim();
      if (lastError) {
        setCafe24IssueDetected(true);
        setCafe24Issue(lastError);
        return;
      }
      const expiresAt = String(provider.expires_at || "").trim();
      if (expiresAt) {
        const exp = Date.parse(expiresAt);
        if (!Number.isNaN(exp) && exp <= Date.now()) {
          setCafe24IssueDetected(true);
          setCafe24Issue("Cafe24 access token expired. Refresh is required.");
          return;
        }
      }
      setCafe24IssueDetected(false);
      setCafe24Issue(null);
    } catch {
      setCafe24IssueDetected(false);
      setCafe24Issue(null);
    }
  }, [isAdmin, orgId]);

  const startCafe24Reconnect = useCallback(async () => {
    setCafe24ReconnectNotice("");
    setCafe24ReconnectBusy(true);
    try {
      const providerRes = await apiFetch<{ provider?: Record<string, unknown> }>(`/api/auth-settings/providers?provider=cafe24`);
      const provider = (providerRes.provider || {}) as Record<string, unknown>;
      cafe24ProviderRef.current = provider;
      const mallId = String(provider.mall_id || "").trim();
      setCafe24ProviderMallId(mallId || "-");
      const scope = String(provider.scope || "").trim();
      if (!mallId) {
        setCafe24ReconnectNotice("Cafe24 mall_id가 없습니다. /app/install?tab=env에서 확인해 주세요.");
        setCafe24ReconnectBusy(false);
        return;
      }

      const authorizeUrl = new URL("/api/cafe24/authorize", window.location.origin);
      authorizeUrl.searchParams.set("mode", "json");
      authorizeUrl.searchParams.set("mall_id", mallId);
      if (scope) authorizeUrl.searchParams.set("scope", scope);

      const payload = await apiFetch<{ url?: string }>(authorizeUrl.toString());
      const target = String(payload.url || "").trim();
      if (!target) {
        setCafe24ReconnectNotice("Cafe24 OAuth URL 생성에 실패했습니다.");
        setCafe24ReconnectBusy(false);
        return;
      }

      const popup = window.open(target, "cafe24_oauth_dashboard", "width=520,height=720");
      if (!popup) {
        setCafe24ReconnectNotice("팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.");
        setCafe24ReconnectBusy(false);
      }
    } catch {
      setCafe24ReconnectNotice("Cafe24 재연동 시작에 실패했습니다.");
      setCafe24ReconnectBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshCafe24ProviderState();
  }, [refreshCafe24ProviderState]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      const allowedOrigins = new Set([window.location.origin, "https://mejai.help", "https://www.mejai.help"]);
      if (!allowedOrigins.has(event.origin)) return;
      const data = (event.data || {}) as {
        type?: string;
        error?: string;
        mall_id?: string;
        scope?: string;
        access_token?: string;
        refresh_token?: string;
        expires_at?: string;
      };

      if (data.type === "cafe24_oauth_error") {
        setCafe24ReconnectNotice(`Cafe24 OAuth 오류: ${data.error || "UNKNOWN_ERROR"}`);
        setCafe24ReconnectBusy(false);
        return;
      }

      if (data.type !== "cafe24_oauth_complete") return;
      try {
        const current = cafe24ProviderRef.current || {};
        const expectedMallId = String((current as Record<string, unknown>).mall_id || "").trim();
        const receivedMallId = String(data.mall_id || "").trim();
        if (expectedMallId && receivedMallId && expectedMallId !== receivedMallId) {
          setCafe24ReconnectNotice(
            `로그인 계정 mall_id 불일치: expected=${expectedMallId}, received=${receivedMallId}. 시크릿 창에서 다시 진행해 주세요.`
          );
          setCafe24ReconnectBusy(false);
          return;
        }
        const values = {
          ...(current as Record<string, unknown>),
          mall_id: String(data.mall_id || current.mall_id || "").trim(),
          scope: String(data.scope || current.scope || "").trim(),
          access_token: String(data.access_token || "").trim(),
          refresh_token: String(data.refresh_token || "").trim(),
          expires_at: String(data.expires_at || "").trim(),
        };
        await apiFetch("/api/auth-settings/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "cafe24", values, commit: true }),
        });

        const refreshNow = await apiFetch<{ refreshed?: boolean; error?: string }>("/api/cafe24/refresh-now", {
          method: "POST",
        });
        if (refreshNow.refreshed) {
          setCafe24ReconnectNotice("Cafe24 토큰 재연동 및 즉시 갱신이 완료되었습니다.");
          setCafe24Issue(null);
        } else {
          setCafe24ReconnectNotice(`Cafe24 즉시 갱신 실패: ${refreshNow.error || "UNKNOWN_ERROR"}`);
        }
      } catch {
        setCafe24ReconnectNotice("Cafe24 토큰 저장 또는 즉시 갱신 처리에 실패했습니다.");
      } finally {
        setCafe24ReconnectBusy(false);
        void refreshCafe24ProviderState();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refreshCafe24ProviderState]);

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => loadData("manual")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              aria-label="대시보드 새로 고침"
            >
              <RefreshCw className="h-4 w-4" />
              
            </button>
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

          {isAdmin && orgId && cafe24IssueDetected ? (
            <CardShell className="bg-rose-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Cafe24 토큰 갱신 이슈가 감지되었습니다.</div>
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-700">
                <li>
                  provider: <span className="font-semibold">cafe24</span>
                </li>
                <li>
                  mall_id: <span className="font-semibold">{cafe24ProviderMallId || "-"}</span>
                </li>
              </ul>
              {cafe24Issue ? <div className="mt-2 text-sm text-slate-700 break-all">{cafe24Issue}</div> : null}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={startCafe24Reconnect}
                  disabled={cafe24ReconnectBusy}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold",
                    cafe24ReconnectBusy
                      ? "border-slate-200 bg-slate-100 text-slate-400"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  )}
                >
                  {cafe24ReconnectBusy ? "토큰 갱신 진행 중..." : `토큰 갱신 (${cafe24ProviderMallId || "-"})`}
                </button>
              </div>
              {cafe24ReconnectNotice ? <div className="mt-2 text-xs text-slate-700">{cafe24ReconnectNotice}</div> : null}
            </CardShell>
          ) : null}

          {showCafe24CleanLoginGuide ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-semibold text-slate-900">Cafe24 클린 로그인 권장</div>
                <div className="mt-2 text-sm text-slate-700">
                  현재 브라우저에 다른 Cafe24 계정이 로그인되어 있으면 mall_id 불일치가 발생할 수 있습니다.
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  1. 시크릿 창(또는 새 브라우저 프로필)에서 이 페이지를 열어주세요.
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  2. 기대 mall_id 계정으로 Cafe24 로그인 후 갱신을 진행하세요.
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  3. OAuth 완료 후 토큰 저장과 즉시 refresh 검증이 자동 실행됩니다.
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCafe24CleanLoginGuide(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCafe24CleanLoginGuide(false);
                      void startCafe24Reconnect();
                    }}
                    disabled={cafe24ReconnectBusy}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold",
                      cafe24ReconnectBusy
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    )}
                  >
                    갱신 계속
                  </button>
                </div>
              </div>
            </div>
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
