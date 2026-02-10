"use client";

import type { ReactNode } from "react";
import { CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConversationGrid({
  columns,
  children,
  className,
}: {
  columns: number;
  children: ReactNode;
  className?: string;
}) {
  const safeColumns = Math.max(1, columns || 1);
  return (
    <div
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function ConversationQuickReplyButton({
  label,
  picked,
  disabled,
  onClick,
}: {
  label: string;
  picked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-xs font-semibold",
        picked
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      {label}
    </button>
  );
}

export function ConversationConfirmButton({
  enabled,
  disabled,
  onClick,
  className,
}: {
  enabled: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="선택 확인"
      title="선택 확인"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
        enabled
          ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
          : "border-slate-300 bg-slate-100 text-slate-400",
        "disabled:cursor-not-allowed disabled:opacity-80",
        className
      )}
    >
      <CornerDownRight className="h-4 w-4" />
    </button>
  );
}

export type ConversationProductCardItem = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  value: string;
};

export function ConversationProductCard({
  item,
  picked,
  disabled,
  onClick,
}: {
  item: ConversationProductCardItem;
  picked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex w-full flex-col rounded-xl border bg-white p-2 text-left hover:bg-slate-50",
        picked ? "border-slate-900 ring-2 ring-slate-300" : "border-slate-300",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
        {item.value}
      </span>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.title} className="h-24 w-full rounded-md bg-slate-100 object-cover" />
      ) : (
        <div className="flex h-24 w-full items-center justify-center rounded-md bg-slate-100 text-[11px] text-slate-500">
          이미지 없음
        </div>
      )}
      <div
        className="mt-2 flex h-10 items-start justify-center overflow-hidden whitespace-normal break-keep text-center text-xs font-semibold leading-5 text-slate-700"
        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
      >
        {item.title}
      </div>
      {item.subtitle ? (
        <div
          className="mt-0.5 overflow-hidden whitespace-normal break-keep text-center text-[11px] leading-4 text-slate-500"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
        >
          {item.subtitle}
        </div>
      ) : null}
    </button>
  );
}

