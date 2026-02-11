"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const displayEmail = email || "operator@mejai.help";

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-label="내 프로필"
        tabIndex={0}
        className="group relative flex h-10 w-10 items-center justify-center rounded-lg outline-none hover:bg-slate-100 transition-all duration-150"
      >
        <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-700">
            {String(displayEmail || "U").slice(0, 1).toUpperCase()}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white z-50"
            role="dialog"
          >
            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500">로그인 계정</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 truncate">{displayEmail}</div>
            </div>

            <div className="p-3 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">구독 현황</div>
                  <Link
                    href="/app/billing"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    업그레이드
                  </Link>
                </div>
                <div className="mt-2 text-xs text-slate-600">플랜: 무료 · 크레딧: 10,000</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <Link
                  href="/app/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                >
                  설정
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
                <Link
                  href="/app/billing"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                >
                  구독/결제
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={async () => {
                    const supabase = getSupabaseClient();
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                    window.location.href = "/login";
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                >
                  로그아웃
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
