"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import type { LandingSettings } from "@/lib/landingSettings";

export function Hero({ settings }: { settings: LandingSettings }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white antialiased px-0 !pt-0 !pb-0 md:!pt-0 md:!pb-0">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="relative z-20 w-full px-0 text-center">
        <div className="absolute inset-0 z-0">
          <iframe
            title="Mejai Spline Background"
            src="https://my.spline.design/nexbotrobotcharacterconcept-LSClj3GO999RxXpJAXwi3XNC/"
            className="h-full w-full"
            allow="autoplay; fullscreen"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-0 z-[1] bg-zinc-200/50 pointer-events-none" />
        <div className="relative z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto px-6 pointer-events-none"
            style={{
              maxWidth: settings.heroContentMaxWidth,
              paddingTop: settings.heroContentPaddingTop,
              paddingBottom: settings.heroContentPaddingBottom,
              marginTop: settings.heroContentMarginTop,
              marginBottom: settings.heroContentMarginBottom,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 mb-10"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                {settings.heroBadge}
              </span>
            </motion.div>

            <h1
              className="font-bold tracking-tighter leading-[0.8] mb-12 text-black"
              style={{ fontSize: settings.heroTitleSize }}
            >
              {settings.heroTitle}
            </h1>

            <p
              className="font-medium text-zinc-900 tracking-tight mb-20 max-w-4xl mx-auto leading-tight whitespace-pre-line"
              style={{ fontSize: settings.heroSubtitleSize }}
            >
              {settings.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-32 pointer-events-auto">
              <Button
                size="lg"
                className="h-20 px-14 text-2xl rounded-full bg-black text-white hover:bg-zinc-800 transition-all active:scale-95"
              >
                {settings.primaryCta} <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="h-20 px-14 text-2xl rounded-full gap-3 bg-zinc-200 text-zinc-900 hover:bg-zinc-300 font-bold active:scale-95 border border-zinc-300"
                asChild
              >
                <Link href="/demo" className="inline-flex items-center gap-3">
                  <PlayCircle className="w-7 h-7" /> {settings.secondaryCta}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-white via-white/80 to-transparent z-[5] pointer-events-none" />
    </section>
  );
}
