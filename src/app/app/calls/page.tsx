"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/IconChip";
import { Clock, Headphones, PhoneCall } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { formatKstDateTime } from "@/lib/kst";

type SessionItem = {
  id: string;
  started_at: string | null;
  created_at?: string | null;
  duration_sec: number | null;
  channel: string | null;
  caller_masked: string | null;
  outcome: string | null;
  sentiment: string | null;
  agent_id: string | null;
};

function formatDate(value?: string | null) {
  return formatKstDateTime(value);
}

export default function CallsListPage({ headerSearch = "" }: { headerSearch?: string }) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ items: SessionItem[] }>("/api/sessions?limit=200");
        if (mounted) {
          setSessions(res.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError("세션 데이터를 불러오지 못했습니다.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const q = (headerSearch || "").trim().toLowerCase();
  const filtered = useMemo(
    () =>
      sessions.filter((s) =>
        q
          ? (s.id + (s.caller_masked || "") + (s.agent_id || "")).toLowerCase().includes(q)
          : true
      ),
    [q, sessions]
  );

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">세션</div>
            <div className="text-xs text-slate-500">총 {loading ? "-" : filtered.length}건</div>
          </div>
          <ul className="divide-y divide-slate-200">
            {error ? (
              <li className="p-4 text-sm text-rose-600">{error}</li>
            ) : null}
            {!error && !loading && filtered.length === 0 ? (
              <li className="p-4 text-sm text-slate-500">세션 데이터가 없습니다.</li>
            ) : null}
            {filtered.map((s) => (
              <li key={s.id}>
                <Link href={`/app/calls/${s.id}`} className="block p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-slate-900">{s.id}</div>
                    <Badge variant={s.outcome === "해결" ? "green" : "amber"}>
                      {s.outcome || "미정"}
                    </Badge>
                    <span className="ml-auto text-xs text-slate-500">
                      {formatDate(s.started_at || s.created_at || null)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <IconChip icon={PhoneCall} label={s.caller_masked || "발신자 정보 없음"} />
                    <IconChip
                      icon={Clock}
                      label={`${Math.round((s.duration_sec || 0) / 60)}분`}
                    />
                    <IconChip icon={Headphones} label={s.agent_id || "미지정"} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
