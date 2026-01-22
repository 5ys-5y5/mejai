"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldAlert, 
  Zap, 
  MessageSquare, 
  AlertTriangle,
  ChevronRight,
  Plus,
  ToggleLeft as Toggle,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

const hardRules = [
  { id: 1, name: "법적 위협/분쟁", description: "고소, 소송, 소비자원 언급 시 즉시 상담원 연결", active: true },
  { id: 2, name: "안전/사고/부상", description: "제품으로 인한 부상 또는 안전 사고 리포트", active: true },
  { id: 3, name: "욕설/격앙", description: "고객의 언어 폭력 또는 감정 격앙 감지", active: true },
  { id: 4, name: "고액/부정결제", description: "100만원 이상 결제 또는 부정 결제 의심", active: false },
];

const softRules = [
  { id: 1, name: "확인 루프 실패", description: "내용 확인(되묻기) 2회 이상 실패 시", threshold: "2회", weight: 50 },
  { id: 2, name: "핵심 정보 누락", description: "상담에 필요한 필수 정보 2개 이상 누락", threshold: "2개", weight: 30 },
  { id: 3, name: "동일 문의 재통화", description: "24시간 이내 동일 문의로 3회 이상 통화", threshold: "3회", weight: 20 },
];

export default function RulesPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">MCP 및 에스컬레이션 규칙</h2>
          <p className="text-sm text-muted-foreground">AI 상담봇의 권한 경계와 상담원 연결 기준을 설정합니다.</p>
        </div>
        <div className="flex gap-4 p-2 bg-muted rounded-lg">
          <div className="px-3 py-1 bg-background rounded shadow-sm text-xs font-bold text-primary">L0 (안내/조회)</div>
          <div className="px-3 py-1 text-xs font-bold text-muted-foreground opacity-50">L1 (실행 대기)</div>
          <div className="px-3 py-1 text-xs font-bold text-muted-foreground opacity-50">L2 (금지)</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Hard Rules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" /> 하드 룰 (즉시 연결)
            </h3>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Plus className="w-3 h-3" /> 규칙 추가
            </Button>
          </div>
          <div className="space-y-3">
            {hardRules.map((rule) => (
              <Card key={rule.id} className="border-none shadow-sm group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                      rule.active ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                        rule.active ? "right-0.5" : "left-0.5"
                      )} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Soft Rules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> 소프트 룰 (점수 누적)
            </h3>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Plus className="w-3 h-3" /> 규칙 추가
            </Button>
          </div>
          <div className="space-y-3">
            {softRules.map((rule) => (
              <Card key={rule.id} className="border-none shadow-sm group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{rule.name}</p>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">
                      임계치: {rule.threshold}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                  <div className="pt-2 flex items-center gap-4">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500" 
                        style={{ width: `${rule.weight}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">가중치: {rule.weight}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
