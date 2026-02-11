"use client";

import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";

export default function VerifyPage() {
  return (
    <AuthShell title="이메일을 확인해 주세요" subtitle="인증 링크를 이메일로 전송했습니다.">
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          인증 링크를 클릭하면 자동으로 로그인 페이지로 이동합니다.
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          도메인을 사용하더라도 메일이 스팸함으로 분류될 수 있으니 꼭 확인해주세요.
        </div>
        <div className="text-center">
          <Link className="text-sm text-emerald-700 hover:underline" href="/login">
            로그인으로 이동
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
