"use client";

import { AlertTriangle, Copy, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  selectionEnabled: boolean;
  onToggleSelection: () => void;
  showLogs: boolean;
  onToggleLogs: () => void;
  onCopyConversation: () => void;
  onCopyIssue: () => void;
  showSelectionToggle?: boolean;
  showLogsToggle?: boolean;
  showConversationCopy?: boolean;
  showIssueCopy?: boolean;
  disableCopy?: boolean;
  className?: string;
};

export function ConversationAdminMenu({
  open,
  onToggleOpen,
  selectionEnabled,
  onToggleSelection,
  showLogs,
  onToggleLogs,
  onCopyConversation,
  onCopyIssue,
  showSelectionToggle = true,
  showLogsToggle = true,
  showConversationCopy = true,
  showIssueCopy = true,
  disableCopy = false,
  className,
}: Props) {
  return (
    <div className={cn("absolute right-0 top-0 z-20", className)}>
      <button
        type="button"
        onClick={onToggleOpen}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="로그 설정"
        title="로그 설정"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-1 w-36 rounded-md border border-slate-200 bg-white p-1.5 shadow-sm">
          {showSelectionToggle ? (
            <button
              type="button"
              onClick={onToggleSelection}
              className={cn(
                "mb-1 w-full rounded-md border px-2 py-1 text-[11px] font-semibold",
                selectionEnabled ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"
              )}
            >
              선택 {selectionEnabled ? "ON" : "OFF"}
            </button>
          ) : null}
          {showLogsToggle ? (
            <button
              type="button"
              onClick={onToggleLogs}
              className={cn(
                "w-full rounded-md border px-2 py-1 text-[11px] font-semibold",
                showLogs ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"
              )}
            >
              로그 {showLogs ? "ON" : "OFF"}
            </button>
          ) : null}
          {showConversationCopy || showIssueCopy ? <div className="my-1 border-t border-slate-100" /> : null}
          {showConversationCopy ? (
            <button
              type="button"
              onClick={onCopyConversation}
              disabled={disableCopy}
              className="mb-1 inline-flex w-full items-center justify-between rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <span>대화 복사</span>
              <Copy className="h-3 w-3" />
            </button>
          ) : null}
          {showIssueCopy ? (
            <button
              type="button"
              onClick={onCopyIssue}
              disabled={disableCopy}
              className="inline-flex w-full items-center justify-between rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              <span>문제 로그 복사</span>
              <AlertTriangle className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
