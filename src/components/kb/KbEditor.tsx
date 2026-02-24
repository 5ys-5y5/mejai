"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";
import { calcRagUsageBytes, DEFAULT_RAG_LIMIT_BYTES, getRagLimitBytes } from "@/lib/ragStorage";
import { toast } from "sonner";
import { formatKstDateTime } from "@/lib/kst";
import { PencilLine, Trash2 } from "lucide-react";
import DiffViewer, { type DiffLine } from "@/components/DiffViewer";
import { isAdminKbValue } from "@/lib/kbType";

type KbItem = {
  id: string;
  parent_id?: string | null;
  title: string;
  content: string | null;
  category: string | null;
  version: string | null;
  is_active: boolean | null;
  is_admin?: boolean | string | null;
  is_public?: boolean | null;
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

function getParentKey(item: { id: string; parent_id?: string | null }) {
  return item.parent_id ?? item.id;
}

function findActiveKbByKey(items: KbItem[], key: string) {
  return items.find((item) => getParentKey(item) === key && item.is_active);
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
  if (!current || !prev) return "? ê·œ";
  const diff = buildDiffLines(current, prev);
  const added = diff.filter((line) => line.type === "add").map((line) => line.text.trim()).filter(Boolean);
  const removed = diff.filter((line) => line.type === "del").map((line) => line.text.trim()).filter(Boolean);

  if (added.length === 0 && removed.length === 0) return "ë³€ê²??†ìŒ";

  const addedText = added.length > 0 ? `+ ${added.join(" | ")}` : "";
  const removedText = removed.length > 0 ? `- ${removed.join(" | ")}` : "";
  const combined = [addedText, removedText].filter(Boolean).join(" / ");
  if (!combined) return "ë³€ê²??†ìŒ";

  const lineCount = added.length + removed.length;
  if (lineCount > 1) {
    const firstLine = (addedText || removedText).split("\n")[0] ?? "";
    return firstLine ? `${firstLine}...` : "...";
  }
  return combined;
}

export function KbEditor({
  kbId,
  onSelectKb,
}: {
  kbId: string | null;
  onSelectKb: (id: string | null) => void;
}) {

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
        setIsAdminKb(isAdminKbValue(res.is_admin));
        setApplyGroups(Array.isArray(res.apply_groups) ? res.apply_groups : []);
        setApplyGroupsMode(res.apply_groups_mode === "any" ? "any" : "all");
        setBaseTitle(res.title || "");
        setBaseCategory(res.category ?? null);
        setBaseContent(res.content || "");
        setContent(res.content || "");
        setLoading(false);
      } catch {
        if (!mounted) return;
        setError("ë¬¸ì„œë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??");
        setLoading(false);
      }
    }
    loadItem();
    return () => {
      mounted = false;
    };
  }, [kbId, allItems]);

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
      toast.error("?œëª©???…ë ¥??ì£¼ì„¸??");
      return;
    }
    if (!metaChanged) {
      toast.error("ë³€ê²½ëœ ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤.");
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

      toast.success("ë¬¸ì„œ ?•ë³´ê°€ ?€?¥ë˜?ˆìŠµ?ˆë‹¤.");
      setBaseTitle(saved.title || "");
      setBaseCategory(saved.category ?? null);
      setTitle(saved.title || "");
      setCategory(saved.category || "");
      await refreshItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "ë¬¸ì„œ ?•ë³´ ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.";
      toast.error(message || "ë¬¸ì„œ ?•ë³´ ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSaveContent = async () => {
    if (!kbId) return;
    if (content.trim().length === 0) {
      toast.error("?´ìš©???…ë ¥??ì£¼ì„¸??");
      return;
    }
    if (!contentChanged) {
      toast.error("ë³€ê²½ëœ ?´ìš©???†ìŠµ?ˆë‹¤.");
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

      toast.success("??ë²„ì „???ì„±?˜ì—ˆ?µë‹ˆ??");
      setBaseContent(saved.content || "");
      setContent(saved.content || "");
      setCurrentVersion(saved.version || "");
      await refreshItems();
      await refreshAgents();
      setSelectedAgentIds([]);
      if (saved?.id && saved.id !== kbId) {
        onSelectKb(saved.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "ë¬¸ì„œ ?´ìš© ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.";
      toast.error(message || "ë¬¸ì„œ ?´ìš© ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    } finally {
      setSavingContent(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("??ë²„ì „???? œ? ê¹Œ?? ?? œ??ë²„ì „?€ ë³µêµ¬?????†ìŠµ?ˆë‹¤.")) {
      return;
    }
    try {
      await apiFetch(`/api/kb/${id}`, { method: "DELETE" });
      const next = allItems.filter((item) => item.id !== id);
      setAllItems(next);
      setUsedBytes(calcRagUsageBytes(next));
      toast.success("ë²„ì „???? œ?˜ì—ˆ?µë‹ˆ??");
      if (id === kbId) {
        onSelectKb(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "ë²„ì „ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
      toast.error(message || "ë²„ì „ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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
      toast.success("ë°°í¬ ë²„ì „??ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤.");
      await refreshItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "ë°°í¬ ?íƒœ ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.";
      toast.error(message || "ë°°í¬ ?íƒœ ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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
    <>
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">ë²„ì „ ?´ìš© (??ë²„ì „ ?ì„±)</div>
              <p className="mt-1 text-xs text-slate-500">
                ?´ìš©???€?¥í•˜ë©???ë²„ì „???ì„±?˜ê³  ?´ì „ ë²„ì „?€ ê·¸ë?ë¡?? ì??©ë‹ˆ?? ?œëª©/ì¹´í…Œê³ ë¦¬???„ì—??
                ë³„ë„ë¡??€?¥í•´???©ë‹ˆ??
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
              {savingContent ? "?€??ì¤?.." : "?´ìš© ?€??}
            </button>
          </div>
          {loading ? (
            <div className="mt-4 text-sm text-slate-500">ë¬¸ì„œë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
          ) : error ? (
            <div className="mt-4 text-sm text-rose-600">{error}</div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-900">?„ì¬ ë²„ì „</label>
                  <input
                    value={currentVersion ? `${currentVersion} Â· ?€??????ë²„ì „ ?ì„±` : "?€??????ë²„ì „ ?ì„±"}
                    disabled
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">?´ìš© *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="ë¬¸ì„œ ?´ìš©???…ë ¥?˜ì„¸??"
                  className="min-h-[220px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              {!isAdminKb ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">KB ?…ë°?´íŠ¸ ?ìš© ?ì´?„íŠ¸ ? íƒ</div>
                      <p className="mt-1 text-xs text-slate-500">
                        ?´ìš© ?€????? íƒ???ì´?„íŠ¸ë§???ë²„ì „?¼ë¡œ ?ì„±?©ë‹ˆ??
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
                      {allAgentsSelected ? "?„ì²´ ?´ì œ" : "?„ì²´ ? íƒ"}
                    </button>
                  </div>
                  {agentsUsingKb.length === 0 ? (
                    <div className="mt-3 text-xs text-slate-500">??KB ë²„ì „???¬ìš©?˜ëŠ” ?ì´?„íŠ¸ê°€ ?†ìŠµ?ˆë‹¤.</div>
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
                            <span className="text-slate-400">ë²„ì „ {agent.version || "-"}</span>
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

<Card id="kb-editor-root" className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">ë¬¸ì„œ ?•ë³´ (?„ì²´ ë²„ì „ ê³µí†µ)</div>
              <p className="mt-1 text-xs text-slate-500">
                ?œëª©/ì¹´í…Œê³ ë¦¬ ë³€ê²½ì? ê°™ì? parent_id??ëª¨ë“  ë²„ì „??ì¦‰ì‹œ ë°˜ì˜?©ë‹ˆ??
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
              {savingMeta ? "?€??ì¤?.." : "?•ë³´ ?€??}
            </button>
          </div>
          {loading ? (
            <div className="mt-4 text-sm text-slate-500">ë¬¸ì„œë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
          ) : error ? (
            <div className="mt-4 text-sm text-rose-600">{error}</div>
          ) : (
            <div className="mt-4 grid gap-6">
              {isAdminKb ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">ADMIN ê³µí†µ KB</div>
                  <div className="mt-1 text-xs text-slate-500">
                    ?ì„± ??? í˜•/?€?ì? ë³€ê²½í•  ???†ìŠµ?ˆë‹¤.
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div className="text-xs font-semibold text-slate-600">?ìš© ?€??ê·¸ë£¹</div>
                    {applyGroups.length === 0 ? (
                      <div className="text-xs text-slate-500">?„ì²´ ?¬ìš©???ìš©</div>
                    ) : (
                      <div className="grid gap-2 text-xs text-slate-600">
                        <div className="text-xs font-semibold text-slate-700">
                          ë§¤ì¹­ ë°©ì‹: {applyGroupsMode === "any" ? "?˜ë‚˜?¼ë„ ?¬í•¨" : "ëª¨ë‘ ?¬í•¨"}
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
                <label className="text-sm font-medium text-slate-900">ë¬¸ì„œ ?œëª© *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="?? ë°˜í’ˆ ?•ì±… ?ˆë‚´"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">ì¹´í…Œê³ ë¦¬</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="?? ?•ì±…"
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
          <div className="text-sm font-semibold text-slate-900">?˜ì • ?´ìš©</div>
          <div className="mt-3">
            <DiffViewer lines={diffLines} />
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="text-sm font-semibold text-slate-900">ë²„ì „ ëª©ë¡</div>
          <p className="mt-1 text-xs text-slate-500">
            ë°°í¬ ?íƒœ??ë²„ì „ ëª©ë¡?ì„œë§?ê´€ë¦¬ë©?ˆë‹¤. ë°°í¬ ì»¬ëŸ¼??on?¼ë¡œ ë°”ê¾¸ë©??´ë‹¹ ë²„ì „ë§??œì„±?”ë˜ê³?
            ?˜ë¨¸ì§€???ë™?¼ë¡œ off ì²˜ë¦¬?©ë‹ˆ??
          </p>
          <ul className="mt-3 grid grid-cols-[80px_80px_60px_60px_60px_60px_60px_100px_minmax(0,1fr)_40px] gap-x-[6px] divide-y divide-slate-200">
            <li className="contents">
              <span className="flex min-h-[44px] items-center px-2 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                ë²„ì „
              </span>
              <span className="flex min-h-[44px] items-center px-2 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                ë°°í¬
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                ?µí™”??
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                ?µí™”?œê°„
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                ë§Œì¡±??
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                ?±ê³µë¥?
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                ?´ê???
              </span>
              <span className="flex min-h-[44px] items-center px-1 py-3 text-left text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                ?˜ì •??
              </span>
              <span className="flex min-h-[44px] items-center px-2 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                ?˜ì • ?´ìš©
              </span>
              <span className="flex min-h-[44px] items-center px-0 py-3 pr-2 text-left text-xs font-semibold text-slate-500">
                
              </span>
            </li>
            <li className="col-span-full border-b border-slate-200" />
            {versionItems.length === 0 ? (
              <li className="col-span-full py-3 text-sm text-slate-500">ë²„ì „ ê¸°ë¡???†ìŠµ?ˆë‹¤.</li>
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
                      if (!isCurrent) onSelectKb(item.id);
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
                          aria-label="?˜ì • ì¤?
                          title="?˜ì • ì¤?
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
                        {activeUpdateId === item.id ? "ë³€ê²?ì¤?.." : isActiveRow ? "ON" : "OFF"}
                      </button>
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      0ê±?
                    </div>
                    <div className="flex min-h-[44px] items-center px-1 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      0ë¶?
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
                        aria-label="?? œ"
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
            onClick={() => onSelectKb(null)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ì·¨ì†Œ
          </button>
        </div>
    </>
  );
}
