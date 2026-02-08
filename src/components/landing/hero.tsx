"use client";

import type { LandingSettings } from "@/lib/landingSettings";
import { HeroContainer } from "@/components/landing/HeroContainer";

export function Hero({ settings }: { settings: LandingSettings }) {
  return <HeroContainer settings={settings} />;
}

