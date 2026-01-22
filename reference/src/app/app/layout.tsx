"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Phone, 
  BarChart2, 
  Book, 
  CheckCircle2, 
  MessageSquare, 
  ShieldAlert, 
  Settings, 
  Users,
  LogOut,
  ChevronRight,
  Sparkles,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const sidebarItems = [
  { group: "Overview", items: [
    { name: "대시보드", href: "/app", icon: LayoutDashboard },
    { name: "통화 내역", href: "/app/calls", icon: Phone },
    { name: "통계/분석", href: "/app/analytics", icon: BarChart2 },
  ]},
  { group: "Management", items: [
    { name: "대체 용이성 평가", href: "/app/eval", icon: CheckCircle2 },
    { name: "지식 베이스", href: "/app/kb", icon: Book },
    { name: "규칙 관리", href: "/app/rules", icon: ShieldAlert },
    { name: "개선 큐", href: "/app/review", icon: MessageSquare },
  ]},
  { group: "System", items: [
    { name: "팀 관리", href: "/app/team", icon: Users },
    { name: "환경 설정", href: "/app/settings", icon: Settings },
  ]}
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: orgs } = await supabase
          .from("organizations")
          .select("name")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (orgs && orgs.length > 0) setOrg(orgs[0]);
      }
      setIsLoading(false);
    };
    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-white text-zinc-900 selection:bg-black selection:text-white font-sans antialiased">
      {/* Premium Sidebar (Apple Style: Clean, Wide, Subtle) */}
      <aside className="w-[300px] border-r border-zinc-100 flex flex-col fixed h-screen z-50 bg-white">
        <div className="p-10 pb-12 flex flex-col gap-10">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center transition-transform group-hover:scale-110">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter">mejai.help</span>
          </Link>

          <div className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-50 border border-zinc-100 min-h-[72px]">
            {isLoading ? (
              <div className="flex items-center justify-center w-full">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold truncate">{user?.email?.split('@')[0]}</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">
                    {org?.name || "개인 계정"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-10 overflow-y-auto pb-10">
          {sidebarItems.map((group) => (
            <div key={group.group} className="space-y-4">
              <h4 className="px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                {group.group}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group",
                        isActive 
                          ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200" 
                          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")} />
                        {item.name}
                      </div>
                      {isActive && (
                        <motion.div layoutId="active-pill">
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </motion.div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-8 border-t border-zinc-50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-6 py-4 w-full rounded-2xl text-sm font-bold text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-[300px] bg-white">
        <div className="container px-12 py-10 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
