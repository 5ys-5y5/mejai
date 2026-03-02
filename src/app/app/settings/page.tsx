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
  { t: "2026-01-21 10:30", who: "operator@mejai.help", what: "?몄뀡 s_9d3f2b 議고쉶" },
  { t: "2026-01-20 18:50", who: "jane@mejai.help", what: "Unknown" },
  { t: "2026-01-18 09:02", who: "owner@mejai.help", what: "KB '?섎텋 ?뺤콉' v3 諛고룷" },
];

const teamSeed = [
  { role: "운영", perms: "대화, KB, 리뷰" },
  { role: "관리자", perms: "정책, KB, 리뷰" },
  { role: "감사", perms: "읽기 전용, 감사" },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get("tab") || "profile").toLowerCase();
  const resolvedTab = rawTab === "general" ? "profile" : rawTab;
  const tab: TabKey =
    resolvedTab === "workspaces" || resolvedTab === "team" || resolvedTab === "audit" || resolvedTab === "profile"
      ? resolvedTab
      : "profile";

  const [email, setEmail] = useState("operator@mejai.help");
  const givenName = "사용자";

  const { enabled: helpPanelEnabled, setEnabled: setHelpPanelEnabled } = useHelpPanelEnabled();

  useEffect(() => {
    const redirectToInstall = (target: string) => {
      router.replace(`/app/install?tab=${target}`);
    };
    const redirectToAdmin = (target: string) => {
      router.replace(`/app/admin?tab=${target}`);
    };
    if (rawTab === "widget" || rawTab === "quickstart") {
      redirectToInstall(rawTab);
    }
    if (rawTab === "env") {
      redirectToInstall("env");
    }
    if (rawTab === "chat" || rawTab === "proposal" || rawTab === "performance") {
      redirectToAdmin(rawTab);
    }
  }, [rawTab, router]);

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
      { key: "team", label: "팀" },
      { key: "audit", label: "감사로그" },
    ],
    []
  );

  return (
    <div className="px-5 md:px-8 pt-6 pb-[100px]">
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
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">?뚰겕?ㅽ럹?댁뒪</div>
                    <div className="mt-1 text-sm text-slate-600">?깆????뚰겕?ㅽ럹?댁뒪</div>
                    <div className="mt-1 text-xs text-slate-500">경로: /workspaces/01</div>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    ????
                  </button>
                </div>
              </div>
            </Card>
          ) : tab === "team" ? (
            <Card>
              <div className="p-4">
                <div className="text-sm font-semibold text-slate-900">Unknown</div>
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
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">?대찓??二쇱냼</p>
                    <p className="text-sm text-slate-600">{email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">?대쫫</p>
                    <p className="text-sm text-slate-600">{givenName}</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    ???? ????
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">?꾩옱 ?뚮옖</p>
                    <p className="text-sm text-slate-600">무료</p>
                  </div>
                  <Link
                    href="/app/billing"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    ???? ????
                  </Link>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">?꾩? ?⑤꼸</p>
                    <p className="text-sm text-slate-600">
                      ?쒕퉬???ъ슜 ?쒖꽌? ?꾩냽 吏???붿껌 ???諛붾줈媛湲곕? ?쒖떆?⑸땲??
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
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">紐⑤뱺 湲곌린?먯꽌 濡쒓렇?꾩썐</p>
                    <p className="text-sm text-slate-600">紐⑤뱺 湲곌린 諛??몄뀡?먯꽌 濡쒓렇?꾩썐?⑸땲??</p>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    濡쒓렇?꾩썐
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-rose-600">怨꾩젙 ??젣</p>
                    <p className="text-sm text-slate-600">怨꾩젙 ??젣???섎룎由????놁뒿?덈떎.</p>
                  </div>
                  <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 hover:bg-rose-100">
                    怨꾩젙 ??젣
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
