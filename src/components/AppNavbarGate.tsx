"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/landing/navbar";

export function AppNavbarGate() {
  const pathname = usePathname();

  if (pathname.startsWith("/app") || pathname.startsWith("/embed")) {
    return null;
  }

  const needsOffset = pathname !== "/";

  return (
    <>
      <Navbar />
      {needsOffset ? <div className="h-[65px]" aria-hidden="true" /> : null}
    </>
  );
}
