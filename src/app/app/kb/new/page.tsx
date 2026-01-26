"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import RagStorageBadge from "@/components/RagStorageBadge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";
import { calcRagUsageBytes, DEFAULT_RAG_LIMIT_BYTES, getRagLimitBytes } from "@/lib/ragStorage";
import { toast } from "sonner";

type KbItem = {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
};

type Recommendation = {
  id: string;
  title: string;
  detail: string;
  insertText: string;
};

function buildKeywordSet(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/g)
      .filter((token) => token.length >= 2)
  );
}

function extractBulletLines(content?: string | null) {
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*") || line.startsWith("•"))
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function buildRecommendations(
  title: string,
  category: string,
  content: string,
  items: KbItem[]
): Recommendation[] {
  const recos: Recommendation[] = [
    {
      id: "scope",
      title: "적용 범위/예외 조건",
      detail: "정책의 적용 대상과 예외를 명확히 하여 모호성을 줄입니다.",
      insertText: "## 적용 범위/예외\n- 적용 대상\n- 예외 조건\n",
    },
    {
      id: "process",
      title: "처리 절차/승인 흐름",
      detail: "고객 안내 단계와 내부 승인 흐름을 분리해 안내합니다.",
      insertText: "## 처리 절차\n- 고객 안내 단계\n- 내부 승인/검토 단계\n",
    },
    {
      id: "limits",
      title: "제한사항/한계",
      detail: "불가 항목과 제한 조건을 미리 고지해 이슈를 줄입니다.",
      insertText: "## 제한사항\n- 불가 항목\n- 제한 조건\n",
    },
    {
      id: "evidence",
      title: "증빙/필수 확인 항목",
      detail: "필수 제출 자료와 확인 절차를 명시합니다.",
      insertText: "## 필요 증빙\n- 필수 제출 자료\n- 확인 절차\n",
    },
    {
      id: "escalation",
      title: "에스컬레이션 기준",
      detail: "상위 이관 기준과 연락 채널을 구분합니다.",
      insertText: "## 에스컬레이션 기준\n- 즉시 이관 조건\n- 담당 부서/연락 채널\n",
    },
  ];

  const keywordSet = buildKeywordSet(`${title} ${category}`);
  const similar = items.filter((item) => {
    if (!item.title) return false;
    if (category && item.category === category) return true;
    const tokens = buildKeywordSet(item.title);
    for (const token of tokens) {
      if (keywordSet.has(token)) return true;
    }
    return false;
  });

  const bulletPool = new Map<string, number>();
  similar.forEach((item) => {
    extractBulletLines(item.content).forEach((line) => {
      bulletPool.set(line, (bulletPool.get(line) || 0) + 1);
    });
  });

  const topBullets = Array.from(bulletPool.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([line]) => line)
    .slice(0, 3);

  if (topBullets.length > 0) {
    recos.push({
      id: "faq",
      title: "유사 문서 기반 FAQ 보강",
      detail: "유사 문서에서 자주 등장한 질문/안내를 추가합니다.",
      insertText: `## 자주 묻는 질문\n${topBullets.map((line) => `- ${line}`).join("\n")}\n`,
    });
  }

  const normalizedContent = content.toLowerCase();
  return recos.filter((item) => !normalizedContent.includes(item.title.toLowerCase()));
}

function buildDiffText(content: string, additions: string) {
  if (!additions.trim()) return "";
  const lines = additions.trimEnd().split("\n");
  return `@@\n${lines.map((line) => `+ ${line}`).join("\n")}\n`;
}

function extractAdditionsFromDiff(diff: string) {
  return diff
    .split("\n")
    .filter((line) => line.startsWith("+ ") && !line.startsWith("+++"))
    .map((line) => line.replace(/^\+\s?/, ""))
    .join("\n")
    .trim();
}

export default function NewKbPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("1.0");
  const [content, setContent] = useState("");
  const [llm, setLlm] = useState<"chatgpt" | "gemini">("chatgpt");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(DEFAULT_RAG_LIMIT_BYTES);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecos, setSelectedRecos] = useState<Record<string, boolean>>({});
  const [diffText, setDiffText] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadUsage() {
      try {
        const [res, profile] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ plan?: string }>("/api/user-profile").catch(() => null),
        ]);
        if (!mounted) return;
        const rawItems = res.items || [];
        setKbItems(rawItems);
        setUsedBytes(calcRagUsageBytes(rawItems));
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
    const next = buildRecommendations(title, category, content, kbItems);
    setRecommendations(next);
  }, [title, category, content, kbItems]);

  useEffect(() => {
    const chosen = recommendations.filter((item) => selectedRecos[item.id]);
    const additions = chosen.map((item) => item.insertText.trim()).join("\n\n");
    setDiffText(buildDiffText(content, additions));
  }, [recommendations, selectedRecos, content]);

  const handleApplyRecommendations = () => {
    if (!diffText.trim()) {
      toast.error("적용할 추천 사항이 없습니다.");
      return;
    }
    if (!window.confirm("선택한 추천 지침을 문서에 적용할까요?")) {
      return;
    }
    const additions = extractAdditionsFromDiff(diffText);
    if (!additions.trim()) {
      toast.error("diff 형식에서 추가 내용을 찾지 못했습니다.");
      return;
    }
    const next = `${content.trimEnd()}\n\n${additions}\n`;
    setContent(next.trim());
    toast.success("추천 지침이 적용되었습니다.");
  };

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && content.trim().length > 0;
  }, [title, content]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("제목과 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload: {
        title: string;
        content: string;
        category?: string | null;
        version?: string | null;
        llm?: string;
        is_active: boolean;
      } = {
        title: title.trim(),
        content: content.trim(),
        llm,
        is_active: isActive,
      };

      const trimmedCategory = category.trim();
      if (trimmedCategory) {
        payload.category = trimmedCategory;
      }

      const trimmedVersion = version.trim();
      if (trimmedVersion) {
        payload.version = trimmedVersion;
      }

      await apiFetch("/api/kb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      toast.success("문서가 생성되었습니다.");
      router.push("/app/kb");
    } catch (err) {
      const message = err instanceof Error ? err.message : "문서 생성에 실패했습니다.";
      toast.error(message || "문서 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">문서 생성</h1>
            <p className="mt-1 text-sm text-slate-500">지식 베이스에 새 문서를 추가합니다.</p>
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
          <div className="grid gap-6">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-900">문서 제목 *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 반품 정책 안내"
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">카테고리</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 정책"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">버전</label>
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="예: 1.0"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-900">LLM</label>
                <select
                  value={llm}
                  onChange={(e) => setLlm(e.target.value === "gemini" ? "gemini" : "chatgpt")}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:border-slate-900"
                >
                  <option value="chatgpt">chatGPT</option>
                  <option value="gemini">GEMINI</option>
                </select>
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

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-0"
              />
              바로 배포 상태로 설정
            </label>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="text-sm font-semibold text-slate-900">추천 지침 (생성 전 점검)</div>
          <p className="mt-1 text-xs text-slate-500">
            유사 문서와 일반 권장사항을 바탕으로 추가하면 좋은 지침을 제안합니다. 필요한 항목만 선택하세요.
          </p>
          <div className="mt-4 grid gap-3">
            {recommendations.length === 0 ? (
              <div className="text-sm text-slate-500">추천할 항목이 없습니다.</div>
            ) : (
              recommendations.map((rec) => (
                <label key={rec.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedRecos[rec.id])}
                    onChange={(e) =>
                      setSelectedRecos((prev) => ({
                        ...prev,
                        [rec.id]: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{rec.title}</div>
                    <div className="text-xs text-slate-500">{rec.detail}</div>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-600">diff (편집 가능)</div>
            <textarea
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              placeholder="추천 지침을 선택하면 diff가 생성됩니다."
              className="mt-2 min-h-[140px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
            />
          </div>

          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={handleApplyRecommendations}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              추천 지침 적용
            </button>
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/app/kb")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold",
              canSubmit && !saving
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-200 text-slate-400"
            )}
          >
            {saving ? "생성 중..." : "문서 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
