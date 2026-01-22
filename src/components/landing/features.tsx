"use client";

import { motion } from "framer-motion";
import { PhoneCall, Brain, Database, ShieldCheck } from "lucide-react";

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
            핵심 기능
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
          >
            전화 상담을 위한 <br />
            가장 정교한 자동화.
          </motion.h2>
          <p className="text-xl md:text-2xl text-zinc-500 leading-relaxed max-w-2xl">
            음성부터 상담 기록까지, 모든 흐름을 실시간으로 연결해
            상담 품질과 비용 효율을 동시에 끌어올립니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
          <div className="md:col-span-8 bg-zinc-50 rounded-[2.5rem] p-12 flex flex-col justify-between group overflow-hidden relative">
            <div className="relative z-10">
              <PhoneCall className="w-12 h-12 text-blue-500 mb-6" />
              <h3 className="text-3xl font-bold mb-4">실시간 음성 인식</h3>
              <p className="text-zinc-500 text-lg max-w-md">
                통화 품질이 낮아도 고객 발화를 정확하게 텍스트로 변환합니다.
              </p>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          </div>

          <div className="md:col-span-4 bg-zinc-900 text-white rounded-[2.5rem] p-10 flex flex-col justify-between">
            <Brain className="w-10 h-10 text-purple-400" />
            <div>
          <h3 className="text-2xl font-bold mb-2">인공지능 요약</h3>
              <p className="text-zinc-400 text-sm">핵심만 남겨 즉시 리포트를 만듭니다.</p>
            </div>
          </div>

          <div className="md:col-span-4 bg-zinc-50 rounded-[2.5rem] p-10 flex flex-col justify-between">
            <Database className="w-10 h-10 text-zinc-800" />
            <div>
              <h3 className="text-2xl font-bold mb-2">RAG 지식 연결</h3>
              <p className="text-zinc-500 text-sm">
                회사 지식과 정책을 실시간으로 불러 정확한 답변을 제공합니다.
              </p>
            </div>
          </div>

          <div className="md:col-span-8 bg-zinc-50 rounded-[2.5rem] p-12 flex flex-col justify-between relative group overflow-hidden">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
              <div>
                <h3 className="text-3xl font-bold mb-4">강력한 데이터 보호</h3>
                <p className="text-zinc-500 text-lg max-w-md">
                  민감한 고객 정보는 자동으로 마스킹되어 안전하게 보호됩니다.
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
