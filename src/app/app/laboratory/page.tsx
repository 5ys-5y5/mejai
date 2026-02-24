"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ConversationModelSetupColumnLego,
  ConversationSessionHeader,
  ConversationWorkbenchTopBar,
  createConversationModelLegos,
  WidgetConversationLayout,
  type WidgetConversationTab,
} from "@/components/design-system";
import { useConversationPageController } from "@/lib/conversation/client/useConversationPageController";

export default function LaboratoryPage() {
  const ctrl = useConversationPageController("/app/laboratory");
  const [activeTabs, setActiveTabs] = useState<Record<string, WidgetConversationTab>>({});
  const createModelProps = (model: (typeof ctrl.models)[number], index: number) => ({
    index,
    modelCount: ctrl.models.length,
    model,
    pageFeatures: ctrl.pageFeatures,
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
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <ConversationWorkbenchTopBar
          wsStatusDot={ctrl.wsStatusDot}
          wsStatus={ctrl.wsStatus}
          onRefreshWs={ctrl.connectWs}
          onResetAll={ctrl.handleResetAll}
          onAddModel={ctrl.handleAddModel}
          addModelDisabled={ctrl.models.length >= ctrl.MAX_MODELS}
          leading={
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">실험실</h1>
              <p className="mt-1 text-sm text-slate-500">LLM · KB · MCP · Route 조합을 여러 개 동시에 비교해 품질을 확인하세요.</p>
            </div>
          }
        />

        <div className="mt-6 space-y-6">
          {ctrl.loading ? (
            <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>로딩 중: {ctrl.loadingHints.join(", ")}</span>
            </div>
          ) : null}
          {ctrl.error ? <div className="text-sm text-rose-600">{ctrl.error}</div> : null}
          {!ctrl.loading && !ctrl.error && ctrl.kbItems.length === 0 ? (
            <div className="text-sm text-slate-500">
              비교할 KB가 없습니다. 신규 모델은 KB 없이도 실행할 수 있고, 기존 모델은 KB/에이전트가 필요합니다.
            </div>
          ) : null}
          {!ctrl.loading && !ctrl.error
            ? ctrl.models.map((model, index) => {
              const assembled = createConversationModelLegos(createModelProps(model, index));
              const activeTab = activeTabs[model.id] || "chat";
              return (
                <div key={`model-${model.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <ConversationSessionHeader
                    modelIndex={index + 1}
                    canRemove={ctrl.models.length > 1}
                    onRemove={() => ctrl.handleRemoveModel(model.id)}
                    activeSessionId={assembled.activeSessionId}
                    onCopySessionId={ctrl.handleCopySessionId}
                    onOpenSessionInNewTab={ctrl.openSessionInNewTab}
                    onDeleteSession={() => ctrl.handleDeleteSession(model.id)}
                    disableDelete={!assembled.activeSessionId && assembled.visibleMessages.length === 0}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-[0.5fr_1fr] overflow-hidden">
                    <div className="min-h-[380px] max-h-[550px] h-full overflow-hidden">
                      <ConversationModelSetupColumnLego {...assembled.setupLegoProps} />
                    </div>
                    <div className="min-h-[380px] max-h-[550px] h-full overflow-hidden">
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
  );
}
