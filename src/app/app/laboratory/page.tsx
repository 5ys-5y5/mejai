"use client";

import { ConversationModelCard, ConversationWorkbenchTopBar } from "@/components/design-system";
import { useConversationPageController } from "@/lib/conversation/client/useConversationPageController";

export default function LaboratoryPage() {
  const ctrl = useConversationPageController("/app/laboratory");
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

        <div className="mt-6 space-y-6" data-lego="ConversationModelCard">
          {ctrl.loading ? <div className="text-sm text-slate-500">데이터를 불러오는 중...</div> : null}
          {ctrl.error ? <div className="text-sm text-rose-600">{ctrl.error}</div> : null}
          {!ctrl.loading && !ctrl.error && ctrl.kbItems.length === 0 ? (
            <div className="text-sm text-slate-500">
              비교할 KB가 없습니다. 신규 모델은 KB 없이도 실행할 수 있고, 기존 모델은 KB/에이전트가 필요합니다.
            </div>
          ) : null}
          {!ctrl.loading && !ctrl.error
            ? ctrl.models.map((model, index) => (
                <ConversationModelCard
                  key={`model-${model.id}`}
                  {...createModelProps(model, index)}
                />
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
