"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import RagStorageBadge from "@/components/RagStorageBadge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";
import { calcRagUsageBytes, DEFAULT_RAG_LIMIT_BYTES, getRagLimitBytes } from "@/lib/ragStorage";
import { toast } from "sonner";
import { formatKstDateTime } from "@/lib/kst";
import { PencilLine, Trash2 } from "lucide-react";
import DiffViewer, { type DiffLine } from "@/components/DiffViewer";

type KbItem = {
  id: string;
  parent_id?: string | null;
  title: string;
  content: string | null;
  category: string | null;
  version: string | null;
  is_active: boolean | null;
  is_admin?: boolean | null;
  apply_groups?: Array<{ path: string; values: string[] }> | null;
  apply_groups_mode?: "all" | "any" | null;
  created_at?: string | null;
};

type AgentItem = {
  id: string;
  parent_id?: string | null;
  name: string;
  kb_id: string | null;
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

function compareVersions(a: KbItem, b: KbItem) {
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

function buildChangeSummary(current: KbItem, prev?: KbItem | null) {
  if (!prev) return "신규";
  const changes: string[] = [];
  if ((current.title || "") !== (prev.title || "")) changes.push("제목");
  if ((current.category || "") !== (prev.category || "")) changes.push("카테고리");
  if ((current.content || "") !== (prev.content || "")) changes.push("내용");
  return changes.length > 0 ? `${changes.join(", ")} 변경` : "변경 없음";
}

function buildDiffLines(current?: KbItem | null, prev?: KbItem | null): DiffLine[] {
  const currLines = (current?.content || "").split(/\r?\n/);
  const prevLines = (prev?.content || "").split(/\r?\n/);
  const m = prevLines.length;
  const n = currLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (prevLines[i] === currLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;

  while (i < m && j < n) {
    if (prevLines[i] === currLines[j]) {
      lines.push({ type: "ctx", oldNo, newNo, text: prevLines[i] });
      i += 1;
      j += 1;
      oldNo += 1;
      newNo += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ type: "del", oldNo, newNo: null, text: prevLines[i] });
      i += 1;
      oldNo += 1;
    } else {
      lines.push({ type: "add", oldNo: null, newNo, text: currLines[j] });
      j += 1;
      newNo += 1;
    }
  }
  while (i < m) {
    lines.push({ type: "del", oldNo, newNo: null, text: prevLines[i] });
    i += 1;
    oldNo += 1;
  }
  while (j < n) {
    lines.push({ type: "add", oldNo: null, newNo, text: currLines[j] });
    j += 1;
    newNo += 1;
  }
  return lines;
}

function buildContentChangeSummary(current?: KbItem | null, prev?: KbItem | null) {
  if (!current || !prev) return "신규";
  const diff = buildDiffLines(current, prev);
  const added = diff.filter((line) => line.type === "add").map((line) => line.text.trim()).filter(Boolean);
  const removed = diff.filter((line) => line.type === "del").map((line) => line.text.trim()).filter(Boolean);

  if (added.length === 0 && removed.length === 0) return "변경 없음";

  const addedText = added.length > 0 ? `+ ${added.join(" | ")}` : "";
  const removedText = removed.length > 0 ? `- ${removed.join(" | ")}` : "";
  const combined = [addedText, removedText].filter(Boolean).join(" / ");
  if (!combined) return "변경 없음";

  const lineCount = added.length + removed.length;
  if (lineCount > 1) {
    const firstLine = (addedText || removedText).split("\n")[0] ?? "";
    return firstLine ? `${firstLine}...` : "...";
  }
  return combined;
}

export default function EditKbPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const kbId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(DEFAULT_RAG_LIMIT_BYTES);
  const [allItems, setAllItems] = useState<KbItem[]>([]);
  const [baseTitle, setBaseTitle] = useState("");
  const [baseCategory, setBaseCategory] = useState<string | null>(null);
  const [baseContent, setBaseContent] = useState("");
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isAdminKb, setIsAdminKb] = useState(false);
  const [applyGroups, setApplyGroups] = useState<Array<{ path: string; values: string[] }>>([]);
  const [applyGroupsMode, setApplyGroupsMode] = useState<"all" | "any" | null>(null);
  const [agentItems, setAgentItems] = useState<AgentItem[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const metaChanged = useMemo(() => {
    const nextTitle = title.trim();
    const nextCategory = category.trim();
    const prevTitle = baseTitle.trim();
    const prevCategory = (baseCategory ?? "").trim();
    return nextTitle !== prevTitle || nextCategory !== prevCategory;
  }, [title, category, baseTitle, baseCategory]);

  const contentChanged = useMemo(() => {
    return content.trim() !== baseContent.trim();
  }, [content, baseContent]);

  const canSaveMeta = useMemo(() => {
    return metaChanged && title.trim().length > 0 && !savingMeta;
  }, [metaChanged, title, savingMeta]);

  const canSaveContent = useMemo(() => {
    return contentChanged && content.trim().length > 0 && !savingContent;
  }, [contentChanged, content, savingContent]);

  useEffect(() => {
    let mounted = true;
    async function loadItem() {
      if (!kbId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<KbItem>(`/api/kb/${kbId}`);
        if (!mounted) return;
        setTitle(res.title || "");
        setCategory(res.category || "");
        setCurrentVersion(res.version || "");
        setIsAdminKb(Boolean(res.is_admin));
        setApplyGroups(Array.isArray(res.apply_groups) ? res.apply_groups : []);
        setApplyGroupsMode(res.apply_groups_mode === "any" ? "any" : "all");
        setBaseTitle(res.title || "");
        setBaseCategory(res.category ?? null);
        setBaseContent(res.content || "");
        setContent(res.content || "");
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError("문서를 불러오지 못했습니다.");
        setLoading(false);
      }
    }
    loadItem();
    return () => {
      mounted = false;
    };
  }, [kbId]);

  useEffect(() => {
    let mounted = true;
    async function loadUsage() {
      try {
        const [res, profile, agents] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ plan?: string }>("/api/user-profile").catch(() => null),
          apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200").catch(() => ({ items: [] })),
        ]);
        if (!mounted) return;
        const rawItems = res.items || [];
        setAllItems(rawItems);
        setUsedBytes(calcRagUsageBytes(rawItems));
        setAgentItems(agents.items || []);
        if (profile?.plan) {
          setLimitBytes(getRagLimitBytes(profile.plan));
        }
      } catch {
        // keep defaults if usage cannot be loaded
      }
    }
    loadUsage();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedAgentIds([]);
  }, [kbId]);

  const refreshItems = async () => {
    try {
      const res = await apiFetch<{ items: KbItem[] }>("/api/kb?limit=200");
      const rawItems = res.items || [];
      setAllItems(rawItems);
      setUsedBytes(calcRagUsageBytes(rawItems));
    } catch {
      // ignore refresh errors
    }
  };

  const refreshAgents = async () => {
    try {
      const res = await apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200");
      setAgentItems(res.items || []);
    } catch {
      // ignore refresh errors
    }
  };

  const handleSaveMeta = async () => {
    if (!kbId) return;
    if (title.trim().length === 0) {
      toast.error("제목을 입력해 주세요.");
      return;
    }
    if (!metaChanged) {
      toast.error("변경된 정보가 없습니다.");
      return;
    }
    setSavingMeta(true);
    try {
      const trimmedCategory = category.trim();
      const payload = {
        title: title.trim(),
        category: trimmedCategory ? trimmedCategory : null,
      };

      const saved = await apiFetch<KbItem>(`/api/kb/${kbId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      toast.success("문서 정보가 저장되었습니다.");
      setBaseTitle(saved.title || "");
      setBaseCategory(saved.category ?? null);
      setTitle(saved.title || "");
      setCategory(saved.category || "");
      await refreshItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "문서 정보 저장에 실패했습니다.";
      toast.error(message || "문서 정보 저장에 실패했습니다.");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSaveContent = async () => {
    if (!kbId) return;
    if (content.trim().length === 0) {
      toast.error("내용을 입력해 주세요.");
      return;
    }
    if (!contentChanged) {
      toast.error("변경된 내용이 없습니다.");
      return;
    }
    setSavingContent(true);
    try {
      const payload = {
        content: content.trim(),
        update_agent_ids: selectedAgentIds,
      };
      const saved = await apiFetch<KbItem>(`/api/kb/${kbId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      toast.success("새 버전이 생성되었습니다.");
      setBaseContent(saved.content || "");
      setContent(saved.content || "");
      setCurrentVersion(saved.version || "");
      await refreshItems();
      await refreshAgents();
      setSelectedAgentIds([]);
      if (saved?.id && saved.id !== kbId) {
        router.replace(`/app/kb/${saved.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "문서 내용 저장에 실패했습니다.";
      toast.error(message || "문서 내용 저장에 실패했습니다.");
    } finally {
      setSavingContent(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 버전을 삭제할까요? 삭제된 버전은 복구할 수 없습니다.")) {
      return;
    }
    try {
      await apiFetch(`/api/kb/${id}`, { method: "DELETE" });
      const next = allItems.filter((item) => item.id !== id);
      setAllItems(next);
      setUsedBytes(calcRagUsageBytes(next));
      toast.success("버전이 삭제되었습니다.");
      if (id === kbId) {
        router.push("/app/kb");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "버전 삭제에 실패했습니다.";
      toast.error(message || "버전 삭제에 실패했습니다.");
    }
  };

  const handleActivateVersion = async (id: string) => {
    if (activeUpdateId || !id) return;
    const target = versionItems.find((item) => item.id === id);
    if (target?.is_active) return;
    setActiveUpdateId(id);
    try {
      await apiFetch<KbItem>(`/api/kb/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: true }),
      });
      toast.success("배포 버전이 변경되었습니다.");
      await refreshItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "배포 상태 변경에 실패했습니다.";
      toast.error(message || "배포 상태 변경에 실패했습니다.");
    } finally {
      setActiveUpdateId(null);
    }
  };

  const versionItems = useMemo(() => {
    const parentId = allItems.find((item) => item.id === kbId)?.parent_id ?? kbId;
    if (!parentId) return [];
    return allItems.filter((item) => (item.parent_id ?? item.id) === parentId).sort(compareVersions);
  }, [allItems, kbId]);

  const activeAgents = useMemo(() => getActiveAgents(agentItems), [agentItems]);
  const agentsUsingKb = useMemo(() => {
    if (!kbId) return [];
    return activeAgents.filter((agent) => agent.kb_id === kbId);
  }, [activeAgents, kbId]);
  const allAgentsSelected = agentsUsingKb.length > 0 && selectedAgentIds.length === agentsUsingKb.length;

  const currentItem = useMemo(() => {
    const active = versionItems.find((item) => item.is_active);
    return active ?? versionItems[0] ?? null;
  }, [versionItems]);
  const currentIndex = useMemo(
    () => (currentItem ? versionItems.findIndex((item) => item.id === currentItem.id) : -1),
    [versionItems, currentItem]
  );
  const prevItem = currentIndex >= 0 ? versionItems[currentIndex + 1] : null;
  const diffLines = useMemo(() => buildDiffLines(currentItem, prevItem), [currentItem, prevItem]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set.values()).sort();
  }, [allItems]);

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">문서 수정</h1>
            <p className="mt-1 text-sm text-slate-500">지식 베이스 문서를 업데이트합니다.</p>
          </div>
          <RagStorageBadge usedBytes={usedBytes} limitBytes={limitBytes} />
          <button
            type="button"
            onClick={() => router.push("/app/kb")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            목록으로
          </button>
        </div>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">문서 정보 (전체 버전 공통)</div>
              <p className="mt-1 text-xs text-slate-500">
                제목/카테고리 변경은 같은 parent_id의 모든 버전에 즉시 반영됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveMeta}
              disabled={!canSaveMeta}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-semibold",
                canSaveMeta ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400"
              )}
            >
              {savingMeta ? "저장 중..." : "정보 저장"}
            </button>
          </div>
          {loading ? (
            <div className="mt-4 text-sm text-slate-500">문서를 불러오는 중...</div>
          ) : error ? (
            <div className="mt-4 text-sm text-rose-600">{error}</div>
          ) : (
            <div className="mt-4 grid gap-6">
              {isAdminKb ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">ADMIN 공통 KB</div>
                  <div className="mt-1 text-xs text-slate-500">
                    생성 후 유형/대상은 변경할 수 없습니다.
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div className="text-xs font-semibold text-slate-600">적용 대상 그룹</div>
                    {applyGroups.length === 0 ? (
                      <div className="text-xs text-slate-500">전체 사용자 적용</div>
                    ) : (
                      <div className="grid gap-2 text-xs text-slate-600">
                        <div className="text-xs font-semibold text-slate-700">
                          매칭 방식: {applyGroupsMode === "any" ? "하나라도 포함" : "모두 포함"}
                        </div>
                        <ul className="grid gap-1">
                          {applyGroups.map((group) => (
                            <li key={`${group.path}-${group.values.join(",")}`}>
                              {group.path}: {group.values.join(", ")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">문서 제목 *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 반품 정책 안내"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">카테고리</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 정책"
                  list="kb-category-options"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
                <datalist id="kb-category-options">
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
            </div>
          )}
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">버전 내용 (새 버전 생성)</div>
              <p className="mt-1 text-xs text-slate-500">
                내용을 저장하면 새 버전이 생성되고 이전 버전은 그대로 유지됩니다. 제목/카테고리는 위에서
                별도로 저장해야 합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveContent}
              disabled={!canSaveContent}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-semibold",
                canSaveContent ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 text-slate-400"
              )}
            >
              {savingContent ? "저장 중..." : "내용 저장"}
            </button>
          </div>
          {loading ? (
            <div className="mt-4 text-sm text-slate-500">문서를 불러오는 중...</div>
          ) : error ? (
            <div className="mt-4 text-sm text-rose-600">{error}</div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-900">현재 버전</label>
                  <input
                    value={currentVersion ? `${currentVersion} · 저장 시 새 버전 생성` : "저장 시 새 버전 생성"}
                    disabled
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">내용 *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="문서 내용을 입력하세요."
                  className="min-h-[220px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              {!isAdminKb ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">KB 업데이트 적용 에이전트 선택</div>
                      <p className="mt-1 text-xs text-slate-500">
                        내용 저장 시 선택한 에이전트만 새 버전으로 생성됩니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (allAgentsSelected) {
                          setSelectedAgentIds([]);
                        } else {
                          setSelectedAgentIds(agentsUsingKb.map((agent) => agent.id));
                        }
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-100"
                      disabled={agentsUsingKb.length === 0}
                    >
                      {allAgentsSelected ? "전체 해제" : "전체 선택"}
                    </button>
                  </div>
                  {agentsUsingKb.length === 0 ? (
                    <div className="mt-3 text-xs text-slate-500">이 KB 버전을 사용하는 에이전트가 없습니다.</div>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      {agentsUsingKb.map((agent) => {
                        const checked = selectedAgentIds.includes(agent.id);
                        return (
                          <label
                            key={agent.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                          >
                            <span className="font-medium text-slate-900">{agent.name}</span>
                            <span className="text-slate-400">버전 {agent.version || "-"}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedAgentIds((prev) => {
                                  if (prev.includes(agent.id)) {
                                    return prev.filter((id) => id !== agent.id);
                                  }
                                  return [...prev, agent.id];
                                });
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-slate-900"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card className="mt-6 p-6">
          <div className="text-sm font-semibold text-slate-900">수정 내용</div>
          <div className="mt-3">
            <DiffViewer lines={diffLines} />
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="text-sm font-semibold text-slate-900">버전 목록</div>
          <p className="mt-1 text-xs text-slate-500">
            배포 상태는 버전 목록에서만 관리됩니다. 배포 컬럼을 on으로 바꾸면 해당 버전만 활성화되고
            나머지는 자동으로 off 처리됩니다.
          </p>
          <ul className="mt-3 grid grid-cols-[80px_80px_60px_60px_60px_60px_60px_100px_minmax(0,1fr)_40px] gap-x-[6px] divide-y divide-slate-200">
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
              <span className="flex min-h-[44px] items-center px-0 py-3 pr-2 text-left text-xs font-semibold text-slate-500">
                
              </span>
            </li>
            <li className="col-span-full border-b border-slate-200" />
            {versionItems.length === 0 ? (
              <li className="col-span-full py-3 text-sm text-slate-500">버전 기록이 없습니다.</li>
            ) : (
              versionItems.map((item, index) => {
                const isCurrent = item.id === kbId;
                const isActiveRow = Boolean(item.is_active);
                const deployDisabled = Boolean(activeUpdateId) || isActiveRow;
                const prevVersion = versionItems[index + 1] ?? null;
                const summaryText = buildContentChangeSummary(item, prevVersion);
                return (
                  <li
                    key={item.id}
                    role="button"
                    onClick={() => {
                      if (!isCurrent) router.push(`/app/kb/${item.id}`);
                    }}
                    className={cn(
                      "contents",
                      isCurrent ? "cursor-default" : "cursor-pointer hover:bg-slate-50"
                    )}
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
                      0건
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      0분
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      0.0
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      0%
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      0%
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
            onClick={() => router.push("/app/kb")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
