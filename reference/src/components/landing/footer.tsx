"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-20 bg-zinc-50 border-t border-zinc-200">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2">
            <Link href="/" className="text-2xl font-bold tracking-tighter mb-6 block">
              mejai.help
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              전화 상담의 모든 과정을 데이터화하고 지능화합니다. <br />
              (주)메제이헬프 | 대표자 홍길동 <br />
              서울특별시 강남구 테헤란로 123
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">Platform</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link href="/features" className="hover:text-black transition-colors">Features</Link></li>
              <li><Link href="/demo" className="hover:text-black transition-colors">Live Demo</Link></li>
              <li><Link href="/pricing" className="hover:text-black transition-colors">Pricing</Link></li>
              <li><Link href="/app" className="hover:text-black transition-colors">Console</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">Company</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link href="/about" className="hover:text-black transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-black transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-black transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">Legal</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-black transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-400 text-xs">
            © 2026 mejai.help. All rights reserved.
          </p>
          <div className="flex gap-8">
            <Link href="#" className="text-zinc-400 hover:text-black transition-colors text-xs">Twitter</Link>
            <Link href="#" className="text-zinc-400 hover:text-black transition-colors text-xs">LinkedIn</Link>
            <Link href="#" className="text-zinc-400 hover:text-black transition-colors text-xs">GitHub</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
