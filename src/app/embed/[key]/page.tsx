"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "bot" | "system";
  content: string;
};

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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = useCallback((role: ChatMessage["role"], content: string) => {
    setMessages((prev) => [...prev, { id: buildId(), role, content }]);
  }, []);

  const callInit = useCallback(
    async (user?: Record<string, any> | null) => {
      if (initCalledRef.current) return;
      initCalledRef.current = true;
      setStatus("초기화 중");
      const referrer = typeof document !== "undefined" ? document.referrer : "";
      const meta = pendingMeta || {};
      const payload = {
        public_key: key,
        origin: meta.origin || "",
        page_url: meta.page_url || referrer || "",
        referrer: meta.referrer || referrer || "",
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
        setWidgetToken(String(data.widget_token || ""));
        setSessionId(String(data.session_id || ""));
        setConfig(data.widget_config || null);
        const greeting =
          (data.widget_config?.theme && (data.widget_config.theme as Record<string, any>).greeting) ||
          "안녕하세요. 무엇을 도와드릴까요?";
        appendMessage("bot", String(greeting));
        setStatus("연결됨");
      } catch (error) {
        setStatus("초기화 실패");
        appendMessage("system", `오류: ${error instanceof Error ? error.message : "INIT_FAILED"}`);
      }
    },
    [appendMessage, key, pendingMeta, visitorId]
  );

  useEffect(() => {
    widgetTokenRef.current = widgetToken;
  }, [widgetToken]);

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

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-semibold">{brandName}</div>
        <div className="text-[11px] text-slate-500">{status}</div>
      </header>
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const prev = messages[idx - 1];
          const grouped = prev?.role === msg.role;
          return (
            <div
              key={msg.id}
              className={cn("flex", isUser ? "justify-end" : "justify-start", grouped ? "mt-1" : "mt-2")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  isUser ? "bg-slate-900 text-white" : "bg-slate-100 border border-slate-200 text-slate-800"
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
      </main>
      <footer className="border-t border-slate-200 px-3 py-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input
            placeholder={theme.input_placeholder || "메시지를 입력하세요"}
            className="flex-1 h-10 rounded-full px-4"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button type="submit" size="icon" className="h-10 w-10 rounded-full" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {theme.disclaimer ? (
          <div className="mt-2 text-[10px] text-slate-500">{String(theme.disclaimer)}</div>
        ) : null}
      </footer>
    </div>
  );
}
