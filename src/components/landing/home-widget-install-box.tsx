"use client";

import { useEffect, useMemo, useState } from "react";

const HOME_WIDGET_PAGE_KEY = "/";

type PublicWidgetItem = {
  id: string;
  name?: string | null;
  template_id: string;
  public_key: string;
};

type PublicWidgetResponse = {
  item?: PublicWidgetItem | null;
  error?: string | null;
};

function buildEmbedSrc(publicKey: string) {
  const key = encodeURIComponent(`public_key=${publicKey}`);
  return `/embed/${key}?preview=1`;
}

export function HomeWidgetInstallBox() {
  const [widget, setWidget] = useState<PublicWidgetItem | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/public-widgets?page_key=${encodeURIComponent(HOME_WIDGET_PAGE_KEY)}&name=home`)
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

  const iframeSrc = useMemo(() => (widget?.public_key ? buildEmbedSrc(widget.public_key) : ""), [widget]);

  return (
    <div className="mt-10 rounded-[28px] border border-zinc-200 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.32em] text-zinc-500">Home Widget</div>
          <div className="mt-2 text-lg font-semibold text-zinc-900">B_chat_widgets 홈 템플릿</div>
        </div>
        <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] text-zinc-500">
          page_key: {HOME_WIDGET_PAGE_KEY}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
        {loading ? (
          <div className="flex h-[520px] items-center justify-center text-sm text-zinc-500">위젯 로딩 중...</div>
        ) : null}
        {!loading && error ? (
          <div className="flex h-[520px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
            <span>위젯을 불러오지 못했습니다.</span>
            <span className="text-[11px] text-zinc-500">{error}</span>
          </div>
        ) : null}
        {!loading && !error && iframeSrc ? (
          <iframe
            title={widget?.name || "Home Widget"}
            src={iframeSrc}
            className="h-[520px] w-full"
            style={{ border: "none" }}
            allow="clipboard-write"
          />
        ) : null}
      </div>
    </div>
  );
}
