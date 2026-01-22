"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquareQuote, 
  ThumbsDown, 
  ArrowRight, 
  MessageSquare,
  History,
  CheckCircle2,
  Clock,
  ExternalLink,
  Bot,
  User
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const reviewItems = [
  { 
    id: "R-101", 
    sessionId: "S-1023", 
    category: "교환 요청", 
    issue: "배송비 규정 오답", 
    aiAnswer: "단순 변심 교환 시에도 왕복 배송비가 무료라고 안내함",
    userFeedback: "실제로는 6,000원이 부과되는데 AI가 잘못 안내해서 혼선이 있었습니다.",
    status: "대기 중",
    date: "1시간 전"
  },
  { 
    id: "R-102", 
    sessionId: "S-1017", 
    category: "반품/교환", 
    issue: "환불 기한 안내 누락", 
    aiAnswer: "반품 접수 방법만 안내하고 환불까지 소요되는 기간은 안내하지 않음",
    userFeedback: "언제 환불되는지 물어봤는데 대답을 안 해줬어요.",
    status: "검토 중",
    date: "3시간 전"
  },
];

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquareQuote className="w-6 h-6 text-primary" /> 개선 큐
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-background">전체 (12)</Button>
          <Button variant="ghost" size="sm">처리 완료 (154)</Button>
        </div>
      </div>

      <div className="space-y-4">
        {reviewItems.map((item) => (
          <Card key={item.id} className="border-none shadow-sm overflow-hidden group">
            <div className="grid lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x">
              {/* Info Column */}
              <div className="p-6 bg-muted/20 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{item.id}</span>
                    <h3 className="font-bold text-sm">{item.category}</h3>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    item.status === "대기 중" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {item.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {item.date}
                  </div>
                  <Link href={`/app/calls/${item.sessionId}`} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    세션 상세 보기 <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="pt-2">
                  <p className="text-xs font-bold text-destructive flex items-center gap-1">
                    <AlertCircleIcon className="w-3 h-3" /> {item.issue}
                  </p>
                </div>
              </div>

              {/* AI/User Column */}
              <div className="lg:col-span-2 p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                    <Bot className="w-3 h-3" /> AI 응답
                  </div>
                  <p className="text-sm bg-accent/50 p-3 rounded-lg border italic text-muted-foreground">
                    &quot;{item.aiAnswer}&quot;
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-destructive uppercase">
                    <ThumbsDown className="w-3 h-3" /> 고객 피드백
                  </div>
                  <p className="text-sm font-medium">
                    {item.userFeedback}
                  </p>
                </div>
              </div>

              {/* Action Column */}
              <div className="p-6 flex flex-col justify-between bg-muted/5">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">개선 조치</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                      <History className="w-3.5 h-3.5" /> 권장 답변 학습
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                      <BookIcon className="w-3.5 h-3.5" /> KB 문서 수정 제안
                    </Button>
                  </div>
                </div>
                <Button className="w-full mt-6 text-xs h-9 gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 해결 완료
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return <AlertCircle className={className} />;
}

function BookIcon({ className }: { className?: string }) {
  return <Book className={className} />;
}
