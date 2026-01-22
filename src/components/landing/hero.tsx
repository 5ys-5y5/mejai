"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white antialiased">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="container relative z-20 mx-auto px-6 text-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 mb-10"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              모든 통화에 지능을
            </span>
          </motion.div>

          <h1 className="text-8xl md:text-[160px] font-bold tracking-tighter leading-[0.8] mb-12 text-black">
            Mejai
          </h1>

          <p className="text-xl md:text-3xl font-medium text-zinc-500 tracking-tight mb-20 max-w-4xl mx-auto leading-tight">
            인공지능이 당신의 전화 상담을 더 정확하고 빠르게 만듭니다.
            <br className="hidden md:block" />
            고객 경험은 좋아지고, 운영 비용은 내려갑니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-32">
            <Button
              size="lg"
              className="h-20 px-14 text-2xl rounded-full bg-black text-white hover:bg-zinc-800 transition-all shadow-2xl active:scale-95"
            >
              지금 시작하기 <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="h-20 px-14 text-2xl rounded-full gap-3 hover:bg-zinc-50 font-bold active:scale-95 text-zinc-900"
            >
              <PlayCircle className="w-7 h-7" /> 데모 보기
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="relative w-full h-[400px] md:h-[600px] z-10 -mt-20 pointer-events-none select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <div className="absolute w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-gradient-to-tr from-blue-400 via-purple-400 to-pink-400 rounded-full blur-[100px] opacity-20 animate-pulse" />

          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 10 + i * 5,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute border border-zinc-200 rounded-full"
              style={{
                width: `${400 + i * 150}px`,
                height: `${400 + i * 150}px`,
              }}
            />
          ))}

          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex items-center justify-center"
          >
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border border-zinc-100 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center">
                <Sparkles className="w-16 h-16 md:w-24 md:h-24 text-black opacity-10" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-white via-white/80 to-transparent z-20 pointer-events-none" />
    </section>
  );
}
