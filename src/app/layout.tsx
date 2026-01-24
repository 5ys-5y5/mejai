import type { Metadata } from "next";
import "./globals.css";
import { AppNavbarGate } from "@/components/AppNavbarGate";
import { Toaster } from "sonner";
import { RouteAnnouncerCleanup } from "@/components/RouteAnnouncerCleanup";

export const metadata: Metadata = {
  title: "Mejai",
  description: "전화 상담을 위한 AI 자동화 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AppNavbarGate />
        <main>{children}</main>
        <Toaster position="top-center" />
        <RouteAnnouncerCleanup />
      </body>
    </html>
  );
}
