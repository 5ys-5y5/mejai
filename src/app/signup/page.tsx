"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";

type FieldKey = "email" | "password" | "phone" | "otp";

const PENDING_SIGNUP_KEY = "mejai_signup_pending";
const PENDING_SIGNUP_TTL_MS = 30 * 60 * 1000;

function resolveSignupErrorMessage(err: unknown) {
  if (!err) return "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.";
  if (typeof err === "string") {
    const raw = err.trim();
    if (!raw) return "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.";
    const upper = raw.toUpperCase();
    if (upper.includes("RATE_LIMIT") || upper.includes("TOO_MANY_REQUESTS")) {
      console.warn("[signup_debug] rate limit", raw);
      return "요청이 많아 처리되지 않았습니다. 잠시 후 다시 시도해주세요.";
    }
    if (upper.includes("OTP_SEND_FAILED")) {
      return "인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
    }
    if (upper.includes("OTP_VERIFY_FAILED")) {
      return "인증번호 확인에 실패했습니다. 다시 시도해주세요.";
    }
    if (upper.includes("PHONE_VERIFICATION_REQUIRED") || upper.includes("PHONE_VERIFICATION_FAILED")) {
      return "휴대폰 인증을 완료해주세요.";
    }
    return "요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }
  if (typeof err === "object") {
    const record = err as Record<string, any>;
    const status = record.status ?? record.statusCode ?? record.code;
    const message = typeof record.message === "string" ? record.message : "";
    if (status === 429 || /rate limit/i.test(message)) {
      console.warn("[signup_debug] rate limit", message || status);
      return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    }
    if (status === 502 || /network error/i.test(message)) {
      return "네트워크 오류입니다. 연결을 확인하고 다시 시도해주세요.";
    }
    if (status === 504 || /gateway timeout/i.test(message)) {
      return "회원가입 요청이 지연되었습니다. 잠시 후 다시 시도해주세요.";
    }
    if (message) {
      const upper = message.toUpperCase();
      if (upper.includes("OTP_SEND_FAILED")) {
        return "인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
      }
      if (upper.includes("OTP_VERIFY_FAILED")) {
        return "인증번호 확인에 실패했습니다. 다시 시도해주세요.";
      }
      if (upper.includes("PHONE_VERIFICATION_REQUIRED") || upper.includes("PHONE_VERIFICATION_FAILED")) {
        return "휴대폰 인증을 완료해주세요.";
      }
    }
  }
  return "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.";
}

function normalizePhone(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function persistPendingSignup(payload: { email: string; password: string }) {
  if (typeof window === "undefined") return;
  const data = {
    email: payload.email,
    password: payload.password,
    created_at: Date.now(),
  };
  window.localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(data));
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [phone, setPhone] = useState("");
  const [otpRef, setOtpRef] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<FieldKey, string>>({
    email: "",
    password: "",
    phone: "",
    otp: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from === "login") return;

    const referrer = document.referrer || "";
    if (referrer) {
      try {
        const refUrl = new URL(referrer);
        if (refUrl.origin === window.location.origin && refUrl.pathname === "/login") {
          return;
        }
      } catch {
        // ignore invalid referrer
      }
    }
    router.replace("/login");
  }, [router]);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

  const validateFields = () => {
    const nextErrors: Record<FieldKey, string> = {
      email: "",
      password: "",
      phone: "",
      otp: "",
    };

    if (!email.trim()) nextErrors.email = "이메일을 입력해주세요.";
    if (!pw.trim()) nextErrors.password = "비밀번호를 입력해주세요.";
    if (!normalizedPhone) nextErrors.phone = "휴대폰 번호를 입력해주세요.";
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      nextErrors.phone = "휴대폰 번호를 정확히 입력해주세요.";
    }

    if (!verificationToken) {
      nextErrors.otp = "휴대폰 인증이 필요합니다.";
    }

    setFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const getInputClass = (key: FieldKey) => {
    if (!attempted || !fieldErrors[key]) return "mt-2";
    return "mt-2 border-rose-300 focus-visible:ring-rose-200";
  };

  const getInlineInputClass = (key: FieldKey) => {
    if (!attempted || !fieldErrors[key]) return "";
    return "border-rose-300 focus-visible:ring-rose-200";
  };

  const sendOtp = async () => {
    setError(null);
    if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      setFieldErrors((prev) => ({ ...prev, phone: "휴대폰 번호를 정확히 입력해주세요." }));
      return;
    }
    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/signup/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "OTP_SEND_FAILED");
      }
      setOtpRef(String(data?.otp_ref || ""));
      setOtpCode("");
      setVerificationToken(null);
      setVerifiedPhone(null);
    } catch (err) {
      setError(resolveSignupErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!otpRef || !otpCode.trim()) {
      setFieldErrors((prev) => ({ ...prev, otp: "인증번호를 입력해주세요." }));
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/auth/signup/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp_ref: otpRef, code: otpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "OTP_VERIFY_FAILED");
      }
      setVerificationToken(String(data?.verification_token || ""));
      setVerifiedPhone(String(data?.verified_phone || "") || null);
    } catch (err) {
      setError(resolveSignupErrorMessage(err));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSignup = async () => {
    setAttempted(true);
    setError(null);
    if (!validateFields()) return;

    if (!verificationToken) {
      setError("휴대폰 인증이 필요합니다.");
      return;
    }
    if (verifiedPhone && normalizePhone(verifiedPhone) !== normalizedPhone) {
      setError("인증된 휴대폰 번호가 입력값과 다릅니다.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/login?from=signup_verify&next=/app`;
    const startedAt = Date.now();
    console.info("[signup_debug] start", { email, redirectTo });

    try {
      persistPendingSignup({ email, password: pw });
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: pw,
          phone: normalizedPhone,
          verification_token: verificationToken,
          redirect_to: redirectTo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "SIGNUP_FAILED");
      }
      console.info("[signup_debug] success", { elapsed_ms: Date.now() - startedAt });
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[signup_debug] exception", { message, elapsed_ms: Date.now() - startedAt });
      setError(resolveSignupErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="회원가입"
      subtitle="휴대폰 인증 후 이메일 인증을 완료하세요."
      footer={
        <span>
          이미 계정이 있으신가요?{" "}
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
            placeholder="you@example.com"
            className={getInputClass("email")}
          />
        </label>
        <label className="block">
          <div className="text-xs text-slate-600">비밀번호</div>
          <Input
            value={pw}
            type="password"
            onChange={(e) => setPw(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className={getInputClass("password")}
          />
        </label>
        <label className="block">
          <div className="text-xs text-slate-600">휴대폰 번호</div>
          <div className="mt-2 flex gap-2">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              className={getInlineInputClass("phone")}
            />
            <button
              type="button"
              className="h-9 shrink-0 whitespace-nowrap rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={sendOtp}
              disabled={otpSending}
            >
              {otpSending ? "전송 중..." : "인증"}
            </button>
          </div>
        </label>
        <label className="block">
          <div className="text-xs text-slate-600">인증번호</div>
          <div className="mt-2 flex gap-2">
            <Input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="인증번호 입력"
              className={getInlineInputClass("otp")}
            />
            <button
              type="button"
              className="h-9 shrink-0 whitespace-nowrap rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={verifyOtp}
              disabled={!otpRef || !otpCode.trim() || otpVerifying}
            >
              {otpVerifying ? "확인 중..." : "확인"}
            </button>
          </div>
          {verificationToken ? (
            <div className="mt-2 text-xs text-emerald-700">휴대폰 인증이 완료되었습니다.</div>
          ) : null}
        </label>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            인증 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.
          </div>
        ) : null}

        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>

        {error && !loading ? (
          <button
            type="button"
            data-testid="signup-retry"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={handleSignup}
          >
            다시 시도
          </button>
        ) : null}

        <div className="text-xs text-slate-500">
          휴대폰 인증 후 이메일 인증 링크를 열면 가입이 완료됩니다.
        </div>
      </div>
    </AuthShell>
  );
}
