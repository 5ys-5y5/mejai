"use client";

import { motion } from "framer-motion";
import type { LandingSettings } from "@/lib/landingSettings";

export function Process({ settings }: { settings: LandingSettings }) {
  return (
    <section className="py-32 bg-zinc-50 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="font-bold tracking-tight mb-8 whitespace-pre-line"
            style={{ fontSize: settings.processTitleSize }}
          >
            {settings.processTitle}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 leading-relaxed whitespace-pre-line"
            style={{ fontSize: settings.processSubtitleSize }}
          >
            {settings.processSubtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-20">
          {settings.processSteps.map((step, index) => (
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
