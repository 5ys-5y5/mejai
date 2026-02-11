"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, Phone, BarChart2, Book, ShieldCheck } from "lucide-react";
import type { LandingSettings } from "@/lib/landingSettings";

const consoleIcons = [Phone, BarChart2, Book, ShieldCheck];

export function ConsolePreview({ settings }: { settings: LandingSettings }) {
  return (
    <section className="py-32 bg-zinc-50 overflow-hidden">
      <div className="container mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="font-bold tracking-tight mb-8 whitespace-pre-line"
              style={{ fontSize: settings.consoleTitleSize }}
            >
              {settings.consoleTitle}
            </motion.h2>
            <p
              className="text-zinc-500 leading-relaxed mb-12 whitespace-pre-line"
              style={{ fontSize: settings.consoleSubtitleSize }}
            >
              {settings.consoleSubtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {settings.consoleCards.map((item, i) => {
                const Icon = consoleIcons[i] || Phone;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-black" />
                    </div>
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <p className="text-zinc-500 text-sm leading-relaxed">{item.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="lg:w-1/2 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              className="relative z-10 rounded-[2rem] overflow-hidden bg-white border border-zinc-200"
            >
              <div className="h-10 bg-zinc-100 flex items-center px-6 gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-300" />
                <div className="w-3 h-3 rounded-full bg-zinc-300" />
                <div className="w-3 h-3 rounded-full bg-zinc-300" />
              </div>
              <div className="flex h-[626px]">
                <div className="w-20 border-r border-zinc-100 flex flex-col items-center py-8 gap-8">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                  </div>
                  <Phone className="w-5 h-5 text-zinc-300" />
                  <BarChart2 className="w-5 h-5 text-zinc-300" />
                  <Book className="w-5 h-5 text-zinc-300" />
                </div>
                <div className="flex-1 p-10 space-y-10">
                  <div className="flex justify-between items-center">
                    <div className="h-8 w-48 bg-zinc-100 rounded-lg" />
                    <div className="h-10 w-32 bg-zinc-900 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="h-32 bg-zinc-50 rounded-3xl border border-zinc-100" />
                    <div className="h-32 bg-zinc-50 rounded-3xl border border-zinc-100" />
                  </div>
                  <div className="h-48 bg-zinc-50 rounded-[2rem] border border-zinc-100 p-8 space-y-4">
                    <div className="h-4 w-1/2 bg-zinc-200 rounded" />
                    <div className="h-2 w-full bg-zinc-100 rounded" />
                    <div className="h-2 w-3/4 bg-zinc-100 rounded" />
                    <div className="h-2 w-full bg-zinc-100 rounded" />
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="absolute -inset-10 bg-gradient-to-tr from-blue-100 to-purple-100 blur-[80px] opacity-30 -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
