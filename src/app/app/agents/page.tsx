"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AgentEditor } from "@/components/agents/AgentEditor";
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
  if (mcpCount === 0) {
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

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

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
      try {
        const res = await apiFetch<{ items: KbItem[] }>("/api/kb?limit=200");
        if (!mounted) return;
        setKbItems(res.items || []);
      } catch {
        if (!mounted) return;
        setKbItems([]);
      }
    }
    loadKb();
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

  useEffect(() => {
    if (!selectedAgentId && activeAgents.length > 0) {
      setSelectedAgentId(activeAgents[0].id);
    }
  }, [activeAgents, selectedAgentId]);

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    setTimeout(() => {
      document.getElementById("agent-editor-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="px-5 py-6 md:px-8">
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
          <h1 className="text-2xl font-semibold text-slate-900">Agents</h1>
        </div>

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
            </div>
            <div className="text-xs text-slate-500">Total: {agentsLoading ? "-" : activeAgents.length}</div>
          </div>

          <Card className="mt-4">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
              Agents
            </div>
            {agentsError ? <div className="p-4 text-sm text-rose-600">{agentsError}</div> : null}
            {!agentsError && !agentsLoading && activeAgents.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No agents found.</div>
            ) : null}
            <div className="divide-y divide-slate-200">
              {activeAgents.map((agent) => {
                const kb = agent.kb_id ? kbById.get(agent.kb_id) ?? null : null;
                const kbParentId = kb ? kb.parent_id ?? kb.id : null;
                const latestKb = kbParentId ? activeKbByParent.get(kbParentId) ?? null : null;
                const kbUpdateAvailable = Boolean(kb && latestKb && latestKb.id !== kb.id);
                const mcpCount = Array.isArray(agent.mcp_tool_ids) ? agent.mcp_tool_ids.length : 0;
                const issues = getAgentIssues({ agent, kb, mcpCount });
                const isSelected = agent.id === selectedAgentId;

                return (
                  <div
                    key={agent.id}
                    role="button"
                    onClick={() => handleSelectAgent(agent.id)}
                    className={cn("cursor-pointer p-4 transition-colors", isSelected ? "bg-slate-50" : "hover:bg-slate-50")}
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
      </div>
    </div>
  );
}
