"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch, getAccessToken } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type PolicyRow = {
  id: string;
  path: string;
  file_name: string;
  content_hash: string;
  summary_ko: string;
  exports: string[] | null;
  details_ko?: {
    overview?: string;
    items?: Array<{
      name?: string;
      role?: string;
      impact?: string;
      status?: PolicyRow["status"];
      kind?: string;
      exported?: boolean;
      item_hash?: string;
    }>;
    model?: string;
  } | null;
  status: "LIVE" | "MODIFIED" | "NEW" | "DELETED";
  line_count: number;
  prev_line_count: number | null;
  last_seen_at: string;
  last_changed_at: string;
  created_at: string;
  updated_at: string;
};

const STATUS_ORDER: Record<PolicyRow["status"], number> = {
  NEW: 0,
  MODIFIED: 1,
  DELETED: 2,
  LIVE: 3,
};

const STATUS_STYLES: Record<PolicyRow["status"], string> = {
  NEW: "border-amber-200 bg-amber-50 text-amber-700",
  MODIFIED: "border-blue-200 bg-blue-50 text-blue-700",
  DELETED: "border-rose-200 bg-rose-50 text-rose-700",
  LIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const ITEM_STATUS_STYLES: Record<PolicyRow["status"], string> = {
  NEW: "border-amber-200 bg-amber-50 text-amber-700",
  MODIFIED: "border-blue-200 bg-blue-50 text-blue-700",
  DELETED: "border-rose-200 bg-rose-50 text-rose-700",
  LIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

type PolicyListResponse = {
  items: PolicyRow[];
  refreshed_at?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function formatLineDelta(current: number, prev: number | null) {
  if (prev === null || prev === undefined) return null;
  const diff = current - prev;
  return diff;
}

export function PolicySettingsPanel() {
  const [items, setItems] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    stage: string;
  } | null>(null);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      return a.file_name.localeCompare(b.file_name);
    });
  }, [items]);

  const progressPercent = useMemo(() => {
    if (!progress || progress.total === 0) return 0;
    return Math.min(100, Math.round((progress.current / progress.total) * 100));
  }, [progress]);

  const derivedLastSeen = useMemo(() => {
    if (items.length === 0) return null;
    const timestamps = items
      .map((item) => new Date(item.last_seen_at).getTime())
      .filter((value) => Number.isFinite(value));
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PolicyListResponse>("/api/admin/policies");
      setItems(res.items || []);
      setLastRefreshedAt(res.refreshed_at || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "\uAC80\uC0C9 \uC2E4\uD328");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setProgress(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("UNAUTHORIZED");
      }
      const res = await fetch("/api/admin/policies?stream=1", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText || "REQUEST_FAILED");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done ?? false;
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
        let newlineIdx = buffer.indexOf("\n");
        while (newlineIdx >= 0) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (line) {
            const payload = JSON.parse(line) as
              | { type: "start"; total: number }
              | { type: "file"; index: number; total: number; file_name: string; stage: string }
              | { type: "done"; total: number }
              | { type: "result"; items: PolicyRow[]; refreshed_at: string }
              | { type: "error"; message: string };
            if (payload.type === "start") {
              setProgress({
                current: 0,
                total: payload.total,
                fileName: "",
                stage: "start",
              });
            } else if (payload.type === "file") {
              setProgress({
                current: payload.index,
                total: payload.total,
                fileName: payload.file_name,
                stage: payload.stage,
              });
            } else if (payload.type === "result") {
              setItems(payload.items || []);
              setLastRefreshedAt(payload.refreshed_at || null);
            } else if (payload.type === "error") {
              setError(payload.message || "\uC11C\uBC84 \uAC31\uC2E0\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
            }
          }
          newlineIdx = buffer.indexOf("\n");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "\uC11C\uBC84 \uAC31\uC2E0\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setRefreshing(false);
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Runtime Policies</div>
            <p className="mt-1 text-sm text-slate-500">
              {"\uC81C\uC791 \uC911 \uC815\uCC45 \uD604\uD669\uC744 \uD45C\uC2DC\uD569\uB2C8\uB2E4. LIVE / MODIFIED / NEW / DELETED \uAD6C\uBD84\uC744 \uD3EC\uD568\uD569\uB2C8\uB2E4."}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {"\uCD5C\uC885 \uAC31\uC2E0"}: {formatDate(lastRefreshedAt || derivedLastSeen)}
            </p>
            {progress ? (
              <div className="mt-2 text-xs text-slate-500">
                {"\uC9C4\uD589"}: {progress.current}/{progress.total}{" "}
                {progress.fileName ? `- ${progress.fileName}` : ""} (
                {progress.stage === "summarize" ? "\uC694\uC57D \uC0DD\uC131" : "\uBD84\uC11D \uC911"})
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-slate-800 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <Button onClick={refresh} disabled={refreshing || loading}>
            {refreshing ? "\uAC31\uC2E0 \uC911..." : "\uAC31\uC2E0"}
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </Card>

      {loading ? (
        <Card className="p-4 text-sm text-slate-500">{"\uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..."}</Card>
      ) : sortedItems.length === 0 ? (
        <Card className="p-4 text-sm text-slate-500">
          {"\uB4F1\uB85D\uB41C \uC815\uCC45\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uAC31\uC2E0\uC744 \uC2E4\uD589\uD558\uC5EC \uB85C\uB4DC\uD574 \uC8FC\uC138\uC694."}
        </Card>
      ) : (
        sortedItems.map((item) => {
          const exportsList = Array.isArray(item.exports) ? item.exports : [];
          const details = item.details_ko || {};
          const detailItemsRaw = Array.isArray(details.items) ? details.items : [];
          const detailItems = [...detailItemsRaw].sort((a, b) => {
            const aStatus = (a?.status as PolicyRow["status"]) || "LIVE";
            const bStatus = (b?.status as PolicyRow["status"]) || "LIVE";
            const statusDiff = STATUS_ORDER[aStatus] - STATUS_ORDER[bStatus];
            if (statusDiff !== 0) return statusDiff;
            const aName = String(a?.name || "");
            const bName = String(b?.name || "");
            return aName.localeCompare(bName);
          });
          const overview = typeof details.overview === "string" && details.overview.trim()
            ? details.overview
            : item.summary_ko;
          const delta = formatLineDelta(item.line_count, item.prev_line_count);
          return (
            <Card key={item.path} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.file_name}</div>
                  <div className="text-xs text-slate-500">{item.path}</div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-xs font-semibold",
                    STATUS_STYLES[item.status]
                  )}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{overview}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{"\uC904 \uC218"} {item.line_count}</span>
                {delta !== null && delta !== 0 ? <span>{`(${delta > 0 ? "+" : ""}${delta})`}</span> : null}
                <span>{"\uCD5C\uC885 \uC218\uC815"} {formatDate(item.updated_at)}</span>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                {detailItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-slate-700">{"\uC0C1\uC138 \uC815\uBCF4"}</div>
                    {detailItems.map((detail, idx) => {
                      const name = detail?.name || `\uD56D\uBAA9 ${idx + 1}`;
                      const role = detail?.role || "\uC124\uBA85 \uC5C6\uC74C";
                      const impact = detail?.impact ? `?곹뼢: ${detail.impact}` : "";
                      const status = (detail as { status?: PolicyRow["status"] }).status || "LIVE";
                      return (
                        <div key={`${item.path}-${name}-${idx}`} className="rounded-md bg-slate-50 p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold text-slate-700">{name}</div>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                ITEM_STATUS_STYLES[status]
                              )}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">{role}</div>
                          {impact ? <div className="text-[11px] text-slate-500">{impact}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span>{"\uC0C1\uC138 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uAC31\uC2E0\uC744 \uC2E4\uD589\uD558\uC5EC \uC0C8\uB85C \uBD88\uB7EC\uC624\uC138\uC694."}</span>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                {exportsList.length > 0 ? `exports: ${exportsList.join(", ")}` : "exports: \uC5C6\uC74C"}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
