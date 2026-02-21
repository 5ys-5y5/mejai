"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ConversationThread } from "@/components/design-system";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Send, Phone, Wifi, WifiOff } from "lucide-react";
import { getAccessToken } from "@/lib/apiClient";
import { renderBotContent } from "@/lib/conversation/messageRenderUtils";

type ChatMessage = {
  id: string;
  role: "user" | "bot" | "system";
  content: string;
};

const WS_URL = process.env.NEXT_PUBLIC_CALL_WS_URL || "";

export default function WebInputPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = useMemo(() => String(params?.token || ""), [params]);
  const initialAgentId = useMemo(() => String(searchParams?.get("agent_id") || "").trim(), [searchParams]);
  const initialSessionId = useMemo(() => String(searchParams?.get("session_id") || "").trim(), [searchParams]);
  const requestedMode = useMemo(
    () => (String(searchParams?.get("mode") || "").trim().toLowerCase() === "natural" ? "natural" : "mk2"),
    [searchParams]
  );
  const requestedLlm = useMemo(() => {
    const llm = String(searchParams?.get("llm") || "").trim().toLowerCase();
    return llm === "gemini" ? "gemini" : "chatgpt";
  }, [searchParams]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      content:
        "음성 인식이 어려운 경우 텍스트로 입력해 주세요. 이 채팅은 통화와 동기화됩니다.",
    },
  ]);
  const displayMessages = useMemo(
    () =>
      messages.map((msg) => ({
        id: msg.id,
        role: msg.role === "user" ? "user" : "bot",
        content: msg.content,
      })),
    [messages]
  );
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState(WS_URL ? "연결 대기" : "실시간 서버 주소가 설정되지 않았습니다.");
  const [accessToken, setAccessToken] = useState("");
  const [runtimeSessionId, setRuntimeSessionId] = useState(initialSessionId);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;
    getAccessToken()
      .then((tokenValue) => {
        if (!mounted) return;
        setAccessToken(tokenValue || "");
      })
      .catch(() => {
        if (!mounted) return;
        setAccessToken("");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!WS_URL) return;

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setStatus("연결됨");
      ws.send(
        JSON.stringify({
          type: "join",
          token,
          access_token: accessToken || undefined,
          agent_id: initialAgentId || undefined,
          session_id: runtimeSessionId || undefined,
          mode: requestedMode,
          llm: requestedLlm,
        })
      );
    });

    ws.addEventListener("message", (event) => {
      let payload: Record<string, unknown> | null = null;
      try {
        payload = JSON.parse(event.data) as Record<string, unknown>;
      } catch {
        payload = { text: String(event.data), role: "assistant" };
      }

      const role =
        payload.role === "user" ? "user" : payload.role === "system" ? "system" : "bot";
      const content =
        (typeof payload.text === "string" ? payload.text : "") ||
        (typeof payload.message === "string" ? payload.message : "");
      if (typeof payload.session_id === "string" && payload.session_id) {
        setRuntimeSessionId(payload.session_id);
      }
      if (payload.type === "error") {
        const errorText = (typeof payload.error === "string" && payload.error) || "REQUEST_FAILED";
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            role: "system",
            content: `오류: ${errorText}`,
          },
        ]);
        setStatus("응답 오류");
        return;
      }
      if (!content) return;

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, role, content },
      ]);
    });

    ws.addEventListener("close", () => {
      setStatus("연결 종료");
    });

    ws.addEventListener("error", () => {
      setStatus("연결 오류");
    });

    return () => {
      ws.close();
    };
  }, [token, accessToken, initialAgentId, runtimeSessionId, requestedMode, requestedLlm]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = { role: "user" as const, content: inputValue };
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...newMessage },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "user_message",
          token,
          text: inputValue,
          access_token: accessToken || undefined,
          agent_id: initialAgentId || undefined,
          session_id: runtimeSessionId || undefined,
          mode: requestedMode,
          llm: requestedLlm,
        })
      );
    } else {
      setStatus("메시지 전송 실패: 연결 상태를 확인하세요.");
    }

    setInputValue("");
  };

  return (
    <div className="min-h-screen bg-accent/10 flex flex-col">
      <header className="bg-background border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm">통화 중 실시간 입력</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase">
              {status === "연결됨" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {status}
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
          세션 토큰: {token || "-"}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-2xl mx-auto pb-20">
          <ConversationThread
            messages={displayMessages}
            selectedMessageIds={[]}
            selectionEnabled={false}
            onToggleSelection={() => undefined}
            renderContent={(msg) => (msg.role === "bot" ? renderBotContent(msg.content) : msg.content)}
          />
        </div>
      </main>

      <footer className="bg-background border-t p-4 sticky bottom-0">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder="문의 내용을 입력하세요..."
            className="flex-1 h-12 rounded-full px-6"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            className="w-12 h-12 rounded-full shrink-0"
            disabled={!inputValue.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
        <p className="max-w-2xl mx-auto text-[11px] text-muted-foreground mt-3">
          이 채팅에서 생성되는 대형 언어 모델 응답은 동일한 내용으로 통화 음성에 전달됩니다.
        </p>
      </footer>
    </div>
  );
}
