"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
  layoutClassName?: string;
};

export function ConversationPageShell({
  leftPanel,
  rightPanel,
  className,
  leftClassName,
  rightClassName,
  layoutClassName,
}: Props) {
  return (
    <div className={cn("grid items-stretch gap-0 lg:grid-cols-[1fr_1.2fr]", className, layoutClassName)}>
      <div className={cn(leftClassName)}>{leftPanel}</div>
      <div className={cn("h-full", rightClassName)}>{rightPanel}</div>
    </div>
  );
}
