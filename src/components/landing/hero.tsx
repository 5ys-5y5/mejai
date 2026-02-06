"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Settings2, User } from "lucide-react";
import type { LandingSettings } from "@/lib/landingSettings";
import { MatrixRainBackground } from "@/components/landing/matrix-rain-background";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MultiSelectPopover, SelectPopover, type SelectOption } from "@/components/SelectPopover";
import { apiFetch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

type HeroMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  richHtml?: string;
  isLoading?: boolean;
};

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
  llm: "chatgpt",
  kbId: "",
  adminKbIds: [] as string[],
  mcpProviderKeys: [] as string[],
  mcpToolIds: [] as string[],
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeTraceId() {
  return `hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function Hero({ settings: _settings }: { settings: LandingSettings }) {
  const [messages, setMessages] = useState<HeroMessage[]>([
    {
      id: makeId(),
      role: "bot",
      content: "기록한대로 응대하는 AI 상담사를",
    },
    {
      id: makeId(),
      role: "bot",
      content: "압도적으로 저렴하게 사용해보세요",
    },
  ]);
  const [input, setInput] = useState("");
  const [userKb, setUserKb] = useState("");
  const [providerOptions, setProviderOptions] = useState<SelectOption[]>([]);
  const [actionOptions, setActionOptions] = useState<SelectOption[]>([]);
  const [selectedProviderKeys, setSelectedProviderKeys] = useState<string[]>(["solapi", "juso"]);
  const [selectedMcpToolIds, setSelectedMcpToolIds] = useState<string[]>([]);
  const [selectedLlm, setSelectedLlm] = useState<"chatgpt" | "gemini">("chatgpt");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
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
        const providers = res.providers || [];
        const nextProviderOptions = providers
          .filter((provider) => provider.key !== "cafe24")
          .map((provider) => ({
            id: provider.key,
            label: provider.title || provider.key,
          }));
        const nextActionOptions = providers
          .filter((provider) => provider.key !== "cafe24")
          .flatMap((provider) =>
            (provider.actions || []).map((action) => ({
              id: action.id,
              label: action.name,
              group: provider.key,
              description: action.description || undefined,
            }))
          );
        setProviderOptions(nextProviderOptions);
        setActionOptions(nextActionOptions);
      })
      .catch(() => {
        if (!active) return;
        setProviderOptions([]);
        setActionOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);

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

  useEffect(() => {
    if (selectedMcpToolIds.length > 0 || actionOptions.length === 0) return;
    const nextSelected = actionOptions
      .filter((option) => selectedProviderKeys.includes(option.group || ""))
      .map((option) => option.id);
    if (nextSelected.length > 0) {
      setSelectedMcpToolIds(nextSelected);
    }
  }, [actionOptions, selectedMcpToolIds.length, selectedProviderKeys]);

  const llmOptions: SelectOption[] = [
    { id: "chatgpt", label: "ChatGPT" },
    { id: "gemini", label: "Gemini" },
  ];

  const placeholder = "신규 대화 질문을 입력하세요";

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    const loadingId = makeId();
    const selectedProviders = selectedProviderKeys;
    const inlineKb = userKb.trim();

    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", content: text },
      { id: loadingId, role: "bot", content: "답변 생성 중...", isLoading: true },
    ]);

    try {
      const res = await apiFetch<{
        session_id: string;
        message?: string;
        rich_message_html?: string;
      }>("/api/laboratory/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-runtime-trace-id": makeTraceId(),
        },
        body: JSON.stringify({
          route: NEW_MODEL_CONFIG.route,
          llm: selectedLlm,
          kb_id: undefined,
          inline_kb: inlineKb || undefined,
          admin_kb_ids: NEW_MODEL_CONFIG.adminKbIds,
          mcp_tool_ids: selectedMcpToolIds,
          mcp_provider_keys: selectedProviders,
          message: text,
          session_id: sessionId || undefined,
        }),
      });

      setSessionId(res.session_id || sessionId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
              ...msg,
              content: res.message || "응답을 받지 못했습니다. 다시 시도해 주세요.",
              richHtml: res.rich_message_html || undefined,
              isLoading: false,
            }
            : msg
        )
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message === "UNAUTHORIZED"
          ? "로그인 후에 신규 모델을 체험할 수 있습니다."
          : "요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
              ...msg,
              content: message,
              isLoading: false,
            }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-white text-black border-b border-zinc-200 flex items-center !py-0">
      <div className="hero-bg absolute inset-0 pointer-events-none">
        <MatrixRainBackground />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-white to-transparent" />

      <div className="relative container mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="hero-left-pane rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <div className="space-y-1">
            <div className="hero-muted text-[11px] font-semibold text-zinc-600">사용자 KB입력란</div>
            <textarea
              value={userKb}
              onChange={(event) => setUserKb(event.target.value)}
              placeholder="예) 고객 정책, 자주 묻는 질문, 톤 가이드 등을 입력하세요."
              className="hero-input h-36 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
            />
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-600">LLM 선택</div>
              <div className="flex items-center gap-2">
                <SelectPopover
                  value={selectedLlm}
                  onChange={(value) => setSelectedLlm(value as "chatgpt" | "gemini")}
                  options={llmOptions}
                  className="flex-1 min-w-0"
                />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-600">MCP 프로바이더 선택</div>
              <div className="flex items-center gap-2">
                <MultiSelectPopover
                  values={selectedProviderKeys}
                  onChange={setSelectedProviderKeys}
                  options={providerOptions}
                  placeholder="선택"
                  displayMode="count"
                  className="flex-1 min-w-0"
                />
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-600">MCP 액션 선택</div>
              <div className="flex items-center gap-2">
                <MultiSelectPopover
                  values={selectedMcpToolIds}
                  onChange={setSelectedMcpToolIds}
                  options={actionOptions.filter((option) => {
                    if (selectedProviderKeys.length === 0) return false;
                    return selectedProviderKeys.includes(option.group || "");
                  })}
                  placeholder="선택"
                  displayMode="count"
                  searchable
                  className="flex-1 min-w-0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="hero-chat relative h-full border border-slate-200 bg-white/90 p-4 flex flex-col overflow-visible rounded-xl backdrop-blur">
          {isAdminUser ? (
            <div className="absolute right-6 top-6 z-20">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="로그 설정"
                title="로그 설정"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <div
            ref={scrollRef}
            className="hero-thread relative z-0 max-h-[420px] flex-1 overflow-auto pr-2 pl-2 pb-4 scrollbar-hide bg-slate-50 rounded-t-xl rounded-b-none pt-2"
          >
            {messages.map((msg, index) => {
              const prev = messages[index - 1];
              const isGrouped = prev?.role === msg.role;
              const rowGap = "gap-3";
              const rowSpacing = index === 0 ? "" : isGrouped ? "mt-1" : "mt-3";
              const showAvatar = !isGrouped;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    rowGap,
                    rowSpacing,
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "bot" && showAvatar ? (
                    <div className="hero-avatar h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                      <Bot className="h-4 w-4 text-slate-500" />
                    </div>
                  ) : msg.role === "bot" ? (
                    <div
                      className="hero-avatar h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative max-w-[75%]">
                    <div
                      className={cn(
                        "hero-bubble relative whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm transition",
                        msg.role === "user"
                          ? "hero-bubble-user bg-slate-900 text-white"
                          : "hero-bubble-bot bg-slate-100 text-slate-700 border border-slate-200"
                      )}
                    >
                      {msg.richHtml ? (
                        <span dangerouslySetInnerHTML={{ __html: msg.richHtml }} />
                      ) : (
                        msg.content
                      )}
                      {msg.isLoading ? (
                        <span className="hero-muted ml-2 inline-flex items-center text-xs text-slate-500">
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {msg.role === "user" && showAvatar ? (
                    <div className="hero-avatar h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                  ) : msg.role === "user" ? (
                    <div
                      className="hero-avatar h-8 w-8 shrink-0 rounded-full border border-slate-200 bg-white opacity-0"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[3.25rem] z-10 h-4 bg-gradient-to-t from-white to-transparent" />
          <form onSubmit={handleSubmit} className="hero-input-row relative flex gap-2 bg-white z-20">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              className="hero-input flex-1 bg-white"
            />
            <Button type="submit" disabled={sending || !input.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? "전송 중" : "전송"}
            </Button>
          </form>
        </div>
      </div>

    </section>
  );
}
