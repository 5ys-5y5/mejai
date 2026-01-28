"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";
import { formatKstDateTime } from "@/lib/kst";

type MpcTool = {
  id: string;
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
};

type KbParentGroup = {
  parentId: string;
  title: string;
  versions: KbItem[];
};

const llmOptions = [
  {
    id: "chatgpt",
    title: "chatGPT",
    description: "대화형 작업에 최적화된 기본 모델",
  },
  {
    id: "gemini",
    title: "GEMINI",
    description: "빠른 요약과 멀티모달 확장에 강점",
  },
];

const stepLabels = ["LLM 선택", "MCP 연결", "KB 선택", "에이전트 정보"];

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
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([]);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedKbId, setSelectedKbId] = useState("");
  const [plan, setPlan] = useState("starter");
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [website, setWebsite] = useState("");
  const [goal, setGoal] = useState("");

  const isPaid = useMemo(() => {
    const normalized = (plan || "").toLowerCase();
    return normalized !== "starter" && normalized !== "free" && normalized !== "";
  }, [plan]);

  const kbParents = useMemo(() => {
    const byParent = new Map<string, KbItem[]>();
    kbItems.forEach((item) => {
      const parentId = item.parent_id ?? item.id;
      if (!byParent.has(parentId)) byParent.set(parentId, []);
      byParent.get(parentId)?.push(item);
    });
    return Array.from(byParent.entries()).map(([parentId, versions]) => {
      const sorted = [...versions].sort(compareVersions);
      const title = sorted[0]?.title || "제목 없음";
      return { parentId, title, versions: sorted } satisfies KbParentGroup;
    });
  }, [kbItems]);

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

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [profile, toolsRes, kbRes] = await Promise.all([
          apiFetch<{ plan?: string }>("/api/user-profile").catch(() => null),
          apiFetch<{ items: MpcTool[] }>("/api/mcp/tools").catch(() => ({ items: [] })),
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
        ]);
        if (!mounted) return;
        setPlan(profile?.plan || "starter");
        setMcpTools(toolsRes?.items || []);
        setKbItems(kbRes?.items || []);
      } catch (err) {
        if (!mounted) return;
        toast.error("에이전트 설정 데이터를 불러오지 못했습니다.");
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

  const handleNext = () => {
    if (!canNext) {
      toast.error("필수 항목을 완료해 주세요.");
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

  const toggleMcpTool = (toolId: string) => {
    setSelectedMcpIds((prev) => {
      if (prev.includes(toolId)) return prev.filter((id) => id !== toolId);
      return [...prev, toolId];
    });
  };

  const handleClearMcp = () => {
    setSelectedMcpIds([]);
  };

  const handleCreate = async () => {
    if (!canSubmit) {
      toast.error("필수 항목을 입력해 주세요.");
      return;
    }
    try {
      const payload = {
        name: agentName.trim(),
        llm,
        kb_id: selectedKbId,
        mcp_tool_ids: isPaid ? selectedMcpIds : [],
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
      toast.success("에이전트가 등록되었습니다.");
      router.push("/app/agents");
    } catch (err) {
      const message = err instanceof Error ? err.message : "에이전트 생성에 실패했습니다.";
      toast.error(message || "에이전트 생성에 실패했습니다.");
    }
  };

  return (
    <div className="px-5 md:px-8 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-900">새 에이전트</div>
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
              MCP 연결은 유료 플랜에서만 사용할 수 있습니다.
              {isPaid ? " 연결할 도구를 선택하세요." : " 현재 플랜에서는 비활성화됩니다."}
            </div>
            {loading ? (
              <div className="text-sm text-slate-500">MCP 도구를 불러오는 중...</div>
            ) : mcpTools.length === 0 ? (
              <div className="text-sm text-slate-500">연결 가능한 MCP 도구가 없습니다.</div>
            ) : (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => (isPaid ? handleClearMcp() : null)}
                  disabled={!isPaid}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                    selectedMcpIds.length === 0 ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white",
                    !isPaid ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"
                  )}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">선택 안 함</div>
                    <div className="mt-1 text-xs text-slate-500">MCP 연결 없이 진행합니다.</div>
                  </div>
                  <span
                    className={cn(
                      "mt-1 inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                      selectedMcpIds.length === 0 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {selectedMcpIds.length === 0 ? "선택됨" : "미선택"}
                  </span>
                </button>
                {mcpTools.map((tool) => {
                  const selected = selectedMcpIds.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => (isPaid ? toggleMcpTool(tool.id) : null)}
                      disabled={!isPaid}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                        selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white",
                        !isPaid ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{tool.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{tool.description || "설명 없음"}</div>
                      </div>
                      <span
                        className={cn(
                          "mt-1 inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                          selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {selected ? "선택됨" : "미선택"}
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
            <div className="text-sm font-semibold text-slate-900">KB 부모 선택</div>
            {loading ? (
              <div className="text-sm text-slate-500">KB 목록을 불러오는 중...</div>
            ) : kbParents.length === 0 ? (
              <div className="text-sm text-slate-500">선택 가능한 KB가 없습니다.</div>
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
                    <div className="text-sm font-semibold text-slate-900">{group.title}</div>
                    <div className="mt-1 text-xs text-slate-500">버전 {group.versions.length}개</div>
                  </button>
                ))}
              </div>
            )}

            {selectedGroup ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">KB 버전 선택</div>
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
                          <div className="text-sm font-semibold text-slate-900">
                            {version.version || "버전 없음"}
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
                          {version.is_active ? "배포" : "비활성"}
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
              <label className="text-sm font-medium text-slate-900">에이전트 이름 *</label>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="에이전트 이름을 입력하세요"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
              />
              <div className="text-xs text-slate-400">{agentName.length}/50</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">웹사이트 (선택)</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
              />
              <div className="text-xs text-slate-400">공개된 정보만 참고하여 에이전트를 개인화합니다.</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">주요 목표 *</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="에이전트가 달성해야 하는 목표를 적어주세요."
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
            이전
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
              다음
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
              에이전트 생성
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
