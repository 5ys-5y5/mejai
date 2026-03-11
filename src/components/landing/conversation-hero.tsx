"use client";

import { MatrixRainBackground } from "@/components/landing/matrix-rain-background";
import { HomeWidgetInstallBox } from "@/components/landing/home-widget-install-box";

export function LandingConversationHero() {

  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-white text-black border-b border-zinc-200 flex items-start md:items-center py-10 md:py-0">
      <div className="hero-bg absolute inset-0 pointer-events-none">
        <MatrixRainBackground />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-white to-transparent" />
      <div className="relative container mx-auto w-full max-w-6xl px-6">
        <div className="px-5 md:px-8 py-6">
          <HomeWidgetInstallBox />
        </div>

      </div>
    </section>
  );
}
