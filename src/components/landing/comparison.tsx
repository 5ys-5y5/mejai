"use client";

import { motion } from "framer-motion";
import type { LandingSettings } from "@/lib/landingSettings";

export function Comparison({ settings }: { settings: LandingSettings }) {
  return (
    <section className="py-32 bg-black text-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="font-bold tracking-tight mb-8 whitespace-pre-line"
            style={{ fontSize: settings.comparisonTitleSize }}
          >
            {settings.comparisonTitle}
          </motion.h2>
          <p
            className="text-zinc-400 leading-relaxed whitespace-pre-line"
            style={{ fontSize: settings.comparisonSubtitleSize }}
          >
            {settings.comparisonSubtitle}
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
              {settings.comparisonRows.map((item, index) => (
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
