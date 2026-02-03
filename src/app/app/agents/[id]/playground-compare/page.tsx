"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/apiClient";
import { Bot, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderBotContent(content: string) {
  if (!content.includes("debug_prefix")) return content;
  const html = content.replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function AgentPlaygroundComparePage() {
  const params = useParams<{ id: string }>();
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [leftSessionId, setLeftSessionId] = useState<string | null>(null);
  const [rightSessionId, setRightSessionId] = useState<string | null>(null);
  const [leftMessages, setLeftMessages] = useState<ChatMessage[]>([]);
  const [rightMessages, setRightMessages] = useState<ChatMessage[]>([]);
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [leftSending, setLeftSending] = useState(false);
  const [rightSending, setRightSending] = useState(false);

  const handleReset = () => {
    setLeftSessionId(null);
    setRightSessionId(null);
    setLeftMessages([]);
    setRightMessages([]);
  };

  const sendLeft = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = leftInput.trim();
    if (!text || !agentId || leftSending) return;
    setLeftMessages((prev) => [...prev, { id: makeId(), role: "user", content: text }]);
    setLeftInput("");
    setLeftSending(true);
    try {
      const data = await apiFetch<{ session_id: string; message?: string }>("/api/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          message: text,
          session_id: leftSessionId || undefined,
        }),
      });
      if (data.session_id) setLeftSessionId(data.session_id);
      if (data.message) {
        const reply = String(data.message);
        setLeftMessages((prev) => [...prev, { id: makeId(), role: "bot", content: reply }]);
      }
    } catch {
      setLeftMessages((prev) => [...prev, { id: makeId(), role: "bot", content: "Legacy 응답 실패" }]);
      toast.error("Legacy 응답 실패");
    } finally {
      setLeftSending(false);
    }
  };

  const sendRight = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = rightInput.trim();
    if (!text || !agentId || rightSending) return;
    setRightMessages((prev) => [...prev, { id: makeId(), role: "user", content: text }]);
    setRightInput("");
    setRightSending(true);
    try {
      const data = await apiFetch<{ session_id: string; message?: string }>("/api/playground/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          message: text,
          session_id: rightSessionId || undefined,
        }),
      });
      if (data.session_id) setRightSessionId(data.session_id);
      if (data.message) {
        const reply = String(data.message);
        setRightMessages((prev) => [...prev, { id: makeId(), role: "bot", content: reply }]);
      }
    } catch {
      setRightMessages((prev) => [...prev, { id: makeId(), role: "bot", content: "Shipping 응답 실패" }]);
      toast.error("Shipping 응답 실패");
    } finally {
      setRightSending(false);
    }
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">대화 비교 (Legacy vs Shipping)</h1>
            <p className="mt-1 text-sm text-slate-500">
              동일한 입력으로 두 라우트를 동시에 실행합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/agents/${encodeURIComponent(agentId)}/playground`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Bot className="h-4 w-4" />
              대화 테스트
            </Link>
            <Button type="button" onClick={handleReset} variant="outline">
              초기화
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Legacy route</div>
                <div className="text-xs text-slate-500">/api/playground/chat</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>세션 {leftSessionId || "-"}</span>
                {leftSessionId ? (
                  <Link
                    href={`/app/calls/${encodeURIComponent(leftSessionId)}`}
                    className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                  >
                    보기
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {leftMessages.length === 0 ? (
                <div className="text-xs text-slate-400">대화를 입력해 주세요.</div>
              ) : (
                leftMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-slate-900 text-white ml-auto"
                        : "bg-slate-100 text-slate-800"
                    )}
                  >
                    {msg.role === "bot" ? renderBotContent(msg.content) : msg.content}
                  </div>
                ))
              )}
            </div>
            <form onSubmit={sendLeft} className="mt-4 flex items-center gap-2">
              <Input
                value={leftInput}
                onChange={(e) => setLeftInput(e.target.value)}
                placeholder="Legacy에 보낼 메시지"
                className="flex-1"
              />
              <Button type="submit" disabled={!agentId || !leftInput.trim() || leftSending}>
                {leftSending ? "전송 중" : "전송"}
              </Button>
            </form>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Shipping route</div>
                <div className="text-xs text-slate-500">/api/playground/shipping</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>세션 {rightSessionId || "-"}</span>
                {rightSessionId ? (
                  <Link
                    href={`/app/calls/${encodeURIComponent(rightSessionId)}`}
                    className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                  >
                    보기
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {rightMessages.length === 0 ? (
                <div className="text-xs text-slate-400">대화를 입력해 주세요.</div>
              ) : (
                rightMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-slate-900 text-white ml-auto"
                        : "bg-emerald-50 text-emerald-900"
                    )}
                  >
                    {msg.role === "bot" ? renderBotContent(msg.content) : msg.content}
                  </div>
                ))
              )}
            </div>
            <form onSubmit={sendRight} className="mt-4 flex items-center gap-2">
              <Input
                value={rightInput}
                onChange={(e) => setRightInput(e.target.value)}
                placeholder="MK2에 보낼 메시지"
                className="flex-1"
              />
              <Button type="submit" disabled={!agentId || !rightInput.trim() || rightSending}>
                {rightSending ? "전송 중" : "전송"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <ArrowLeftRight className="h-4 w-4" />
          동일한 질문을 두 라우트에 전송합니다. 정책/템플릿 차이를 확인하세요.
        </div>
      </div>
    </div>
  );
}
