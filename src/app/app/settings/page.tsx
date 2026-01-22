"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useHelpPanelEnabled } from "@/hooks/useHelpPanel";
import { getSupabaseClient } from "@/lib/supabaseClient";

type TabKey = "profile" | "workspaces" | "team" | "audit";

const auditSeed = [
  { t: "2026-01-21 10:30", who: "operator@mejai.help", what: "세션 s_9d3f2b 조회" },
  { t: "2026-01-20 18:50", who: "jane@mejai.help", what: "리뷰 rq_01 할당" },
  { t: "2026-01-18 09:02", who: "owner@mejai.help", what: "KB '환불 정책' v3 배포" },
];

const teamSeed = [
  { role: "오너", perms: "모든 권한" },
  { role: "운영자", perms: "통화, KB, 리뷰" },
  { role: "감사자", perms: "읽기 전용, 감사" },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get("tab") || "profile").toLowerCase();
  const tab: TabKey = (rawTab === "general" ? "profile" : rawTab) as TabKey;

  const [email, setEmail] = useState("operator@mejai.help");
  const givenName = "성지용";

  const { enabled: helpPanelEnabled, setEnabled: setHelpPanelEnabled } = useHelpPanelEnabled();

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user?.email) setEmail(data.user.email);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email || "operator@mejai.help");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const tabs = useMemo(
    () => [
      { key: "profile", label: "프로필" },
      { key: "workspaces", label: "워크스페이스" },
      { key: "team", label: "팀/권한" },
      { key: "audit", label: "감사로그" },
    ],
    []
  );

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-b border-slate-200 pb-2">
          <nav className="flex gap-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => router.push(`/app/settings?tab=${t.key}`)}
                className={cn(
                  "whitespace-nowrap rounded-xl border px-3 py-2 text-sm",
                  tab === t.key
                    ? "border-slate-300 bg-slate-100 text-slate-900"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {tab === "workspaces" ? (
            <Card>
              <div className="divide-y divide-slate-200">
                <section className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">워크스페이스</div>
                    <div className="mt-1 text-sm text-slate-600">성지용 워크스페이스</div>
                    <div className="mt-1 text-xs text-slate-500">경로: /workspaces/01</div>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    관리
                  </button>
                </section>
              </div>
            </Card>
          ) : tab === "team" ? (
            <Card>
              <div className="p-4">
                <div className="text-sm font-semibold text-slate-900">팀/권한</div>
                <div className="mt-2 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  {teamSeed.map((r) => (
                    <div key={r.role} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="font-semibold text-slate-900">{r.role}</div>
                      <div className="mt-1 text-slate-600">{r.perms}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : tab === "audit" ? (
            <div className="space-y-3">
              {auditSeed.map((e, idx) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-900">{e.what}</div>
                    <div className="text-slate-500">{e.t}</div>
                  </div>
                  <div className="mt-1 text-slate-600">{e.who}</div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-slate-200">
                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">이메일 주소</p>
                    <p className="text-sm text-slate-600">{email}</p>
                  </div>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">이름</p>
                    <p className="text-sm text-slate-600">{givenName}</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    이름 변경
                  </button>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">현재 플랜</p>
                    <p className="text-sm text-slate-600">무료</p>
                  </div>
                  <Link
                    href="/app/billing"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    구독 관리
                  </Link>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">도움 패널</p>
                    <p className="text-sm text-slate-600">
                      서비스 사용 순서와 후속 지원 요청 대상 바로가기를 표시합니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setHelpPanelEnabled((v) => !v)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm",
                      helpPanelEnabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {helpPanelEnabled ? "ON" : "OFF"}
                  </button>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">모든 기기에서 로그아웃</p>
                    <p className="text-sm text-slate-600">모든 기기 및 세션에서 로그아웃합니다.</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    로그아웃
                  </button>
                </section>

                <section className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-rose-600">계정 삭제</p>
                    <p className="text-sm text-slate-600">계정 삭제는 되돌릴 수 없습니다.</p>
                  </div>
                  <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100">
                    계정 삭제
                  </button>
                </section>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
