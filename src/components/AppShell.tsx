"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileDrawer } from "./MobileDrawer";
import { HelpPanel } from "./HelpPanel";
import { apiFetch } from "@/lib/apiClient";
import {
  readPerformanceConfigFromStorage,
  sanitizePerformanceConfig,
  type PerformanceConfig,
  writePerformanceConfigToStorage,
} from "@/lib/performanceConfig";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = useMemo(() => {
    const p = pathname;
    if (p === "/app") return "대시보드";
    if (p.startsWith("/app/calls")) return "통화/세션";
    if (p.startsWith("/app/contacts")) return "고객";
    if (p.startsWith("/app/users")) return "고객";
    if (p.startsWith("/app/analytics")) return "통계/트렌드";
    if (p.startsWith("/app/review")) return "후속 지원 요청";
    if (p.startsWith("/app/agents-kb")) return "Agents and KB";
    if (p.startsWith("/app/agents")) return "에이전트";
    if (p.startsWith("/app/eval")) return "평가/관리";
    if (p.startsWith("/app/kb")) return "지식 베이스";
    if (p.startsWith("/app/rules")) return "규칙";
    if (p.startsWith("/app/settings")) return "설정";
    if (p.startsWith("/app/admin")) return "어드민";
    if (p.startsWith("/app/install")) return "설치하기";
    if (p.startsWith("/app/billing")) return "결제/플랜";
    return "";
  }, [pathname]);

  const showSearch = useMemo(() => {
    return pathname.startsWith("/app/calls");
  }, [pathname]);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileOpen(true);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  }

  const renderedChildren = useMemo(() => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ headerSearch?: string }>, {
        headerSearch,
      });
    }
    return children;
  }, [children, headerSearch]);

  useEffect(() => {
    let mounted = true;
    async function bootstrapPerformanceConfig() {
      try {
        const res = await apiFetch<{ config?: PerformanceConfig }>("/api/performance-config");
        if (!mounted) return;
        const nextConfig = sanitizePerformanceConfig(res.config || {});
        const currentConfig = readPerformanceConfigFromStorage();
        if (JSON.stringify(currentConfig) !== JSON.stringify(nextConfig)) {
          writePerformanceConfigToStorage(nextConfig);
        }
      } catch {
        // ignore; default local config is used
      }
    }
    bootstrapPerformanceConfig();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-white text-slate-900 flex">
      <AppSidebar collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          title={pageTitle}
          showSearch={showSearch}
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto pt-[10px]">{renderedChildren}</main>

        <HelpPanel />
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <AppSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </MobileDrawer>
    </div>
  );
}
