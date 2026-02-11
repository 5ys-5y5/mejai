"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ConversationSplitLayout({
  leftPanel,
  rightPanel,
  className,
  leftClassName,
  rightClassName,
}: {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
}) {
  return (
    <div panel-lego="ConversationSplitLayout" className={cn("grid items-stretch gap-0 lg:grid-cols-[1fr_1.2fr]", className)}>
      <div className={cn(leftClassName)}>{leftPanel}</div>
      <div className={cn("h-full", rightClassName)}>{rightPanel}</div>
    </div>
  );
}

export function ConversationSetupPanel({
  children,
  className,
  contentClassName,
  contentStyle,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}) {
  return (
    <div panel-lego="ConversationSetupPanel" className={cn("rounded-xl border border-zinc-200 bg-white", className)}>
      <div className={contentClassName} style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
