"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/landing/navbar";

export function AppNavbarGate() {
  const pathname = usePathname();

  if (pathname.startsWith("/app")) {
    return null;
  }

  return <Navbar />;
}
