"use client";

import type { ReactNode } from "react";
import { ConversationModelChatColumnLego, type ConversationModelChatColumnLegoProps, ConversationModelSetupColumnLego, type ConversationModelSetupColumnLegoProps } from "@/components/design-system/conversation/ConversationUI.parts";
import {
  WidgetHeaderLego,
  WidgetHistoryPanelLego,
  WidgetTabBarLego,
  type WidgetConversationSession,
  type WidgetConversationTab,
} from "@/components/design-system/widget/WidgetUI.parts";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/conversation/client/laboratoryPageState";

export type WidgetConversationLayoutProps = {
  brandName: string;
  status: string;
  iconUrl?: string | null;
  headerActions?: ReactNode;
  onNewConversation?: () => void;
  showNewConversation?: boolean;
  chatLegoProps: ConversationModelChatColumnLegoProps;
  setupLegoProps: ConversationModelSetupColumnLegoProps;
  activeTab: WidgetConversationTab;
  onTabChange: (tab: WidgetConversationTab) => void;
  showPolicyTab?: boolean;
  policyFallback?: ReactNode;
  sessions: WidgetConversationSession[];
  sessionsLoading?: boolean;
  sessionsError?: string;
  selectedSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  historyMessages: ChatMessage[];
  historyLoading?: boolean;
  fill?: boolean;
  className?: string;
};

export function WidgetConversationLayout({
  brandName,
  status,
  iconUrl,
  headerActions,
  onNewConversation,
  showNewConversation,
  chatLegoProps,
  setupLegoProps,
  activeTab,
  onTabChange,
  showPolicyTab = false,
  policyFallback,
  sessions,
  sessionsLoading = false,
  sessionsError = "",
  selectedSessionId,
  onSelectSession,
  historyMessages,
  historyLoading = false,
  fill = true,
  className,
}: WidgetConversationLayoutProps) {
  const fallbackPanel = policyFallback ? (
    policyFallback
  ) : (
    <div className="flex h-full items-center justify-center bg-white text-sm text-slate-500">
      접근 권한이 없습니다.
    </div>
  );
  const canStartNew = typeof showNewConversation === "boolean" ? showNewConversation : Boolean(onNewConversation);

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
        showNewConversation={canStartNew}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "chat" ? <ConversationModelChatColumnLego {...chatLegoProps} /> : null}
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
        {activeTab === "policy" ? (showPolicyTab ? <ConversationModelSetupColumnLego {...setupLegoProps} /> : fallbackPanel) : null}
      </div>
      <WidgetTabBarLego activeTab={activeTab} onTabChange={onTabChange} showPolicyTab={showPolicyTab} />
    </div>
  );
}
