"use client";

import { Loader2 } from "lucide-react";
import { MatrixRainBackground } from "@/components/landing/matrix-rain-background";
import {
  createConversationModelLegos,
  ConversationModelChatColumnLego,
  ConversationModelSetupColumnLego,
} from "@/components/design-system";
import { useConversationPageController } from "@/lib/conversation/client/useConversationPageController";

export function LandingConversationHero() {
  const ctrl = useConversationPageController("/");
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
    conversationDebugOptions: ctrl.conversationDebugOptions,
    onUpdateConversationDebugOptions: ctrl.updateConversationDebugOptions,
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
    <section className="hero-section relative min-h-screen overflow-hidden bg-white text-black border-b border-zinc-200 flex items-center !py-0">
      <div className="hero-bg absolute inset-0 pointer-events-none">
        <MatrixRainBackground />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-white to-transparent" />
      <div className="relative container mx-auto w-full max-w-6xl px-6">
        <div className="px-5 md:px-8 py-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mt-6 space-y-6" data-lego="ConversationModelColumns">
              {ctrl.loading ? (
                <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>로딩 중... {ctrl.loadingHints.join(", ")}</span>
                </div>
              ) : null}
              {ctrl.error ? <div className="text-sm text-rose-600">{ctrl.error}</div> : null}
              {!ctrl.loading && !ctrl.error
                ? ctrl.models.map((model, index) => {
                  const assembled = createConversationModelLegos(createModelProps(model, index));

                  return (
                    <div key={`model-${model.id}`} className="container mx-auto w-full max-w-6xl px-6">
                      <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-2">
                        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
                          <ConversationModelSetupColumnLego {...assembled.setupLegoProps} />
                        </div>
                        <div className="min-h-[380px] max-h-[500px] h-full overflow-hidden rounded-xl border border-zinc-300 bg-white">
                          <ConversationModelChatColumnLego {...assembled.chatLegoProps} />
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
