"use client";

import { useEffect, useState } from "react";

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

const HOME_POLICY_CONTAINER_ID = "home-widget-policy";
const HOME_CHAT_CONTAINER_ID = "home-widget-chat";

export function HomeWidgetInstallBox() {
  const [widget, setWidget] = useState<PublicWidgetItem | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/public-widgets?widget_id=c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc`)
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
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!widget?.public_key || !widgetId || error) return;

    const origin = window.location.origin;
    const pageUrl = window.location.href;
    const referrer = document.referrer || "";

    const baseConfig = {
      widget_id: widgetId,
      public_key: widget.public_key,
      entry_mode: "embed",
      preview: true,
      preview_meta: {
        origin,
        page_url: pageUrl,
        referrer,
      },
    };

    const configs = [
      {
        ...baseConfig,
        tab: "policy",
        mount_target: `#${HOME_POLICY_CONTAINER_ID}`,
      },
      {
        ...baseConfig,
        tab: "chat",
        mount_target: `#${HOME_CHAT_CONTAINER_ID}`,
      },
    ];

    const scopedWindow = window as Window & { mejaiWidget?: unknown; __mejaiWidgetMount?: (input?: unknown) => void };
    scopedWindow.mejaiWidget = configs;

    if (typeof scopedWindow.__mejaiWidgetMount === "function") {
      scopedWindow.__mejaiWidgetMount(configs);
      return;
    }

    if (!document.querySelector('script[data-mejai-widget-loader="1"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "/widget.js";
      script.setAttribute("data-mejai-widget-loader", "1");
      document.body.appendChild(script);
    }
  }, [widget?.public_key, widgetId, error]);

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
          {!loading && !error ? (
            <div id={HOME_POLICY_CONTAINER_ID} className="h-[500px] w-full" />
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
          {!loading && !error ? (
            <div id={HOME_CHAT_CONTAINER_ID} className="h-[500px] w-full" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
