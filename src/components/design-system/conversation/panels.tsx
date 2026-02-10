"use client";

import type { CSSProperties, ReactNode, WheelEvent } from "react";
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
    <div className={cn("grid items-stretch gap-0 lg:grid-cols-[1fr_1.2fr]", className)}>
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
    <div className={cn("rounded-xl border border-zinc-200 bg-white", className)}>
      <div className={contentClassName} style={contentStyle}>
        {children}
      </div>
    </div>
  );
}

export function ConversationChatPanel({
  children,
  className,
  style,
  onWheel,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onWheel?: (event: WheelEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={cn("relative h-full flex flex-col overflow-visible", className)} style={style} onWheel={onWheel}>
      {children}
    </div>
  );
}
