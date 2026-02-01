"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, getAccessToken } from "@/lib/apiClient";
import { Bot, RefreshCw, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatKstDateTime } from "@/lib/kst";

const WS_URL = process.env.NEXT_PUBLIC_CALL_WS_URL || "";

type AgentItem = {
  id: string;
  parent_id?: string | null;
  name: string;
  llm: string | null;
  kb_id: string | null;
  mcp_tool_ids?: string[] | null;
  version: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
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

type SessionItem = {
  id: string;
  session_code: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  channel: string | null;
  caller_masked: string | null;
  agent_id: string | null;
  outcome: string | null;
  sentiment: string | null;
  escalation_reason: string | null;
  metadata?: Record<string, any> | null;
};

type TurnRow = {
  id: string;
  seq: number | null;
  transcript_text: string | null;
  summary_text: string | null;
  answer_text: string | null;
  final_answer: string | null;
  correction_text: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AgentPlaygroundNaturalPage() {
  const params = useParams<{ id: string }>();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [agent, setAgent] = useState<AgentItem | null>(null);
  const [kb, setKb] = useState<KbItem | null>(null);
  const [tools, setTools] = useState<MpcTool[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("연결 대기");
  const wsRef = useRef<WebSocket | null>(null);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<TurnRow[]>([]);
  const [turnsLoading, setTurnsLoading] = useState(false);

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
        const toolRes = await apiFetch<{ items: MpcTool[] }>("/api/mcp/tools").catch(() => ({ items: [] }));
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
    async function loadSessions() {
      if (!agentId) return;
      setSessionsLoading(true);
      try {
        const res = await apiFetch<{ items: SessionItem[] }>("/api/sessions?limit=100&order=started_at.desc");
        if (!mounted) return;
        const filtered = (res.items || []).filter((s) => s.agent_id === agentId);
        setSessions(filtered);
        setSelectedSessionId((prev) => prev || filtered[0]?.id || null);
      } catch {
        if (!mounted) return;
        setSessions([]);
        setSelectedSessionId(null);
      } finally {
        if (mounted) setSessionsLoading(false);
      }
    }
    loadSessions();
    return () => {
      mounted = false;
    };
  }, [agentId]);

  useEffect(() => {
    let mounted = true;
    async function loadTurns() {
      if (!selectedSessionId) {
        setTurns([]);
        return;
      }
      setTurnsLoading(true);
      try {
        const res = await apiFetch<TurnRow[]>(`/api/sessions/${selectedSessionId}/turns`);
        if (!mounted) return;
        setTurns(res || []);
      } catch {
        if (!mounted) return;
        setTurns([]);
      } finally {
        if (mounted) setTurnsLoading(false);
      }
    }
    loadTurns();
    return () => {
      mounted = false;
    };
  }, [selectedSessionId]);

  useEffect(() => {
    setMessages([]);
    setAwaitingResponse(false);
  }, [selectedSessionId]);

  const connectWs = useCallback(() => {
    if (!WS_URL) {
      setStatus("WS URL 미설정");
      return;
    }
    if (wsRef.current) wsRef.current.close();
    setStatus("연결 중");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.addEventListener("open", () => {
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
        if (payload.session_id) setSessionId(String(payload.session_id));
        setAwaitingResponse(false);
        setMessages((prev) => [...prev, { id: makeId(), role: "bot", content: String(payload.text || "") }]);
      }
      if (payload.type === "error") {
        setAwaitingResponse(false);
        const detail = payload.detail ? ` (${JSON.stringify(payload.detail)})` : "";
        const statusText = payload.status ? ` [${payload.status}]` : "";
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "bot", content: `오류: ${payload.error || "UNKNOWN"}${statusText}${detail}` },
        ]);
      }
    });
    ws.addEventListener("close", () => setStatus("연결 종료"));
    ws.addEventListener("error", () => setStatus("연결 오류"));
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      const ws = wsRef.current;
      if (ws) ws.close();
    };
  }, [connectWs]);

  const historyMessages = useMemo(() => {
    const acc: ChatMessage[] = [];
    turns.forEach((turn) => {
      if (turn.transcript_text) acc.push({ id: `${turn.id}-user`, role: "user", content: turn.transcript_text });
      const answer = turn.final_answer || turn.answer_text;
      if (answer) acc.push({ id: `${turn.id}-bot`, role: "bot", content: answer });
    });
    return acc;
  }, [turns]);

  const renderBotContent = (content: string) => {
    if (!content.includes("debug_prefix")) return content;
    const html = content.replace(/\n/g, "<br/>");
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [...prev, { id: makeId(), role: "bot", content: "WebSocket 연결이 없습니다." }]);
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setMessages((prev) => [...prev, { id: makeId(), role: "bot", content: "인증 토큰이 없습니다." }]);
      return;
    }
    ws.send(
      JSON.stringify({
        type: "user_message",
        access_token: accessToken,
        agent_id: agentId,
        session_id: sessionId || selectedSessionId,
        text,
        mode: "natural",
      })
    );
    setAwaitingResponse(true);
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">에이전트 대화 테스트 (자연 대화)</h1>
            <p className="mt-1 text-sm text-slate-500">하드코딩 분기 없이 자연 대화 우선 모드입니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/agents/${encodeURIComponent(agentId)}/playground`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              기본 모드로 이동
            </Link>
            <button
              type="button"
              onClick={connectWs}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title="웹소켓 새로고침"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Card className="mt-4 p-5">
          <div className="text-sm font-semibold text-slate-900">세션 히스토리</div>
          {sessionsLoading ? <div className="mt-2 text-xs text-slate-500">불러오는 중...</div> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedSessionId(session.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  selectedSessionId === session.id ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
                )}
              >
                {session.session_code || session.id} · {formatKstDateTime(session.started_at)}
              </button>
            ))}
          </div>
        </Card>

        <Card className="mt-4 p-5">
          <div className="text-sm font-semibold text-slate-900">신규 대화 테스트</div>
          {loading ? <div className="mt-2 text-xs text-slate-500">불러오는 중...</div> : null}
          <div className="mt-4 space-y-4">
            {[...historyMessages, ...messages].map((msg) => (
              <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
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
                  {msg.role === "bot" ? renderBotContent(msg.content) : msg.content}
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
              placeholder="자연 대화 모드로 대화를 시작하세요."
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
