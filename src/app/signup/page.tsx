"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSignup = async () => {
    if (!email || !pw) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase 설정이 필요합니다.");
      return;
    }

    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/login`;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (signUpError) {
      setError(signUpError.message || "회원가입에 실패했습니다.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <AuthShell
      title="계정을 생성하세요"
      subtitle="이메일 인증 후 운영자 콘솔에 접근할 수 있습니다."
      footer={
        <span>
          이미 계정이 있나요?{" "}
          <Link className="text-emerald-700 hover:underline" href="/login">
            로그인
          </Link>
        </span>
      }
    >
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
        <label className="block">
          <div className="text-xs text-slate-600">비밀번호</div>
          <Input
            value={pw}
            type="password"
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
            className="mt-2"
          />
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            인증 이메일을 전송했습니다. 메일이 보이지 않으면 스팸함을 확인해주세요.
          </div>
        ) : null}

        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "전송 중..." : "회원가입"}
        </button>

        <div className="text-xs text-slate-500">
          도메인을 사용하더라도 메일이 스팸함으로 분류될 수 있습니다.
        </div>
      </div>
    </AuthShell>
  );
}
