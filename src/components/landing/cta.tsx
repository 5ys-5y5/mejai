"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-40 bg-white text-black text-center overflow-hidden relative">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-6xl md:text-[100px] font-bold tracking-tighter leading-none mb-12">
            상담의 미래를<br />
            지금 체험하세요
          </h2>
          <p className="text-xl md:text-3xl text-zinc-500 mb-16 max-w-2xl mx-auto leading-relaxed">
            무료 데모로 Mejai의 정교한 성능을
            직접 경험해 보세요.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button
              size="lg"
              className="h-16 px-12 text-xl rounded-full bg-black text-white hover:bg-zinc-800 transition-all"
            >
              지금 시작하기
            </Button>
            <Button variant="ghost" size="lg" className="h-16 px-12 text-xl rounded-full gap-2">
              전문가와 상담하기 <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zinc-50 rounded-full blur-[120px] -z-10 opacity-50" />
    </section>
  );
}
