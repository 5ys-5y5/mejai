"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHelpPanelEnabled, useHelpPanelCollapsed } from "@/hooks/useHelpPanel";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { Badge } from "./ui/Badge";

const reviewQueueSeed = [
  { id: "rq_01", sessionId: "s_12a0c8", reason: "후속 지원 요청", created: "2026-01-20", owner: "미배정" },
  { id: "rq_02", sessionId: "s_9d3f2b", reason: "정책 미준수 의심", created: "2026-01-21", owner: "Jane" },
];

export function HelpPanel() {
  const { enabled } = useHelpPanelEnabled();
  const { collapsed, setCollapsed } = useHelpPanelCollapsed();
  const pathname = usePathname();

  const steps = useMemo(
    () => [
      { label: "로그인", to: "/login" },
      { label: "온보딩(번호/정책 설정)", to: "/onboarding" },
      { label: "통화/세션 확인", to: "/app/calls" },
      { label: "지식 베이스 업데이트", to: "/app/kb" },
      { label: "규칙(라우팅/에스컬레이션) 설정", to: "/app/rules" },
      { label: "후속 지원 요청 처리", to: "/app/review" },
      { label: "팀/권한 및 감사로그", to: "/app/settings?tab=workspaces" },
    ],
    []
  );

  const followups = useMemo(() => {
    return reviewQueueSeed.map((r) => ({
      id: r.id,
      title: r.reason,
      meta: `${r.created} · ${r.owner}`,
      to: `/app/calls/${r.sessionId}`,
    }));
  }, []);

  if (!enabled) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white  hover:bg-slate-50"
        aria-label="도움 패널 열기"
        title="도움 패널"
      >
        <HelpCircle className="h-5 w-5 text-slate-700" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[92vw] rounded-2xl border border-slate-200 bg-white ">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">도움 패널</div>
          <div className="text-[11px] text-slate-500 truncate">현재 위치: {pathname}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/settings"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            설정
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="도움 패널 최소화"
            title="최소화"
          >
            <ChevronDown className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-900">서비스 사용 순서</div>
          <ol className="mt-2 space-y-1.5">
            {steps.map((s, idx) => (
              <li key={s.to}>
                <Link
                  href={s.to}
                  className="flex items-center justify-between rounded-lg border border-transparent px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  <span className="truncate">
                    {idx + 1}. {s.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-900">후속 지원 요청 대상</div>
            <Link href="/app/review" className="text-[11px] text-emerald-700 hover:underline">
              큐로 이동
            </Link>
          </div>
          <div className="mt-2 space-y-1">
            {followups.length === 0 ? (
              <div className="text-xs text-slate-500">현재 항목이 없습니다.</div>
            ) : (
              followups.slice(0, 5).map((f) => (
                <Link
                  key={f.id}
                  href={f.to}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-slate-900">{f.id}</div>
                    <Badge variant="amber">{f.title}</Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{f.meta}</div>
                </Link>
              ))
            )}
          </div>
          {followups.length > 5 ? (
            <div className="mt-2 text-[11px] text-slate-500">+ {followups.length - 5}건 더</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}