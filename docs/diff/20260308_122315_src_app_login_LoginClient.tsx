"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";
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
      <LoginForm
        email={email}
        password={pw}
        loading={loading}
        error={error}
        onEmailChange={setEmail}
        onPasswordChange={setPw}
        onSubmit={handleLogin}
      />
    </AuthShell>
  );
}
