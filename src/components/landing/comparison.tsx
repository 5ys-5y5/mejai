"use client";

import { motion } from "framer-motion";

const comparison = [
  { feature: "응답 대기 시간", traditional: "평균 5~10분", ai: "0초(즉시 연결)", win: "ai" },
  { feature: "상담 가능 시간", traditional: "평일 09~18시", ai: "24시간 365일", win: "ai" },
  { feature: "상담 기록 정확도", traditional: "수동 기록(누락 위험)", ai: "100% 실시간 음성 전사", win: "ai" },
  { feature: "지식 참조", traditional: "상담사 기억에 의존", ai: "RAG 기반 실시간 정책 검색", win: "ai" },
  { feature: "운영 비용", traditional: "인건비 및 교육비 부담", ai: "기존 비용 최대 80% 절감", win: "ai" },
];

export function Comparison() {
  return (
    <section className="py-32 bg-black text-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
          >
            기존 방식과는 <br />
            비교할 수 없는 차이.
          </motion.h2>
          <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed">
            비효율적인 상담 대기와 정보 불일치를 없애고
            실제 상담 경험을 개선합니다.
          </p>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-8 text-sm font-bold tracking-widest uppercase text-zinc-500 w-1/3">
                  항목
                </th>
                <th className="py-8 text-sm font-bold tracking-widest uppercase text-zinc-500 w-1/3 text-center">
                  기존 상담
                </th>
                <th className="py-8 text-sm font-bold tracking-widest uppercase text-white w-1/3 text-center">
                  Mejai
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-zinc-900 group hover:bg-zinc-950 transition-colors"
                >
                  <td className="py-10">
                    <span className="text-lg md:text-xl font-bold">{item.feature}</span>
                  </td>
                  <td className="py-10 text-center text-zinc-500 italic">
                    {item.traditional}
                  </td>
                  <td className="py-10 text-center">
                    <div className="inline-flex items-center gap-2 text-xl font-bold text-white bg-zinc-800 px-6 py-2 rounded-full">
                      {item.ai}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
