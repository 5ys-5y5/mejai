"use client";

import type { ReactNode } from "react";
import type { WidgetConversationTab } from "@/components/design-system/widget/WidgetUI.parts";
import { cn } from "@/lib/utils";

export type WidgetConversationPreviewPanel = {
  tab: WidgetConversationTab;
  label: string;
  enabled: boolean;
  visibility: string;
  src?: string;
  frameKey?: string;
  body?: ReactNode;
  unavailableTitle?: string;
  unavailableDetail?: string;
};

type WidgetConversationPreviewCardProps = {
  panels: WidgetConversationPreviewPanel[];
  selectedTab: WidgetConversationTab;
  onSelectTab: (tab: WidgetConversationTab) => void;
  title?: string;
  frameClassName?: string;
  emptyState?: ReactNode;
};

export function WidgetConversationPreviewCard({
  panels,
  selectedTab,
  onSelectTab,
  title = "위젯 UI 프리뷰",
  frameClassName,
  emptyState,
}: WidgetConversationPreviewCardProps) {
  const selectedPanel = panels.find((panel) => panel.tab === selectedTab) || panels[0] || null;

  return (
    <div className="space-y-3">
      <div className="grid w-full grid-cols-4 gap-2">
        {panels.map((panel) => (
          <button
            key={panel.tab}
            type="button"
            onClick={() => onSelectTab(panel.tab)}
            className={cn(
              "w-full rounded-full border px-3 py-1.5 text-center text-[11px] font-semibold transition",
              selectedTab === panel.tab
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {panel.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-xs font-semibold text-slate-700">{title}</div>
        {selectedPanel ? (
          <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] font-semibold">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5",
                selectedPanel.enabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              )}
            >
              {selectedPanel.enabled ? "ON" : "OFF"}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
              {selectedPanel.visibility}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={cn("h-[560px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white", frameClassName)}
      >
        {!selectedPanel ? (
          emptyState || <div className="flex h-full items-center justify-center text-xs text-slate-400">표시할 프리뷰가 없습니다.</div>
        ) : selectedPanel.body ? (
          selectedPanel.body
        ) : selectedPanel.enabled && selectedPanel.src ? (
          <iframe
            key={selectedPanel.frameKey || `${selectedPanel.tab}:${selectedPanel.src}`}
            title={`Widget ${selectedPanel.label} Preview`}
            src={selectedPanel.src}
            className="h-full w-full"
            allow="clipboard-write"
            style={{ border: "none" }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-xs text-slate-400">
            <span>{selectedPanel.unavailableTitle || (selectedPanel.enabled ? "미리보기를 불러올 수 없습니다." : "비활성화됨")}</span>
            <span className="text-[11px] text-slate-300">
              {selectedPanel.unavailableDetail || `visibility: ${selectedPanel.visibility}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
