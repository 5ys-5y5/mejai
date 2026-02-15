"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";
import { MultiSelectPopover, SelectPopover } from "@/components/SelectPopover";
import { formatKstDateTime } from "@/lib/kst";
import { Bot, Info, PencilLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isAdminKbValue } from "@/lib/kbType";

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
  website?: string | null;
  goal?: string | null;
};

type KbItem = {
  id: string;
  parent_id?: string | null;
  title: string;
  version: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  is_admin?: boolean | string | null;
  is_sample?: boolean | null;
  org_id?: string | null;
  content?: string | null;
};

type MpcTool = {
  id: string;
  tool_key?: string;
  provider_key?: string;
  name: string;
  description?: string | null;
};

type SessionRow = {
  id: string;
  duration_sec: number | null;
  outcome: string | null;
  agent_id: string | null;
  satisfaction: number | null;
};

type AgentMetric = {
  call_count: number;
  call_duration_sec: number;
  satisfaction_avg: number;
  success_rate: number;
  escalation_rate: number;
};

const llmOptions = [
  { id: "chatgpt", label: "chatGPT" },
  { id: "gemini", label: "GEMINI" },
];

const resolvedSet = new Set(["해결", "Resolved", "resolved"]);
const escalatedSet = new Set(["이관", "Escalated", "escalated"]);

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

function normalizeIds(ids?: string[] | null) {
  return [...(ids ?? [])].sort();
}

function buildChangeSummary(current: AgentItem, prev?: AgentItem | null) {
  if (!prev) return "신규";
  const changes: string[] = [];
  if ((current.name || "") !== (prev.name || "")) changes.push("이름");
  if ((current.llm || "") !== (prev.llm || "")) changes.push("LLM");
  if ((current.kb_id || "") !== (prev.kb_id || "")) changes.push("KB");
  if (JSON.stringify(normalizeIds(current.mcp_tool_ids)) !== JSON.stringify(normalizeIds(prev.mcp_tool_ids))) {
    changes.push("MCP");
  }
  if ((current.website || "") !== (prev.website || "")) changes.push("웹사이트");
  if ((current.goal || "") !== (prev.goal || "")) changes.push("목표");
  return changes.length > 0 ? `${changes.join(", ")} 변경` : "변경 없음";
}

