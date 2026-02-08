"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useConversationController } from "@/lib/conversation/client/useConversationController";

type Props = {
  page: "/" | "/app/laboratory";
  makeRunBody: (args: { text: string; sessionId: string | null }) => Record<string, unknown>;
  placeholder?: string;
  className?: string;
};

export function ConversationQuickStart({ page, makeRunBody, placeholder = "메시지를 입력하세요", className }: Props) {
  const [input, setInput] = useState("");
  const convo = useConversationController({ page, makeRunBody });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || convo.sending) return;
    setInput("");
    await convo.send(text);
  };

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-3", className)}>
      <div className="mb-3 max-h-80 overflow-auto space-y-2">
        {convo.messages.map((msg) => (
          <div key={msg.id} className={cn("rounded-lg px-3 py-2 text-sm", msg.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="mb-2 flex gap-2">
        <Button type="button" variant="outline" onClick={() => void convo.copyConversation()}>대화 복사</Button>
        <Button type="button" variant="outline" onClick={() => void convo.copyIssue()}>문제 로그 복사</Button>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} className="flex-1" />
        <Button type="submit" disabled={convo.sending || !input.trim()}>
          <Send className="mr-1 h-4 w-4" />
          {convo.sending ? "전송 중" : "전송"}
        </Button>
      </form>
    </div>
  );
}
