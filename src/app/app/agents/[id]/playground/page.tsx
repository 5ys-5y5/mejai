"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, getAccessToken } from "@/lib/apiClient";
import { Bot, RefreshCw, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AgentItem = {
  id: string;
  name: string;
  llm: string | null;
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
  version: string | null;
};

type KbItem = {
  id: string;
  title: string;
  content: string | null;
  version: string | null;
};

type MpcTool = {
  id: string;
  name: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AgentPlaygroundPage() {
  const params = useParams<{ id: string }>();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [agent, setAgent] = useState<AgentItem | null>(null);
  const [kb, setKb] = useState<KbItem | null>(null);
  const [tools, setTools] = useState<MpcTool[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "bot",
      content: "에이전트 구성(LLM, MCP, KB)을 기반으로 대화를 테스트하는 영역입니다.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("연결 대기");
  const wsRef = useRef<WebSocket | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!agentId) return;
      setLoading(true);
      try {
        const agentRes = await apiFetch<AgentItem>(`/api/agents/${agentId}`);
        if (!mounted) return;
        setAgent(agentRes);
        if (agentRes.kb_id) {
          const kbRes = await apiFetch<KbItem>(`/api/kb/${agentRes.kb_id}`);
          if (mounted) setKb(kbRes);
        } else {
          setKb(null);
        }
        const toolRes = await apiFetch<{ items: MpcTool[] }>("/api/mcp/tools").catch(() => ({
          items: [],
        }));
        if (mounted) setTools(toolRes.items || []);
      } catch {
        if (mounted) {
          setAgent(null);
          setKb(null);
          setTools([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [agentId]);

  useEffect(() => {
    let mounted = true;
    async function connect() {
      const wsUrl = process.env.NEXT_PUBLIC_CALL_WS_URL || "";
      if (!wsUrl) {
        if (mounted) setStatus("WS URL 미설정");
        return;
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.addEventListener("open", () => {
        if (!mounted) return;
        setStatus("연결됨");
        ws.send(JSON.stringify({ type: "join" }));
      });
      ws.addEventListener("message", (event) => {
        let payload: any = null;
        try {
          payload = JSON.parse(event.data);
        } catch {
          payload = { type: "assistant_message", text: String(event.data) };
        }
        if (payload.type === "assistant_message") {
          if (payload.session_id && mounted) {
            setSessionId(String(payload.session_id));
          }
          if (mounted) setAwaitingResponse(false);
          setMessages((prev) => [
            ...prev,
            { id: makeId(), role: "bot", content: String(payload.text || "") },
          ]);
        }
        if (payload.type === "error" && mounted) {
          setAwaitingResponse(false);
          setMessages((prev) => [
            ...prev,
            { id: makeId(), role: "bot", content: `오류: ${payload.error || "UNKNOWN"}` },
          ]);
        }
      });
      ws.addEventListener("close", () => {
        if (mounted) setStatus("연결 종료");
      });
      ws.addEventListener("error", () => {
        if (mounted) setStatus("연결 오류");
      });
    }
    connect();
    return () => {
      mounted = false;
      const ws = wsRef.current;
      if (ws) ws.close();
    };
  }, []);

  const toolNames = useMemo(() => {
    if (!agent?.mcp_tool_ids?.length) return [];
    const map = new Map(tools.map((t) => [t.id, t.name]));
    return agent.mcp_tool_ids.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [agent, tools]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "bot", content: "WebSocket 연결이 없습니다." },
      ]);
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "bot", content: "인증 토큰이 없습니다." },
      ]);
      return;
    }

    ws.send(
      JSON.stringify({
        type: "user_message",
        access_token: accessToken,
        agent_id: agentId,
        session_id: sessionId,
        text,
      })
    );
    setAwaitingResponse(true);
  };

  const handleReindex = async () => {
    if (reindexing) return;
    setReindexing(true);
    try {
      const res = await apiFetch<{ ok: boolean; total: number; updated: number }>("/api/kb/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      });
      if (res.ok) {
        toast.success(`KB 임베딩 재생성 완료 (${res.updated}/${res.total})`);
      } else {
        toast.error("KB 임베딩 재생성 실패");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "KB 임베딩 재생성 실패";
      toast.error(message || "KB 임베딩 재생성 실패");
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">에이전트 대화 테스트</h1>
            <p className="mt-1 text-sm text-slate-500">
              LLM, MCP, KB 설정을 확인하기 위한 테스트 채팅입니다.
            </p>
          </div>
          <Link
            href={`/app/agents/${encodeURIComponent(agentId)}`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            옵션으로
          </Link>
        </div>

        <Card className="mt-6 p-5">
          {loading ? (
            <div className="text-sm text-slate-500">에이전트 정보를 불러오는 중...</div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  이름: {agent?.name || "-"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  LLM: {agent?.llm || "-"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  KB: {kb?.title || "-"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  MCP: {toolNames.length ? `${toolNames[0]}${toolNames.length > 1 ? `+${toolNames.length - 1}` : ""}` : "-"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  WS: {status}
                </span>
              </div>
              <button
                type="button"
                onClick={handleReindex}
                disabled={reindexing}
                aria-label="KB 임베딩 재생성"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  reindexing ? "cursor-not-allowed opacity-60" : ""
                )}
              >
                <RefreshCw className={cn("h-4 w-4", reindexing ? "animate-spin" : "")} />
              </button>
            </div>
          )}
        </Card>

        <Card className="mt-4 p-5">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "bot" ? (
                  <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                    <Bot className="h-4 w-4 text-slate-500" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "user" ? (
                  <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                ) : null}
              </div>
            ))}
            {awaitingResponse ? (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                  <Bot className="h-4 w-4 text-slate-500" />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-2 text-sm bg-slate-100 text-slate-600 border border-slate-200">
                  답변 생성 중...
                </div>
              </div>
            ) : null}
          </div>
          <form onSubmit={handleSend} className="mt-6 flex gap-2">
            <Input
              placeholder="테스트 메시지를 입력하세요."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!inputValue.trim()}>
              <Send className="mr-2 h-4 w-4" />
              전송
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
