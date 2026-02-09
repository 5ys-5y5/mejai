"use client";

import { Copy, ExternalLink, Trash2, X } from "lucide-react";

type Props = {
  modelIndex: number;
  canRemove: boolean;
  onRemove: () => void;
  activeSessionId: string | null;
  onCopySessionId: (sessionId: string | null) => void;
  onOpenSessionInNewTab: (sessionId: string | null) => void;
  onDeleteSession: () => void;
  disableDelete: boolean;
};

export function LaboratoryModelHeader({
  modelIndex,
  canRemove,
  onRemove,
  activeSessionId,
  onCopySessionId,
  onOpenSessionInNewTab,
  onDeleteSession,
  disableDelete,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Model ${modelIndex} Remove`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="text-sm font-semibold text-slate-900">Model {modelIndex}</div>
        <div className=" flex items-center gap-2 text-xs text-slate-500">설정을 변경하면 해당 모델의 대화가 초기화됩니다.</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          className="mr-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-left text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onCopySessionId(activeSessionId)}
          disabled={!activeSessionId}
          aria-label="세션 ID 복사"
        >
          <Copy className="h-3.5 w-3.5 shrink-0" />
          {activeSessionId || "-"}
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => onOpenSessionInNewTab(activeSessionId)}
          disabled={!activeSessionId}
          aria-label="새탭 열기"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          onClick={onDeleteSession}
          disabled={disableDelete}
          aria-label="세션 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
