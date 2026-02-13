"use client";

import type { ReactNode } from "react";
import { List, MessageCircle, Shield } from "lucide-react";
import { WidgetShell, type WidgetShellProps } from "@/components/design-system/widget/WidgetShell";
import { ConversationThread } from "@/components/design-system/conversation/ConversationUI.parts";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/conversation/client/laboratoryPageState";

export type WidgetConversationTab = "chat" | "list" | "policy";

export type WidgetConversationSession = {
  id: string;
  session_code?: string | null;
  started_at?: string | null;
};

export type WidgetConversationLayoutProps = Omit<WidgetShellProps, "children"> & {
  activeTab: WidgetConversationTab;
  onTabChange: (tab: WidgetConversationTab) => void;
  showPolicyTab?: boolean;
  chatPanel: ReactNode;
  policyPanel?: ReactNode;
  policyFallback?: ReactNode;
  sessions: WidgetConversationSession[];
  sessionsLoading?: boolean;
  sessionsError?: string;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  historyMessages: ChatMessage[];
  historyLoading?: boolean;
};

function formatSessionTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function WidgetConversationLayout({
  activeTab,
  onTabChange,
  showPolicyTab = false,
  chatPanel,
  policyPanel,
  policyFallback,
  sessions,
  sessionsLoading = false,
  sessionsError = "",
  selectedSessionId,
  onSelectSession,
  historyMessages,
  historyLoading = false,
  ...shellProps
}: WidgetConversationLayoutProps) {
  const tabGridClass = showPolicyTab ? "grid-cols-3" : "grid-cols-2";
  const fallbackPanel = policyFallback ? (
    policyFallback
  ) : (
    <div className="flex h-full items-center justify-center bg-white text-sm text-slate-500">
      접근 권한이 없습니다.
    </div>
  );

  return (
    <WidgetShell {...shellProps}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex-1 min-h-0">
          {activeTab === "chat" ? <div className="h-full">{chatPanel}</div> : null}
          {activeTab === "list" ? (
            <div className="h-full min-h-0 flex flex-col bg-white">
              <div className="border-b border-slate-200 px-4 py-2 text-[11px] text-slate-500">
                과거 대화 목록
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="max-h-44 overflow-auto border-b border-slate-200 bg-slate-50 px-2 py-2">
                  {sessionsLoading ? (
                    <div className="px-2 py-2 text-xs text-slate-500">불러오는 중...</div>
                  ) : sessionsError ? (
                    <div className="px-2 py-2 text-xs text-rose-500">{sessionsError}</div>
                  ) : sessions.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-slate-500">대화 기록이 없습니다.</div>
                  ) : (
                    <div className="space-y-1">
                      {sessions.map((session) => {
                        const isActive = session.id === selectedSessionId;
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => onSelectSession?.(session.id)}
                            className={cn(
                              "w-full rounded-md border px-2 py-1 text-left text-xs",
                              isActive
                                ? "border-slate-900 bg-white text-slate-900"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                            )}
                          >
                            <div className="font-semibold">
                              {session.session_code || session.id.slice(0, 8)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatSessionTime(session.started_at)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-auto bg-slate-50 px-4 py-4">
                  {historyLoading ? (
                    <div className="text-xs text-slate-500">대화를 불러오는 중...</div>
                  ) : historyMessages.length === 0 ? (
                    <div className="text-xs text-slate-500">선택된 대화가 없습니다.</div>
                  ) : (
                    <ConversationThread
                      messages={historyMessages}
                      selectedMessageIds={[]}
                      selectionEnabled={false}
                      onToggleSelection={() => undefined}
                      renderContent={(msg) => msg.content}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : null}
          {activeTab === "policy" ? (
            showPolicyTab ? (
              <div className="h-full">{policyPanel}</div>
            ) : (
              fallbackPanel
            )
          ) : null}
        </div>
        <div className={cn("grid gap-2 border-t border-slate-200 bg-white px-3 py-2", tabGridClass)}>
          <button
            type="button"
            onClick={() => onTabChange("chat")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold",
              activeTab === "chat" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            <span>대화</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("list")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold",
              activeTab === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <List className="h-4 w-4" />
            <span>리스트</span>
          </button>
          {showPolicyTab ? (
            <button
              type="button"
              onClick={() => onTabChange("policy")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold",
                activeTab === "policy"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <Shield className="h-4 w-4" />
              <span>정책</span>
            </button>
          ) : null}
        </div>
      </div>
    </WidgetShell>
  );
}
