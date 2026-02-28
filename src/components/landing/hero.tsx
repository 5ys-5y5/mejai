"use client";

import { MatrixRainBackground } from "@/components/landing/matrix-rain-background";

export function Hero() {
  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-white text-black border-b border-zinc-200 flex items-center !py-0">
      <div className="hero-bg absolute inset-0 pointer-events-none">
        <MatrixRainBackground />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-white to-transparent" />

      <main className="relative container mx-auto w-full max-w-6xl px-6" />
    </section>
  );
}
