"use client";

import type { Dispatch, SetStateAction } from "react";
import { Card } from "@/components/ui/Card";
import { ConversationPageShell } from "@/components/conversation/ConversationPageShell";
import { ConversationSetupFields } from "@/components/conversation/ConversationSetupFields";
import { LaboratoryModelHeader } from "@/components/conversation/LaboratoryModelHeader";
import { LaboratoryExistingSetup } from "@/components/conversation/LaboratoryExistingSetup";
import { LaboratoryNewModelControls } from "@/components/conversation/LaboratoryNewModelControls";
import { LaboratoryConversationPane } from "@/components/conversation/LaboratoryConversationPane";
import { type SelectOption } from "@/components/SelectPopover";
import { isToolEnabled, type ConversationPageFeatures, type ConversationSetupUi } from "@/lib/conversation/pageFeaturePolicy";
import type { ModelState } from "@/lib/conversation/client/laboratoryPageState";
import type { InlineKbSampleItem } from "@/lib/conversation/inlineKbSamples";
import { appendInlineKbSample, hasConflictingInlineKbSamples } from "@/lib/conversation/inlineKbSamples";

type ConversationMode = "history" | "edit" | "new";
type SetupMode = "existing" | "new";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  richHtml?: string;
  turnId?: string | null;
  isLoading?: boolean;
  loadingLogs?: string[];
  quickReplies?: Array<{ label: string; value: string }>;
  productCards?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    value: string;
  }>;
  quickReplyConfig?: {
    selection_mode: "single" | "multi";
    min_select?: number;
    max_select?: number;
    submit_format?: "single" | "csv";
    criteria?: string;
    source_function?: string;
    source_module?: string;
  };
  renderPlan?: {
    view: "text" | "choice" | "cards";
    enable_quick_replies: boolean;
    enable_cards: boolean;
    quick_reply_source: {
      type: "explicit" | "config" | "fallback" | "none";
      criteria?: string;
      source_function?: string;
      source_module?: string;
    };
    selection_mode: "single" | "multi";
    min_select: number;
    max_select: number;
    submit_format: "single" | "csv";
    grid_columns: { quick_replies: number; cards: number };
    prompt_kind:
      | "lead_day"
      | "intent_disambiguation"
      | "restock_product_choice"
      | "restock_subscribe_confirm"
      | "restock_subscribe_phone"
      | "restock_post_subscribe"
      | "restock_alternative_confirm"
      | null;
  };
};

type KbItem = {
  id: string;
  title: string;
  content?: string | null;
  is_admin?: boolean | string | null;
  is_sample?: boolean | null;
  applies_to_user?: boolean | null;
};

type ToolShape = {
  id: string;
  provider?: string;
  name: string;
  description?: string | null;
};

type ModelStateLike = {
  id: string;
  config: {
    llm: string;
    kbId: string;
    inlineKb: string;
    inlineKbSampleSelectionOrder: string[];
    adminKbIds: string[];
    mcpProviderKeys: string[];
    mcpToolIds: string[];
    route: string;
  };
  detailsOpen: {
    llm: boolean;
    kb: boolean;
    adminKb: boolean;
    mcp: boolean;
    route: boolean;
  };
  setupMode: SetupMode;
  selectedAgentGroupId: string;
  selectedAgentId: string;
  sessions: Array<{ id: string; session_code: string | null; started_at: string | null }>;
  sessionsLoading: boolean;
  sessionsError: string | null;
  selectedSessionId: string | null;
  historyMessages: ChatMessage[];
  messages: ChatMessage[];
  conversationMode: ConversationMode;
  editSessionId: string | null;
  sessionId: string | null;
  layoutExpanded: boolean;
  adminLogControlsOpen: boolean;
  showAdminLogs: boolean;
  chatSelectionEnabled: boolean;
  selectedMessageIds: string[];
  input: string;
  sending: boolean;
};

type AgentVersionItem = {
  id: string;
  version?: string | null;
  name: string;
  is_active?: boolean | null;
};

