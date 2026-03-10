"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";
import { getSupabaseClient } from "@/lib/supabaseClient";

const WIDGET_TEMPLATE_ID = "c9ab5088-1d28-4f7f-88f4-01c46fa9ddfc";
const WIDGET_TEMPLATE_PUBLIC_KEY = String(process.env.NEXT_PUBLIC_LOGIN_WIDGET_PUBLIC_KEY || "").trim();
const WIDGET_BASE_SRC = `/embed/widget_id=${WIDGET_TEMPLATE_ID}`;

function buildWidgetUrl(extraParams?: Record<string, string>) {
  const base = WIDGET_BASE_SRC;
  if (typeof window === "undefined") return base;
  const search = new URLSearchParams();
  if (WIDGET_TEMPLATE_PUBLIC_KEY) {
    search.set("public_key", WIDGET_TEMPLATE_PUBLIC_KEY);
  }
  search.set("origin", window.location.origin);
  search.set("page_url", window.location.href);
  const preview = window.location.search
    ? new URLSearchParams(window.location.search).get("preview")
    : null;
  const tab = window.location.search ? new URLSearchParams(window.location.search).get("tab") : null;
  if (preview) search.set("preview", preview);
  if (tab) search.set("tab", tab);
  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      search.set(key, value);
    });
  }
  return `${base}?${search.toString()}`;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetSrc, setWidgetSrc] = useState(WIDGET_BASE_SRC);
  const [policyWidgetSrc, setPolicyWidgetSrc] = useState(WIDGET_BASE_SRC);
  const isEmbed = searchParams?.get("embed") === "1";
  const [from] = useState(() => {
    if (typeof window === "undefined") return "/app";
    const params = new URLSearchParams(window.location.search);
    return params.get("from") ?? "/app";
  });

  useEffect(() => {
    setWidgetSrc(buildWidgetUrl());
    setPolicyWidgetSrc(
      buildWidgetUrl({
        tab: "policy",
      })
    );
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

    if (!isEmbed) {
      router.replace(from);
    }
  };

  if (isEmbed) {
    return (
      <div className="min-h-full w-full bg-white">
        <div className="mx-auto w-full max-w-md">
          <div className="p-5">
            <LoginForm
              email={email}
              password={pw}
              loading={loading}
              error={error}
              showHelperText={false}
              onEmailChange={setEmail}
              onPasswordChange={setPw}
              onSubmit={handleLogin}
            />
          </div>
          <div className="mt-6 flex w-full flex-col gap-4">
            <iframe
              title="Login widget (policy)"
              src={policyWidgetSrc}
              className="w-full border-0"
              style={{ height: 210, overflow: "hidden" }}
              scrolling="no"
              allow="clipboard-read; clipboard-write"
            />
            <iframe
              title="Login widget"
              src={widgetSrc}
              className="w-full border-0"
              style={{ height: 300, overflow: "hidden" }}
              scrolling="no"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="다시 오신 것을 환영합니다"
      footer={null}
      showBrand={false}
      showTitle={false}
      showFooter={!isEmbed}
      contentMarginTop="none"
      afterContent={
        <div className="flex w-full flex-col -space-y-[30px] overflow-hidden rounded-2xl border border-slate-200">
          <div className="w-full overflow-hidden">
            <iframe
              title="Login widget (policy)"
              src={policyWidgetSrc}
              className="w-full overflow-hidden"
              style={{ height: 210, overflow: "hidden" }}
              scrolling="no"
              allow="clipboard-read; clipboard-write"
            />
          </div>
          <div className="w-full overflow-hidden">
            <iframe
              title="Login widget"
              src={widgetSrc}
              className="w-full overflow-hidden"
              style={{ height: 300, overflow: "hidden" }}
              scrolling="no"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      }
    >
      <LoginForm
        email={email}
        password={pw}
        loading={loading}
        error={error}
        emailRightSlot={
          <>
            계정이 없나요?{" "}
            <Link className="text-emerald-700 hover:underline" href="/signup?from=login">
              회원가입
            </Link>
          </>
        }
        passwordRightSlot={
          <Link className="text-emerald-700 hover:underline" href="/forgot">
            비밀번호를 잊으셨나요?
          </Link>
        }
        showHelperText={false}
        onEmailChange={setEmail}
        onPasswordChange={setPw}
        onSubmit={handleLogin}
      />
      {isEmbed ? (
        <style>{`
          main div div div,
          main div div div * {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
        `}</style>
      ) : null}
    </AuthShell>
  );
}