function formatDuration(seconds?: number | null) {
  const safe = Number(seconds || 0);
  if (!Number.isFinite(safe) || safe <= 0) return "0분";
  const minutes = Math.round(safe / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
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

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue") || "";
  const issueSet = useMemo(() => {
    return new Set(
      issueParam
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
    );
  }, [issueParam]);

  const [name, setName] = useState("");
  const [llm, setLlm] = useState("chatgpt");
  const [kbId, setKbId] = useState("");
  const [mcpToolIds, setMcpToolIds] = useState<string[]>([]);
  const [website, setWebsite] = useState("");
  const [goal, setGoal] = useState("");

  const [baseName, setBaseName] = useState("");
  const [baseLlm, setBaseLlm] = useState("chatgpt");
  const [baseKbId, setBaseKbId] = useState("");
  const [baseMcpToolIds, setBaseMcpToolIds] = useState<string[]>([]);
  const [baseWebsite, setBaseWebsite] = useState("");
  const [baseGoal, setBaseGoal] = useState("");
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  const [allAgents, setAllAgents] = useState<AgentItem[]>([]);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [mcpTools, setMcpTools] = useState<MpcTool[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [kbInfoOpen, setKbInfoOpen] = useState(false);
  const [mcpInfoOpen, setMcpInfoOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!agentId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<AgentItem>(`/api/agents/${agentId}`);
        if (!mounted) return;
        setName(res.name || "");
        setLlm(res.llm === "gemini" ? "gemini" : "chatgpt");
        setKbId(res.kb_id || "");
        setMcpToolIds(res.mcp_tool_ids ?? []);
        setWebsite(res.website || "");
        setGoal(res.goal || "");
        setCurrentVersion(res.version || "");

        setBaseName(res.name || "");
        setBaseLlm(res.llm === "gemini" ? "gemini" : "chatgpt");
        setBaseKbId(res.kb_id || "");
        setBaseMcpToolIds(res.mcp_tool_ids ?? []);
        setBaseWebsite(res.website || "");
        setBaseGoal(res.goal || "");
        setLoading(false);
      } catch {
        if (!mounted) return;
        setError("에이전트를 불러오지 못했습니다.");
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [agentId]);

  useEffect(() => {
    let mounted = true;
    async function loadLists() {
      try {
        const [agentRes, kbRes, toolRes, sessionRes, profileRes] = await Promise.all([
          apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200"),
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ items: MpcTool[] }>("/api/mcp/tools").catch(() => ({ items: [] })),
          apiFetch<{ items: SessionRow[] }>("/api/sessions?limit=500").catch(() => ({ items: [] })),
          apiFetch<{ is_admin?: boolean; org_id?: string | null }>("/api/user-profile").catch(
            () => ({ is_admin: false, org_id: null })
          ),
        ]);
        if (!mounted) return;
        setAllAgents(agentRes.items || []);
        setKbItems(kbRes.items || []);
        setMcpTools(toolRes.items || []);
        setSessions(sessionRes.items || []);
        setUserOrgId(profileRes.org_id ?? null);
        setIsAdmin(Boolean(profileRes.is_admin));
      } catch {
        if (!mounted) return;
        setAllAgents([]);
        setKbItems([]);
        setMcpTools([]);
        setSessions([]);
        setUserOrgId(null);
        setIsAdmin(false);
      }
    }
    loadLists();
    return () => {
      mounted = false;
    };
  }, []);

  const kbById = useMemo(() => {
    const map = new Map<string, KbItem>();
    kbItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [kbItems]);

  const scopedKbItems = useMemo(() => {
    if (!userOrgId) return [];
    return kbItems.filter((item) => !isAdminKbValue(item.is_admin) && item.org_id === userOrgId);
  }, [kbItems, userOrgId]);

  const adminKbItems = useMemo(() => {
    if (!isAdmin || !userOrgId) return [];
    return kbItems.filter((item) => isAdminKbValue(item.is_admin) && item.org_id === userOrgId);
  }, [kbItems, isAdmin, userOrgId]);

  const activeKbByParent = useMemo(() => getActiveKbByParent(scopedKbItems), [scopedKbItems]);
  const selectedKb = kbId ? kbById.get(kbId) ?? null : null;
  const selectedKbParentId = selectedKb ? selectedKb.parent_id ?? selectedKb.id : null;
  const activeKb = selectedKbParentId ? activeKbByParent.get(selectedKbParentId) ?? null : null;
  const kbUpdateAvailable = Boolean(selectedKb && activeKb && activeKb.id !== selectedKb.id);
  const kbInfoText = useMemo(() => {
    if (!selectedKb) return "선택된 KB가 없습니다.";
    const adminFlag = isAdminKbValue(selectedKb.is_admin);
    return [
      `제목: ${selectedKb.title || "-"}`,
      `버전: ${selectedKb.version || "-"}`,
      `상태: ${selectedKb.is_active ? "배포" : "비활성"}`,
      `유형: ${adminFlag ? "ADMIN" : "일반"}`,
      `내용:\n${selectedKb.content || "-"}`,
      `ID: ${selectedKb.id}`,
    ].join("\n");
  }, [selectedKb]);

  const mcpInfoText = useMemo(() => {
    if (mcpToolIds.length === 0) return "선택된 MCP 도구가 없습니다.";
    const byId = new Map(mcpTools.map((tool) => [tool.id, tool]));
    return mcpToolIds
      .map((id) => {
        const tool = byId.get(id);
        if (!tool) return `알 수 없는 도구 (${id})`;
        const label = tool.tool_key || (tool.provider_key ? `${tool.provider_key}:${tool.name}` : tool.name);
        const lines = [
          `도구: ${label}`,
          `프로바이더: ${tool.provider_key || "-"}`,
          `설명: ${tool.description || "-"}`,
          `ID: ${tool.id}`,
        ];
        return lines.join("\n");
      })
      .join("\n\n");
  }, [mcpToolIds, mcpTools]);

  const kbOptions = useMemo(() => {
    return [...scopedKbItems]
      .sort((a, b) => {
        if (a.title !== b.title) return a.title.localeCompare(b.title);
        return compareVersions(
          { id: a.id, name: "", llm: null, kb_id: null, version: a.version, is_active: a.is_active, created_at: a.created_at },
          { id: b.id, name: "", llm: null, kb_id: null, version: b.version, is_active: b.is_active, created_at: b.created_at }
        );
      })
      .map((item) => ({
        id: item.id,
        label: `${item.title}${item.version ? ` (${item.version})` : ""}`,
        description: item.is_active ? "배포" : "비활성",
      }));
  }, [scopedKbItems]);

  const mcpOptions = useMemo(
    () =>
      mcpTools.map((tool) => ({
        id: tool.id,
        label: tool.tool_key || (tool.provider_key ? `${tool.provider_key}:${tool.name}` : tool.name),
        description: tool.description || undefined,
        group: tool.provider_key || "기타",
      })),
    [mcpTools]
  );

  const configChanged = useMemo(() => {
    if (llm !== baseLlm) return true;
    if ((kbId || "") !== (baseKbId || "")) return true;
    return JSON.stringify(normalizeIds(mcpToolIds)) !== JSON.stringify(normalizeIds(baseMcpToolIds));
  }, [llm, kbId, mcpToolIds, baseLlm, baseKbId, baseMcpToolIds]);

  const metaChanged = useMemo(() => {
    if (name.trim() !== baseName.trim()) return true;
    if (website.trim() !== baseWebsite.trim()) return true;
    return goal.trim() !== baseGoal.trim();
  }, [name, website, goal, baseName, baseWebsite, baseGoal]);

  const hasChanges = configChanged || metaChanged;

  const canSave = useMemo(() => {
    return name.trim().length > 0 && goal.trim().length > 0 && kbId && hasChanges && !saving;
  }, [name, goal, kbId, hasChanges, saving]);

  const refreshAgents = async () => {
    try {
      const res = await apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200");
      setAllAgents(res.items || []);
    } catch {
      // ignore refresh errors
    }
  };

  const handleSave = async () => {
    if (!agentId) return;
    if (!canSave) {
      toast.error("필수 항목을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (name.trim() !== baseName.trim()) payload.name = name.trim();
      if (llm !== baseLlm) payload.llm = llm;
      if ((kbId || "") !== (baseKbId || "")) payload.kb_id = kbId;
      if (website.trim() !== baseWebsite.trim()) payload.website = website.trim() || null;
      if (goal.trim() !== baseGoal.trim()) payload.goal = goal.trim();
      if (JSON.stringify(normalizeIds(mcpToolIds)) !== JSON.stringify(normalizeIds(baseMcpToolIds))) {
        payload.mcp_tool_ids = mcpToolIds;
      }

      const saved = await apiFetch<AgentItem>(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      toast.success("에이전트가 저장되었습니다.");
      setBaseName(saved.name || "");
      setBaseLlm(saved.llm === "gemini" ? "gemini" : "chatgpt");
      setBaseKbId(saved.kb_id || "");
      setBaseMcpToolIds(saved.mcp_tool_ids ?? []);
      setBaseWebsite(saved.website || "");
      setBaseGoal(saved.goal || "");
      setName(saved.name || "");
      setLlm(saved.llm === "gemini" ? "gemini" : "chatgpt");
      setKbId(saved.kb_id || "");
      setMcpToolIds(saved.mcp_tool_ids ?? []);
      setWebsite(saved.website || "");
      setGoal(saved.goal || "");
      setCurrentVersion(saved.version || "");
      await refreshAgents();

      if (saved.id && saved.id !== agentId) {
        router.replace(`/app/agents/${saved.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "에이전트 저장에 실패했습니다.";
      toast.error(message || "에이전트 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleActivateVersion = async (id: string) => {
    if (activeUpdateId || !id) return;
    const target = versionItems.find((item) => item.id === id);
    if (target?.is_active) return;
    setActiveUpdateId(id);
    try {
      await apiFetch<AgentItem>(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      toast.success("배포 버전이 변경되었습니다.");
      await refreshAgents();
    } catch (err) {
      const message = err instanceof Error ? err.message : "배포 상태 변경에 실패했습니다.";
      toast.error(message || "배포 상태 변경에 실패했습니다.");
    } finally {
      setActiveUpdateId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 버전을 삭제할까요? 삭제된 버전은 복구할 수 없습니다.")) return;
    try {
      await apiFetch(`/api/agents/${id}`, { method: "DELETE" });
      const next = allAgents.filter((item) => item.id !== id);
      setAllAgents(next);
      toast.success("버전이 삭제되었습니다.");
      if (id === agentId) {
        router.push("/app/agents");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "버전 삭제에 실패했습니다.";
      toast.error(message || "버전 삭제에 실패했습니다.");
    }
  };

  const versionItems = useMemo(() => {
    if (!agentId) return [];
    const parentId = allAgents.find((item) => item.id === agentId)?.parent_id ?? agentId;
    return allAgents.filter((item) => (item.parent_id ?? item.id) === parentId).sort(compareVersions);
  }, [allAgents, agentId]);

  const metricsById = useMemo(() => {
    const map = new Map<string, AgentMetric>();
    const acc = new Map<
      string,
      { count: number; duration: number; resolved: number; escalated: number; satSum: number; satCount: number }
    >();

    sessions.forEach((s) => {
      const id = s.agent_id;
      if (!id) return;
      if (!acc.has(id)) {
        acc.set(id, { count: 0, duration: 0, resolved: 0, escalated: 0, satSum: 0, satCount: 0 });
      }
      const row = acc.get(id)!;
      row.count += 1;
      row.duration += s.duration_sec || 0;
      if (resolvedSet.has(s.outcome || "")) row.resolved += 1;
      if (escalatedSet.has(s.outcome || "")) row.escalated += 1;
      if (typeof s.satisfaction === "number") {
        row.satSum += s.satisfaction;
        row.satCount += 1;
      }
    });

    acc.forEach((row, id) => {
      const count = row.count;
      const successRate = count ? row.resolved / count : 0;
      const escalationRate = count ? row.escalated / count : 0;
      const satisfactionAvg = row.satCount ? row.satSum / row.satCount : 0;
      map.set(id, {
        call_count: count,
        call_duration_sec: row.duration,
        satisfaction_avg: satisfactionAvg,
        success_rate: successRate,
        escalation_rate: escalationRate,
      });
    });
    return map;
  }, [sessions]);

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">에이전트 설정</h1>
            <p className="mt-1 text-sm text-slate-500">버전별 구성과 성과를 확인할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/laboratory?agentId=${encodeURIComponent(agentId)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Bot className="h-4 w-4" />
              실험실에서 테스트
            </Link>
            <button
              type="button"
              onClick={() => router.push("/app/agents")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              목록으로
            </button>
          </div>
        </div>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">에이전트 구성</div>
              <p className="mt-1 text-xs text-slate-500">
                현재 버전 {currentVersion || "-"} · LLM/MCP/KB 변경 시 새 버전이 생성됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-semibold",
                canSave ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400"
              )}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
          {loading ? (
            <div className="mt-4 text-sm text-slate-500">에이전트를 불러오는 중...</div>
          ) : error ? (
            <div className="mt-4 text-sm text-rose-600">{error}</div>
          ) : (
            <div className="mt-5 grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">에이전트 이름 *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="에이전트 이름"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              <div className="grid gap-4">
                <div
                  className={cn(
                    "grid gap-2 rounded-xl",
                    issueSet.has("llm") ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-white" : ""
                  )}
                >
                  <label className="text-sm font-medium text-slate-900">LLM</label>
                  <SelectPopover
                    value={llm}
                    onChange={(value) => setLlm(value === "gemini" ? "gemini" : "chatgpt")}
                    options={llmOptions}
                  />
                </div>
                <div
                  className={cn(
                    "grid gap-2 rounded-xl",
                    issueSet.has("kb") || issueSet.has("kb_update")
                      ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-white"
                      : ""
                  )}
                >
                  <label className="text-sm font-medium text-slate-900">KB 버전 *</label>
                  <div className="flex items-center gap-2">
                    <SelectPopover
                      value={kbId}
                      onChange={setKbId}
                      options={kbOptions}
                      placeholder="KB 선택"
                      searchable
                      className="flex-1 min-w-0"
                      renderValue={(selected) => (
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate">
                            {selected?.id ? (
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  scopedKbItems.find((kb) => kb.id === selected.id)?.is_active
                                    ? "bg-emerald-500"
                                    : "bg-slate-300"
                                )}
                              />
                            ) : null}
                            <span className="truncate">{selected?.label || "KB 선택"}</span>
                          </div>
                          {selected?.id ? (
                            <div className="text-[11px] text-slate-500 truncate">ID: {selected.id}</div>
                          ) : null}
                        </div>
                      )}
                      renderOption={(option) => {
                        const item = scopedKbItems.find((kb) => kb.id === option.id);
                        const isActive = Boolean(item?.is_active);
                        return (
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  isActive ? "bg-emerald-500" : "bg-slate-300"
                                )}
                              />
                              <span className="text-slate-900">{option.label}</span>
                              {option.description ? (
                                <span className="text-[10px] text-slate-500 whitespace-nowrap">{option.description}</span>
                              ) : null}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">ID: {option.id}</div>
                          </div>
                        );
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setKbInfoOpen((prev) => !prev)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                      aria-label="KB 정보"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </div>
                  {kbInfoOpen ? (
                    <textarea
                      readOnly
                      value={kbInfoText}
                      className="mt-2 min-h-[60px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                    />
                  ) : null}
                  {kbUpdateAvailable ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      최신 KB 버전이 있습니다 ({selectedKb?.version || "-"} → {activeKb?.version || "-"}).
                      <button
                        type="button"
                        onClick={() => {
                          if (activeKb) setKbId(activeKb.id);
                        }}
                        className="ml-2 underline underline-offset-2"
                      >
                        최신으로 선택
                      </button>
                    </div>
                  ) : null}
                  {isAdmin ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                        <span>admin KB</span>
                        <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0 text-[10px] font-semibold text-amber-700">
                          ADMIN
                        </span>
                      </div>
                      {adminKbItems.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          {adminKbItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">{item.title}{item.version ? ` (${item.version})` : ""}</span>
                              <span className="text-[10px] text-slate-500">ID: {item.id}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500">적용 가능한 admin KB가 없습니다.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={cn(
                  "grid gap-2 rounded-xl",
                  issueSet.has("mcp") ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-white" : ""
                )}
              >
                <label className="text-sm font-medium text-slate-900">MCP 도구</label>
                <div className="flex items-center gap-2">
                  <MultiSelectPopover
                    values={mcpToolIds}
                    onChange={setMcpToolIds}
                    options={mcpOptions}
                    placeholder="MCP 도구 선택"
                    displayMode="count"
                    showBulkActions
                    className="flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => setMcpInfoOpen((prev) => !prev)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                    aria-label="MCP 정보"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                {mcpInfoOpen ? (
                  <textarea
                    readOnly
                    value={mcpInfoText}
                    className="mt-2 min-h-[80px] w-full resize-y rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words"
                  />
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">웹사이트</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">주요 목표 *</label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="에이전트 목표를 입력하세요."
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
            </div>
          )}
        </Card>

        <Card className="mt-6 p-6">
          <div className="text-sm font-semibold text-slate-900">버전 목록</div>
          <p className="mt-1 text-xs text-slate-500">
            배포 상태는 버전 목록에서만 관리됩니다. 배포를 켜면 해당 버전만 활성화됩니다.
          </p>
          <ul className="mt-3 grid grid-cols-[70px_80px_70px_70px_70px_70px_70px_120px_minmax(0,1fr)_44px] gap-x-[6px] divide-y divide-slate-200">
            <li className="contents">
              <span className="flex min-h-[44px] items-center px-2 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                버전
              </span>
              <span className="flex min-h-[44px] items-center px-2 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                배포
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                통화수
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                통화시간
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                만족도
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                성공률
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                이관율
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                수정일
              </span>
              <span className="flex min-h-[44px] items-center px-2 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                수정 내용
              </span>
              <span className="flex min-h-[44px] items-center px-0 py-3 pr-2 text-left text-xs font-semibold text-slate-500" />
            </li>
            <li className="col-span-full border-b border-slate-200" />
            {versionItems.length === 0 ? (
              <li className="col-span-full py-3 text-sm text-slate-500">버전 기록이 없습니다.</li>
            ) : (
              versionItems.map((item, index) => {
                const isCurrent = item.id === agentId;
                const isActiveRow = Boolean(item.is_active);
                const deployDisabled = Boolean(activeUpdateId) || isActiveRow;
                const prevVersion = versionItems[index + 1] ?? null;
                const summaryText = buildChangeSummary(item, prevVersion);
                const metric = metricsById.get(item.id);
                return (
                  <li
                    key={item.id}
                    role="button"
                    onClick={() => {
                      if (!isCurrent) router.push(`/app/agents/${item.id}`);
                    }}
                    className={cn("contents", isCurrent ? "cursor-default" : "cursor-pointer hover:bg-slate-50")}
                  >
                    <div className="flex min-h-[44px] items-center justify-between gap-2 px-2 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                      <span>{item.version || "-"}</span>
                      {isCurrent ? (
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
                          aria-label="수정 중"
                          title="수정 중"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </div>
                    <div className="flex min-h-[44px] items-center px-2 py-3 text-xs whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateVersion(item.id);
                        }}
                        disabled={deployDisabled}
                        aria-pressed={isActiveRow}
                        className={cn(
                          "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                          isActiveRow
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600 hover:bg-slate-300",
                          deployDisabled && !isActiveRow ? "cursor-not-allowed opacity-60" : ""
                        )}
                      >
                        {activeUpdateId === item.id ? "변경 중..." : isActiveRow ? "ON" : "OFF"}
                      </button>
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {metric?.call_count ?? 0}건
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDuration(metric?.call_duration_sec)}
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {formatSatisfaction(metric?.satisfaction_avg)}
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {formatRate(metric?.success_rate)}
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {formatRate(metric?.escalation_rate)}
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatKstDateTime(item.created_at)}
                    </div>
                    <div className="flex min-h-[44px] items-center px-2 py-3 text-xs text-slate-600 truncate">
                      {summaryText}
                    </div>
                    <div className="flex min-h-[44px] items-center px-0 py-3 pr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        aria-label="삭제"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Card>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/agents")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
