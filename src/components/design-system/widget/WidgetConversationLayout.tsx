"use client";

import type { ReactNode } from "react";
import { WidgetShell, type WidgetShellProps } from "@/components/design-system/widget/WidgetShell";
import {
  WidgetHistoryPanelLego,
  WidgetTabBarLego,
  type WidgetConversationSession,
  type WidgetConversationTab,
} from "@/components/design-system/widget/WidgetUI.parts";
import type { ChatMessage } from "@/lib/conversation/client/laboratoryPageState";

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
            <WidgetHistoryPanelLego
              sessions={sessions}
              sessionsLoading={sessionsLoading}
              sessionsError={sessionsError}
              selectedSessionId={selectedSessionId}
              onSelectSession={onSelectSession}
              historyMessages={historyMessages}
              historyLoading={historyLoading}
            />
          ) : null}
          {activeTab === "policy" ? (
            showPolicyTab ? (
              <div className="h-full">{policyPanel}</div>
            ) : (
              fallbackPanel
            )
          ) : null}
        </div>
        <WidgetTabBarLego activeTab={activeTab} onTabChange={onTabChange} showPolicyTab={showPolicyTab} />
      </div>
    </WidgetShell>
  );
}
