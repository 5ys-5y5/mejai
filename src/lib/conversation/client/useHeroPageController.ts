"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { isProviderEnabled, isToolEnabled } from "@/lib/conversation/pageFeaturePolicy";
import { useConversationController } from "@/lib/conversation/client/useConversationController";
import { useConversationPageFeatures } from "@/lib/conversation/client/useConversationPageFeatures";
import { resolvePageConversationDebugOptions } from "@/lib/transcriptCopyPolicy";

type McpAction = {
  id: string;
  provider_key?: string;
  provider?: string;
  name: string;
  description?: string | null;
};

type McpProvider = {
  key: string;
  title: string;
  actions: McpAction[];
};

const NEW_MODEL_CONFIG = {
  route: "shipping",
  kbId: "",
  adminKbIds: [] as string[],
};

export function useHeroPageController() {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { features: pageFeatures, providerValue } = useConversationPageFeatures("/", isAdminUser);
  const [input, setInput] = useState("");
  const [userKb, setUserKb] = useState("");
  const [providerOptions, setProviderOptions] = useState<SelectOption[]>([]);
  const [actionOptions, setActionOptions] = useState<SelectOption[]>([]);
  const [selectedProviderKeys, setSelectedProviderKeys] = useState<string[]>(["solapi", "juso"]);
  const [selectedMcpToolIds, setSelectedMcpToolIds] = useState<string[]>([]);
  const [selectedLlmOverride, setSelectedLlmOverride] = useState<"chatgpt" | "gemini" | null>(null);
  const [adminLogControlsOpen, setAdminLogControlsOpen] = useState(false);
  const [chatSelectionEnabled, setChatSelectionEnabled] = useState(false);
  const [showAdminLogs, setShowAdminLogs] = useState(false);
  const [quickReplyDrafts, setQuickReplyDrafts] = useState<Record<string, string[]>>({});
  const [lockedReplySelections, setLockedReplySelections] = useState<Record<string, string[]>>({});
  const selectedLlm = selectedLlmOverride ?? pageFeatures.setup.defaultLlm;
  const effectiveProviderKeys = selectedProviderKeys.filter((key) => providerOptions.some((option) => option.id === key));
  const effectiveMcpToolIds = selectedMcpToolIds.filter((id) => actionOptions.some((option) => option.id === id));
  const convo = useConversationController({
    page: "/",
    traceIdPrefix: "hero",
    initialMessages: [
      { role: "bot", content: "기록한대로 응대하는 AI 상담사를" },
      { role: "bot", content: "압도적으로 저렴하게 사용해보세요" },
    ],
    makeRunBody: ({ text, sessionId }) => ({
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
        ? "로그인 후에 신규 모델을 체험할 수 있습니다."
        : "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  });
  const { messages, sending, sessionId, selectedMessageIds } = convo;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    let active = true;
    apiFetch<{ providers?: McpProvider[] }>("/api/mcp")
      .then((res) => {
        if (!active) return;
        const providers = (res.providers || []).filter((provider) => isProviderEnabled(provider.key, pageFeatures));
        const nextProviderOptions = providers
          .map((provider) => ({
            id: provider.key,
            label: provider.title || provider.key,
          }));
        const nextActionOptions = providers
          .flatMap((provider) =>
            (provider.actions || []).map((action) => ({
              id: action.id,
              label: action.name,
              group: provider.key,
              description: action.description || undefined,
            }))
          )
          .filter((action) => isToolEnabled(action.id, pageFeatures));
        setProviderOptions(nextProviderOptions);
        setActionOptions(nextActionOptions);
        setSelectedProviderKeys((prev) => prev.filter((key) => nextProviderOptions.some((opt) => opt.id === key)));
        setSelectedMcpToolIds((prev) => {
          if (prev.length > 0) return prev.filter((id) => nextActionOptions.some((opt) => opt.id === id));
          const nextSelected = nextActionOptions
            .filter((option) => selectedProviderKeys.includes(option.group || ""))
            .map((option) => option.id);
          return nextSelected.length > 0 ? nextSelected : prev;
        });
      })
      .catch(() => {
        if (!active) return;
        setProviderOptions([]);
        setActionOptions([]);
      });
    return () => {
      active = false;
    };
  }, [pageFeatures, selectedProviderKeys]);

  useEffect(() => {
    let active = true;
    apiFetch<{ is_admin?: boolean }>("/api/user-profile")
      .then((res) => {
        if (!active) return;
        setIsAdminUser(Boolean(res?.is_admin));
      })
      .catch(() => {
        if (!active) return;
        setIsAdminUser(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const llmOptions: SelectOption[] = [
    { id: "chatgpt", label: "ChatGPT" },
    { id: "gemini", label: "Gemini" },
  ];
  const filteredActionOptions = actionOptions.filter((option) => {
    if (selectedProviderKeys.length === 0) return false;
    return selectedProviderKeys.includes(option.group || "");
  });

  const placeholder = "신규 대화 질문을 입력하세요";

  const handleCopyTranscript = async () => {
    await convo.copyConversation(
      pageFeatures.adminPanel.copyConversation,
      resolvePageConversationDebugOptions("/", providerValue)
    );
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
    llmOptions,
    setSelectedLlm: (value: "chatgpt" | "gemini") => setSelectedLlmOverride(value),
    userKb,
    setUserKb,
    providerOptions,
    selectedProviderKeys,
    setSelectedProviderKeys,
    filteredActionOptions,
    selectedMcpToolIds,
    setSelectedMcpToolIds,
    adminLogControlsOpen,
    setAdminLogControlsOpen,
    chatSelectionEnabled,
    setChatSelectionEnabled,
    showAdminLogs,
    setShowAdminLogs,
    handleCopyTranscript,
    handleCopyIssueTranscript,
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
