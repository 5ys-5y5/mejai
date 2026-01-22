"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";

const evaluations = [
  { 
    category: "주문/배송 조회", 
    grade: "A", 
    satisfaction: 92, 
    kbCover: 100, 
    escalation: 2, 
    description: "AI만으로 완벽하게 처리 가능 (정책/FAQ 충분)",
    recommendation: "현재 상태 유지" 
  },
  { 
    category: "반품/교환 절차 안내", 
    grade: "B", 
    satisfaction: 78, 
    kbCover: 85, 
    escalation: 12, 
    description: "AI+정보추가 (몇 가지 질문 후 처리 가능)",
    recommendation: "반품 배송비 관련 지식 보강 필요" 
  },
  { 
    category: "결제 오류/취소", 
    grade: "C", 
    satisfaction: 45, 
    kbCover: 40, 
    escalation: 65, 
    description: "사람 필수 (분쟁/예외/보안/복잡)",
    recommendation: "즉시 상담원 연결 규칙 적용 권장" 
  },
  { 
    category: "회원 가입/탈퇴", 
    grade: "A", 
    satisfaction: 88, 
    kbCover: 95, 
    escalation: 5, 
    description: "AI만으로 처리 가능",
    recommendation: "탈퇴 방어 시나리오 추가 고려" 
  },
];

export default function EvalPage() {
  return (
    <div className="space-y-8">
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-1">AI 대체 용이성 관리</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            문의 유형별로 AI가 얼마나 안정적으로 상담을 수행할 수 있는지 평가합니다. 
            만족도와 에스컬레이션률을 기반으로 자동 라우팅 규칙(MCP)을 조정할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {evaluations.map((item) => (
          <Card key={item.category} className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20">
              <div className="space-y-1">
                <CardTitle className="text-base">{item.category}</CardTitle>
                <CardDescription className="text-xs">{item.description}</CardDescription>
              </div>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shadow-inner",
                item.grade === "A" ? "bg-emerald-100 text-emerald-600" : 
                item.grade === "B" ? "bg-amber-100 text-amber-600" : 
                "bg-red-100 text-red-600"
              )}>
                {item.grade}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">만족도</p>
                  <p className="text-lg font-bold">{item.satisfaction}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">KB 커버리지</p>
                  <p className="text-lg font-bold">{item.kbCover}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">에스컬레이션</p>
                  <p className="text-lg font-bold text-amber-600">{item.escalation}%</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold">개선 제안</p>
                    <p className="text-xs text-muted-foreground">{item.recommendation}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8">등급 조정</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8">통계 상세</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
