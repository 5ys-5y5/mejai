"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-[65px] border-b border-border bg-background/80 backdrop-blur-md"
      )}
    >
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Mejai
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link href="/demo" className="text-sm font-medium hover:text-primary transition-colors">
            데모
          </Link>
          <Link href="/pricing" className="text-sm font-medium hover:text-primary transition-colors">
            요금 안내
          </Link>
          <Link href="/security" className="text-sm font-medium hover:text-primary transition-colors">
            보안
          </Link>
          {isAuthed ? (
            <Link href="/app">
              <Button size="sm">대시보드</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm">시작하기</Button>
            </Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-b absolute top-full left-0 right-0 p-4 flex flex-col space-y-4 animate-in fade-in slide-in-from-top-2">
          <Link href="/demo" className="text-sm font-medium">
            데모
          </Link>
          <Link href="/pricing" className="text-sm font-medium">
            요금 안내
          </Link>
          <Link href="/security" className="text-sm font-medium">
            보안
          </Link>
          <div className="flex flex-col space-y-2 pt-2 border-t">
            {isAuthed ? (
              <Link href="/app">
                <Button className="w-full">대시보드</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button className="w-full">시작하기</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
