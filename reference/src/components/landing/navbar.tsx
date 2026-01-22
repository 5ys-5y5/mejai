"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-border py-2"
          : "bg-transparent border-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          mejai.help
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            href="/demo"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            데모
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            요금제
          </Link>
          <Link
            href="/security"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            보안
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              로그인
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">시작하기</Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-b absolute top-full left-0 right-0 p-4 flex flex-col space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2">
          <Link href="/demo" className="text-sm font-medium">
            데모
          </Link>
          <Link href="/pricing" className="text-sm font-medium">
            요금제
          </Link>
          <Link href="/security" className="text-sm font-medium">
            보안
          </Link>
          <div className="flex flex-col space-y-2 pt-2 border-t">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                로그인
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="w-full">시작하기</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
