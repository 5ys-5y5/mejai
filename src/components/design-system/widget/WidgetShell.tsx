"use client";

import type { ReactNode } from "react";
import { ConversationModelChatColumnLego, type ConversationModelChatColumnLegoProps } from "@/components/design-system/conversation/ConversationUI.parts";
import { WidgetHeaderLego } from "@/components/design-system/widget/WidgetUI.parts";
import { cn } from "@/lib/utils";

export type WidgetShellProps = {
  brandName: string;
  status: string;
  iconUrl?: string | null;
  headerActions?: ReactNode;
  onNewConversation?: () => void;
  showNewConversation?: boolean;
  chatLegoProps: ConversationModelChatColumnLegoProps;
  className?: string;
};

export function WidgetShell({
  brandName,
  status,
  iconUrl,
  headerActions,
  onNewConversation,
  showNewConversation,
  chatLegoProps,
  className,
}: WidgetShellProps) {
  const canStartNew = typeof showNewConversation === "boolean" ? showNewConversation : Boolean(onNewConversation);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <WidgetHeaderLego
        brandName={brandName}
        status={status}
        iconUrl={iconUrl}
        headerActions={headerActions}
        onNewConversation={onNewConversation}
        showNewConversation={canStartNew}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ConversationModelChatColumnLego {...chatLegoProps} />
      </div>
    </div>
  );
}
