"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { useConversationMcpCatalog } from "@/lib/conversation/client/useConversationMcpCatalog";
import { useConversationController } from "@/lib/conversation/client/useConversationController";
import { useConversationPageRuntimeConfig } from "@/lib/conversation/client/useConversationPageRuntimeConfig";
import { isEnabledByGate } from "@/lib/conversation/pageFeaturePolicy";
import { resolvePageConversationDebugOptions } from "@/lib/transcriptCopyPolicy";
import type { DebugTranscriptOptions } from "@/lib/debugTranscript";
import {
  appendInlineKbSample,
  hasConflictingInlineKbSamples,
  type InlineKbSampleItem,
} from "@/lib/conversation/inlineKbSamples";

const NEW_MODEL_CONFIG = {
  route: "shipping",
  kbId: "",
  adminKbIds: [] as string[],
};

export function useHeroPageController() {
  const { isAdminUser, pageFeatures, providerValue, loadPlan, setupUi } = useConversationPageRuntimeConfig("/");
  const { providers: mcpProviders, tools: mcpTools } = useConversationMcpCatalog(loadPlan.loadMcp, pageFeatures);
  const [input, setInput] = useState("");
  const [userKb, setUserKb] = useState("");
  const [selectedProviderKeys, setSelectedProviderKeys] = useState<string[]>(["solapi", "juso"]);
  const [selectedMcpToolIds, setSelectedMcpToolIds] = useState<string[]>([]);
  const [selectedLlmOverride, setSelectedLlmOverride] = useState<"chatgpt" | "gemini" | null>(null);
  const [adminLogControlsOpen, setAdminLogControlsOpen] = useState(false);
  const [chatSelectionEnabled, setChatSelectionEnabled] = useState(false);
  const [showAdminLogs, setShowAdminLogs] = useState(false);
  const [conversationDebugOptions, setConversationDebugOptions] = useState<DebugTranscriptOptions>(() =>
    resolvePageConversationDebugOptions("/", providerValue)
  );
  const [quickReplyDrafts, setQuickReplyDrafts] = useState<Record<string, string[]>>({});
  const [lockedReplySelections, setLockedReplySelections] = useState<Record<string, string[]>>({});
  const [inlineKbSamples, setInlineKbSamples] = useState<InlineKbSampleItem[]>([]);
  const [inlineKbSampleSelectionOrder, setInlineKbSampleSelectionOrder] = useState<string[]>([]);
  const providerOptions = useMemo<SelectOption[]>(
    () =>
      mcpProviders.map((provider) => ({
        id: provider.key,
        label: provider.title || provider.key,
      })),
    [mcpProviders]
  );
  const actionOptions = useMemo<SelectOption[]>(
    () =>
      mcpTools.map((action) => ({
        id: action.id,
        label: action.name,
        group: action.provider,
        description: action.description || undefined,
      })),
    [mcpTools]
  );
  const llmOptions: SelectOption[] = useMemo(
    () =>
      ([
        { id: "chatgpt", label: "ChatGPT" },
        { id: "gemini", label: "Gemini" },
      ] as const).filter((option) => isEnabledByGate(option.id, pageFeatures.setup.llms)),
    [pageFeatures.setup.llms]
  );
  const defaultVisibleLlm = (llmOptions[0]?.id as "chatgpt" | "gemini" | undefined) || "chatgpt";
  const selectedLlm =
    selectedLlmOverride && llmOptions.some((option) => option.id === selectedLlmOverride)
      ? selectedLlmOverride
      : defaultVisibleLlm;
  const effectiveProviderKeys = useMemo(
    () => selectedProviderKeys.filter((key) => providerOptions.some((option) => option.id === key)),
    [providerOptions, selectedProviderKeys]
  );
  const effectiveMcpToolIds = useMemo(() => {
    const validSelected = selectedMcpToolIds.filter((id) => actionOptions.some((option) => option.id === id));
    if (validSelected.length > 0) return validSelected;
    return actionOptions
      .filter((option) => effectiveProviderKeys.includes(option.group || ""))
      .map((option) => option.id);
  }, [actionOptions, effectiveProviderKeys, selectedMcpToolIds]);
  const initialMessages = pageFeatures.interaction.prefill
    ? []
    : [
      { role: "bot", content: "\uC548\uB155\uD558\uC138\uC694! \uBB54\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?" },
      { role: "bot", content: "\uBB38\uC758\uD558\uC2E4 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694." },
    ];

  const convo = useConversationController({
    page: "/",
    traceIdPrefix: "hero",
    initialMessages,
    makeRunBody: ({ text, sessionId }) => ({
      page_key: "/",
      route: NEW_MODEL_CONFIG.route,
      llm: selectedLlm,
      kb_id: undefined,
      inline_kb: pageFeatures.setup.inlineUserKbInput ? userKb.trim() || undefined : undefined,
      admin_kb_ids: NEW_MODEL_CONFIG.adminKbIds,
      mcp_tool_ids: pageFeatures.mcp.actionSelector ? effectiveMcpToolIds : undefined,
      mcp_provider_keys: pageFeatures.mcp.providerSelector ? effectiveProviderKeys : undefined,
      message: text,
      session_id: sessionId || undefined,
    }),
    mapErrorMessage: (error) =>
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
        : "\uC77C\uC2DC\uC801\uC778 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
  });
  const { messages, sending, sessionId, selectedMessageIds } = convo;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setConversationDebugOptions(resolvePageConversationDebugOptions("/", providerValue));
  }, [providerValue]);

  useEffect(() => {
    if (!loadPlan.loadInlineKbSamples) {
      return;
    }
    let active = true;
    apiFetch<{ items?: InlineKbSampleItem[] }>("/api/kb/samples")
      .then((res) => {
        if (!active) return;
        setInlineKbSamples((res.items || []).filter((item) => item.content?.trim().length > 0));
      })
      .catch(() => {
        if (!active) return;
        setInlineKbSamples([]);
      });
    return () => {
      active = false;
    };
  }, [loadPlan.loadInlineKbSamples]);

  const filteredActionOptions = actionOptions.filter((option) => {
    if (effectiveProviderKeys.length === 0) return false;
    return effectiveProviderKeys.includes(option.group || "");
  });

  const placeholder = "\uC2E0\uADDC \uB300\uD654 \uC9C8\uBB38\uC744 \uC785\uB825\uD558\uC138\uC694";
  const sampleContentById = useMemo(() => {
    const map = new Map<string, string>();
    inlineKbSamples.forEach((sample) => map.set(sample.id, sample.content));
    return map;
  }, [inlineKbSamples]);
  const inlineKbSampleConflict = useMemo(() => {
    if (inlineKbSampleSelectionOrder.length < 2) return false;
    const contents = inlineKbSampleSelectionOrder
      .map((id) => sampleContentById.get(id) || "")
      .filter((content) => content.trim().length > 0);
    if (contents.length < 2) return false;
    return hasConflictingInlineKbSamples(contents);
  }, [inlineKbSampleSelectionOrder, sampleContentById]);

  const updateConversationDebugOptions = useCallback(
    async (next: DebugTranscriptOptions) => {
      setConversationDebugOptions(next);
      const merged = { ...(providerValue?.debug_copy || {}), "/": next };
      try {
        await apiFetch<{ ok?: boolean; error?: string }>("/api/auth-settings/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "chat_policy",
            values: { debug_copy: merged },
            commit: true,
          }),
        });
      } catch (err) {
        // ignore on landing
      }
    },
    [providerValue]
  );

  const handleCopyTranscript = async () => {
    await convo.copyConversation(pageFeatures.adminPanel.copyConversation, conversationDebugOptions);
  };

  const handleCopyIssueTranscript = async () => {
    await convo.copyIssue(pageFeatures.adminPanel.copyIssue);
  };

  const toggleMessageSelection = (id: string) => {
    if (!pageFeatures.adminPanel.messageSelection || !chatSelectionEnabled) return;
    convo.toggleMessageSelection(id);
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    await convo.send(text);
  };

  return {
    pageFeatures,
    isAdminUser,
    selectedLlm,
    setupUi,
    llmOptions,
    setSelectedLlm: (value: "chatgpt" | "gemini") => {
      if (!llmOptions.some((option) => option.id === value)) return;
      setSelectedLlmOverride(value);
    },
    userKb,
    setUserKb,
    inlineKbSamples,
    inlineKbSampleSelectionOrder,
    inlineKbSampleConflict,
    applyInlineKbSamples: (sampleIds: string[]) => {
      const validIds = sampleIds.filter((id) => inlineKbSamples.some((item) => item.id === id));
      if (validIds.length === 0) return;
      setUserKb((prev) => {
        let next = prev;
        validIds.forEach((id) => {
          const sample = inlineKbSamples.find((item) => item.id === id);
          if (!sample) return;
          next = appendInlineKbSample(next, sample.content);
        });
        return next;
      });
      setInlineKbSampleSelectionOrder((prev) => [...prev, ...validIds]);
    },
    providerOptions,
    selectedProviderKeys: effectiveProviderKeys,
    setSelectedProviderKeys: (next: string[]) =>
      setSelectedProviderKeys(next.filter((key) => providerOptions.some((option) => option.id === key))),
    filteredActionOptions,
    selectedMcpToolIds: effectiveMcpToolIds,
    setSelectedMcpToolIds: (next: string[]) =>
      setSelectedMcpToolIds(next.filter((id) => actionOptions.some((option) => option.id === id))),
    adminLogControlsOpen,
    setAdminLogControlsOpen,
    chatSelectionEnabled,
    setChatSelectionEnabled,
    showAdminLogs,
    setShowAdminLogs,
    handleCopyTranscript,
    handleCopyIssueTranscript,
    conversationDebugOptions,
    updateConversationDebugOptions,
    messages,
    selectedMessageIds,
    toggleMessageSelection,
    sessionId,
    sending,
    quickReplyDrafts,
    lockedReplySelections,
    setQuickReplyDrafts,
    setLockedReplySelections,
    send: convo.send,
    setSelectedMessageIds: convo.setSelectedMessageIds,
    scrollRef,
    input,
    setInput,
    handleSubmit,
    placeholder,
  };
}