"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { WidgetShell, type WidgetMessage } from "@/components/design-system";

type ChatMessage = WidgetMessage;

type WidgetConfig = {
  id: string;
  name?: string | null;
  agent_id?: string | null;
  theme?: Record<string, unknown> | null;
  public_key?: string | null;
};

function buildId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSseEvent(chunk: string) {
  const lines = chunk.split("\n").map((line) => line.trim());
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.replace("event:", "").trim();
    if (line.startsWith("data:")) data += line.replace("data:", "").trim();
  }
  return { event, data };
}

export default function WidgetEmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const key = useMemo(() => String(params?.key || ""), [params]);
  const visitorId = useMemo(() => String(searchParams?.get("vid") || "").trim(), [searchParams]);
  const sessionSeed = useMemo(() => String(searchParams?.get("sid") || "").trim(), [searchParams]);
  const [widgetToken, setWidgetToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState("연결 중");
  const [pendingUser, setPendingUser] = useState<Record<string, any> | null>(null);
  const [pendingMeta, setPendingMeta] = useState<Record<string, any> | null>(null);
  const initCalledRef = useRef(false);
  const widgetTokenRef = useRef("");
  const sessionSeedRef = useRef(sessionSeed);
  const scrollRef = useRef<HTMLElement | null>(null);

  const appendMessage = useCallback((role: ChatMessage["role"], content: string) => {
    setMessages((prev) => [...prev, { id: buildId(), role, content }]);
  }, []);

  const fetchHistory = useCallback(async (token: string) => {
    if (!token) return [] as ChatMessage[];
    try {
      const res = await fetch("/api/widget/history", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return [] as ChatMessage[];
      const data = await res.json();
      const items = Array.isArray(data?.messages) ? data.messages : [];
      return items
        .map((item: Record<string, any>) => ({
          id: buildId(),
          role: item.role === "user" ? ("user" as const) : ("bot" as const),
          content: String(item.content || "").trim(),
        }))
        .filter((msg: ChatMessage) => msg.content.length > 0);
    } catch {
      return [] as ChatMessage[];
    }
  }, []);

  const callInit = useCallback(
    async (user?: Record<string, any> | null, options?: { forceNew?: boolean }) => {
      if (initCalledRef.current && !options?.forceNew) return;
      initCalledRef.current = true;
      setStatus(options?.forceNew ? "새 대화 준비 중" : "초기화 중");
      const referrer = typeof document !== "undefined" ? document.referrer : "";
      const meta = pendingMeta || {};
      const seedSession = options?.forceNew ? "" : sessionSeedRef.current;
      if (seedSession) sessionSeedRef.current = "";
      const payload = {
        public_key: key,
        origin: meta.origin || "",
        page_url: meta.page_url || referrer || "",
        referrer: meta.referrer || referrer || "",
        session_id: seedSession || undefined,
        visitor: {
          id: meta.visitor_id || visitorId || undefined,
          ...user,
        },
      };
      try {
        const res = await fetch("/api/widget/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("초기화 실패");
          appendMessage("system", `오류: ${data?.error || "INIT_FAILED"}`);
          return;
        }
        const nextToken = String(data.widget_token || "");
        const nextSessionId = String(data.session_id || "");
        setWidgetToken(nextToken);
        setSessionId(nextSessionId);
        setConfig(data.widget_config || null);
        try {
          window.parent?.postMessage?.(
            { type: "mejai_widget_session", session_id: nextSessionId },
            "*"
          );
        } catch {
          // ignore
        }
        try {
          window.parent?.postMessage?.(
            {
              type: "mejai_widget_theme",
              theme: data.widget_config?.theme || {},
              name: data.widget_config?.name || "",
            },
            "*"
          );
        } catch {
          // ignore
        }
        setStatus("대화 불러오는 중");
        const history = await fetchHistory(nextToken);
        const greeting =
          (data.widget_config?.theme && (data.widget_config.theme as Record<string, any>).greeting) ||
          "안녕하세요. 무엇을 도와드릴까요?";
        const nextMessages =
          history.length > 0 ? history : [{ id: buildId(), role: "bot" as const, content: String(greeting) }];
        setMessages(nextMessages);
        setStatus("연결됨");
      } catch (error) {
        setStatus("초기화 실패");
        appendMessage("system", `오류: ${error instanceof Error ? error.message : "INIT_FAILED"}`);
      }
    },
    [appendMessage, fetchHistory, key, pendingMeta, visitorId]
  );

  useEffect(() => {
    widgetTokenRef.current = widgetToken;
  }, [widgetToken]);

  useEffect(() => {
    sessionSeedRef.current = sessionSeed;
  }, [sessionSeed]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === "mejai_widget_init") {
        if (data.user) setPendingUser(data.user);
        const nextMeta = {
          origin: data.origin,
          page_url: data.page_url,
          referrer: data.referrer,
          visitor_id: data.visitor_id,
        };
        setPendingMeta(nextMeta);
        if (!initCalledRef.current && data.session_id) {
          sessionSeedRef.current = String(data.session_id || "").trim();
        }
      }
      if (data.type === "mejai_widget_event" && data.event) {
        const token = widgetTokenRef.current;
        if (!token) return;
        void fetch("/api/widget/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type: data.event, payload: { ts: Date.now() } }),
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void callInit(pendingUser);
    }, 200);
    return () => clearTimeout(timer);
  }, [callInit, pendingUser]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setInputValue("");
    setStatus("새 대화 준비 중");
    setWidgetToken("");
    setSessionId("");
    initCalledRef.current = false;
    void callInit(pendingUser, { forceNew: true });
  }, [callInit, pendingUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || !widgetToken || !sessionId) return;
    setInputValue("");
    appendMessage("user", text);
    setStatus("응답 중");
    try {
      const res = await fetch("/api/widget/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${widgetToken}`,
        },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      if (!res.body) {
        throw new Error("STREAM_UNAVAILABLE");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalMessage = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const parsed = parseSseEvent(part);
          if (parsed.event === "message") {
            try {
              const payload = JSON.parse(parsed.data);
              const msg = payload?.payload?.message || payload?.message || "";
              if (msg) {
                finalMessage = String(msg);
              }
            } catch {
              // ignore
            }
          }
        }
      }
      if (finalMessage) {
        appendMessage("bot", finalMessage);
        setStatus("연결됨");
      } else {
        setStatus("응답 없음");
      }
    } catch (error) {
      setStatus("응답 오류");
      appendMessage("system", `오류: ${error instanceof Error ? error.message : "REQUEST_FAILED"}`);
    }
  };

  const theme = (config?.theme || {}) as Record<string, any>;
  const brandName = String(config?.name || "Mejai");
  const launcherIconUrl = String(
    theme.launcher_icon_url || theme.launcherIconUrl || theme.icon_url || theme.iconUrl || ""
  );
  const headerIcon = launcherIconUrl || "/brand/logo.png";

  return (
    <div className="h-full">
      <WidgetShell
        brandName={brandName}
        status={status}
        iconUrl={headerIcon}
        messages={messages}
        inputPlaceholder={theme.input_placeholder || "메시지를 입력하세요"}
        disclaimer={theme.disclaimer ? String(theme.disclaimer) : ""}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        onNewConversation={handleNewConversation}
        sendDisabled={!inputValue.trim() || !widgetToken || !sessionId}
        scrollRef={scrollRef}
      />
    </div>
  );
}
