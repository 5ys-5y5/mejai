"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import RagStorageBadge from "@/components/RagStorageBadge";
import { KbEditor } from "@/components/kb/KbEditor";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/apiClient";
import { isAdminKbValue, isSampleKbRow } from "@/lib/kbType";
import { formatKstDate } from "@/lib/kst";
import { calcRagUsageBytes, DEFAULT_RAG_LIMIT_BYTES, getRagLimitBytes } from "@/lib/ragStorage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export default function KbPage() {
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [kbLoading, setKbLoading] = useState(true);
  const [kbError, setKbError] = useState<string | null>(null);
  const [usedBytes, setUsedBytes] = useState(0);
  const [limitBytes, setLimitBytes] = useState(DEFAULT_RAG_LIMIT_BYTES);
  const [metricsById, setMetricsById] = useState<Record<string, KbMetric>>({});
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

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

  const activeKbItems = useMemo(() => getActiveKbItems(kbItems), [kbItems]);

  useEffect(() => {
    if (activeKbItems.length === 0) {
      setMetricsById({});
      return;
    }
    const ids = activeKbItems.map((item) => item.id).join(",");
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
  }, [activeKbItems]);

  useEffect(() => {
    if (!selectedKbId && activeKbItems.length > 0) {
      setSelectedKbId(activeKbItems[0].id);
    }
  }, [activeKbItems, selectedKbId]);

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
      const next = kbItems.filter((item) => item.id !== id);
      setKbItems(next);
      setUsedBytes(calcRagUsageBytes(next));
      toast.success("KB deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete KB.";
      toast.error(message || "Failed to delete KB.");
    }
  };

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Knowledge Base</h1>
        </div>

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
              <div className="text-xs text-slate-500">Total: {kbLoading ? "-" : activeKbItems.length}</div>
            </div>
            {kbError ? <div className="p-4 text-sm text-rose-600">{kbError}</div> : null}
            {!kbError && !kbLoading && activeKbItems.length === 0 ? (
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
              {activeKbItems.map((item) => {
                const metric = metricsById[item.id];
                const isSelected = item.id === selectedKbId;

                return (
                  <li
                    key={item.id}
                    role="button"
                    onClick={() => handleSelectKb(item.id)}
                    className={cn("contents cursor-pointer", isSelected ? "bg-slate-50" : "hover:bg-slate-50")}
                  >
                    <div className="flex min-h-[44px] items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-900">
                      <span>{item.title}</span>
                      {isAdminKbValue(item.is_admin) ? <Badge variant="slate">ADMIN</Badge> : null}
                      {isSampleKbRow(item) ? <Badge variant="green">SAMPLE</Badge> : null}
                    </div>
                    <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                      {item.is_active ? "Active" : "Inactive"}
                    </div>
                    <div className="flex min-h-[44px] items-center px-4 py-3 text-left text-xs text-slate-600">
                      {item.version || "-"}
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
                      {formatKstDate(item.created_at)}
                    </div>
                    <div className="flex min-h-[44px] items-center px-0 py-3 text-left text-sm">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectKb(item.id);
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
                          handleDeleteKb(item.id);
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
      </div>
    </div>
  );
}
