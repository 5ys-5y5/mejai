"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Download, 
  Share2, 
  ThumbsUp, 
  ThumbsDown,
  AlertTriangle,
  FileText,
  Search,
  MessageCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";

const mockTimeline = [
  {
    step: 1,
    type: "user",
    title: "고객 발화",
    content: "안녕하세요. 지난주에 주문한 에어팟이 아직 안 왔는데 배송 조회 좀 부탁드려요.",
    time: "00:05",
    asr: "안녕하세요 지난주에 주문한 에어팟이 아직 안 왔는데 배송 조회 좀 부탁드려요",
  },
  {
    step: 2,
    type: "ai",
    title: "핵심 요약",
    content: "고객 목적: 주문 배송 조회\n핵심 정보: 에어팟, 지난주 주문",
    time: "00:08",
  },
  {
    step: 3,
    type: "ai",
    title: "내용 확인 (되묻기)",
    content: "네, 지난주에 주문하신 에어팟 배송 조회를 도와드리겠습니다. 맞으실까요?",
    time: "00:10",
  },
  {
    step: 4,
    type: "user",
    title: "고객 확인",
    content: "네 맞아요.",
    time: "00:12",
  },
  {
    step: 5,
    type: "ai",
    title: "KB 검색 및 답변",
    content: "주문 번호를 확인해보니 현재 지역 터미널에서 배송 중입니다. 오늘 오후 6시 전까지 도착할 예정입니다.",
    time: "00:15",
    source: "배송 정책 v1.2, CJ대한통운 API",
  },
  {
    step: 6,
    type: "ai",
    title: "만족도 조사",
    content: "답변이 도움이 되셨나요? 도움이 됐다면 1번, 아니면 2번을 눌러주세요.",
    time: "00:18",
  },
  {
    step: 7,
    type: "user",
    title: "고객 피드백",
    content: "1번 (도움됨)",
    time: "00:20",
  },
  {
    step: 8,
    type: "ai",
    title: "추가 질문 확인",
    content: "추가로 궁금하신 점이 있으실까요?",
    time: "00:22",
  },
];

export default function CallDetail() {
  const { id } = useParams();
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/calls">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{id}</h2>
            <p className="text-sm text-muted-foreground">2026-01-21 14:20:05 · 010-****-1234</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> 다운로드
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" /> 공유
          </Button>
        </div>
      </div>

      {/* Audio Player Card */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-primary/5 p-8 flex items-center gap-8">
            <Button 
              size="icon" 
              className="w-16 h-16 rounded-full shadow-lg"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </Button>
            <div className="flex-1 space-y-4">
              <div className="h-12 flex items-end gap-[2px]">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 bg-primary/20 rounded-full",
                      i < 20 ? "h-full" : "h-1/2"
                    )}
                    style={{ height: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>00:15</span>
                <span>01:45</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Timeline (Steps 1-8) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> 대화 타임라인
          </h3>
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-primary/20 before:to-transparent">
            {mockTimeline.map((item, index) => (
              <div key={index} className="relative flex items-start gap-8 group">
                {/* Step Indicator */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 z-10 transition-transform group-hover:scale-110 shadow-sm",
                  item.type === "user" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                )}>
                  <span className="text-xs font-bold">{item.step}</span>
                </div>

                {/* Bubble */}
                <Card className={cn(
                  "flex-1 border-none shadow-sm transition-shadow hover:shadow-md",
                  item.type === "ai" && "bg-primary/5 border-l-4 border-l-primary"
                )}>
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                        {item.type === "user" ? "고객 발화" : "AI 처리"}
                      </span>
                      <span className="text-sm font-bold text-foreground">{item.title}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-50">{item.time}</span>
                  </CardHeader>
                  <CardContent className="py-4 px-4 space-y-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    
                    {item.asr && (
                      <div className="p-3 bg-background/50 rounded-lg border border-dashed text-xs text-muted-foreground">
                        <span className="font-bold mr-2 text-primary">ASR 원문:</span>
                        {item.asr}
                      </div>
                    )}

                    {item.source && (
                      <div className="flex items-center gap-2 text-[10px] font-medium text-primary">
                        <Search className="w-3 h-3" />
                        참조 근거: {item.source}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">세션 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">문의 카테고리</p>
                <p className="text-sm font-bold">주문/배송 &gt; 배송 상태 조회</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">상태</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-sm font-bold text-emerald-600">성공적으로 해결됨</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">만족도</p>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ThumbsUp className="w-4 h-4 text-primary" /> 도움이 됨
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">대체 용이성 평가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Grade</span>
                  <span className="text-2xl font-black text-emerald-600">A</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  이 유형의 상담은 AI만으로 완벽하게 처리가 가능합니다. 추가 상담원 연결이 필요하지 않습니다.
                </p>
              </div>
              <Button variant="outline" className="w-full text-xs h-9">등급 재평가</Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">발견된 문제</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-xl">
                <p className="text-xs text-muted-foreground">감지된 이슈가 없습니다.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