type Props = {
  index: number;
  modelCount: number;
  model: ModelStateLike;
  leftPaneHeight: number;
  expandedPanelHeight: number;
  pageFeatures: ConversationPageFeatures;
  setupUi: ConversationSetupUi;
  isAdminUser: boolean;
  latestAdminKbId: string;

  tools: ToolShape[];
  toolOptions: SelectOption[];
  toolById: Map<string, ToolShape>;
  providerByKey: Map<string, { title: string }>;
  agentVersionsByGroup: Map<string, AgentVersionItem[]>;
  formatKstDateTime: (value?: string | null) => string;

  agentGroupOptions: SelectOption[];
  llmOptions: SelectOption[];
  kbOptions: SelectOption[];
  adminKbOptions: SelectOption[];
  providerOptions: SelectOption[];
  routeOptions: SelectOption[];
  kbItems: KbItem[];
  inlineKbSamples: InlineKbSampleItem[];

  quickReplyDrafts: Record<string, string[]>;
  lockedReplySelections: Record<string, string[]>;
  setQuickReplyDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
  setLockedReplySelections: Dispatch<SetStateAction<Record<string, string[]>>>;

  onRemoveModel: (id: string) => void;
  onCopySessionId: (sessionId: string | null) => void;
  onOpenSessionInNewTab: (sessionId: string | null) => void;
  onDeleteSession: (id: string) => void;
  onUpdateModel: (id: string, updater: (m: ModelState) => ModelState) => void;
  onResetModel: (id: string) => void;
  onSelectAgentGroup: (id: string, groupId: string) => void;
  onSelectAgentVersion: (id: string, agentId: string) => Promise<void> | void;
  onSelectSession: (id: string, sessionId: string) => Promise<void> | void;
  onSearchSessionById: (id: string, sessionId: string) => Promise<void> | void;
  onChangeConversationMode: (id: string, mode: ConversationMode) => void;
  onCopyConversation: (id: string) => Promise<void> | void;
  onCopyIssue: (id: string) => Promise<void> | void;
  onToggleMessageSelection: (id: string, messageId: string) => void;
  onSubmitMessage: (id: string, text: string) => Promise<void> | void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onInputChange: (id: string, value: string) => void;
  setLeftPaneRef: (id: string, el: HTMLDivElement | null) => void;
  setChatScrollRef: (id: string, el: HTMLDivElement | null) => void;
  describeLlm: (llm: string) => string;
  describeRoute: (route: string) => string;
};

