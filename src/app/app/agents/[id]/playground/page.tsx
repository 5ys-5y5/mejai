"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/apiClient";
import { Bot, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const toolNames = useMemo(() => {
    if (!agent?.mcp_tool_ids?.length) return [];
    const map = new Map(tools.map((t) => [t.id, t.name]));
    return agent.mcp_tool_ids.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [agent, tools]);

  const kbSnippet = useMemo(() => {
    if (!kb?.content) return "";
    const trimmed = kb.content.trim();
    if (!trimmed) return "";
    return trimmed.length > 220 ? `${trimmed.slice(0, 220)}...` : trimmed;
  }, [kb]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    const agentName = agent?.name || "에이전트";
    const replyParts = [
      `${agentName} 테스트 응답입니다.`,
      `LLM: ${agent?.llm || "-"}`,
      `KB: ${kb?.title || "-"}${kb?.version ? ` (${kb.version})` : ""}`,
      `MCP: ${toolNames.length ? toolNames.join(", ") : "-"}`,
    ];
    if (kbSnippet) {
      replyParts.push(`KB 참고: ${kbSnippet}`);
    } else {
      replyParts.push("KB 콘텐츠가 없습니다.");
    }

    const botMessage: ChatMessage = {
      id: makeId(),
      role: "bot",
      content: replyParts.join("\n"),
    };

    setMessages((prev) => [...prev, botMessage]);
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
