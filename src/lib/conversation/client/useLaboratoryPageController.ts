"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { fetchSessionLogs, fetchTranscriptSnapshot } from "@/lib/conversation/client/runtimeClient";
import { isProviderEnabled, isToolEnabled, resolveConversationSetupUi, type ConversationPageKey } from "@/lib/conversation/pageFeaturePolicy";
import { useLaboratoryConversationActions } from "@/lib/conversation/client/useLaboratoryConversationActions";
import { useConversationPageFeatures } from "@/lib/conversation/client/useConversationPageFeatures";
import { resolvePageConversationDebugOptions } from "@/lib/transcriptCopyPolicy";
import type { InlineKbSampleItem } from "@/lib/conversation/inlineKbSamples";
import { isAdminKbValue } from "@/lib/kbType";
import {
  buildHistoryMessages,
  compareAgentVersions,
  createDefaultModel,
  describeLlm,
  describeRoute,
  EXPANDED_PANEL_HEIGHT,
  makeSnippet,
  MAX_MODELS,
  type AgentItem,
  type ChatMessage,
  type KbItem,
  type McpProvider,
  type ModelState,
  type MpcTool,
  type SessionItem,
  type TurnRow,
  type ConversationMode,
  WS_URL,
} from "@/lib/conversation/client/laboratoryPageState";
import { formatKstDateTime } from "@/lib/kst";
import { toast } from "sonner";

