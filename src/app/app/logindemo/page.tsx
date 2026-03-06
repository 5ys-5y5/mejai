"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const POLICY_TEXT = "관리자 로그인: 휴대폰 번호를 인증해 주세요. 인증 후 사용자 전용 정보 제공.";
const USER_TEXT = "관리자 로그인";
const BOT_TEXT = "휴대폰 번호를 입력해주세요.";

const PHASES = ["policy_typing", "user_message", "bot_message", "reset_pause"] as const;

export default function LoginDemoPage() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [policyChars, setPolicyChars] = useState(0);
  const timerRef = useRef<number | null>(null);

  const phase = PHASES[phaseIndex] ?? "policy_typing";
  const policyValue = useMemo(() => POLICY_TEXT.slice(0, policyChars), [policyChars]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    if (phase === "policy_typing") {
      if (policyChars < POLICY_TEXT.length) {
        timerRef.current = window.setTimeout(() => setPolicyChars((v) => v + 1), 40);
        return;
      }
      timerRef.current = window.setTimeout(() => setPhaseIndex(1), 600);
      return;
    }

    if (phase === "user_message") {
      timerRef.current = window.setTimeout(() => setPhaseIndex(2), 700);
      return;
    }

    if (phase === "bot_message") {
      timerRef.current = window.setTimeout(() => setPhaseIndex(3), 900);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      setPolicyChars(0);
      setPhaseIndex(0);
    }, 600);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [phase, policyChars]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-amber-50 p-6 text-slate-900">
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-4">
        <div className="w-full text-center text-xs font-semibold tracking-[0.2em] text-slate-500">LOGIN DEMO</div>
        <div className="w-[320px] h-[420px] rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.15)] overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="text-[11px] uppercase tracking-[0.3em] text-amber-200">Widget Login</div>
              <div className="mt-1 text-base font-semibold">정책 기반 로그인</div>
            </div>

            <div className="flex-1 p-3">
              <div className="mb-3">
                <div className="mb-1 text-[11px] font-semibold text-slate-500">정책</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <input
                    className="w-full bg-transparent outline-none"
                    readOnly
                    value={policyValue}
                    placeholder="정책을 입력합니다..."
                  />
                </div>
              </div>

              <div className="flex h-[250px] flex-col rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
                  대화
                </div>
                <div className="flex-1 space-y-2 overflow-hidden px-3 py-2 text-xs">
                  <div className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                    정책이 적용 중입니다.
                  </div>
                  {phaseIndex >= 1 ? (
                    <div className="flex justify-end">
                      <div className="max-w-[70%] rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-sm">
                        {USER_TEXT}
                      </div>
                    </div>
                  ) : null}
                  {phaseIndex >= 2 ? (
                    <div className="flex justify-start">
                      <div className="max-w-[70%] rounded-2xl bg-amber-100 px-3 py-2 text-slate-900 shadow-sm">
                        {BOT_TEXT}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
                  입력은 비활성화 상태입니다.
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              320x420 데모 · 루프 재생 중
            </div>
          </div>
        </div>
        <div className="text-[11px] text-slate-500">경로: /app/logindemo</div>
      </div>
    </div>
  );
}
