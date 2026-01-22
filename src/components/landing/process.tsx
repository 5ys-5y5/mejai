"use client";

import { motion } from "framer-motion";

const steps = [
  {
    id: "01",
    title: "고객 발화 수집",
    description: "고객 음성을 8kHz 음성 신호로 안정적으로 캡처합니다.",
  },
  {
    id: "02",
    title: "실시간 ASR 전사",
    description: "발화 즉시 텍스트로 변환하고 실시간으로 기록합니다.",
  },
  {
    id: "03",
    title: "의도 추출 및 요약",
    description: "발화에서 핵심 의도와 목적을 정확하게 추출합니다.",
  },
  {
    id: "04",
    title: "상담 확인",
    description: "추출한 정보를 고객에게 재확인해 정확도를 높입니다.",
  },
  {
    id: "05",
    title: "RAG 지식 검색",
    description: "회사 정책과 지식베이스에서 최적의 근거를 찾습니다.",
  },
  {
    id: "06",
    title: "맞춤형 응답 생성",
    description: "Gemini, GPT, Claude가 자연스러운 답변을 제공합니다.",
  },
  {
    id: "07",
    title: "성공률/만족도 측정",
    description: "응답 품질과 성과를 정밀하게 측정합니다.",
  },
  {
    id: "08",
    title: "데이터 자산화",
    description: "모든 상담 데이터를 기업의 지식 자산으로 축적합니다.",
  },
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
            음성에서 정보로, <br />
            정보에서 자산으로 가는 8단계 프로세스
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-zinc-500 leading-relaxed"
          >
            단순한 응답이 아니라, 고객 상담 전 과정을 지능화해
            Mejai가 최고의 정확도로 처리합니다.
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
