"use client";

import { Features } from "@/components/landing/features";
import { Process } from "@/components/landing/process";
import { Comparison } from "@/components/landing/comparison";
import { Trust } from "@/components/landing/trust";
import { ConsolePreview } from "@/components/landing/console-preview";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { LandingConversationHero } from "@/components/landing/conversation-hero";
import { loadLandingSettings, type LandingSettings } from "@/lib/landingSettings";
import { motion, useScroll, useSpring } from "framer-motion";
import { Suspense, useEffect, useState } from "react";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const [settings, setSettings] = useState<LandingSettings>(() => loadLandingSettings());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "mejai_landing_settings_v1") {
        setSettings(loadLandingSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div
      className="relative bg-white text-black selection:bg-black selection:text-white"
      style={{ fontFamily: settings.landingFontFamily || undefined }}
    >
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-black z-[100] origin-left" style={{ scaleX }} />

      <Suspense fallback={null}>
        <LandingConversationHero />
      </Suspense>

      <div
        className="space-y-0"
        style={{
          paddingTop: settings.sectionsPaddingTop,
          paddingBottom: settings.sectionsPaddingBottom,
          marginTop: settings.sectionsMarginTop,
          marginBottom: settings.sectionsMarginBottom,
        }}
      >
        <Features settings={settings} />
        <Process settings={settings} />
        <Comparison settings={settings} />
        <ConsolePreview settings={settings} />
        <Trust settings={settings} />
        <CTA settings={settings} />
      </div>

      <Footer settings={settings} />
    </div>
  );
}
