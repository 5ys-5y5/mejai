"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from] = useState(() => {
    if (typeof window === "undefined") return "/app";
    const params = new URLSearchParams(window.location.search);
    return params.get("from") ?? "/app";
  });

  const handleLogin = async () => {
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    if (signInError) {
      setError(signInError.message || "로그인에 실패했습니다.");
      setLoading(false);
      return;
    }

    router.replace(from);
  };

  return (
    <AuthShell
      title="다시 오신 것을 환영합니다"
      footer={
        <div className="space-y-2">
          <span className="block">
            <Link className="text-emerald-700 hover:underline" href="/forgot">
              비밀번호를 잊으셨나요?
            </Link>
          </span>
          <span className="block">
            계정이 없나요?{" "}
            <Link className="text-emerald-700 hover:underline" href="/signup?from=login">
              회원가입
            </Link>
          </span>
        </div>
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

        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <div className="text-center text-xs text-slate-500">
          이메일 인증이 완료된 계정만 로그인할 수 있습니다.
        </div>
      </div>
    </AuthShell>
  );
}
