"use client";

import { type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WidgetHeaderLego } from "@/components/design-system/widget/WidgetUI.parts";
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
  children?: ReactNode;
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
  children,
  fill = true,
  className,
}: WidgetShellProps) {
  return (
    <div
      className={cn(
        fill ? "min-h-screen" : "h-full",
        "w-full bg-slate-50 text-slate-900 flex flex-col",
        className
      )}
    >
      <WidgetHeaderLego
        brandName={brandName}
        status={status}
        iconUrl={iconUrl}
        headerActions={headerActions}
        onNewConversation={onNewConversation}
        showNewConversation={Boolean(onNewConversation)}
      />
      {children ? (
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
