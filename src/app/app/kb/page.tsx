"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import RagStorageBadge from "@/components/RagStorageBadge";
import { calcRagUsageBytes, DEFAULT_RAG_LIMIT_BYTES, getRagLimitBytes } from "@/lib/ragStorage";
import { formatKstDate } from "@/lib/kst";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

type KbItem = {
  id: string;
  parent_id?: string | null;
  title: string;
  version: string | null;
  category: string | null;
  is_active: boolean | null;
  created_at: string | null;
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

function formatDate(value?: string | null) {
  return formatKstDate(value);
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

function normalizeId(raw?: string | null) {
  if (!raw) return "";
  let value = raw;
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep raw if decoding fails
  }
  return value.trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isNewerVersion(a?: string | null, b?: string | null, aDate?: string | null, bDate?: string | null) {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  if (aParts && bParts) {
    for (let i = 0; i < 3; i += 1) {
      if (aParts[i] !== bParts[i]) return aParts[i] > bParts[i];
    }
    return true;
  }
  if (aParts && !bParts) return true;
  if (!aParts && bParts) return false;
  const aTime = aDate ? new Date(aDate).getTime() : 0;
  const bTime = bDate ? new Date(bDate).getTime() : 0;
  return aTime >= bTime;
}

function getActiveItems(items: KbItem[]) {
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
    if (!existing.is_active && isNewerVersion(item.version, existing.version, item.created_at, existing.created_at)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).filter((item) => item.is_active);
}

export default function KbPage() {
  const [items, setItems] = useState<KbItem[]>([]);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(DEFAULT_RAG_LIMIT_BYTES);
  const [metricsById, setMetricsById] = useState<Record<string, KbMetric>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [res, profile] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ plan?: string }>("/api/user-profile").catch(() => null),
        ]);
        if (mounted) {
          const rawItems = res.items || [];
          setKbItems(rawItems);
          setItems(getActiveItems(rawItems));
          setUsedBytes(calcRagUsageBytes(rawItems));
          if (profile?.plan) {
            setLimitBytes(getRagLimitBytes(profile.plan));
          }
          const activeItems = getActiveItems(rawItems);
          if (activeItems.length > 0) {
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
          }
          if (process.env.NODE_ENV !== "production") {
            rawItems.forEach((item) => {
              const normalized = normalizeId(item.id);
              if (!isUuid(normalized)) {
                console.error("[kb-list] invalid id from API", {
                  id: item.id,
                  normalized,
                  title: item.title,
                });
              }
            });
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError("KB 데이터를 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 문서를 삭제할까요? 삭제된 문서는 복구할 수 없습니다.")) {
      return;
    }
    try {
      await apiFetch(`/api/kb/${id}`, { method: "DELETE" });
      const next = kbItems.filter((item) => item.id !== id);
      setKbItems(next);
      setItems(getActiveItems(next));
      setUsedBytes(calcRagUsageBytes(next));
      toast.success("문서가 삭제되었습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "문서 삭제에 실패했습니다.";
      toast.error(message || "문서 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">지식 베이스</h1>
          <RagStorageBadge usedBytes={usedBytes} limitBytes={limitBytes} />
        </div>
        <div className="mt-4 flex items-center justify-end">
          <Link
            href="/app/kb/new"
            className="inline-flex h-8 items-center rounded-xl bg-emerald-600 px-3 text-xs font-semibold leading-none text-white hover:bg-emerald-700"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            문서 생성
          </Link>
        </div>

        <Card className="mt-4">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">KB 목록</div>
            <div className="text-xs text-slate-500">총 {loading ? "-" : items.length}건</div>
          </div>
          <ul className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_max-content_max-content] gap-x-[10px] divide-y divide-slate-200">
            <li className="contents">
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                버전명
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                배포
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                버전
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                통화수
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                통화시간
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                만족도
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                성공률
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                이관율
              </span>
              <span className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs font-semibold text-slate-500">
                수정일
              </span>
              <span
                className="flex min-h-[44px] items-center px-0 py-3 text-left text-xs font-semibold text-slate-500"
                aria-hidden="true"
              >
                <span className="inline-block h-8 w-8" />
              </span>
              <span
                className="flex min-h-[44px] items-center px-0 py-3 pr-4 text-left text-xs font-semibold text-slate-500"
                aria-hidden="true"
              >
                <span className="inline-block h-8 w-8" />
              </span>
            </li>
            <li className="col-span-full border-b border-slate-200" />
            {error ? <li className="p-4 text-sm text-rose-600">{error}</li> : null}
            {!error && !loading && items.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">문서가 없습니다.</li>
            ) : null}
            {items.map((d) => {
              const safeId = normalizeId(d.id);
              const metric = metricsById[d.id];
              return (
                <li key={d.id} className="contents">
                  <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-sm font-medium text-slate-900">
                    {d.title}
                  </div>
                  <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                    {d.is_active ? "배포됨" : "비활성"}
                  </div>
                  <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                    {d.version || "-"}
                  </div>
                  <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                    {metric?.call_count ?? 0}건
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
                    {formatDate(d.created_at)}
                  </div>
                  <div className="flex min-h-[44px] items-center px-0 py-3 text-left text-sm">
                    <Link
                      href={`/app/kb/${encodeURIComponent(d.parent_id ?? safeId)}`}
                      aria-label="수정"
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="flex min-h-[44px] items-center px-0 py-3 pr-4 text-left text-sm">
                    <button
                      type="button"
                      onClick={() => handleDelete(safeId)}
                      aria-label="삭제"
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
      </div>
    </div>
  );
}
