"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  authToken: string;
};

type ProposalStatus = "proposed" | "approved" | "rejected" | "on_hold" | "applied" | "failed";
type ProposalAction = "apply" | "reject" | "hold" | "repropose";

type ProposalItem = {
  proposal_id: string;
  org_id: string | null;
  session_id: string | null;
  turn_id: string | null;
  created_at: string | null;
  violation_id: string | null;
  principle_key: string | null;
  runtime_scope: string | null;
  title: string;
  why_failed: string;
  how_to_improve: string;
  rationale: string | null;
  target_files: string[];
  change_plan: string[];
  status: ProposalStatus;
  status_label: string;
  latest_event_type: string;
  suggested_diff: string | null;
  event_history: Array<{ event_type: string; created_at: string | null; payload: Record<string, unknown> }>;
  violation: {
    summary: string | null;
    severity: string | null;
    evidence: Record<string, unknown> | null;
  } | null;
  conversation: Array<{
    id: string;
    seq: number | null;
    created_at: string | null;
    user: string | null;
    bot: string | null;
  }>;
};

type ProposalListResponse = {
  ok: boolean;
  proposals: ProposalItem[];
  error?: string;
};

const STATUS_FILTERS: Array<{ value: "all" | ProposalStatus; label: string }> = [
  { value: "all", label: "전체" },
  { value: "proposed", label: "제안" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "거절" },
  { value: "on_hold", label: "보류" },
  { value: "applied", label: "적용" },
  { value: "failed", label: "실패" },
];

function formatTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR");
}

async function parseJsonBody<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function badgeClass(status: ProposalStatus) {
  if (status === "applied") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-rose-100 text-rose-700 border-rose-200";
  if (status === "rejected") return "bg-zinc-200 text-zinc-700 border-zinc-300";
  if (status === "on_hold") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "approved") return "bg-sky-100 text-sky-700 border-sky-200";
  return "bg-violet-100 text-violet-700 border-violet-200";
}

function cardClass(status: ProposalStatus) {
  if (status === "applied") return "border-emerald-200 bg-emerald-50";
  if (status === "failed") return "border-rose-200 bg-rose-50";
  if (status === "rejected") return "border-zinc-300 bg-zinc-100";
  if (status === "on_hold") return "border-amber-200 bg-amber-50";
  if (status === "approved") return "border-sky-200 bg-sky-50";
  return "border-violet-200 bg-violet-50";
}

function actionButtonClass(action: ProposalAction) {
  if (action === "apply") return "bg-emerald-600 text-white hover:bg-emerald-700";
  if (action === "reject") return "bg-rose-600 text-white hover:bg-rose-700";
  if (action === "hold") return "bg-amber-500 text-white hover:bg-amber-600";
  return "bg-indigo-600 text-white hover:bg-indigo-700";
}

function actionLabel(action: ProposalAction) {
  if (action === "apply") return "적용";
  if (action === "reject") return "거절";
  if (action === "hold") return "보류";
  return "제안";
}

