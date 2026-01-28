"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Bot, Plus } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { formatKstDateTime } from "@/lib/kst";

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
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
              const kb = agent.kb_id ? kbById.get(agent.kb_id) : null;
              const mcpCount = Array.isArray(agent.mcp_tool_ids) ? agent.mcp_tool_ids.length : 0;
              return (
                <div key={agent.id} className="p-4 hover:bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{agent.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        LLM {agent.llm || "-"} · KB {kb?.title || "-"} · MCP {mcpCount}개
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        버전 {agent.version || "-"} · {formatKstDateTime(agent.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