export function LaboratoryModelCard({
  index,
  modelCount,
  model,
  leftPaneHeight,
  expandedPanelHeight,
  pageFeatures,
  setupUi,
  isAdminUser,
  latestAdminKbId,
  tools,
  toolOptions,
  toolById,
  providerByKey,
  agentVersionsByGroup,
  formatKstDateTime,
  agentGroupOptions,
  llmOptions,
  kbOptions,
  adminKbOptions,
  providerOptions,
  routeOptions,
  kbItems,
  inlineKbSamples,
  quickReplyDrafts,
  lockedReplySelections,
  setQuickReplyDrafts,
  setLockedReplySelections,
  onRemoveModel,
  onCopySessionId,
  onOpenSessionInNewTab,
  onDeleteSession,
  onUpdateModel,
  onResetModel,
  onSelectAgentGroup,
  onSelectAgentVersion,
  onSelectSession,
  onSearchSessionById,
  onChangeConversationMode,
  onCopyConversation,
  onCopyIssue,
  onToggleMessageSelection,
  onSubmitMessage,
  onExpand,
  onCollapse,
  onInputChange,
  setLeftPaneRef,
  setChatScrollRef,
  describeLlm,
  describeRoute,
}: Props) {
  const filteredToolOptions = toolOptions.filter((option) => {
    if (model.config.mcpProviderKeys.length === 0) return false;
    const providerKey = toolById.get(option.id)?.provider;
    return providerKey ? model.config.mcpProviderKeys.includes(providerKey) : false;
  });

  const sessionOptions: SelectOption[] = model.sessions.map((session) => ({
    id: session.id,
    label: session.session_code || session.id,
    description: formatKstDateTime(session.started_at),
  }));

  const versionOptions: SelectOption[] = (agentVersionsByGroup.get(model.selectedAgentGroupId) || []).map((item) => ({
    id: item.id,
    label: `${item.is_active ? "🟢 " : "⚪ "}${item.version || "-"} (${item.name || item.id})`,
    description: item.is_active ? "현재 활성 버전" : "비활성 버전",
  }));

  const visibleMessages =
    model.conversationMode === "history"
      ? model.historyMessages
      : model.conversationMode === "edit"
        ? [...model.historyMessages, ...model.messages]
        : model.messages;

  const matchedPaneHeight = model.layoutExpanded ? expandedPanelHeight : leftPaneHeight;
  const inlineKbSampleConflict =
    model.config.inlineKbSampleSelectionOrder.length >= 2 &&
    hasConflictingInlineKbSamples(
      model.config.inlineKbSampleSelectionOrder
        .map((id) => inlineKbSamples.find((sample) => sample.id === id)?.content || "")
        .filter((value) => value.trim().length > 0)
    );
  const activeSessionId =
    model.conversationMode === "history"
      ? model.selectedSessionId
      : model.conversationMode === "edit"
        ? model.editSessionId || model.sessionId
        : model.sessionId;

  return (
    <Card key={`model-${model.id}`} className="overflow-visible p-0">
      <LaboratoryModelHeader
        modelIndex={index + 1}
        canRemove={modelCount > 1}
        onRemove={() => onRemoveModel(model.id)}
        activeSessionId={activeSessionId}
        onCopySessionId={onCopySessionId}
        onOpenSessionInNewTab={onOpenSessionInNewTab}
        onDeleteSession={() => onDeleteSession(model.id)}
        disableDelete={!activeSessionId && visibleMessages.length === 0}
      />
      <ConversationPageShell
        className="lg:grid-cols-[1fr_1.2fr]"
        leftPanel={
          <div
            ref={(el) => {
              setLeftPaneRef(model.id, el);
            }}
            className="p-4"
            style={model.layoutExpanded ? { minHeight: expandedPanelHeight } : undefined}
          >
            <div className="space-y-3">
              <LaboratoryExistingSetup
                showModelSelector={pageFeatures.setup.modelSelector}
                modelSelectorAdminOnly={pageFeatures.visibility.setup.modelSelector === "admin"}
                showModeExisting={pageFeatures.setup.modeExisting}
                modeExistingAdminOnly={pageFeatures.visibility.setup.modeExisting === "admin"}
                showSessionIdSearch={pageFeatures.setup.sessionIdSearch}
                showModeNew={pageFeatures.setup.modeNew}
                modeNewAdminOnly={pageFeatures.visibility.setup.modeNew === "admin"}
                setupMode={model.setupMode}
                onSelectExisting={() =>
                  onUpdateModel(model.id, (m) => ({
                    ...m,
                    setupMode: "existing",
                    conversationMode: "history",
                  }))
                }
                onSelectNew={() =>
                  onUpdateModel(model.id, (m) => ({
                    ...m,
                    setupMode: "new",
                    conversationMode: "new",
                    selectedAgentGroupId: "",
                    selectedAgentId: "",
                    sessions: [],
                    selectedSessionId: null,
                    historyMessages: [],
                    editSessionId: null,
                    sessionId: null,
                    config: {
                      ...m.config,
                      adminKbIds: isAdminUser && latestAdminKbId ? [latestAdminKbId] : [],
                    },
                  }))
                }
                selectedAgentGroupId={model.selectedAgentGroupId}
                selectedAgentId={model.selectedAgentId}
                selectedSessionId={model.selectedSessionId}
                sessionsLength={model.sessions.length}
                sessionsLoading={model.sessionsLoading}
                sessionsError={model.sessionsError}
                conversationMode={model.conversationMode}
                agentGroupOptions={agentGroupOptions}
                versionOptions={versionOptions}
                sessionOptions={sessionOptions}
                onSelectAgentGroup={(value) => onSelectAgentGroup(model.id, value)}
                onSelectAgentVersion={(value) => {
                  void onSelectAgentVersion(model.id, value);
                }}
                onSelectSession={(value) => {
                  void onSelectSession(model.id, value);
                }}
                onSearchSessionById={(value) => {
                  void onSearchSessionById(model.id, value);
                }}
                onChangeConversationMode={(mode) => onChangeConversationMode(model.id, mode)}
              />
              {model.setupMode === "new" ? (
                <div className="space-y-3">
                  <ConversationSetupFields
                    showInlineUserKbInput={pageFeatures.setup.inlineUserKbInput}
                    inlineKbAdminOnly={pageFeatures.visibility.setup.inlineUserKbInput === "admin"}
                    inlineKbValue={model.config.inlineKb}
                    inlineKbLabel={setupUi.labels.inlineUserKbInput}
                    onInlineKbChange={(value) =>
                      onUpdateModel(model.id, (m) => ({
                        ...m,
                        config: { ...m.config, inlineKb: value },
                      }))
                    }
                    inlineKbSamples={inlineKbSamples}
                    inlineKbSampleSelectionOrder={model.config.inlineKbSampleSelectionOrder}
                    onInlineKbSampleApply={(sampleIds) =>
                      onUpdateModel(model.id, (m) => {
                        const validIds = sampleIds.filter((id) => inlineKbSamples.some((item) => item.id === id));
                        if (validIds.length === 0) return m;
                        let nextInlineKb = m.config.inlineKb;
                        validIds.forEach((id) => {
                          const sample = inlineKbSamples.find((item) => item.id === id);
                          if (!sample) return;
                          nextInlineKb = appendInlineKbSample(nextInlineKb, sample.content);
                        });
                        return {
                          ...m,
                          config: {
                            ...m.config,
                            inlineKb: nextInlineKb,
                            inlineKbSampleSelectionOrder: [...m.config.inlineKbSampleSelectionOrder, ...validIds],
                          },
                        };
                      })
                    }
                    inlineKbSampleConflict={inlineKbSampleConflict}
                    showLlmSelector={pageFeatures.setup.llmSelector}
                    llmLabel={setupUi.labels.llmSelector}
                    llmAdminOnly={pageFeatures.visibility.setup.llmSelector === "admin"}
                    llmValue={model.config.llm}
                    onLlmChange={(value) => {
                      onUpdateModel(model.id, (m) => ({
                        ...m,
                        config: { ...m.config, llm: value },
                      }));
                      onResetModel(model.id);
                    }}
                    llmOptions={llmOptions}
                    showLlmInfoButton
                    onToggleLlmInfo={() =>
                      onUpdateModel(model.id, (m) => ({
                        ...m,
                        detailsOpen: { ...m.detailsOpen, llm: !m.detailsOpen.llm },
                      }))
                    }
                    llmInfoOpen={model.detailsOpen.llm}
                    llmInfoText={describeLlm(model.config.llm)}
                    middleContent={
                      <LaboratoryNewModelControls
                        showKbSelector={pageFeatures.setup.kbSelector}
                        kbLabel={setupUi.labels.kbSelector}
                        kbAdminOnly={pageFeatures.visibility.setup.kbSelector === "admin"}
                        kbValue={model.config.kbId}
                        kbOptions={kbOptions}
                        onKbChange={(value) => {
                          onUpdateModel(model.id, (m) => ({
                            ...m,
                            config: { ...m.config, kbId: value },
                          }));
                          onResetModel(model.id);
                        }}
                        kbInfoOpen={model.detailsOpen.kb}
                        onToggleKbInfo={() =>
                          onUpdateModel(model.id, (m) => ({
                            ...m,
                            detailsOpen: { ...m.detailsOpen, kb: !m.detailsOpen.kb },
                          }))
                        }
                        kbInfoText={kbItems.find((kb) => kb.id === model.config.kbId)?.content || "내용 없음"}
                        showAdminKbSelector={isAdminUser && pageFeatures.setup.adminKbSelector}
                        adminKbLabel={setupUi.labels.adminKbSelector}
                        adminKbAdminOnly={pageFeatures.visibility.setup.adminKbSelector === "admin"}
                        adminKbValues={model.config.adminKbIds}
                        adminKbOptions={adminKbOptions}
                        onAdminKbChange={(values) => {
                          onUpdateModel(model.id, (m) => ({
                            ...m,
                            config: { ...m.config, adminKbIds: values },
                          }));
                          onResetModel(model.id);
                        }}
                        adminKbInfoOpen={model.detailsOpen.adminKb}
                        onToggleAdminKbInfo={() =>
                          onUpdateModel(model.id, (m) => ({
                            ...m,
                            detailsOpen: { ...m.detailsOpen, adminKb: !m.detailsOpen.adminKb },
                          }))
                        }
                        adminKbInfoText={
                          model.config.adminKbIds.length === 0
                            ? "선택된 관리자 KB 없음"
                            : model.config.adminKbIds
                              .map((id) => {
                                const kb = kbItems.find((item) => item.id === id);
                                if (!kb) return null;
                                const status = kb.applies_to_user ? "적용됨" : "미적용";
                                return `• ${kb.title} (${status})\n${kb.content || "내용 없음"}`;
                              })
                              .filter(Boolean)
                              .join("\n\n")
                        }
                        showRouteSelector={pageFeatures.setup.routeSelector}
                        routeLabel={setupUi.labels.routeSelector}
                        routeAdminOnly={pageFeatures.visibility.setup.routeSelector === "admin"}
                        routeValue={model.config.route}
                        routeOptions={routeOptions}
                        onRouteChange={(value) => {
                          onUpdateModel(model.id, (m) => ({
                            ...m,
                            config: { ...m.config, route: value },
                          }));
                          onResetModel(model.id);
                        }}
                        routeInfoOpen={model.detailsOpen.route}
                        onToggleRouteInfo={() =>
                          onUpdateModel(model.id, (m) => ({
                            ...m,
                            detailsOpen: { ...m.detailsOpen, route: !m.detailsOpen.route },
                          }))
                        }
                        routeInfoText={describeRoute(model.config.route)}
                        setupFieldOrder={setupUi.order.filter(
                          (key): key is "kbSelector" | "adminKbSelector" | "routeSelector" =>
                            key === "kbSelector" || key === "adminKbSelector" || key === "routeSelector"
                        )}
                      />
                    }
                    showMcpProviderSelector={pageFeatures.mcp.providerSelector}
                    mcpProviderLabel={setupUi.labels.mcpProviderSelector}
                    mcpProviderAdminOnly={pageFeatures.visibility.mcp.providerSelector === "admin"}
                    providerValues={model.config.mcpProviderKeys}
                    onProviderChange={(values) => {
                      const allowedToolIds = new Set(
                        tools
                          .filter((tool) => (tool.provider ? values.includes(tool.provider) : false))
                          .map((tool) => tool.id)
                      );
                      if (values.includes("runtime") && isToolEnabled("restock_lite", pageFeatures)) {
                        allowedToolIds.add("restock_lite");
                      }
                      onUpdateModel(model.id, (m) => ({
                        ...m,
                        config: {
                          ...m.config,
                          mcpProviderKeys: values,
                          mcpToolIds: m.config.mcpToolIds.filter((id) => allowedToolIds.has(id)),
                        },
                      }));
                      onResetModel(model.id);
                    }}
                    providerOptions={providerOptions}
                    providerPlaceholder="MCP 프로바이더 선택"
                    showMcpInfoButton
                    onToggleMcpInfo={() =>
                      onUpdateModel(model.id, (m) => ({
                        ...m,
                        detailsOpen: { ...m.detailsOpen, mcp: !m.detailsOpen.mcp },
                      }))
                    }
                    mcpInfoOpen={model.detailsOpen.mcp}
                    mcpInfoText={
                      [
                        `선택된 프로바이더: ${model.config.mcpProviderKeys.length === 0
                          ? "없음"
                          : model.config.mcpProviderKeys
                            .map((key) => providerByKey.get(key)?.title || key)
                            .join(", ")
                        }`,
                        "",
                        model.config.mcpToolIds.length === 0
                          ? "선택된 액션 없음"
                          : model.config.mcpToolIds
                            .map((id) => {
                              const tool = toolById.get(id);
                              if (!tool) return null;
                              const desc = tool.description ? tool.description : "설명 없음";
                              return `• ${tool.name}: ${desc}`;
                            })
                            .filter(Boolean)
                            .join("\n"),
                      ].join("\n")
                    }
                    showMcpActionSelector={pageFeatures.mcp.actionSelector}
                    mcpActionLabel={setupUi.labels.mcpActionSelector}
                    mcpActionAdminOnly={pageFeatures.visibility.mcp.actionSelector === "admin"}
                    actionValues={model.config.mcpToolIds}
                    onActionChange={(values) => {
                      onUpdateModel(model.id, (m) => ({
                        ...m,
                        config: { ...m.config, mcpToolIds: values },
                      }));
                      onResetModel(model.id);
                    }}
                    actionOptions={filteredToolOptions}
                    actionPlaceholder="MCP 액션 선택"
                    setupFieldOrder={setupUi.order}
                  />
                </div>
              ) : null}
            </div>
          </div>
        }
        rightPanel={
          <LaboratoryConversationPane
            model={model}
            visibleMessages={visibleMessages}
            isAdminUser={isAdminUser}
            matchedPaneHeight={matchedPaneHeight}
            expandedPanelHeight={expandedPanelHeight}
            quickReplyDrafts={quickReplyDrafts}
            lockedReplySelections={lockedReplySelections}
            setQuickReplyDrafts={setQuickReplyDrafts}
            setLockedReplySelections={setLockedReplySelections}
            adminFeatures={{
              enabled: pageFeatures.adminPanel.enabled,
              selectionToggle: pageFeatures.adminPanel.selectionToggle,
              logsToggle: pageFeatures.adminPanel.logsToggle,
              messageSelection: pageFeatures.adminPanel.messageSelection,
              copyConversation: pageFeatures.adminPanel.copyConversation,
              copyIssue: pageFeatures.adminPanel.copyIssue,
            }}
            interactionFeatures={{
              quickReplies: pageFeatures.interaction.quickReplies,
              productCards: pageFeatures.interaction.productCards,
              inputSubmit: pageFeatures.interaction.inputSubmit,
            }}
            onToggleAdminOpen={() =>
              onUpdateModel(model.id, (m) => ({
                ...m,
                adminLogControlsOpen: !m.adminLogControlsOpen,
              }))
            }
            onToggleSelectionMode={() =>
              onUpdateModel(model.id, (m) => ({
                ...m,
                chatSelectionEnabled: !m.chatSelectionEnabled,
                selectedMessageIds: !m.chatSelectionEnabled ? m.selectedMessageIds : [],
              }))
            }
            onToggleLogs={() =>
              onUpdateModel(model.id, (m) => ({
                ...m,
                showAdminLogs: !m.showAdminLogs,
              }))
            }
            onCopyConversation={() => void onCopyConversation(model.id)}
            onCopyIssue={() => void onCopyIssue(model.id)}
            onToggleMessageSelection={(messageId) => onToggleMessageSelection(model.id, messageId)}
            onSubmitMessage={(text) => void onSubmitMessage(model.id, text)}
            onExpand={() => onExpand(model.id)}
            onCollapse={() => onCollapse(model.id)}
            onInputChange={(value) => onInputChange(model.id, value)}
            setChatScrollRef={(el) => {
              setChatScrollRef(model.id, el);
            }}
          />
        }
      />
    </Card>
  );
}
