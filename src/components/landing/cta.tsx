"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import type { LandingSettings } from "@/lib/landingSettings";

export function CTA({ settings }: { settings: LandingSettings }) {
  return (
    <section className="py-40 bg-white text-black text-center overflow-hidden relative">
      <div className="container mx-auto w-full max-w-6xl px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2
            className="font-bold tracking-tighter leading-none mb-12 whitespace-pre-line"
            style={{ fontSize: settings.ctaTitleSize }}
          >
            {settings.ctaTitle}
          </h2>
          <p
            className="text-zinc-500 mb-16 max-w-2xl mx-auto leading-relaxed whitespace-pre-line"
            style={{ fontSize: settings.ctaSubtitleSize }}
          >
            {settings.ctaSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button
              size="lg"
              className="h-16 px-12 text-xl rounded-full bg-black text-white hover:bg-zinc-800 transition-all"
            >
              {settings.ctaPrimary}
            </Button>
            <Button variant="ghost" size="lg" className="h-16 px-12 text-xl rounded-full gap-2">
              {settings.ctaSecondary} <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zinc-50 rounded-full blur-[120px] -z-10 opacity-50" />
    </section>
  );
}
