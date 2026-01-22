import React from "react";
import Link from "next/link";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

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

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-4 py-12">
        <div className="mb-10 flex items-center gap-2">
          <BrandMark />
        </div>

        <div className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white ">
            <div className="p-5">
              {children}
              {footer ? <div className="mt-4 text-center text-sm text-slate-600">{footer}</div> : null}
            </div>
          </div>

          <div className="mt-10 text-center text-xs text-slate-500">© Mejai</div>
        </div>
      </div>
    </div>
  );
}