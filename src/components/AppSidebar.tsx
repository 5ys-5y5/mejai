"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Book,
  Bot,
  ClipboardCheck,
  CreditCard,
  HomeIcon,
  Inbox,
  Phone,
  PhoneCall,
  Route as RouteIcon,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getSupabaseClient } from "@/lib/supabaseClient";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="랜딩 페이지로 이동">
      <div className="h-9 w-9 rounded-2xl bg-slate-200" />
      <div className="leading-tight">
        <div className="font-semibold tracking-tight text-slate-900">Mejai</div>
      </div>
    </Link>
  );
}

function SidebarGroup({ header, children, collapsed }: { header: string; children: React.ReactNode; collapsed: boolean }) {
  return (
    <div>
      {collapsed ? (
        <div className="px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wide flex justify-center">•</div>
      ) : (
        <div className="px-3 text-[11px] font-medium text-slate-500">{header}</div>
      )}
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  badge,
  onClick,
  collapsed,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick?: () => void;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === to || (to !== "/app" && pathname.startsWith(to));
  return (
    <Link
      href={to}
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm border",
        collapsed ? "justify-center" : "",
        isActive ? "bg-slate-100 border-slate-200 text-slate-900" : "border-transparent text-slate-700 hover:bg-slate-50"
      )}
    >
      <Icon className={cn("h-4 w-4", isActive ? "text-emerald-600" : "text-slate-500")} />
      {collapsed ? null : <span className="truncate">{label}</span>}
      {typeof badge === "number" && !collapsed ? (
        <span className="ml-auto text-[11px] rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AppSidebar({ onNavigate, collapsed = false }: { onNavigate: () => void; collapsed: boolean }) {
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    async function loadCount() {
      try {
        const res = await apiFetch<{ total: number }>("/api/review-queue?limit=1&offset=0");
        if (mounted) setReviewCount(res.total ?? 0);
      } catch {
        if (mounted) setReviewCount(0);
      }
    }
    loadCount();
    timer = setInterval(loadCount, 30000);
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) loadCount();
    });
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
      sub?.subscription.unsubscribe();
    };
  }, []);

  const badgeCount = typeof reviewCount === "number" && reviewCount > 0 ? reviewCount : undefined;
  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col border-r border-slate-200 bg-white transition-[width] duration-150 sticky top-0 h-screen overflow-y-auto",
        collapsed ? "md:w-20" : "md:w-72"
      )}
    >
      <div className={cn("h-[60px] flex items-center", collapsed ? "px-3" : "px-5")}>
        {collapsed ? (
          <div className="flex items-center justify-center w-full">
            <Link href="/" aria-label="랜딩 페이지로 이동" title="Mejai">
              <div className="h-9 w-9 rounded-2xl bg-slate-200" />
            </Link>
          </div>
        ) : (
          <BrandMark />
        )}
      </div>

      <nav className={cn("py-4 space-y-5", collapsed ? "px-2" : "px-3")}>
        <SidebarGroup header="홈" collapsed={collapsed}>
          <SidebarLink to="/app" icon={HomeIcon} label="대시보드" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>

        <SidebarGroup header="모니터링" collapsed={collapsed}>
          <SidebarLink to="/app/calls" icon={PhoneCall} label="통화/세션" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink
            to="/app/review"
            icon={Inbox}
            label="후속 지원 요청"
            badge={badgeCount}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        </SidebarGroup>

        <SidebarGroup header="구성" collapsed={collapsed}>
          <SidebarLink to="/app/agents" icon={Users} label="에이전트" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink
            to="/app/labolatory"
            icon={Bot}
            label="실험실"
            collapsed={collapsed}
            onClick={onNavigate}
          />
          <SidebarLink to="/app/eval" icon={ClipboardCheck} label="평가/관리" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink to="/app/kb" icon={Book} label="지식 베이스" collapsed={collapsed} onClick={onNavigate} />
          <SidebarLink to="/app/rules" icon={RouteIcon} label="규칙" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>

        <SidebarGroup header="온보딩" collapsed={collapsed}>
          <SidebarLink to="/onboarding" icon={Phone} label="번호/정책 설정" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>

        <SidebarGroup header="설정" collapsed={collapsed}>
          <SidebarLink to="/app/settings" icon={Settings} label="설정" collapsed={collapsed} onClick={onNavigate} />
        </SidebarGroup>
      </nav>

      <div className="mt-auto p-4 border-t border-slate-200 space-y-3">
        <Link
          href="/app/billing"
          title="결제/플랜"
          aria-label="결제/플랜"
          className="w-full inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          <CreditCard className={cn("h-4 w-4 text-slate-600", collapsed ? "" : "mr-2")} />
          {collapsed ? null : "결제/플랜"}
        </Link>
      </div>
    </aside>
  );
}
