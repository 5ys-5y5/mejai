"use client";

import type { ReactNode } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
  contentClassName?: string;
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
  contentClassName,
}: CollapsibleSectionProps) {
  return (
    <details className={cn("group", className)} open={defaultOpen}>
      <summary
        className={cn(
          "list-none cursor-pointer select-none",
          summaryClassName
        )}
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs text-slate-800 h-12">
          <span className="inline-flex min-w-0 flex-1 items-center justify-start text-left font-semibold">{title}</span>
          <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>
      <div className={cn("mt-2", contentClassName)}>{children}</div>
    </details>
  );
}
