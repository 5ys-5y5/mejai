"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { AlertTriangle, Bot, Plus } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { formatKstDateTime } from "@/lib/kst";
import { cn } from "@/lib/utils";

type AgentItem = {
  id: string;
  parent_id?: string | null;
  name: string;
  llm: string | null;
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
  version: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type KbItem = {
  id: string;
  parent_id?: string | null;
  title: string;
  version: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type ConnectionIssue = {
  key: "llm" | "kb" | "mcp" | "ws";
  title: string;
  detail: string;
  action: string;
  linkHref: string;
  linkLabel: string;
};

const WS_URL = process.env.NEXT_PUBLIC_CALL_WS_URL || "";

function parseVersionParts(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  const match = raw.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (!match) return null;
  const major = Number(match[1] || 0);
  const minor = Number(match[2] || 0);
  const patch = Number(match[3] || 0);
  return [major, minor, patch];
}

function compareVersions(a: AgentItem, b: AgentItem) {
  const aParts = parseVersionParts(a.version);
  const bParts = parseVersionParts(b.version);
  if (aParts && bParts) {
    for (let i = 0; i < 3; i += 1) {
      if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
    }
  } else if (aParts && !bParts) {
    return -1;
  } else if (!aParts && bParts) {
    return 1;
  }
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}

function compareKbVersions(a: KbItem, b: KbItem) {
  const aParts = parseVersionParts(a.version);
  const bParts = parseVersionParts(b.version);
  if (aParts && bParts) {
    for (let i = 0; i < 3; i += 1) {
      if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
    }
  } else if (aParts && !bParts) {
    return -1;
  } else if (!aParts && bParts) {
    return 1;
  }
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}

function getActiveAgents(items: AgentItem[]) {
  const map = new Map<string, AgentItem>();
  items.forEach((item) => {
    const key = item.parent_id ?? item.id;
    if (item.is_active) {
      map.set(key, item);
      return;
    }
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }
    if (!existing.is_active) {
      const newer = compareVersions(item, existing) < 0 ? item : existing;
      map.set(key, newer);
    }
  });
  return Array.from(map.values()).sort(compareVersions);
}

function getActiveKbByParent(items: KbItem[]) {
  const map = new Map<string, KbItem>();
  items.forEach((item) => {
    const key = item.parent_id ?? item.id;
    const existing = map.get(key);
    if (item.is_active) {
      map.set(key, item);
      return;
    }
    if (!existing) {
      map.set(key, item);
      return;
    }
    if (!existing.is_active) {
      const newer = compareKbVersions(item, existing) < 0 ? item : existing;
      map.set(key, newer);
    }
  });
  return map;
}

function getAgentIssues({
  agent,
  kb,
  mcpCount,
}: {
  agent: AgentItem;
  kb: KbItem | null;
  mcpCount: number;
}) {
  const issues: ConnectionIssue[] = [];
  const agentSettingsHref = `/app/agents/${encodeURIComponent(agent.parent_id ?? agent.id)}`;
  if (!agent.llm) {
    issues.push({
      key: "llm",
      title: "LLM 미설정",
      detail: "LLM이 연결되어 있지 않습니다.",
      action: "에이전트 옵션에서 LLM을 선택하세요.",
      linkHref: agentSettingsHref,
      linkLabel: "에이전트 옵션 열기",
    });
  }
  if (!agent.kb_id) {
    issues.push({
      key: "kb",
      title: "KB 미연결",
      detail: "지식베이스가 연결되어 있지 않습니다.",
      action: "에이전트 옵션에서 KB를 선택하세요.",
      linkHref: agentSettingsHref,
      linkLabel: "에이전트 옵션 열기",
    });
  } else if (!kb) {
    issues.push({
      key: "kb",
      title: "KB 조회 실패",
      detail: "연결된 KB 정보를 찾을 수 없습니다.",
      action: "KB를 다시 선택하거나 KB 상태를 확인하세요.",
      linkHref: agentSettingsHref,
      linkLabel: "에이전트 옵션 열기",
    });
  }
  if (mcpCount === 0) {
    issues.push({
      key: "mcp",
      title: "MCP 미연결",
      detail: "연결된 MCP 도구가 없습니다.",
      action: "에이전트 옵션에서 MCP 도구를 추가하세요.",
      linkHref: agentSettingsHref,
      linkLabel: "에이전트 옵션 열기",
    });
  }
  if (!WS_URL) {
    issues.push({
      key: "ws",
      title: "WebSocket 미설정",
      detail: "실시간 서버 주소가 설정되지 않았습니다.",
      action: "NEXT_PUBLIC_CALL_WS_URL을 설정하고 서버를 재시작하세요.",
      linkHref: "/app/settings",
      linkLabel: "설정 페이지 열기",
    });
  }
  return issues;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issueNotice, setIssueNotice] = useState<{
    agentName: string;
    issues: ConnectionIssue[];
  } | null>(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeLeaving, setNoticeLeaving] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (issueNotice) {
      setNoticeLeaving(false);
      setNoticeVisible(false);
      const enter = setTimeout(() => setNoticeVisible(true), 10);
      return () => clearTimeout(enter);
    }
    setNoticeVisible(false);
    setNoticeLeaving(false);
    return () => {};
  }, [issueNotice]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [agentRes, kbRes] = await Promise.all([
          apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200"),
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
        ]);
        if (!mounted) return;
        setAgents(agentRes.items || []);
        setKbItems(kbRes.items || []);
      } catch (err) {
        if (!mounted) return;
        setError("에이전트 목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const activeAgents = useMemo(() => getActiveAgents(agents), [agents]);

  const kbById = useMemo(() => {
    const map = new Map<string, KbItem>();
    kbItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [kbItems]);

  const activeKbByParent = useMemo(() => getActiveKbByParent(kbItems), [kbItems]);

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        {issueNotice ? (
          <div className="fixed bottom-4 left-0 right-0 z-40 md:left-72">
            <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
              <div
                className={cn(
                  "w-full rounded-2xl border border-amber-400 bg-amber-200 p-4 shadow-lg transition-all duration-200 ease-out",
                  noticeVisible && !noticeLeaving ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">연결 점검 알림</div>
                    <div className="text-xs text-slate-600">{issueNotice.agentName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNoticeLeaving(true);
                      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                      closeTimerRef.current = setTimeout(() => {
                        setIssueNotice(null);
                      }, 200);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    닫기
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-xs text-slate-700">
                  {issueNotice.issues.map((issue) => (
                    <div key={issue.key}>
                      <div className="font-semibold">{issue.title}</div>
                      <div>문제: {issue.detail}</div>
                      <div>해결: {issue.action}</div>
                      <Link
                        href={issue.linkHref}
                        className="inline-flex items-center text-amber-700 underline underline-offset-2"
                        onClick={() => {
                          setNoticeLeaving(true);
                          if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                          closeTimerRef.current = setTimeout(() => {
                            setIssueNotice(null);
                          }, 200);
                        }}
                      >
                        {issue.linkLabel}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900">에이전트</h1>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Link
              href="/app/agents/playground"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              플레이그라운드
            </Link>
            <Link
              href="/app/agents/new"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              새 에이전트
            </Link>
          </div>
          <div className="text-xs text-slate-500">총 {loading ? "-" : activeAgents.length}건</div>
        </div>

        <Card className="mt-4">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">에이전트</div>
          {error ? <div className="p-4 text-sm text-rose-600">{error}</div> : null}
          {!error && !loading && activeAgents.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">등록된 에이전트가 없습니다.</div>
          ) : null}
          <div className="divide-y divide-slate-200">
            {activeAgents.map((agent) => {
              const kb = agent.kb_id ? kbById.get(agent.kb_id) ?? null : null;
              const kbParentId = kb ? kb.parent_id ?? kb.id : null;
              const latestKb = kbParentId ? activeKbByParent.get(kbParentId) ?? null : null;
              const kbUpdateAvailable = Boolean(kb && latestKb && latestKb.id !== kb.id);
              const mcpCount = Array.isArray(agent.mcp_tool_ids) ? agent.mcp_tool_ids.length : 0;
              const issues = getAgentIssues({ agent, kb, mcpCount });
              return (
                <div key={agent.id} className="p-4 hover:bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{agent.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        LLM {agent.llm || "-"} · KB {kb?.title || "-"} · MCP {mcpCount}개
                      </div>
                      {kbUpdateAvailable ? (
                        <div className="mt-1 text-xs text-amber-700">
                          KB 업데이트 있음 ({kb?.version || "-"} → {latestKb?.version || "-"})
                          <Link
                            href={`/app/agents/${encodeURIComponent(agent.parent_id ?? agent.id)}?issue=kb_update`}
                            className="ml-2 underline underline-offset-2"
                          >
                            업데이트
                          </Link>
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-slate-400">
                        버전 {agent.version || "-"} · {formatKstDateTime(agent.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {issues.length > 0 ? (
                        <button
                          type="button"
                          aria-label="연결 점검"
                          onClick={() => {
                            setIssueNotice({
                              agentName: agent.name,
                              issues,
                            });
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      ) : null}
                      <Link
                        href={`/app/agents/${encodeURIComponent(agent.id)}/playground`}
                        aria-label="대화 테스트"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        <Bot className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/app/agents/${encodeURIComponent(agent.parent_id ?? agent.id)}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        옵션
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
