"use client";

import { Bot, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BaseMessage = {
  id: string;
  role: "user" | "bot";
};

type AvatarSelectionStyle = "none" | "bot" | "both";

type Props<T extends BaseMessage> = {
  messages: T[];
  selectedMessageIds: string[];
  selectionEnabled: boolean;
  onToggleSelection: (messageId: string) => void;
  renderContent: (msg: T, ctx: { isLatest: boolean; isSelected: boolean }) => ReactNode;
  renderAfterBubble?: (msg: T, ctx: { isLatest: boolean; isSelected: boolean }) => ReactNode;
  renderMeta?: (msg: T) => ReactNode;
  className?: string;
  rowSelectedClassName?: string;
  bubbleBaseClassName?: string;
  userBubbleClassName?: string;
  botBubbleClassName?: string;
  avatarSelectionStyle?: AvatarSelectionStyle;
};

export function ConversationThread<T extends BaseMessage>({
  messages,
  selectedMessageIds,
  selectionEnabled,
  onToggleSelection,
  renderContent,
  renderAfterBubble,
  renderMeta,
  className,
  rowSelectedClassName = "rounded-xl bg-amber-200 px-1 py-1",
  bubbleBaseClassName = "relative whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm transition",
  userBubbleClassName = "bg-slate-900 text-white",
  botBubbleClassName = "bg-slate-100 text-slate-700 border border-slate-200",
  avatarSelectionStyle = "none",
}: Props<T>) {
  const latestVisibleMessageId = messages[messages.length - 1]?.id || "";
  return (
    <>
      {messages.map((msg, index) => {
        const prev = messages[index - 1];
        const isGrouped = prev?.role === msg.role;
        const rowGap = "gap-3";
        const rowSpacing = index === 0 ? "" : isGrouped ? "mt-1" : "mt-3";
        const showAvatar = !isGrouped;
        const isLatest = msg.id === latestVisibleMessageId;
        const isSelected = selectedMessageIds.includes(msg.id);
        const showBotCheck = avatarSelectionStyle === "bot" || avatarSelectionStyle === "both";
        const showUserCheck = avatarSelectionStyle === "both";
        return (
          <div
            key={msg.id}
            className={cn(
              "flex",
              rowGap,
              rowSpacing,
              msg.role === "user" ? "justify-end" : "justify-start",
              selectionEnabled && isSelected && rowSelectedClassName,
              className
            )}
          >
            {msg.role === "bot" && showAvatar ? (
              <div
                className={cn(
                  "h-8 w-8 rounded-full border flex items-center justify-center",
                  isSelected && showBotCheck ? "border-slate-900 bg-slate-900" : "border-slate-200 bg-white"
                )}
              >
                {isSelected && showBotCheck ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-slate-500" />
                )}
              </div>
            ) : msg.role === "bot" ? (
              <div className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0" aria-hidden="true" />
            ) : null}

            <div className="relative max-w-[75%]">
              <div
                onClick={() => {
                  if (selectionEnabled) onToggleSelection(msg.id);
                }}
                className={cn(
                  bubbleBaseClassName,
                  selectionEnabled ? "cursor-pointer" : "cursor-default",
                  msg.role === "user" ? userBubbleClassName : botBubbleClassName
                )}
              >
                {renderContent(msg, { isLatest, isSelected })}
              </div>
              {renderAfterBubble ? renderAfterBubble(msg, { isLatest, isSelected }) : null}
              {renderMeta ? renderMeta(msg) : null}
            </div>

            {msg.role === "user" && showAvatar ? (
              <div
                className={cn(
                  "h-8 w-8 rounded-full border flex items-center justify-center",
                  isSelected && showUserCheck ? "border-slate-900 bg-slate-900" : "border-slate-200 bg-white"
                )}
              >
                {isSelected && showUserCheck ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-slate-500" />
                )}
              </div>
            ) : msg.role === "user" ? (
              <div className="h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0" aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </>
  );
}
