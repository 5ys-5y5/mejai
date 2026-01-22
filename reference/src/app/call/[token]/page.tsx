"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Phone, User, Bot, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WebInputPage() {
  const [messages, setMessages] = useState([
    { role: "bot", content: "안녕하세요. 음성 인식이 원활하지 않아 텍스트 입력 페이지로 안내해 드렸습니다. 문의 내용을 여기에 입력해 주세요." },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = { role: "user", content: inputValue };
    setMessages([...messages, newMessage]);
    setInputValue("");

    // Mock bot response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "bot", 
        content: "네, 입력해주신 내용을 확인했습니다. 주문하신 상품의 배송 상태를 조회 중입니다. 잠시만 기다려 주세요." 
      }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-accent/10 flex flex-col">
      {/* Header */}
      <header className="bg-background border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm">통화 중 실시간 입력</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase">
              <Wifi className="w-3 h-3" /> 연결됨
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
          Session ID: S-1024
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4 pb-20">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm shadow-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-background rounded-tl-none border"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Input Area */}
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
      </footer>
    </div>
  );
}
