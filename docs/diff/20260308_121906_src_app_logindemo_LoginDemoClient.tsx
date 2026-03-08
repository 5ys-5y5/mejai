"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";
import { getSupabaseClient } from "@/lib/supabaseClient";

const WIDGET_TEMPLATE_ID = "c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc";

function buildWidgetUrl() {
  const base = `/embed/template_key=${WIDGET_TEMPLATE_ID}`;
  if (typeof window === "undefined") return base;
  const search = new URLSearchParams();
  search.set("origin", window.location.origin);
  search.set("page_url", window.location.href);
  const preview = window.location.search
    ? new URLSearchParams(window.location.search).get("preview")
    : null;
  const tab = window.location.search ? new URLSearchParams(window.location.search).get("tab") : null;
  if (preview) search.set("preview", preview);
  if (tab) search.set("tab", tab);
  return `${base}?${search.toString()}`;
}

export default function LoginDemoClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetSrc, setWidgetSrc] = useState(buildWidgetUrl);
  const [from] = useState(() => {
    if (typeof window === "undefined") return "/app";
    const params = new URLSearchParams(window.location.search);
    return params.get("from") ?? "/app";
  });

  useEffect(() => {
    setWidgetSrc(buildWidgetUrl());
  }, []);

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

  const footer = useMemo(
    () => (
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
    ),
    []
  );

  return (
    <AuthShell title="다시 오신 것을 환영합니다" footer={footer}>
      <div className="space-y-6">
        <LoginForm
          email={email}
          password={pw}
          loading={loading}
          error={error}
          onEmailChange={setEmail}
          onPasswordChange={setPw}
          onSubmit={handleLogin}
        />

        <div className="h-[520px] w-full overflow-hidden">
          <iframe
            title="Login demo widget"
            src={widgetSrc}
            className="h-full w-full"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </AuthShell>
  );
}
