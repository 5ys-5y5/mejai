import type { Metadata } from "next";
import "./globals.css";
import { AppNavbarGate } from "@/components/AppNavbarGate";
import { Toaster } from "sonner";
import { RouteAnnouncerCleanup } from "@/components/RouteAnnouncerCleanup";

export const metadata: Metadata = {
  title: "Mejai",
  description: "전화 상담을 위한 AI 자동화 서비스",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", type: "image/x-icon" },
      { url: "/brand/logo-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/logo-512.png", type: "image/png", sizes: "512x512" },
      { url: "/brand/logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
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
