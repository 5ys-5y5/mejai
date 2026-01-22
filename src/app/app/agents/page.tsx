"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Plus } from "lucide-react";

export default function AgentsPage() {
  const agents = useMemo(
    () => [{ id: "a_01", name: "테스트", createdBy: "성지용", createdAt: "2026-01-21 13:10" }],
    []
  );

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold text-slate-900">에이전트</h1>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Link
              href="/app/agents/playground"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              플레이그라운드
            </Link>
            <Link
              href="/app/agents/new"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              새 에이전트
            </Link>
          </div>
        </div>

        <Card className="mt-4">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-900">에이전트</div>
          <div className="divide-y divide-slate-200">
            {agents.map((a) => (
              <div key={a.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      생성자 {a.createdBy} · {a.createdAt}
                    </div>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    옵션
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}