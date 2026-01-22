"use client";

import { motion } from "framer-motion";
import { 
  PhoneCall, 
  Brain, 
  Database, 
  ShieldCheck, 
  LayoutDashboard, 
  Zap, 
  Smartphone,
  MessageSquare
} from "lucide-react";

const features = [
  {
    title: "선명한 ASR 전사",
    description: "8kHz 무손실 디지털 샘플링으로 고객의 한마디 한마디를 정확하게 텍스트로 변환합니다.",
    icon: PhoneCall,
    color: "bg-blue-500",
    size: "large"
  },
  {
    title: "AI 문맥 요약",
    description: "Gemini 2.0이 상담의 핵심 맥락을 1초 만에 파악하여 리포트를 생성합니다.",
    icon: Brain,
    color: "bg-purple-500",
    size: "small"
  },
  {
    title: "정밀한 RAG 답변",
    description: "기업 내부 문서를 실시간으로 참조하여 오답 없는 신뢰할 수 있는 정보를 제공합니다.",
    icon: Database,
    color: "bg-zinc-800",
    size: "small"
  },
  {
    title: "강력한 데이터 보안",
    description: "상담 중 노출되는 모든 민감 정보를 즉시 마스킹 처리하여 안전하게 보호합니다.",
    icon: ShieldCheck,
    color: "bg-emerald-500",
    size: "medium"
  },
  {
    title: "운영 통합 대시보드",
    description: "실시간 상담 현황부터 AI 해결률까지, 모든 지표를 한눈에 모니터링하세요.",
    icon: LayoutDashboard,
    color: "bg-orange-500",
    size: "medium"
  }
];

export function Features() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mb-24">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-4 block"
          >
            Core Capabilities
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
          >
            전화 상담원을 위한 <br />
            가장 진보된 두뇌.
          </motion.h2>
          <p className="text-xl md:text-2xl text-zinc-500 leading-relaxed max-w-2xl">
            우리는 기술의 장벽을 허물고, 사람이 하는 상담 그 이상의 가치를 유선 서비스에 담았습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
          {/* Bento Grid Layout */}
          <div className="md:col-span-8 bg-zinc-50 rounded-[2.5rem] p-12 flex flex-col justify-between group overflow-hidden relative">
            <div className="relative z-10">
              <PhoneCall className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-3xl font-bold mb-4">실시간 디지털 전사</h3>
              <p className="text-zinc-500 text-lg max-w-md">
                주변 소음과 전송 지연 속에서도 고객의 의도를 정확하게 분리해냅니다.
              </p>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          </div>

          <div className="md:col-span-4 bg-zinc-900 text-white rounded-[2.5rem] p-10 flex flex-col justify-between">
            <Brain className="w-10 h-10 text-purple-400" />
            <div>
              <h3 className="text-2xl font-bold mb-2">AI 문맥 요약</h3>
              <p className="text-zinc-400 text-sm">핵심만 짚어내는 놀라운 요약 기술.</p>
            </div>
          </div>

          <div className="md:col-span-4 bg-zinc-50 rounded-[2.5rem] p-10 flex flex-col justify-between">
            <Database className="w-10 h-10 text-zinc-800" />
            <div>
              <h3 className="text-2xl font-bold mb-2">RAG 지식 엔진</h3>
              <p className="text-zinc-500 text-sm">회사 정책에 근거한 정답만을 생성.</p>
            </div>
          </div>

          <div className="md:col-span-8 bg-zinc-50 rounded-[2.5rem] p-12 flex flex-col justify-between relative group overflow-hidden">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
              <div>
                <h3 className="text-3xl font-bold mb-4">완벽한 데이터 보호</h3>
                <p className="text-zinc-500 text-lg max-w-md">
                  상담 내역 내의 개인정보는 시스템이 자동으로 마스킹 처리하여 운영자도 볼 수 없습니다.
                </p>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldCheck className="w-64 h-64" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
