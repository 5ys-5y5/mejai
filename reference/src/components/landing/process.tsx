"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const steps = [
  { id: "01", title: "고객 발화 수집", description: "고객의 목소리를 8kHz 선명한 디지털 신호로 캡처합니다." },
  { id: "02", title: "실시간 ASR 전사", description: "발화 즉시 텍스트로 변환하여 실시간 대화를 기록합니다." },
  { id: "03", title: "인텐트 추출 및 요약", description: "방대한 대화 속에서 핵심 의도와 목적만을 정밀하게 추출합니다." },
  { id: "04", title: "사실 관계 확인", description: "추출된 정보가 맞는지 고객에게 다시 한번 정중히 되묻습니다." },
  { id: "05", title: "RAG 지식 검색", description: "업로드된 기업 정책과 지식 베이스에서 가장 정확한 근거를 찾습니다." },
  { id: "06", title: "맞춤형 AI 답변 생성", description: "Gemini, GPT, Claude가 가장 자연스러운 구어체로 응답합니다." },
  { id: "07", title: "성공률 및 만족도 측정", description: "도움이 되었는지 수치화하여 서비스 품질을 모니터링합니다." },
  { id: "08", title: "데이터 자산화", description: "모든 상담 데이터는 기업의 고유한 학습 자산으로 기록됩니다." },
];

export function Process() {
  return (
    <section className="py-32 bg-zinc-50 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-bold tracking-tight mb-8"
          >
            대화가 정보가 되고, <br />
            정보가 자산이 되는 8단계 프로세스
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-zinc-500 leading-relaxed"
          >
            단순한 응답을 넘어선 정교한 오케스트레이션. <br className="hidden md:block" />
            mejai.help는 모든 상담을 표준화된 최상의 품질로 처리합니다.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-20">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col space-y-4"
            >
              <span className="text-4xl font-bold text-zinc-200">{step.id}</span>
              <h3 className="text-xl font-bold tracking-tight">{step.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm md:text-base">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
