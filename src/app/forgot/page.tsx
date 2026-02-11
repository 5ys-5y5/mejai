"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";

export default function ForgotPage() {
  const [email, setEmail] = useState("dragon7159@gmail.com");
  const [sent, setSent] = useState(false);

  return (
    <AuthShell title="비밀번호 재설정" subtitle="복구 링크를 이메일로 보내드립니다.">
      <div className="space-y-4">
        <label className="block">
          <div className="text-xs text-slate-600">이메일</div>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="mt-2"
          />
        </label>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => setSent(true)}
        >
          재설정 링크 보내기
        </button>
        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            복구 이메일을 전송했습니다.
          </div>
        ) : null}
        <div className="text-center">
          <Link className="text-sm text-emerald-700 hover:underline" href="/login">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
