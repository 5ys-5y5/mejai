"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { LaboratoryModelCard } from "@/components/conversation/LaboratoryModelCard";
import { useLaboratoryPageController } from "@/lib/conversation/client/useLaboratoryPageController";

export function LaboratoryPageContainer() {
  const ctrl = useLaboratoryPageController();

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">실험실</h1>
            <p className="mt-1 text-sm text-slate-500">LLM · KB · MCP · Route 조합을 여러 개 동시에 비교해 품질을 확인하세요.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="max-w-full w-max flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <span className={cn("h-2 w-2 rounded-full", ctrl.wsStatusDot)} />
              <span>WS {ctrl.wsStatus}</span>
              <button
                type="button"
                onClick={ctrl.connectWs}
                title="새로 고침"
                aria-label="웹소켓 새로 고침"
                className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button type="button" variant="outline" onClick={ctrl.handleResetAll}>
              초기화
            </Button>
            <Button type="button" onClick={ctrl.handleAddModel} disabled={ctrl.models.length >= ctrl.MAX_MODELS}>
              <Plus className="mr-2 h-4 w-4" />
              모델 추가
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {ctrl.loading ? <div className="text-sm text-slate-500">데이터를 불러오는 중...</div> : null}
          {ctrl.error ? <div className="text-sm text-rose-600">{ctrl.error}</div> : null}
          {!ctrl.loading && !ctrl.error && ctrl.kbItems.length === 0 ? (
            <div className="text-sm text-slate-500">비교할 KB가 없습니다. 신규 모델은 KB 없이도 실행할 수 있고, 기존 모델은 KB/에이전트가 필요합니다.</div>
          ) : null}
          {!ctrl.loading && !ctrl.error
            ? ctrl.models.map((model, index) => (
                <LaboratoryModelCard
                  key={`model-${model.id}`}
                  index={index}
                  modelCount={ctrl.models.length}
                  model={model}
                  leftPaneHeight={ctrl.leftPaneHeights[model.id] || 0}
                  expandedPanelHeight={ctrl.EXPANDED_PANEL_HEIGHT}
                  pageFeatures={ctrl.pageFeatures}
                  isAdminUser={ctrl.isAdminUser}
                  latestAdminKbId={ctrl.latestAdminKbId}
                  tools={ctrl.tools}
                  toolOptions={ctrl.toolOptions}
                  toolById={ctrl.toolById}
                  providerByKey={ctrl.providerByKey}
                  agentVersionsByGroup={ctrl.agentVersionsByGroup}
                  formatKstDateTime={ctrl.formatKstDateTime}
                  agentGroupOptions={ctrl.agentGroupOptions}
                  llmOptions={ctrl.llmOptions}
                  kbOptions={ctrl.kbOptions}
                  adminKbOptions={ctrl.adminKbOptions}
                  providerOptions={ctrl.providerOptions}
                  routeOptions={ctrl.routeOptions}
                  kbItems={ctrl.kbItems}
                  quickReplyDrafts={ctrl.quickReplyDrafts}
                  lockedReplySelections={ctrl.lockedReplySelections}
                  setQuickReplyDrafts={ctrl.setQuickReplyDrafts}
                  setLockedReplySelections={ctrl.setLockedReplySelections}
                  onRemoveModel={ctrl.handleRemoveModel}
                  onCopySessionId={ctrl.handleCopySessionId}
                  onOpenSessionInNewTab={ctrl.openSessionInNewTab}
                  onDeleteSession={ctrl.handleDeleteSession}
                  onUpdateModel={ctrl.updateModel}
                  onResetModel={ctrl.resetModel}
                  onSelectAgentGroup={ctrl.handleSelectAgentGroup}
                  onSelectAgentVersion={ctrl.handleSelectAgentVersion}
                  onSelectSession={ctrl.handleSelectSession}
                  onChangeConversationMode={ctrl.handleChangeConversationMode}
                  onCopyConversation={ctrl.handleCopyTranscript}
                  onCopyIssue={ctrl.handleCopyIssueTranscript}
                  onToggleMessageSelection={ctrl.toggleMessageSelection}
                  onSubmitMessage={ctrl.submitMessage}
                  onExpand={ctrl.expandModelLayout}
                  onCollapse={ctrl.collapseModelLayout}
                  onInputChange={(id, value) =>
                    ctrl.updateModel(id, (m) => ({
                      ...m,
                      input: value,
                    }))
                  }
                  setLeftPaneRef={ctrl.setLeftPaneRef}
                  setChatScrollRef={ctrl.setChatScrollRef}
                  describeLlm={ctrl.describeLlm}
                  describeRoute={ctrl.describeRoute}
                />
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

