"use client";

import { motion } from "framer-motion";
import { PhoneCall, Brain, Database, ShieldCheck } from "lucide-react";
import type { LandingSettings } from "@/lib/landingSettings";

export function Features({ settings }: { settings: LandingSettings }) {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mb-24">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-4 block"
          >
            {settings.featuresEyebrow}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="font-bold tracking-tight mb-8 whitespace-pre-line"
            style={{ fontSize: settings.featuresTitleSize }}
          >
            {settings.featuresTitle}
          </motion.h2>
          <p
            className="text-zinc-500 leading-relaxed max-w-2xl whitespace-pre-line"
            style={{ fontSize: settings.featuresSubtitleSize }}
          >
            {settings.featuresSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
          <div className="md:col-span-8 bg-zinc-50 rounded-[2.5rem] p-12 flex flex-col justify-between group overflow-hidden relative">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <PhoneCall className="w-12 h-12 text-blue-500" />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{settings.featuresCards[0]?.title}</h3>
                <p className="text-zinc-500 text-sm max-w-md min-h-[2.75rem] leading-6">
                  {settings.featuresCards[0]?.description}
                </p>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          </div>

          <div className="md:col-span-4 bg-zinc-900 text-white rounded-[2.5rem] p-12 flex flex-col">
            <div className="flex flex-col h-full justify-between">
              <Brain className="w-10 h-10 text-purple-400" />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{settings.featuresCards[1]?.title}</h3>
              <p className="text-zinc-400 text-sm min-h-[2.75rem] leading-6">
                {settings.featuresCards[1]?.description}
              </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-zinc-50 rounded-[2.5rem] p-12 flex flex-col">
            <div className="flex flex-col h-full justify-between">
              <Database className="w-10 h-10 text-zinc-800" />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{settings.featuresCards[2]?.title}</h3>
              <p className="text-zinc-500 text-sm min-h-[2.75rem] leading-6">
                {settings.featuresCards[2]?.description}
              </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-8 bg-zinc-50 rounded-[2.5rem] p-12 flex flex-col justify-between relative group overflow-hidden">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{settings.featuresCards[3]?.title}</h3>
                <p className="text-zinc-500 text-sm max-w-md min-h-[2.75rem] leading-6">
                  {settings.featuresCards[3]?.description}
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
