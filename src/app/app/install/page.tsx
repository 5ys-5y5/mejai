"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { WidgetQuickstartPanel } from "@/components/settings/WidgetQuickstartPanel";
import { WidgetSettingsPanel } from "@/components/settings/WidgetSettingsPanel";
import { EnvSettingsPanel } from "@/components/settings/EnvSettingsPanel";

type TabKey = "widget" | "quickstart" | "env";

export default function InstallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get("tab") || "widget").toLowerCase();
  const tab: TabKey = rawTab === "quickstart" || rawTab === "env" ? (rawTab as TabKey) : "widget";

  const tabs = useMemo(
    () => [
      { key: "widget", label: "채팅 위젯" },
      { key: "quickstart", label: "Quickstart" },
      { key: "env", label: "환경 변수" },
    ],
    []
  );

  return (
    <div className="px-5 md:px-8 pt-6 pb-[100px]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-b border-slate-200 pb-2">
          <nav className="flex gap-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => router.push(`/app/install?tab=${t.key}`)}
                className={cn(
                  "whitespace-nowrap rounded-xl border px-3 py-2 text-sm",
                  tab === t.key
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {tab === "widget" ? <WidgetSettingsPanel /> : null}
          {tab === "quickstart" ? <WidgetQuickstartPanel /> : null}
          {tab === "env" ? <EnvSettingsPanel /> : null}
        </div>
      </div>
    </div>
  );
}
