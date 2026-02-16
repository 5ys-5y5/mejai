"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import RagStorageBadge from "@/components/RagStorageBadge";
import { UnderlineTabs, type TabItem } from "@/components/design-system";
import { AgentEditor } from "@/components/agents/AgentEditor";
import { KbEditor } from "@/components/kb/KbEditor";
import { apiFetch } from "@/lib/apiClient";
import { formatKstDate, formatKstDateTime } from "@/lib/kst";
import { calcRagUsageBytes, DEFAULT_RAG_LIMIT_BYTES, getRagLimitBytes } from "@/lib/ragStorage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isAdminKbValue, isSampleKbRow } from "@/lib/kbType";

type TabKey = "agents" | "kb";

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
  category: string | null;
  is_active: boolean | null;
  is_admin?: boolean | string | null;
  is_sample?: boolean | null;
  created_at?: string | null;
  content?: string | null;
};

type KbMetric = {
  kb_id: string;
  call_count: number;
  call_duration_sec: number;
  satisfaction_avg: number;
  success_rate: number;
  escalation_rate: number;
  updated_at: string | null;
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

const tabs: Array<TabItem<TabKey>> = [
  { key: "agents", label: "Agents" },
  { key: "kb", label: "Knowledge Base" },
];

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

function compareAgentVersions(a: AgentItem, b: AgentItem) {
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
      const newer = compareAgentVersions(item, existing) < 0 ? item : existing;
      map.set(key, newer);
    }
  });
  return Array.from(map.values()).sort(compareAgentVersions);
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

function getActiveKbItems(items: KbItem[]) {
  const map = new Map<string, KbItem>();
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
    if (!existing.is_active && compareKbVersions(item, existing) < 0) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).filter((item) => item.is_active);
}

