"use client";

import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Process } from "@/components/landing/process";
import { Comparison } from "@/components/landing/comparison";
import { Trust } from "@/components/landing/trust";
import { ConsolePreview } from "@/components/landing/console-preview";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { motion, useScroll, useSpring } from "framer-motion";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="relative bg-white text-black selection:bg-black selection:text-white">
      {/* Apple-style Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-black z-[100] origin-left"
        style={{ scaleX }}
      />

      <Hero />
      
      {/* 이 섹션들은 Apple 제품 페이지처럼 각각의 '거대한 서사'를 가집니다. */}
      <div className="space-y-0">
        <Features />
        <Process />
        <Comparison />
        <ConsolePreview />
        <Trust />
        <CTA />
      </div>

      <Footer />
    </div>
  );
}
