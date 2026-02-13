"use client";

import { type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

export type WidgetMessage = {
  id: string;
  role: "user" | "bot" | "system";
  content: string;
};

export type WidgetShellProps = {
  brandName: string;
  status: string;
  iconUrl?: string | null;
  messages: WidgetMessage[];
  inputPlaceholder?: string;
  disclaimer?: string | null;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (event: FormEvent) => void;
  onNewConversation?: () => void;
  sendDisabled?: boolean;
  scrollRef?: React.RefObject<HTMLElement | null>;
  headerActions?: ReactNode;
  inputDisabled?: boolean;
  fill?: boolean;
  className?: string;
};

export function WidgetShell({
  brandName,
  status,
  iconUrl,
  messages,
  inputPlaceholder,
  disclaimer,
  inputValue,
  onInputChange,
  onSend,
  onNewConversation,
  sendDisabled,
  scrollRef,
  headerActions,
  inputDisabled,
  fill = true,
  className,
}: WidgetShellProps) {
  const resolvedIcon = iconUrl || "/brand/logo.png";
  const showStatus = Boolean(status && status.trim().length > 0);

  return (
    <div
      className={cn(
        fill ? "min-h-screen" : "h-full",
        "w-full bg-slate-50 text-slate-900 flex flex-col",
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolvedIcon} alt="" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-semibold">{brandName}</div>
            {showStatus ? <div className="text-[11px] text-slate-500">{status}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerActions || null}
          {onNewConversation ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNewConversation}
              className="h-8 px-3 text-[11px]"
            >
              새 대화
            </Button>
          ) : null}
        </div>
      </header>
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const isSystem = msg.role === "system";
          const prev = messages[idx - 1];
          const grouped = prev?.role === msg.role;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                isSystem ? "justify-center" : isUser ? "justify-end" : "justify-start",
                grouped ? "mt-1" : "mt-2"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  isSystem
                    ? "rounded-xl bg-transparent px-0 text-[11px] text-slate-500"
                    : isUser
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-800"
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
      </main>
      <footer className="border-t border-slate-200 bg-white px-3 py-3">
        <form onSubmit={onSend} className="flex items-center gap-2">
          <Input
            placeholder={inputPlaceholder || "메시지를 입력하세요"}
            className="flex-1 h-10 rounded-full px-4"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={inputDisabled}
          />
          <Button type="submit" size="icon" className="h-10 w-10 rounded-full" disabled={sendDisabled}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {disclaimer ? <div className="mt-2 text-[10px] text-slate-500">{String(disclaimer)}</div> : null}
      </footer>
    </div>
  );
}