export function useLaboratoryPageController(pageKey: ConversationPageKey = "/app/laboratory") {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { features: pageFeatures, providerValue } = useConversationPageFeatures(pageKey, isAdminUser);
  const setupUi = useMemo(() => resolveConversationSetupUi(pageKey, providerValue), [pageKey, providerValue]);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [mcpProviders, setMcpProviders] = useState<McpProvider[]>([]);
  const [tools, setTools] = useState<MpcTool[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [inlineKbSamples, setInlineKbSamples] = useState<InlineKbSampleItem[]>([]);
  const [wsStatus, setWsStatus] = useState("연결 대기");
  const wsRef = useRef<WebSocket | null>(null);

  const [models, setModels] = useState<ModelState[]>(() => [createDefaultModel()]);
  const [quickReplyDrafts, setQuickReplyDrafts] = useState<Record<string, string[]>>({});
  const [lockedReplySelections, setLockedReplySelections] = useState<Record<string, string[]>>({});
  const initialAgentSelectionAppliedRef = useRef(false);
  const chatScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const leftPaneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevMessageSignatureRefs = useRef<Record<string, string>>({});
  const [leftPaneHeights, setLeftPaneHeights] = useState<Record<string, number>>({});
  const [viewportTick, setViewportTick] = useState(0);

  useEffect(() => {
    setModels((prev) =>
      prev.map((model) => {
        if (!pageFeatures.setup.modelSelector) {
          return {
            ...model,
            setupMode: "new",
            conversationMode: "new",
            config: { ...model.config, llm: pageFeatures.setup.defaultLlm },
          };
        }
        if (pageFeatures.setup.modeExisting || pageFeatures.setup.modeNew) {
          if (!pageFeatures.setup.modeExisting && model.setupMode === "existing") {
            return {
              ...model,
              setupMode: "new",
              conversationMode: "new",
              config: { ...model.config, llm: pageFeatures.setup.defaultLlm },
            };
          }
          if (!pageFeatures.setup.modeNew && model.setupMode === "new") {
            return {
              ...model,
              setupMode: "existing",
              conversationMode: "history",
              config: { ...model.config, llm: pageFeatures.setup.defaultLlm },
            };
          }
        }
        if (model.messages.length === 0 && model.historyMessages.length === 0) {
          const nextSetupMode = pageFeatures.setup.modeExisting ? "existing" : "new";
          return {
            ...model,
            setupMode: nextSetupMode,
            conversationMode: nextSetupMode === "existing" ? "history" : "new",
            config: { ...model.config, llm: pageFeatures.setup.defaultLlm },
          };
        }
        return model;
      })
    );
  }, [
    pageFeatures.setup.modelSelector,
    pageFeatures.setup.modeExisting,
    pageFeatures.setup.modeNew,
    pageFeatures.setup.defaultLlm,
  ]);

  useEffect(() => {
    if (pageFeatures.setup.inlineUserKbInput) return;
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        config: { ...model.config, inlineKb: "", inlineKbSampleSelectionOrder: [] },
      }))
    );
  }, [pageFeatures.setup.inlineUserKbInput]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [kbRes, agentRes, profileRes, sampleRes] = await Promise.all([
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200"),
          apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200").catch(() => ({ items: [] })),
          apiFetch<{ is_admin?: boolean }>("/api/user-profile").catch(() => ({ is_admin: false })),
          apiFetch<{ items?: InlineKbSampleItem[] }>("/api/kb/samples").catch(() => ({ items: [] })),
        ]);
        const mcpRes = await apiFetch<{ providers?: McpProvider[] }>("/api/mcp").catch(() => ({
          providers: [],
        }));
        if (!mounted) return;
        setKbItems(kbRes.items || []);
        setAgents(agentRes.items || []);
        setInlineKbSamples((sampleRes.items || []).filter((item) => item.content?.trim().length > 0));
        setIsAdminUser(Boolean(profileRes?.is_admin));
        const providers = (mcpRes.providers || []).filter((provider) => isProviderEnabled(provider.key, pageFeatures));
        setMcpProviders(providers);
        const flattened = providers.flatMap((provider) =>
          (provider.actions || []).map((tool) => ({ ...tool, provider: provider.key }))
        ).filter((tool) => isToolEnabled(tool.id, pageFeatures));
        setTools(flattened);
      } catch {
        if (!mounted) return;
        setError("실험실 데이터를 불러오지 못했습니다.");
        setInlineKbSamples([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [pageFeatures]);

  const connectWs = useCallback(() => {
    if (!WS_URL) {
      setWsStatus("WS URL 미설정");
      return;
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setWsStatus("연결 중");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.addEventListener("open", () => {
      setWsStatus("연결됨");
      ws.send(JSON.stringify({ type: "join" }));
    });
    ws.addEventListener("close", () => {
      setWsStatus("연결 종료");
    });
    ws.addEventListener("error", () => {
      setWsStatus("연결 오류");
    });
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      const ws = wsRef.current;
      if (ws) ws.close();
    };
  }, [connectWs]);

  useEffect(() => {
    const onResize = () => setViewportTick((v) => v + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!kbItems.length) return;
    const userKbs = kbItems.filter((kb) => !isAdminKbValue(kb.is_admin));
    const firstUserKb = userKbs[0]?.id;
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        config: { ...model.config, kbId: model.config.kbId || firstUserKb || "" },
      }))
    );
  }, [kbItems]);

  useEffect(() => {
    if (!pageFeatures.mcp.actionSelector) {
      setModels((prev) =>
        prev.map((model) => ({
          ...model,
          config: { ...model.config, mcpToolIds: [] },
        }))
      );
      return;
    }
    if (!tools.length) return;
    const allToolIds = [
      ...tools.map((tool) => tool.id),
      ...(isToolEnabled("restock_lite", pageFeatures) ? ["restock_lite"] : []),
    ];
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        config:
          model.config.mcpToolIds.length === 0
            ? { ...model.config, mcpToolIds: allToolIds }
            : model.config,
      }))
    );
  }, [pageFeatures, pageFeatures.mcp.actionSelector, tools]);

  useEffect(() => {
    if (!pageFeatures.mcp.providerSelector) {
      setModels((prev) =>
        prev.map((model) => ({
          ...model,
          config: { ...model.config, mcpProviderKeys: [] },
        }))
      );
      return;
    }
    if (!mcpProviders.length) return;
    const allProviderKeys = [
      ...mcpProviders.map((provider) => provider.key),
      ...(isProviderEnabled("runtime", pageFeatures) ? ["runtime"] : []),
    ];
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        config:
          model.config.mcpProviderKeys.length === 0
            ? { ...model.config, mcpProviderKeys: allProviderKeys }
            : model.config,
      }))
    );
  }, [mcpProviders, pageFeatures, pageFeatures.mcp.providerSelector]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      for (const model of models) {
        const el = chatScrollRefs.current[model.id];
        if (!el) continue;

        const last = model.messages[model.messages.length - 1];
        const nextSignature = `${model.messages.length}:${last?.id ?? ""}:${last?.content?.length ?? 0}`;
        const prevSignature = prevMessageSignatureRefs.current[model.id];

        // Keep the initial viewport at the top; auto-scroll only after chat updates.
        if (prevSignature && prevSignature !== nextSignature) {
          el.scrollTop = el.scrollHeight;
        }
        prevMessageSignatureRefs.current[model.id] = nextSignature;

      }
      setLeftPaneHeights((prev) => {
        const next: Record<string, number> = {};
        const modelIds = new Set(models.map((m) => m.id));
        models.forEach((model) => {
          const leftEl = leftPaneRefs.current[model.id];
          if (!leftEl) {
            if (prev[model.id] != null) next[model.id] = prev[model.id];
            return;
          }
          // Keep the "original" height as the content-driven left pane height
          // while not expanded; when expanded, preserve last original height.
          if (model.layoutExpanded) {
            if (prev[model.id] != null) next[model.id] = prev[model.id];
            return;
          }
          next[model.id] = Math.round(leftEl.getBoundingClientRect().height);
        });
        Object.keys(prev).forEach((id) => {
          if (!modelIds.has(id)) delete next[id];
        });

        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length && nextKeys.every((k) => prev[k] === next[k])) {
          return prev;
        }
        return next;
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [models, viewportTick]);

  const kbOptions = useMemo<SelectOption[]>(() => {
    return kbItems.filter((kb) => !isAdminKbValue(kb.is_admin)).map((kb) => ({
      id: kb.id,
      label: kb.title,
      description: makeSnippet(kb.content),
    }));
  }, [kbItems]);

  const adminKbOptions = useMemo<SelectOption[]>(() => {
    return kbItems.filter((kb) => isAdminKbValue(kb.is_admin)).map((kb) => ({
      id: kb.id,
      label: kb.title,
      description: `${kb.applies_to_user ? "적용됨" : "미적용"} · ${makeSnippet(kb.content)}`,
    }));
  }, [kbItems]);
  const adminKbIdSet = useMemo(
    () => new Set(kbItems.filter((kb) => isAdminKbValue(kb.is_admin)).map((kb) => kb.id)),
    [kbItems]
  );
  const latestAdminKbId = useMemo(
    () =>
      kbItems.find((kb) => isAdminKbValue(kb.is_admin) && kb.applies_to_user !== false)?.id ||
      kbItems.find((kb) => isAdminKbValue(kb.is_admin))?.id ||
      "",
    [kbItems]
  );

  const providerOptions = useMemo<SelectOption[]>(() => {
    const options = mcpProviders.map((provider) => ({
      id: provider.key,
      label: provider.title,
      description: provider.description || `${provider.action_count || 0} actions`,
    }));
    if (isProviderEnabled("runtime", pageFeatures)) {
      options.push({
        id: "runtime",
        label: "Runtime",
        description: "로컬 런타임 기능 (restock_lite)",
      });
    }
    return options;
  }, [mcpProviders, pageFeatures]);

  const toolOptions = useMemo<SelectOption[]>(() => {
    const providerTitleByKey = new Map<string, string>();
    mcpProviders.forEach((provider) => {
      providerTitleByKey.set(provider.key, provider.title);
    });
    const options = tools.map((tool) => ({
      id: tool.id,
      label: tool.tool_key || (tool.provider_key ? `${tool.provider_key}:${tool.name}` : tool.name),
      description: tool.description || undefined,
      group: tool.provider ? providerTitleByKey.get(tool.provider) || tool.provider : "기타",
    }));
    if (isToolEnabled("restock_lite", pageFeatures)) {
      options.push({
        id: "restock_lite",
        label: "restock_lite",
        description: "MCP 없이 재입고 알림 신청 저장",
        group: "Runtime",
      });
    }
    return options;
  }, [mcpProviders, pageFeatures, tools]);

  const providerByKey = useMemo(() => {
    const map = new Map<string, McpProvider>();
    mcpProviders.forEach((provider) => map.set(provider.key, provider));
    return map;
  }, [mcpProviders]);

  const llmOptions = useMemo<SelectOption[]>(
    () => [
      { id: "chatgpt", label: "ChatGPT" },
      { id: "gemini", label: "Gemini" },
    ],
    []
  );

  const routeOptions = useMemo<SelectOption[]>(
    () => [
      { id: "shipping", label: "Core Runtime", description: "/api/runtime/chat" },
    ],
    []
  );

  const toolById = useMemo(() => {
    const map = new Map<string, MpcTool>();
    tools.forEach((tool) => map.set(tool.id, tool));
    return map;
  }, [tools]);

  const wsStatusDot = useMemo(() => {
    if (wsStatus === "연결됨") return "bg-emerald-500";
    if (wsStatus === "연결 중") return "bg-amber-400";
    if (wsStatus === "연결 종료" || wsStatus === "연결 오류") return "bg-rose-500";
    return "bg-slate-400";
  }, [wsStatus]);

  const agentVersionsByGroup = useMemo(() => {
    const map = new Map<string, AgentItem[]>();
    agents.forEach((agent) => {
      const groupId = agent.parent_id ?? agent.id;
      const list = map.get(groupId) || [];
      list.push(agent);
      map.set(groupId, list);
    });
    for (const [groupId, list] of map.entries()) {
      map.set(groupId, [...list].sort(compareAgentVersions));
    }
    return map;
  }, [agents]);

  const agentById = useMemo(() => {
    const map = new Map<string, AgentItem>();
    agents.forEach((agent) => map.set(agent.id, agent));
    return map;
  }, [agents]);

  const agentGroupOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = [];
    for (const [groupId, versions] of agentVersionsByGroup.entries()) {
      const active = versions.find((item) => item.is_active) || versions[0];
      options.push({
        id: groupId,
        label: active?.name || groupId,
        description: `${versions.length}개 버전`,
      });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [agentVersionsByGroup]);

  const updateModel = useCallback((id: string, updater: (model: ModelState) => ModelState) => {
    setModels((prev) => prev.map((model) => (model.id === id ? updater(model) : model)));
  }, []);

  const expandModelLayout = (id: string) => {
    updateModel(id, (model) => ({
      ...model,
      layoutExpanded: true,
    }));
  };

  const collapseModelLayout = (id: string) => {
    updateModel(id, (model) => ({
      ...model,
      layoutExpanded: false,
    }));
  };

  const resetModel = useCallback((id: string) => {
    updateModel(id, (model) => ({
      ...model,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
      messageLogs: {},
      lastLogAt: null,
      conversationSnapshotText: null,
      issueSnapshotText: null,
    }));
  }, [updateModel]);

  const handleResetAll = () => {
    setModels((prev) =>
      prev.map((model) => ({
        ...model,
        sessionId: null,
        messages: [],
        selectedMessageIds: [],
        messageLogs: {},
        lastLogAt: null,
        conversationSnapshotText: null,
        issueSnapshotText: null,
      }))
    );
  };

  const handleAddModel = () => {
    setModels((prev) => {
      if (prev.length >= MAX_MODELS) return prev;
      const next = createDefaultModel();
      next.setupMode = pageFeatures.setup.modelSelector ? (pageFeatures.setup.modeExisting ? "existing" : "new") : "new";
      next.conversationMode = next.setupMode === "existing" ? "history" : "new";
      next.config.llm = pageFeatures.setup.defaultLlm;
      return [...prev, next];
    });
  };

  useEffect(() => {
    if (!isAdminUser || !latestAdminKbId) return;
    setModels((prev) => {
      let changed = false;
      const next = prev.map((model) => {
        if (model.setupMode !== "new") return model;
        const hasValidAdminKb =
          model.config.adminKbIds.length > 0 &&
          model.config.adminKbIds.some((id) => adminKbIdSet.has(id));
        if (hasValidAdminKb) return model;
        changed = true;
        return {
          ...model,
          config: {
            ...model.config,
            adminKbIds: [latestAdminKbId],
          },
        };
      });
      return changed ? next : prev;
    });
  }, [adminKbIdSet, isAdminUser, latestAdminKbId]);

  const handleRemoveModel = (id: string) => {
    setModels((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((model) => model.id !== id);
    });
  };

  const loadModelSessions = useCallback(async (modelId: string, agentId: string) => {
    updateModel(modelId, (model) => ({
      ...model,
      sessionsLoading: true,
      sessionsError: null,
      sessions: [],
      selectedSessionId: null,
      historyMessages: [],
      editSessionId: null,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
      messageLogs: {},
      lastLogAt: null,
      conversationSnapshotText: null,
      issueSnapshotText: null,
    }));
    try {
      const res = await apiFetch<{ items: SessionItem[] }>("/api/sessions?limit=100&order=started_at.desc");
      const filtered = (res.items || []).filter((s) => s.agent_id === agentId);
      updateModel(modelId, (model) => ({
        ...model,
        sessions: filtered,
        sessionsLoading: false,
        selectedSessionId: null,
        conversationMode: filtered.length === 0 ? "new" : model.conversationMode,
      }));
    } catch {
      updateModel(modelId, (model) => ({
        ...model,
        sessions: [],
        sessionsLoading: false,
        sessionsError: "세션 목록을 불러오지 못했습니다.",
      }));
    }
  }, [updateModel]);

  const handleSelectAgentGroup = useCallback((modelId: string, groupId: string) => {
    updateModel(modelId, (model) => ({
      ...model,
      selectedAgentGroupId: groupId,
      selectedAgentId: "",
      sessions: [],
      sessionsLoading: false,
      sessionsError: null,
      selectedSessionId: null,
      historyMessages: [],
      editSessionId: null,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
      messageLogs: {},
      lastLogAt: null,
      conversationSnapshotText: null,
      issueSnapshotText: null,
      conversationMode: "history",
      input: "",
    }));
  }, [updateModel]);

  const handleSelectAgentVersion = useCallback(async (modelId: string, agentId: string) => {
    const agent = agentById.get(agentId);
    const derivedProviderKeys = Array.from(
      new Set(
        (agent?.mcp_tool_ids || [])
          .map((toolId) => toolById.get(toolId)?.provider || "")
          .filter(Boolean)
      )
    );
    updateModel(modelId, (model) => ({
      ...model,
      selectedAgentId: agentId,
      config: {
        ...model.config,
        llm: (agent?.llm as "chatgpt" | "gemini" | null) || model.config.llm,
        kbId: agent?.kb_id || model.config.kbId,
        mcpToolIds: agent?.mcp_tool_ids?.length ? [...agent.mcp_tool_ids] : [],
        mcpProviderKeys: derivedProviderKeys.length > 0 ? derivedProviderKeys : model.config.mcpProviderKeys,
      },
      conversationMode: "history",
      input: "",
    }));
    resetModel(modelId);
    if (!agentId) return;
    await loadModelSessions(modelId, agentId);
  }, [agentById, loadModelSessions, resetModel, toolById, updateModel]);

  useEffect(() => {
    if (initialAgentSelectionAppliedRef.current) return;
    const preselectedAgentId = searchParams.get("agentId")?.trim();
    if (!preselectedAgentId) {
      initialAgentSelectionAppliedRef.current = true;
      return;
    }
    if (!agents.length || models.length === 0) return;
    const targetAgent = agents.find((item) => item.id === preselectedAgentId);
    if (!targetAgent) {
      initialAgentSelectionAppliedRef.current = true;
      return;
    }
    initialAgentSelectionAppliedRef.current = true;
    const modelId = models[0].id;
    const groupId = targetAgent.parent_id ?? targetAgent.id;
    handleSelectAgentGroup(modelId, groupId);
    void handleSelectAgentVersion(modelId, targetAgent.id);
  }, [agents, models, searchParams, handleSelectAgentGroup, handleSelectAgentVersion]);

  const handleSelectSession = async (modelId: string, sessionId: string) => {
    updateModel(modelId, (model) => ({
      ...model,
      selectedSessionId: sessionId || null,
      sessionsError: null,
      conversationSnapshotText: null,
      issueSnapshotText: null,
      historyMessages: [],
      editSessionId: null,
      sessionId: null,
      messages: [],
      selectedMessageIds: [],
      messageLogs: {},
      lastLogAt: null,
    }));
    if (!sessionId) return;
    try {
      const [turns, logs, conversationSnapshot, issueSnapshot] = await Promise.all([
        apiFetch<TurnRow[]>(`/api/sessions/${sessionId}/turns`),
        fetchSessionLogs(sessionId, 500).catch(() => null),
        fetchTranscriptSnapshot(sessionId, pageKey, "conversation").catch(() => null),
        fetchTranscriptSnapshot(sessionId, pageKey, "issue").catch(() => null),
      ]);
      const historyMessages = buildHistoryMessages(turns || []);
      const botTurnIds = new Set(
        historyMessages.filter((msg) => msg.role === "bot" && msg.turnId).map((msg) => String(msg.turnId))
      );
      const nextMessageLogs: ModelState["messageLogs"] = {};
      if (logs) {
        const mcpLogs = logs.mcp_logs || [];
        const eventLogs = logs.event_logs || [];
        const debugLogs = logs.debug_logs || [];
        botTurnIds.forEach((turnId) => {
          const bundle = {
            mcp_logs: mcpLogs.filter((log) => String(log.turn_id || "") === turnId),
            event_logs: eventLogs.filter((log) => String(log.turn_id || "") === turnId),
            debug_logs: debugLogs.filter((log) => String(log.turn_id || "") === turnId),
            logsError: null,
            logsLoading: false,
          };
          const hasAny =
            bundle.mcp_logs.length > 0 || bundle.event_logs.length > 0 || bundle.debug_logs.length > 0;
          if (hasAny) {
            nextMessageLogs[`${turnId}-bot`] = bundle;
          }
        });
      }
      const newestTs = logs
        ? Math.max(
            ...[...(logs.mcp_logs || []), ...(logs.event_logs || []), ...(logs.debug_logs || [])].map((log) => {
              const ts = log.created_at ? new Date(log.created_at).getTime() : 0;
              return Number.isNaN(ts) ? 0 : ts;
            }),
            0
          )
        : 0;
      updateModel(modelId, (model) => ({
        ...model,
        historyMessages,
        messageLogs: nextMessageLogs,
        lastLogAt: newestTs > 0 ? new Date(newestTs).toISOString() : null,
        conversationSnapshotText: conversationSnapshot?.transcript_text || null,
        issueSnapshotText: issueSnapshot?.transcript_text || null,
      }));
    } catch {
      updateModel(modelId, (model) => ({
        ...model,
        sessionsError: "대화 기록을 불러오지 못했습니다.",
      }));
    }
  };

  const handleSearchSessionById = async (modelId: string, rawSessionId: string) => {
    const sessionId = rawSessionId.trim();
    if (!sessionId) {
      updateModel(modelId, (model) => ({
        ...model,
        sessionsError: "세션 ID를 입력해 주세요.",
      }));
      return;
    }

    updateModel(modelId, (model) => ({
      ...model,
      sessionsLoading: true,
      sessionsError: null,
    }));

    try {
      const session = await apiFetch<SessionItem>(`/api/sessions/${encodeURIComponent(sessionId)}`);

      updateModel(modelId, (model) => ({
        ...model,
        sessionsLoading: false,
        sessionsError: null,
        selectedSessionId: session.id,
        selectedAgentId: session.agent_id || model.selectedAgentId,
        selectedAgentGroupId:
          session.agent_id && agentById.get(session.agent_id)
            ? agentById.get(session.agent_id)?.parent_id ?? session.agent_id
            : model.selectedAgentGroupId,
        sessions: model.sessions.some((item) => item.id === session.id) ? model.sessions : [session, ...model.sessions],
      }));

      await handleSelectSession(modelId, session.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const isNotFound = message.includes("NOT_FOUND") || message.includes("404");
      updateModel(modelId, (model) => ({
        ...model,
        sessionsLoading: false,
        sessionsError: isNotFound ? "해당 세션 ID를 찾을 수 없습니다." : "세션 조회에 실패했습니다.",
      }));
    }
  };

  const handleChangeConversationMode = (modelId: string, mode: ConversationMode) => {
    updateModel(modelId, (model) => ({
      ...model,
      conversationMode: mode,
      messages: mode === "new" ? [] : model.messages,
      selectedMessageIds: mode === "new" ? [] : model.selectedMessageIds,
      messageLogs: mode === "new" ? {} : model.messageLogs,
      lastLogAt: mode === "new" ? null : model.lastLogAt,
      conversationSnapshotText: mode === "new" ? null : model.conversationSnapshotText,
      issueSnapshotText: mode === "new" ? null : model.issueSnapshotText,
      sessionId: mode === "new" ? null : model.sessionId,
      editSessionId: mode === "new" ? null : model.editSessionId,
      input: "",
    }));
  };

  const ensureEditableSession = async (target: ModelState) => {
    if (target.conversationMode !== "edit") return target.sessionId;
    if (target.editSessionId) return target.editSessionId;
    if (!target.selectedSessionId) return target.sessionId;
    const sourceSession = target.sessions.find((item) => item.id === target.selectedSessionId);
    const turns = await apiFetch<TurnRow[]>(`/api/sessions/${target.selectedSessionId}/turns`).catch(() => []);
    const cloned = await apiFetch<SessionItem>("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        started_at: new Date().toISOString(),
        channel: "runtime",
        caller_masked: sourceSession?.caller_masked || null,
        agent_id: target.selectedAgentId || sourceSession?.agent_id || null,
        metadata: {
          ...(sourceSession?.metadata || {}),
          copied_from_session_id: target.selectedSessionId,
          copied_at: new Date().toISOString(),
          copied_by_mode: "edit",
        },
      }),
    });
    for (let idx = 0; idx < turns.length; idx += 1) {
      const turn = turns[idx];
      await apiFetch(`/api/sessions/${cloned.id}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seq: turn.seq ?? idx + 1,
          transcript_text: turn.transcript_text,
          answer_text: turn.answer_text,
          final_answer: turn.final_answer,
        }),
      }).catch(() => null);
    }
    updateModel(target.id, (model) => ({
      ...model,
      editSessionId: cloned.id,
      sessionId: cloned.id,
    }));
    return cloned.id;
  };

  const labActions = useLaboratoryConversationActions<ChatMessage, ModelState>({
    models,
    updateModel,
    ensureEditableSession,
    isAdminUser,
    pageKey,
  });

  const toggleMessageSelection = (modelId: string, messageId: string) => {
    if (!pageFeatures.adminPanel.messageSelection) return;
    updateModel(modelId, (model) => {
      if (!model.chatSelectionEnabled) return model;
      const exists = model.selectedMessageIds.includes(messageId);
      return {
        ...model,
        selectedMessageIds: exists
          ? model.selectedMessageIds.filter((id) => id !== messageId)
          : [...model.selectedMessageIds, messageId],
      };
    });
  };

  const handleCopyTranscript = async (id: string) => {
    await labActions.copyConversation(
      id,
      pageFeatures.adminPanel.copyConversation,
      resolvePageConversationDebugOptions(pageKey, providerValue)
    );
  };

  const handleCopyIssueTranscript = async (id: string) => {
    await labActions.copyIssue(id, pageFeatures.adminPanel.copyIssue);
  };

  const handleCopySessionId = async (sessionId?: string | null) => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success("세션 ID를 복사했습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleDeleteSession = async (id: string) => {
    const target = models.find((model) => model.id === id);
    if (!target) return;
    const deleteSessionId =
      target.conversationMode === "history"
        ? target.selectedSessionId
        : target.conversationMode === "edit"
          ? target.editSessionId || target.sessionId
          : target.sessionId;
    if (!deleteSessionId) {
      updateModel(id, (model) => ({
        ...model,
        messages: [],
        selectedMessageIds: [],
        messageLogs: {},
        lastLogAt: null,
        conversationSnapshotText: null,
        issueSnapshotText: null,
        sessionId: null,
        editSessionId: null,
        historyMessages: [],
        selectedSessionId: null,
      }));
      toast.success("세션이 초기화되었습니다.");
      return;
    }
    if (!window.confirm("이 세션과 관련된 대화(turns)를 삭제할까요?")) return;
    try {
      await apiFetch(`/api/sessions/${deleteSessionId}`, { method: "DELETE" });
      updateModel(id, (model) => ({
        ...model,
        sessionId: null,
        editSessionId: null,
        selectedSessionId: model.selectedSessionId === deleteSessionId ? null : model.selectedSessionId,
        sessions: model.sessions.filter((session) => session.id !== deleteSessionId),
        historyMessages: model.selectedSessionId === deleteSessionId ? [] : model.historyMessages,
        messages: [],
        selectedMessageIds: [],
        messageLogs: {},
        lastLogAt: null,
        conversationSnapshotText: null,
        issueSnapshotText: null,
      }));
      toast.success("세션이 삭제되었습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "세션 삭제에 실패했습니다.";
      toast.error(message || "세션 삭제에 실패했습니다.");
    }
  };

  return {
    MAX_MODELS,
    EXPANDED_PANEL_HEIGHT,
    loading,
    error,
    kbItems,
    inlineKbSamples,
    wsStatus,
    wsStatusDot,
    models,
    leftPaneHeights,
    pageFeatures,
    setupUi,
    isAdminUser,
    latestAdminKbId,
    tools,
    toolOptions,
    toolById,
    providerByKey,
    agentVersionsByGroup,
    agentGroupOptions,
    llmOptions,
    kbOptions,
    adminKbOptions,
    providerOptions,
    routeOptions,
    quickReplyDrafts,
    lockedReplySelections,
    setQuickReplyDrafts,
    setLockedReplySelections,
    connectWs,
    handleResetAll,
    handleAddModel,
    handleRemoveModel,
    handleCopySessionId,
    handleDeleteSession,
    updateModel,
    resetModel,
    handleSelectAgentGroup,
    handleSelectAgentVersion,
    handleSelectSession,
    handleSearchSessionById,
    handleChangeConversationMode,
    handleCopyTranscript,
    handleCopyIssueTranscript,
    toggleMessageSelection,
    submitMessage: labActions.submitMessage,
    expandModelLayout,
    collapseModelLayout,
    setLeftPaneRef: (id: string, el: HTMLDivElement | null) => {
      leftPaneRefs.current[id] = el;
    },
    setChatScrollRef: (id: string, el: HTMLDivElement | null) => {
      chatScrollRefs.current[id] = el;
    },
    describeLlm,
    describeRoute,
    formatKstDateTime,
    openSessionInNewTab: (sessionId: string | null) => {
      if (!sessionId) return;
      window.open(`/app/calls/${encodeURIComponent(sessionId)}`, "_blank", "noopener,noreferrer");
    },
  };
}
