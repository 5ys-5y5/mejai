"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, 
  ThumbsUp, 
  AlertCircle, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Send,
  Loader2,
  Sparkles
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [stats, setStats] = useState([
    { name: "오늘 전체 통화", value: "0건", change: "0%", trend: "up", icon: Phone },
    { name: "AI 해결률", value: "0%", change: "0%", trend: "up", icon: ThumbsUp },
    { name: "에스컬레이션", value: "0건", change: "0%", trend: "down", icon: AlertCircle },
    { name: "평균 상담 시간", value: "0분 0초", change: "0s", trend: "down", icon: Clock },
  ]);
  const [callVolumeData, setCallVolumeData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AI 테스트 상태
  const [testQuery, setTestQuery] = useState("");
  const [testProvider, setTestProvider] = useState<"gemini" | "openai" | "claude">("gemini");
  const [testResponse, setTestProviderResponse] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  // 1. 유저 조직 및 실제 통계 가져오기
  const fetchDashboardData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (org) {
      setOrgId(org.id);
      
      // 실제 세션 데이터 카운트
      const { count: totalCalls } = await supabase
        .from("sessions")
        .select("*", { count: 'exact', head: true })
        .eq("org_id", org.id);

      const { count: successCalls } = await supabase
        .from("sessions")
        .select("*", { count: 'exact', head: true })
        .eq("org_id", org.id)
        .eq("satisfaction", 1);

      const { count: escalations } = await supabase
        .from("sessions")
        .select("*", { count: 'exact', head: true })
        .eq("org_id", org.id)
        .eq("is_escalated", true);

      const solveRate = totalCalls && totalCalls > 0 
        ? ((successCalls || 0) / totalCalls * 100).toFixed(1) 
        : "0";

      setStats([
        { name: "오늘 전체 통화", value: `${totalCalls || 0}건`, change: "0%", trend: "up", icon: Phone },
        { name: "AI 해결률", value: `${solveRate}%`, change: "0%", trend: "up", icon: ThumbsUp },
        { name: "에스컬레이션", value: `${escalations || 0}건`, change: "0%", trend: "down", icon: AlertCircle },
        { name: "평균 상담 시간", value: "0분 0초", change: "0s", trend: "down", icon: Clock },
      ]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleTestBrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim() || !orgId) return;
    setIsTesting(true);
    setTestProviderResponse("");
    try {
      const response = await fetch("/api/test/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, query: testQuery, provider: testProvider }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTestProviderResponse(result.answer);
    } catch (error: any) {
      toast.error("테스트 실패: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-12 pb-24 max-w-[1200px] mx-auto pt-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">대시보드</h1>
        <p className="text-zinc-500 text-lg font-medium">실시간 상담 현황 및 AI 성능 리포트</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-none bg-zinc-50/50 shadow-none rounded-[2rem] p-8 group hover:bg-zinc-50 transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-zinc-900" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.name}</p>
                <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border-none bg-zinc-900 text-white rounded-[2.5rem] p-10 overflow-hidden relative min-h-[500px] flex flex-col">
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Bot className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">AI 두뇌 테스트</h3>
                  <p className="text-zinc-400 text-sm">지식 베이스 연동 및 모델별 응답 품질 확인</p>
                </div>
              </div>
              <div className="flex gap-2 mb-8">
                {(["gemini", "openai", "claude"] as const).map((p) => (
                  <button key={p} onClick={() => setTestProvider(p)} className={cn("px-6 py-2 rounded-full text-xs font-bold transition-all border", testProvider === p ? "bg-white text-zinc-900 border-white" : "bg-white/5 text-zinc-400 border-transparent hover:bg-white/10")}>{p.toUpperCase()}</button>
                ))}
              </div>
              <form onSubmit={handleTestBrain} className="relative mb-10">
                <Input placeholder="지식 베이스에 대해 궁금한 점을 입력하세요" className="bg-white/5 border-white/10 text-white h-16 rounded-2xl pr-16 text-lg" value={testQuery} onChange={(e) => setTestQuery(e.target.value)} />
                <Button type="submit" size="icon" disabled={isTesting || !testQuery.trim()} className="absolute right-3 top-3 h-10 w-10 bg-white text-zinc-900 rounded-xl">
                  {isTesting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
              {testResponse && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 rounded-[2rem] p-8 border border-white/10">
                  <p className="text-lg leading-relaxed text-zinc-200">{testResponse}</p>
                </motion.div>
              )}
            </div>
            <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none"><Bot className="w-96 h-96" /></div>
          </Card>
        </div>

        <Card className="border-none bg-zinc-50 rounded-[2.5rem] p-10 flex flex-col h-full">
          <h3 className="text-xl font-bold tracking-tight mb-8">시간대별 통화량</h3>
          <div className="flex-1 min-h-[300px] flex items-center justify-center text-zinc-300 font-bold uppercase tracking-widest text-xs">
            {callVolumeData.length === 0 ? "No data available" : "Chart here"}
          </div>
        </Card>
      </div>
    </div>
  );
}