function allowedActions(status: ProposalStatus): ProposalAction[] {
  if (status === "proposed") return ["reject", "apply", "hold"];
  if (status === "rejected") return ["apply", "hold", "repropose"];
  if (status === "approved") return ["apply", "hold", "reject"];
  if (status === "on_hold") return ["apply", "reject", "repropose"];
  if (status === "failed") return ["apply", "hold", "repropose"];
  return [];
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-copy h-[10px] w-[10px] shrink-0"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

const COPY_BUTTON_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-left text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

export function ProposalSettingsPanel({ authToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [busyBulk, setBusyBulk] = useState(false);
  const [statusNote, setStatusNote] = useState<string>("");

  const [statusFilter, setStatusFilter] = useState<"all" | ProposalStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<ProposalAction>("apply");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) next.Authorization = `Bearer ${authToken}`;
    return next;
  }, [authToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/runtime/governance/proposals?limit=200", {
        headers,
        cache: "no-store",
      });
      const body = await parseJsonBody<ProposalListResponse>(res);
      if (!res.ok || !body?.ok) {
        setError(body?.error || "proposal 목록 조회에 실패했습니다.");
        setProposals([]);
        return;
      }
      setProposals(body.proposals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "proposal 목록 조회에 실패했습니다.");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (proposalId: string, action: ProposalAction) => {
      if (action === "apply") {
        const res = await fetch("/api/runtime/governance/proposals/approve", {
          method: "POST",
          headers,
          body: JSON.stringify({
            proposal_id: proposalId,
            approve: true,
            apply: true,
            reviewer_note: "executed_from_settings_proposal_tab",
          }),
        });
        const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !body?.ok) throw new Error(body?.error || "제안 적용에 실패했습니다.");
        return;
      }
      if (action === "reject") {
        const res = await fetch("/api/runtime/governance/proposals/approve", {
          method: "POST",
          headers,
          body: JSON.stringify({
            proposal_id: proposalId,
            approve: false,
            reviewer_note: "rejected_from_settings_proposal_tab",
          }),
        });
        const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !body?.ok) throw new Error(body?.error || "제안 거절에 실패했습니다.");
        return;
      }
      if (action === "hold") {
        const res = await fetch("/api/runtime/governance/proposals/hold", {
          method: "POST",
          headers,
          body: JSON.stringify({ proposal_id: proposalId, reason: "on_hold_from_settings_proposal_tab" }),
        });
        const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
        if (!res.ok || !body?.ok) throw new Error(body?.error || "제안 보류에 실패했습니다.");
        return;
      }
      const res = await fetch("/api/runtime/governance/proposals/reopen", {
        method: "POST",
        headers,
        body: JSON.stringify({ proposal_id: proposalId, reason: "reopen_from_settings_proposal_tab" }),
      });
      const body = await parseJsonBody<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !body?.ok) throw new Error(body?.error || "제안 상태 변경에 실패했습니다.");
    },
    [headers]
  );

  const handleSingleAction = useCallback(
    async (proposalId: string, action: ProposalAction) => {
      setBusyProposalId(proposalId);
      setStatusNote("");
      setError(null);
      try {
        await runAction(proposalId, action);
        setStatusNote(`${actionLabel(action)} 처리: ${proposalId}`);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
      } finally {
        setBusyProposalId(null);
      }
    },
    [load, runAction]
  );

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return proposals.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        item.proposal_id,
        item.session_id || "",
        item.turn_id || "",
        item.title,
        item.why_failed,
        item.how_to_improve,
        item.violation?.summary || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [keyword, proposals, statusFilter]);

  useEffect(() => {
    const allowed = new Set(filtered.map((item) => item.proposal_id));
    setSelectedIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [filtered]);

  const selectableFiltered = useMemo(() => filtered.filter((item) => allowedActions(item.status).length > 0), [filtered]);

  const toggleSelected = useCallback((proposalId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(proposalId)) return prev;
        return [...prev, proposalId];
      }
      return prev.filter((id) => id !== proposalId);
    });
  }, []);

  const toggleAllFiltered = useCallback((checked: boolean) => {
    setSelectedIds((prev) => {
      const targetIds = selectableFiltered.map((item) => item.proposal_id);
      if (checked) {
        return Array.from(new Set([...prev, ...targetIds]));
      }
      const target = new Set(targetIds);
      return prev.filter((id) => !target.has(id));
    });
  }, [selectableFiltered]);

  const runBulkChange = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setBusyBulk(true);
    setStatusNote("");
    setError(null);
    try {
      const selectedMap = new Map(proposals.map((item) => [item.proposal_id, item]));
      const notAllowed = selectedIds.filter((id) => {
        const item = selectedMap.get(id);
        if (!item) return true;
        return !allowedActions(item.status).includes(bulkAction);
      });
      if (notAllowed.length > 0) {
        throw new Error(
          `선택 항목 중 ${notAllowed.length}건은 '${actionLabel(bulkAction)}' 상태 변경이 불가능합니다.`
        );
      }
      for (const proposalId of selectedIds) {
        await runAction(proposalId, bulkAction);
      }
      setStatusNote(`선택 항목 일괄 ${actionLabel(bulkAction)} 완료: ${selectedIds.length}건`);
      setSelectedIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "일괄 상태 변경에 실패했습니다.");
    } finally {
      setBusyBulk(false);
    }
  }, [bulkAction, load, proposals, runAction, selectedIds]);

  const allFilteredChecked =
    selectableFiltered.length > 0 && selectableFiltered.every((item) => selectedIds.includes(item.proposal_id));

  const copyText = useCallback(async (key: string, value: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1200);
    } catch {
      setError("클립보드 복사에 실패했습니다.");
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Runtime Proposal 목록</div>
            <div className="mt-1 text-xs text-slate-500">
              proposal_id 기준으로 위반 대화와 상태를 관리합니다. (관리자 전용)
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            새로고침
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[180px_1fr_auto]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | ProposalStatus)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="proposal_id / session_id / 제목 / 내용 검색"
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700"
          />
          <div />
        </div>

        {statusNote ? <div className="mt-3 text-xs text-emerald-700">{statusNote}</div> : null}
        {error ? <div className="mt-3 text-xs text-rose-700">{error}</div> : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={allFilteredChecked}
              onChange={(e) => toggleAllFiltered(e.target.checked)}
              className="h-4 w-4"
            />
            필터 결과 전체 선택
          </label>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as ProposalAction)}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            <option value="apply">적용</option>
            <option value="reject">거절</option>
            <option value="hold">보류</option>
            <option value="repropose">제안</option>
          </select>
          <button
            type="button"
            onClick={() => void runBulkChange()}
            disabled={selectedIds.length === 0 || busyBulk}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${actionButtonClass(bulkAction)}`}
          >
            선택 항목 일괄 {actionLabel(bulkAction)}
          </button>
          <span className="text-xs text-slate-600">선택 {selectedIds.length}건 / 결과 {filtered.length}건</span>
        </div>
      </div>

      {loading ? <div className="text-sm text-slate-500">불러오는 중...</div> : null}
      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">조건에 맞는 proposal이 없습니다.</div>
      ) : null}

      {filtered.map((proposal) => {
        const actions = allowedActions(proposal.status);
        const selectable = actions.length > 0;
        return (
          <div key={proposal.proposal_id} className={`rounded-xl border p-4 ${cardClass(proposal.status)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedIds.includes(proposal.proposal_id)}
                  disabled={!selectable || busyBulk}
                  onChange={(e) => toggleSelected(proposal.proposal_id, e.target.checked)}
                />
                <div className="text-sm font-semibold text-slate-900">{proposal.title}</div>
              </div>
              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(proposal.status)}`}>
                {proposal.status_label}
              </span>
            </div>

            <div className="mt-2 text-xs text-slate-600">
              proposal_id:{" "}
              <button
                type="button"
                onClick={() => void copyText(`proposal_id:${proposal.proposal_id}`, proposal.proposal_id)}
                className={`${COPY_BUTTON_CLASS} group font-mono`}
                title="클릭하여 복사"
                aria-label="proposal ID 복사"
              >
                <span>{proposal.proposal_id}</span>
                <span className="text-slate-400 group-hover:text-slate-700">
                  <CopyIcon />
                </span>
                {copiedKey === `proposal_id:${proposal.proposal_id}` ? (
                  <span className="text-[10px] text-emerald-700">복사됨</span>
                ) : null}
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-600">
              org_id:{" "}
              {proposal.org_id ? (
                <button
                  type="button"
                  onClick={() => void copyText(`org_id:${proposal.proposal_id}`, proposal.org_id)}
                  className={`${COPY_BUTTON_CLASS} group font-mono`}
                  title="클릭하여 복사"
                  aria-label="org ID 복사"
                >
                  <span>{proposal.org_id}</span>
                  <span className="text-slate-400 group-hover:text-slate-700">
                    <CopyIcon />
                  </span>
                  {copiedKey === `org_id:${proposal.proposal_id}` ? (
                    <span className="text-[10px] text-emerald-700">복사됨</span>
                  ) : null}
                </button>
              ) : (
                <span className="font-mono">-</span>
              )}{" "}
              / session_id:{" "}
              {proposal.session_id ? (
                <button
                  type="button"
                  onClick={() => void copyText(`session_id:${proposal.proposal_id}`, proposal.session_id)}
                  className={`${COPY_BUTTON_CLASS} group font-mono`}
                  title="클릭하여 복사"
                  aria-label="세션 ID 복사"
                >
                  <span>{proposal.session_id}</span>
                  <span className="text-slate-400 group-hover:text-slate-700">
                    <CopyIcon />
                  </span>
                  {copiedKey === `session_id:${proposal.proposal_id}` ? (
                    <span className="text-[10px] text-emerald-700">복사됨</span>
                  ) : null}
                </button>
              ) : (
                <span className="font-mono">-</span>
              )}{" "}
              / turn_id:{" "}
              {proposal.turn_id ? (
                <button
                  type="button"
                  onClick={() => void copyText(`turn_id:${proposal.proposal_id}`, proposal.turn_id)}
                  className={`${COPY_BUTTON_CLASS} group font-mono`}
                  title="클릭하여 복사"
                  aria-label="턴 ID 복사"
                >
                  <span>{proposal.turn_id}</span>
                  <span className="text-slate-400 group-hover:text-slate-700">
                    <CopyIcon />
                  </span>
                  {copiedKey === `turn_id:${proposal.proposal_id}` ? (
                    <span className="text-[10px] text-emerald-700">복사됨</span>
                  ) : null}
                </button>
              ) : (
                <span className="font-mono">-</span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              생성시각: {formatTime(proposal.created_at)} / latest_event: <span className="font-mono">{proposal.latest_event_type}</span>
            </div>

            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">왜 실패했는지</div>
                <div className="mt-1 whitespace-pre-wrap text-slate-900">{proposal.why_failed || "-"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">어떻게 개선할지</div>
                <div className="mt-1 whitespace-pre-wrap text-slate-900">{proposal.how_to_improve || "-"}</div>
              </div>
            </div>

            <details className="mt-3 rounded-lg border border-slate-200">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-slate-700">대화 내용 / 제안 상세 / 이벤트 이력 보기</summary>
              <div className="border-t border-slate-200 p-3">
                <div className="text-xs text-slate-700">
                  principle_key: <span className="font-mono">{proposal.principle_key || "-"}</span> / runtime_scope:{" "}
                  <span className="font-mono">{proposal.runtime_scope || "-"}</span> / violation_id:{" "}
                  {proposal.violation_id ? (
                    <button
                      type="button"
                      onClick={() => void copyText(`violation_id:${proposal.proposal_id}`, proposal.violation_id)}
                      className={`${COPY_BUTTON_CLASS} group font-mono`}
                      title="클릭하여 복사"
                      aria-label="violation ID 복사"
                    >
                      <span>{proposal.violation_id}</span>
                      <span className="text-slate-400 group-hover:text-slate-700">
                        <CopyIcon />
                      </span>
                      {copiedKey === `violation_id:${proposal.proposal_id}` ? (
                        <span className="text-[10px] text-emerald-700">복사됨</span>
                      ) : null}
                    </button>
                  ) : (
                    <span className="font-mono">-</span>
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-700">target_files: {proposal.target_files.length > 0 ? proposal.target_files.join(", ") : "-"}</div>
                <div className="mt-1 text-xs text-slate-700">change_plan: {proposal.change_plan.length > 0 ? proposal.change_plan.join(" | ") : "-"}</div>
                <div className="mt-1 text-xs text-slate-700">rationale: {proposal.rationale || "-"}</div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Violation</div>
                  <div className="mt-1 text-xs text-slate-700">summary: {proposal.violation?.summary || "-"}</div>
                  <div className="mt-1 text-xs text-slate-700">severity: {proposal.violation?.severity || "-"}</div>
                  <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px] text-slate-700">{JSON.stringify(proposal.violation?.evidence || {}, null, 2)}</pre>
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Conversation (session snippet)</div>
                  {proposal.conversation.length === 0 ? (
                    <div className="mt-1 text-xs text-slate-500">-</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {proposal.conversation.map((turn) => (
                        <div key={turn.id} className="rounded border border-slate-200 bg-white p-2">
                          <div className="text-[11px] text-slate-500">
                            turn_id:{" "}
                            <button
                              type="button"
                              onClick={() => void copyText(`conversation_turn_id:${proposal.proposal_id}:${turn.id}`, turn.id)}
                              className={`${COPY_BUTTON_CLASS} group font-mono`}
                              title="클릭하여 복사"
                              aria-label="대화 턴 ID 복사"
                            >
                              <span>{turn.id}</span>
                              <span className="text-slate-400 group-hover:text-slate-700">
                                <CopyIcon />
                              </span>
                              {copiedKey === `conversation_turn_id:${proposal.proposal_id}:${turn.id}` ? (
                                <span className="text-[10px] text-emerald-700">복사됨</span>
                              ) : null}
                            </button>{" "}
                            / seq: {turn.seq ?? "-"} / {formatTime(turn.created_at)}
                          </div>
                          <div className="mt-1 text-xs text-slate-700">USER: {turn.user || "-"}</div>
                          <div className="mt-1 text-xs text-slate-700">BOT: {turn.bot || "-"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700">Event History</div>
                  <div className="mt-2 space-y-1">
                    {proposal.event_history.map((event, idx) => (
                      <div key={`${proposal.proposal_id}_${idx}`} className="text-[11px] text-slate-700">
                        {formatTime(event.created_at)} / <span className="font-mono">{event.event_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {actions.length === 0 ? <span className="text-xs text-slate-400">변경 가능한 상태 액션이 없습니다.</span> : null}
              {actions.map((action) => (
                <button
                  key={`${proposal.proposal_id}_${action}`}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${actionButtonClass(action)}`}
                  onClick={() => void handleSingleAction(proposal.proposal_id, action)}
                  disabled={busyProposalId === proposal.proposal_id || busyBulk}
                >
                  {actionLabel(action)}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
