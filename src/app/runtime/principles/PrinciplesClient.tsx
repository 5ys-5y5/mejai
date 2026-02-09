"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

type GovernanceConfig = {
  enabled: boolean;
  visibility_mode: "user" | "admin";
  source: "principles_default" | "event_override";
  updated_at: string | null;
  updated_by: string | null;
};

type Proposal = {
  proposal_id: string;
  session_id: string | null;
  turn_id: string | null;
  created_at: string | null;
  title: string;
  why_failed: string;
  how_to_improve: string;
  status: "pending" | "completed" | "failed" | "on_hold" | "proposed" | "approved" | "rejected" | "applied";
  status_label?: string;
  latest_event_type: string;
};

function formatTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `HTTP_${response.status}`);
  }
  return (await response.json()) as T;
}

export function PrinciplesClient() {
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const redirectBack = () => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      router.replace("/");
    };
    const run = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        redirectBack();
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        redirectBack();
        return;
      }
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        redirectBack();
        return;
      }
      const { data: access } = await supabase
        .from("A_iam_user_access_maps")
        .select("is_admin")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!mounted) return;
      setIsAdminUser(Boolean(access?.is_admin));
      setReady(true);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await requestJson<{ ok: boolean; config: GovernanceConfig }>("/api/runtime/governance/config");
      const list = await requestJson<{ ok: boolean; hidden?: boolean; proposals: Proposal[] }>("/api/runtime/governance/proposals?limit=50");
      setConfig(cfg.config);
      setProposals(list.proposals || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const toggleEnabled = async (enabled: boolean) => {
    if (!isAdminUser) {
      setError("관리자만 변경할 수 있습니다.");
      return;
    }
    try {
      setStatusNote(null);
      const result = await requestJson<{ ok: boolean; config: GovernanceConfig }>("/api/runtime/governance/config", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
      setConfig(result.config);
      setStatusNote(enabled ? "Self update 활성화" : "Self update 비활성화");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleVisibilityMode = async (visibilityMode: "user" | "admin") => {
    if (!isAdminUser) {
      setError("관리자만 변경할 수 있습니다.");
      return;
    }
    try {
      setStatusNote(null);
      const result = await requestJson<{ ok: boolean; config: GovernanceConfig }>("/api/runtime/governance/config", {
        method: "POST",
        body: JSON.stringify({
          enabled: Boolean(config?.enabled),
          visibility_mode: visibilityMode,
        }),
      });
      setConfig(result.config);
      setStatusNote(visibilityMode === "admin" ? "admin 전용 모드" : "user 공개 모드");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runReview = async () => {
    if (!isAdminUser) {
      setError("관리자만 실행할 수 있습니다.");
      return;
    }
    try {
      setStatusNote(null);
      await requestJson("/api/runtime/governance/review", {
        method: "POST",
        body: JSON.stringify({ limit: 120 }),
      });
      setStatusNote("문제 감지/제안 생성 완료");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const executeProposal = async (proposalId: string) => {
    if (!isAdminUser) {
      setError("관리자만 실행할 수 있습니다.");
      return;
    }
    setBusyProposalId(proposalId);
    setStatusNote(null);
    try {
      await requestJson("/api/runtime/governance/proposals/approve", {
        method: "POST",
        body: JSON.stringify({
          proposal_id: proposalId,
          approve: true,
          apply: true,
          reviewer_note: "executed_from_principles_page",
        }),
      });
      setStatusNote(`실행 완료: ${proposalId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyProposalId(null);
    }
  };

  const holdProposal = async (proposalId: string) => {
    if (!isAdminUser) {
      setError("관리자만 보류할 수 있습니다.");
      return;
    }
    setBusyProposalId(proposalId);
    setStatusNote(null);
    try {
      await requestJson("/api/runtime/governance/proposals/hold", {
        method: "POST",
        body: JSON.stringify({
          proposal_id: proposalId,
          reason: "on_hold_from_principles_page",
        }),
      });
      setStatusNote(`보류 처리: ${proposalId}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyProposalId(null);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Runtime Principles</h1>
        <p className="mt-2 text-sm text-zinc-600">
          기준 파일: <code>src/app/api/runtime/chat/policies/principles.ts</code>
        </p>
        <p className="mt-1 text-xs text-zinc-500">현재 권한: {isAdminUser ? "admin" : "user"}</p>

        <div className="mt-6 rounded-xl border border-zinc-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Self Update</div>
              <div className="text-xs text-zinc-500">
                원칙 위반 감지 시 제안 생성/승인/실행
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void toggleEnabled(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  config?.enabled ? "bg-black text-white" : "border border-zinc-300"
                }`}
                disabled={!isAdminUser}
              >
                ON
              </button>
              <button
                type="button"
                onClick={() => void toggleEnabled(false)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  config && !config.enabled ? "bg-black text-white" : "border border-zinc-300"
                }`}
                disabled={!isAdminUser}
              >
                OFF
              </button>
              <button
                type="button"
                onClick={() => void toggleVisibilityMode("user")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  config?.visibility_mode === "user" ? "bg-black text-white" : "border border-zinc-300"
                }`}
                disabled={!isAdminUser}
              >
                USER
              </button>
              <button
                type="button"
                onClick={() => void toggleVisibilityMode("admin")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  config?.visibility_mode === "admin" ? "bg-black text-white" : "border border-zinc-300"
                }`}
                disabled={!isAdminUser}
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => void runReview()}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold"
                disabled={!config?.enabled || !isAdminUser}
              >
                문제 감지 실행
              </button>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold"
              >
                새로고침
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            상태: {config?.enabled ? "활성" : "비활성"} / visible: {config?.visibility_mode || "-"} / source: {config?.source || "-"} / updated: {formatTime(config?.updated_at || null)}
          </div>
        </div>

        {statusNote ? <div className="mt-4 text-sm text-emerald-700">{statusNote}</div> : null}
        {error ? <div className="mt-4 text-sm text-rose-700">{error}</div> : null}
        {loading ? <div className="mt-4 text-sm text-zinc-500">불러오는 중...</div> : null}

        <div className="mt-6 space-y-3">
          {proposals.length === 0 && !loading ? (
            <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-500">self update 항목이 없습니다.</div>
          ) : null}
          {proposals.map((proposal) => (
            <div key={proposal.proposal_id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">{proposal.title}</div>
                <div className="text-xs">
                  상태: <span className="font-semibold">{proposal.status_label || proposal.status}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                proposal_id: {proposal.proposal_id} / created: {formatTime(proposal.created_at)}
              </div>
              <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm">
                <div className="font-semibold">왜 실패했는지</div>
                <div className="mt-1 whitespace-pre-wrap">{proposal.why_failed || "-"}</div>
              </div>
              <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-sm">
                <div className="font-semibold">어떻게 개선할 것인지</div>
                <div className="mt-1 whitespace-pre-wrap">{proposal.how_to_improve || "-"}</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={busyProposalId === proposal.proposal_id || proposal.status === "completed" || proposal.status === "applied"}
                  onClick={() => void executeProposal(proposal.proposal_id)}
                >
                  실행
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
                  disabled={busyProposalId === proposal.proposal_id || proposal.status === "completed" || proposal.status === "applied"}
                  onClick={() => void holdProposal(proposal.proposal_id)}
                >
                  보류
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
