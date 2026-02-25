"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MatrixRainBackground } from "@/components/landing/matrix-rain-background";
import {
  createConversationModelLegos,
  ConversationModelSetupColumnLego,
  WidgetConversationLayout,
  type WidgetConversationTab,
} from "@/components/design-system";
import { useConversationPageController } from "@/lib/conversation/client/useConversationPageController";
import type { ConversationPageFeatures } from "@/lib/conversation/pageFeaturePolicy";

export function LandingConversationHero() {
  const ctrl = useConversationPageController("/");
  const [activeTabs, setActiveTabs] = useState<Record<string, WidgetConversationTab>>({});
  const createModelProps = (model: (typeof ctrl.models)[number], index: number) => ({
    index,
    modelCount: ctrl.models.length,
    model,
    pageFeatures: ctrl.pageFeatures as ConversationPageFeatures,
    setupUi: ctrl.setupUi,
    isAdminUser: ctrl.isAdminUser,
    latestAdminKbId: ctrl.latestAdminKbId,
    tools: ctrl.tools,
    toolOptions: ctrl.toolOptions,
    toolById: ctrl.toolById,
    providerByKey: ctrl.providerByKey,
    agentVersionsByGroup: ctrl.agentVersionsByGroup,
    formatKstDateTime: ctrl.formatKstDateTime,
    agentGroupOptions: ctrl.agentGroupOptions,
    llmOptions: ctrl.llmOptions,
    kbOptions: ctrl.kbOptions,
    adminKbOptions: ctrl.adminKbOptions,
    providerOptions: ctrl.providerOptions,
    routeOptions: ctrl.routeOptions,
    kbItems: ctrl.kbItems,
    inlineKbSamples: ctrl.inlineKbSamples,
    quickReplyDrafts: ctrl.quickReplyDrafts,
    lockedReplySelections: ctrl.lockedReplySelections,
    setQuickReplyDrafts: ctrl.setQuickReplyDrafts,
    setLockedReplySelections: ctrl.setLockedReplySelections,
    onRemoveModel: ctrl.handleRemoveModel,
    onCopySessionId: ctrl.handleCopySessionId,
    onOpenSessionInNewTab: ctrl.openSessionInNewTab,
    onDeleteSession: ctrl.handleDeleteSession,
    onUpdateModel: ctrl.updateModel,
    onResetModel: ctrl.resetModel,
    onSelectAgentGroup: ctrl.handleSelectAgentGroup,
    onSelectAgentVersion: ctrl.handleSelectAgentVersion,
    onSelectSession: ctrl.handleSelectSession,
    onSearchSessionById: ctrl.handleSearchSessionById,
    onChangeConversationMode: ctrl.handleChangeConversationMode,
    onCopyConversation: ctrl.handleCopyTranscript,
    onCopyIssue: ctrl.handleCopyIssueTranscript,
    onToggleMessageSelection: ctrl.toggleMessageSelection,
    onSubmitMessage: ctrl.submitMessage,
    onExpand: ctrl.expandModelLayout,
    onCollapse: ctrl.collapseModelLayout,
    onInputChange: (id: string, value: string) =>
      ctrl.updateModel(id, (m) => ({
        ...m,
        input: value,
      })),
    setLeftPaneRef: ctrl.setLeftPaneRef,
    setChatScrollRef: ctrl.setChatScrollRef,
    describeLlm: ctrl.describeLlm,
    describeRoute: ctrl.describeRoute,
  });

  useEffect(() => {
    setActiveTabs((prev) => {
      const next = { ...prev };
      ctrl.models.forEach((model) => {
        if (!next[model.id]) next[model.id] = "chat";
      });
      Object.keys(next).forEach((id) => {
        if (!ctrl.models.some((model) => model.id === id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [ctrl.models]);

  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-white text-black border-b border-zinc-200 flex items-center !py-0">
      <div className="hero-bg absolute inset-0 pointer-events-none">
        <MatrixRainBackground />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-white to-transparent" />
      <div className="relative container mx-auto w-full max-w-6xl">
        <div className="px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mt-6 space-y-6" data-lego="ConversationModelColumns">
              {ctrl.loading ? (
                <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{"\uB85C\uB529 \uC911..."} {ctrl.loadingHints.join(", ")}</span>
                </div>
              ) : null}
              {ctrl.error ? <div className="text-sm text-rose-600">{ctrl.error}</div> : null}
              {!ctrl.loading && !ctrl.error
                ? ctrl.models.map((model, index) => {
                  const assembled = createConversationModelLegos(createModelProps(model, index));
                  const activeTab = activeTabs[model.id] || "chat";

                  return (
                    <div key={`model-${model.id}`} className="container mx-auto w-full max-w-6xl">
                      <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-2">
                        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
                          <ConversationModelSetupColumnLego {...assembled.setupLegoProps} />
                        </div>
                        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
                          <WidgetConversationLayout
                            brandName="Mejai"
                            status=""
                            iconUrl="/brand/logo.png"
                            chatLegoProps={assembled.chatLegoProps}
                            setupLegoProps={assembled.setupLegoProps}
                            fill={false}
                            className="h-full"
                            activeTab={activeTab}
                            onTabChange={(tab) => setActiveTabs((prev) => ({ ...prev, [model.id]: tab }))}
                            showPolicyTab={ctrl.pageFeatures.widget.tabBar.policy}
                            sessions={model.sessions}
                            sessionsLoading={model.sessionsLoading}
                            sessionsError={model.sessionsError || ""}
                            selectedSessionId={model.selectedSessionId}
                            onSelectSession={(sessionId) => {
                              if (!sessionId) return;
                              void ctrl.handleSelectSession(model.id, sessionId);
                            }}
                            historyMessages={model.historyMessages}
                            historyLoading={model.sessionsLoading}
                            onNewConversation={() => ctrl.resetModel(model.id)}
                            showNewConversation={ctrl.pageFeatures.widget.header.newConversation}
                            showClose={ctrl.pageFeatures.widget.header.close}
                            showHeader={ctrl.pageFeatures.widget.header.enabled}
                            showHeaderLogo={ctrl.pageFeatures.widget.header.logo}
                            showHeaderStatus={ctrl.pageFeatures.widget.header.status}
                            showHeaderAgentAction={ctrl.pageFeatures.widget.header.agentAction}
                            showChatPanel={ctrl.pageFeatures.widget.chatPanel}
                            showSetupPanel={ctrl.pageFeatures.widget.setupPanel}
                            showHistoryPanel={ctrl.pageFeatures.widget.historyPanel}
                            showTabBar={ctrl.pageFeatures.widget.tabBar.enabled}
                            showChatTab={ctrl.pageFeatures.widget.tabBar.chat}
                            showListTab={ctrl.pageFeatures.widget.tabBar.list}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
                : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
