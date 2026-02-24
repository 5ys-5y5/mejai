"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";
import { formatKstDateTime } from "@/lib/kst";
import { isAdminKbValue } from "@/lib/kbType";

type MpcTool = {
  id: string;
  tool_key?: string;
  provider_key?: string;
  name: string;
  description?: string | null;
};

type KbItem = {
  id: string;
  parent_id?: string | null;
  title: string;
  version: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  is_admin?: boolean | string | null;
  is_public?: boolean | null;
};

type KbParentGroup = {
  parentId: string;
  title: string;
  versions: KbItem[];
  isAdmin: boolean;
};

const llmOptions = [
  {
    id: "chatgpt",
    title: "chatGPT",
    description: "?€?”í˜• ?‘ì—…??ìµœì ?”ëœ ê¸°ë³¸ ëª¨ë¸",
  },
  {
    id: "gemini",
    title: "GEMINI",
    description: "ë¹ ë¥¸ ?”ì•½ê³?ë©€?°ëª¨???•ì¥??ê°•ì ",
  },
];

const stepLabels = ["LLM ? íƒ", "MCP ?°ê²°", "KB ? íƒ", "?ì´?„íŠ¸ ?•ë³´"];

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

function pickDefaultKbVersion(versions: KbItem[]) {
  if (versions.length === 0) return null;
  const active = versions.find((item) => item.is_active);
  return active ?? versions[0];
}

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [llm, setLlm] = useState<"chatgpt" | "gemini">("chatgpt");
  const [mcpTools, setMcpTools] = useState<MpcTool[]>([]);
  const [selectedMcpProviders, setSelectedMcpProviders] = useState<string[]>([]);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedKbId, setSelectedKbId] = useState("");
  const [plan, setPlan] = useState("starter");
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [website, setWebsite] = useState("");
  const [goal, setGoal] = useState("");

  const isPaid = useMemo(() => {
    const normalized = (plan || "").toLowerCase();
    return normalized !== "starter" && normalized !== "free" && normalized !== "";
  }, [plan]);

  const visibleKbItems = useMemo(() => {
    if (isAdminUser) return kbItems;
    return kbItems.filter((item) => !isAdminKbValue(item.is_admin));
  }, [kbItems, isAdminUser]);

  const kbParents = useMemo(() => {
    const byParent = new Map<string, KbItem[]>();
    visibleKbItems.forEach((item) => {
      const parentId = item.parent_id ?? item.id;
      if (!byParent.has(parentId)) byParent.set(parentId, []);
      byParent.get(parentId)?.push(item);
    });
    return Array.from(byParent.entries()).map(([parentId, versions]) => {
      const sorted = [...versions].sort(compareVersions);
      const title = sorted[0]?.title || "?œëª© ?†ìŒ";
      const isAdmin = sorted.some((item) => isAdminKbValue(item.is_admin));
      return { parentId, title, versions: sorted, isAdmin } satisfies KbParentGroup;
    });
  }, [visibleKbItems]);

  const selectedGroup = useMemo(() => {
    return kbParents.find((group) => group.parentId === selectedParentId) || null;
  }, [kbParents, selectedParentId]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(llm);
    if (step === 1) return true;
    if (step === 2) return Boolean(selectedKbId);
    return true;
  }, [step, llm, selectedKbId]);

  const canSubmit = useMemo(() => {
    return agentName.trim().length > 0 && goal.trim().length > 0 && Boolean(selectedKbId);
  }, [agentName, goal, selectedKbId]);

  const mcpProviderOptions = useMemo(() => {
    const byProvider = new Map<string, { key: string; count: number }>();
    mcpTools.forEach((tool) => {
      const key = String(tool.provider_key || "").trim().toLowerCase();
      if (!key) return;
      const current = byProvider.get(key) || { key, count: 0 };
      current.count += 1;
      byProvider.set(key, current);
    });
    return Array.from(byProvider.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [mcpTools]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [profile, toolsRes, kbRes] = await Promise.all([
          apiFetch<{ plan?: string; is_admin?: boolean }>("/api/user-profile").catch(() => null),
          apiFetch<{ items: MpcTool[] }>("/api/mcp/tools").catch(() => ({ items: [] })),
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
        ]);
        if (!mounted) return;
        setPlan(profile?.plan || "starter");
        setIsAdminUser(Boolean(profile?.is_admin));
        setMcpTools(toolsRes?.items || []);
        setKbItems(kbRes?.items || []);
      } catch {
        if (!mounted) return;
        toast.error("?ì´?„íŠ¸ ?¤ì • ?°ì´?°ë? ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedParentId) return;
    if (kbParents.length === 0) return;
    const firstParent = kbParents[0];
    setSelectedParentId(firstParent.parentId);
    const defaultVersion = pickDefaultKbVersion(firstParent.versions);
    setSelectedKbId(defaultVersion?.id || "");
  }, [kbParents, selectedParentId]);

  useEffect(() => {
    if (!selectedParentId) return;
    const exists = kbParents.some((group) => group.parentId === selectedParentId);
    if (exists) return;
    const firstParent = kbParents[0];
    if (!firstParent) {
      setSelectedParentId("");
      setSelectedKbId("");
      return;
    }
    setSelectedParentId(firstParent.parentId);
    const defaultVersion = pickDefaultKbVersion(firstParent.versions);
    setSelectedKbId(defaultVersion?.id || "");
  }, [kbParents, selectedParentId]);

  const handleNext = () => {
    if (!canNext) {
      toast.error("?„ìˆ˜ ??ª©???„ë£Œ??ì£¼ì„¸??");
      return;
    }
    setStep((prev) => Math.min(prev + 1, stepLabels.length - 1));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSelectParent = (parentId: string) => {
    setSelectedParentId(parentId);
    const group = kbParents.find((item) => item.parentId === parentId);
    if (!group) {
      setSelectedKbId("");
      return;
    }
    const next = pickDefaultKbVersion(group.versions);
    setSelectedKbId(next?.id || "");
  };

  const toggleMcpProvider = (providerKey: string) => {
    setSelectedMcpProviders((prev) => {
      if (prev.includes(providerKey)) return prev.filter((id) => id !== providerKey);
      return [...prev, providerKey];
    });
  };

  const handleClearMcp = () => {
    setSelectedMcpProviders([]);
  };

  const handleCreate = async () => {
    if (!canSubmit) {
      toast.error("?„ìˆ˜ ??ª©???…ë ¥??ì£¼ì„¸??");
      return;
    }
    try {
      const payload = {
        name: agentName.trim(),
        llm,
        kb_id: selectedKbId,
        mcp_tool_ids: isPaid ? selectedMcpProviders : [],
        website: website.trim() || null,
        goal: goal.trim(),
      };
      await apiFetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      toast.success("?ì´?„íŠ¸ê°€ ?±ë¡?˜ì—ˆ?µë‹ˆ??");
      router.push("/app/agents");
    } catch (err) {
      const message = err instanceof Error ? err.message : "?ì´?„íŠ¸ ?ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
      toast.error(message || "?ì´?„íŠ¸ ?ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    }
  };

  return (
    <div className="px-5 md:px-8 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-900">???ì´?„íŠ¸</div>
          <div className="mt-1 text-sm text-slate-500">{stepLabels[step]}</div>
        </div>

        {step === 0 ? (
          <div className="mt-8 space-y-4">
            {llmOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => setLlm(option.id === "gemini" ? "gemini" : "chatgpt")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLlm(option.id === "gemini" ? "gemini" : "chatgpt");
                  }
                }}
                className={cn(
                  "w-full rounded-2xl border px-4 py-4 text-left transition-colors",
                  llm === option.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
                )}
                role="button"
                tabIndex={0}
              >
                <div className="text-sm font-semibold text-slate-900">{option.title}</div>
                <div className="mt-1 text-xs text-slate-500">{option.description}</div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              MCP ?°ê²°?€ ? ë£Œ ?Œëœ?ì„œë§??¬ìš©?????ˆìŠµ?ˆë‹¤.
              {isPaid ? " ?°ê²°??ê³µê¸‰?ë? ? íƒ?˜ì„¸??" : " ?„ì¬ ?Œëœ?ì„œ??ë¹„í™œ?±í™”?©ë‹ˆ??"}
            </div>
            {loading ? (
              <div className="text-sm text-slate-500">MCP ê³µê¸‰?ë? ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
            ) : mcpProviderOptions.length === 0 ? (
              <div className="text-sm text-slate-500">?°ê²° ê°€?¥í•œ MCP ê³µê¸‰?ê? ?†ìŠµ?ˆë‹¤.</div>
            ) : (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => (isPaid ? handleClearMcp() : null)}
                  disabled={!isPaid}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                    selectedMcpProviders.length === 0 ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white",
                    !isPaid ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"
                  )}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">? íƒ ????/div>
                    <div className="mt-1 text-xs text-slate-500">MCP ?°ê²° ?†ì´ ì§„í–‰?©ë‹ˆ??</div>
                  </div>
                  <span
                    className={cn(
                      "mt-1 inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                      selectedMcpProviders.length === 0 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {selectedMcpProviders.length === 0 ? "? íƒ?? : "ë¯¸ì„ ??}
                  </span>
                </button>
                {mcpProviderOptions.map((provider) => {
                  const selected = selectedMcpProviders.includes(provider.key);
                  return (
                    <button
                      key={provider.key}
                      type="button"
                      onClick={() => (isPaid ? toggleMcpProvider(provider.key) : null)}
                      disabled={!isPaid}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                        selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white",
                        !isPaid ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{provider.key}</div>
                        <div className="mt-1 text-xs text-slate-500">?œì„± MCP {provider.count}ê°?/div>
                      </div>
                      <span
                        className={cn(
                          "mt-1 inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                          selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {selected ? "? íƒ?? : "ë¯¸ì„ ??}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-8 space-y-5">
            {isAdminUser ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                admin KB??<span className="font-semibold text-slate-900">ADMIN</span> ë°°ì?ë¡??œì‹œ?©ë‹ˆ??
              </div>
            ) : null}
            <div className="text-sm font-semibold text-slate-900">KB ë¶€ëª?? íƒ</div>
            {loading ? (
              <div className="text-sm text-slate-500">KB ëª©ë¡??ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
            ) : kbParents.length === 0 ? (
              <div className="text-sm text-slate-500">? íƒ ê°€?¥í•œ KBê°€ ?†ìŠµ?ˆë‹¤.</div>
            ) : (
              <div className="grid gap-3">
                {kbParents.map((group) => (
                  <button
                    key={group.parentId}
                    type="button"
                    onClick={() => handleSelectParent(group.parentId)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition-colors",
                      selectedParentId === group.parentId
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{group.title}</div>
                      {group.isAdmin ? (
                        <span className="inline-flex h-5 items-center rounded-full bg-amber-100 px-2 text-[10px] font-semibold text-amber-700">
                          ADMIN
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">ë²„ì „ {group.versions.length}ê°?/div>
                  </button>
                ))}
              </div>
            )}

            {selectedGroup ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">KB ë²„ì „ ? íƒ</div>
                <div className="grid gap-3">
                  {selectedGroup.versions.map((version) => {
                    const selected = selectedKbId === version.id;
                    return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => setSelectedKbId(version.id)}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                          selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">{version.version || "ë²„ì „ ?†ìŒ"}</div>
                            {isAdminKbValue(version.is_admin) ? (
                              <span className="inline-flex h-5 items-center rounded-full bg-amber-100 px-2 text-[10px] font-semibold text-amber-700">
                                ADMIN
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatKstDateTime(version.created_at)}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                            version.is_active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {version.is_active ? "ë°°í¬" : "ë¹„í™œ??}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">?ì´?„íŠ¸ ?´ë¦„ *</label>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="?ì´?„íŠ¸ ?´ë¦„???…ë ¥?˜ì„¸??
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
              />
              <div className="text-xs text-slate-400">{agentName.length}/50</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">?¹ì‚¬?´íŠ¸ (? íƒ)</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
              />
              <div className="text-xs text-slate-400">ê³µê°œ???•ë³´ë§?ì°¸ê³ ?˜ì—¬ ?ì´?„íŠ¸ë¥?ê°œì¸?”í•©?ˆë‹¤.</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">ì£¼ìš” ëª©í‘œ *</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="?ì´?„íŠ¸ê°€ ?¬ì„±?´ì•¼ ?˜ëŠ” ëª©í‘œë¥??ì–´ì£¼ì„¸??"
                className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium",
              step === 0
                ? "border-slate-200 text-slate-300"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            ?´ì „
          </button>

          {step < stepLabels.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                canNext ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400"
              )}
            >
              ?¤ìŒ
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canSubmit}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                canSubmit ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400"
              )}
            >
              ?ì´?„íŠ¸ ?ì„±
            </button>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: stepLabels.length }).map((_, idx) => (
            <span
              key={idx}
              className={cn("h-1.5 w-6 rounded-full", step === idx ? "bg-slate-900" : "bg-slate-200")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
