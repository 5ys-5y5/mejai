"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";
import { getSupabaseClient } from "@/lib/supabaseClient";

const PENDING_SIGNUP_KEY = "mejai_signup_pending";
const PENDING_SIGNUP_TTL_MS = 30 * 60 * 1000;

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from] = useState(() => {
    if (typeof window === "undefined") return "/app";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("from");
    const next = params.get("next");
    if (raw === "signup_verify") return next || "/app";
    return raw ?? "/app";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "signup_verify") return;
    const next = params.get("next") || "/app";

    const raw = window.localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return;

    let pending: { email?: string; password?: string; created_at?: number } | null = null;
    try {
      pending = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      return;
    }

    const createdAt = Number(pending?.created_at || 0);
    if (!createdAt || Date.now() - createdAt > PENDING_SIGNUP_TTL_MS) {
      window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      return;
    }

    const pendingEmail = String(pending?.email || "").trim();
    const pendingPassword = String(pending?.password || "").trim();
    if (!pendingEmail || !pendingPassword) {
      window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase에 연결할 수 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    supabase.auth
      .signInWithPassword({ email: pendingEmail, password: pendingPassword })
      .then(({ error: signInError }) => {
        if (signInError) {
          setError(signInError.message || "로그인에 실패했습니다. 다시 시도해주세요.");
          return;
        }
        window.localStorage.removeItem(PENDING_SIGNUP_KEY);
        router.replace(next);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogin = async () => {
    if (!email || !pw) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase에 연결할 수 없습니다.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    if (signInError) {
      setError(signInError.message || "로그인에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.replace(from);
  };

  return (
    <AuthShell
      title="로그인"
      footer={
        <div className="space-y-2">
          <span className="block">
            <Link className="text-emerald-700 hover:underline" href="/forgot">
              비밀번호를 잊으셨나요?
            </Link>
          </span>
          <span className="block">
            계정이 없으신가요?{" "}
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
            placeholder="you@example.com"
            className="mt-2"
          />
        </label>

        <label className="block">
          <div className="text-xs text-slate-600">비밀번호</div>
          <Input
            value={pw}
            type="password"
            onChange={(e) => setPw(e.target.value)}
            placeholder="비밀번호를 입력하세요"
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
          같은 기기에서 이메일 인증을 완료하면 자동 로그인됩니다.
        </div>
      </div>
    </AuthShell>
  );
}
