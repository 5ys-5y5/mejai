"use client";

import { useEffect, useMemo, useState } from "react";

type PublicWidgetItem = {
  id: string;
  name?: string | null;
  widget_id?: string | null;
  public_key: string;
};

type PublicWidgetResponse = {
  item?: PublicWidgetItem | null;
  error?: string | null;
};

function buildEmbedSrc(widgetId: string, publicKey: string, tab?: "policy" | "chat") {
  const params = new URLSearchParams({ public_key: publicKey, preview: "1" });
  if (tab) params.set("tab", tab);
  return `/embed/widget_id=${encodeURIComponent(widgetId)}?${params.toString()}`;
}

export function HomeWidgetInstallBox() {
  const [widget, setWidget] = useState<PublicWidgetItem | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/public-widgets?name=home`)
      .then((res) =>
        res
          .json()
          .then((data) => ({ ok: res.ok, data }))
          .catch(() => ({ ok: res.ok, data: {} }))
      )
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) {
          setError(String((data as PublicWidgetResponse)?.error || "WIDGET_LOAD_FAILED"));
          setWidget(null);
          setLoading(false);
          return;
        }
        const item = (data as PublicWidgetResponse)?.item || null;
        if (!item || !item.public_key) {
          setError("WIDGET_NOT_FOUND");
          setWidget(null);
          setLoading(false);
          return;
        }
        setWidget(item);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("WIDGET_LOAD_FAILED");
        setWidget(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const widgetId = widget?.widget_id || widget?.id || "";
  const policySrc = useMemo(
    () => (widget?.public_key && widgetId ? buildEmbedSrc(widgetId, widget.public_key, "policy") : ""),
    [widget?.public_key, widgetId]
  );
  const chatSrc = useMemo(
    () => (widget?.public_key && widgetId ? buildEmbedSrc(widgetId, widget.public_key, "chat") : ""),
    [widget?.public_key, widgetId]
  );

  return (
    <div className="container mx-auto w-full max-w-6xl px-6">
      <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-2">
        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
          {loading ? (
            <div className="flex h-[500px] items-center justify-center text-sm text-zinc-500">위젯 로딩 중...</div>
          ) : null}
          {!loading && error ? (
            <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
              <span>위젯을 불러오지 못했습니다.</span>
              <span className="text-[11px] text-zinc-500">{error}</span>
            </div>
          ) : null}
          {!loading && !error && policySrc ? (
            <iframe
              title={`${widget?.name || "Home Widget"} (policy)`}
              src={policySrc}
              className="h-[500px] w-full"
              style={{ border: "none" }}
              allow="clipboard-write"
            />
          ) : null}
        </div>
        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
          {loading ? (
            <div className="flex h-[500px] items-center justify-center text-sm text-zinc-500">위젯 로딩 중...</div>
          ) : null}
          {!loading && error ? (
            <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
              <span>위젯을 불러오지 못했습니다.</span>
              <span className="text-[11px] text-zinc-500">{error}</span>
            </div>
          ) : null}
          {!loading && !error && chatSrc ? (
            <iframe
              title={`${widget?.name || "Home Widget"} (chat)`}
              src={chatSrc}
              className="h-[500px] w-full"
              style={{ border: "none" }}
              allow="clipboard-write"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