function formatDuration(seconds?: number | null) {
  const safe = Number(seconds || 0);
  if (!Number.isFinite(safe) || safe <= 0) return "0m";
  const minutes = Math.round(safe / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function formatRate(value?: number | null) {
  const safe = Number(value || 0);
  if (!Number.isFinite(safe) || safe <= 0) return "0%";
  return `${Math.round(safe * 100)}%`;
}

function formatSatisfaction(value?: number | null) {
  const safe = Number(value || 0);
  if (!Number.isFinite(safe) || safe <= 0) return "0.0";
  return safe.toFixed(1);
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
  const agentSettingsHref = `/app/agents/${encodeURIComponent(agent.id)}`;
  if (!agent.llm) {
    issues.push({
      key: "llm",
      title: "Missing LLM",
      detail: "No LLM configured for this agent.",
      action: "Choose an LLM in the agent settings.",
      linkHref: agentSettingsHref,
      linkLabel: "Open settings",
    });
  }
  if (!agent.kb_id) {
    issues.push({
      key: "kb",
      title: "Missing KB",
      detail: "No knowledge base connected to this agent.",
      action: "Select a KB in the agent settings.",
      linkHref: agentSettingsHref,
      linkLabel: "Open settings",
    });
  } else if (!kb) {
    issues.push({
      key: "kb",
      title: "KB not found",
      detail: "The linked KB no longer exists.",
      action: "Select a valid KB in settings.",
      linkHref: agentSettingsHref,
      linkLabel: "Open settings",
    });
  }
  if (mcpCount == 0) {
    issues.push({
      key: "mcp",
      title: "No MCP tools",
      detail: "No MCP tools are connected to this agent.",
      action: "Add MCP tools in settings.",
      linkHref: agentSettingsHref,
      linkLabel: "Open settings",
    });
  }
  if (!WS_URL) {
    issues.push({
      key: "ws",
      title: "Missing WebSocket URL",
      detail: "NEXT_PUBLIC_CALL_WS_URL is not configured.",
      action: "Set the WebSocket URL in settings.",
      linkHref: "/app/settings",
      linkLabel: "Open settings",
    });
  }
  return issues;
}

export default function AgentsKbPage({ initialTab }: { initialTab?: TabKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const derivedTab = searchParams.get("tab") == "kb" ? "kb" : "agents";
  const initial = initialTab || derivedTab;

  const [activeTab, setActiveTab] = useState<TabKey>(initial);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [kbLoading, setKbLoading] = useState(true);
  const [kbError, setKbError] = useState<string | null>(null);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(DEFAULT_RAG_LIMIT_BYTES);
  const [metricsById, setMetricsById] = useState<Record<string, KbMetric>>({});

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

  const [issueNotice, setIssueNotice] = useState<{
    agentName: string;
    issues: ConnectionIssue[];
  } | null>(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeLeaving, setNoticeLeaving] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    setActiveTab(initial);
  }, [initial]);

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
    async function loadAgents() {
      setAgentsLoading(true);
      setAgentsError(null);
      try {
        const res = await apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200");
        if (!mounted) return;
        setAgents(res.items || []);
      } catch {
        if (!mounted) return;
        setAgentsError("Failed to load agents.");
      } finally {
        if (mounted) setAgentsLoading(false);
      }
    }
    loadAgents();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadKb() {
      setKbLoading(true);
      setKbError(null);
      try {
        const [res, profile] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ plan?: string }>("/api/user-profile").catch(() => null),
        ]);
        if (!mounted) return;
        const rawItems = res.items || [];
        setKbItems(rawItems);
        setUsedBytes(calcRagUsageBytes(rawItems));
        if (profile?.plan) setLimitBytes(getRagLimitBytes(profile.plan));
      } catch {
        if (!mounted) return;
        setKbError("Failed to load knowledge bases.");
      } finally {
        if (mounted) setKbLoading(false);
      }
    }
    loadKb();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const activeItems = getActiveKbItems(kbItems);
    if (activeItems.length == 0) {
      setMetricsById({});
      return;
    }
    const ids = activeItems.map((item) => item.id).join(",");
    apiFetch<{ items: KbMetric[] }>(`/api/kb/metrics?ids=${encodeURIComponent(ids)}`)
      .then((metricRes) => {
        const next: Record<string, KbMetric> = {};
        (metricRes.items || []).forEach((row) => {
          next[row.kb_id] = row;
        });
        setMetricsById(next);
      })
      .catch(() => {
        setMetricsById({});
      });
  }, [kbItems]);

  const activeAgents = useMemo(() => getActiveAgents(agents), [agents]);
  const activeKbItems = useMemo(() => getActiveKbItems(kbItems), [kbItems]);

  const kbById = useMemo(() => {
    const map = new Map<string, KbItem>();
    kbItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [kbItems]);

  const activeKbByParent = useMemo(() => getActiveKbByParent(kbItems), [kbItems]);

  useEffect(() => {
    if (!selectedAgentId && activeAgents.length > 0) {
      setSelectedAgentId(activeAgents[0].id);
    }
  }, [activeAgents, selectedAgentId]);

  useEffect(() => {
    if (!selectedKbId && activeKbItems.length > 0) {
      const first = activeKbItems[0];
      setSelectedKbId(first.id);
    }
  }, [activeKbItems, selectedKbId]);

  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    setTimeout(() => {
      document.getElementById("agent-editor-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSelectKb = (id: string) => {
    setSelectedKbId(id);
    setTimeout(() => {
      document.getElementById("kb-editor-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleDeleteKb = async (id: string) => {
    if (!window.confirm("Delete this knowledge base version? This cannot be undone.")) {
      return;
    }
    try {
      await apiFetch(`/api/kb/${id}`, { method: "DELETE" });
      const next = kbItems.filter((item) => item.id != id);
      setKbItems(next);
      setUsedBytes(calcRagUsageBytes(next));
      toast.success("KB deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete KB.";
      toast.error(message || "Failed to delete KB.");
    }
  };

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
                    <div className="text-sm font-semibold text-slate-900">Connection issue</div>
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
                    Close
                  </button>
                </div>
                <div className="mt-3 space-y-3 text-xs text-slate-700">
                  {issueNotice.issues.map((issue) => (
                    <div key={issue.key}>
                      <div className="font-semibold">{issue.title}</div>
                      <div>Details: {issue.detail}</div>
                      <div>Action: {issue.action}</div>
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Agents & Knowledge Base</h1>
        </div>

        <div className="mt-4">
          <UnderlineTabs tabs={tabs} activeKey={activeTab} onSelect={selectTab} />
        </div>

        {activeTab == "agents" ? (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <Link
                  href="/app/agents/new"
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Plus className="mr-2 inline h-4 w-4" />
                  New Agent
                </Link>
                <Link
                  href="/app/laboratory"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Bot className="mr-2 inline h-4 w-4" />
                  Laboratory
                </Link>
              </div>
              <div className="text-xs text-slate-500">
                Total: {agentsLoading ? "-" : activeAgents.length}
              </div>
            </div>

            <Card className="mt-4">
              <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">
                Agents
              </div>
              {agentsError ? <div className="p-4 text-sm text-rose-600">{agentsError}</div> : null}
              {!agentsError && !agentsLoading && activeAgents.length == 0 ? (
                <div className="p-4 text-sm text-slate-500">No agents found.</div>
              ) : null}
              <div className="divide-y divide-slate-200">
                {activeAgents.map((agent) => {
                  const kb = agent.kb_id ? kbById.get(agent.kb_id) ?? null : null;
                  const kbParentId = kb ? kb.parent_id ?? kb.id : null;
                  const latestKb = kbParentId ? activeKbByParent.get(kbParentId) ?? null : null;
                  const kbUpdateAvailable = Boolean(kb && latestKb && latestKb.id != kb.id);
                  const mcpCount = Array.isArray(agent.mcp_tool_ids) ? agent.mcp_tool_ids.length : 0;
                  const issues = getAgentIssues({ agent, kb, mcpCount });
                  const isSelected = agent.id == selectedAgentId;
                  return (
                    <div
                      key={agent.id}
                      role="button"
                      onClick={() => handleSelectAgent(agent.id)}
                      className={cn(
                        "p-4 transition-colors cursor-pointer",
                        isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{agent.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            LLM {agent.llm || "-"} ? KB {kb?.title || "-"} ? MCP {mcpCount}
                          </div>
                          {kbUpdateAvailable ? (
                            <div className="mt-1 text-xs text-amber-700">
                              KB update available ({kb?.version || "-"} ? {latestKb?.version || "-"})
                            </div>
                          ) : null}
                          <div className="mt-1 text-xs text-slate-400">
                            Version {agent.version || "-"} ? {formatKstDateTime(agent.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {issues.length > 0 ? (
                            <button
                              type="button"
                              aria-label="Show connection issues"
                              onClick={(event) => {
                                event.stopPropagation();
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
                            href={`/app/laboratory?agentId=${encodeURIComponent(agent.id)}`}
                            aria-label="Open laboratory"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            <Bot className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSelectAgent(agent.id);
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <AgentEditor agentId={selectedAgentId} onSelectAgent={setSelectedAgentId} />
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">Total: {kbLoading ? "-" : activeKbItems.length}</div>
              <div className="flex items-center gap-2">
                <RagStorageBadge usedBytes={usedBytes} limitBytes={limitBytes} />
                <Link
                  href="/app/kb/new"
                  className="inline-flex h-8 items-center rounded-xl bg-emerald-600 px-3 text-xs font-semibold leading-none text-white hover:bg-emerald-700"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Plus className="mr-2 inline h-4 w-4" />
                  New KB
                </Link>
              </div>
            </div>

            <Card className="mt-4">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">Knowledge Base</div>
                <div className="text-xs text-slate-500">
                  Total: {kbLoading ? "-" : activeKbItems.length}
                </div>
              </div>
              {kbError ? <div className="p-4 text-sm text-rose-600">{kbError}</div> : null}
              {!kbError && !kbLoading && activeKbItems.length == 0 ? (
                <div className="p-4 text-sm text-slate-500">No knowledge bases found.</div>
              ) : null}
              <ul className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_max-content_max-content] gap-x-[10px] divide-y divide-slate-200">
                <li className="contents">
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Title
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Status
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Version
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Calls
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Duration
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Satisfaction
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Success
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Escalation
                  </span>
                  <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    Created
                  </span>
                  <span className="flex min-h-[44px] items-center px-0 py-3 text-left text-xs font-semibold text-slate-500" />
                  <span className="flex min-h-[44px] items-center px-0 py-3 pr-4 text-left text-xs font-semibold text-slate-500" />
                </li>
                <li className="col-span-full border-b border-slate-200" />
                {activeKbItems.map((d) => {
                  const safeId = d.id;
                  const metric = metricsById[d.id];
                  const selectId = d.id;
                  const isSelected = selectId == selectedKbId;
                  return (
                    <li
                      key={d.id}
                      role="button"
                      onClick={() => handleSelectKb(selectId)}
                      className={cn("contents cursor-pointer", isSelected ? "bg-slate-50" : "hover:bg-slate-50")}
                    >
                      <div className="flex min-h-[44px] items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-900">
                        <span>{d.title}</span>
                        {isAdminKbValue(d.is_admin) ? <Badge variant="slate">ADMIN</Badge> : null}
                        {isSampleKbRow(d) ? <Badge variant="green">SAMPLE</Badge> : null}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                        {d.is_active ? "Active" : "Inactive"}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                        {d.version || "-"}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                        {metric?.call_count ?? 0}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                        {formatDuration(metric?.call_duration_sec)}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                        {formatSatisfaction(metric?.satisfaction_avg)}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                        {formatRate(metric?.success_rate)}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                        {formatRate(metric?.escalation_rate)}
                      </div>
                      <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-500">
                        {formatKstDate(d.created_at)}
                      </div>
                      <div className="flex min-h-[44px] items-center px-0 py-3 text-left text-sm">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSelectKb(selectId);
                          }}
                          aria-label="Edit"
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex min-h-[44px] items-center px-0 py-3 pr-4 text-left text-sm">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteKb(safeId);
                          }}
                          aria-label="Delete"
                          className="inline-flex items-center rounded-lg border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <KbEditor kbId={selectedKbId} onSelectKb={setSelectedKbId} />
          </div>
        )}
      </div>
    </div>
  );
}
