"use client";

import Link from "next/link";
import type { LandingSettings } from "@/lib/landingSettings";

export function Footer({ settings }: { settings: LandingSettings }) {
  return (
    <footer
      className="bg-zinc-50 border-t border-zinc-200"
      style={{
        paddingTop: settings.footerPaddingTop,
        paddingBottom: settings.footerPaddingBottom,
        marginTop: settings.footerMarginTop,
        marginBottom: settings.footerMarginBottom,
      }}
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2">
            <Link href="/" className="text-2xl font-bold tracking-tighter mb-6 block">
              {settings.footerBrand}
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs whitespace-pre-line">
              {settings.footerDescription}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">플랫폼</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li>
                <Link href="/features" className="hover:text-black transition-colors">
                  기능 소개
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-black transition-colors">
                  데모 보기
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-black transition-colors">
                  요금 안내
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-black transition-colors">
                  콘솔
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">회사</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li>
                <Link href="/about" className="hover:text-black transition-colors">
                  회사 소개
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-black transition-colors">
                  블로그
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-black transition-colors">
                  채용
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-6 uppercase tracking-widest">법적 고지</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li>
                <Link href="/privacy" className="hover:text-black transition-colors">
                  개인정보 처리방침
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-black transition-colors">
                  서비스 이용약관
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-400 text-xs">{settings.footerCopyright}</p>
          <div className="flex gap-8">
            <Link href="#" className="text-zinc-400 hover:text-black transition-colors text-xs">
              트위터
            </Link>
            <Link href="#" className="text-zinc-400 hover:text-black transition-colors text-xs">
              링크드인
            </Link>
            <Link href="#" className="text-zinc-400 hover:text-black transition-colors text-xs">
              깃허브
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
