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
const LAST_AGENT_STORAGE_KEY = "mejai.playground.lastAgentId";

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

type ConnectionIssue = {
  key: "llm" | "kb" | "mcp" | "ws";
  title: string;
  detail: string;
  action: string;
};

function parseVersionParts(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  const match = raw.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/i);
  if (!match) return null;
  const major = Number(match[1] || 0);
  const minor = Number(match[2] || 0);
  const patch = Number(match[3] || 0);
  return [major, minor, patch];
}

function compareAgentVersions(a: AgentItem, b: AgentItem) {
  const aParts = parseVersionParts(a.version);
  const bParts = parseVersionParts(b.version);
  if (aParts && bParts) {
    for (let i = 0; i < 3; i += 1) {
      if (aParts[i] !== bParts[i]) return bParts[i] - aParts[i];
    }
  } else if (aParts && !bParts) {
    return -1;
  } else if (!aParts && bParts) {
    return 1;
  }
  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getConnectionIssues({
  agent,
  kb,
  toolNames,
  wsStatus,
}: {
  agent: AgentItem | null;
  kb: KbItem | null;
  toolNames: string[];
  wsStatus: string;
}) {
  const issues: ConnectionIssue[] = [];
  if (!agent?.llm) {
    issues.push({
      key: "llm",
      title: "LLM 미설정",
      detail: "LLM이 연결되어 있지 않습니다.",
      action: "에이전트 옵션에서 LLM을 선택하세요.",
    });
  }
  if (!agent?.kb_id) {
    issues.push({
      key: "kb",
      title: "KB 미연결",
      detail: "지식베이스가 연결되어 있지 않습니다.",
      action: "에이전트 옵션에서 KB를 선택하세요.",
    });
  } else if (!kb) {
    issues.push({
      key: "kb",
      title: "KB 조회 실패",
      detail: "연결된 KB 정보를 불러오지 못했습니다.",
      action: "KB를 다시 선택하거나 KB 상태를 확인하세요.",
    });
  }
  if (!agent?.mcp_tool_ids?.length) {
    issues.push({
      key: "mcp",
      title: "MCP 미연결",
      detail: "연결된 MCP 도구가 없습니다.",
      action: "에이전트 옵션에서 MCP 도구를 추가하세요.",
    });
  } else if (toolNames.length === 0) {
    issues.push({
      key: "mcp",
      title: "MCP 조회 실패",
      detail: "연결된 MCP 도구 정보를 불러오지 못했습니다.",
      action: "MCP 도구 연결 상태를 확인하세요.",
    });
  }
  if (!WS_URL) {
    issues.push({
      key: "ws",
      title: "WebSocket 미설정",
      detail: "실시간 서버 주소가 설정되지 않았습니다.",
      action: "NEXT_PUBLIC_CALL_WS_URL을 설정하고 서버를 재시작하세요.",
    });
  } else if (wsStatus !== "연결됨") {
    issues.push({
      key: "ws",
      title: "WebSocket 비활성화",
      detail: `현재 상태: ${wsStatus}`,
      action: "실시간 서버 실행 여부와 네트워크 상태를 확인하세요.",
    });
  }
  return issues;
}

export default function AgentPlaygroundPage() {
  const params = useParams<{ id: string }>();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agentId || "");

  const [agent, setAgent] = useState<AgentItem | null>(null);
  const [kb, setKb] = useState<KbItem | null>(null);
  const [tools, setTools] = useState<MpcTool[]>([]);
  const [agentVersions, setAgentVersions] = useState<AgentItem[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [kbItems, setKbItems] = useState<KbItem[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("연결 대기");
  const wsRef = useRef<WebSocket | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<TurnRow[]>([]);
  const [turnsLoading, setTurnsLoading] = useState(false);
  const [turnsError, setTurnsError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mode, setMode] = useState<"history" | "edit" | "new">("history");

  useEffect(() => {
    if (!agentId) return;
    if (typeof window === "undefined") {
      setSelectedAgentId(agentId);
      return;
    }
    const stored = window.localStorage.getItem(LAST_AGENT_STORAGE_KEY);
    if (stored && stored !== agentId) {
      setSelectedAgentId(stored);
    } else {
      setSelectedAgentId(agentId);
    }
  }, [agentId]);

  const handleSelectVersion = useCallback(
    (id: string) => {
      if (!id || id === selectedAgentId) return;
      setSelectedAgentId(id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_AGENT_STORAGE_KEY, id);
      }
    },
    [selectedAgentId]
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!selectedAgentId) return;
      setLoading(true);
      try {
        const agentRes = await apiFetch<AgentItem>(`/api/agents/${selectedAgentId}`);
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
  }, [selectedAgentId]);

  useEffect(() => {
    let mounted = true;
    async function loadVersions() {
      if (!agent) return;
      setVersionsLoading(true);
      try {
        const [agentRes, kbRes, sessionRes] = await Promise.all([
          apiFetch<{ items: AgentItem[] }>("/api/agents?limit=200"),
          apiFetch<{ items: KbItem[] }>("/api/kb?limit=200").catch(() => ({ items: [] })),
          apiFetch<{ items: SessionItem[] }>("/api/sessions?limit=500&order=started_at.desc").catch(() => ({
            items: [],
          })),
        ]);
        if (!mounted) return;
        const parentId = agent.parent_id ?? agent.id;
        const versions = (agentRes.items || [])
          .filter((item) => (item.parent_id ?? item.id) === parentId)
          .sort(compareAgentVersions);
        const nextCounts: Record<string, number> = {};
        (sessionRes.items || []).forEach((item) => {
          if (!item.agent_id) return;
          nextCounts[item.agent_id] = (nextCounts[item.agent_id] || 0) + 1;
        });
        setAgentVersions(versions);
        setKbItems(kbRes.items || []);
        setSessionCounts(nextCounts);
      } catch {
        if (!mounted) return;
        setAgentVersions([]);
        setKbItems([]);
        setSessionCounts({});
      } finally {
        if (mounted) setVersionsLoading(false);
      }
    }
    loadVersions();
    return () => {
      mounted = false;
    };
  }, [agent]);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const profile = await apiFetch<{ is_admin: boolean }>("/api/user-profile");
        if (mounted) setIsAdmin(Boolean(profile.is_admin));
      } catch {
        if (mounted) setIsAdmin(false);
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadSessions() {
      if (!selectedAgentId) return;
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const res = await apiFetch<{ items: SessionItem[] }>("/api/sessions?limit=100&order=started_at.desc");
        if (!mounted) return;
        const filtered = (res.items || []).filter((s) => s.agent_id === selectedAgentId);
        setSessions(filtered);
        setSelectedSessionId((prev) => prev || filtered[0]?.id || null);
      } catch (err) {
        if (!mounted) return;
        setSessionsError("세션 목록을 불러오지 못했습니다.");
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
  }, [selectedAgentId]);

  useEffect(() => {
    let mounted = true;
    async function loadTurns() {
      if (!selectedSessionId) {
        setTurns([]);
        return;
      }
      setTurnsLoading(true);
      setTurnsError(null);
      try {
        const res = await apiFetch<TurnRow[]>(`/api/sessions/${selectedSessionId}/turns`);
        if (!mounted) return;
        setTurns(res || []);
      } catch (err) {
        if (!mounted) return;
        setTurnsError("대화 기록을 불러오지 못했습니다.");
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
  }, [selectedSessionId, mode]);

  useEffect(() => {
    setSelectedSessionId(null);
    setSessionId(null);
    setTurns([]);
    setMessages([]);
    setAwaitingResponse(false);
  }, [selectedAgentId]);

  useEffect(() => {
    if (!selectedAgentId || typeof window === "undefined") return;
    window.localStorage.setItem(LAST_AGENT_STORAGE_KEY, selectedAgentId);
  }, [selectedAgentId]);

  const connectWs = useCallback(() => {
    if (!WS_URL) {
      setStatus("WS URL 미설정");
      return;
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
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
        if (payload.session_id) {
          setSessionId(String(payload.session_id));
        }
        setAwaitingResponse(false);
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "bot", content: String(payload.text || "") },
        ]);
      }
      if (payload.type === "error") {
        setAwaitingResponse(false);
        const detail = payload.detail ? ` (${JSON.stringify(payload.detail)})` : "";
        const status = payload.status ? ` [${payload.status}]` : "";
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "bot", content: `오류: ${payload.error || "UNKNOWN"}${status}${detail}` },
        ]);
      }
    });
    ws.addEventListener("close", () => {
      setStatus("연결 종료");
    });
    ws.addEventListener("error", () => {
      setStatus("연결 오류");
    });
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      const ws = wsRef.current;
      if (ws) ws.close();
    };
  }, [connectWs]);

  const toolNames = useMemo(() => {
    if (!agent?.mcp_tool_ids?.length) return [];
    const map = new Map(tools.map((t) => [t.id, t.name]));
    return agent.mcp_tool_ids.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [agent, tools]);

  const toolNameById = useMemo(() => new Map(tools.map((t) => [t.id, t.name])), [tools]);

  const kbById = useMemo(() => {
    const map = new Map<string, KbItem>();
    kbItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [kbItems]);

  const historyMessages = useMemo(() => {
    const acc: ChatMessage[] = [];
    turns.forEach((turn) => {
      if (turn.transcript_text) {
        acc.push({ id: `${turn.id}-user`, role: "user", content: turn.transcript_text });
      }
      const answer = turn.final_answer || turn.answer_text;
      if (answer) {
        acc.push({ id: `${turn.id}-bot`, role: "bot", content: answer });
      }
    });
    return acc;
  }, [turns]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const sessionMeta = (session?: SessionItem | null) => {
    if (!session?.metadata || typeof session.metadata !== "object") return {};
    return session.metadata as Record<string, any>;
  };

  const getCustomerLabel = (session?: SessionItem | null) => {
    const meta = sessionMeta(session);
    return (
      session?.caller_masked ||
      meta.customer_name ||
      meta.customer ||
      meta.caller ||
      meta.user ||
      "미상"
    );
  };

  const getContextLabel = (session?: SessionItem | null) => {
    const meta = sessionMeta(session);
    return (
      meta.context ||
      meta.topic ||
      meta.summary ||
      meta.intent ||
      session?.escalation_reason ||
      session?.outcome ||
      session?.sentiment ||
      "맥락 정보 없음"
    );
  };

  const connectionIssues = useMemo(() => {
    if (loading) return [];
    return getConnectionIssues({ agent, kb, toolNames, wsStatus: status });
  }, [agent, kb, toolNames, status, loading]);

  const wsStatusDot = useMemo(() => {
    if (status === "연결됨") return "bg-emerald-500";
    if (status === "연결 중") return "bg-amber-400";
    if (status === "연결 종료" || status === "연결 오류") return "bg-rose-500";
    return "bg-slate-400";
  }, [status]);

  const renderBotContent = (content: string) => {
    if (!content.includes("debug_prefix")) return content;
    const html = content.replace(/\n/g, "<br/>");
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    if (mode === "history") return;
    if (mode === "edit" && !isAdmin) {
      toast.error("수정 모드는 관리자만 사용할 수 있습니다.");
      return;
    }

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
        agent_id: selectedAgentId,
        session_id: mode === "new" ? sessionId : selectedSessionId || sessionId,
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

  const handleDeleteSession = async (id: string) => {
    if (!id) return;
    if (!window.confirm("이 세션과 관련된 대화(turns)를 삭제할까요?")) return;
    try {
      await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setTurns([]);
        setMessages([]);
        setAwaitingResponse(false);
      }
      toast.success("세션이 삭제되었습니다.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "세션 삭제에 실패했습니다.";
      toast.error(message || "세션 삭제에 실패했습니다.");
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
          <div className="flex items-center gap-2">
            <div className="max-w-full w-max flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <span className={cn("h-2 w-2 rounded-full", wsStatusDot)} />
              <span>WS {status}</span>
              <button
                type="button"
                onClick={connectWs}
                title="새로 고침"
                aria-label="웹소켓 새로 고침"
                className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMode("history")}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold",
                mode === "history"
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              히스토리 모드
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setSelectedSessionId(null);
                setSessionId(null);
                setMessages([]);
                setAwaitingResponse(false);
              }}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold",
                mode === "new"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              신규 대화 테스트
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  toast.error("수정 모드는 관리자만 사용할 수 있습니다.");
                  return;
                }
                setMode("edit");
              }}
              disabled={!isAdmin}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold",
                mode === "edit"
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : isAdmin
                  ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              수정 모드
            </button>
          </div>
        </div>

        {!loading && connectionIssues.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">연결 점검이 필요합니다</div>
            <div className="mt-2 space-y-1 text-[13px]">
              {connectionIssues.map((issue) => (
                <div key={issue.key}>
                  <span className="font-medium">{issue.title}:</span> {issue.detail} 해결: {issue.action}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">버전 목록</div>
              <div className="mt-1 text-xs text-slate-500">
                동일한 parent_id를 공유하는 에이전트 버전입니다.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {versionsLoading ? <div className="text-xs text-slate-500">불러오는 중...</div> : null}
              <button
                type="button"
                onClick={handleReindex}
                disabled={reindexing}
                aria-label="KB 임베딩 재생성"
                title="KB 임베딩 재생성"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  reindexing ? "cursor-not-allowed opacity-60" : ""
                )}
              >
                <RefreshCw className={cn("h-4 w-4", reindexing ? "animate-spin" : "")} />
              </button>
            </div>
          </div>
          {!versionsLoading && agentVersions.length === 0 ? (
            <div className="mt-3 text-xs text-slate-500">표시할 버전이 없습니다.</div>
          ) : null}
          {agentVersions.length > 0 ? (
            <div className="mt-3">
                <div className="grid grid-cols-[70px_60px_90px_80px_minmax(160px,1fr)_minmax(200px,1fr)_60px] gap-3 border-b border-slate-200 pb-2 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                  <div className="px-1">세션 수</div>
                  <div className="px-1">상태</div>
                  <div className="px-1">에이전트 버전</div>
                  <div className="px-1">LLM</div>
                  <div className="px-1">MCP</div>
                  <div className="px-1">KB</div>
                  <div className="px-1 text-right">수정</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {agentVersions.map((item) => {
                    const isCurrent = item.id === selectedAgentId;
                    const mcpNames = (item.mcp_tool_ids || [])
                      .map((id) => toolNameById.get(id))
                      .filter(Boolean)
                      .join(", ");
                    const mcpCount = item.mcp_tool_ids?.length ?? 0;
                    const mcpLabel = mcpCount > 0 ? `${mcpCount}개${mcpNames ? ` (${mcpNames})` : ""}` : "-";
                    const kbInfo = item.kb_id ? kbById.get(item.kb_id) ?? null : null;
                    const kbLabel = kbInfo
                      ? `${kbInfo.title}${kbInfo.version ? ` (${kbInfo.version})` : ""}`
                      : "-";
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectVersion(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectVersion(item.id);
                          }
                        }}
                        className={cn(
                          "grid grid-cols-[70px_60px_90px_80px_minmax(160px,1fr)_minmax(200px,1fr)_60px] gap-3 px-1 py-2 text-xs whitespace-nowrap cursor-pointer",
                          isCurrent ? "bg-slate-100" : "hover:bg-slate-50"
                        )}
                      >
                        <div className="text-slate-600">{sessionCounts[item.id] ?? 0}</div>
                        <div className="text-slate-600">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              item.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {item.is_active ? "ON" : "OFF"}
                          </span>
                        </div>
                        <div className="text-slate-900 font-semibold">
                          {item.version || "-"}
                        </div>
                        <div className="text-slate-600">{item.llm || "-"}</div>
                        <div className="text-slate-600 truncate">{mcpLabel}</div>
                        <div className="text-slate-600 truncate">{kbLabel}</div>
                        <div className="flex justify-end">
                          <Link
                            href={`/app/agents/${encodeURIComponent(item.id)}`}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                          >
                            수정
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          ) : null}
        </Card>

        {mode !== "new" ? (
          <Card className="mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">세션 선택</div>
              <div className="mt-1 text-xs text-slate-500">
                session_id와 함께 고객/맥락 정보를 확인하고 선택하세요.
              </div>
            </div>
            {sessionsLoading ? <div className="text-xs text-slate-500">불러오는 중...</div> : null}
          </div>
          {sessionsError ? <div className="mt-3 text-xs text-rose-600">{sessionsError}</div> : null}
          {!sessionsLoading && sessions.length === 0 ? (
            <div className="mt-3 text-xs text-slate-500">표시할 세션이 없습니다.</div>
          ) : null}
          {sessions.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={cn(
                      "w-full text-left rounded-xl border px-3 py-2 transition-colors",
                      selectedSessionId === session.id
                        ? "border-slate-300 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {session.session_code || session.id}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] text-slate-500">
                          {formatKstDateTime(session.started_at)}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600">
                      고객: {getCustomerLabel(session)} · 맥락: {getContextLabel(session)}
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-900">선택된 세션</div>
                {selectedSession ? (
                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <div>session_id: {selectedSession.id}</div>
                    <div>고객: {getCustomerLabel(selectedSession)}</div>
                    <div>맥락: {getContextLabel(selectedSession)}</div>
                    <div>시작: {formatKstDateTime(selectedSession.started_at)}</div>
                    <div>채널: {selectedSession.channel || "-"}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-slate-500">선택된 세션이 없습니다.</div>
                )}
              </div>
            </div>
            ) : null}
          </Card>
        ) : null}

        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              {mode === "history" ? "세션 히스토리" : mode === "edit" ? "세션 수정 대화" : "신규 대화 테스트"}
            </div>
            {turnsLoading ? <div className="text-xs text-slate-500">불러오는 중...</div> : null}
          </div>
          {turnsError ? <div className="mt-3 text-xs text-rose-600">{turnsError}</div> : null}
          {!turnsLoading && mode !== "new" && historyMessages.length === 0 ? (
            <div className="mt-3 text-xs text-slate-500">표시할 대화 기록이 없습니다.</div>
          ) : null}
          <div className="mt-4 space-y-4">
            {[
              ...(mode === "history" ? historyMessages : []),
              ...(mode === "edit" ? [...historyMessages, ...messages] : []),
              ...(mode === "new" ? messages : []),
            ].map((msg) => (
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
                  {msg.role === "bot" ? renderBotContent(msg.content) : msg.content}
                </div>
                {msg.role === "user" ? (
                  <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                ) : null}
              </div>
            ))}
            {mode !== "history" && awaitingResponse ? (
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
          {mode !== "history" ? (
            <form onSubmit={handleSend} className="mt-6 flex gap-2">
              <Input
                placeholder={mode === "new" ? "새 대화를 시작하세요." : "맥락을 이어서 메시지를 입력하세요."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
                disabled={mode === "edit" && !isAdmin}
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || (mode === "edit" && !isAdmin)}
              >
                <Send className="mr-2 h-4 w-4" />
                전송
              </Button>
            </form>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
