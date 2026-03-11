"use client";

import { useEffect, useState } from "react";

const HOME_POLICY_CONTAINER_ID = "home-widget-policy";
const HOME_CHAT_CONTAINER_ID = "home-widget-chat";
const WIDGET_TEMPLATE_ID = "c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc";
const WIDGET_TEMPLATE_PUBLIC_KEY = "mw_pk_259a616db581a5f66d4aa2f9cd14e322";

export function HomeWidgetInstallBox() {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const hasConfig = Boolean(WIDGET_TEMPLATE_ID && WIDGET_TEMPLATE_PUBLIC_KEY);

  useEffect(() => {
    if (!hasConfig) {
      setError("WIDGET_CONFIG_MISSING");
      setLoading(false);
      return;
    }
    if (typeof window === "undefined") return;
    if (error) return;
    setLoading(false);

    const origin = window.location.origin;
    const pageUrl = window.location.href;
    const referrer = document.referrer || "";

    const baseConfig = {
      widget_id: WIDGET_TEMPLATE_ID,
      public_key: WIDGET_TEMPLATE_PUBLIC_KEY,
      entry_mode: "embed",
      preview: false,
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
  }, [error, hasConfig]);

  return (
    <div className="container mx-auto w-full max-w-md px-6">
      <div className="flex w-full flex-col -space-y-[30px] overflow-hidden rounded-2xl border border-slate-200">
        <div className="w-full overflow-hidden">
          {loading ? (
            <div className="flex h-[210px] items-center justify-center text-sm text-zinc-500">위젯 로딩 중...</div>
          ) : null}
          {!loading && error ? (
            <div className="flex h-[210px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
              <span>위젯을 불러오지 못했습니다.</span>
              <span className="text-[11px] text-zinc-500">{error}</span>
            </div>
          ) : null}
          {!loading && !error ? (
            <div id={HOME_POLICY_CONTAINER_ID} className="min-h-[250px] w-full overflow-hidden" />
          ) : null}
        </div>

        <div className="w-full overflow-hidden">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-zinc-500">위젯 로딩 중...</div>
          ) : null}
          {!loading && error ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-sm text-rose-600">
              <span>위젯을 불러오지 못했습니다.</span>
              <span className="text-[11px] text-zinc-500">{error}</span>
            </div>
          ) : null}
          {!loading && !error ? (
            <div id={HOME_CHAT_CONTAINER_ID} className="w-full overflow-hidden" style={{ height: 300 }} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
